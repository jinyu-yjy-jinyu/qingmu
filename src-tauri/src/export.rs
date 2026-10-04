use std::path::{Path, PathBuf};

use base64::Engine;

/// Strip characters that are invalid in file names on Windows / macOS.
fn sanitize_file_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c => c,
        })
        .collect();
    let trimmed = cleaned.trim().trim_matches('.');
    if trimmed.is_empty() {
        "whiteboard".to_string()
    } else {
        trimmed.to_string()
    }
}

/// Pick a unique destination path on the desktop: `file_name.png`, or append a
/// timestamp when the name is already taken.
fn unique_desktop_path(desktop: &Path, file_name: &str) -> PathBuf {
    let candidate = desktop.join(format!("{}.png", file_name));
    if !candidate.exists() {
        return candidate;
    }
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    desktop.join(format!("{}_{}.png", file_name, now))
}

/// Save a whiteboard PNG (encoded as a data URL by the frontend) to the desktop.
///
/// Returns the absolute path of the saved file on success.
#[tauri::command]
pub fn save_whiteboard_png(data_url: String, file_name: String) -> Result<String, String> {
    let (_, encoded) = data_url
        .split_once(',')
        .ok_or_else(|| "Invalid data URL".to_string())?;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .map_err(|e| format!("Failed to decode PNG: {}", e))?;
    image::load_from_memory(&bytes).map_err(|e| format!("Failed to decode PNG: {}", e))?;

    let desktop = dirs::desktop_dir().ok_or_else(|| "Desktop directory not found".to_string())?;
    let path = unique_desktop_path(&desktop, &sanitize_file_name(&file_name));
    std::fs::write(&path, &bytes).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(path.to_string_lossy().into_owned())
}
