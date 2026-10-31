/**
 * Borderless whiteboard: the whiteboard surface is transparent (the desktop
 * shows through instead of an opaque white sheet) and the overlay window spans
 * the whole virtual desktop so panning can continue across monitors.
 *
 * Opt-out by default: a config written before this setting existed resolves to
 * `true` so upgrading users get the feature without a migration step.
 */
export function resolveWhiteboardBoundaryless(general?: { whiteboardBoundaryless?: boolean }): boolean {
  return general?.whiteboardBoundaryless ?? true
}
