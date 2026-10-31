import { describe, it, expect } from 'vitest'
import type { Point } from './drawingTypes'
import { recognizeStroke } from './shapeRecognition'

function along(a: Point, b: Point, steps: number): Point[] {
  const points: Point[] = []
  for (let i = 0; i < steps; i++) {
    const t = i / steps
    points.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  }
  return points
}

function closedPath(vertices: Point[], stepsPerEdge = 24): Point[] {
  const points: Point[] = []
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % vertices.length]
    points.push(...along(a, b, stepsPerEdge))
  }
  points.push({ ...vertices[0] })
  return points
}

function wobbly(points: Point[], amplitude: number): Point[] {
  return points.map((point, index) => ({
    x: point.x + Math.sin(index * 1.7) * amplitude,
    y: point.y + Math.cos(index * 2.3) * amplitude,
  }))
}

describe('recognizeStroke', () => {
  it('recognizes a straight stroke as a line', () => {
    const points = wobbly(along({ x: 20, y: 40 }, { x: 240, y: 90 }, 30), 1.2)
    const shape = recognizeStroke(points)
    expect(shape?.kind).toBe('line')
    expect(shape?.points).toHaveLength(2)
    expect(shape?.points[0]).toEqual(points[0])
    expect(shape?.points[1]).toEqual(points[points.length - 1])
  })

  it('recognizes a square as a rectangle', () => {
    const shape = recognizeStroke(
      closedPath([
        { x: 100, y: 100 },
        { x: 300, y: 100 },
        { x: 300, y: 300 },
        { x: 100, y: 300 },
      ]),
    )
    expect(shape?.kind).toBe('rect')
    expect(shape?.points).toEqual([
      { x: 100, y: 100 },
      { x: 300, y: 300 },
    ])
  })

  it('recognizes a wobbly rectangle as a rectangle', () => {
    const shape = recognizeStroke(
      wobbly(
        closedPath([
          { x: 80, y: 120 },
          { x: 320, y: 120 },
          { x: 320, y: 280 },
          { x: 80, y: 280 },
        ]),
        2.5,
      ),
    )
    expect(shape?.kind).toBe('rect')
  })

  it('recognizes a circle as an ellipse', () => {
    const points: Point[] = []
    for (let i = 0; i < 96; i++) {
      const angle = (i / 96) * Math.PI * 2
      points.push({ x: 250 + Math.cos(angle) * 120, y: 250 + Math.sin(angle) * 120 })
    }
    points.push({ ...points[0] })
    const shape = recognizeStroke(points)
    expect(shape?.kind).toBe('ellipse')
    expect(shape?.points).toEqual([
      { x: 130, y: 130 },
      { x: 370, y: 370 },
    ])
  })

  it('recognizes an ellipse as an ellipse', () => {
    const points: Point[] = []
    for (let i = 0; i < 96; i++) {
      const angle = (i / 96) * Math.PI * 2
      points.push({ x: 250 + Math.cos(angle) * 160, y: 250 + Math.sin(angle) * 80 })
    }
    points.push({ ...points[0] })
    expect(recognizeStroke(points)?.kind).toBe('ellipse')
  })

  it('recognizes a triangle', () => {
    const shape = recognizeStroke(
      closedPath([
        { x: 200, y: 80 },
        { x: 340, y: 300 },
        { x: 60, y: 300 },
      ]),
    )
    expect(shape?.kind).toBe('triangle')
    expect(shape?.points).toHaveLength(3)
  })

  it('leaves an open arc as ink', () => {
    const points: Point[] = []
    for (let i = 0; i <= 30; i++) {
      const angle = (i / 30) * Math.PI
      points.push({ x: 200 + Math.cos(angle) * 100, y: 200 + Math.sin(angle) * 100 })
    }
    expect(recognizeStroke(points)).toBeNull()
  })

  it('leaves a scribble as ink', () => {
    const points: Point[] = []
    for (let i = 0; i < 160; i++) {
      const angle = (i / 160) * Math.PI * 18
      points.push({ x: 200 + Math.cos(angle) * 90, y: 200 + Math.sin(angle) * 90 })
    }
    expect(recognizeStroke(points)).toBeNull()
  })

  it('ignores tiny strokes', () => {
    expect(recognizeStroke(along({ x: 10, y: 10 }, { x: 18, y: 18 }, 5))).toBeNull()
  })

  it('ignores degenerate input', () => {
    expect(recognizeStroke([])).toBeNull()
    expect(recognizeStroke([{ x: 1, y: 1 }])).toBeNull()
    expect(recognizeStroke([{ x: NaN, y: 1 }, { x: 2, y: 3 }])).toBeNull()
  })
})
