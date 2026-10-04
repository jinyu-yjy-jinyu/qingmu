//! Brand migration: AnnotPen → 轻幕.
//!
//! One-time migration of the user config directory from the legacy
//! `com.annotpen.app` identifier to the new `com.lightcurtain.app` one. The
//! migration is strictly one-way and never overwrites an existing new config.

use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager};
use tracing::{info, warn};

use crate::config::{AppConfig, AppState};
use crate::diagnostics::log_backend_event;
use crate::portable;

/// Legacy bundle identifier that was used before the 轻幕 rebrand.
pub const LEGACY_IDENTIFIER_DIR: &str = "com.annotpen.app";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum MigrationAction {
    SkipPortable,
    SkipTargetExists,
    SkipSourceMissing,
    SkipSourceCorrupt,
    Migrate,
}

fn decide_migration(portable: bool, new_config: &Path, old_config: &Path) -> MigrationAction {
    if portable {
        return MigrationAction::SkipPortable;
    }
    if new_config.is_file() {
        return MigrationAction::SkipTargetExists;
    }
    if !old_config.is_file() {
        return MigrationAction::SkipSourceMissing;
    }
    let readable = fs::read_to_string(old_config)
        .ok()
        .and_then(|raw| serde_json::from_str::<AppConfig>(&raw).ok())
        .is_some();
    if readable {
        MigrationAction::Migrate
    } else {
        MigrationAction::SkipSourceCorrupt
    }
}

/// One-way copy of the legacy config file into the new config dir.
/// Never removes the legacy directory.
fn copy_config(old_config: &Path, new_config: &Path) -> bool {
    let Some(parent) = new_config.parent() else {
        return false;
    };
    if fs::create_dir_all(parent).is_err() {
        return false;
    }
    fs::copy(old_config, new_config).is_ok()
}

/// Migrate the legacy `com.annotpen.app` config directory into the new
/// `com.lightcurtain.app` directory. Returns `true` when a migration happened.
pub fn migrate_config_dir(app: &AppHandle) -> bool {
    let new_dir = app.path().app_config_dir().unwrap_or_default();
    let old_dir = dirs::config_dir()
        .map(|d| d.join(LEGACY_IDENTIFIER_DIR))
        .unwrap_or_default();
    let new_config = new_dir.join("config.json");
    let old_config = old_dir.join("config.json");

    match decide_migration(portable::is_portable(), &new_config, &old_config) {
        MigrationAction::Migrate => {
            if copy_config(&old_config, &new_config) {
                let state = app.state::<AppState>();
                log_backend_event(
                    &state,
                    "config",
                    "migrated config dir from com.annotpen.app",
                    None,
                    "info",
                );
                info!(
                    "Migrated config from {} to {}",
                    old_config.display(),
                    new_config.display()
                );
                true
            } else {
                warn!(
                    "Failed to migrate config from {} to {}",
                    old_config.display(),
                    new_config.display()
                );
                false
            }
        }
        MigrationAction::SkipPortable
        | MigrationAction::SkipTargetExists
        | MigrationAction::SkipSourceMissing
        | MigrationAction::SkipSourceCorrupt => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn tmp_dir(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "lightcurtain-rebrand-test-{}-{}",
            name,
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write_config(path: &Path, corrupted: bool) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        let content = if corrupted {
            "{ not valid json".to_string()
        } else {
            serde_json::to_string(&AppConfig::default()).unwrap()
        };
        fs::write(path, content).unwrap();
    }

    #[test]
    fn skips_when_portable() {
        let old = tmp_dir("portable-old");
        let new = tmp_dir("portable-new");
        write_config(&old.join("config.json"), false);
        assert_eq!(
            decide_migration(true, &new.join("config.json"), &old.join("config.json")),
            MigrationAction::SkipPortable
        );
        let _ = fs::remove_dir_all(&old);
        let _ = fs::remove_dir_all(&new);
    }

    #[test]
    fn skips_when_target_already_exists() {
        let old = tmp_dir("target-old");
        let new = tmp_dir("target-new");
        write_config(&old.join("config.json"), false);
        write_config(&new.join("config.json"), false);
        assert_eq!(
            decide_migration(false, &new.join("config.json"), &old.join("config.json")),
            MigrationAction::SkipTargetExists
        );
        let _ = fs::remove_dir_all(&old);
        let _ = fs::remove_dir_all(&new);
    }

    #[test]
    fn skips_when_source_missing() {
        let old = tmp_dir("missing-old");
        let new = tmp_dir("missing-new");
        assert_eq!(
            decide_migration(false, &new.join("config.json"), &old.join("config.json")),
            MigrationAction::SkipSourceMissing
        );
        let _ = fs::remove_dir_all(&old);
        let _ = fs::remove_dir_all(&new);
    }

    #[test]
    fn skips_when_source_corrupt() {
        let old = tmp_dir("corrupt-old");
        let new = tmp_dir("corrupt-new");
        write_config(&old.join("config.json"), true);
        assert_eq!(
            decide_migration(false, &new.join("config.json"), &old.join("config.json")),
            MigrationAction::SkipSourceCorrupt
        );
        let _ = fs::remove_dir_all(&old);
        let _ = fs::remove_dir_all(&new);
    }

    #[test]
    fn migrates_valid_source_and_preserves_legacy() {
        let old = tmp_dir("valid-old");
        let new = tmp_dir("valid-new");
        let old_config = old.join("config.json");
        let new_config = new.join("config.json");
        write_config(&old_config, false);
        assert_eq!(
            decide_migration(false, &new_config, &old_config),
            MigrationAction::Migrate
        );
        assert!(copy_config(&old_config, &new_config));
        assert!(new_config.is_file());
        assert!(old_config.is_file(), "legacy config must be preserved");
        assert_eq!(
            fs::read_to_string(&old_config).unwrap(),
            fs::read_to_string(&new_config).unwrap()
        );
        let _ = fs::remove_dir_all(&old);
        let _ = fs::remove_dir_all(&new);
    }
}
