export type EraserMode = 'stroke' | 'object'

export const ERASER_MODE_OPTIONS: EraserMode[] = ['stroke', 'object']

export function resolveEraserMode(general?: { eraserMode?: EraserMode }): EraserMode {
  return general?.eraserMode ?? 'stroke'
}
