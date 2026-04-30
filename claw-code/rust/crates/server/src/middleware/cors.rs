use axum::Router;
use tower_http::cors::CorsLayer;

/// Build a CORS layer that allows specific local origins to access the API.
///
/// Security: Production deployments should restrict origins to known frontend URLs.
pub fn cors_layer() -> CorsLayer {
    let allowed_origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ];

    let origins: Vec<axum::http::HeaderValue> = allowed_origins
        .iter()
        .map(|s| s.parse().expect("valid origin"))
        .collect();

    CorsLayer::new()
        .allow_origin(origins)
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::DELETE,
            axum::http::Method::PATCH,
        ])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
            axum::http::header::ACCEPT,
        ])
        .allow_credentials(true)
        .max_age(std::time::Duration::from_secs(3600))
}

/// Apply CORS middleware to the given router.
pub fn apply_cors(router: Router) -> Router {
    router.layer(cors_layer())
}
