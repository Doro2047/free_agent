use std::collections::HashMap;
use std::sync::Arc;

use rusqlite::Connection;
use runtime::{RuntimeConfig, Session};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use tracing::info;

// ============================================================================
// WebSocket Event Types
// ============================================================================

/// Types of events that can be broadcast over WebSocket connections.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WsEventType {
    /// Real-time command execution output (stdout/stderr chunks).
    CommandOutput,
    /// Command execution completed with exit code.
    CommandComplete,
    /// Streaming chat token from AI response.
    ChatToken,
    /// Chat response completed with usage stats.
    ChatComplete,
    /// File change notification from watcher.
    FileChanged,
    /// Task status update notification.
    TaskUpdated,
    /// Heartbeat pong response.
    Pong,
}

/// Event payload broadcast to all connected WebSocket clients.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsEvent {
    /// The type of event being broadcast.
    #[serde(flatten)]
    pub event_type: WsEventType,
    /// Arbitrary event data as a JSON value.
    pub data: serde_json::Value,
    /// RFC3339 timestamp when the event was created.
    pub timestamp: String,
}

impl WsEvent {
    /// Create a new WsEvent with the current timestamp.
    pub fn new(event_type: WsEventType, data: serde_json::Value) -> Self {
        Self {
            event_type,
            data,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }
}

/// Application state shared across all route handlers.
///
/// Holds references to the database connection, runtime configuration,
/// and other shared resources needed by route handlers.
#[derive(Clone)]
pub struct AppState {
    /// Database connection wrapped in a mutex for thread-safe access.
    pub db: Arc<Mutex<Connection>>,

    /// Runtime configuration loaded at startup.
    pub config: Arc<RuntimeConfig>,

    /// Server start time used for uptime calculations.
    pub started_at: chrono::DateTime<chrono::Utc>,

    /// Working directory for file/command operations.
    pub work_dir: std::path::PathBuf,

    /// Broadcast channel sender for WebSocket events.
    /// Clones of this sender are used by route handlers to emit events.
    pub ws_tx: tokio::sync::broadcast::Sender<WsEvent>,

    /// In-memory session store shared across route handlers.
    pub sessions: Arc<Mutex<HashMap<String, Session>>>,
}

impl AppState {
    /// Create a new `AppState` with the given configuration.
    ///
    /// Initializes an in-memory SQLite database. In production this should
    /// be replaced with a file-backed database connection.
    pub async fn new(config: RuntimeConfig) -> Result<Self, ServerError> {
        let work_dir = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
        let work_dir_for_db = work_dir.clone();

        let db = tokio::task::spawn_blocking(move || {
            // Create data directory for database file
            let data_dir = work_dir_for_db.join("data");
            std::fs::create_dir_all(&data_dir).map_err(ServerError::from)?;

            let db_path = data_dir.join("free_agent.db");
            let conn = Connection::open(&db_path)?;

            // Enable WAL mode and optimize settings for production
            conn.execute_batch("
                PRAGMA journal_mode=WAL;
                PRAGMA synchronous=NORMAL;
                PRAGMA cache_size=-64000;
                PRAGMA busy_timeout=5000;
                PRAGMA foreign_keys=ON;
            ")?;

            initialize_schema(&conn)?;
            Ok::<_, ServerError>(conn)
        })
        .await??;

        // Create a broadcast channel for WebSocket events (capacity: 256 events)
        let (ws_tx, _) = tokio::sync::broadcast::channel(256);

        let state = Self {
            db: Arc::new(Mutex::new(db)),
            config: Arc::new(config),
            started_at: chrono::Utc::now(),
            work_dir,
            ws_tx,
            sessions: Arc::new(Mutex::new(HashMap::new())),
        };

        info!("Application state initialized");
        Ok(state)
    }

    /// Save a session to the SQLite database for persistence across restarts.
    pub async fn persist_session(&self, session: &Session) -> Result<(), ServerError> {
        let session_id = session.session_id.clone();
        let messages_json = serde_json::to_string(&session.messages)
            .unwrap_or_else(|_| "[]".to_string());
        let model = session.model.clone().unwrap_or_default();
        let created_at = chrono::DateTime::from_timestamp_millis(
            i64::try_from(session.created_at_ms).unwrap_or(0),
        )
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_default();
        let updated_at = chrono::DateTime::from_timestamp_millis(
            i64::try_from(session.updated_at_ms).unwrap_or(0),
        )
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_default();

        let db = self.db.lock().await;
        db.execute(
            "INSERT OR REPLACE INTO sessions (id, created_at, updated_at, metadata) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![
                session_id,
                created_at,
                updated_at,
                serde_json::json!({"messages": messages_json, "model": model}).to_string()
            ],
        )?;

        Ok(())
    }

    /// Load all persisted sessions from SQLite into the in-memory store.
    pub async fn restore_sessions(&self) -> Result<usize, ServerError> {
        let db = self.db.lock().await;
        let mut stmt = db.prepare(
            "SELECT id, metadata FROM sessions",
        )?;

        let rows: Vec<(String, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
            .filter_map(Result::ok)
            .collect();

        drop(stmt);

        let mut restored = 0;
        let mut sessions = self.sessions.lock().await;
        for (session_id, metadata_json) in rows {
            if sessions.contains_key(&session_id) {
                continue;
            }

            let metadata: serde_json::Value = match serde_json::from_str(&metadata_json) {
                Ok(v) => v,
                Err(_) => continue,
            };

            let messages_str = metadata
                .get("messages")
                .and_then(|v| v.as_str())
                .unwrap_or("[]");

            let messages: Vec<runtime::ConversationMessage> = match serde_json::from_str(messages_str) {
                Ok(m) => m,
                Err(_) => continue,
            };

            let model = metadata
                .get("model")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .map(String::from);

            let mut session = runtime::Session::new();
            session.session_id = session_id.clone();
            session.model = model;
            for msg in messages {
                session.messages.push(msg);
            }

            sessions.insert(session_id, session);
            restored += 1;
        }

        if restored > 0 {
            info!(restored_count = restored, "Restored sessions from database");
        }

        Ok(restored)
    }

    /// Calculate server uptime as a human-readable duration.
    pub fn uptime(&self) -> chrono::Duration {
        chrono::Utc::now() - self.started_at
    }
}

/// Initialize the database schema with required tables.
fn initialize_schema(conn: &Connection) -> Result<(), ServerError> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            metadata TEXT
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );

        CREATE TABLE IF NOT EXISTS mcp_servers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            command TEXT NOT NULL,
            args TEXT NOT NULL DEFAULT '[]',
            enabled INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'registered',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS commands_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            command TEXT NOT NULL,
            working_directory TEXT,
            exit_code INTEGER,
            output TEXT,
            executed_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS task_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (task_id) REFERENCES tasks(id)
        );

        CREATE TABLE IF NOT EXISTS config_store (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS plugins (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            version TEXT NOT NULL DEFAULT '0.0.0',
            enabled INTEGER NOT NULL DEFAULT 0,
            config TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL
        );
        ",
    )?;

    // Seed default config entries
    let now = chrono::Utc::now().to_rfc3339();
    let default_configs = vec![
        ("server.port", "3000"),
        ("server.host", "127.0.0.1"),
        ("runtime.max_iterations", "20"),
        ("runtime.max_file_size", "10485760"),
        ("security.allowed_commands", "git,npm,cargo,node,python,ls,cat,grep,find,echo,mkdir,cp,mv,touch,head,tail,wc,sort,uniq,awk,sed,stat,date,whoami,pwd"),
    ];

    for (key, value) in default_configs {
        let _ = conn.execute(
            "INSERT OR IGNORE INTO config_store (key, value, updated_at) VALUES (?1, ?2, ?3)",
            rusqlite::params![key, value, now],
        );
    }

    // Seed default plugins
    let default_plugins = vec![
        ("plugin-git", "Git Integration", "Provides git repository operations and status tracking.", "1.0.0"),
        ("plugin-npm", "NPM Integration", "Provides npm package management and script execution.", "1.0.0"),
        ("plugin-cargo", "Cargo Integration", "Provides Rust cargo build and test operations.", "1.0.0"),
    ];

    for (id, name, desc, version) in default_plugins {
        let _ = conn.execute(
            "INSERT OR IGNORE INTO plugins (id, name, description, version, enabled, config, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![id, name, desc, version, 0, "{}", now],
        );
    }

    info!("Database schema initialized");
    Ok(())
}

/// Server-specific errors for state initialization and management.
#[derive(Debug, thiserror::Error)]
pub enum ServerError {
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("tokio join error: {0}")]
    TokioJoin(#[from] tokio::task::JoinError),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
}
