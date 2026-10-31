use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

/// Monitor bounds captured when drawing mode activates.
///
/// Units follow the per-platform sources: physical pixels on Windows (Win32
/// monitor rect), screen points on macOS (xcap reads `CGDisplayBounds`, which
/// is already in the global display coordinate space — see `get_cursor_monitor_rect`).
/// Every consumer on each platform uses the same units (`ClipCursor` vs
/// `CGWarpMouseCursorPosition`), so the tuple is unit-consistent per platform.
type DrawingMonitorClip = (i32, i32, u32, u32);

static DRAWING_MONITOR_CLIP: Mutex<Option<DrawingMonitorClip>> = Mutex::new(None);

#[cfg(windows)]
fn clip_rect_from_monitor((x, y, w, h): DrawingMonitorClip) -> crate::win32::RECT {
    crate::win32::RECT {
        left: x,
        top: y,
        right: x + w as i32,
        bottom: y + h as i32,
    }
}

/// Remember the overlay monitor and confine the cursor to it (drawing mode).
pub fn remember_and_clip_drawing_monitor(app: &AppHandle) {
    #[cfg(target_os = "macos")]
    let rect = get_cursor_monitor_rect().or_else(|| get_overlay_monitor_rect(app));
    #[cfg(not(target_os = "macos"))]
    let rect = get_overlay_monitor_rect(app).or_else(get_cursor_monitor_rect);
    let Some(rect) = rect else {
        return;
    };
    if let Ok(mut stored) = DRAWING_MONITOR_CLIP.lock() {
        *stored = Some(rect);
    }
    apply_drawing_cursor_clip();
}

/// Re-apply cursor clip after leaving penetration mode.
pub fn apply_drawing_cursor_clip() {
    #[cfg(windows)]
    {
        let Some(bounds) = DRAWING_MONITOR_CLIP.lock().ok().and_then(|guard| *guard) else {
            return;
        };
        let rc = clip_rect_from_monitor(bounds);
        if !crate::win32::clip_cursor_to_rect(Some(&rc)) {
            tracing::warn!(
                "ClipCursor failed for monitor {},{}, {}x{}",
                bounds.0,
                bounds.1,
                bounds.2,
                bounds.3
            );
        }
    }
    #[cfg(target_os = "macos")]
    {
        let Some(bounds) = DRAWING_MONITOR_CLIP.lock().ok().and_then(|guard| *guard) else {
            return;
        };
        crate::macos_cursor::start_cursor_clip(bounds);
    }
}

/// Temporarily release cursor confinement (e.g. click-through) while keeping monitor bounds.
pub fn suspend_drawing_cursor_clip() {
    #[cfg(windows)]
    crate::win32::release_cursor_clip();
    #[cfg(target_os = "macos")]
    crate::macos_cursor::stop_cursor_clip();
}

/// Release cursor confinement and forget the active monitor bounds.
pub fn release_drawing_cursor_clip() {
    suspend_drawing_cursor_clip();
    #[cfg(target_os = "macos")]
    crate::macos_cursor::release_cursor_clip();
    if let Ok(mut stored) = DRAWING_MONITOR_CLIP.lock() {
        *stored = None;
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayPointerPosition {
    pub x: f64,
    pub y: f64,
    pub screen_x: i32,
    pub screen_y: i32,
}

/// Screen-space cursor position. Physical pixels on Windows; screen points on
/// macOS (`CGEventGetLocation` lives in the global display coordinate space).
#[cfg(target_os = "windows")]
pub fn get_cursor_screen_pos() -> Option<(i32, i32)> {
    use crate::win32::{GetCursorPos, POINT};
    unsafe {
        let mut pt = POINT { x: 0, y: 0 };
        if GetCursorPos(&mut pt) == 0 {
            return None;
        }
        Some((pt.x, pt.y))
    }
}

#[cfg(target_os = "macos")]
pub fn get_cursor_screen_pos() -> Option<(i32, i32)> {
    #[repr(C)]
    struct CGPoint {
        x: f64,
        y: f64,
    }
    extern "C" {
        fn CGEventCreate(source: *const std::ffi::c_void) -> *mut std::ffi::c_void;
        fn CGEventGetLocation(event: *const std::ffi::c_void) -> CGPoint;
        fn CFRelease(cf: *const std::ffi::c_void);
    }

    unsafe {
        let event = CGEventCreate(std::ptr::null());
        if event.is_null() {
            return None;
        }
        let pt = CGEventGetLocation(event);
        CFRelease(event);
        Some((pt.x as i32, pt.y as i32))
    }
}

/// Cursor position in overlay client coordinates (CSS pixels in the webview).
///
/// The origin is the overlay window itself, not the monitor under the cursor: the
/// borderless whiteboard stretches the window across the whole virtual desktop, so
/// its client (0,0) is the desktop corner while the cursor may sit on any monitor.
pub fn get_overlay_client_pointer(app: &AppHandle) -> Option<OverlayPointerPosition> {
    let (screen_x, screen_y) = get_cursor_screen_pos()?;
    let window = app.get_webview_window("overlay")?;
    let origin = window.inner_position().ok()?;
    #[cfg(target_os = "macos")]
    {
        // Cocoa geometry is in points; `inner_position` reports physical pixels.
        let scale = window.scale_factor().ok()?;
        Some(OverlayPointerPosition {
            x: screen_x as f64 - origin.x as f64 / scale,
            y: screen_y as f64 - origin.y as f64 / scale,
            screen_x,
            screen_y,
        })
    }
    #[cfg(not(target_os = "macos"))]
    {
        let scale = window.scale_factor().ok()?;
        Some(OverlayPointerPosition {
            x: (screen_x - origin.x) as f64 / scale,
            y: (screen_y - origin.y) as f64 / scale,
            screen_x,
            screen_y,
        })
    }
}

/// Returns (x, y, width, height) of the monitor containing the cursor.
///
/// Units differ by platform and each caller must match them:
/// - Windows: physical pixels (Win32 `MonitorFromPoint` + `GetMonitorInfo`).
/// - macOS: screen points — xcap reads `CGDisplayBounds`, which Apple defines
///   in the global display coordinate space (points), NOT physical pixels.
///   That makes the value directly usable as `LogicalSize`/`LogicalPosition`
///   and compatible with `CGEventGetLocation` / `CGWarpMouseCursorPosition`.
#[cfg(target_os = "windows")]
pub fn get_cursor_monitor_rect() -> Option<(i32, i32, u32, u32)> {
    crate::win32::get_cursor_monitor_rect_win32()
}

#[cfg(target_os = "macos")]
pub fn get_cursor_monitor_rect() -> Option<(i32, i32, u32, u32)> {
    #[repr(C)]
    struct CGPoint {
        x: f64,
        y: f64,
    }
    extern "C" {
        fn CGEventCreate(source: *const std::ffi::c_void) -> *mut std::ffi::c_void;
        fn CGEventGetLocation(event: *const std::ffi::c_void) -> CGPoint;
        fn CFRelease(cf: *const std::ffi::c_void);
    }

    let (cx, cy) = unsafe {
        let event = CGEventCreate(std::ptr::null());
        if event.is_null() {
            return None;
        }
        let pt = CGEventGetLocation(event);
        CFRelease(event);
        (pt.x as i32, pt.y as i32)
    };

    let monitor = xcap::Monitor::from_point(cx, cy).ok()?;
    let x = monitor.x().ok()?;
    let y = monitor.y().ok()?;
    let w = monitor.width().ok()?;
    let h = monitor.height().ok()?;
    Some((x, y, w, h))
}

#[cfg(target_os = "windows")]
fn get_monitor_rect_at_point(x: i32, y: i32) -> Option<(i32, i32, u32, u32)> {
    crate::win32::get_monitor_rect_at_point_win32(x, y)
}

#[cfg(target_os = "macos")]
fn get_monitor_rect_at_point(x: i32, y: i32) -> Option<(i32, i32, u32, u32)> {
    let monitor = xcap::Monitor::from_point(x, y).ok()?;
    let x = monitor.x().ok()?;
    let y = monitor.y().ok()?;
    let w = monitor.width().ok()?;
    let h = monitor.height().ok()?;
    Some((x, y, w, h))
}

/// Monitor bounds for the overlay window (used to confine the cursor while drawing).
/// Units: physical pixels on Windows, screen points on macOS (see `get_cursor_monitor_rect`).
pub fn get_overlay_monitor_rect(app: &AppHandle) -> Option<(i32, i32, u32, u32)> {
    let window = app.get_webview_window("overlay")?;
    let pos = window.outer_position().ok()?;
    let size = window.outer_size().ok()?;
    let cx = pos.x + (size.width as i32 / 2);
    let cy = pos.y + (size.height as i32 / 2);
    get_monitor_rect_at_point(cx, cy)
}

/// Union of the given monitor rectangles in physical pixels.
fn union_rects(rects: &[(i32, i32, i32, i32)]) -> Option<(i32, i32, u32, u32)> {
    let mut left = i32::MAX;
    let mut top = i32::MAX;
    let mut right = i32::MIN;
    let mut bottom = i32::MIN;

    for (x, y, w, h) in rects {
        left = left.min(*x);
        top = top.min(*y);
        right = right.max(x.saturating_add(*w));
        bottom = bottom.max(y.saturating_add(*h));
    }

    if right <= left || bottom <= top {
        return None;
    }
    Some((left, top, (right - left) as u32, (bottom - top) as u32))
}

/// Union of every connected monitor in physical pixels.
///
/// Used by the borderless whiteboard so its canvas can span the whole virtual
/// desktop instead of being clamped to the monitor under the cursor.
pub fn get_virtual_desktop_rect(app: &AppHandle) -> Option<(i32, i32, u32, u32)> {
    let monitors = app.available_monitors().ok()?;
    let rects: Vec<(i32, i32, i32, i32)> = monitors
        .iter()
        .map(|m| {
            let pos = m.position();
            let size = m.size();
            (pos.x, pos.y, size.width as i32, size.height as i32)
        })
        .collect();
    union_rects(&rects)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorLogicalBounds {
    pub left: f64,
    pub top: f64,
    pub width: f64,
    pub height: f64,
}

/// Overlay monitor bounds in logical coordinates for toolbar window positioning.
pub fn get_overlay_monitor_logical_bounds(app: &AppHandle) -> Option<MonitorLogicalBounds> {
    let window = app.get_webview_window("overlay")?;
    let monitor = window.current_monitor().ok()??;
    let pos = monitor.position();
    let size = monitor.size();
    let scale = monitor.scale_factor();
    Some(MonitorLogicalBounds {
        left: pos.x as f64 / scale,
        top: pos.y as f64 / scale,
        width: size.width as f64 / scale,
        height: size.height as f64 / scale,
    })
}

/// Logical bounds of the monitor containing the given LOGICAL screen point.
///
/// Unlike `get_overlay_monitor_logical_bounds` (the overlay window's
/// `current_monitor`), this finds the monitor that actually holds a point —
/// under the boundaryless whiteboard the overlay spans several monitors and
/// panels must clamp into the pointer's monitor.
pub fn monitor_logical_bounds_containing(
    app: &AppHandle,
    x: f64,
    y: f64,
) -> Option<MonitorLogicalBounds> {
    let monitors = app.available_monitors().ok()?;
    for m in monitors {
        let scale = m.scale_factor();
        let pos = m.position();
        let size = m.size();
        let left = pos.x as f64 / scale;
        let top = pos.y as f64 / scale;
        let width = size.width as f64 / scale;
        let height = size.height as f64 / scale;
        // Right/bottom edges are exclusive, matching Win32 monitor semantics.
        if x >= left && x < left + width && y >= top && y < top + height {
            return Some(MonitorLogicalBounds {
                left,
                top,
                width,
                height,
            });
        }
    }
    None
}

/// Logical bounds of the monitor containing the given screen point, plus the
/// scale needed to convert raw screen points/pixels into logical coordinates.
fn monitor_bounds_and_scale_at_point(
    app: &AppHandle,
    x: i32,
    y: i32,
) -> Option<(MonitorLogicalBounds, f64)> {
    let monitors = app.available_monitors().ok()?;
    for m in monitors {
        let pos = m.position();
        let size = m.size();
        // Right/bottom edges are exclusive, matching Win32 monitor semantics.
        if x >= pos.x
            && x < pos.x + size.width as i32
            && y >= pos.y
            && y < pos.y + size.height as i32
        {
            let scale = m.scale_factor();
            return Some((
                MonitorLogicalBounds {
                    left: pos.x as f64 / scale,
                    top: pos.y as f64 / scale,
                    width: size.width as f64 / scale,
                    height: size.height as f64 / scale,
                },
                scale,
            ));
        }
    }
    None
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PointerAnchorInfo {
    /// Cursor position in logical screen coordinates.
    pub pointer_x: f64,
    pub pointer_y: f64,
    /// Logical bounds of the monitor containing the cursor; `None` when the
    /// point falls outside every reported monitor (e.g. a gap between
    /// disconnected displays).
    pub monitor: Option<MonitorLogicalBounds>,
}

fn overlay_scale_factor(app: &AppHandle) -> f64 {
    app.get_webview_window("overlay")
        .and_then(|w| w.scale_factor().ok())
        .unwrap_or(1.0)
}

/// Cursor position and its containing monitor's logical bounds, for anchoring
/// popups to the pointer's monitor even when the overlay window spans several
/// monitors (boundaryless whiteboard) and the overlay client origin no longer
/// matches a monitor origin.
///
/// Units: `get_cursor_screen_pos` is physical pixels on Windows and screen
/// points on macOS (see `get_cursor_monitor_rect`); both are converted to
/// logical coordinates here so callers never see raw screen units.
pub fn get_pointer_anchor_info(app: &AppHandle) -> Option<PointerAnchorInfo> {
    let (sx, sy) = get_cursor_screen_pos()?;
    #[cfg_attr(target_os = "macos", allow(unused_variables))]
    let (monitor, point_scale) = monitor_bounds_and_scale_at_point(app, sx, sy)
        .map(|(bounds, scale)| (Some(bounds), scale))
        .unwrap_or_else(|| (None, overlay_scale_factor(app)));
    // macOS cursor coordinates are points, which are already logical; the scale
    // there is only meaningful for the monitor bounds above.
    #[cfg(target_os = "macos")]
    let (pointer_x, pointer_y) = (sx as f64, sy as f64);
    #[cfg(not(target_os = "macos"))]
    let (pointer_x, pointer_y) = (sx as f64 / point_scale, sy as f64 / point_scale);
    Some(PointerAnchorInfo {
        pointer_x,
        pointer_y,
        monitor,
    })
}

pub fn clamp_logical_position_to_monitor(
    left: f64,
    top: f64,
    panel_width: f64,
    panel_height: f64,
    monitor: &MonitorLogicalBounds,
    margin: f64,
) -> (f64, f64) {
    let min_left = monitor.left + margin;
    let min_top = monitor.top + margin;
    let max_left = (monitor.left + monitor.width - panel_width - margin).max(min_left);
    let max_top = (monitor.top + monitor.height - panel_height - margin).max(min_top);
    (left.clamp(min_left, max_left), top.clamp(min_top, max_top))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn union_rects_returns_none_without_monitors() {
        assert_eq!(union_rects(&[]), None);
    }

    #[test]
    fn union_rects_ignores_degenerate_rects() {
        assert_eq!(union_rects(&[(0, 0, 0, 0)]), None);
    }

    #[test]
    fn union_rects_covers_single_monitor() {
        assert_eq!(union_rects(&[(0, 0, 1920, 1080)]), Some((0, 0, 1920, 1080)));
    }

    #[test]
    fn union_rects_spans_monitor_arranged_left_of_primary() {
        // Secondary at negative X plus a 1920x1080 primary at origin.
        assert_eq!(
            union_rects(&[(-1920, -200, 1920, 1080), (0, 0, 1920, 1080)]),
            Some((-1920, -200, 3840, 1280))
        );
    }

    #[test]
    fn union_rects_spans_monitor_arranged_right_and_below() {
        // The secondary starts 200px below the primary, so the union reaches 200 + 1440.
        assert_eq!(
            union_rects(&[(0, 0, 1920, 1080), (1920, 200, 2560, 1440)]),
            Some((0, 0, 4480, 1640))
        );
    }

    #[test]
    fn union_rects_spans_gap_between_disconnected_monitors() {
        assert_eq!(
            union_rects(&[(0, 0, 1280, 1024), (3840, 0, 1280, 1024)]),
            Some((0, 0, 5120, 1024))
        );
    }

    #[test]
    fn clamp_logical_position_keeps_panel_inside_monitor() {
        let monitor = MonitorLogicalBounds {
            left: 0.0,
            top: 0.0,
            width: 1920.0,
            height: 1080.0,
        };
        let (x, y) = clamp_logical_position_to_monitor(100.0, 200.0, 272.0, 400.0, &monitor, 8.0);
        assert_eq!(x, 100.0);
        assert_eq!(y, 200.0);
    }

    #[test]
    fn clamp_logical_position_limits_right_edge() {
        let monitor = MonitorLogicalBounds {
            left: 0.0,
            top: 0.0,
            width: 1920.0,
            height: 1080.0,
        };
        let (x, _) = clamp_logical_position_to_monitor(2000.0, 200.0, 272.0, 400.0, &monitor, 8.0);
        assert_eq!(x, 1920.0 - 272.0 - 8.0);
    }
}
