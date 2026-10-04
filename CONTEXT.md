# 轻幕 — Screen Annotation Tool

## Intent

轻幕 is a lightweight (~6 MB installer) screen annotation tool built with Tauri v2 + Vue 3. It runs in the system tray and lets users instantly draw, highlight, and annotate anywhere on the desktop via keyboard shortcuts. Targets Windows and macOS.

It is a fork of [MarkerOn](https://github.com/ifer47/markeron) (MIT). See [NOTICE](./NOTICE) for the required upstream attribution.

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite + Tailwind CSS v4 + @lucide/vue icons
- **Backend**: Rust (Tauri v2) with `tauri-plugin-global-shortcut`, `tauri-plugin-autostart`, `tauri-plugin-opener`, `tauri-plugin-dialog`, `tauri-plugin-updater`, `tauri-plugin-process`
- **Canvas**: Excalidraw laser-pointer library for laser trail effect
- **Platform-specific**: `xcap` (macOS screenshots), `windows-sys` (Win32 API), `winreg` (registry)
- **Node**: 24.15.0 pinned via `.node-version`, npm 11.12.1

## Architecture

### Frontend (`src/`)

| Path | Purpose |
|------|---------|
| `App.vue` | Entry point; routes between overlay/settings/toolbar modes via URL hash |
| `components/DrawingOverlay.vue` | Main canvas overlay (2077 lines — see Known Issues) |
| `components/ToolToolbar.vue` | Floating toolbar panel |
| `components/TextBox.vue` | Inline text input overlay |
| `components/settings/` | Settings tabs (General, About, Diagnostics) |
| `composables/useDrawing.ts` | Core drawing engine (~1468 lines — see Known Issues) |
| `composables/drawingRender.ts` | Canvas rendering functions for all tools |
| `composables/drawingGeometry.ts` | Bbox, hit-test, snap, clone helpers |
| `composables/useOverlayKeyboard.ts` | Keyboard shortcut handler for overlay mode |
| `composables/overlayBridge.ts` | Tauri event bridge constants and helpers |
| `composables/useAppTheme.ts` | Theme (dark/light/system) sync with backend |
| `composables/useTooltip.ts` | Tooltip display for tool switching |
| `constants/colors.ts` | Color palette |
| `constants/tools.ts` | Tool definitions, icon map, line-width presets |
| `constants/laser.ts` | Laser trail decay and sizing |
| `constants/stamp.ts` | Stamp (numbered circle) rendering constants |
| `constants/textOutline.ts` | Text outline styling |
| `utils/` | Platform detection, drag interaction, eraser mode, toolbar position, diagnostics events |
| `i18n/` | en.ts / zh-CN.ts translations |
| `types/app.d.ts` | TypeScript declarations |
| `types/diagnostics.ts` | Diagnostic event types |

### Backend (`src-tauri/src/`)

| Path | Purpose |
|------|---------|
| `lib.rs` | App setup: tray menu, state management, window creation, plugin registration |
| `overlay.rs` | Overlay window management; three modes (Hidden/Drawing/Penetration); toolbar stacking |
| `config.rs` | AppConfig serialization; migrations; line width / theme / shortcut config |
| `commands.rs` | Tauri IPC command handlers (save_general, save_shortcuts, clipboard, etc.) |
| `shortcuts.rs` | Global shortcut registration via `tauri_plugin_global_shortcut` |
| `monitor.rs` | Multi-monitor geometry; cursor clipping to active monitor |
| `theme.rs` | System theme detection; Win32 HICON cache; tray icon glyph swapping |
| `clipboard.rs` | Screen/whiteboard copy to system clipboard |
| `diagnostics.rs` | Tracing/Log backend; diagnostic report export |
| `i18n.rs` | Rust-side i18n for tray menu and window titles |
| `win32.rs` | Win32 API bindings (cursor clip, monitor info, HICON) |
| `macos.rs` | macOS-specific: NSWindow addChildWindow, Accessory policy, appearance |
| `macos_cursor.rs` | macOS cursor confinement |
| `portable.rs` | Portable mode (Webview2 user-data-dir override) |

## API Surface (Tauri Commands)

- `get_config` → AppConfig
- `get_overlay_pointer_position` → OverlayPointerPosition
- `get_overlay_monitor_logical_bounds` → MonitorLogicalBounds
- `is_pointer_over_toolbar_panel` → bool
- `set_overlay_ignore_cursor_events` → void
- `save_shortcuts` → SaveResult
- `save_general` → AppResult<()>
- `save_line_widths` → AppResult<()>
- `save_locale` → AppResult<()>
- `apply_app_theme` → AppResult<()>
- `exit_drawing` → void
- `enter_penetration_mode` / `exit_penetration_mode` / `toggle_penetration_mode`
- `set_whiteboard_mode` → void
- `set_toolbar_visible` / `set_toolbar_popup` / `raise_toolbar`
- `suppress_penetration` → void
- `open_url` → AppResult<()> (URL allowlisted)
- `reveal_settings_window` → void
- `is_portable` → bool
- `supports_autostart` → bool
- `export_diagnostics` / `open_github_issue_report` / `append_diagnostic_event`
- `copy_screen` / `copy_whiteboard` → void

## Key Events

- `overlay-mode-changed` → string ("hidden" | "drawing" | "penetration")
- `toggle-drawing` → bool
- `overlay-geometry-changed` → ()
- `clear-drawing` → bool (undoable clear flag)
- `config-changed` → AppConfig snapshot
- `switch-tab` → string (settings tab name)
- Toolbar panel hover/drag events via `overlayBridge.ts`

## Constraints

- **Windows only**: Win32 API for cursor clip, monitor info, HICON theme
- **macOS only**: NSWindow addChildWindow for toolbar stacking, xcap for screenshots
- **Single-instance**: `tauri_plugin_single_instance` ensures only one running instance
- **Activation policy**: macOS uses `Accessory` policy (no dock icon, no space switch)
- **Color palette**: Fixed set defined in `constants/colors.ts`
- **Line width presets**: [1, 2, 3, 5, 8] — middle (3) is default
- **Node version**: Hard-pinned to 24.15.0 via `.node-version` and `package.json` engines
- **No Tailwind opacity classes** in Vue — use semantic CSS classes from `style.css`
- **Sync i18n**: Always update both `en.ts` and `zh-CN.ts` together

## Routing Table

| Area | Child Path |
|------|-----------|
| Frontend components | `./src/components/` |
| Frontend composables | `./src/composables/` |
| Frontend constants | `./src/constants/` |
| Frontend utils | `./src/utils/` |
| Frontend i18n | `./src/i18n/` |
| Frontend types | `./src/types/` |
| Rust backend | `./src-tauri/src/` |
| Rust icons/assets | `./src-tauri/icons/` |
| Cursor rules | `.cursor/rules/` |
| Cursor skills | `.cursor/skills/` |
| Testing scripts | `scripts/` |
| Docs | `docs/` |

## Design Decisions

1. **Hit grid for performance**: `HIT_GRID_SIZE = 192`, max 64 cells — avoids O(n) hit tests on large histories
2. **Adaptive point sampling**: min distance scales with viewport area to keep density consistent across 4K vs FHD
3. **Path2D caching**: `WeakMap<DrawAction, Path2D>` for pen/highlighter/laser to avoid re-pathing on every frame
4. **Laser uses Excalidraw library**: Real beam with geometric taper decay, not simple stroke
5. **Toolbar as child window (macOS)**: `NSWindow addChildWindow` ensures it stays above overlay without steal-focus side effects
6. **Toolbar as SetWindowPos topmost (Windows)**: `HWND_TOPMOST` reorder keeps toolbar above ink overlay
7. **Cursor clip on active monitor**: Drawing mode clips cursor to the monitor where overlay was activated
8. **Penetration mode suppress**: 600ms suppression after activation to prevent immediate re-enter
9. **Config mutex + lock_or_recover**: `Mutex<AppConfig>` with recovery helper prevents panic-on-poison from killing the app
10. **URL allowlist for open_url**: Only github.com and the project's own site permitted

## Known Issues

- **Large files**: `DrawingOverlay.vue` (2077 lines) and `useDrawing.ts` (1468 lines) are legitimately large due to complex single-responsibility canvas logic — splitting would risk losing coherence. Documented here so future agents don't waste turns questioning whether to split.
- **macOS cursor clip**: Uses `xcap` crate which has a permissive license; no issues known.
- **Win32 HICON cache**: Title-bar icon is cached per-theme; theme changes must invalidate and re-render.
- **Copy modifier issue #22**: macOS sends spurious Mod+C after pen-up — fixed by tracking physical modifier keydown state separately from pointer gesture state.

## Test Strategy

- **Frontend**: Vitest with jsdom. Tests cover drawing geometry, render, laser, stamp, tools, tooltip, autoStart, drag interaction, eraser mode, entry mode, platform, portable, rmbHoldErase, textRmbDoubleClick, toolbarPanelHover, toolbarPosition, toolbarSettings, toolbarWindow, i18n index.
- **Backend**: Cargo test in each module (config, commands, shortcuts, monitor, theme).
- **Scripts**: Node test runner for `scripts/*.test.mjs`.
- **Pre-merge CI**: `npm test && npm run lint && npm run format:check && npx vue-tsc --noEmit` + `cargo fmt --check && cargo clippy -- -D warnings && cargo test`

## Notes for Agents

- Run ALL tests before fixing bugs: `npm test && cd src-tauri && cargo test`
- Use `npm run release patch` for version bumps — do NOT manually edit package.json version
- Commit messages must follow Conventional Commits (enforced by husky + commitlint)
- When adding UI strings, sync `en.ts` and `zh-CN.ts` in the same PR
- The `DrawingOverlay.vue` and `useDrawing.ts` files are intentionally large — focus on correctness, not splitting
- Platform-specific code uses `#[cfg(target_os = "...")]` — be careful not to break cross-compilation
