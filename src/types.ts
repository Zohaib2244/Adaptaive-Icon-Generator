export type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

export type AssetKind = 'background' | 'foreground'

export type LoadedAsset = {
  kind: AssetKind
  fileName: string
  mimeType: string
  width: number
  height: number
  image: HTMLImageElement
  objectUrl: string
  hasTransparency: boolean
  isEdgeOpaque: boolean
  bounds: Bounds
}

export type ForegroundTransform = {
  targetSize: number
  offsetX: number
  offsetY: number
}

export type SafeStatus = 'safe' | 'near' | 'outside'

export type MaskType =
  | 'circle'
  | 'squircle'
  | 'rounded'
  | 'square'
  | 'teardrop'
  | 'unmasked'

export type ThemeMode = 'system' | 'dark' | 'light'

export type ExportOutput = {
  path: string
  width: number
  height: number
  layerType: 'background' | 'foreground'
  density: string
  sha256: string
  alphaExpected: boolean
}

export type ExportResult = {
  fileName: string
  url: string
  byteLength: number
  outputCount: number
  generatedAt: string
}
