import type {
  AssetKind,
  Bounds,
  ForegroundTransform,
  LoadedAsset,
  MaskType,
  SafeStatus,
} from '../types'

export const LOGICAL_CANVAS = 108
export const MASK_VIEWPORT = 72
export const SAFE_ZONE = 66
export const DEFAULT_TARGET = 60
export const ALPHA_THRESHOLD = 8

function createAnalysisCanvas(image: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('This browser could not initialize image analysis.')
  context.drawImage(image, 0, 0)
  return { canvas, context }
}

function analyzePixels(image: HTMLImageElement): {
  bounds: Bounds
  hasTransparency: boolean
  isEdgeOpaque: boolean
} {
  const { canvas, context } = createAnalysisCanvas(image)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  let minX = canvas.width
  let minY = canvas.height
  let maxX = -1
  let maxY = -1
  let hasTransparency = false
  let isEdgeOpaque = true

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const alpha = pixels[(y * canvas.width + x) * 4 + 3]
      if (alpha < 255) hasTransparency = true
      if ((x === 0 || y === 0 || x === canvas.width - 1 || y === canvas.height - 1) && alpha < 250) {
        isEdgeOpaque = false
      }
      if (alpha > ALPHA_THRESHOLD) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error('This image is entirely transparent. Choose artwork with visible pixels.')
  }

  return {
    bounds: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
    hasTransparency,
    isEdgeOpaque,
  }
}

function sanitizedSvgUrl(file: File): Promise<string> {
  return file.text().then((source) => {
    const documentNode = new DOMParser().parseFromString(source, 'image/svg+xml')
    if (documentNode.querySelector('parsererror')) throw new Error('The SVG file is not valid XML.')

    documentNode.querySelectorAll('script, foreignObject, iframe, object, embed').forEach((node) => node.remove())
    documentNode.querySelectorAll('style').forEach((node) => {
      const css = node.textContent ?? ''
      node.textContent = css
        .replace(/@import[^;]+;?/gi, '')
        .replace(/url\s*\(\s*(['"]?)(?!#)[^)]+\)/gi, '')
    })
    documentNode.querySelectorAll('*').forEach((element) => {
      for (const attribute of [...element.attributes]) {
        const name = attribute.name.toLowerCase()
        const value = attribute.value.trim().toLowerCase()
        if (name.startsWith('on')) element.removeAttribute(attribute.name)
        if (value.includes('javascript:') || value.includes('data:text/html')) element.removeAttribute(attribute.name)
        if (/url\s*\(\s*(['"]?)(?!#)/i.test(value)) element.removeAttribute(attribute.name)
        if ((name === 'href' || name.endsWith(':href')) && !value.startsWith('#') && !value.startsWith('data:image/')) {
          element.removeAttribute(attribute.name)
        }
      }
    })

    const sanitized = new XMLSerializer().serializeToString(documentNode.documentElement)
    return URL.createObjectURL(new Blob([sanitized], { type: 'image/svg+xml' }))
  })
}

export async function loadAsset(file: File, kind: AssetKind): Promise<LoadedAsset> {
  const accepted = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  if (!accepted.includes(file.type)) {
    throw new Error('Choose a PNG, JPEG, WebP, or SVG image.')
  }

  const objectUrl = file.type === 'image/svg+xml' ? await sanitizedSvgUrl(file) : URL.createObjectURL(file)
  const image = new Image()
  image.decoding = 'async'
  image.src = objectUrl

  try {
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('The image has no readable dimensions.')
    const analysis = analyzePixels(image)
    if (kind === 'foreground' && !analysis.hasTransparency) {
      throw new Error('Foreground has no transparency. Upload artwork with a transparent background.')
    }
    return {
      kind,
      fileName: file.name,
      mimeType: file.type,
      width: image.naturalWidth,
      height: image.naturalHeight,
      image,
      objectUrl,
      ...analysis,
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

export function releaseAsset(asset: LoadedAsset | null) {
  if (asset) URL.revokeObjectURL(asset.objectUrl)
}

export function getForegroundGeometry(asset: LoadedAsset, transform: ForegroundTransform) {
  const scale = Math.min(transform.targetSize / asset.bounds.width, transform.targetSize / asset.bounds.height)
  const visibleWidth = asset.bounds.width * scale
  const visibleHeight = asset.bounds.height * scale
  const centerX = LOGICAL_CANVAS / 2 + transform.offsetX
  const centerY = LOGICAL_CANVAS / 2 + transform.offsetY
  return {
    scale,
    visibleWidth,
    visibleHeight,
    x: centerX - visibleWidth / 2,
    y: centerY - visibleHeight / 2,
    centerX,
    centerY,
  }
}

export function getSafeStatus(asset: LoadedAsset | null, transform: ForegroundTransform): SafeStatus {
  if (!asset) return 'outside'
  const geometry = getForegroundGeometry(asset, transform)
  const safeStart = (LOGICAL_CANVAS - SAFE_ZONE) / 2
  const safeEnd = safeStart + SAFE_ZONE
  const outside =
    geometry.x < safeStart ||
    geometry.y < safeStart ||
    geometry.x + geometry.visibleWidth > safeEnd ||
    geometry.y + geometry.visibleHeight > safeEnd
  if (outside) return 'outside'

  const clearance = Math.min(
    geometry.x - safeStart,
    geometry.y - safeStart,
    safeEnd - geometry.x - geometry.visibleWidth,
    safeEnd - geometry.y - geometry.visibleHeight,
  )
  return clearance < 2 ? 'near' : 'safe'
}

function drawBackground(
  context: CanvasRenderingContext2D,
  size: number,
  asset: LoadedAsset | null,
  color: string,
) {
  context.fillStyle = color
  context.fillRect(0, 0, size, size)
  if (!asset) return
  const scale = Math.max(size / asset.width, size / asset.height)
  const width = asset.width * scale
  const height = asset.height * scale
  context.drawImage(asset.image, (size - width) / 2, (size - height) / 2, width, height)
}

function drawForeground(
  context: CanvasRenderingContext2D,
  size: number,
  asset: LoadedAsset,
  transform: ForegroundTransform,
) {
  const geometry = getForegroundGeometry(asset, transform)
  const ratio = size / LOGICAL_CANVAS
  const boundsCenterX = asset.bounds.x + asset.bounds.width / 2
  const boundsCenterY = asset.bounds.y + asset.bounds.height / 2
  const drawScale = geometry.scale * ratio
  context.drawImage(
    asset.image,
    geometry.centerX * ratio - boundsCenterX * drawScale,
    geometry.centerY * ratio - boundsCenterY * drawScale,
    asset.width * drawScale,
    asset.height * drawScale,
  )
}

function addSquirclePath(context: CanvasRenderingContext2D, size: number) {
  const center = size / 2
  const radius = size / 2
  const exponent = 5
  context.beginPath()
  for (let i = 0; i <= 128; i += 1) {
    const angle = (i / 128) * Math.PI * 2
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const x = center + radius * Math.sign(cos) * Math.pow(Math.abs(cos), 2 / exponent)
    const y = center + radius * Math.sign(sin) * Math.pow(Math.abs(sin), 2 / exponent)
    if (i === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  }
  context.closePath()
}

export function addMaskPath(context: CanvasRenderingContext2D, size: number, mask: MaskType) {
  if (mask === 'circle') {
    context.beginPath()
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  } else if (mask === 'squircle') {
    addSquirclePath(context, size)
  } else if (mask === 'rounded') {
    context.beginPath()
    context.roundRect(0, 0, size, size, size * 0.22)
  } else if (mask === 'teardrop') {
    context.beginPath()
    context.moveTo(size * 0.5, 0)
    context.bezierCurveTo(size * 0.82, 0, size, size * 0.18, size, size * 0.5)
    context.bezierCurveTo(size, size * 0.82, size * 0.82, size, size * 0.5, size)
    context.bezierCurveTo(size * 0.18, size, 0, size * 0.82, 0, size * 0.5)
    context.bezierCurveTo(0, size * 0.22, size * 0.22, 0, size * 0.5, 0)
  } else {
    context.beginPath()
    context.rect(0, 0, size, size)
  }
  context.closePath()
}

export type RenderOptions = {
  size: number
  background: LoadedAsset | null
  foreground: LoadedAsset | null
  backgroundColor: string
  transform: ForegroundTransform
  layer?: 'composite' | 'background' | 'foreground'
  mask?: MaskType
  guides?: boolean
  launcherBackground?: string
}

export function renderIcon(canvas: HTMLCanvasElement, options: RenderOptions) {
  const { size, background, foreground, backgroundColor, transform } = options
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, size, size)

  const layer = options.layer ?? 'composite'
  if (layer === 'composite' && options.mask && options.mask !== 'unmasked') {
    context.save()
    addMaskPath(context, size, options.mask)
    context.clip()
  }

  if (layer !== 'foreground') drawBackground(context, size, background, backgroundColor)
  if (layer !== 'background' && foreground) drawForeground(context, size, foreground, transform)

  if (layer === 'composite' && options.mask && options.mask !== 'unmasked') context.restore()
  if (options.guides) drawGuides(context, size, foreground, transform)
}

function drawGuideBox(
  context: CanvasRenderingContext2D,
  size: number,
  logicalSize: number,
  color: string,
  dash: number[],
) {
  const ratio = size / LOGICAL_CANVAS
  const offset = ((LOGICAL_CANVAS - logicalSize) / 2) * ratio
  context.strokeStyle = color
  context.lineWidth = Math.max(1, size / 420)
  context.setLineDash(dash.map((value) => value * (size / 540)))
  context.strokeRect(offset, offset, logicalSize * ratio, logicalSize * ratio)
}

function drawGuides(
  context: CanvasRenderingContext2D,
  size: number,
  foreground: LoadedAsset | null,
  transform: ForegroundTransform,
) {
  context.save()
  drawGuideBox(context, size, MASK_VIEWPORT, 'rgba(255,255,255,.64)', [12, 8])
  drawGuideBox(context, size, SAFE_ZONE, '#ff8a52', [4, 5])
  drawGuideBox(context, size, 48, '#21c0d2', [2, 5])
  context.setLineDash([])
  context.strokeStyle = 'rgba(255,255,255,.88)'
  context.lineWidth = Math.max(1, size / 420)
  context.strokeRect(0.5, 0.5, size - 1, size - 1)

  if (foreground) {
    const geometry = getForegroundGeometry(foreground, transform)
    const ratio = size / LOGICAL_CANVAS
    context.strokeStyle = '#67c77e'
    context.lineWidth = Math.max(1.5, size / 360)
    context.setLineDash([])
    context.strokeRect(
      geometry.x * ratio,
      geometry.y * ratio,
      geometry.visibleWidth * ratio,
      geometry.visibleHeight * ratio,
    )
  }
  context.restore()
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG rendering failed.'))), 'image/png')
  })
}
