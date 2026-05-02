//! LLM client that connects to llama.cpp via its OpenAI-compatible API.
//!
//! Implements the [`runtime::ApiClient`] trait by translating runtime
//! [`runtime::ApiRequest`] / [`runtime::AssistantEvent`] types to/from the
//! api crate's streaming types, and delegating to
//! [`api::OpenAiCompatClient`] under the hood.

use std::sync::Arc;

use api::{ContentBlockDelta, InputContentBlock, InputMessage, MessageRequest, StreamEvent};
use api::{OpenAiCompatClient, OpenAiCompatConfig};
use runtime::{ApiClient, ApiRequest, AssistantEvent, RuntimeError, TokenUsage};
use serde_json::Value;
use tokio::sync::Mutex;
use tracing::{debug, warn};

/// Default base URL for llama.cpp's OpenAI-compatible server.
pub const DEFAULT_LLAMA_CPP_BASE_URL: &str = "http://localhost:8080/v1";

/// Configuration for the Llama.cpp client.
#[derive(Debug, Clone)]
pub struct LlmClientConfig {
    /// Base URL for the llama.cpp server (e.g., `http://localhost:8080/v1`).
    pub base_url: String,
    /// API key (llama.cpp typically doesn't require one, but we allow it).
    pub api_key: String,
    /// Default model to use if not specified in the request.
    pub default_model: String,
    /// Maximum number of tokens to generate.
    pub max_tokens: u32,
    /// Optional temperature for sampling.
    pub temperature: Option<f64>,
}

impl Default for LlmClientConfig {
    fn default() -> Self {
        Self {
            base_url: std::env::var("LLAMA_CPP_BASE_URL")
                .unwrap_or_else(|_| DEFAULT_LLAMA_CPP_BASE_URL.to_string()),
            api_key: std::env::var("LLAMA_CPP_API_KEY").unwrap_or_default(),
            default_model: std::env::var("LLAMA_CPP_MODEL")
                .unwrap_or_else(|_| "default".to_string()),
            max_tokens: 4096,
            temperature: None,
        }
    }
}

/// HTTP client that talks to llama.cpp's OpenAI-compatible `/v1/chat/completions` endpoint.
///
/// Wraps [`OpenAiCompatClient`] with a custom config pointing at the llama.cpp server.
#[derive(Clone)]
pub struct LlmClient {
    inner: Arc<Mutex<OpenAiCompatClient>>,
    config: LlmClientConfig,
}

impl LlmClient {
    /// Create a new LlmClient with the given configuration.
    pub fn new(config: LlmClientConfig) -> Self {
        let api_config = OpenAiCompatConfig {
            provider_name: "LlamaCpp",
            api_key_env: "LLAMA_CPP_API_KEY",
            base_url_env: "LLAMA_CPP_BASE_URL",
            default_base_url: DEFAULT_LLAMA_CPP_BASE_URL,
            max_request_body_bytes: 104_857_600,
        };

        let client =
            OpenAiCompatClient::new(&config.api_key, api_config).with_base_url(&config.base_url);

        Self {
            inner: Arc::new(Mutex::new(client)),
            config,
        }
    }

    /// Create a new LlmClient with default configuration.
    pub fn from_env() -> Self {
        Self::new(LlmClientConfig::default())
    }

    /// Convert runtime ApiRequest to api MessageRequest.
    fn build_message_request(&self, api_request: &ApiRequest, model: &str) -> MessageRequest {
        // Build system prompt by joining sections
        let system_prompt = if api_request.system_prompt.is_empty() {
            None
        } else {
            Some(api_request.system_prompt.join("\n\n"))
        };

        // Convert runtime messages to api messages
        let messages = api_request
            .messages
            .iter()
            .map(|msg| {
                let role = match msg.role {
                    runtime::MessageRole::System => "system".to_string(),
                    runtime::MessageRole::User => "user".to_string(),
                    runtime::MessageRole::Assistant => "assistant".to_string(),
                    runtime::MessageRole::Tool => "user".to_string(), // tool results map to user for OpenAI compat
                };

                let content: Vec<InputContentBlock> = msg
                    .blocks
                    .iter()
                    .filter_map(|block| match block {
                        runtime::ContentBlock::Text { text } => {
                            Some(InputContentBlock::Text { text: text.clone() })
                        }
                        runtime::ContentBlock::ToolUse { id, name, input } => {
                            Some(InputContentBlock::ToolUse {
                                id: id.clone(),
                                name: name.clone(),
                                input: Value::String(input.clone()),
                            })
                        }
                        runtime::ContentBlock::ToolResult {
                            tool_use_id,
                            output,
                            is_error,
                            ..
                        } => Some(InputContentBlock::ToolResult {
                            tool_use_id: tool_use_id.clone(),
                            content: vec![api::ToolResultContentBlock::Text {
                                text: output.clone(),
                            }],
                            is_error: *is_error,
                        }),
                    })
                    .collect();

                InputMessage { role, content }
            })
            .collect();

        MessageRequest {
            model: model.to_string(),
            max_tokens: self.config.max_tokens,
            messages,
            system: system_prompt,
            tools: None,
            tool_choice: None,
            stream: true,
            temperature: self.config.temperature,
            top_p: None,
            frequency_penalty: None,
            presence_penalty: None,
            stop: None,
            reasoning_effort: None,
        }
    }

    /// Convert api StreamEvent to runtime AssistantEvent.
    fn stream_event_to_assistant_event(event: &StreamEvent) -> Option<AssistantEvent> {
        match event {
            StreamEvent::ContentBlockDelta(delta_event) => match &delta_event.delta {
                ContentBlockDelta::TextDelta { text } => {
                    Some(AssistantEvent::TextDelta(text.clone()))
                }
                ContentBlockDelta::InputJsonDelta { partial_json } => {
                    Some(AssistantEvent::TextDelta(partial_json.clone()))
                }
                ContentBlockDelta::ThinkingDelta { thinking } => Some(AssistantEvent::TextDelta(
                    format!("<thinking>{thinking}</thinking>"),
                )),
                ContentBlockDelta::SignatureDelta { signature } => Some(AssistantEvent::TextDelta(
                    format!("<signature>{signature}</signature>"),
                )),
            },
            StreamEvent::ContentBlockStart(start_event) => match &start_event.content_block {
                api::OutputContentBlock::ToolUse { id, name, input } => {
                    Some(AssistantEvent::ToolUse {
                        id: id.clone(),
                        name: name.clone(),
                        input: serde_json::to_string(&input).unwrap_or_else(|_| "{}".to_string()),
                    })
                }
                _ => None,
            },
            StreamEvent::MessageDelta(delta_event) => {
                if delta_event.usage.input_tokens > 0 || delta_event.usage.output_tokens > 0 {
                    Some(AssistantEvent::Usage(TokenUsage {
                        input_tokens: delta_event.usage.input_tokens,
                        output_tokens: delta_event.usage.output_tokens,
                        cache_creation_input_tokens: delta_event.usage.cache_creation_input_tokens,
                        cache_read_input_tokens: delta_event.usage.cache_read_input_tokens,
                    }))
                } else {
                    None
                }
            }
            StreamEvent::MessageStop(_) => Some(AssistantEvent::MessageStop),
            _ => None,
        }
    }
}

impl LlmClient {
    /// Stream events asynchronously, avoiding block_on deadlocks in async contexts.
    pub async fn stream_async(
        &mut self,
        request: ApiRequest,
    ) -> Result<Vec<AssistantEvent>, RuntimeError> {
        let model = self.config.default_model.clone();
        let message_request = self.build_message_request(&request, &model);

        debug!(
            model = %model,
            message_count = request.messages.len(),
            "Sending request to llama.cpp"
        );

        let client_guard = self.inner.lock().await;
        let mut stream = client_guard
            .stream_message(&message_request)
            .await
            .map_err(|e| RuntimeError::new(format!("Failed to start stream: {e}")))?;

        let mut assistant_events = Vec::new();
        loop {
            match stream.next_event().await {
                Ok(Some(event)) => {
                    if let Some(assistant_event) = Self::stream_event_to_assistant_event(&event) {
                        assistant_events.push(assistant_event);
                    }
                }
                Ok(None) => break,
                Err(e) => {
                    warn!(error = %e, "Stream error from llama.cpp");
                    return Err(RuntimeError::new(format!("Stream error: {e}")));
                }
            }
        }

        Ok(assistant_events)
    }

    /// Synchronous stream wrapper for non-async callers.
    ///
    /// Creates a dedicated single-threaded runtime to avoid deadlocks
    /// when called from within an existing Tokio runtime.
    /// Prefer `stream_async` when calling from an async context.
    fn stream(&mut self, request: ApiRequest) -> Result<Vec<AssistantEvent>, RuntimeError> {
        let model = self.config.default_model.clone();
        let message_request = self.build_message_request(&request, &model);

        debug!(
            model = %model,
            message_count = request.messages.len(),
            "Sending request to llama.cpp"
        );

        let client = self.inner.clone();
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .map_err(|e| RuntimeError::new(format!("Failed to create tokio runtime: {e}")))?;

        let events = rt.block_on(async {
            let client_guard = client.lock().await;
            let mut stream = match client_guard.stream_message(&message_request).await {
                Ok(stream) => stream,
                Err(e) => return Err(RuntimeError::new(format!("Failed to start stream: {e}"))),
            };

            let mut assistant_events = Vec::new();
            loop {
                match stream.next_event().await {
                    Ok(Some(event)) => {
                        if let Some(assistant_event) = Self::stream_event_to_assistant_event(&event)
                        {
                            assistant_events.push(assistant_event);
                        }
                    }
                    Ok(None) => break,
                    Err(e) => {
                        warn!(error = %e, "Stream error from llama.cpp");
                        return Err(RuntimeError::new(format!("Stream error: {e}")));
                    }
                }
            }
            Ok(assistant_events)
        });

        events
    }
}

impl ApiClient for LlmClient {
    fn stream(&mut self, request: ApiRequest) -> Result<Vec<AssistantEvent>, RuntimeError> {
        self.stream(request)
    }
}

/// A version of LlmClient that can change the model per-request.
/// This is useful for the chat endpoint where the user can specify a model.
#[derive(Clone)]
pub struct DynamicModelLlmClient {
    base_client: Arc<Mutex<OpenAiCompatClient>>,
    base_config: LlmClientConfig,
}

impl DynamicModelLlmClient {
    /// Create a new DynamicModelLlmClient.
    pub fn new(config: LlmClientConfig) -> Self {
        let api_config = OpenAiCompatConfig {
            provider_name: "LlamaCpp",
            api_key_env: "LLAMA_CPP_API_KEY",
            base_url_env: "LLAMA_CPP_BASE_URL",
            default_base_url: DEFAULT_LLAMA_CPP_BASE_URL,
            max_request_body_bytes: 104_857_600,
        };

        let client =
            OpenAiCompatClient::new(&config.api_key, api_config).with_base_url(&config.base_url);

        Self {
            base_client: Arc::new(Mutex::new(client)),
            base_config: config,
        }
    }

    /// Create with default env-based configuration.
    pub fn from_env() -> Self {
        Self::new(LlmClientConfig::default())
    }

    /// Build a MessageRequest for a specific model.
    fn build_message_request(&self, api_request: &ApiRequest, model: &str) -> MessageRequest {
        let system_prompt = if api_request.system_prompt.is_empty() {
            None
        } else {
            Some(api_request.system_prompt.join("\n\n"))
        };

        let messages = api_request
            .messages
            .iter()
            .map(|msg| {
                let role = match msg.role {
                    runtime::MessageRole::System => "system".to_string(),
                    runtime::MessageRole::User => "user".to_string(),
                    runtime::MessageRole::Assistant => "assistant".to_string(),
                    runtime::MessageRole::Tool => "user".to_string(),
                };

                let content: Vec<InputContentBlock> = msg
                    .blocks
                    .iter()
                    .filter_map(|block| match block {
                        runtime::ContentBlock::Text { text } => {
                            Some(InputContentBlock::Text { text: text.clone() })
                        }
                        runtime::ContentBlock::ToolUse { id, name, input } => {
                            Some(InputContentBlock::ToolUse {
                                id: id.clone(),
                                name: name.clone(),
                                input: Value::String(input.clone()),
                            })
                        }
                        runtime::ContentBlock::ToolResult {
                            tool_use_id,
                            output,
                            is_error,
                            ..
                        } => Some(InputContentBlock::ToolResult {
                            tool_use_id: tool_use_id.clone(),
                            content: vec![api::ToolResultContentBlock::Text {
                                text: output.clone(),
                            }],
                            is_error: *is_error,
                        }),
                    })
                    .collect();

                InputMessage { role, content }
            })
            .collect();

        MessageRequest {
            model: model.to_string(),
            max_tokens: self.base_config.max_tokens,
            messages,
            system: system_prompt,
            tools: None,
            tool_choice: None,
            stream: true,
            temperature: self.base_config.temperature,
            top_p: None,
            frequency_penalty: None,
            presence_penalty: None,
            stop: None,
            reasoning_effort: None,
        }
    }

    /// Convert api StreamEvent to runtime AssistantEvent.
    fn stream_event_to_assistant_event(event: &StreamEvent) -> Option<AssistantEvent> {
        match event {
            StreamEvent::ContentBlockDelta(delta_event) => match &delta_event.delta {
                ContentBlockDelta::TextDelta { text } => {
                    Some(AssistantEvent::TextDelta(text.clone()))
                }
                ContentBlockDelta::InputJsonDelta { partial_json } => {
                    Some(AssistantEvent::TextDelta(partial_json.clone()))
                }
                ContentBlockDelta::ThinkingDelta { thinking } => Some(AssistantEvent::TextDelta(
                    format!("<thinking>{thinking}</thinking>"),
                )),
                ContentBlockDelta::SignatureDelta { signature } => Some(AssistantEvent::TextDelta(
                    format!("<signature>{signature}</signature>"),
                )),
            },
            StreamEvent::ContentBlockStart(start_event) => match &start_event.content_block {
                api::OutputContentBlock::ToolUse { id, name, input } => {
                    Some(AssistantEvent::ToolUse {
                        id: id.clone(),
                        name: name.clone(),
                        input: serde_json::to_string(&input).unwrap_or_else(|_| "{}".to_string()),
                    })
                }
                _ => None,
            },
            StreamEvent::MessageDelta(delta_event) => {
                if delta_event.usage.input_tokens > 0 || delta_event.usage.output_tokens > 0 {
                    Some(AssistantEvent::Usage(TokenUsage {
                        input_tokens: delta_event.usage.input_tokens,
                        output_tokens: delta_event.usage.output_tokens,
                        cache_creation_input_tokens: delta_event.usage.cache_creation_input_tokens,
                        cache_read_input_tokens: delta_event.usage.cache_read_input_tokens,
                    }))
                } else {
                    None
                }
            }
            StreamEvent::MessageStop(_) => Some(AssistantEvent::MessageStop),
            _ => None,
        }
    }

    /// Stream events for a given request and model.
    /// Returns the response ID (from the upstream) and the events.
    pub async fn stream_with_model(
        &self,
        request: ApiRequest,
        model: &str,
    ) -> Result<(String, Vec<AssistantEvent>), RuntimeError> {
        let message_request = self.build_message_request(&request, model);

        debug!(
            model = %model,
            message_count = request.messages.len(),
            "Sending request to llama.cpp"
        );

        let mut stream = {
            let client_guard = self.base_client.lock().await;
            client_guard
                .stream_message(&message_request)
                .await
                .map_err(|e| RuntimeError::new(format!("Failed to start stream: {e}")))?
        };

        let mut assistant_events = Vec::new();
        let mut response_id = String::new();

        loop {
            match stream.next_event().await {
                Ok(Some(event)) => {
                    // Capture response ID from message start
                    if let StreamEvent::MessageStart(start) = &event {
                        response_id = start.message.id.clone();
                    }

                    if let Some(assistant_event) = Self::stream_event_to_assistant_event(&event) {
                        assistant_events.push(assistant_event);
                    }
                }
                Ok(None) => break,
                Err(e) => {
                    warn!(error = %e, "Stream error from llama.cpp");
                    return Err(RuntimeError::new(format!("Stream error: {e}")));
                }
            }
        }

        if response_id.is_empty() {
            response_id = format!("llama-{}", uuid::Uuid::new_v4());
        }

        Ok((response_id, assistant_events))
    }

    /// Stream events as a tokio stream of SSE-compatible strings.
    /// Each yielded item is a full SSE event string (e.g., `data: {...}\n\n`).
    pub async fn stream_sse_events(
        &self,
        request: ApiRequest,
        model: &str,
    ) -> Result<impl futures::Stream<Item = Result<String, RuntimeError>>, RuntimeError> {
        let message_request = self.build_message_request(&request, model);

        let stream = {
            let client_guard = self.base_client.lock().await;
            client_guard
                .stream_message(&message_request)
                .await
                .map_err(|e| RuntimeError::new(format!("Failed to start stream: {e}")))?
        };

        Ok(futures::stream::unfold(
            (stream, false),
            |(mut stream, mut done)| async move {
                if done {
                    return None;
                }

                loop {
                    match stream.next_event().await {
                        Ok(Some(event)) => {
                            match &event {
                                StreamEvent::ContentBlockDelta(delta) => {
                                    if let ContentBlockDelta::TextDelta { text } = &delta.delta {
                                        let payload = serde_json::json!({
                                            "delta": text,
                                            "type": "text"
                                        });
                                        return Some((
                                            Ok(format!("data: {}\n\n", payload)),
                                            (stream, false),
                                        ));
                                    }
                                }
                                StreamEvent::MessageDelta(delta) => {
                                    if delta.usage.input_tokens > 0 || delta.usage.output_tokens > 0
                                    {
                                        let payload = serde_json::json!({
                                            "usage": {
                                                "input_tokens": delta.usage.input_tokens,
                                                "output_tokens": delta.usage.output_tokens,
                                                "cache_creation_input_tokens": delta.usage.cache_creation_input_tokens,
                                                "cache_read_input_tokens": delta.usage.cache_read_input_tokens,
                                            },
                                            "type": "usage"
                                        });
                                        return Some((
                                            Ok(format!("data: {}\n\n", payload)),
                                            (stream, false),
                                        ));
                                    }
                                }
                                StreamEvent::MessageStop(_) => {
                                    done = true;
                                    return Some((
                                        Ok("data: [DONE]\n\n".to_string()),
                                        (stream, true),
                                    ));
                                }
                                _ => {}
                            }
                            // Continue inner loop for non-text events
                        }
                        Ok(None) => {
                            done = true;
                            return Some((Ok("data: [DONE]\n\n".to_string()), (stream, true)));
                        }
                        Err(e) => {
                            done = true;
                            return Some((
                                Err(RuntimeError::new(format!("Stream error: {e}"))),
                                (stream, true),
                            ));
                        }
                    }
                }
            },
        ))
    }
}
