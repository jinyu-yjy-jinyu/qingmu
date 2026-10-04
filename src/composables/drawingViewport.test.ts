import { describe, it, expect } from 'vitest'
import {
  createDefaultViewport,
  screenToWorld,
  worldToScreen,
  computeZoomFromWheel,
  computeOffsetForAnchorZoom,
  MIN_ZOOM,
  MAX_ZOOM,
  clampZoom,
} from './drawingViewport'

describe('drawingViewport', () => {
  describe('screenToWorld / worldToScreen', () => {
    it('are inverse operations', () => {
      const vp = { offsetX: 120, offsetY: -40, zoom: 2 }
      for (const [x, y] of [
        [0, 0],
        [100, 200],
        [1920, 1080],
        [-50, 33],
      ]) {
        const world = screenToWorld(vp, x, y)
        const back = worldToScreen(vp, world.x, world.y)
        expect(back.x).toBeCloseTo(x, 6)
        expect(back.y).toBeCloseTo(y, 6)
      }
    })

    it('identity viewport maps coordinates unchanged', () => {
      const vp = createDefaultViewport()
      const world = screenToWorld(vp, 300, 200)
      expect(world).toEqual({ x: 300, y: 200 })
    })

    it('applies offset and zoom correctly', () => {
      const vp = { offsetX: 100, offsetY: 50, zoom: 0.5 }
      const world = screenToWorld(vp, 200, 100)
      expect(world.x).toBe(200)
      expect(world.y).toBe(100)
    })
  })

  describe('computeZoomFromWheel', () => {
    it('clamps to minimum zoom', () => {
      const next = computeZoomFromWheel(1, 100000)
      expect(next).toBe(MIN_ZOOM)
      expect(next).toBeGreaterThanOrEqual(MIN_ZOOM)
    })

    it('clamps to maximum zoom', () => {
      const next = computeZoomFromWheel(1, -100000)
      expect(next).toBe(MAX_ZOOM)
      expect(next).toBeLessThanOrEqual(MAX_ZOOM)
    })

    it('scroll up (negative deltaY) zooms in', () => {
      const next = computeZoomFromWheel(1, -120)
      expect(next).toBeGreaterThan(1)
    })

    it('scroll down (positive deltaY) zooms out', () => {
      const next = computeZoomFromWheel(1, 120)
      expect(next).toBeLessThan(1)
    })

    it('no delta keeps zoom unchanged', () => {
      expect(computeZoomFromWheel(1.5, 0)).toBe(1.5)
    })

    it('clampZoom enforces bounds', () => {
      expect(clampZoom(0.01)).toBe(MIN_ZOOM)
      expect(clampZoom(100)).toBe(MAX_ZOOM)
      expect(clampZoom(2)).toBe(2)
    })
  })

  describe('computeOffsetForAnchorZoom', () => {
    it('keeps the world point under the mouse fixed', () => {
      const vp = { offsetX: 10, offsetY: 20, zoom: 1.5 }
      const mouseScreenX = 400
      const mouseScreenY = 300
      const before = screenToWorld(vp, mouseScreenX, mouseScreenY)

      const nextZoom = 2
      const next = computeOffsetForAnchorZoom(vp, mouseScreenX, mouseScreenY, nextZoom)
      const after = screenToWorld(next, mouseScreenX, mouseScreenY)

      expect(next.zoom).toBe(nextZoom)
      expect(after.x).toBeCloseTo(before.x, 6)
      expect(after.y).toBeCloseTo(before.y, 6)
    })

    it('zoom out toward the cursor keeps the anchored world point', () => {
      const vp = { offsetX: -500, offsetY: 800, zoom: 3 }
      const mouseScreenX = 900
      const mouseScreenY = 500
      const before = screenToWorld(vp, mouseScreenX, mouseScreenY)

      const nextZoom = 0.75
      const next = computeOffsetForAnchorZoom(vp, mouseScreenX, mouseScreenY, nextZoom)
      const after = screenToWorld(next, mouseScreenX, mouseScreenY)

      expect(after.x).toBeCloseTo(before.x, 6)
      expect(after.y).toBeCloseTo(before.y, 6)
    })
  })
})
