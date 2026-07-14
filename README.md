# NuttyTools: Adaptive Icon Generator

A local-first browser tool for fitting, validating, previewing, and exporting Android adaptive icons for Unity.

## Current MVP

- Background image or solid-color layer
- Transparent PNG, WebP, or sanitized SVG foreground
- Alpha-bound detection and recommended `60/108` auto-fit
- `66 × 66 dp` safe-zone validation
- Direct drag, keyboard positioning, scale, and numeric offsets
- Circle, squircle, rounded-square, square, teardrop, and unmasked previews
- Warm dark and cream light themes
- Unity ZIP export containing six density pairs, a manifest, checksums, and assignment instructions
- All image processing remains in the browser

## Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4173`.

## Verification

```bash
npm test
npm run build
```

The full product specification is in [AdaptiveIconGeneratorRequirements.md](AdaptiveIconGeneratorRequirements.md).
