# Adaptive Icon Generator — Product, UX, and Technical Requirements

> Status: implementation-ready MVP specification  
> Visual reference: [`DESIGN_VARIATIONS.html`](DESIGN_VARIATIONS.html)  
> Primary platform: responsive browser application  
> Primary export target: Unity Android adaptive icons

## 1. Purpose

Build a browser-based tool that accepts one background asset and one transparent foreground asset, validates them against Android adaptive-icon rules, previews the result under common launcher masks, generates all required density variants, and downloads a Unity-compatible ZIP.

The tool should prevent the problem encountered in Nekodoku: a foreground that fills most of its canvas and therefore appears enlarged or clipped on physical Android launchers.

## 2. Product goals

- Make correct adaptive icons without requiring Android Studio or image-editing knowledge.
- Make foreground negative space visible, measurable, and easy to correct.
- Generate deterministic Android density variants from one high-resolution source.
- Produce files that can be assigned directly in Unity Android Player Settings.
- Preview several launcher masks before export.
- Perform processing locally in the browser by default so uploaded artwork is not retained.

## 3. Non-goals for the first release

- AI image generation or automatic background removal.
- Editing complex SVG paths.
- Publishing directly to Google Play.
- Modifying a Unity project remotely.
- Guaranteeing pixel-identical rendering on every OEM launcher; Android launchers control their final mask and animation.

## 4. Android design rules

Android adaptive icons contain independent background and foreground layers.

- Each layer uses a logical `108 × 108 dp` canvas.
- The system reserves the outer `18 dp` on each side for masking and visual effects.
- The inner `72 × 72 dp` is the normal masked viewport.
- Important logo artwork should remain inside the centered `66 × 66 dp` safe zone.
- Google recommends logo artwork between `48 × 48 dp` and `66 × 66 dp`.
- The background must cover the complete canvas.
- The foreground must not contain a baked circular, squircle, or rounded-square mask.
- A monochrome layer is optional and supports themed icons on compatible Android launchers.

The `66/108` safe-zone ratio is approximately `61.11%` of the full canvas. The website should use a slightly smaller default target of `60/108`, or `55.56%`, to give the artwork comfortable negative space.

Official references:

- [Android adaptive-icon design guidance](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive)
- [Android AdaptiveIconDrawable reference](https://developer.android.com/reference/android/graphics/drawable/AdaptiveIconDrawable)
- [Android Studio app-icon generator](https://developer.android.com/studio/write/create-app-icons)
- [Unity Android Player Settings](https://docs.unity3d.com/Manual/class-PlayerSettingsAndroid.html)
- [Unity PlayerSettings.SetPlatformIcons API](https://docs.unity3d.com/ScriptReference/PlayerSettings.SetPlatformIcons.html)

## 5. Recommended user workflow

1. The user opens the generator and chooses the **Unity Adaptive Icon** preset.
2. The user uploads a background image or selects a solid background color.
3. The user uploads a transparent foreground PNG, WebP, or SVG.
4. The tool detects the visible foreground bounds using alpha values.
5. The tool automatically scales and centers the foreground within a `60 × 60` target area on the logical `108 × 108` canvas.
6. The editor displays the `66 × 66` guaranteed safe zone and the larger system-effect area.
7. The user can adjust scale and position while viewing circle, squircle, rounded-square, and other mask previews.
8. The validator reports whether all visible foreground pixels remain inside the safe zone.
9. The user chooses which export groups to include.
10. The browser generates a ZIP containing Unity-ready assets, a manifest, and assignment instructions.

## 6. Product experience and visual design

### 6.1 Design direction

The interface should adapt the visual language in `DESIGN_VARIATIONS.html` to a focused production tool. It should feel technical, tactile, and warm without resembling a generic dashboard.

The chosen direction combines the strongest parts of the reference variations:

- Use **Variation F — Sectioned Pill Labels** for numbered workflow sections and their headings.
- Use **Variation E — Floating Cards** for upload panels, the central editor, preview tiles, and export summaries.
- Use **Variation H — Annotation Bubbles** for validation messages, contextual help, and safe-zone status.
- Use the left accent border from **Variation G — Chunky Blocks** only for selected panels, warnings, and the current step.
- Do not use hover-driven panel expansion for required controls. Hover may add emphasis, but every control and detail must remain available by keyboard, touch, and click.
- Do not copy the reference page's media/status content or decorative equalizer animation; reuse its system of surfaces, labels, color, and hierarchy.

The product personality should be:

- **Precise:** dimensions, safe bounds, and export consequences are always visible.
- **Calm:** the canvas remains the focal point; decoration never competes with the artwork.
- **Tactile:** outlined cards, small offset shadows, and compact pills create depth.
- **Reassuring:** validation explains how to fix an issue instead of only reporting failure.

### 6.2 Information architecture

The application is one continuous workspace with four numbered sections:

1. **Assets** — background, foreground, and optional monochrome inputs.
2. **Fit & Position** — canvas editor, safe-zone controls, scale, and offsets.
3. **Launcher Preview** — mask gallery, theme preview, and parallax simulation.
4. **Export** — preset, output groups, validation summary, and ZIP generation.

The desktop experience should use this hierarchy:

- A compact top bar containing the product wordmark, current preset, theme control, help, and reset action.
- A section-pill progress row that links to all four workspace sections and shows complete, current, warning, and pending states.
- A primary editing area with asset controls on the left, the largest possible canvas in the center, and transform/validation controls on the right.
- A launcher-mask preview gallery below the editor.
- An export card at the end of the workflow with the primary download action.

The user must be able to complete the common path from top to bottom without opening a modal. Modals are reserved for destructive confirmation, advanced overflow confirmation, and detailed help.

### 6.3 Component requirements

#### Top bar

- Display a DotGothic-style wordmark: **Adaptive Icon Generator**.
- Show the active preset as a compact pill, defaulting to **Unity Adaptive**.
- Provide theme choices for **System**, **Dark**, and **Light**.
- Keep **Reset project** visually secondary and require confirmation if assets or manual edits exist.
- On small screens, retain the product name and export access; less-used actions may move into an overflow menu.

#### Workflow section headers

- Use a small uppercase pill with a Lucide icon and two-digit step number, such as `01 · ASSETS`.
- Extend a thin divider from the pill to optional right-aligned metadata or status.
- Use the orange accent for the current step, neutral styling for pending steps, teal or success styling for completed steps, and an error treatment for blocked steps.
- Section headers must be real headings and navigation targets, not purely decorative labels.

#### Floating cards and fields

- Use warm panel surfaces, a `1–1.5 px` visible border, `8–12 px` corner radii, and a small offset shadow inspired by Variation E.
- Use `14–20 px` internal padding and `10–16 px` gaps; the canvas card may use more breathing room.
- Selected or high-priority cards may receive a `3 px` left accent border.
- Avoid deeply nesting more than two bordered card levels.
- Hover may slightly strengthen the border and shadow but must not move controls or change layout dimensions.

#### Upload cards

- Provide separate, clearly labeled Background and Foreground cards.
- Each empty card is a drag-and-drop target with a browse action, format hint, and layer icon.
- A populated card shows a checkerboard thumbnail where transparency is relevant, filename, source dimensions, file type, replace, and remove actions.
- The entire drop target must have a visible drag-over state. Uploading one layer must not replace another.
- The optional Monochrome card is collapsed by default but remains discoverable in the Assets section.

#### Canvas editor

- Make the editing canvas the most visually prominent card.
- Use a checkerboard only behind transparent regions; do not apply it to the entire application.
- Provide direct manipulation for pan/position and a clearly labeled scale control.
- Place reset-to-recommended, zoom, guide visibility, and fit actions next to the canvas.
- Show the logical `108 × 108` boundary, `72 × 72` viewport, `66 × 66` safe zone, optional `48 × 48` guide, and detected alpha bounds with distinguishable line styles as well as colors.
- Keep editor zoom independent from export scale.
- Show numeric width, height, scale, and X/Y offsets in the adjacent inspector and update them during manipulation.

#### Validation annotations

- Present the overall status in an annotation bubble next to the editor: **Safe**, **Near limit**, or **Outside safe zone**.
- Use an icon, heading, and short corrective sentence; never communicate status by color alone.
- Use warm orange for caution, red for a blocking error, teal/green for safe output, and neutral styling for information.
- Allow the user to focus or click an annotation to highlight the related control or guide.
- Keep blocking errors visible until fixed. Informational notices may be dismissible for the current session.

#### Preview tiles

- Render each launcher mask in its own floating card with a label and consistent preview size.
- The active preview receives an accent border and controls the larger device-sized preview.
- A tile may use a subtle hover lift, but selection must use click/tap and be reflected with `aria-pressed` or an equivalent state.
- Include a full-layer tile so users can distinguish launcher masking from source cropping.

#### Export card

- List selected output groups, file counts, estimated ZIP size, and validation state before download.
- Use compact pills or checkboxes for Adaptive, Legacy, Round, Monochrome, and Android Native groups.
- The primary action label is **Generate Unity ZIP** for the default preset.
- While exporting, replace the action with determinate progress where possible and prevent duplicate jobs.
- On success, show the ZIP name, size, generation time, and a single **Download ZIP** action.

### 6.4 Theme and color tokens

Both reference themes are required. The default is the operating-system preference, with a persisted user override. Theme switching must not reset assets, transforms, validation, or scroll position.

| Role | Dark theme | Light theme | Usage |
|---|---|---|---|
| Page | `#0e0c09` | `#e2d9c8` | Browser background |
| Workspace | `#13100c` | `#d8cfbc` | Grouped section background |
| Panel | `#1e1a14` | `#f5f0e6` | Cards and primary controls |
| Raised panel | `#252018` | `#faf6f0` | Selected or nested surface |
| Border | `#7a6a52` | `#7a6a52` | Card and input outlines |
| Offset shadow | `#070604` | `#a89878` | Tactile card shadow |
| Primary text | `#e8dfc8` | `#1c1810` | Headings and values |
| Secondary text | `#b8aa92` | `#665845` | Labels and help text |
| Orange accent | `#ff6b2b` | `#b94310` | Current step and primary action |
| Teal accent | `#21c0d2` | `#006f80` | Measurements and safe status |
| Success | `#67c77e` | `#216b35` | Passed validation |
| Error | `#ff7373` | `#a32828` | Blocking validation |

These values are starting tokens, not permission to use low-contrast text. Text, icons, focus rings, guides, and component states must meet the contrast requirements in section 14. If a token pairing fails, adjust the foreground token while preserving the warm dark/cream/orange/teal character.

### 6.5 Typography and iconography

- Use **DotGothic16** for the wordmark, major section labels, compact uppercase field labels, and prominent numeric measurements.
- Use **JetBrains Mono** for body text, buttons, form controls, metadata, dimensions, and code-like values.
- Provide local or self-hosted font files for production; use `ui-monospace`, `SFMono-Regular`, `Consolas`, and `monospace` fallbacks.
- Body text must be at least `14 px`; helper text at least `12 px`; inputs and mobile controls at least `16 px` where needed to prevent browser zoom.
- Uppercase micro-labels may use `0.08–0.14 em` letter spacing. Do not apply wide tracking to sentences or error messages.
- Use Lucide outline icons at `16–20 px` with a consistent `1.75–2 px` stroke.
- Icons supplement text labels; an icon alone requires an accessible name and tooltip where its meaning is not universal.

### 6.6 Motion and interaction feedback

- Use `150–250 ms` transitions for hover, focus, selection, and theme changes.
- Small offset shadows may deepen on hover or selection without shifting surrounding layout.
- Safe-zone changes and transform edits may animate only when the animation does not hide the final geometry.
- Parallax preview animation is opt-in and pauses when the page is hidden.
- Respect `prefers-reduced-motion`: disable parallax, pulsing status dots, animated scrolling, and nonessential transforms.
- Never use continuous decorative animation in the editing workspace.

### 6.7 Responsive behavior

- **Large desktop (`≥ 1280 px`):** use a three-column editor with asset rail, central canvas, and inspector; display all mask previews in one gallery.
- **Tablet/small desktop (`768–1279 px`):** keep the canvas full-width and place assets and inspector in a two-column row above or below it.
- **Mobile (`< 768 px`):** use one column, a device-sized primary preview, horizontally scrollable mask choices, and a sticky bottom action for the next valid step or export.
- Do not hide validation, numeric transforms, or safe-zone controls on mobile; group them into native disclosure sections when space is limited.
- Minimum interactive target size is `44 × 44 px` on touch layouts.
- No required content may overflow horizontally at `320 px` CSS viewport width.

### 6.8 Empty, loading, success, and failure states

- The empty state explains the two required layers and makes both upload targets immediately visible.
- Image decoding shows progress in the affected card without blocking unrelated controls.
- Failed decoding preserves the other layer and provides a retry/replace action.
- Export progress reports the current phase: validating, rendering, packaging, or finalizing.
- If export fails, preserve all user inputs and settings and offer retry.
- Reset returns to the empty state only after confirmation; theme and reduced-motion preferences remain unchanged.

## 7. Input requirements

### 7.1 Background input

Supported inputs:

- PNG
- JPEG
- WebP
- SVG, after safe browser rasterization
- Solid color selected in the website

Validation:

- Minimum recommended raster size: `432 × 432` pixels.
- Warn before upscaling a smaller source.
- Accept non-square images, but require the user to confirm a center crop or reposition the crop.
- The final background must be opaque.
- If the source contains transparency, flatten it against a user-selected fallback color and show a warning.

Generation behavior:

- Scale using **cover**, not contain, so every output is completely filled.
- Preserve the chosen focal point across all density sizes.
- Do not add rounded corners or an icon mask.
- Export lossless PNG by default. JPEG can be an optional size-saving choice only for fully opaque photographic backgrounds.

### 7.2 Foreground input

Supported inputs:

- Transparent PNG
- Transparent WebP
- SVG with transparency

Validation:

- Minimum recommended raster size: `432 × 432` pixels.
- The foreground must contain transparency.
- Reject an entirely transparent image.
- Warn if all edge pixels are opaque because this usually indicates a flattened background.
- Warn if the asset already contains a circular or rounded-square background.
- Preserve aspect ratio during all transformations.

Generation behavior:

- Normalize the source onto a square transparent canvas.
- Detect the nontransparent content bounds.
- Uniformly scale the detected artwork to the selected logical target size.
- Center the artwork by its visible alpha bounds, not merely by the source canvas dimensions.
- Allow manual X/Y optical-position adjustments after geometric centering.
- Preserve transparent negative space in every exported foreground image.
- Never stretch width and height independently.

### 7.3 Optional monochrome input

- Accept a single-color transparent PNG, WebP, or SVG.
- Offer foreground-derived monochrome generation only as an assisted option.
- Clearly warn that automatic silhouette conversion can lose important internal details.
- Preview it using several theme colors.

## 8. Safe-zone detection and enforcement

### 8.1 Alpha-bound calculation

The website should calculate a bounding box around visible foreground pixels.

- Default visibility threshold: alpha greater than `8/255`.
- Provide an advanced threshold control for artwork with faint shadows.
- Ignore fully transparent pixels.
- Recalculate bounds after every scale or position change.
- Allow one output pixel of tolerance for resampling artifacts.

### 8.2 Auto-fit formula

Let:

- `C` be the logical canvas size, normally `108`.
- `B_w` and `B_h` be the detected foreground width and height.
- `T` be the selected target size, default `60` and maximum strict value `66`.

The uniform foreground scale is:

```text
scale = min(T / B_w, T / B_h)
```

After scaling, translate the visible bounding-box center to `(54, 54)`. Manual optical offsets are applied after this automatic centering.

### 8.3 Enforcement modes

The website should provide three modes:

1. **Safe Auto-Fit — default**
   - Automatically centers the foreground.
   - Uses a `60 × 60` target.
   - Guarantees all detected visible pixels remain inside `66 × 66`.

2. **Strict Maximum**
   - Allows enlargement up to `66 × 66`.
   - Prevents export while any detected visible pixel is outside the safe zone.

3. **Advanced / Decorative Overflow**
   - Allows pixels outside the safe zone.
   - Shows a persistent warning.
   - Requires explicit confirmation before export.

Strict enforcement should be the default because it prevents accidental clipping. An advanced override is still necessary because Android deliberately permits nonessential decorative artwork outside the safe zone for parallax and masking effects. The website cannot determine which pixels are semantically important, so it must not claim that a warning-only design is guaranteed safe.

### 8.4 Safe-zone UI

The editor must display:

- Full `108 × 108` layer boundary.
- Centered `72 × 72` masked viewport guide.
- Centered `66 × 66` guaranteed artwork safe zone.
- Optional `48 × 48` minimum recommended logo guide.
- Current detected bounds.
- Current logical artwork width and height.
- A status badge: **Safe**, **Near limit**, or **Outside safe zone**.

## 9. Preview requirements

The preview must composite the foreground and background without permanently merging the source layers.

Required masks:

- Circle
- Squircle
- Rounded square
- Square
- Teardrop or another asymmetric mask
- Full unmasked layer view

Required preview behaviors:

- Toggle safe-zone guides.
- Toggle light and dark launcher backgrounds.
- Zoom the preview without changing export scale.
- Simulate a small foreground parallax movement while keeping the mask stationary.
- Show all mask previews simultaneously on desktop.
- Provide a device-sized single preview on mobile.
- Preview the optional monochrome layer under multiple theme colors.

The previews are approximations; final launcher masks and effects vary by device manufacturer and launcher.

## 10. Unity-compatible output

### 10.1 Adaptive density sizes

The Unity preset should generate the sizes exposed by the current Nekodoku Unity Android Player Settings:

| Density | Layer canvas | Maximum `66/108` safe bounds | Recommended `60/108` bounds |
|---|---:|---:|---:|
| xxxhdpi | 432 × 432 | 264 × 264 | 240 × 240 |
| xxhdpi | 324 × 324 | 198 × 198 | 180 × 180 |
| xhdpi | 216 × 216 | 132 × 132 | 120 × 120 |
| hdpi | 162 × 162 | 99 × 99 | 90 × 90 |
| mdpi | 108 × 108 | 66 × 66 | 60 × 60 |
| ldpi | 81 × 81 | 49.5 × 49.5 | 45 × 45 |

Each density needs two separate files:

- `Background.png`: opaque and full bleed.
- `Foreground.png`: transparent and padded.

The generator should render every size from the original normalized master rather than repeatedly downscaling the previously generated size.

### 10.2 Optional Unity legacy and round icons

For complete Android fallback coverage, optionally generate composited Legacy and Round icons at:

- 192 × 192
- 144 × 144
- 96 × 96
- 72 × 72
- 48 × 48
- 36 × 36

Legacy and Round exports are flattened icons, not separate adaptive layers. They should be visually previewed separately because their padding and mask treatment differ from adaptive layers.

### 10.3 Unity assignment instructions

The generated README must instruct the user to open:

```text
Project Settings → Player → Android → Icon → Adaptive
```

For each size, the user assigns the matching background and foreground files. Legacy and Round outputs are assigned in their corresponding sections.

Unity compatibility requirements:

- Use standard PNG files that import as `Texture2D` assets.
- Foreground exports must retain RGBA transparency.
- Background exports must be opaque RGB/RGBA.
- Use sRGB color output.
- Do not include Unity `.meta` files because Unity should generate project-local GUIDs.
- Use deterministic names and dimensions.
- The ZIP manifest must state which file maps to each Unity slot.
- Do not rely on the ordering of serialized entries in `ProjectSettings.asset`.

### 10.4 Optional Unity installer

A later release may include an optional Unity Editor installer script. It must:

- Query supported slots using `PlayerSettings.GetPlatformIcons`.
- Use `AndroidPlatformIconKind.Adaptive`.
- Match slots by reported width and height rather than array position.
- Assign both foreground and background layers with `PlatformIcon.SetTextures`.
- Commit them using `PlayerSettings.SetPlatformIcons`.
- Never edit `ProjectSettings.asset` as raw YAML.
- Validate the layer order against each supported Unity version.
- Report missing or incorrectly sized files without partially modifying settings.

Manual assignment remains the compatibility baseline.

## 11. ZIP contents

Recommended ZIP structure:

```text
adaptive-icon-export/
├── README.md
├── manifest.json
├── source-preview.png
├── unity/
│   ├── adaptive/
│   │   ├── 432/
│   │   │   ├── Background.png
│   │   │   └── Foreground.png
│   │   ├── 324/
│   │   ├── 216/
│   │   ├── 162/
│   │   ├── 108/
│   │   └── 81/
│   ├── legacy/                 # Optional
│   ├── round/                  # Optional
│   └── monochrome/             # Optional
└── android-native/             # Optional preset
    └── res/
        ├── mipmap-ldpi/
        ├── mipmap-mdpi/
        ├── mipmap-hdpi/
        ├── mipmap-xhdpi/
        ├── mipmap-xxhdpi/
        ├── mipmap-xxxhdpi/
        └── mipmap-anydpi-v26/
            └── ic_launcher.xml
```

The ZIP filename should be sanitized and deterministic, for example:

```text
nekodoku-adaptive-icons-2026-07-13.zip
```

## 12. Manifest requirements

`manifest.json` should include:

```json
{
  "schemaVersion": 1,
  "preset": "unity-android-adaptive",
  "generatedAt": "ISO-8601 timestamp",
  "safeMode": "auto-fit",
  "logicalCanvas": 108,
  "safeZone": 66,
  "targetArtworkSize": 60,
  "foregroundOffset": { "x": 0, "y": 0 },
  "foregroundAlphaThreshold": 8,
  "outputs": []
}
```

Each output entry should record:

- Relative file path
- Width and height
- Layer type
- Density
- SHA-256 checksum
- Whether alpha is expected

## 13. Functional requirements

### Asset handling

- **FR-001:** Accept background and foreground files through browse and drag-and-drop.
- **FR-002:** Decode and process supported images without a server in the default mode.
- **FR-003:** Normalize EXIF orientation before cropping or measuring bounds.
- **FR-004:** Preserve source aspect ratio.
- **FR-005:** Reject corrupt, empty, or unsupported files with actionable errors.
- **FR-006:** Provide replace, reset, and remove controls for each layer.

### Editing

- **FR-010:** Auto-detect foreground alpha bounds.
- **FR-011:** Auto-fit and center the foreground inside the selected target bounds.
- **FR-012:** Allow foreground scale and X/Y position adjustment.
- **FR-013:** Allow background crop, scale, and focal-position adjustment.
- **FR-014:** Provide undo/reset-to-recommended behavior.
- **FR-015:** Display numeric scale, offset, logical artwork size, and safe status.

### Validation

- **FR-020:** Validate foreground transparency.
- **FR-021:** Validate background coverage and opacity.
- **FR-022:** Validate foreground safe-zone containment continuously.
- **FR-023:** Warn about source upscaling.
- **FR-024:** Warn about likely baked masks or edge-to-edge foregrounds.
- **FR-025:** Block strict-mode export when critical validation fails.
- **FR-026:** Require explicit confirmation for decorative overflow.
- **FR-027:** Revalidate every rasterized density output after resampling.

### Preview

- **FR-030:** Preview foreground and background as separate composited layers.
- **FR-031:** Preview at least circle, squircle, rounded-square, square, and asymmetric masks.
- **FR-032:** Show safe-zone and detected-bound overlays.
- **FR-033:** Simulate limited parallax movement.
- **FR-034:** Preview legacy, round, and monochrome outputs when enabled.

### Export

- **FR-040:** Generate all selected sizes from the normalized master.
- **FR-041:** Use high-quality, gamma-aware downsampling where supported.
- **FR-042:** Preserve transparent edges without dark or white halos.
- **FR-043:** Produce deterministic folder and file names.
- **FR-044:** Generate README and manifest files.
- **FR-045:** Generate a ZIP fully in the browser.
- **FR-046:** Display ZIP size and output inventory before download.
- **FR-047:** Prevent a double-click from starting duplicate export jobs.

### Experience and interface

- **FR-050:** Provide System, Dark, and Light theme choices using the tokens in section 6.4.
- **FR-051:** Persist the selected theme without resetting loaded assets, transforms, validation, or export choices.
- **FR-052:** Reflow the complete workflow at the large-desktop, tablet, and mobile breakpoints defined in section 6.7.
- **FR-053:** Pair every safe, caution, and error state with text and an icon in addition to color.
- **FR-054:** Disable nonessential animation and automatic parallax when reduced motion is requested.
- **FR-055:** Make every numbered workflow section a keyboard-reachable navigation target with a programmatically exposed status.
- **FR-056:** Support both direct canvas manipulation and precise keyboard-editable numeric transform fields.
- **FR-057:** Preserve the current step, validation summary, and next valid action when the layout changes across breakpoints.

## 14. Non-functional requirements

- **NFR-001 Privacy:** No source images leave the device in default mode.
- **NFR-002 Performance:** A normal 2048 × 2048 source pair should preview within two seconds on a current desktop browser.
- **NFR-003 Responsiveness:** Long resize/ZIP tasks should run in Web Workers where practical.
- **NFR-004 Browser support:** Current stable Chrome, Edge, Firefox, and Safari.
- **NFR-005 Mobile support:** Upload, preview, auto-fit, and export must work on current mobile browsers, with a simplified layout.
- **NFR-006 Accessibility:** Keyboard-operable controls, labeled inputs, visible focus states, and non-color-only validation indicators.
- **NFR-006a Contrast:** Normal text and essential icons must meet WCAG 2.2 AA contrast; large text must meet the applicable large-text threshold; focus indicators and meaningful guides must remain distinguishable in both themes.
- **NFR-006b Motion:** Respect `prefers-reduced-motion` and provide a manual parallax pause control.
- **NFR-007 Color:** Preserve sRGB consistently and strip unsupported embedded profiles only after conversion.
- **NFR-008 Security:** Sanitize SVG input, filenames, ZIP paths, and metadata.
- **NFR-009 Reliability:** Never emit a partial ZIP as a successful export.

## 15. Error messages

Errors should explain both the problem and the correction.

Examples:

- **Foreground has no transparency.** Upload a PNG/WebP with a transparent background.
- **Foreground is outside the safe zone.** Reduce it to the calculated safe scale shown above or choose Safe Auto-Fit.
- **Background does not cover the canvas.** Choose Fill Canvas or select a background color.
- **Source is too small.** A 432 × 432 or larger source is recommended to avoid upscaling.
- **Foreground appears to include a baked icon background.** Adaptive foregrounds should contain only artwork plus transparency.

## 16. Acceptance criteria

The MVP is complete when:

1. A user can upload one opaque background and one transparent foreground.
2. Oversized foreground artwork is detected immediately.
3. Safe Auto-Fit centers it within a `60/108` target area.
4. The validator confirms containment inside the `66/108` safe zone.
5. Circle, squircle, rounded-square, square, and asymmetric previews render correctly.
6. The website exports separate background and foreground PNGs at 432, 324, 216, 162, 108, and 81 pixels.
7. The ZIP includes mapping instructions and a machine-readable manifest.
8. The exported PNGs can be assigned to Unity Android Adaptive icon slots without manual resizing.
9. Foreground transparency survives export without halos.
10. Re-importing every output passes the same safe-zone and size validation.
11. The complete workflow works in both the warm dark and cream light themes without losing state.
12. At `320 px` viewport width, the user can upload, auto-fit, preview, validate, and export without horizontal page overflow.
13. All required actions work with keyboard-only navigation and have visible focus states.
14. Safe, caution, and blocked states are understandable without relying on color.
15. With reduced motion enabled, the application contains no automatic parallax, pulsing, or layout-transform animation.

## 17. Suggested implementation architecture

Frontend-only MVP:

- TypeScript
- React, Vue, Svelte, or another component framework
- Canvas 2D or WebGL for layer compositing and previews
- Web Workers with `OffscreenCanvas` where available for resizing
- A proven ZIP library such as JSZip or fflate
- Browser `createImageBitmap` for decoding where supported
- SVG sanitization before rasterization

Suggested modules:

- `ImageDecoder`
- `ForegroundBoundsAnalyzer`
- `SafeZoneValidator`
- `LayerTransformEditor`
- `MaskPreviewRenderer`
- `DensityExporter`
- `UnityPresetBuilder`
- `AndroidNativePresetBuilder`
- `ManifestBuilder`
- `ZipBuilder`

All validation and export calculations should share one normalized transform model so that the preview cannot disagree with the downloaded assets.

## 18. Future enhancements

- Direct Unity Editor installer package.
- Native Android `res/` export with XML and manifest snippets.
- Google Play 512 × 512 icon export.
- Automated Legacy and Round icon composition.
- Monochrome themed-icon generation and editing.
- Saved projects in IndexedDB.
- Shareable project files without embedding copyrighted artwork.
- Batch generation for multiple apps or icon variants.
- Visual comparison against screenshots from popular OEM launchers.
