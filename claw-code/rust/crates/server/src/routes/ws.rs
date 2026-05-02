use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use futures::{SinkExt, StreamExt};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use tracing::{error, info, warn};

use crate::routes::chat::{get_or_create_session, resolve_model};
use crate::routes::commands::validate_command;
use crate::state::{AppState, WsEvent, WsEventType};

lazy_static! {
    static ref EXPECTED_WS_API_KEY: String = std::env::var("DORO_API_KEY").unwrap_or_default() ;
}

// ============================================================================
// Connection Manager
// ============================================================================

/// Tracks active WebSocket connections for monitoring and cleanup.
pub struct ConnectionManager {
    /// Map of connection IDs to their metadata.
    connections: HashMap<String, ConnectionInfo>,
}

/// Metadata about a single WebSocket connection.
#[derive(Debug, Clone)]
pub struct ConnectionInfo {
    /// When the connection was established.
    pub connected_at: String,
    /// Remote address of the client.
    pub remote_addr: String,
    /// Number of messages received.
    pub message_count: usize,
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            connections: HashMap::new(),
        }
    }

    pub fn add_connection(&mut self, connection_id: String, remote_addr: String) {
        let connection_id_for_log = connection_id.clone();
        self.connections.insert(
            connection_id,
            ConnectionInfo {
                connected_at: chrono::Utc::now().to_rfc3339(),
                remote_addr,
                message_count: 0,
            },
        );
        info!(
            connection_id = %connection_id_for_log,
            total_connections = self.connections.len(),
            "WebSocket connection established"
        );
    }

    pub fn remove_connection(&mut self, connection_id: &str) {
        self.connections.remove(connection_id);
        info!(
            connection_id = %connection_id,
            total_connections = self.connections.len(),
            "WebSocket connection closed"
        );
    }

    pub fn increment_message_count(&mut self, connection_id: &str) {
        if let Some(conn) = self.connections.get_mut(connection_id) {
            conn.message_count += 1;
        }
    }

    pub fn connection_count(&self) -> usize {
        self.connections.len()
    }
}

/// Global connection manager wrapped in a mutex for thread-safe access.
pub type SharedConnectionManager = Arc<Mutex<ConnectionManager>>;

// ============================================================================
// WebSocket Message Types
// ============================================================================

/// Incoming message from the WebSocket client.
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WsIncomingMessage {
    /// Execute a command and stream output.
    Command {
        /// The command to execute.
        command: String,
        /// Command arguments.
        #[serde(default)]
        args: Vec<String>,
        /// Working directory override.
        #[serde(default)]
        cwd: Option<String>,
        /// Unique ID to correlate command output.
        #[serde(default)]
        id: Option<String>,
    },
    /// Send a chat message and stream AI response.
    Chat {
        /// The user message content.
        message: String,
        /// Optional session ID.
        #[serde(default)]
        session_id: Option<String>,
        /// Optional model override.
        #[serde(default)]
        model: Option<String>,
    },
    /// Subscribe to a named event channel.
    Subscribe {
        /// Event channel to subscribe to.
        events: Vec<String>,
    },
    /// Heartbeat ping - expect a pong response.
    Ping,
}

/// Outgoing message sent to the WebSocket client.
#[derive(Debug, Serialize)]
pub struct WsOutgoingMessage {
    /// The type of message.
    #[serde(rename = "type")]
    pub msg_type: String,
    /// Message payload data.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    /// Optional error message.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl WsOutgoingMessage {
    pub fn error(msg: impl Into<String>) -> Self {
        Self {
            msg_type: "error".to_string(),
            data: None,
            error: Some(msg.into()),
        }
    }

    pub fn success(
        msg_type: impl Into<String>,
        data: impl Into<Option<serde_json::Value>>,
    ) -> Self {
        Self {
            msg_type: msg_type.into(),
            data: data.into(),
            error: None,
        }
    }

    /// Serialize to a JSON string for WebSocket transmission.
    pub fn to_json_string(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|e| {
            format!(
                r#"{{"type":"error","error":"serialization failed: {}"}}"#,
                e
            )
        })
    }
}

// ============================================================================
// Route Handlers
// ============================================================================

/// Query parameters for WebSocket upgrade request.
#[derive(Debug, Deserialize)]
pub struct WsQueryParams {
    /// Optional API key for authentication.
    #[serde(rename = "api_key")]
    pub api_key: Option<String>,
}

/// WebSocket upgrade handler.
///
/// Accepts the WebSocket upgrade request and delegates to the connection handler.
/// The connection ID is extracted from query parameters or generated as a UUID.
/// Authentication: requires valid X-API-Key header or api_key query parameter.
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsQueryParams>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    // Skip authentication if no API key is configured
    if !EXPECTED_WS_API_KEY.is_empty() {
        // Try to get API key from query parameter
        let provided_key = query.api_key.as_deref().unwrap_or("");
        if provided_key != EXPECTED_WS_API_KEY.as_str() {
            warn!("Unauthorized WebSocket connection attempt: missing or invalid API key");
            return axum::response::Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .header("Content-Type", "application/json")
                .body::<String>(
                    serde_json::json!({
                        "error": "Unauthorized",
                        "message": "Valid API key required. Pass as ?api_key=YOUR_KEY"
                    })
                    .to_string()
                    .into(),
                )
                .expect("valid response")
                .into_response();
        }
    }

    info!("Received WebSocket upgrade request");
    ws.on_upgrade(move |socket| ws_connection(socket, state))
}

/// Handle an established WebSocket connection.
///
/// This function runs for the lifetime of the WebSocket connection:
/// 1. Registers the connection with the connection manager
/// 2. Creates a broadcast receiver for server events
/// 3. Runs a message processing loop that handles incoming messages
/// 4. Cleans up the connection when the client disconnects
pub async fn ws_connection(socket: WebSocket, state: AppState) {
    let connection_id = uuid::Uuid::new_v4().to_string();
    let remote_addr = "unknown".to_string();

    // Register connection
    let connection_manager = get_or_init_connection_manager(&state).await;
    {
        let mut manager = connection_manager.lock().await;
        manager.add_connection(connection_id.clone(), remote_addr);
    }

    info!(
        connection_id = %connection_id,
        "WebSocket connection handler started"
    );

    // Split the socket into sender and receiver halves
    let (ws_sender, mut ws_receiver) = socket.split();
    let ws_sender = Arc::new(Mutex::new(ws_sender));

    // Subscribe to broadcast events
    let mut ws_rx = state.ws_tx.subscribe();

    // Clone connection ID for the event forwarding task
    let conn_id_clone = connection_id.clone();
    let ws_sender_clone = ws_sender.clone();

    // Spawn a task to forward broadcast events to this connection
    let event_forwarder = tokio::spawn(async move {
        loop {
            match ws_rx.recv().await {
                Ok(event) => {
                    // Only forward events to subscribed connections
                    // For simplicity, broadcast to all connections
                    let outgoing = WsOutgoingMessage::success(
                        format!(
                            "event:{}",
                            serde_json::to_string(&event.event_type)
                                .unwrap_or_default()
                                .trim_matches('"')
                        ),
                        Some(event.data),
                    );
                    let mut sender = ws_sender_clone.lock().await;
                    if let Err(e) = sender
                        .send(Message::Text(outgoing.to_json_string().into()))
                        .await
                    {
                        warn!(error = %e, connection_id = %conn_id_clone, "Failed to send event to client");
                        break;
                    }
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                    warn!(lagged = n, connection_id = %conn_id_clone, "WebSocket client lagged behind, dropping events");
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                    info!(connection_id = %conn_id_clone, "WebSocket broadcast channel closed");
                    break;
                }
            }
        }
    });

    // Main message processing loop
    loop {
        match ws_receiver.next().await {
            Some(Ok(message)) => {
                // Update connection manager message count
                {
                    let mut manager = connection_manager.lock().await;
                    manager.increment_message_count(&connection_id);
                }

                // Process the message
                match process_message(&message, &state).await {
                    Some(response) => {
                        let mut sender = ws_sender.lock().await;
                        if let Err(e) = sender
                            .send(Message::Text(response.to_json_string().into()))
                            .await
                        {
                            warn!(error = %e, connection_id = %connection_id, "Failed to send response to client");
                            break;
                        }
                    }
                    None => {
                        // Message handled asynchronously (e.g., streaming)
                    }
                }
            }
            Some(Err(e)) => {
                warn!(error = %e, connection_id = %connection_id, "WebSocket read error");
                break;
            }
            None => {
                info!(connection_id = %connection_id, "WebSocket connection closed by client");
                break;
            }
        }
    }

    // Cancel the event forwarder task
    event_forwarder.abort();

    // Clean up connection
    {
        let mut manager = connection_manager.lock().await;
        manager.remove_connection(&connection_id);
    }
}

/// Process an incoming WebSocket message and return an optional response.
///
/// Returns `Some(WsOutgoingMessage)` for synchronous responses,
/// `None` for messages that trigger async streaming (command, chat).
async fn process_message(message: &Message, state: &AppState) -> Option<WsOutgoingMessage> {
    match message {
        Message::Text(text) => {
            // Parse the incoming JSON message
            let parsed: WsIncomingMessage = match serde_json::from_str(text) {
                Ok(msg) => msg,
                Err(e) => {
                    return Some(WsOutgoingMessage::error(format!(
                        "Invalid JSON message: {}",
                        e
                    )));
                }
            };

            match parsed {
                WsIncomingMessage::Command {
                    command,
                    args,
                    cwd,
                    id,
                } => {
                    // Execute command in background and stream output
                    handle_command(state.clone(), command, args, cwd, id).await;
                    None // Response is streamed asynchronously
                }
                WsIncomingMessage::Chat {
                    message,
                    session_id,
                    model,
                } => {
                    // Process chat in background and stream response
                    handle_chat(state.clone(), message, session_id, model).await;
                    None // Response is streamed asynchronously
                }
                WsIncomingMessage::Subscribe { events } => {
                    info!(events = ?events, "Client subscribed to events");
                    Some(WsOutgoingMessage::success(
                        "subscribed",
                        Some(serde_json::json!({
                            "events": events
                        })),
                    ))
                }
                WsIncomingMessage::Ping => Some(WsOutgoingMessage::success(
                    "pong",
                    Some(serde_json::json!({
                        "timestamp": chrono::Utc::now().to_rfc3339()
                    })),
                )),
            }
        }
        Message::Binary(data) => {
            warn!("Received binary WebSocket message ({} bytes)", data.len());
            Some(WsOutgoingMessage::error(
                "Binary messages are not supported",
            ))
        }
        Message::Close(close_frame) => {
            let reason = close_frame
                .as_ref()
                .map(|f| f.reason.to_string())
                .unwrap_or_else(|| "Client closed connection".to_string());
            info!(reason = %reason, "WebSocket close frame received");
            None
        }
        Message::Ping(_data) => {
            // axum handles Pong responses automatically for Ping messages
            None
        }
        Message::Pong(_) => None,
    }
}

// ============================================================================
// Command Handler
// ============================================================================

/// Execute a command and stream stdout/stderr output over WebSocket.
///
/// Spawns a background task that:
/// 1. Validates the command against the allowlist
/// 2. Executes the command using tokio::process::Command
/// 3. Streams stdout/stderr chunks as they become available
/// 4. Sends a completion event when the command finishes
async fn handle_command(
    state: AppState,
    command: String,
    args: Vec<String>,
    cwd: Option<String>,
    command_id: Option<String>,
) {
    let command_id = command_id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let tx = state.ws_tx.clone();

    info!(
        command_id = %command_id,
        command = %command,
        args = ?args,
        "WebSocket command execution started"
    );

    let full_command = if args.is_empty() {
        command.clone()
    } else {
        format!("{} {}", command, args.join(" "))
    };

    // Security validation
    if let Err(e) = validate_command(&full_command) {
        let _ = tx.send(WsEvent::new(
            WsEventType::CommandComplete,
            serde_json::json!({
                "id": command_id,
                "error": e.to_string(),
                "exit_code": -1,
            }),
        ));
        return;
    }

    let work_dir = match &cwd {
        Some(cwd) => std::path::PathBuf::from(cwd),
        None => state.work_dir.clone(),
    };

    tokio::spawn(async move {
        let mut cmd = tokio::process::Command::new(&command);
        cmd.args(&args);
        cmd.current_dir(&work_dir);

        // Use separate stdout/stderr pipes for streaming
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());

        let start = std::time::Instant::now();

        match cmd.spawn() {
            Ok(mut child) => {
                let stdout_handle = child.stdout.take();
                let stderr_handle = child.stderr.take();

                // Stream stdout
                if let Some(mut stdout) = stdout_handle {
                    let tx_clone = tx.clone();
                    let cmd_id = command_id.clone();
                    tokio::spawn(async move {
                        use tokio::io::AsyncReadExt;
                        let mut buffer = [0u8; 1024];
                        loop {
                            match stdout.read(&mut buffer).await {
                                Ok(0) => break, // EOF
                                Ok(n) => {
                                    let output = String::from_utf8_lossy(&buffer[..n]).to_string();
                                    let _ = tx_clone.send(WsEvent::new(
                                        WsEventType::CommandOutput,
                                        serde_json::json!({
                                            "id": cmd_id,
                                            "stream": "stdout",
                                            "data": output,
                                        }),
                                    ));
                                }
                                Err(e) => {
                                    warn!(error = %e, "Failed to read stdout");
                                    break;
                                }
                            }
                        }
                    });
                }

                // Stream stderr
                if let Some(mut stderr) = stderr_handle {
                    let tx_clone = tx.clone();
                    let cmd_id = command_id.clone();
                    tokio::spawn(async move {
                        use tokio::io::AsyncReadExt;
                        let mut buffer = [0u8; 1024];
                        loop {
                            match stderr.read(&mut buffer).await {
                                Ok(0) => break, // EOF
                                Ok(n) => {
                                    let output = String::from_utf8_lossy(&buffer[..n]).to_string();
                                    let _ = tx_clone.send(WsEvent::new(
                                        WsEventType::CommandOutput,
                                        serde_json::json!({
                                            "id": cmd_id,
                                            "stream": "stderr",
                                            "data": output,
                                        }),
                                    ));
                                }
                                Err(e) => {
                                    warn!(error = %e, "Failed to read stderr");
                                    break;
                                }
                            }
                        }
                    });
                }

                // Wait for command to complete
                match child.wait().await {
                    Ok(status) => {
                        let duration = start.elapsed();
                        let exit_code = status.code();
                        info!(
                            command_id = %command_id,
                            exit_code = ?exit_code,
                            duration_ms = duration.as_millis(),
                            "Command execution completed"
                        );
                        let _ = tx.send(WsEvent::new(
                            WsEventType::CommandComplete,
                            serde_json::json!({
                                "id": command_id,
                                "exit_code": exit_code,
                                "duration_ms": duration.as_millis(),
                            }),
                        ));
                    }
                    Err(e) => {
                        error!(error = %e, command_id = %command_id, "Failed to wait for command");
                        let _ = tx.send(WsEvent::new(
                            WsEventType::CommandComplete,
                            serde_json::json!({
                                "id": command_id,
                                "error": format!("Failed to wait for command: {}", e),
                                "exit_code": -1,
                            }),
                        ));
                    }
                }
            }
            Err(e) => {
                error!(error = %e, command_id = %command_id, "Failed to spawn command");
                let _ = tx.send(WsEvent::new(
                    WsEventType::CommandComplete,
                    serde_json::json!({
                        "id": command_id,
                        "error": format!("Failed to execute command: {}", e),
                        "exit_code": -1,
                    }),
                ));
            }
        }
    });
}

// ============================================================================
// Chat Handler
// ============================================================================

/// Process a chat message and stream AI response tokens over WebSocket.
///
/// Spawns a background task that:
/// 1. Creates chat state and session
/// 2. Runs the conversation turn
/// 3. Streams tokens as they are generated
async fn handle_chat(
    state: AppState,
    user_message: String,
    session_id: Option<String>,
    model: Option<String>,
) {
    use crate::llm_client::{DynamicModelLlmClient, LlmClientConfig};
    use crate::routes::chat::ServerToolExecutor;
    use runtime::{
        ApiRequest, AssistantEvent, ContentBlock, ConversationMessage, PermissionMode,
        PermissionOutcome, PermissionPolicy, TokenUsage,
    };

    let tx = state.ws_tx.clone();

    info!(
        session_id = ?session_id,
        message_len = user_message.len(),
        "WebSocket chat processing started"
    );

    tokio::spawn(async move {
        // Get or create session
        let session = get_or_create_session(&state.sessions, session_id.clone()).await;
        let sid = session.session_id.clone();

        // Resolve model
        let llm_config = LlmClientConfig::default();
        let model = resolve_model(model.as_deref(), &llm_config.default_model);

        // Build system prompt
        let system_prompt = vec!["You are a helpful AI assistant.".to_string()];

        // Push user message to session
        let mut session = session;
        if let Err(e) = session.push_user_text(user_message.clone()) {
            let _ = tx.send(WsEvent::new(
                WsEventType::ChatComplete,
                serde_json::json!({
                    "session_id": sid,
                    "error": format!("Failed to process message: {}", e),
                }),
            ));
            return;
        }

        let permission_policy = PermissionPolicy::new(PermissionMode::WorkspaceWrite);
        let mut tool_executor = ServerToolExecutor::new(state.work_dir.clone());
        let mut total_usage = TokenUsage::default();
        let mut iterations = 0;
        let max_iterations = 20;

        loop {
            iterations += 1;
            if iterations > max_iterations {
                let _ = tx.send(WsEvent::new(
                    WsEventType::ChatComplete,
                    serde_json::json!({
                        "session_id": sid,
                        "error": "conversation loop exceeded the maximum number of iterations",
                    }),
                ));
                break;
            }

            // Build API request
            let api_request = ApiRequest {
                system_prompt: system_prompt.clone(),
                messages: session.messages.clone(),
            };

            // Stream from LLM
            let mut llm_config = LlmClientConfig::default();
            llm_config.default_model = model.clone();
            let client = DynamicModelLlmClient::new(llm_config);

            match client.stream_with_model(api_request, &model).await {
                Ok((response_id, events)) => {
                    // Process events and stream tokens
                    let mut text = String::new();
                    let mut blocks = Vec::new();
                    let mut turn_usage = TokenUsage::default();

                    for event in &events {
                        match event {
                            AssistantEvent::TextDelta(delta) => {
                                text.push_str(delta);
                                // Send token delta as WebSocket event
                                let _ = tx.send(WsEvent::new(
                                    WsEventType::ChatToken,
                                    serde_json::json!({
                                        "session_id": sid,
                                        "delta": delta,
                                    }),
                                ));
                            }
                            AssistantEvent::ToolUse { id, name, input } => {
                                // Flush text before tool use
                                if !text.is_empty() {
                                    blocks.push(ContentBlock::Text {
                                        text: std::mem::take(&mut text),
                                    });
                                }
                                blocks.push(ContentBlock::ToolUse {
                                    id: id.clone(),
                                    name: name.clone(),
                                    input: input.clone(),
                                });
                            }
                            AssistantEvent::Usage(u) => {
                                turn_usage.input_tokens += u.input_tokens;
                                turn_usage.output_tokens += u.output_tokens;
                                turn_usage.cache_creation_input_tokens +=
                                    u.cache_creation_input_tokens;
                                turn_usage.cache_read_input_tokens += u.cache_read_input_tokens;
                            }
                            AssistantEvent::MessageStop => {}
                            _ => {}
                        }
                    }

                    // Flush remaining text
                    if !text.is_empty() {
                        blocks.push(ContentBlock::Text { text });
                    }

                    // Update total usage
                    total_usage.input_tokens += turn_usage.input_tokens;
                    total_usage.output_tokens += turn_usage.output_tokens;
                    total_usage.cache_creation_input_tokens +=
                        turn_usage.cache_creation_input_tokens;
                    total_usage.cache_read_input_tokens += turn_usage.cache_read_input_tokens;

                    // Build assistant message
                    let assistant_message = ConversationMessage::assistant(blocks);

                    // Push assistant message
                    if let Err(e) = session.push_message(assistant_message.clone()) {
                        warn!(error = %e, "Failed to push assistant message");
                        break;
                    }

                    // Check for tool calls
                    let pending_tool_uses: Vec<(String, String, String)> = assistant_message
                        .blocks
                        .iter()
                        .filter_map(|block| match block {
                            ContentBlock::ToolUse { id, name, input } => {
                                Some((id.clone(), name.clone(), input.clone()))
                            }
                            _ => None,
                        })
                        .collect();

                    if pending_tool_uses.is_empty() {
                        // No more tool calls - send usage and done
                        let _ = tx.send(WsEvent::new(
                            WsEventType::ChatComplete,
                            serde_json::json!({
                                "session_id": sid,
                                "response_id": response_id,
                                "input_tokens": total_usage.input_tokens,
                                "output_tokens": total_usage.output_tokens,
                                "total_tokens": total_usage.total_tokens(),
                            }),
                        ));
                        break;
                    }

                    // Execute tools
                    for (tool_use_id, tool_name, input) in pending_tool_uses {
                        let permission_outcome =
                            permission_policy.authorize(&tool_name, &input, None);

                        let result_message = match permission_outcome {
                            PermissionOutcome::Allow => {
                                let (output, is_error) =
                                    match tool_executor.execute(&tool_name, &input) {
                                        Ok(output) => (output, false),
                                        Err(e) => (e.to_string(), true),
                                    };
                                ConversationMessage::tool_result(
                                    tool_use_id,
                                    tool_name,
                                    output,
                                    is_error,
                                )
                            }
                            PermissionOutcome::Deny { reason } => ConversationMessage::tool_result(
                                tool_use_id,
                                tool_name,
                                reason,
                                true,
                            ),
                        };

                        if let Err(e) = session.push_message(result_message) {
                            warn!(error = %e, "Failed to push tool result");
                            break;
                        }
                    }
                }
                Err(e) => {
                    error!(error = %e, "LLM stream error in WebSocket chat");
                    let _ = tx.send(WsEvent::new(
                        WsEventType::ChatComplete,
                        serde_json::json!({
                            "session_id": sid,
                            "error": format!("LLM stream error: {}", e),
                        }),
                    ));
                    break;
                }
            }
        }
    });
}

// ============================================================================
// Connection Manager Helpers
// ============================================================================

/// Get or initialize the global connection manager stored in application state.
///
/// For simplicity, we create a thread-local connection manager. In production
/// this should be part of AppState.
async fn get_or_init_connection_manager(_state: &AppState) -> SharedConnectionManager {
    // In a production system, this would be stored in AppState.
    // For now, we create a per-handler instance.
    static MANAGER: std::sync::OnceLock<Arc<Mutex<ConnectionManager>>> = std::sync::OnceLock::new();
    MANAGER
        .get_or_init(|| Arc::new(Mutex::new(ConnectionManager::new())))
        .clone()
}
