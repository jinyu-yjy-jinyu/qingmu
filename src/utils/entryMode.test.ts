import { describe, expect, it } from 'vitest'
import { resolveDefaultEntryMode, resolveEntryMode, shouldClearWhiteboardOnEntry } from './entryMode'

describe('entryMode', () => {
  it('defaults to screen overlay', () => {
    expect(resolveDefaultEntryMode()).toBe('screen')
  })

  it('reads explicit defaultEntryMode', () => {
    expect(resolveDefaultEntryMode({ defaultEntryMode: 'whiteboard' })).toBe('whiteboard')
  })
})

describe('resolveEntryMode', () => {
  it('pending whiteboard request wins over screen default', () => {
    expect(resolveEntryMode('whiteboard', 'screen')).toBe('whiteboard')
  })

  it('pending screen request wins over whiteboard default', () => {
    expect(resolveEntryMode('screen', 'whiteboard')).toBe('screen')
  })

  it('falls back to defaultEntryMode when no pending request', () => {
    expect(resolveEntryMode(null, 'screen')).toBe('screen')
    expect(resolveEntryMode(null, 'whiteboard')).toBe('whiteboard')
  })
})

describe('shouldClearWhiteboardOnEntry', () => {
  it('clears when whiteboard preserve is off and not restoring a preserved session', () => {
    expect(
      shouldClearWhiteboardOnEntry({
        whiteboardPreserveDrawings: false,
        preserveDrawings: true,
        fromDefaultEntry: false,
        hasDrawings: true,
      }),
    ).toBe(true)
  })

  it('keeps drawings when re-entering via default whiteboard with preserve on exit', () => {
    expect(
      shouldClearWhiteboardOnEntry({
        whiteboardPreserveDrawings: false,
        preserveDrawings: true,
        fromDefaultEntry: true,
        hasDrawings: true,
      }),
    ).toBe(false)
  })

  it('still clears a fresh default whiteboard entry when nothing to restore', () => {
    expect(
      shouldClearWhiteboardOnEntry({
        whiteboardPreserveDrawings: false,
        preserveDrawings: true,
        fromDefaultEntry: true,
        hasDrawings: false,
      }),
    ).toBe(true)
  })

  it('respects whiteboard preserve when enabled', () => {
    expect(
      shouldClearWhiteboardOnEntry({
        whiteboardPreserveDrawings: true,
        preserveDrawings: false,
        fromDefaultEntry: false,
        hasDrawings: true,
      }),
    ).toBe(false)
  })
})
