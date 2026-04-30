use std::fmt;

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;
use tracing::error;

/// Standard error response body shared across all API endpoints.
#[derive(Serialize)]
pub struct ErrorResponse {
    /// HTTP status code as an integer.
    pub code: u16,
    /// Human-readable error message.
    pub message: String,
    /// Optional error details for debugging.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

/// Unified error type that can be converted into an HTTP response.
#[derive(Debug)]
pub struct AppError {
    status: StatusCode,
    message: String,
    details: Option<serde_json::Value>,
}

impl AppError {
    /// Create a new application error with the given status and message.
    pub fn new(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
            details: None,
        }
    }

    /// Create a bad request error.
    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::new(StatusCode::BAD_REQUEST, message)
    }

    /// Create a not found error.
    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(StatusCode::NOT_FOUND, message)
    }

    /// Create an internal server error.
    pub fn internal(message: impl Into<String>) -> Self {
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, message)
    }

    /// Create an unauthorized error.
    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::new(StatusCode::UNAUTHORIZED, message)
    }

    /// Create a forbidden error.
    pub fn forbidden(message: impl Into<String>) -> Self {
        Self::new(StatusCode::FORBIDDEN, message)
    }

    /// Attach additional details to the error.
    #[must_use]
    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }

    pub fn message(&self) -> &str {
        &self.message
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let body = ErrorResponse {
            code: self.status.as_u16(),
            message: self.message,
            details: self.details,
        };

        error!(
            status = self.status.as_u16(),
            message = body.message,
            "Request failed"
        );

        (self.status, Json(body)).into_response()
    }
}

/// Convert any error that implements `std::error::Error` into an internal server error.
impl<E> From<E> for AppError
where
    E: std::error::Error,
{
    fn from(err: E) -> Self {
        error!(error = %err, "Internal server error");
        Self::internal(err.to_string())
    }
}
