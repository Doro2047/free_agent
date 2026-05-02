//! HTTP server crate for the claw-code runtime.
//!
//! This crate provides an Axum-based HTTP server that exposes REST APIs
//! for chat, file operations, command execution, configuration management,
//! MCP (Model Context Protocol) server management, and real-time WebSocket communication.
//!
//! # Architecture
//!
//! The server is organized into the following modules:
//!
//! - `routes` - HTTP endpoint handlers grouped by feature area
//! - `middleware` - Cross-cutting concerns (CORS, error handling, security)
//! - `state` - Shared application state (database, config, WebSocket broadcast)
//!
//! # Example
//!
//! ```no_run
//! use server::create_router;
//! use server::state::AppState;
//! use runtime::RuntimeConfig;
//!
//! #[tokio::main]
//! async fn main() {
//!     let config = RuntimeConfig::empty();
//!     let state = AppState::new(config).await.unwrap();
//!     let app = create_router(state);
//!
//!     let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
//!         .await
//!         .unwrap();
//!
//!     axum::serve(listener, app).await.unwrap();
//! }
//! ```

pub mod llm_client;
pub mod middleware;
pub mod routes;
pub mod state;

use axum::routing::{delete, get, post, put};
use axum::Router;
use tower_http::trace::TraceLayer;
use tracing::info;

use crate::middleware::security::security_middleware;
use crate::state::AppState;

fn default_cors_origins() -> Vec<String> {
    let mut origins = vec![
        "http://localhost:5173".to_string(),
        "http://127.0.0.1:5173".to_string(),
        "http://localhost:3000".to_string(),
        "http://127.0.0.1:3000".to_string(),
    ];

    if let Ok(extra) = std::env::var("CORS_EXTRA_ORIGINS") {
        for origin in extra.split(',').map(str::trim).filter(|s| !s.is_empty()) {
            if !origins.contains(&origin.to_string()) {
                origins.push(origin.to_string());
            }
        }
    }

    origins
}

/// Create the application router with all routes and middleware configured.
///
/// This function assembles the full Axum application:
/// 1. Registers all route handlers grouped by feature area
/// 2. Applies security middleware
/// 3. Applies CORS middleware (configurable via CORS_EXTRA_ORIGINS env var)
/// 4. Applies tracing middleware
pub fn create_router(state: AppState) -> Router {
    // Health check routes (no authentication required)
    let health_router = Router::new().route("/health", get(routes::health::health_check));

    // Chat routes
    let chat_router = Router::new()
        .route("/chat", post(routes::chat::send_message))
        .route("/chat/stream", post(routes::chat::stream_message))
        .route("/chat/sessions", get(routes::chat::list_sessions));

    // File operation routes
    let files_router = Router::new()
        .route("/files/list", get(routes::files::list_files))
        .route("/files/read", post(routes::files::read_file))
        .route("/files/write", post(routes::files::write_file))
        .route("/files/edit", post(routes::files::edit_file))
        .route("/files/delete", post(routes::files::delete_file))
        .route("/search/files", post(routes::files::search_files))
        .route("/search/content", post(routes::files::search_content));

    // Command execution routes
    let commands_router = Router::new()
        .route("/commands/execute", post(routes::commands::execute_command))
        .route("/commands/bash", post(routes::commands::execute_bash))
        .route("/commands/history", get(routes::commands::command_history));

    // Configuration routes
    let config_router = Router::new()
        .route("/config", get(routes::config::get_config))
        .route("/config", put(routes::config::update_config))
        .route("/config/reset", post(routes::config::reset_config))
        .route("/config/{section}", get(routes::config::get_config_section))
        // Task routes
        .route("/tasks", get(routes::config::get_tasks))
        .route("/tasks", post(routes::config::create_task))
        .route("/tasks/{id}", delete(routes::config::delete_task))
        .route(
            "/tasks/{task_id}/messages",
            get(routes::config::get_task_messages),
        )
        .route(
            "/tasks/{task_id}/messages",
            post(routes::config::create_message),
        );

    // MCP management routes
    let mcp_router = Router::new()
        .route("/mcp/servers", get(routes::mcp::list_servers))
        .route("/mcp/servers", post(routes::mcp::register_server))
        .route(
            "/mcp/servers/{server_id}",
            delete(routes::mcp::deregister_server),
        )
        .route("/mcp/tools", get(routes::mcp::list_tools))
        .route("/mcp/tools", post(routes::mcp::call_tool))
        .route(
            "/mcp/servers/{server_id}/ws",
            get(routes::mcp::mcp_websocket),
        );

    // Plugin management routes
    let plugins_router = Router::new()
        .route("/plugins", get(routes::mcp::list_plugins))
        .route("/plugins/{id}/enable", post(routes::mcp::enable_plugin))
        .route("/plugins/{id}/disable", post(routes::mcp::disable_plugin));

    // Assemble all routers under the /api prefix
    let api_router = Router::new()
        .merge(health_router)
        .nest("/chat", chat_router)
        .nest("/files", files_router)
        .nest("/commands", commands_router)
        .nest("/config", config_router)
        .nest("/mcp", mcp_router)
        .nest("/plugins", plugins_router);

    // WebSocket route (outside /api namespace for direct access)
    let ws_router = Router::new().route("/ws", get(routes::ws::ws_handler));

    // Apply middleware and state
    let app = Router::new()
        .nest("/api", api_router)
        .merge(ws_router)
        .with_state(state)
        .layer(axum::middleware::from_fn(security_middleware))
        .layer(axum::middleware::from_fn(
            middleware::api_key::api_key_middleware,
        ))
        .layer(TraceLayer::new_for_http())
        .layer(
            tower_http::cors::CorsLayer::new()
                .allow_origin(
                    default_cors_origins()
                        .into_iter()
                        .map(|o| o.parse().expect("valid CORS origin"))
                        .collect::<Vec<_>>(),
                )
                .allow_methods([
                    http::Method::GET,
                    http::Method::POST,
                    http::Method::PUT,
                    http::Method::DELETE,
                    http::Method::OPTIONS,
                ])
                .allow_headers([
                    http::header::CONTENT_TYPE,
                    http::header::AUTHORIZATION,
                    http::header::HeaderName::from_static("x-api-key"),
                    http::header::HeaderName::from_static("x-request-id"),
                ])
                .max_age(std::time::Duration::from_secs(3600)),
        );

    info!("Router created with all routes and middleware");
    app
}

/// Server configuration parsed from command-line arguments.
#[derive(Debug, Clone)]
pub struct ServerConfig {
    /// Port to listen on.
    pub port: u16,
    /// Host address to bind to.
    pub host: String,
    /// Path to the configuration file.
    pub config_path: Option<String>,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            port: 3000,
            host: "127.0.0.1".to_string(),
            config_path: None,
        }
    }
}

impl ServerConfig {
    /// Parse command-line arguments into a `ServerConfig`.
    ///
    /// Supported arguments:
    /// - `--port <PORT>`: Port to listen on (default: 3000)
    /// - `--host <HOST>`: Host to bind to (default: 0.0.0.0)
    /// - `--config <PATH>`: Path to configuration file
    pub fn from_args() -> Self {
        let mut config = Self::default();
        let args: Vec<String> = std::env::args().collect();

        let mut i = 1;
        while i < args.len() {
            match args[i].as_str() {
                "--port" => {
                    if let Some(port_str) = args.get(i + 1) {
                        if let Ok(port) = port_str.parse::<u16>() {
                            config.port = port;
                        }
                        i += 1;
                    }
                }
                "--host" => {
                    if let Some(host) = args.get(i + 1) {
                        config.host = host.clone();
                        i += 1;
                    }
                }
                "--config" => {
                    if let Some(path) = args.get(i + 1) {
                        config.config_path = Some(path.clone());
                        i += 1;
                    }
                }
                _ => {}
            }
            i += 1;
        }

        config
    }

    /// Return the full bind address (host:port).
    pub fn bind_address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}
