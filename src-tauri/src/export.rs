use std::path::{Path, PathBuf};

use base64::Engine;

/// Windows refuses to create files whose stem is a reserved device name
/// (`CON`, `PRN`, `NUL`, `COM1`…). Prefix such names so exporting a board
/// called "CON" does not silently fail.
fn is_windows_reserved_stem(name: &str) -> bool {
    let stem = name.split('.').next().unwrap_or(name).trim();
    let upper = stem.to_ascii_uppercase();
    if matches!(upper.as_str(), "CON" | "PRN" | "AUX" | "NUL") {
        return true;
    }
    let bytes = upper.as_bytes();
    bytes.len() == 4
        && (upper.starts_with("COM") || upper.starts_with("LPT"))
        && bytes[3].is_ascii_digit()
        && bytes[3] != b'0'
}

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
    } else if is_windows_reserved_stem(trimmed) {
        format!("_{trimmed}")
    } else {
        trimmed.to_string()
    }
}

/// Pick a unique destination path on the desktop. Collisions get a short
/// numeric suffix (`name_2.png`, `name_3.png`, …) instead of a second-resolution
/// timestamp, so two exports in the same second never overwrite each other.
fn unique_desktop_path(desktop: &Path, file_name: &str) -> PathBuf {
    let candidate = desktop.join(format!("{}.png", file_name));
    if !candidate.exists() {
        return candidate;
    }
    for suffix in 2..=999u32 {
        let candidate = desktop.join(format!("{}_{}.png", file_name, suffix));
        if !candidate.exists() {
            return candidate;
        }
    }
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
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

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "lightcurtain-export-{tag}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn sanitize_replaces_invalid_characters() {
        assert_eq!(sanitize_file_name("a/b:c*?"), "a_b_c__");
    }

    #[test]
    fn sanitize_prefixes_windows_reserved_names() {
        assert_eq!(sanitize_file_name("CON"), "_CON");
        assert_eq!(sanitize_file_name("con.txt"), "_con.txt");
        assert_eq!(sanitize_file_name("COM1"), "_COM1");
        assert_eq!(sanitize_file_name("LPT9"), "_LPT9");
        assert_eq!(sanitize_file_name("COM0"), "COM0");
    }

    #[test]
    fn unique_path_appends_incrementing_suffix() {
        let dir = temp_dir("unique");
        std::fs::write(dir.join("board.png"), b"x").unwrap();
        assert_eq!(unique_desktop_path(&dir, "board"), dir.join("board_2.png"));

        std::fs::write(dir.join("board_2.png"), b"x").unwrap();
        assert_eq!(unique_desktop_path(&dir, "board"), dir.join("board_3.png"));

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn unique_path_returns_plain_name_when_free() {
        let dir = temp_dir("free");
        assert_eq!(unique_desktop_path(&dir, "board"), dir.join("board.png"));
        std::fs::remove_dir_all(&dir).ok();
    }
}
