export type Tool =
  | 'pen'
  | 'highlighter'
  | 'laser'
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'triangle'
  | 'eraser'
  | 'text'
  | 'stamp'

export interface Point {
  x: number
  y: number
  /** performance.now() when added — used by laser trail decay. */
  t?: number
}

export interface InputPointLike {
  x?: number
  y?: number
  clientX?: number
  clientY?: number
  /** Stylus pressure 0..1 from a coalesced pointer event. */
  pressure?: number
}

export type TextOutlineColorMode = 'auto' | 'fixed'

export interface TextOutlineStyle {
  enabled: boolean
  colorMode: TextOutlineColorMode
  color: string
  width: number
}

export interface DrawAction {
  tool: Tool
  color: string
  lineWidth: number
  opacity: number
  points: Point[]
  /** Per-point stylus pressure, parallel to `points` (pen strokes only). */
  pressures?: number[]
  attachedErasers?: DrawAction[]
  text?: string
  fontSize?: number
  textWidth?: number
  textOutline?: TextOutlineStyle
  bbox?: { x1: number; y1: number; x2: number; y2: number }
  rectHit?: { x0: number; y0: number; x1: number; y1: number }
  ellipseHit?: { cx: number; cy: number; rx: number; ry: number }
}
