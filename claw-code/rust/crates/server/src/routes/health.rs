use axum::extract::State;
use axum::Json;
use chrono::Utc;
use serde::Serialize;

use crate::state::AppState;

/// Response body for the health check endpoint.
#[derive(Serialize)]
pub struct HealthResponse {
    /// Current status of the server.
    pub status: String,
    /// ISO 8601 timestamp of when this response was generated.
    pub timestamp: String,
    /// Server uptime in human-readable format.
    pub uptime: String,
}

/// Health check endpoint.
///
/// Returns the current server status and timestamp.
/// This endpoint is used by load balancers and monitoring systems
/// to determine if the server is healthy and accepting connections.
#[axum::debug_handler]
pub async fn health_check(State(state): State<AppState>) -> Json<HealthResponse> {
    let uptime = state.uptime();
    Json(HealthResponse {
        status: "ok".to_string(),
        timestamp: Utc::now().to_rfc3339(),
        uptime: format_duration(uptime),
    })
}

/// Format a chrono Duration into a human-readable string.
fn format_duration(duration: chrono::Duration) -> String {
    let total_seconds = duration.num_seconds();
    let days = total_seconds / 86_400;
    let hours = (total_seconds % 86_400) / 3_600;
    let minutes = (total_seconds % 3_600) / 60;
    let seconds = total_seconds % 60;

    if days > 0 {
        format!("{days}d {hours}h {minutes}m {seconds}s")
    } else if hours > 0 {
        format!("{hours}h {minutes}m {seconds}s")
    } else if minutes > 0 {
        format!("{minutes}m {seconds}s")
    } else {
        format!("{seconds}s")
    }
}
