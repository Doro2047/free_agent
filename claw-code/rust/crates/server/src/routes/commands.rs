use axum::extract::State;
use axum::Json;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::LazyLock;
use tracing::info;

use crate::middleware::error_handler::AppError;
use crate::state::AppState;

// ============================================================================
// Sensitive data filtering for command output
// ============================================================================

static SENSITIVE_PATTERNS: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    vec![
        // AWS keys (20-char access key)
        Regex::new(r"AKIA[0-9A-Z]{16}").unwrap(),
        // GitHub tokens
        Regex::new(r"ghp_[a-zA-Z0-9]{36}").unwrap(),
        Regex::new(r"gho_[a-zA-Z0-9]{36}").unwrap(),
        // Generic API keys / tokens (common patterns)
        Regex::new(r#"(?i)(api[_-]?key|apikey|secret[_-]?key|access[_-]?token)\s*[:=]\s*['\"]?[a-zA-Z0-9_\-\.]{16,}"#).unwrap(),
        // Private key headers
        Regex::new(r"-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----").unwrap(),
        // Email addresses in command output
        Regex::new(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}").unwrap(),
        // JWT tokens
        Regex::new(r"eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+").unwrap(),
    ]
});

/// Sanitize command output by redacting sensitive information patterns.
pub fn sanitize_output(input: &str) -> String {
    let mut result = input.to_string();
    for pattern in SENSITIVE_PATTERNS.iter() {
        result = pattern.replace_all(&result, "[REDACTED]").to_string();
    }
    result
}

// ============================================================================
// Command whitelist and security
// ============================================================================

/// Default allowed commands.
static ALLOWED_COMMANDS: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "git",
        "npm",
        "cargo",
        "node",
        "python",
        "python3",
        "ls",
        "cat",
        "grep",
        "find",
        "echo",
        "mkdir",
        "cp",
        "mv",
        "touch",
        "head",
        "tail",
        "wc",
        "sort",
        "uniq",
        "awk",
        "sed",
        "stat",
        "date",
        "whoami",
        "pwd",
        "dir",
        "type",
        "tree",
        "more",
        "less",
        "ping",
        "curl",
        "wget",
        "tar",
        "zip",
        "unzip",
        "make",
        "cmake",
        "gcc",
        "g++",
        "rustc",
        "go",
        "java",
        "javac",
        "dotnet",
        // Windows-specific (shell interpreters removed for security)
        "where",
        "where.exe",
        "tasklist",
        "ipconfig",
        "netstat",
        "nslookup",
        "systeminfo",
    ]
    .into_iter()
    .collect()
});

/// Dangerous command patterns that are always blocked.
static DANGEROUS_PATTERNS: &[&str] = &[
    // Unix dangerous
    "rm -rf",
    "rm -r /",
    "rm --no-preserve-root",
    "mkfs",
    "dd if=",
    "fdisk",
    "parted",
    "chmod 777",
    "chmod -R 777",
    ":(){:|:&};:",
    "fork bomb",
    // PowerShell dangerous
    "Remove-Item -Recurse -Force",
    "rm -Recurse -Force",
    "del /f /s /q",
    "del /f",
    "format",
    "shutdown",
    "restart-computer",
    // Universal dangerous
    "eval(",
    "exec(",
    "base64 -d",
    "base64 --decode",
    "nc -e",
    "ncat -e",
    "reverse shell",
    "/dev/tcp/",
    // Pipe and redirect patterns (command chaining)
    "| bash",
    "| sh",
    "| powershell",
    "| cmd",
    "&& rm ",
    "|| rm ",
    "; rm ",
    ";rm ",
    // Network exfiltration patterns
    "curl http",
    "wget http",
    "curl ftp",
    "wget ftp",
    "curl -s",
    "wget -q",
    "curl -o",
    "wget -O",
    // Obfuscation patterns
    "base64 ",
    "$(",
    "`",
    "eval ",
    "exec ",
];

/// Check whether a command string contains dangerous patterns.
fn is_dangerous(full_command: &str) -> bool {
    // Normalize whitespace to prevent bypass via multi-space
    let normalized = full_command
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ")
        .to_lowercase();

    for pattern in DANGEROUS_PATTERNS {
        if normalized.contains(pattern.to_lowercase().as_str()) {
            return true;
        }
    }
    false
}

/// Validate that the requested command is in the allowlist.
pub fn validate_command(command: &str) -> Result<(), AppError> {
    let base = command.trim().split_whitespace().next().unwrap_or(command);

    // Check dangerous patterns first (with whitespace normalization)
    if is_dangerous(command) {
        return Err(AppError::forbidden(format!(
            "Command '{}' contains dangerous patterns and is blocked",
            base
        )));
    }

    // Extract base command name (strip .exe on Windows)
    let normalized = base
        .trim_end_matches(".exe")
        .trim_end_matches(".cmd")
        .trim_end_matches(".bat")
        .trim_end_matches(".ps1")
        .to_lowercase();

    // Allow commands in the allowlist
    if ALLOWED_COMMANDS.contains(normalized.as_str()) {
        return Ok(());
    }

    Err(AppError::forbidden(format!(
        "Command '{}' is not in the allowed commands list",
        base
    )))
}

/// Record command execution in the history table.
async fn record_history(
    state: &AppState,
    command: &str,
    working_directory: Option<&str>,
    exit_code: Option<i32>,
    output: &str,
) {
    let now = chrono::Utc::now().to_rfc3339();
    let db = state.db.lock().await;

    // Truncate output to avoid storing huge strings
    let truncated = if output.len() > 4096 {
        format!("{}...(truncated)", &output[..4096])
    } else {
        output.to_string()
    };

    let _ = db.execute(
        "INSERT INTO commands_history (command, working_directory, exit_code, output, executed_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![command, working_directory, exit_code, truncated, now],
    );
}

// ============================================================================
// Request / Response types
// ============================================================================

/// Request body for executing a command.
#[derive(Deserialize)]
pub struct CommandRequest {
    /// The command to execute.
    pub command: String,
    /// Arguments for the command.
    #[serde(default)]
    pub args: Vec<String>,
    /// Working directory for command execution.
    #[serde(default)]
    pub cwd: Option<String>,
}

/// Response body for command execution.
#[derive(Serialize)]
pub struct CommandResponse {
    /// Standard output from the command.
    pub stdout: String,
    /// Standard error from the command.
    pub stderr: String,
    /// Exit code of the command.
    pub exit_code: Option<i32>,
}

/// Request body for running a single-line bash command.
#[derive(Deserialize)]
pub struct BashRequest {
    /// The command line to execute.
    pub command: String,
}

// ============================================================================
// Route handlers
// ============================================================================

/// Execute a command with argument-level control.
///
/// Validates the command against an allowlist, blocks dangerous patterns,
/// and returns stdout, stderr, and exit code.
#[axum::debug_handler]
pub async fn execute_command(
    State(state): State<AppState>,
    Json(request): Json<CommandRequest>,
) -> Result<Json<CommandResponse>, AppError> {
    info!(
        command = %request.command,
        args = ?request.args,
        cwd = ?request.cwd,
        "Executing command"
    );

    // Build the full command string for security checks
    let full_command = if request.args.is_empty() {
        request.command.clone()
    } else {
        format!("{} {}", request.command, request.args.join(" "))
    };

    // Security validation
    validate_command(&full_command)?;

    // Determine working directory
    let work_dir = match &request.cwd {
        Some(cwd) => std::path::PathBuf::from(cwd),
        None => state.work_dir.clone(),
    };

    let start = std::time::Instant::now();

    let mut cmd = tokio::process::Command::new(&request.command);
    cmd.args(&request.args);
    cmd.current_dir(&work_dir);

    let output = cmd
        .output()
        .await
        .map_err(|e| AppError::internal(format!("Failed to execute command: {}", e)))?;

    let duration = start.elapsed();
    let exit_code = output.status.code();

    let stdout = sanitize_output(&String::from_utf8_lossy(&output.stdout).to_string());
    let stderr = sanitize_output(&String::from_utf8_lossy(&output.stderr).to_string());

    info!(
        command = %request.command,
        exit_code = ?exit_code,
        duration_ms = duration.as_millis(),
        "Command execution completed"
    );

    // Record in history (store original unsanitized stderr for auditing)
    record_history(
        &state,
        &full_command,
        request.cwd.as_deref(),
        exit_code,
        &stderr,
    )
    .await;

    Ok(Json(CommandResponse {
        stdout,
        stderr,
        exit_code,
    }))
}

/// Execute a single-line bash/shell command.
///
/// On Windows, uses `cmd /C`. On Unix, uses `bash -c`.
/// Validates the command against dangerous patterns before execution.
#[axum::debug_handler]
pub async fn execute_bash(
    State(state): State<AppState>,
    Json(request): Json<BashRequest>,
) -> Result<Json<CommandResponse>, AppError> {
    info!(
        command = %request.command,
        "Executing bash command"
    );

    // Security validation
    validate_command(&request.command)?;

    let start = std::time::Instant::now();

    // Platform-specific shell execution
    let mut cmd = if cfg!(windows) {
        let mut c = tokio::process::Command::new("cmd");
        c.arg("/C").arg(&request.command);
        c
    } else {
        let mut c = tokio::process::Command::new("bash");
        c.arg("-c").arg(&request.command);
        c
    };
    cmd.current_dir(&state.work_dir);

    let output = cmd
        .output()
        .await
        .map_err(|e| AppError::internal(format!("Failed to execute command: {}", e)))?;

    let duration = start.elapsed();
    let exit_code = output.status.code();

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    info!(
        command = %request.command,
        exit_code = ?exit_code,
        duration_ms = duration.as_millis(),
        "Bash command execution completed"
    );

    // Record in history
    record_history(&state, &request.command, None, exit_code, &stderr).await;

    Ok(Json(CommandResponse {
        stdout,
        stderr,
        exit_code,
    }))
}

/// Get command execution history.
///
/// Returns the most recent command executions with their exit codes.
#[axum::debug_handler]
pub async fn command_history(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    info!("Fetching command history");

    let db = state.db.lock().await;

    let mut stmt = db.prepare(
        "SELECT id, command, working_directory, exit_code, executed_at
         FROM commands_history
         ORDER BY executed_at DESC
         LIMIT 50",
    )?;

    let history: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, i64>(0)?,
                "command": row.get::<_, String>(1)?,
                "working_directory": row.get::<_, Option<String>>(2)?,
                "exit_code": row.get::<_, Option<i64>>(3)?,
                "executed_at": row.get::<_, String>(4)?,
            }))
        })?
        .filter_map(Result::ok)
        .collect();

    Ok(Json(serde_json::json!({
        "history": history,
        "total": history.len()
    })))
}
