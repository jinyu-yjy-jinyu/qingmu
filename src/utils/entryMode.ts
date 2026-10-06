export type DefaultEntryMode = 'screen' | 'whiteboard'

export type AnnotationModeRequest = 'whiteboard' | 'screen'

export const DEFAULT_ENTRY_MODE_OPTIONS: DefaultEntryMode[] = ['screen', 'whiteboard']

export function resolveDefaultEntryMode(general?: { defaultEntryMode?: DefaultEntryMode }): DefaultEntryMode {
  return general?.defaultEntryMode ?? 'screen'
}

/**
 * Resolve the entry mode when the overlay activates. A global-shortcut mode
 * request takes priority over `defaultEntryMode`; a `null` pending request
 * falls back to the configured default entry mode.
 */
export function resolveEntryMode(
  pending: AnnotationModeRequest | null,
  defaultEntryMode: DefaultEntryMode,
): DefaultEntryMode {
  if (pending === 'whiteboard') return 'whiteboard'
  if (pending === 'screen') return 'screen'
  return defaultEntryMode
}

/** Whether entering whiteboard should wipe existing drawings. */
export function shouldClearWhiteboardOnEntry(options: {
  whiteboardPreserveDrawings: boolean
  preserveDrawings: boolean
  fromDefaultEntry: boolean
  hasDrawings: boolean
}): boolean {
  if (options.whiteboardPreserveDrawings) return false
  if (options.fromDefaultEntry && options.preserveDrawings && options.hasDrawings) return false
  return true
}
