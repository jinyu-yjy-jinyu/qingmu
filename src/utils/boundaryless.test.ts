import { describe, expect, it } from 'vitest'
import { resolveWhiteboardBoundaryless } from './boundaryless'

describe('boundaryless', () => {
  it('defaults to enabled when unset', () => {
    expect(resolveWhiteboardBoundaryless()).toBe(true)
    expect(resolveWhiteboardBoundaryless({})).toBe(true)
  })

  it('reads an explicit enabled value', () => {
    expect(resolveWhiteboardBoundaryless({ whiteboardBoundaryless: true })).toBe(true)
  })

  it('honours an explicit disabled value', () => {
    expect(resolveWhiteboardBoundaryless({ whiteboardBoundaryless: false })).toBe(false)
  })
})
