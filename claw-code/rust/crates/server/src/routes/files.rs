use axum::extract::{Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tracing::{info, warn};

use crate::middleware::error_handler::AppError;
use crate::state::AppState;

// ============================================================================
// Request / Response types
// ============================================================================

/// Query parameters for listing directory contents.
#[derive(Deserialize)]
pub struct ListQuery {
    /// Directory path to list.
    pub path: String,
}

/// Request body for reading a file.
#[derive(Deserialize)]
pub struct ReadFileRequest {
    /// Path to the file to read.
    pub path: String,
}

/// Response body for reading a file.
#[derive(Serialize)]
pub struct ReadFileResponse {
    /// File content as a string.
    pub content: String,
    /// File size in bytes.
    pub size: u64,
    /// Encoding used (always "utf-8" for text files).
    pub encoding: String,
}

/// Request body for writing a file.
#[derive(Deserialize)]
pub struct WriteFileRequest {
    /// Path to the file to write.
    pub path: String,
    /// Content to write to the file.
    pub content: String,
}

/// Request body for editing a file via search-and-replace.
#[derive(Deserialize)]
pub struct EditFileRequest {
    /// Path to the file to edit.
    pub path: String,
    /// Exact text to search for.
    pub old_string: String,
    /// Text to replace with.
    pub new_string: String,
}

/// Request body for deleting a file or directory.
#[derive(Deserialize)]
pub struct DeleteRequest {
    /// Path to the file or directory to delete.
    pub path: String,
}

/// Represents a file or directory node in the tree.
#[derive(Serialize)]
pub struct FileNode {
    /// File or directory name.
    pub name: String,
    /// Full path.
    pub path: String,
    /// Whether this is a directory.
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    /// File size in bytes (0 for directories).
    pub size: u64,
    /// Last modified timestamp in ISO 8601 format.
    #[serde(rename = "modifiedAt")]
    pub modified_at: String,
}

/// Request body for searching filenames.
#[derive(Deserialize)]
pub struct FileSearchRequest {
    /// Glob or substring pattern to search.
    pub pattern: String,
    /// Directory to search in. Defaults to project root.
    #[serde(default)]
    pub path: Option<String>,
}

/// Request body for searching file content.
#[derive(Deserialize)]
pub struct ContentSearchRequest {
    /// Regex pattern to search for.
    pub pattern: String,
    /// Directory to search in. Defaults to project root.
    #[serde(default)]
    pub path: Option<String>,
}

/// Response for file search results.
#[derive(Serialize)]
pub struct FileSearchResponse {
    /// Matching file paths.
    pub files: Vec<String>,
    /// Total number of matches.
    pub total: usize,
    /// Whether results were truncated.
    #[serde(default)]
    pub truncated: bool,
}

/// Response for content search results.
#[derive(Serialize)]
pub struct ContentSearchResponse {
    /// Matching file paths.
    pub files: Vec<String>,
    /// Total number of matching files.
    #[serde(rename = "numFiles")]
    pub num_files: usize,
    /// Total number of matching lines.
    #[serde(rename = "numMatches")]
    pub num_matches: usize,
    /// Matched content lines with context.
    pub content: String,
}

/// Generic success response for mutating file operations.
#[derive(Serialize)]
pub struct FileOperationResponse {
    /// Whether the operation succeeded.
    pub success: bool,
    /// Human-readable message.
    pub message: String,
}

// ============================================================================
// Path validation helpers
// ============================================================================

/// Validate that a path does not contain directory traversal sequences
/// and is within the allowed project boundary.
fn validate_path(project_root: &Path, requested: &Path) -> Result<PathBuf, AppError> {
    // Reject obvious traversal attempts in the raw path string
    let path_str = requested.to_string_lossy();
    if path_str.contains("..\\") || path_str.contains("../") {
        return Err(AppError::forbidden(
            "Directory traversal sequences are not allowed",
        ));
    }

    // Resolve to an absolute path
    let resolved = if requested.is_absolute() {
        requested.to_path_buf()
    } else {
        project_root.join(requested)
    };

    // Canonicalize if the path exists, otherwise canonicalize the parent
    let canonical = if resolved.exists() {
        resolved.canonicalize().map_err(|e| {
            AppError::internal(format!("Failed to resolve path: {}", e))
        })?
    } else {
        // For non-existent paths, canonicalize the parent directory
        if let Some(parent) = resolved.parent() {
            if parent.exists() {
                parent.canonicalize().map_err(|e| {
                    AppError::internal(format!("Failed to resolve parent path: {}", e))
                })?.join(resolved.file_name().unwrap_or_default())
            } else {
                resolved
            }
        } else {
            resolved
        }
    };

    // Ensure the resolved path stays within the project root
    let canonical_root = project_root.canonicalize().map_err(|e| {
        AppError::internal(format!("Failed to resolve project root: {}", e))
    })?;

    if !canonical.starts_with(&canonical_root) {
        return Err(AppError::forbidden(format!(
            "Path '{}' is outside the project directory",
            canonical.display()
        )));
    }

    Ok(canonical)
}

/// Format a file's modification time as an ISO 8601 string.
fn format_modified(metadata: &std::fs::Metadata) -> String {
    metadata
        .modified()
        .ok()
        .map(|t| {
            let since_epoch = t
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;
            chrono::DateTime::<chrono::Utc>::from_timestamp(since_epoch, 0)
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_else(|| "unknown".to_string())
        })
        .unwrap_or_else(|| "unknown".to_string())
}

// ============================================================================
// Route handlers
// ============================================================================

/// List directory contents.
///
/// Returns an array of FileNode objects for each entry in the specified directory.
#[axum::debug_handler]
pub async fn list_files(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<FileNode>>, AppError> {
    info!(path = %query.path, "Listing directory");

    let project_root = &state.work_dir;
    let dir_path = validate_path(project_root, Path::new(&query.path))?;

    if !dir_path.is_dir() {
        return Err(AppError::not_found(format!(
            "Path '{}' is not a directory",
            dir_path.display()
        )));
    }

    let mut entries = tokio::fs::read_dir(&dir_path)
        .await
        .map_err(|e| AppError::not_found(format!("Directory not found: {}", e)))?;

    let mut nodes = Vec::new();

    while let Ok(Some(entry)) = entries.next_entry().await {
        let name = entry.file_name().to_string_lossy().to_string();
        let entry_path = entry.path();

        let Ok(metadata) = entry.metadata().await else {
            warn!(path = ?entry_path, "Skipping entry: could not read metadata");
            continue;
        };

        let is_directory = metadata.is_dir();
        let size = if is_directory { 0 } else { metadata.len() };
        let modified_at = format_modified(&metadata);

        // Display path relative to project root for clarity
        let display_path = entry_path
            .strip_prefix(project_root)
            .unwrap_or(&entry_path)
            .to_string_lossy()
            .to_string();

        nodes.push(FileNode {
            name,
            path: display_path,
            is_directory,
            size,
            modified_at,
        });
    }

    // Sort: directories first, then alphabetically
    nodes.sort_by(|a, b| {
        a.is_directory
            .cmp(&b.is_directory)
            .reverse()
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(Json(nodes))
}

/// Read file contents.
///
/// Returns the file content, size, and encoding. Only text files are supported.
#[axum::debug_handler]
pub async fn read_file(
    State(state): State<AppState>,
    Json(request): Json<ReadFileRequest>,
) -> Result<Json<ReadFileResponse>, AppError> {
    info!(path = %request.path, "Reading file");

    let project_root = &state.work_dir;
    let file_path = validate_path(project_root, Path::new(&request.path))?;

    if !file_path.is_file() {
        return Err(AppError::not_found(format!(
            "Path '{}' is not a file",
            file_path.display()
        )));
    }

    // Check file size (max 10 MB)
    let metadata = file_path.metadata().map_err(|e| {
        AppError::internal(format!("Failed to read file metadata: {}", e))
    })?;
    if metadata.len() > 10 * 1024 * 1024 {
        return Err(AppError::bad_request(format!(
            "File too large ({} bytes, max 10 MB)",
            metadata.len()
        )));
    }

    let content = tokio::fs::read_to_string(&file_path)
        .await
        .map_err(|e| AppError::not_found(format!("Failed to read file: {}", e)))?;

    Ok(Json(ReadFileResponse {
        content,
        size: metadata.len(),
        encoding: "utf-8".to_string(),
    }))
}

/// Write content to a file.
///
/// Creates the file and any necessary parent directories if they do not exist.
#[axum::debug_handler]
pub async fn write_file(
    State(state): State<AppState>,
    Json(request): Json<WriteFileRequest>,
) -> Result<Json<FileOperationResponse>, AppError> {
    info!(path = %request.path, "Writing file");

    let project_root = &state.work_dir;
    let file_path = validate_path(project_root, Path::new(&request.path))?;

    // Enforce max file size: 10 MB
    let max_size: usize = state.config.get("runtime.max_file_size")
        .and_then(|v| v.as_i64())
        .unwrap_or(10 * 1024 * 1024) as usize;
    if request.content.len() > max_size {
        return Err(AppError::bad_request(format!(
            "Content too large ({} bytes, max {} MB)",
            request.content.len(),
            max_size / (1024 * 1024)
        )));
    }

    // Ensure parent directory exists
    if let Some(parent) = file_path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| AppError::internal(format!("Failed to create directory: {}", e)))?;
    }

    tokio::fs::write(&file_path, &request.content)
        .await
        .map_err(|e| AppError::internal(format!("Failed to write file: {}", e)))?;

    Ok(Json(FileOperationResponse {
        success: true,
        message: format!("Successfully wrote file: {}", request.path),
    }))
}

/// Edit a file via search-and-replace.
///
/// Replaces the first occurrence of `old_string` with `new_string`.
#[axum::debug_handler]
pub async fn edit_file(
    State(state): State<AppState>,
    Json(request): Json<EditFileRequest>,
) -> Result<Json<FileOperationResponse>, AppError> {
    info!(path = %request.path, "Editing file");

    let project_root = &state.work_dir;
    let file_path = validate_path(project_root, Path::new(&request.path))?;

    if !file_path.is_file() {
        return Err(AppError::not_found(format!(
            "File not found: {}",
            file_path.display()
        )));
    }

    let content = tokio::fs::read_to_string(&file_path)
        .await
        .map_err(|e| AppError::not_found(format!("Failed to read file: {}", e)))?;

    if !content.contains(&request.old_string) {
        return Err(AppError::bad_request(
            "Search string not found in file",
        ));
    }

    let new_content = content.replacen(&request.old_string, &request.new_string, 1);

    tokio::fs::write(&file_path, &new_content)
        .await
        .map_err(|e| AppError::internal(format!("Failed to write file: {}", e)))?;

    Ok(Json(FileOperationResponse {
        success: true,
        message: format!("Successfully edited file: {}", request.path),
    }))
}

/// Delete a file or directory.
///
/// Directories are deleted recursively.
#[axum::debug_handler]
pub async fn delete_file(
    State(state): State<AppState>,
    Json(request): Json<DeleteRequest>,
) -> Result<Json<FileOperationResponse>, AppError> {
    info!(path = %request.path, "Deleting file/directory");

    let project_root = &state.work_dir;
    let target_path = validate_path(project_root, Path::new(&request.path))?;

    if !target_path.exists() {
        return Err(AppError::not_found(format!(
            "Path not found: {}",
            target_path.display()
        )));
    }

    // Safety: never delete the project root itself
    let canonical_root = project_root.canonicalize().map_err(|e| {
        AppError::internal(format!("Failed to resolve project root: {}", e))
    })?;
    if target_path.canonicalize().ok().as_ref() == Some(&canonical_root) {
        return Err(AppError::forbidden(
            "Cannot delete the project root directory",
        ));
    }

    if target_path.is_dir() {
        tokio::fs::remove_dir_all(&target_path)
            .await
            .map_err(|e| AppError::internal(format!("Failed to delete directory: {}", e)))?;
    } else {
        tokio::fs::remove_file(&target_path)
            .await
            .map_err(|e| AppError::internal(format!("Failed to delete file: {}", e)))?;
    }

    Ok(Json(FileOperationResponse {
        success: true,
        message: format!("Successfully deleted: {}", request.path),
    }))
}

/// Search for files by name pattern.
///
/// Uses glob matching to find files whose names match the given pattern.
#[axum::debug_handler]
pub async fn search_files(
    State(state): State<AppState>,
    Json(request): Json<FileSearchRequest>,
) -> Result<Json<FileSearchResponse>, AppError> {
    info!(pattern = %request.pattern, path = ?request.path, "Searching files");

    let project_root = &state.work_dir;
    let search_dir = match &request.path {
        Some(p) => validate_path(project_root, Path::new(p))?,
        None => project_root.clone(),
    };

    if !search_dir.is_dir() {
        return Err(AppError::not_found(format!(
            "Search path '{}' is not a directory",
            search_dir.display()
        )));
    }

    // Delegate to runtime glob_search
    let pattern = if Path::new(&request.pattern).is_absolute() {
        request.pattern.clone()
    } else {
        format!(
            "{}{}{}",
            search_dir.to_string_lossy(),
            std::path::MAIN_SEPARATOR,
            request.pattern
        )
    };

    let result = runtime::glob_search(&pattern, None).map_err(|e| {
        AppError::internal(format!("File search failed: {}", e))
    })?;

    Ok(Json(FileSearchResponse {
        files: result.filenames,
        total: result.num_files,
        truncated: result.truncated,
    }))
}

/// Search for files containing a pattern.
///
/// Uses regex matching to find files whose content matches the given pattern.
#[axum::debug_handler]
pub async fn search_content(
    State(state): State<AppState>,
    Json(request): Json<ContentSearchRequest>,
) -> Result<Json<ContentSearchResponse>, AppError> {
    info!(pattern = %request.pattern, path = ?request.path, "Searching content");

    let project_root = &state.work_dir;
    let search_dir = match &request.path {
        Some(p) => validate_path(project_root, Path::new(p))?,
        None => project_root.clone(),
    };

    if !search_dir.exists() {
        return Err(AppError::not_found(format!(
            "Search path '{}' does not exist",
            search_dir.display()
        )));
    }

    // Delegate to runtime grep_search
    let grep_input = runtime::GrepSearchInput {
        pattern: request.pattern,
        path: Some(search_dir.to_string_lossy().into_owned()),
        glob: None,
        output_mode: Some("content".to_string()),
        before: Some(1),
        after: Some(1),
        context_short: None,
        context: None,
        line_numbers: Some(true),
        case_insensitive: Some(false),
        file_type: None,
        head_limit: Some(100),
        offset: Some(0),
        multiline: Some(false),
    };

    let result = runtime::grep_search(&grep_input).map_err(|e| {
        AppError::internal(format!("Content search failed: {}", e))
    })?;

    let content = result.content.unwrap_or_default();
    let num_matches = content.lines().count();

    Ok(Json(ContentSearchResponse {
        files: result.filenames,
        num_files: result.num_files,
        num_matches,
        content,
    }))
}
