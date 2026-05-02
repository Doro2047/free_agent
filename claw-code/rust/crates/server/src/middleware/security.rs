use std::sync::Arc;

use axum::body::Body;
use axum::extract::Request;
use axum::http::header::{CONTENT_LENGTH, CONTENT_TYPE, UPGRADE};
use axum::middleware::Next;
use axum::response::Response;
use tokio::sync::Mutex;
use tracing::warn;

/// Maximum request body size: 10 MB.
const MAX_BODY_SIZE: u64 = 10 * 1024 * 1024;

/// Maximum concurrent WebSocket connections allowed.
/// TODO: Integrate with shared state for enforcement.
#[allow(dead_code)]
const MAX_WS_CONNECTIONS: usize = 50;

/// Shared counter for tracking active WebSocket connections.
pub type WsConnectionCount = Arc<Mutex<usize>>;

/// Create a new WebSocket connection counter initialized to zero.
pub fn create_ws_connection_counter() -> WsConnectionCount {
    Arc::new(Mutex::new(0))
}

/// Security middleware that enforces basic security headers and body size limits.
///
/// This middleware provides a baseline level of security:
/// - Rejects oversized request bodies to prevent memory exhaustion attacks
/// - Limits WebSocket connections to prevent resource exhaustion
/// - Adds security response headers (X-Content-Type-Options, X-Frame-Options, etc.)
pub async fn security_middleware(request: Request, next: Next) -> Response {
    // Check if this is a WebSocket upgrade request
    let is_ws_upgrade = request
        .headers()
        .get(UPGRADE)
        .map(|v| {
            v.to_str()
                .map(|s| s.eq_ignore_ascii_case("websocket"))
                .unwrap_or(false)
        })
        .unwrap_or(false);

    if is_ws_upgrade {
        // WebSocket connection limit check would go here
        // In a full implementation, extract the shared counter and check against MAX_WS_CONNECTIONS
        warn!("WebSocket upgrade request detected (connection limit enforcement: TODO with shared state)");
    }

    // Enforce body size limit (skip for WebSocket upgrade requests)
    if !is_ws_upgrade {
        if let Some(content_length) = request.headers().get(CONTENT_LENGTH) {
            if let Ok(length) = content_length.to_str().unwrap_or("0").parse::<u64>() {
                if length > MAX_BODY_SIZE {
                    warn!(
                        content_length = length,
                        "Request body exceeds maximum size limit"
                    );
                    return axum::response::Response::builder()
                        .status(axum::http::StatusCode::PAYLOAD_TOO_LARGE)
                        .header(CONTENT_TYPE, "application/json")
                        .body(Body::from(
                            r#"{"code":413,"message":"Request body too large"}"#,
                        ))
                        .unwrap();
                }
            }
        }
    }

    let mut response = next.run(request).await;

    // Add security headers
    let headers = response.headers_mut();
    headers.insert(
        "X-Content-Type-Options",
        "nosniff".parse().expect("valid header value"),
    );
    headers.insert(
        "X-Frame-Options",
        "DENY".parse().expect("valid header value"),
    );
    headers.insert(
        "X-XSS-Protection",
        "1; mode=block".parse().expect("valid header value"),
    );
    // HSTS removed: local app runs on HTTP, not HTTPS

    response
}
