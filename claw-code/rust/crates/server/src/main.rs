//! Server entry point.
//!
//! Initializes the Tokio runtime, configures tracing, creates the Axum router,
//! and starts the HTTP server on the configured port.

use server::{create_router, state::AppState, ServerConfig};
use tracing::info;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Parse command-line arguments
    let server_config = ServerConfig::from_args();

    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                EnvFilter::new("info,server=debug,runtime=debug")
            }),
        )
        .with_target(false)
        .compact()
        .init();

    info!(
        port = server_config.port,
        host = %server_config.host,
        config_path = ?server_config.config_path,
        "Starting server"
    );

    // Load runtime configuration
    let runtime_config = load_runtime_config(&server_config).await?;

    // Initialize application state (database, config, etc.)
    let state = AppState::new(runtime_config).await?;

    // Restore persisted sessions from database
    if let Err(e) = state.restore_sessions().await {
        tracing::warn!(error = %e, "Failed to restore sessions from database, starting with empty session store");
    }

    // Create the Axum router with all routes and middleware
    let app = create_router(state);

    // Start the HTTP server
    let listener = tokio::net::TcpListener::bind(&server_config.bind_address())
        .await
        .map_err(|e| {
            format!("Failed to bind to {}: {}", server_config.bind_address(), e)
        })?;

    info!(
        address = %server_config.bind_address(),
        "Server is listening and ready to accept connections"
    );

    axum::serve(listener, app)
        .await
        .map_err(|e| format!("Server error: {}", e))?;

    Ok(())
}

/// Load runtime configuration from file or create defaults.
async fn load_runtime_config(
    server_config: &ServerConfig,
) -> Result<runtime::RuntimeConfig, Box<dyn std::error::Error + Send + Sync>> {
    if let Some(ref config_path) = server_config.config_path {
        info!(config_path = %config_path, "Loading configuration from file");

        // Use ConfigLoader with the provided config directory
        let config_dir = std::path::Path::new(config_path);
        let cwd = std::env::current_dir()?;
        let loader = runtime::ConfigLoader::new(&cwd, config_dir);
        let config = loader.load().map_err(|e| format!("Failed to load config: {}", e))?;

        Ok(config)
    } else {
        info!("No config file specified, using defaults");
        // Use default runtime configuration
        Ok(runtime::RuntimeConfig::empty())
    }
}
