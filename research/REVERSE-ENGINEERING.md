# SVG-to-PDF Reverse Engineering Notes

Reverse engineering of `research/SVG-to-PDFKit` and `research/svg2pdf.js` for integration with [pdfmake](https://github.com/bpampuch/pdfmake).

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  SVG (string or │────▶│  SVG-to-PDFKit   │────▶│  PDFKit     │
│  SVGElement)    │     │  SVGtoPDF()      │     │  (doc)      │
└─────────────────┘     └──────────────────┘     └─────────────┘
                                  │                         │
                                  │                         │
                         ┌────────▼────────┐
                         │ pdfmake        │
                         │ (uses PDFKit   │
                         │  internally)  │
                         └────────────────┘
```

## pdfmake: SVG-to-PDF Flow

1. **Document definition** — `{ content: [{ svg: string, width, height }] }` passed to `pdfMake.createPdf(dd)`.
2. **LayoutBuilder** — Measures SVG via `SVGMeasure.measureSVG()` (width, height, viewBox).
3. **Renderer** — Passes SVG to **SVG-to-PDFKit** for drawing. SVG string passed through unchanged.

### SVG-to-PDFKit Bidi

- **Reads `direction`** — Used for text-anchor (`startrtl`, `endrtl`, etc.).
- **No `unicode-bidi`** — Mixed Arabic/English not reordered; text rendered in logical order.

## SVG-to-PDFKit (research/SVG-to-PDFKit)

**API:** `SVGtoPDF(doc, svg, x, y, options)`

| Param   | Type              | Description                          |
|---------|-------------------|--------------------------------------|
| `doc`   | PDFDocument       | PDFKit document instance             |
| `svg`   | string \| SVGElement | SVG markup or DOM element         |
| `x, y`  | number            | Position in PDF (points)              |
| `options` | object          | See below                            |

**Options:**
- `width`, `height` — viewport size (default: page dimensions)
- `preserveAspectRatio` — SVG alignment
- `useCSS` — use computed styles (browser, SVGElement only)
- `fontCallback(family, bold, italic, fontOptions)` — custom font resolution
- `imageCallback(link)` — image resolution (Node.js)
- `documentCallback(file)` — external SVG documents
- `colorCallback(color)` — CMYK mapping
- `warningCallback(warning)` — warnings
- `assumePt` — treat units as PDF points
- `precision` — calculation precision (default: 3)

**Supported SVG features:**
- Shapes: rect, circle, path, ellipse, line, polyline, polygon
- Text: text, tspan, textPath
- Gradients, patterns, clip paths, masks, images, links
- Transform, viewBox, preserveAspectRatio

**Unsupported:** filters, foreignObject, vector-effect, font-variant, writing-mode, **unicode-bidi**

> **HarfBuzz integration:** For PDF export, the app uses **harfbuzzjs** exclusively for BiDi and shaping. HarfBuzz provides Unicode BiDi + contextual shaping (cursive joining). Shaped glyphs are converted to SVG paths and replace the original text nodes. Text that doesn't need shaping (pure LTR) is left as-is. No fallbacks—HarfBuzz is required.

## svg2pdf.js (research/svg2pdf.js)

**API:** `svg2pdf(element, pdf, options)` — uses **jsPDF**, not PDFKit.

- Different engine (jsPDF vs PDFKit)
- Not compatible with pdfmake-rtl (which uses PDFKit)
- Use SVG-to-PDFKit for pdfmake integration

## pdfmake Integration

pdfmake bundles SVG-to-PDFKit internally. It supports **SVG content** directly:

```javascript
const dd = {
  content: [{
    svg: '<svg xmlns="http://www.w3.org/2000/svg">...</svg>',
    width: 600,
    height: 400
  }],
  pageSize: { width: 600, height: 400 },
  pageMargins: 0
};
pdfMake.createPdf(dd).download('output.pdf');
```

**Font handling:** Customize `window.PDF_FONT_CONFIG` before export: add `fonts` (name + URLs for normal/bold) and `svgFontMap` (SVG font-family → pdfmake font name). Fonts are loaded on first PDF export.

## Plugin Hook-Up Strategy

1. **Direct use:** Pass `{ svg: string, width, height }` in pdfmake content — no plugin needed.
2. **Plugin wrapper:** `src/plugins/svg-to-pdfmake-rtl.js` provides `svgToPdfMakeContent()` and `svgToPdfMakeDoc()`.
3. **Font fallback:** Map SVG `font-family` to available pdfmake fonts (e.g. Vazirmatn → Cairo) when exporting.

## Implementation (index.html)

The app calls `applyBidiForPdf()` to reorder text, then `applyPdfFontMap()` using `PDF_FONT_CONFIG.svgFontMap`. Custom fonts from `PDF_FONT_CONFIG.fonts` are loaded on first export.
