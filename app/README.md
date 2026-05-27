# Mermaid → Clean SVG (Preact, single-file)

A clean rewrite of the prototype as a Preact + Vite app that **builds to one
self-contained HTML file** — every script, style, font, and the HarfBuzz wasm is
inlined, so the output runs offline by double-clicking it. No CDN.

## Commands

```bash
npm install
npm run dev      # local dev server
npm run build    # → dist/index.html (single file, ~5 MB)
npm run preview  # serve the built file
```

## What it does

1. **Render** Mermaid source to SVG via `beautiful-mermaid`.
2. **Clean** the SVG (`lib/clean-svg.js`): inline CSS custom properties
   (`var()`/`color-mix()`), hoist inline styles to presentation attributes, drop
   `<style>`, prettify — and make it BiDi-aware:
   - RTL block-graph **section labels** are right-aligned within their header.
   - Multi-line labels share **one paragraph direction** so a Latin-led line
     (e.g. `kpi_overall_by_dept لقسمه`) doesn't flip against its Arabic siblings.
3. **Preview / copy / save SVG**.
4. **Export PDF** (`lib/pdf.js`) via a low-level vector pipeline (no pdfmake).

## BiDi

`lib/bidi.js` wraps `@chenglou/pretext` (UAX #9 levels, forked from pdf.js):

- `baseDirection(text)` — paragraph base direction.
- `visualRuns(text, forceBase?)` — split mixed text into visual-order directional
  runs (rule L2); `forceBase` pins one direction for all lines of a label.

## PDF pipeline (fully offline, PDF 1.7, selectable text)

`cleaned SVG → HarfBuzz shapes every text run to vector glyph paths → svg-to-pdfkit
emits PostScript path operators into a PDFKit doc → an invisible real-text layer
is overlaid for selection → page auto-sized to the SVG bounds + padding → Blob.`

- **`lib/harfbuzz-shape.js`** — bundler-agnostic, unit-testable shaping. Replaces
  each `<text>` element (in its parent — *not* nested inside, which svg-to-pdfkit
  would ignore) with a `<g>` of glyph `<path>`s. Uses each font's real
  units-per-em (Vazirmatn is 2048, not 1000) so glyphs aren't oversized; folds the
  `<text>` baseline `dy` in and accumulates `<tspan>` `dy` for multi-line
  baselines; honours `text-anchor` mapped through the base direction. Also returns
  per-line metadata (logical text + visual box) for the selectable overlay.
- **Selectable text** (`lib/pdf.js`) — the glyph outlines are the *visible* layer;
  on top, an **invisible** real-text layer (PDF text render mode `3 Tr`) with the
  embedded Vazirmatn font + ToUnicode makes the diagram selectable/searchable while
  staying pixel-perfect. PDFKit has no RTL/bidi (it lays text out logical-left-to-
  right), so it can't be trusted to *position* anything — the visible glyphs come
  from HarfBuzz's visual layout. So the shaper (`harfbuzz-shape.js`) hands pdf.js
  each **word's exact visual box** `{text, x, width, logicalStart}` (unioned from
  its glyphs' positions via HarfBuzz clusters), and pdf.js:
  - places each word's invisible text at the box's `x` and horizontally scales it
    (`Tz`) so its width equals the box width — the selection highlight then sits
    exactly over the visible glyphs, regardless of PDFKit's internal glyph order;
  - emits words in **logical** order (content-stream order = copy order); a whole
    word is one run, so letters stay intact (no extractor-inserted spaces);
  - wraps each line in `/Span <</ActualText …>>` (logical Unicode) for viewers that
    use it directly (Chrome/pdfium, Acrobat).

  Output is `%PDF-1.7` via PDFKit's `pdfVersion` option.
- **`lib/harfbuzz.js`** — browser wiring. Inlines the HarfBuzz wasm via Vite
  `?init` (`harfbuzzjs@0.3.6`, raw-instance API, 0 wasm imports) and the Vazirmatn
  fonts as data URIs.
- **`lib/pdf.js`** — vendored PDFKit standalone is imported `?raw` and run once as
  a classic script (sets `window.PDFDocument`); `svg-to-pdfkit` is bundled.

### Vendored / bundled assets (`src/vendor`, `src/assets`)

| file | source | why vendored |
|------|--------|--------------|
| `hbjs.js` | harfbuzzjs@0.3.6 (ESM-adapted) | raw-instance HarfBuzz wrapper |
| `hb.wasm` | harfbuzzjs@0.3.6 | inlined via `?init` |
| `pdfkit.standalone.js` | pdfkit@0.15.0 | prebuilt browser PDFKit, run as `?raw` |
| `Vazirmatn-{Regular,Bold}.ttf` | rastikerdar/vazirmatn | HarfBuzz shaping + preview `@font-face` |

The npm `harfbuzzjs@1.2.0` ships a redesigned API and the github.io CDN files
404, so the classic 0.3.6 raw-instance build is vendored instead.

## Build config

`vite.config.js` uses `vite-plugin-singlefile` (inlines JS+CSS), `@tailwindcss/vite`
(Tailwind v4, no config file), `@preact/preset-vite`, and a huge
`assetsInlineLimit` so the wasm and fonts inline as data URIs rather than emitting
sidecar files.
