import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  CheckCircle2,
  CircleHelp,
  Crop,
  Eye,
  FileArchive,
  Image as ImageIcon,
  Layers3,
  Monitor,
  Moon,
  Move,
  PackageCheck,
  Palette,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Upload,
  X,
} from 'lucide-react'
import { IconCanvas } from './components/IconCanvas'
import { SectionHeader } from './components/SectionHeader'
import { generateUnityZip } from './lib/export'
import {
  DEFAULT_TARGET,
  getForegroundGeometry,
  getSafeStatus,
  loadAsset,
  releaseAsset,
} from './lib/images'
import type {
  AssetKind,
  ExportResult,
  ForegroundTransform,
  LoadedAsset,
  MaskType,
  SafeStatus,
  ThemeMode,
} from './types'

const DEFAULT_TRANSFORM: ForegroundTransform = { targetSize: DEFAULT_TARGET, offsetX: 0, offsetY: 0 }

const MASKS: { id: MaskType; label: string }[] = [
  { id: 'circle', label: 'Circle' },
  { id: 'squircle', label: 'Squircle' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'square', label: 'Square' },
  { id: 'teardrop', label: 'Teardrop' },
  { id: 'unmasked', label: 'Full layer' },
]

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

type AssetUploaderProps = {
  kind: AssetKind
  title: string
  description: string
  asset: LoadedAsset | null
  error: string | null
  onFile: (file: File) => void
  onRemove: () => void
}

function AssetUploader({
  kind,
  title,
  description,
  asset,
  error,
  onFile,
  onRemove,
}: AssetUploaderProps) {
  const inputId = `${kind}-input`
  const [dragging, setDragging] = useState(false)

  const receiveFiles = (files: FileList | null) => {
    if (files?.[0]) onFile(files[0])
  }

  return (
    <article
      className={`upload-card ${dragging ? 'is-dragging' : ''} ${error ? 'has-error' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        receiveFiles(event.dataTransfer.files)
      }}
    >
      <div className="card-label-row">
        <span className="eyebrow">
          {kind === 'background' ? <ImageIcon aria-hidden="true" /> : <Layers3 aria-hidden="true" />}
          {title}
        </span>
        <span className={`layer-badge ${kind}`}>{kind === 'background' ? 'Opaque' : 'RGBA'}</span>
      </div>

      {asset ? (
        <div className="asset-loaded">
          <div className={`asset-thumbnail ${kind === 'foreground' ? 'checkerboard' : ''}`}>
            <img src={asset.objectUrl} alt="" />
          </div>
          <div className="asset-details">
            <strong title={asset.fileName}>{asset.fileName}</strong>
            <span>
              {asset.width} × {asset.height} · {asset.mimeType.replace('image/', '').toUpperCase()}
            </span>
            <div className="inline-actions">
              <label className="text-action" htmlFor={inputId}>
                Replace
              </label>
              <button className="text-action danger" type="button" onClick={onRemove}>
                Remove
              </button>
            </div>
          </div>
          <Check className="asset-check" aria-label="Asset loaded" />
        </div>
      ) : (
        <label className="empty-upload" htmlFor={inputId}>
          <span className="upload-icon">
            <Upload aria-hidden="true" />
          </span>
          <strong>Drop {kind} here</strong>
          <span>{description}</span>
          <span className="button secondary">Browse files</span>
        </label>
      )}

      <input
        id={inputId}
        className="visually-hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={(event) => {
          receiveFiles(event.target.files)
          event.currentTarget.value = ''
        }}
      />
      {error && (
        <p className="field-error" role="alert">
          <AlertTriangle aria-hidden="true" />
          {error}
        </p>
      )}
    </article>
  )
}

function StatusAnnotation({ status, hasForeground }: { status: SafeStatus; hasForeground: boolean }) {
  if (!hasForeground) {
    return (
      <div className="annotation neutral" role="status" key="neutral">
        <CircleHelp aria-hidden="true" />
        <div>
          <strong>Waiting for artwork</strong>
          <p>Add a transparent foreground to calculate visible bounds.</p>
        </div>
      </div>
    )
  }
  if (status === 'safe') {
    return (
      <div className="annotation safe" role="status" key="safe">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Safe to export</strong>
          <p>All visible foreground pixels sit inside the 66 × 66 safe zone.</p>
        </div>
      </div>
    )
  }
  if (status === 'near') {
    return (
      <div className="annotation warning" role="status" key="near">
        <ShieldAlert aria-hidden="true" />
        <div>
          <strong>Near the limit</strong>
          <p>The artwork is safe, but has less than 2 dp of clearance.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="annotation error" role="alert" key="outside">
      <AlertTriangle aria-hidden="true" />
      <div>
        <strong>Outside safe zone</strong>
        <p>Reduce the size or move the artwork toward the center before export.</p>
      </div>
    </div>
  )
}

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem('aig-theme') as ThemeMode) || 'system')
  const [background, setBackground] = useState<LoadedAsset | null>(null)
  const [foreground, setForeground] = useState<LoadedAsset | null>(null)
  const [backgroundColor, setBackgroundColor] = useState('#ff6b2b')
  const [transform, setTransform] = useState<ForegroundTransform>(DEFAULT_TRANSFORM)
  const [backgroundError, setBackgroundError] = useState<string | null>(null)
  const [foregroundError, setForegroundError] = useState<string | null>(null)
  const [guides, setGuides] = useState(true)
  const [activeMask, setActiveMask] = useState<MaskType>('squircle')
  const [allowOverflow, setAllowOverflow] = useState(false)
  const [projectName, setProjectName] = useState('my-app')
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportPhase, setExportPhase] = useState('Ready')
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportResult, setExportResult] = useState<ExportResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [activeStep, setActiveStep] = useState('assets')
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)
  const resourcesRef = useRef<{
    background: LoadedAsset | null
    foreground: LoadedAsset | null
    exportResult: ExportResult | null
  }>({ background: null, foreground: null, exportResult: null })

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = resolved
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0e0c09' : '#e2d9c8')
    }
    applyTheme()
    media.addEventListener('change', applyTheme)
    localStorage.setItem('aig-theme', theme)
    return () => media.removeEventListener('change', applyTheme)
  }, [theme])

  useEffect(() => {
    resourcesRef.current = { background, foreground, exportResult }
  }, [background, foreground, exportResult])

  useEffect(() => {
    const headings = ['assets', 'fit', 'preview', 'export']
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)
    if (!headings.length) return

    const markerOffset = 150
    let frame = 0

    const update = () => {
      frame = 0
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      if (atBottom) {
        setActiveStep(headings[headings.length - 1].id)
        return
      }
      let current = headings[0].id
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top - markerOffset <= 0) current = heading.id
      }
      setActiveStep(current)
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => () => {
    releaseAsset(resourcesRef.current.background)
    releaseAsset(resourcesRef.current.foreground)
    if (resourcesRef.current.exportResult) URL.revokeObjectURL(resourcesRef.current.exportResult.url)
  }, [])

  const status = getSafeStatus(foreground, transform)
  const geometry = useMemo(
    () => (foreground ? getForegroundGeometry(foreground, transform) : null),
    [foreground, transform],
  )
  const exportBlocked = !foreground || (status === 'outside' && !allowOverflow)

  const setAsset = async (file: File, kind: AssetKind) => {
    const setError = kind === 'background' ? setBackgroundError : setForegroundError
    setError(null)
    try {
      const loaded = await loadAsset(file, kind)
      if (kind === 'background') {
        setBackground((current) => {
          releaseAsset(current)
          return loaded
        })
      } else {
        setForeground((current) => {
          releaseAsset(current)
          return loaded
        })
        setTransform(DEFAULT_TRANSFORM)
        setAllowOverflow(false)
      }
      if ((kind === 'background' && (loaded.width < 432 || loaded.height < 432)) ||
          (kind === 'foreground' && (loaded.width < 432 || loaded.height < 432))) {
        setError('Source is below 432 × 432 and may be upscaled in the largest output.')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The image could not be loaded.')
    }
  }

  const removeAsset = (kind: AssetKind) => {
    if (kind === 'background') {
      releaseAsset(background)
      setBackground(null)
      setBackgroundError(null)
    } else {
      releaseAsset(foreground)
      setForeground(null)
      setForegroundError(null)
      setTransform(DEFAULT_TRANSFORM)
      setAllowOverflow(false)
    }
  }

  const resetProject = () => {
    if ((background || foreground) && !window.confirm('Remove both assets and reset every edit?')) return
    releaseAsset(background)
    releaseAsset(foreground)
    if (exportResult) URL.revokeObjectURL(exportResult.url)
    setBackground(null)
    setForeground(null)
    setBackgroundError(null)
    setForegroundError(null)
    setTransform(DEFAULT_TRANSFORM)
    setBackgroundColor('#ff6b2b')
    setAllowOverflow(false)
    setExportResult(null)
    setExportError(null)
  }

  const startExport = async () => {
    if (!foreground || exportBlocked) return
    if (exportResult) URL.revokeObjectURL(exportResult.url)
    setExportResult(null)
    setExportError(null)
    setExporting(true)
    setExportProgress(0)
    try {
      const result = await generateUnityZip({
        background,
        foreground,
        backgroundColor,
        transform,
        projectName,
        onProgress: (progress, phase) => {
          setExportProgress(progress)
          setExportPhase(phase)
        },
      })
      setExportResult(result)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'ZIP generation failed.')
    } finally {
      setExporting(false)
    }
  }

  const updateOffset = (axis: 'offsetX' | 'offsetY', value: number) => {
    setTransform((current) => ({ ...current, [axis]: Math.max(-24, Math.min(24, value)) }))
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a href="#main" className="brand" aria-label="Adaptive Icon Generator home">
          <span className="brand-mark"><Crop aria-hidden="true" /></span>
          <span>
            <strong>Adaptive Icon</strong>
            <small>Generator</small>
          </span>
        </a>
        <div className="topbar-actions">
          <span className="preset-pill"><Layers3 aria-hidden="true" /> Unity Adaptive</span>
          <div className="theme-control" aria-label="Color theme">
            {([
              ['system', Monitor, 'System theme'],
              ['dark', Moon, 'Dark theme'],
              ['light', Sun, 'Light theme'],
            ] as const).map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                aria-label={label}
                aria-pressed={theme === value}
                onClick={() => setTheme(value)}
              >
                <Icon aria-hidden="true" />
              </button>
            ))}
          </div>
          <button className="icon-button" type="button" onClick={resetProject} title="Reset project">
            <RefreshCcw aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </header>

      <nav className="step-nav" aria-label="Generator steps">
        {[
          ['01', 'Assets', '#assets', Boolean(foreground)],
          ['02', 'Fit', '#fit', Boolean(foreground) && status !== 'outside'],
          ['03', 'Preview', '#preview', Boolean(foreground)],
          ['04', 'Export', '#export', Boolean(exportResult)],
        ].map(([step, label, href, complete]) => (
          <a
            key={step as string}
            href={href as string}
            className={[complete ? 'complete' : '', href === `#${activeStep}` ? 'current' : ''].filter(Boolean).join(' ')}
          >
            <span>{complete ? <Check aria-hidden="true" /> : step}</span>
            {label as string}
          </a>
        ))}
      </nav>

      <main id="main">
        <section className="workspace-section" aria-labelledby="assets">
          <SectionHeader id="assets" step="01" title="Assets" meta="Local processing · nothing uploaded" icon={Upload} />
          <div className="asset-grid">
            <AssetUploader
              kind="background"
              title="Background layer"
              description="PNG, JPEG, WebP, or SVG · optional with solid fill"
              asset={background}
              error={backgroundError}
              onFile={(file) => void setAsset(file, 'background')}
              onRemove={() => removeAsset('background')}
            />
            <AssetUploader
              kind="foreground"
              title="Foreground layer"
              description="Transparent PNG, WebP, or SVG · 432 px recommended"
              asset={foreground}
              error={foregroundError}
              onFile={(file) => void setAsset(file, 'foreground')}
              onRemove={() => removeAsset('foreground')}
            />
            <article className="color-card">
              <div>
                <span className="eyebrow"><Palette aria-hidden="true" /> Solid background</span>
                <p>{background ? 'Used beneath transparent background pixels.' : 'Active as the full background layer.'}</p>
              </div>
              <label className="color-input">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(event) => setBackgroundColor(event.target.value)}
                  aria-label="Solid background color"
                />
                <span>{backgroundColor.toUpperCase()}</span>
              </label>
            </article>
          </div>
        </section>

        <section className="workspace-section" aria-labelledby="fit">
          <SectionHeader
            id="fit"
            step="02"
            title="Fit & position"
            meta={foreground ? `${foreground.bounds.width} × ${foreground.bounds.height} px visible source` : 'Add a foreground to begin'}
            icon={SlidersHorizontal}
          />
          <div className="editor-grid">
            <aside className="tool-card transform-card">
              <div className="card-label-row">
                <span className="eyebrow"><Move aria-hidden="true" /> Transform</span>
                <button
                  className="mini-button"
                  type="button"
                  disabled={!foreground}
                  onClick={() => setTransform(DEFAULT_TRANSFORM)}
                >
                  <RotateCcw aria-hidden="true" /> Auto-fit
                </button>
              </div>

              <label className="range-field">
                <span><b>Artwork size</b><output>{transform.targetSize.toFixed(0)} dp</output></span>
                <input
                  type="range"
                  min="48"
                  max="72"
                  step="0.5"
                  value={transform.targetSize}
                  disabled={!foreground}
                  onChange={(event) => setTransform((current) => ({ ...current, targetSize: Number(event.target.value) }))}
                />
                <small>60 dp recommended · 66 dp strict maximum</small>
              </label>

              <div className="number-pair">
                <label>
                  <span>X offset</span>
                  <div><input type="number" min="-24" max="24" step="0.5" value={transform.offsetX} disabled={!foreground} onChange={(event) => updateOffset('offsetX', Number(event.target.value))} /><em>dp</em></div>
                </label>
                <label>
                  <span>Y offset</span>
                  <div><input type="number" min="-24" max="24" step="0.5" value={transform.offsetY} disabled={!foreground} onChange={(event) => updateOffset('offsetY', Number(event.target.value))} /><em>dp</em></div>
                </label>
              </div>

              <div className="measurement-list">
                <div><span>Visible width</span><strong>{geometry ? geometry.visibleWidth.toFixed(1) : '—'} dp</strong></div>
                <div><span>Visible height</span><strong>{geometry ? geometry.visibleHeight.toFixed(1) : '—'} dp</strong></div>
                <div><span>Safe zone</span><strong>66 × 66 dp</strong></div>
              </div>
            </aside>

            <div className="canvas-card">
              <div className="canvas-toolbar">
                <span className="eyebrow"><Crop aria-hidden="true" /> 108 × 108 layer canvas</span>
                <label className="switch-label">
                  <input type="checkbox" checked={guides} onChange={(event) => setGuides(event.target.checked)} />
                  <span aria-hidden="true" />
                  Guides
                </label>
              </div>
              <div
                className={`canvas-stage ${foreground ? 'is-draggable' : ''} ${isDragging ? 'is-active-drag' : ''}`}
                tabIndex={foreground ? 0 : -1}
                aria-label="Icon editor. Drag the artwork or use arrow keys to change its position."
                onPointerDown={(event) => {
                  if (!foreground) return
                  event.currentTarget.setPointerCapture(event.pointerId)
                  dragRef.current = { x: event.clientX, y: event.clientY, offsetX: transform.offsetX, offsetY: transform.offsetY }
                  setIsDragging(true)
                }}
                onPointerMove={(event) => {
                  if (!dragRef.current) return
                  const ratio = 108 / event.currentTarget.getBoundingClientRect().width
                  updateOffset('offsetX', dragRef.current.offsetX + (event.clientX - dragRef.current.x) * ratio)
                  updateOffset('offsetY', dragRef.current.offsetY + (event.clientY - dragRef.current.y) * ratio)
                }}
                onPointerUp={() => { dragRef.current = null; setIsDragging(false) }}
                onPointerCancel={() => { dragRef.current = null; setIsDragging(false) }}
                onKeyDown={(event) => {
                  if (!foreground || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
                  event.preventDefault()
                  const amount = event.shiftKey ? 1 : 0.5
                  if (event.key === 'ArrowLeft') updateOffset('offsetX', transform.offsetX - amount)
                  if (event.key === 'ArrowRight') updateOffset('offsetX', transform.offsetX + amount)
                  if (event.key === 'ArrowUp') updateOffset('offsetY', transform.offsetY - amount)
                  if (event.key === 'ArrowDown') updateOffset('offsetY', transform.offsetY + amount)
                }}
              >
                <IconCanvas
                  background={background}
                  foreground={foreground}
                  backgroundColor={backgroundColor}
                  transform={transform}
                  guides={guides}
                  size={648}
                  className="main-canvas"
                  label="Adaptive icon layer canvas with safe-zone guides"
                />
                {!foreground && (
                  <div className="canvas-empty">
                    <Layers3 aria-hidden="true" />
                    <strong>Foreground needed</strong>
                    <span>Upload transparent artwork in step 01.</span>
                  </div>
                )}
              </div>
              <div className="guide-legend" aria-label="Guide legend">
                <span className="viewport">72 dp viewport</span>
                <span className="safe">66 dp safe zone</span>
                <span className="minimum">48 dp minimum</span>
                <span className="bounds">Visible bounds</span>
              </div>
            </div>

            <aside className="tool-card validation-card">
              <div className="card-label-row">
                <span className="eyebrow"><ShieldCheck aria-hidden="true" /> Validation</span>
                <span key={foreground ? status : 'neutral'} className={`status-pill ${foreground ? status : 'neutral'}`}>{foreground ? status : 'waiting'}</span>
              </div>
              <StatusAnnotation status={status} hasForeground={Boolean(foreground)} />
              <ul className="check-list">
                <li className={foreground ? 'pass' : ''}><CheckCircle2 aria-hidden="true" /> Transparent foreground</li>
                <li className={status !== 'outside' && foreground ? 'pass' : ''}><CheckCircle2 aria-hidden="true" /> Safe-zone containment</li>
                <li className={background || backgroundColor ? 'pass' : ''}><CheckCircle2 aria-hidden="true" /> Full-bleed background</li>
                <li className={foreground && foreground.width >= 432 && foreground.height >= 432 ? 'pass' : ''}><CheckCircle2 aria-hidden="true" /> 432 px source quality</li>
              </ul>
              {foreground?.isEdgeOpaque && (
                <div className="compact-warning"><AlertTriangle aria-hidden="true" /> Visible pixels touch every edge. Check for a baked background.</div>
              )}
              {status === 'outside' && foreground && (
                <label className="overflow-option">
                  <input type="checkbox" checked={allowOverflow} onChange={(event) => setAllowOverflow(event.target.checked)} />
                  <span><strong>Allow decorative overflow</strong><small>I understand launcher masks may crop this artwork.</small></span>
                </label>
              )}
            </aside>
          </div>
        </section>

        <section className="workspace-section" aria-labelledby="preview">
          <SectionHeader id="preview" step="03" title="Launcher preview" meta="Approximation · OEM masks vary" icon={Eye} />
          <div className="preview-layout">
            <article className="hero-preview-card">
              <div className="card-label-row">
                <span className="eyebrow"><Eye aria-hidden="true" /> Selected mask</span>
                <span key={activeMask} className="mask-name">{MASKS.find((mask) => mask.id === activeMask)?.label}</span>
              </div>
              <div className="device-preview">
                <IconCanvas background={background} foreground={foreground} backgroundColor={backgroundColor} transform={transform} mask={activeMask} size={320} label={`${activeMask} launcher preview`} />
              </div>
              <p>Preview only. The launcher applies its own final mask and motion effects.</p>
            </article>
            <div className="mask-grid" role="group" aria-label="Launcher mask previews">
              {MASKS.map((mask) => (
                <button
                  key={mask.id}
                  className={`mask-card ${activeMask === mask.id ? 'active' : ''}`}
                  type="button"
                  aria-pressed={activeMask === mask.id}
                  onClick={() => setActiveMask(mask.id)}
                >
                  <span className="mask-canvas-wrap">
                    <IconCanvas background={background} foreground={foreground} backgroundColor={backgroundColor} transform={transform} mask={mask.id} size={176} label={`${mask.label} mask`} />
                  </span>
                  <span>{mask.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="workspace-section export-section" aria-labelledby="export">
          <SectionHeader id="export" step="04" title="Export" meta="Unity Android · 6 densities · 12 PNG files" icon={FileArchive} />
          <article className="export-card">
            <div className="export-copy">
              <span className="eyebrow"><PackageCheck aria-hidden="true" /> Unity-ready package</span>
              <h3>Separate layers. Every density. One ZIP.</h3>
              <p>Generated locally from the normalized master with a manifest and Unity assignment guide.</p>
              <label className="project-name-field">
                <span>Project name</span>
                <input value={projectName} onChange={(event) => setProjectName(event.target.value)} maxLength={60} />
              </label>
            </div>
            <div className="export-inventory">
              <div><span>Adaptive PNGs</span><strong>12 files</strong></div>
              <div><span>Densities</span><strong>81—432 px</strong></div>
              <div><span>Documentation</span><strong>README + JSON</strong></div>
              <div><span>Privacy</span><strong>On-device</strong></div>
            </div>
            <div className="export-action-panel">
              {exporting ? (
                <div className="export-progress" role="status" aria-live="polite">
                  <div><span>{exportPhase}</span><strong>{exportProgress}%</strong></div>
                  <progress max="100" value={exportProgress} />
                </div>
              ) : exportResult ? (
                <div className="export-success">
                  <PackageCheck aria-hidden="true" />
                  <div><strong>Package ready</strong><span>{exportResult.fileName} · {formatBytes(exportResult.byteLength)}</span></div>
                  <a className="button primary" href={exportResult.url} download={exportResult.fileName}>
                    <ArrowDownToLine aria-hidden="true" /> Download ZIP
                  </a>
                </div>
              ) : (
                <button className="button primary export-button" type="button" disabled={exportBlocked} onClick={() => void startExport()}>
                  <FileArchive aria-hidden="true" /> Generate Unity ZIP
                </button>
              )}
              {exportBlocked && <p className="export-hint">{!foreground ? 'Upload a foreground to enable export.' : 'Resolve the safe-zone error or confirm decorative overflow.'}</p>}
              {exportError && <p className="field-error" role="alert"><AlertTriangle aria-hidden="true" />{exportError}</p>}
              {exportResult && (
                <button className="text-action" type="button" onClick={() => { URL.revokeObjectURL(exportResult.url); setExportResult(null) }}>
                  <X aria-hidden="true" /> Clear package
                </button>
              )}
            </div>
          </article>
        </section>
      </main>

      <footer>
        <span>Adaptive Icon Generator · v0.1</span>
        <span><ShieldCheck aria-hidden="true" /> Your images stay in this browser</span>
      </footer>
    </div>
  )
}

export default App
