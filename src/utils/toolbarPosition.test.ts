import { describe, expect, it } from 'vitest'
import {
  clampToolbarWindowPosition,
  adjustToolbarTopForHeightChange,
  migratePhysicalToLogical,
  overlayClientToScreenLogical,
  toolbarPopupScreenPosition,
  toolbarPopupScreenPositionAtScreenPoint,
} from './toolbarPosition'

describe('overlayClientToScreenLogical', () => {
  it('adds monitor origin to overlay client coords (multi-monitor above primary)', () => {
    const monitor = { left: -283.3333333333333, top: -1440, width: 2560, height: 1440 }
    expect(overlayClientToScreenLogical(1310, 494, monitor)).toEqual({
      x: 1026.6666666666667,
      y: -946,
    })
  })
})

describe('toolbarPopupScreenPosition', () => {
  it('centers popup on pointer in screen logical space', () => {
    const monitor = { left: -283.3333333333333, top: -1440, width: 2560, height: 1440 }
    const pos = toolbarPopupScreenPosition(1310, 494, 272, 234, monitor)
    expect(pos.left).toBeCloseTo(890.6666666666667, 4)
    // anchorY=-946, top = -946 - 117 = -1063 (within monitor)
    expect(pos.top).toBeCloseTo(-1063, 4)
  })

  it('falls back to viewport clamping when monitor bounds are unknown', () => {
    expect(toolbarPopupScreenPosition(400, 300, 272, 234, null, { width: 1920, height: 1080 })).toEqual({
      left: 264,
      top: 183,
    })
  })

  it('with measured compact height 234, bottom pointer can place panel lower than inflated 500', () => {
    const monitor = { left: 0, top: 0, width: 1920, height: 1080 }
    const pointerY = 1040
    const with500 = toolbarPopupScreenPosition(960, pointerY, 300, 500, monitor)
    const with234 = toolbarPopupScreenPosition(960, pointerY, 300, 234, monitor)
    // maxTop = height - panelH - 12
    expect(with500.top).toBe(1080 - 500 - 12)
    expect(with234.top).toBe(1080 - 234 - 12)
    expect(with234.top - with500.top).toBe(266)
  })
})

describe('toolbarPopupScreenPositionAtScreenPoint', () => {
  it('centers the panel on an absolute screen point inside its monitor', () => {
    const monitor = { left: 0, top: 0, width: 1920, height: 1080 }
    expect(toolbarPopupScreenPositionAtScreenPoint(960, 540, 320, 234, monitor)).toEqual({
      left: 960 - 160,
      top: 540 - 117,
    })
  })

  it('stays on a left-side secondary monitor instead of clamping to the primary (boundaryless regression)', () => {
    // Boundaryless overlay spans [-1920..1920]; pointer at screen (-1000, 400)
    // must anchor there, not be pulled into the primary monitor at 0..1920.
    const secondary = { left: -1920, top: 0, width: 1920, height: 1080 }
    const pos = toolbarPopupScreenPositionAtScreenPoint(-1000, 400, 320, 234, secondary)
    expect(pos.left).toBe(-1160)
    expect(pos.top).toBe(283)
  })

  it('clamps into the anchor monitor when the panel would overflow an edge', () => {
    const monitor = { left: 0, top: 0, width: 1920, height: 1080 }
    const pos = toolbarPopupScreenPositionAtScreenPoint(1900, 100, 320, 234, monitor)
    expect(pos.left).toBe(1920 - 320 - 12)
    // top = -17 would leave the monitor; clamps to the 12px margin.
    expect(pos.top).toBe(12)
  })

  it('returns the unclamped centered position without monitor bounds', () => {
    expect(toolbarPopupScreenPositionAtScreenPoint(-1000, 400, 320, 234, null)).toEqual({
      left: -1160,
      top: 283,
    })
  })
})

describe('clampToolbarWindowPosition', () => {
  const monitor = { left: 0, top: 0, width: 1920, height: 1080 }

  it('keeps position inside monitor', () => {
    expect(clampToolbarWindowPosition(100, 200, 272, 400, monitor)).toEqual({ left: 100, top: 200 })
  })

  it('clamps panel dragged past right edge', () => {
    expect(clampToolbarWindowPosition(2000, 200, 272, 400, monitor).left).toBe(1920 - 272 - 8)
  })

  it('clamps panel dragged past bottom edge', () => {
    expect(clampToolbarWindowPosition(100, 900, 272, 400, monitor).top).toBe(1080 - 400 - 8)
  })
})

describe('adjustToolbarTopForHeightChange', () => {
  const monitor = { left: 0, top: 0, width: 1920, height: 1080 }
  const margin = 12
  const maxBottom = 1080 - margin

  it('grows upward when panel is on the bottom edge (更多)', () => {
    const oldH = 234
    const newH = 452
    const top = maxBottom - oldH
    const next = adjustToolbarTopForHeightChange(top, oldH, newH, monitor, margin)
    expect(next).toBe(maxBottom - newH)
    expect(next + newH).toBe(maxBottom)
    expect(next).toBeLessThan(top)
  })

  it('keeps top fixed when mid-screen expand still fits', () => {
    expect(adjustToolbarTopForHeightChange(200, 234, 452, monitor, margin)).toBe(200)
  })

  it('keeps bottom fixed when collapsing a bottom-anchored panel (收起)', () => {
    const oldH = 452
    const newH = 234
    const top = maxBottom - oldH
    const next = adjustToolbarTopForHeightChange(top, oldH, newH, monitor, margin)
    expect(next).toBe(maxBottom - newH)
    expect(next + newH).toBe(maxBottom)
  })

  it('ignores small outer-vs-content height noise', () => {
    expect(adjustToolbarTopForHeightChange(800, 234, 240, monitor, margin)).toBe(800)
  })
})

describe('migratePhysicalToLogical', () => {
  it('passes through logical coords unchanged', () => {
    const input = { left: 120, top: 80, coordSpace: 'logical' as const }
    expect(migratePhysicalToLogical(input, 1.25)).toEqual(input)
  })

  it('converts physical coords using scale factor', () => {
    expect(migratePhysicalToLogical({ left: 1250, top: 500, coordSpace: 'physical' }, 1.25)).toEqual({
      left: 1000,
      top: 400,
      coordSpace: 'logical',
    })
  })

  it('treats missing coordSpace as physical (legacy v1)', () => {
    expect(migratePhysicalToLogical({ left: 1500, top: 600 }, 1.5)).toEqual({
      left: 1000,
      top: 400,
      coordSpace: 'logical',
    })
  })

  it('falls back to scale 1 when scale factor is invalid', () => {
    expect(migratePhysicalToLogical({ left: 200, top: 100, coordSpace: 'physical' }, 0)).toEqual({
      left: 200,
      top: 100,
      coordSpace: 'logical',
    })
  })
})
