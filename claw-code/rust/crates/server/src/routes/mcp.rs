use axum::extract::{Path, State};
use axum::response::IntoResponse;
use axum::Json;
use serde::{Deserialize, Serialize};
use tracing::info;

use crate::middleware::error_handler::AppError;
use crate::state::AppState;

// ============================================================================
// MCP Server types
// ============================================================================

/// Request body for registering an MCP server.
#[derive(Deserialize)]
pub struct McpServerRequest {
    /// Name of the MCP server.
    pub name: String,
    /// Command to run the server (e.g., "node", "python").
    pub command: String,
    /// Arguments for the command.
    #[serde(default)]
    pub args: Vec<String>,
    /// Whether the server should be enabled on registration.
    #[serde(default = "default_enabled")]
    pub enabled: bool,
}

fn default_enabled() -> bool {
    true
}

/// Response body for MCP server information.
#[derive(Serialize)]
pub struct McpServerResponse {
    /// Unique server identifier.
    pub id: String,
    /// Server name.
    pub name: String,
    /// Command used to run the server.
    pub command: String,
    /// Arguments for the command.
    pub args: Vec<String>,
    /// Whether the server is enabled.
    pub enabled: bool,
    /// Current connection status.
    pub status: String,
}

/// Tool information from an MCP server.
#[derive(Serialize)]
pub struct McpToolInfo {
    /// Server ID that provides this tool.
    pub server_id: String,
    /// Server name.
    pub server_name: String,
    /// Tool name.
    pub name: String,
    /// Tool description.
    pub description: String,
    /// JSON Schema for tool parameters.
    pub input_schema: serde_json::Value,
}

/// Request body for calling an MCP tool.
#[derive(Deserialize)]
pub struct McpToolCallRequest {
    /// Server ID to call the tool on.
    pub server_id: String,
    /// Tool name to call.
    pub tool_name: String,
    /// Tool arguments.
    pub arguments: serde_json::Value,
}

/// Response body for MCP tool calls.
#[derive(Serialize)]
pub struct McpToolCallResponse {
    /// Whether the call succeeded.
    pub success: bool,
    /// Tool execution result.
    pub result: serde_json::Value,
    /// Execution duration in milliseconds.
    pub duration_ms: u128,
}

// ============================================================================
// Plugin types
// ============================================================================

/// Plugin information record.
#[derive(Serialize)]
pub struct PluginInfo {
    /// Unique plugin identifier.
    pub id: String,
    /// Display name.
    pub name: String,
    /// Description of the plugin.
    pub description: String,
    /// Plugin version.
    pub version: String,
    /// Whether the plugin is enabled.
    pub enabled: bool,
}

// ============================================================================
// MCP Server route handlers
// ============================================================================

/// List all registered MCP servers.
///
/// Returns servers from the database along with their current status.
#[axum::debug_handler]
pub async fn list_servers(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    info!("Listing MCP servers");

    let db = state.db.lock().await;

    let mut stmt = db.prepare(
        "SELECT id, name, command, args, enabled, status FROM mcp_servers ORDER BY name",
    )?;

    let servers: Vec<McpServerResponse> = stmt
        .query_map([], |row| {
            let args_str: String = row.get(3)?;
            let args: Vec<String> = serde_json::from_str(&args_str).unwrap_or_default();

            Ok(McpServerResponse {
                id: row.get(0)?,
                name: row.get(1)?,
                command: row.get(2)?,
                args,
                enabled: row.get::<_, i32>(4)? != 0,
                status: row.get(5)?,
            })
        })?
        .filter_map(Result::ok)
        .collect();

    Ok(Json(serde_json::json!({
        "servers": servers,
        "total": servers.len()
    })))
}

/// Register a new MCP server.
///
/// Stores the server configuration in the database. The server will be
/// available for tool calls once registered and enabled.
#[axum::debug_handler]
pub async fn register_server(
    State(state): State<AppState>,
    Json(request): Json<McpServerRequest>,
) -> Result<Json<McpServerResponse>, AppError> {
    info!(
        name = %request.name,
        command = %request.command,
        "Registering MCP server"
    );

    if request.name.trim().is_empty() {
        return Err(AppError::bad_request("Server name must not be empty"));
    }

    if request.command.trim().is_empty() {
        return Err(AppError::bad_request("Command must not be empty"));
    }

    let server_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let args_json = serde_json::to_string(&request.args).unwrap_or_else(|_| "[]".to_string());

    let db = state.db.lock().await;

    db.execute(
        "INSERT INTO mcp_servers (id, name, command, args, enabled, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            server_id,
            request.name,
            request.command,
            args_json,
            if request.enabled { 1 } else { 0 },
            "registered",
            now,
        ],
    )?;

    Ok(Json(McpServerResponse {
        id: server_id,
        name: request.name,
        command: request.command,
        args: request.args,
        enabled: request.enabled,
        status: "registered".to_string(),
    }))
}

/// Delete a registered MCP server.
#[axum::debug_handler]
pub async fn deregister_server(
    State(state): State<AppState>,
    Path(server_id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    info!(server_id = %server_id, "Deregistering MCP server");

    let db = state.db.lock().await;

    let rows = db.execute(
        "DELETE FROM mcp_servers WHERE id = ?1",
        rusqlite::params![server_id],
    )?;

    if rows == 0 {
        return Err(AppError::not_found(format!(
            "MCP server '{}' not found",
            server_id
        )));
    }

    Ok(Json(serde_json::json!({
        "id": server_id,
        "status": "deregistered"
    })))
}

/// List available tools across all MCP servers.
///
/// Returns tools from enabled servers. For actual tool discovery,
/// this would connect to each server and call tools/list.
#[axum::debug_handler]
pub async fn list_tools(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    info!("Listing MCP tools");

    let db = state.db.lock().await;

    let mut stmt = db.prepare(
        "SELECT id, name FROM mcp_servers WHERE enabled = 1",
    )?;

    let enabled_servers: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .filter_map(Result::ok)
        .collect();

    // In production, this would iterate over enabled servers and call
    // the MCP tools/list endpoint for each. For now, return the
    // list of enabled servers that would provide tools.
    let server_tools: Vec<serde_json::Value> = enabled_servers
        .iter()
        .map(|(id, name)| {
            serde_json::json!({
                "server_id": id,
                "server_name": name,
                "tools": [] // Would be populated from actual MCP server
            })
        })
        .collect();

    Ok(Json(serde_json::json!({
        "tools": server_tools,
        "total": server_tools.len()
    })))
}

/// Call a tool on an MCP server.
#[axum::debug_handler]
pub async fn call_tool(
    State(state): State<AppState>,
    Json(request): Json<McpToolCallRequest>,
) -> Result<Json<McpToolCallResponse>, AppError> {
    info!(
        server_id = %request.server_id,
        tool_name = %request.tool_name,
        "Calling MCP tool"
    );

    let start = std::time::Instant::now();

    // Verify the server exists and is enabled
    let db = state.db.lock().await;

    let exists = db.query_row(
        "SELECT 1 FROM mcp_servers WHERE id = ?1 AND enabled = 1",
        rusqlite::params![request.server_id],
        |_| Ok(()),
    );

    if exists.is_err() {
        return Err(AppError::not_found(format!(
            "MCP server '{}' not found or not enabled",
            request.server_id
        )));
    }

    // In production, this would:
    // 1. Look up the server's command and args from the database
    // 2. Spawn a stdio process or connect via SSE
    // 3. Send a tools/call JSON-RPC request
    // 4. Parse and return the result
    //
    // For now, return a placeholder indicating the server is valid.
    let duration = start.elapsed();

    Ok(Json(McpToolCallResponse {
        success: true,
        result: serde_json::json!({
            "content": format!("Tool '{}' called on server '{}'", request.tool_name, request.server_id),
            "arguments": request.arguments,
        }),
        duration_ms: duration.as_millis(),
    }))
}

/// WebSocket endpoint for MCP SSE transport.
#[axum::debug_handler]
pub async fn mcp_websocket(
    Path(_server_id): Path<String>,
    _ws: axum::extract::WebSocketUpgrade,
) -> impl IntoResponse {
    info!("MCP WebSocket connection attempt");

    // Placeholder for WebSocket handling.
    // In production, this would upgrade the connection and handle
    // MCP protocol messages over WebSocket transport.
    axum::response::Response::builder()
        .status(axum::http::StatusCode::SWITCHING_PROTOCOLS)
        .body(axum::body::Body::empty())
        .unwrap()
}

// ============================================================================
// Plugin route handlers
// ============================================================================

/// List all available plugins.
///
/// Returns both enabled and disabled plugins with their metadata.
#[axum::debug_handler]
pub async fn list_plugins(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    info!("Listing plugins");

    let db = state.db.lock().await;

    let mut stmt = db.prepare(
        "SELECT id, name, description, version, enabled FROM plugins ORDER BY name",
    )?;

    let plugins: Vec<PluginInfo> = stmt
        .query_map([], |row| {
            Ok(PluginInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                version: row.get(3)?,
                enabled: row.get::<_, i32>(4)? != 0,
            })
        })?
        .filter_map(Result::ok)
        .collect();

    let enabled_count = plugins.iter().filter(|p| p.enabled).count();

    Ok(Json(serde_json::json!({
        "plugins": plugins,
        "total": plugins.len(),
        "enabled": enabled_count
    })))
}

/// Enable a plugin.
///
/// Sets the plugin's enabled flag to true in the database.
#[axum::debug_handler]
pub async fn enable_plugin(
    State(state): State<AppState>,
    Path(plugin_id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    info!(plugin_id = %plugin_id, "Enabling plugin");

    let db = state.db.lock().await;

    let rows = db.execute(
        "UPDATE plugins SET enabled = 1 WHERE id = ?1",
        rusqlite::params![plugin_id],
    )?;

    if rows == 0 {
        return Err(AppError::not_found(format!(
            "Plugin '{}' not found",
            plugin_id
        )));
    }

    Ok(Json(serde_json::json!({
        "id": plugin_id,
        "enabled": true,
        "message": format!("Plugin '{}' enabled", plugin_id)
    })))
}

/// Disable a plugin.
///
/// Sets the plugin's enabled flag to false in the database.
#[axum::debug_handler]
pub async fn disable_plugin(
    State(state): State<AppState>,
    Path(plugin_id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    info!(plugin_id = %plugin_id, "Disabling plugin");

    let db = state.db.lock().await;

    let rows = db.execute(
        "UPDATE plugins SET enabled = 0 WHERE id = ?1",
        rusqlite::params![plugin_id],
    )?;

    if rows == 0 {
        return Err(AppError::not_found(format!(
            "Plugin '{}' not found",
            plugin_id
        )));
    }

    Ok(Json(serde_json::json!({
        "id": plugin_id,
        "enabled": false,
        "message": format!("Plugin '{}' disabled", plugin_id)
    })))
}
