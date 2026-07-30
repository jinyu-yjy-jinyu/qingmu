import { describe, expect, it } from 'vitest'
import { resolveEraserMode } from './eraserMode'

describe('eraserMode', () => {
  it('defaults to stroke erasing', () => {
    expect(resolveEraserMode()).toBe('stroke')
  })

  it('reads explicit eraserMode', () => {
    expect(resolveEraserMode({ eraserMode: 'object' })).toBe('object')
  })
})
