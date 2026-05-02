use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::State;
use axum::response::sse::{Event, KeepAlive};
use axum::response::Sse;
use axum::Json;
use futures::Stream;
use runtime::{
    ApiRequest, AssistantEvent, ContentBlock, ConversationMessage, PermissionMode,
    PermissionOutcome, PermissionPolicy, Session,
};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use tokio_stream::wrappers::ReceiverStream;
use tracing::{info, warn};

use crate::llm_client::{DynamicModelLlmClient, LlmClientConfig};
use crate::middleware::error_handler::AppError;
use crate::routes::commands::validate_command;
use crate::state::AppState;

// ============================================================================
// Request / Response types
// ============================================================================

#[derive(Deserialize)]
pub struct ChatRequest {
    pub message: String,
    #[serde(default)]
    pub session_id: Option<String>,
    #[serde(default)]
    pub model: Option<String>,
}

#[derive(Serialize)]
pub struct ChatResponse {
    pub id: String,
    pub response: String,
    pub session_id: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub cache_creation_input_tokens: u32,
    pub cache_read_input_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Serialize)]
pub struct StreamTokenEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub delta: String,
    pub session_id: String,
}

#[derive(Serialize)]
pub struct StreamToolUseEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub tool_id: String,
    pub tool_name: String,
    pub session_id: String,
}

#[derive(Serialize)]
pub struct StreamUsageEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub cache_creation_input_tokens: u32,
    pub cache_read_input_tokens: u32,
    pub total_tokens: u32,
    pub session_id: String,
}

#[derive(Serialize)]
pub struct StreamDoneEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub response_id: String,
    pub session_id: String,
}

// ============================================================================
// Tool executor
// ============================================================================

pub struct ServerToolExecutor {
    work_dir: std::path::PathBuf,
}

impl ServerToolExecutor {
    pub fn new(work_dir: std::path::PathBuf) -> Self {
        Self { work_dir }
    }

    pub fn execute(&mut self, tool_name: &str, input: &str) -> Result<String, String> {
        match tool_name {
            "read_file" => self.execute_read_file(input),
            "write_file" => self.execute_write_file(input),
            "edit_file" => self.execute_edit_file(input),
            "bash" | "run_command" => self.execute_bash(input),
            "glob_search" => self.execute_glob_search(input),
            "grep_search" => self.execute_grep_search(input),
            _ => Err(format!("unknown tool: {tool_name}")),
        }
    }

    fn resolve_path(&self, path: &str) -> Result<std::path::PathBuf, String> {
        // Reject paths containing ".." to prevent directory traversal
        if path.contains("..") {
            return Err(format!("path traversal detected: '{path}' contains '..'"));
        }

        let p = std::path::PathBuf::from(path);
        let resolved = if p.is_absolute() {
            p
        } else {
            self.work_dir.join(p)
        };

        // Canonicalize both the resolved path and work_dir to resolve symlinks
        // and relative components, then verify the resolved path starts with work_dir
        let canonical_work_dir = self
            .work_dir
            .canonicalize()
            .map_err(|e| format!("failed to canonicalize work_dir: {e}"))?;

        // For paths that don't exist yet (e.g., new files being written),
        // we canonicalize the parent directory and verify against that
        let canonical_resolved = match resolved.canonicalize() {
            Ok(p) => p,
            Err(_) => {
                // Path doesn't exist yet, try to canonicalize parent
                if let Some(parent) = resolved.parent() {
                    let canonical_parent = parent
                        .canonicalize()
                        .map_err(|e| format!("failed to canonicalize parent directory: {e}"))?;
                    if let Some(file_name) = resolved.file_name() {
                        canonical_parent.join(file_name)
                    } else {
                        canonical_parent
                    }
                } else {
                    return Err(format!("path has no valid parent directory: {path}"));
                }
            }
        };

        if !canonical_resolved.starts_with(&canonical_work_dir) {
            return Err(format!("path '{path}' resolves outside of work directory"));
        }

        Ok(canonical_resolved)
    }

    fn execute_read_file(&self, input: &str) -> Result<String, String> {
        let parsed: serde_json::Value =
            serde_json::from_str(input).map_err(|e| format!("invalid JSON: {e}"))?;
        let path = parsed
            .get("path")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "read_file requires 'path'".to_string())?;
        let full_path = self.resolve_path(path)?;
        runtime::read_file(&full_path.to_string_lossy(), None, None)
            .map_err(|e| format!("read_file failed: {e}"))
            .and_then(|output| {
                serde_json::to_string(&output).map_err(|e| format!("serialization error: {e}"))
            })
    }

    fn execute_write_file(&self, input: &str) -> Result<String, String> {
        let parsed: serde_json::Value =
            serde_json::from_str(input).map_err(|e| format!("invalid JSON: {e}"))?;
        let path = parsed
            .get("path")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "write_file requires 'path'".to_string())?;
        let content = parsed
            .get("content")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "write_file requires 'content'".to_string())?;
        let full_path = self.resolve_path(path)?;
        runtime::write_file(&full_path.to_string_lossy(), content)
            .map_err(|e| format!("write_file failed: {e}"))
            .and_then(|output| {
                serde_json::to_string(&output).map_err(|e| format!("serialization error: {e}"))
            })
    }

    fn execute_edit_file(&self, input: &str) -> Result<String, String> {
        let parsed: serde_json::Value =
            serde_json::from_str(input).map_err(|e| format!("invalid JSON: {e}"))?;
        let path = parsed
            .get("path")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "edit_file requires 'path'".to_string())?;
        let old_string = parsed
            .get("old_string")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "edit_file requires 'old_string'".to_string())?;
        let new_string = parsed
            .get("new_string")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "edit_file requires 'new_string'".to_string())?;
        let full_path = self.resolve_path(path)?;
        runtime::edit_file(&full_path.to_string_lossy(), old_string, new_string, false)
            .map_err(|e| format!("edit_file failed: {e}"))
            .and_then(|output| {
                serde_json::to_string(&output).map_err(|e| format!("serialization error: {e}"))
            })
    }

    fn execute_bash(&self, input: &str) -> Result<String, String> {
        let parsed: runtime::BashCommandInput =
            serde_json::from_str(input).map_err(|e| format!("invalid JSON: {e}"))?;

        // Validate command against allowlist before execution
        validate_command(&parsed.command).map_err(|e| e.to_string())?;

        // Use .current_dir() instead of std::env::set_current_dir() to avoid race conditions
        // with concurrent requests changing the process-wide working directory
        let mut cmd = std::process::Command::new(if cfg!(windows) { "cmd" } else { "bash" });
        if cfg!(windows) {
            cmd.arg("/C").arg(&parsed.command);
        } else {
            cmd.arg("-c").arg(&parsed.command);
        }
        cmd.current_dir(&self.work_dir);

        let output = cmd.output().map_err(|e| format!("bash failed: {e}"))?;

        let raw_stdout = String::from_utf8_lossy(&output.stdout);
        let raw_stderr = String::from_utf8_lossy(&output.stderr);

        // Sanitize sensitive information from output
        let sanitized_stdout = crate::routes::commands::sanitize_output(&raw_stdout);
        let sanitized_stderr = crate::routes::commands::sanitize_output(&raw_stderr);

        let result = serde_json::json!({
            "stdout": sanitized_stdout,
            "stderr": sanitized_stderr,
            "interrupted": false,
        });

        serde_json::to_string(&result).map_err(|e| format!("serialization error: {e}"))
    }

    fn execute_glob_search(&self, input: &str) -> Result<String, String> {
        let parsed: serde_json::Value =
            serde_json::from_str(input).map_err(|e| format!("invalid JSON: {e}"))?;
        let pattern = parsed
            .get("pattern")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "glob_search requires 'pattern'".to_string())?;
        runtime::glob_search(pattern, Some(&self.work_dir.to_string_lossy()))
            .map_err(|e| format!("glob_search failed: {e}"))
            .and_then(|output| {
                serde_json::to_string(&output).map_err(|e| format!("serialization error: {e}"))
            })
    }

    fn execute_grep_search(&self, input: &str) -> Result<String, String> {
        let parsed: runtime::GrepSearchInput =
            serde_json::from_str(input).map_err(|e| format!("invalid JSON: {e}"))?;
        runtime::grep_search(&parsed)
            .map_err(|e| format!("grep_search failed: {e}"))
            .and_then(|output| {
                serde_json::to_string(&output).map_err(|e| format!("serialization error: {e}"))
            })
    }
}

// ============================================================================
// Helpers
// ============================================================================

pub async fn get_or_create_session(
    sessions: &Arc<Mutex<HashMap<String, Session>>>,
    session_id: Option<String>,
) -> Session {
    let mut map = sessions.lock().await;
    if let Some(id) = &session_id {
        if let Some(session) = map.get(id) {
            return session.clone();
        }
    }
    let session = Session::new();
    let sid = session.session_id.clone();
    map.insert(sid, session.clone());
    session
}

pub fn resolve_model(request_model: Option<&str>, default_model: &str) -> String {
    request_model
        .filter(|m| !m.is_empty())
        .unwrap_or(default_model)
        .to_string()
}

// ============================================================================
// Shared Chat Engine
// ============================================================================

/// Accumulated usage statistics from a conversation turn.
#[derive(Debug, Default)]
pub struct ConversationUsage {
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub cache_creation_input_tokens: u32,
    pub cache_read_input_tokens: u32,
}

/// Shared conversation engine that handles the LLM interaction loop.
pub struct ChatEngine {
    llm_client: DynamicModelLlmClient,
    tool_executor: ServerToolExecutor,
    permission_policy: PermissionPolicy,
    system_prompt: Vec<String>,
    model: String,
    max_iterations: usize,
}

impl ChatEngine {
    pub fn new(
        llm_client: DynamicModelLlmClient,
        tool_executor: ServerToolExecutor,
        model: String,
    ) -> Self {
        Self {
            llm_client,
            tool_executor,
            permission_policy: PermissionPolicy::new(PermissionMode::WorkspaceWrite),
            system_prompt: vec!["You are a helpful AI assistant.".to_string()],
            model,
            max_iterations: 20,
        }
    }

    /// Run a single conversation turn, processing tool calls and accumulating usage.
    /// Returns the response_id and whether there are pending tool calls.
    pub async fn run_turn(
        &mut self,
        session: &mut Session,
        usage: &mut ConversationUsage,
        mut on_token: impl FnMut(&str),
        mut on_tool_use: impl FnMut(&str, &str, &str),
    ) -> Result<(String, bool), AppError> {
        let (response_id, events) = self
            .llm_client
            .stream_with_model(
                ApiRequest {
                    system_prompt: self.system_prompt.clone(),
                    messages: session.messages.clone(),
                },
                &self.model,
            )
            .await
            .map_err(|e| AppError::internal(format!("LLM error: {e}")))?;

        let mut blocks = Vec::new();
        let mut text_buf = String::new();
        let mut has_tool_calls = false;

        for event in events {
            match event {
                AssistantEvent::TextDelta(delta) => {
                    text_buf.push_str(&delta);
                    on_token(&delta);
                }
                AssistantEvent::ToolUse { id, name, input } => {
                    if !text_buf.is_empty() {
                        blocks.push(ContentBlock::Text {
                            text: std::mem::take(&mut text_buf),
                        });
                    }
                    blocks.push(ContentBlock::ToolUse {
                        id: id.clone(),
                        name: name.clone(),
                        input: input.clone(),
                    });
                    has_tool_calls = true;

                    on_tool_use(&id, &name, &input);

                    let outcome = self.permission_policy.authorize(&name, &input, None);
                    match outcome {
                        PermissionOutcome::Allow => {
                            match self.tool_executor.execute(&name, &input) {
                                Ok(output) => {
                                    session
                                        .push_message(ConversationMessage::tool_result(
                                            id, name, output, false,
                                        ))
                                        .ok();
                                }
                                Err(e) => {
                                    session
                                        .push_message(ConversationMessage::tool_result(
                                            id, name, e, true,
                                        ))
                                        .ok();
                                }
                            }
                        }
                        PermissionOutcome::Deny { reason } => {
                            session
                                .push_message(ConversationMessage::tool_result(
                                    id, name, reason, true,
                                ))
                                .ok();
                        }
                    }
                }
                AssistantEvent::Usage(u) => {
                    usage.input_tokens += u.input_tokens;
                    usage.output_tokens += u.output_tokens;
                    usage.cache_creation_input_tokens += u.cache_creation_input_tokens;
                    usage.cache_read_input_tokens += u.cache_read_input_tokens;
                }
                _ => {}
            }
        }

        if !text_buf.is_empty() {
            blocks.push(ContentBlock::Text {
                text: std::mem::take(&mut text_buf),
            });
        }

        if !blocks.is_empty() {
            session
                .push_message(ConversationMessage::assistant(blocks))
                .ok();
        }

        Ok((response_id, has_tool_calls))
    }

    /// Run the full conversation loop until no more tool calls.
    pub async fn run_full(
        &mut self,
        session: &mut Session,
        mut on_token: impl FnMut(&str),
        mut on_tool_use: impl FnMut(&str, &str, &str),
    ) -> Result<(String, ConversationUsage), AppError> {
        let mut total_usage = ConversationUsage::default();
        let mut response_id = String::new();

        for _ in 0..self.max_iterations {
            let (rid, has_tool_calls) = self
                .run_turn(session, &mut total_usage, &mut on_token, &mut on_tool_use)
                .await?;
            response_id = rid;

            if !has_tool_calls {
                break;
            }
        }

        Ok((response_id, total_usage))
    }
}

// ============================================================================
// Route handlers
// ============================================================================

#[axum::debug_handler]
pub async fn send_message(
    State(app_state): State<AppState>,
    Json(request): Json<ChatRequest>,
) -> Result<Json<ChatResponse>, AppError> {
    info!(session_id = ?request.session_id, "Processing chat message");

    if request.message.is_empty() {
        return Err(AppError::bad_request("message must not be empty"));
    }

    let work_dir = app_state.work_dir.clone();
    let llm_config = LlmClientConfig::default();
    let model = resolve_model(request.model.as_deref(), &llm_config.default_model);

    let mut config = llm_config.clone();
    config.default_model = model.clone();
    let llm_client = DynamicModelLlmClient::new(config);
    let tool_executor = ServerToolExecutor::new(work_dir);

    let session = get_or_create_session(&app_state.sessions, request.session_id.clone()).await;
    let session_id = session.session_id.clone();

    let mut session = session;
    session
        .push_user_text(request.message.clone())
        .map_err(|e| AppError::internal(format!("Failed to push user message: {e}")))?;

    let mut engine = ChatEngine::new(llm_client, tool_executor, model);
    let mut response_text = String::new();

    let (response_id, usage) = engine
        .run_full(
            &mut session,
            |delta| {
                response_text.push_str(delta);
            },
            |_, _, _| {},
        )
        .await?;

    let total = usage.input_tokens
        + usage.output_tokens
        + usage.cache_creation_input_tokens
        + usage.cache_read_input_tokens;

    Ok(Json(ChatResponse {
        id: response_id,
        response: response_text.trim().to_string(),
        session_id,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_creation_input_tokens: usage.cache_creation_input_tokens,
        cache_read_input_tokens: usage.cache_read_input_tokens,
        total_tokens: total,
    }))
}

#[axum::debug_handler]
pub async fn stream_message(
    State(app_state): State<AppState>,
    Json(request): Json<ChatRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, std::convert::Infallible>>>, AppError> {
    info!(session_id = ?request.session_id, "Processing chat message (streaming)");

    if request.message.is_empty() {
        return Err(AppError::bad_request("message must not be empty"));
    }

    let work_dir = app_state.work_dir.clone();
    let llm_config = LlmClientConfig::default();
    let model = resolve_model(request.model.as_deref(), &llm_config.default_model);

    let session = get_or_create_session(&app_state.sessions, request.session_id.clone()).await;
    let session_id = session.session_id.clone();

    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Event, std::convert::Infallible>>(32);
    let tx = Arc::new(std::sync::Mutex::new(tx));

    let sessions = app_state.sessions.clone();
    let app_state_clone = app_state.clone();
    let user_input = request.message.clone();
    let model_clone = model.clone();

    tokio::spawn(async move {
        let mut session = session;
        if let Err(e) = session.push_user_text(user_input.clone()) {
            let _ = tx
                .lock()
                .unwrap()
                .blocking_send(Ok(Event::default().data(format!("{{\"error\":\"{e}\"}}"))));
            return;
        }

        let mut config = LlmClientConfig::default();
        config.default_model = model_clone.clone();
        let llm_client = DynamicModelLlmClient::new(config);
        let tool_executor = ServerToolExecutor::new(work_dir);

        let mut engine = ChatEngine::new(llm_client, tool_executor, model_clone);

        let mut response_id = String::new();
        let mut total_usage = ConversationUsage::default();
        let max_iterations = engine.max_iterations;

        for _ in 0..max_iterations {
            match engine
                .run_turn(
                    &mut session,
                    &mut total_usage,
                    |delta| {
                        let data = serde_json::to_string(&StreamTokenEvent {
                            event_type: "token".into(),
                            delta: delta.to_string(),
                            session_id: session_id.clone(),
                        })
                        .unwrap_or_default();
                        let _ = tx
                            .lock()
                            .unwrap()
                            .blocking_send(Ok(Event::default().data(data)));
                    },
                    |id, name, _input| {
                        let data = serde_json::to_string(&StreamToolUseEvent {
                            event_type: "tool_use".into(),
                            tool_id: id.to_string(),
                            tool_name: name.to_string(),
                            session_id: session_id.clone(),
                        })
                        .unwrap_or_default();
                        let _ = tx
                            .lock()
                            .unwrap()
                            .blocking_send(Ok(Event::default().data(data)));
                    },
                )
                .await
            {
                Ok((rid, has_tool_calls)) => {
                    response_id = rid;
                    if !has_tool_calls {
                        break;
                    }
                }
                Err(e) => {
                    warn!(error = %e, "LLM stream error");
                    break;
                }
            }
        }

        // Send final usage stats
        let total = total_usage.input_tokens
            + total_usage.output_tokens
            + total_usage.cache_creation_input_tokens
            + total_usage.cache_read_input_tokens;
        let data = serde_json::to_string(&StreamUsageEvent {
            event_type: "usage".into(),
            input_tokens: total_usage.input_tokens,
            output_tokens: total_usage.output_tokens,
            cache_creation_input_tokens: total_usage.cache_creation_input_tokens,
            cache_read_input_tokens: total_usage.cache_read_input_tokens,
            total_tokens: total,
            session_id: session_id.clone(),
        })
        .unwrap_or_default();
        let _ = tx
            .lock()
            .unwrap()
            .blocking_send(Ok(Event::default().data(data)));

        // Save session to in-memory store
        let mut map = sessions.lock().await;
        map.insert(session_id.clone(), session.clone());

        // Persist session to SQLite for crash recovery
        if let Err(e) = app_state_clone.persist_session(&session).await {
            tracing::warn!(error = %e, "Failed to persist session to database");
        }

        // Send done event
        let data = serde_json::to_string(&StreamDoneEvent {
            event_type: "done".into(),
            response_id,
            session_id: session_id.clone(),
        })
        .unwrap_or_default();
        let _ = tx
            .lock()
            .unwrap()
            .blocking_send(Ok(Event::default().data(data)));
    });

    let event_stream = ReceiverStream::new(rx);

    Ok(Sse::new(event_stream)
        .keep_alive(KeepAlive::new().interval(std::time::Duration::from_secs(15))))
}

#[axum::debug_handler]
pub async fn list_sessions(State(app_state): State<AppState>) -> Json<serde_json::Value> {
    let sessions = app_state.sessions.lock().await;
    let session_list: Vec<serde_json::Value> = sessions
        .values()
        .map(|s| {
            serde_json::json!({
                "session_id": s.session_id,
                "created_at_ms": s.created_at_ms,
                "updated_at_ms": s.updated_at_ms,
                "message_count": s.messages.len(),
                "model": s.model,
            })
        })
        .collect();

    Json(serde_json::json!({
        "sessions": session_list,
        "total": session_list.len()
    }))
}
