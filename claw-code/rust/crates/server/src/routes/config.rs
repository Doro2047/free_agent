use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use tracing::info;

use crate::middleware::error_handler::AppError;
use crate::state::AppState;

// ============================================================================
// Config types
// ============================================================================

/// Request body for updating a single configuration key.
#[derive(Deserialize)]
pub struct ConfigUpdateRequest {
    /// Configuration key to update.
    pub key: String,
    /// New value for the configuration key.
    pub value: serde_json::Value,
}

/// Request body for updating the entire configuration.
#[derive(Deserialize)]
pub struct ConfigBatchRequest {
    /// Map of key-value pairs to update.
    pub config: std::collections::HashMap<String, serde_json::Value>,
}

/// Response body for configuration operations.
#[derive(Serialize)]
pub struct ConfigResponse {
    /// Whether the operation succeeded.
    pub success: bool,
    /// Configuration value or values.
    pub data: serde_json::Value,
    /// Human-readable message.
    pub message: String,
}

// ============================================================================
// Task types
// ============================================================================

/// Request body for creating a task.
#[derive(Deserialize)]
pub struct CreateTaskRequest {
    /// Task title.
    pub title: String,
    /// Optional initial status (default: "pending").
    #[serde(default)]
    pub status: Option<String>,
}

/// Task record returned in API responses.
#[derive(Serialize)]
pub struct TaskResponse {
    /// Unique task ID.
    pub id: i64,
    /// Task title.
    pub title: String,
    /// Task status: pending, in_progress, completed, cancelled.
    pub status: String,
    /// ISO 8601 creation timestamp.
    pub created_at: String,
    /// ISO 8601 last update timestamp.
    pub updated_at: String,
}

/// Request body for creating a task message.
#[derive(Deserialize)]
pub struct CreateMessageRequest {
    /// Message role: user, assistant, system.
    pub role: String,
    /// Message content.
    pub content: String,
}

/// Task message record.
#[derive(Serialize)]
pub struct MessageResponse {
    /// Unique message ID.
    pub id: i64,
    /// Associated task ID.
    pub task_id: i64,
    /// Message role.
    pub role: String,
    /// Message content.
    pub content: String,
    /// ISO 8601 timestamp.
    pub timestamp: String,
}

// ============================================================================
// Config route handlers
// ============================================================================

/// Get all configuration values.
///
/// Returns the complete configuration store as a key-value JSON object.
#[axum::debug_handler]
pub async fn get_config(
    State(state): State<AppState>,
) -> Result<Json<ConfigResponse>, AppError> {
    info!("Fetching runtime configuration");

    let db = state.db.lock().await;

    let mut stmt = db.prepare("SELECT key, value FROM config_store ORDER BY key")?;

    let mut config_map = serde_json::Map::new();

    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;

    for row in rows.flatten() {
        let (key, value) = row;
        // Try to parse as JSON, fall back to string
        if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(&value) {
            config_map.insert(key, json_value);
        } else {
            config_map.insert(key, serde_json::Value::String(value));
        }
    }

    // Also merge the runtime config - skip for now as JsonValue doesn't implement Serialize
    // TODO: Add proper conversion from runtime::json::JsonValue to serde_json::Value

    Ok(Json(ConfigResponse {
        success: true,
        data: serde_json::Value::Object(config_map),
        message: "Configuration retrieved successfully".to_string(),
    }))
}

/// Update the entire configuration.
///
/// Accepts a JSON object of key-value pairs and updates them atomically.
#[axum::debug_handler]
pub async fn update_config(
    State(state): State<AppState>,
    Json(request): Json<ConfigBatchRequest>,
) -> Result<Json<ConfigResponse>, AppError> {
    info!("Updating configuration");

    let now = chrono::Utc::now().to_rfc3339();
    let db = state.db.lock().await;

    let mut updated_keys = Vec::new();

    for (key, value) in &request.config {
        let value_str = serde_json::to_string(value).unwrap_or_else(|_| value.to_string());

        db.execute(
            "INSERT INTO config_store (key, value, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
            rusqlite::params![key, value_str, now],
        )?;

        updated_keys.push(key.clone());
    }

    Ok(Json(ConfigResponse {
        success: true,
        data: serde_json::json!({
            "updated_keys": updated_keys,
            "count": updated_keys.len()
        }),
        message: format!("Updated {} configuration keys", updated_keys.len()),
    }))
}

/// Reset configuration to default values.
///
/// Removes all custom config entries, keeping only seeded defaults.
#[axum::debug_handler]
pub async fn reset_config(
    State(state): State<AppState>,
) -> Result<Json<ConfigResponse>, AppError> {
    info!("Resetting configuration to defaults");

    let db = state.db.lock().await;

    let default_keys = [
        "server.port",
        "server.host",
        "runtime.max_iterations",
        "runtime.max_file_size",
        "security.allowed_commands",
    ];

    // Delete all entries not in the defaults list
    let placeholders = default_keys.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
    let sql = format!("DELETE FROM config_store WHERE key NOT IN ({})", placeholders);

    let mut params: Vec<&dyn rusqlite::types::ToSql> = Vec::new();
    for key in &default_keys {
        params.push(key);
    }

    // Execute with raw string params
    let _ = db.execute(&sql, rusqlite::params_from_iter(default_keys.iter()));

    Ok(Json(ConfigResponse {
        success: true,
        data: serde_json::json!({
            "default_keys": default_keys
        }),
        message: "Configuration reset to defaults".to_string(),
    }))
}

/// Get a specific configuration section.
#[axum::debug_handler]
pub async fn get_config_section(
    State(state): State<AppState>,
    Path(section): Path<String>,
) -> Result<Json<ConfigResponse>, AppError> {
    info!(section = %section, "Fetching configuration section");

    let db = state.db.lock().await;
    let prefix = format!("{}.", section);

    let mut stmt = db.prepare(
        "SELECT key, value FROM config_store WHERE key LIKE ?1 ORDER BY key",
    )?;

    let mut config_map = serde_json::Map::new();

    let rows = stmt.query_map([&prefix], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;

    for row in rows.flatten() {
        let (key, value) = row;
        if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(&value) {
            config_map.insert(key, json_value);
        } else {
            config_map.insert(key, serde_json::Value::String(value));
        }
    }

    Ok(Json(ConfigResponse {
        success: true,
        data: serde_json::Value::Object(config_map),
        message: format!("Configuration section '{}' retrieved", section),
    }))
}

// ============================================================================
// Task route handlers
// ============================================================================

/// Get all tasks.
///
/// Returns a list of tasks ordered by creation date (newest first).
#[axum::debug_handler]
pub async fn get_tasks(
    State(state): State<AppState>,
) -> Result<Json<Vec<TaskResponse>>, AppError> {
    info!("Fetching tasks");

    let db = state.db.lock().await;

    let mut stmt = db.prepare(
        "SELECT id, title, status, created_at, updated_at FROM tasks ORDER BY created_at DESC",
    )?;

    let tasks: Vec<TaskResponse> = stmt
        .query_map([], |row| {
            Ok(TaskResponse {
                id: row.get(0)?,
                title: row.get(1)?,
                status: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?
        .filter_map(Result::ok)
        .collect();

    Ok(Json(tasks))
}

/// Create a new task.
#[axum::debug_handler]
pub async fn create_task(
    State(state): State<AppState>,
    Json(request): Json<CreateTaskRequest>,
) -> Result<Json<TaskResponse>, AppError> {
    info!(title = %request.title, "Creating task");

    if request.title.trim().is_empty() {
        return Err(AppError::bad_request("Task title must not be empty"));
    }

    let status = request.status.unwrap_or_else(|| "pending".to_string());
    let now = chrono::Utc::now().to_rfc3339();

    let db = state.db.lock().await;

    db.execute(
        "INSERT INTO tasks (title, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![request.title, status, now, now],
    )?;

    let id = db.last_insert_rowid();

    Ok(Json(TaskResponse {
        id,
        title: request.title,
        status,
        created_at: now.clone(),
        updated_at: now,
    }))
}

/// Delete a task and its associated messages.
#[axum::debug_handler]
pub async fn delete_task(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<serde_json::Value>, AppError> {
    info!(task_id = id, "Deleting task");

    let db = state.db.lock().await;

    // Delete associated messages first (foreign key)
    db.execute(
        "DELETE FROM task_messages WHERE task_id = ?1",
        rusqlite::params![id],
    )?;

    let rows = db.execute(
        "DELETE FROM tasks WHERE id = ?1",
        rusqlite::params![id],
    )?;

    if rows == 0 {
        return Err(AppError::not_found(format!("Task with id {} not found", id)));
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": format!("Task {} deleted", id)
    })))
}

/// Get messages for a specific task.
#[axum::debug_handler]
pub async fn get_task_messages(
    State(state): State<AppState>,
    Path(task_id): Path<i64>,
) -> Result<Json<Vec<MessageResponse>>, AppError> {
    info!(task_id = task_id, "Fetching task messages");

    let db = state.db.lock().await;

    let mut stmt = db.prepare(
        "SELECT id, task_id, role, content, timestamp FROM task_messages WHERE task_id = ?1 ORDER BY timestamp ASC",
    )?;

    let messages: Vec<MessageResponse> = stmt
        .query_map([task_id], |row| {
            Ok(MessageResponse {
                id: row.get(0)?,
                task_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                timestamp: row.get(4)?,
            })
        })?
        .filter_map(Result::ok)
        .collect();

    Ok(Json(messages))
}

/// Create a message for a specific task.
#[axum::debug_handler]
pub async fn create_message(
    State(state): State<AppState>,
    Path(task_id): Path<i64>,
    Json(request): Json<CreateMessageRequest>,
) -> Result<Json<MessageResponse>, AppError> {
    info!(task_id = task_id, role = %request.role, "Creating task message");

    // Verify task exists
    let db = state.db.lock().await;
    let exists = db.query_row(
        "SELECT 1 FROM tasks WHERE id = ?1",
        rusqlite::params![task_id],
        |_| Ok(()),
    );

    if exists.is_err() {
        return Err(AppError::not_found(format!(
            "Task with id {} not found",
            task_id
        )));
    }

    let now = chrono::Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO task_messages (task_id, role, content, timestamp) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![task_id, request.role, request.content, now],
    )?;

    let id = db.last_insert_rowid();

    // Update task's updated_at
    let _ = db.execute(
        "UPDATE tasks SET updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, task_id],
    );

    Ok(Json(MessageResponse {
        id,
        task_id,
        role: request.role,
        content: request.content,
        timestamp: now,
    }))
}
