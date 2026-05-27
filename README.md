# beautiful-mermaid → clean SVG / vector PDF

Render [Mermaid](https://mermaid.js.org/) diagrams to **clean, BiDi-aware SVG** and
export **tagged, selectable vector PDFs** — fully offline, in one self-contained
HTML file. The interface is Arabic (RTL) and handles mixed RTL/LTR diagrams.

**Live:** https://x7md-lab.github.io/beautiful-mermaid/

## What it does

- Renders Mermaid via `beautiful-mermaid`, then cleans the SVG (inlines CSS custom
  properties, hoists styles to presentation attributes, prettifies).
- **BiDi** (UAX #9 via `@chenglou/pretext`): right-aligns RTL section labels and
  keeps one paragraph direction across multi-line labels.
- **PDF export** (PDF 1.7): HarfBuzz shapes every run to vector glyph paths
  (correct Arabic shaping + visual order), `svg-to-pdfkit` emits them into PDFKit,
  the page is auto-sized to the diagram + padding, and a **tagged structure tree**
  with logical-order `ActualText` makes the text selectable/searchable.
- Editor with Mermaid highlighting + a read-only, formatted, XML-highlighted SVG
  view (CodeMirror 6).

## App (`app/`)

Preact + Vite + Tailwind v4 + Base UI, bundled to a single HTML via
`vite-plugin-singlefile`. HarfBuzz wasm and the Vazirmatn font are inlined — no CDN.

```bash
cd app
npm install
npm run dev      # local dev
npm run build    # → app/dist/index.html (single file)
```

See [`app/README.md`](app/README.md) for architecture details.

## Deployment

`.github/workflows/deploy.yml` builds `app/` and publishes `app/dist` to GitHub
Pages on every push to `main`. Enable it once under **Settings → Pages → Source:
GitHub Actions**.

## Repo layout

| Path | What |
|------|------|
| `app/` | the Preact single-file app (the product) |
| `index.html` | the original standalone prototype |
| `src/plugins/` | reusable extractions (`pretext-bidi.js`, `svg-to-pdfmake-rtl.js`) |
| `research/` | SVG→PDF reverse-engineering notes |
