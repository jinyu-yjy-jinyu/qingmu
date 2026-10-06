export interface ViewportState {
  offsetX: number
  offsetY: number
  zoom: number
}

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 4
export const WHEEL_ZOOM_STEP_K = 0.0015

export function createDefaultViewport(): ViewportState {
  return { offsetX: 0, offsetY: 0, zoom: 1 }
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

/**
 * Set the canvas transform so a world-space point (wx, wy) is drawn at screen
 * physical pixel ((wx - offsetX) * zoom * dpr, (wy - offsetY) * zoom * dpr).
 */
export function applyViewportTransform(ctx: CanvasRenderingContext2D, vp: ViewportState, dpr: number): void {
  ctx.setTransform(dpr * vp.zoom, 0, 0, dpr * vp.zoom, -vp.offsetX * dpr * vp.zoom, -vp.offsetY * dpr * vp.zoom)
}

export function screenToWorld(vp: ViewportState, x: number, y: number): { x: number; y: number } {
  return { x: (x - vp.offsetX) / vp.zoom, y: (y - vp.offsetY) / vp.zoom }
}

export function worldToScreen(vp: ViewportState, x: number, y: number): { x: number; y: number } {
  return { x: x * vp.zoom + vp.offsetX, y: y * vp.zoom + vp.offsetY }
}

export function computeZoomFromWheel(zoom: number, deltaY: number): number {
  const factor = Math.exp(-deltaY * WHEEL_ZOOM_STEP_K)
  return clampZoom(zoom * factor)
}

/** Keep the world point under the mouse fixed when zooming toward the cursor. */
export function computeOffsetForAnchorZoom(
  vp: ViewportState,
  mouseScreenX: number,
  mouseScreenY: number,
  nextZoom: number,
): ViewportState {
  const world = screenToWorld(vp, mouseScreenX, mouseScreenY)
  return {
    offsetX: mouseScreenX - world.x * nextZoom,
    offsetY: mouseScreenY - world.y * nextZoom,
    zoom: nextZoom,
  }
}
