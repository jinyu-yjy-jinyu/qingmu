import type { Point } from './drawingTypes'

export type RecognizedShapeKind = 'line' | 'rect' | 'ellipse' | 'triangle'

export interface RecognizedShape {
  kind: RecognizedShapeKind
  /** Two points for line/rect/ellipse, three vertices for triangle. */
  points: Point[]
  confidence: number
}

export interface RecognizeOptions {
  /** Ignore tiny strokes (screen pixels). */
  minLength?: number
  /** Ignore strokes whose bounding box diagonal is smaller than this. */
  minSize?: number
  /** Start/end distance ÷ path length below this counts as a closed shape. */
  closedRatio?: number
}

const RESAMPLE_COUNT = 96
const CORNER_WINDOW = 3
const CORNER_ANGLE = (45 * Math.PI) / 180
const CORNER_MERGE = 7

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function polylineLength(points: Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i])
  return total
}

function dedupe(points: Point[]): Point[] {
  const out: Point[] = []
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
    const last = out[out.length - 1]
    if (!last || dist(last, point) > 0.01) out.push({ x: point.x, y: point.y })
  }
  return out
}

function bboxOf(points: Point[]) {
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  for (const point of points) {
    if (point.x < x1) x1 = point.x
    if (point.y < y1) y1 = point.y
    if (point.x > x2) x2 = point.x
    if (point.y > y2) y2 = point.y
  }
  return { x1, y1, x2, y2, width: x2 - x1, height: y2 - y1 }
}

/** Resample a polyline to `count` points spaced evenly along its arc length. */
function resample(points: Point[], count: number): Point[] {
  if (points.length === 0) return []
  if (points.length === 1) return Array.from({ length: count }, () => ({ ...points[0] }))

  const total = polylineLength(points)
  if (total === 0) return Array.from({ length: count }, () => ({ ...points[0] }))

  const step = total / (count - 1)
  const out: Point[] = [{ ...points[0] }]
  let segmentStart = points[0]
  let segmentEnd = points[1]
  let segmentIndex = 1
  let segmentLength = dist(segmentStart, segmentEnd)
  let walked = 0

  for (let i = 1; i < count - 1; i++) {
    const target = i * step
    while (segmentIndex < points.length - 1 && walked + segmentLength < target) {
      walked += segmentLength
      segmentIndex++
      segmentStart = points[segmentIndex - 1]
      segmentEnd = points[segmentIndex]
      segmentLength = dist(segmentStart, segmentEnd)
    }
    const t = segmentLength > 0 ? (target - walked) / segmentLength : 0
    out.push({
      x: segmentStart.x + (segmentEnd.x - segmentStart.x) * t,
      y: segmentStart.y + (segmentEnd.y - segmentStart.y) * t,
    })
  }

  out.push({ ...points[points.length - 1] })
  return out
}

function maxDeviationFromChord(points: Point[]): number {
  const a = points[0]
  const b = points[points.length - 1]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return Math.max(...points.map((point) => dist(point, a)))

  let max = 0
  for (const point of points) {
    const deviation = Math.abs(dy * point.x - dx * point.y + b.x * a.y - b.y * a.x) / len
    if (deviation > max) max = deviation
  }
  return max
}

function polygonArea(points: Point[]): number {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    area += a.x * b.y - b.x * a.y
  }
  return area / 2
}

/** How sharply the path turns at `points[i]` (0 = straight, π = reversal). */
function turnAngleAt(points: Point[], index: number, window: number): number {
  const n = points.length
  const prev = points[(index - window + n) % n]
  const current = points[index]
  const next = points[(index + window) % n]
  const ax = current.x - prev.x
  const ay = current.y - prev.y
  const bx = next.x - current.x
  const by = next.y - current.y
  const la = Math.hypot(ax, ay)
  const lb = Math.hypot(bx, by)
  if (la === 0 || lb === 0) return 0
  const cos = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)))
  return Math.acos(cos)
}

/**
 * Corner indices on a closed, evenly resampled polyline. A corner is a sharp
 * turn over a small window of samples, which is robust to hand wobble; nearby
 * peaks are merged so a slightly rounded corner counts once.
 */
function detectCorners(points: Point[]): number[] {
  const n = points.length
  const scores: number[] = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    scores[i] = turnAngleAt(points, i, CORNER_WINDOW)
  }

  const peaks: number[] = []
  for (let i = 0; i < n; i++) {
    const value = scores[i]
    if (value < CORNER_ANGLE) continue
    if (scores[(i - 1 + n) % n] > value || scores[(i + 1) % n] > value) continue
    peaks.push(i)
  }
  // Strongest corners win; suppress neighbours within the merge radius.
  peaks.sort((a, b) => scores[b] - scores[a])
  const accepted: number[] = []
  for (const index of peaks) {
    const tooClose = accepted.some((other) => {
      const delta = Math.abs(index - other)
      return Math.min(delta, n - delta) <= CORNER_MERGE
    })
    if (!tooClose) accepted.push(index)
  }
  return accepted.sort((a, b) => a - b)
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/**
 * Turn a freehand pen stroke into a standard shape when the gesture is a
 * confident line / rectangle / ellipse / triangle. Returns `null` for
 * scribbles, tiny strokes, and anything ambiguous so the original ink wins.
 */
export function recognizeStroke(raw: Point[], options: RecognizeOptions = {}): RecognizedShape | null {
  const minLength = options.minLength ?? 24
  const minSize = options.minSize ?? 18
  const closedRatio = options.closedRatio ?? 0.22

  const points = dedupe(raw)
  if (points.length < 4) return null

  const total = polylineLength(points)
  const box = bboxOf(points)
  const diagonal = Math.hypot(box.width, box.height)
  if (total < minLength || diagonal < minSize) return null
  // A dense scribble travels many times its own bounding box; leave it alone.
  if (total / Math.max(1, diagonal) > 7) return null

  const sampled = resample(points, RESAMPLE_COUNT)
  const startEnd = dist(sampled[0], sampled[sampled.length - 1])
  const closed = startEnd / Math.max(1, total) <= closedRatio

  if (!closed) {
    const chord = dist(sampled[0], sampled[sampled.length - 1])
    if (chord < minSize) return null
    const deviation = maxDeviationFromChord(sampled)
    const straightness = deviation / chord
    if (straightness <= 0.09) {
      return {
        kind: 'line',
        points: [
          { x: points[0].x, y: points[0].y },
          { x: points[points.length - 1].x, y: points[points.length - 1].y },
        ],
        confidence: clamp01(1 - straightness / 0.09),
      }
    }
    return null
  }

  // Drop the duplicated endpoint so the loop is evenly sampled and the
  // wrap-around neighbourhood is not distorted by two coincident points.
  const loop = sampled.slice(0, -1)
  const corners = detectCorners(loop)
  const area = Math.abs(polygonArea(loop))
  const perimeter = polylineLength(loop) + dist(loop[loop.length - 1], loop[0])
  const circularity = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0

  const ellipsePoints = (): Point[] => [
    { x: box.x1, y: box.y1 },
    { x: box.x2, y: box.y2 },
  ]

  // Smooth loop, or a loop with many small wiggles: circle / ellipse.
  if (corners.length <= 1 || corners.length >= 7) {
    if (circularity >= 0.78) {
      return { kind: 'ellipse', points: ellipsePoints(), confidence: clamp01((circularity - 0.78) / 0.2 + 0.6) }
    }
    return null
  }

  if (corners.length === 4 && circularity >= 0.55 && circularity <= 0.92) {
    return { kind: 'rect', points: ellipsePoints(), confidence: 0.8 }
  }

  if (corners.length === 3 && circularity >= 0.32 && circularity <= 0.8) {
    return {
      kind: 'triangle',
      points: corners.map((index) => ({ x: loop[index].x, y: loop[index].y })),
      confidence: 0.75,
    }
  }

  // A five/six-corner result is usually a rounded rectangle or a noisy loop.
  // Keep the ellipse fallback for smooth strokes and leave the rest as ink.
  if (circularity >= 0.8) {
    return { kind: 'ellipse', points: ellipsePoints(), confidence: 0.65 }
  }

  return null
}
