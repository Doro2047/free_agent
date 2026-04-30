use axum::extract::Request;
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::middleware::Next;
use axum::response::Response;
use lazy_static::lazy_static;
use std::env;
use tracing::warn;

lazy_static! {
    static ref EXPECTED_API_KEY: String = {
        env::var("DORO_API_KEY").unwrap_or_default()
    };
}

/// Middleware that validates the X-API-Key header.
/// 
/// If the `DORO_API_KEY` environment variable is not set, authentication is skipped.
/// This allows development without configuration while securing production deployments.
pub async fn api_key_middleware(
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Response {
    // Skip authentication if no API key is configured
    if EXPECTED_API_KEY.is_empty() {
        return next.run(request).await;
    }

    let api_key = headers.get("X-API-Key").and_then(|v| v.to_str().ok());

    if api_key.map_or(true, |k| k != EXPECTED_API_KEY.as_str()) {
        warn!("Unauthorized API request: missing or invalid X-API-Key");
        return Response::builder()
            .status(StatusCode::UNAUTHORIZED)
            .header("Content-Type", "application/json")
            .body(axum::body::Body::from(
                serde_json::json!({
                    "error": "Unauthorized",
                    "message": "Invalid or missing API key. Set X-API-Key header."
                }).to_string(),
            ))
            .expect("valid response");
    }

    next.run(request).await
}

/// Generate a random API key for initial setup.
pub fn generate_api_key() -> String {
    use std::time::SystemTime;
    use std::hash::{Hash, Hasher};
    use std::collections::hash_map::DefaultHasher;

    let mut hasher = DefaultHasher::new();
    SystemTime::now().hash(&mut hasher);
    format!("doro-{:016x}", hasher.finish())
}
