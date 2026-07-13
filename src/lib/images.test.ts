import { describe, expect, it } from 'vitest'
import type { LoadedAsset } from '../types'
import { getForegroundGeometry, getSafeStatus } from './images'

const asset = (width: number, height: number): LoadedAsset => ({
  kind: 'foreground',
  fileName: 'fixture.png',
  mimeType: 'image/png',
  width,
  height,
  image: null as unknown as HTMLImageElement,
  objectUrl: '',
  hasTransparency: true,
  isEdgeOpaque: false,
  bounds: { x: 0, y: 0, width, height },
})

describe('foreground geometry', () => {
  it('fits a wide asset inside the recommended target while preserving aspect ratio', () => {
    const geometry = getForegroundGeometry(asset(100, 50), { targetSize: 60, offsetX: 0, offsetY: 0 })
    expect(geometry.visibleWidth).toBe(60)
    expect(geometry.visibleHeight).toBe(30)
    expect(geometry.centerX).toBe(54)
    expect(geometry.centerY).toBe(54)
  })

  it('reports the recommended target as safe', () => {
    expect(getSafeStatus(asset(100, 100), { targetSize: 60, offsetX: 0, offsetY: 0 })).toBe('safe')
  })

  it('reports the strict maximum as near the boundary', () => {
    expect(getSafeStatus(asset(100, 100), { targetSize: 66, offsetX: 0, offsetY: 0 })).toBe('near')
  })

  it('reports artwork beyond the strict maximum as outside', () => {
    expect(getSafeStatus(asset(100, 100), { targetSize: 66, offsetX: 1, offsetY: 0 })).toBe('outside')
    expect(getSafeStatus(asset(100, 100), { targetSize: 72, offsetX: 0, offsetY: 0 })).toBe('outside')
  })
})
