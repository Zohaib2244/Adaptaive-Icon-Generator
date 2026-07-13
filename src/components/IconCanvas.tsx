import { useEffect, useRef } from 'react'
import type { ForegroundTransform, LoadedAsset, MaskType } from '../types'
import { renderIcon } from '../lib/images'

type IconCanvasProps = {
  background: LoadedAsset | null
  foreground: LoadedAsset | null
  backgroundColor: string
  transform: ForegroundTransform
  mask?: MaskType
  guides?: boolean
  size: number
  className?: string
  label: string
}

export function IconCanvas({
  background,
  foreground,
  backgroundColor,
  transform,
  mask = 'unmasked',
  guides = false,
  size,
  className,
  label,
}: IconCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    renderIcon(canvasRef.current, {
      size,
      background,
      foreground,
      backgroundColor,
      transform,
      mask,
      guides,
    })
  }, [background, foreground, backgroundColor, transform, mask, guides, size])

  return <canvas ref={canvasRef} className={className} aria-label={label} role="img" />
}
