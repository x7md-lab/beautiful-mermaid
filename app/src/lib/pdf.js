/**
 * Low-level vector SVG → PDF export (PDF 1.7), with selectable text.
 *
 * Pipeline:
 *   cleaned SVG
 *     → HarfBuzz shapes every text run to vector glyph paths (harfbuzz.js) —
 *       this is the *visible* layer: perfect Arabic shaping, BiDi order, sizing
 *     → svg-to-pdfkit emits PostScript path operators straight into a PDFKit doc
 *     → an *invisible* real-text layer (render mode 3) is overlaid per line using
 *       the embedded Vazirmatn font + ToUnicode, so the text is selectable and
 *       copyable while the vectors stay pixel-perfect (searchable-PDF technique)
 *     → page auto-sized to the SVG bounds + padding; downloaded as a Blob
 *
 * svg-to-pdfkit is bundled (pure, dependency-free). PDFKit's prebuilt standalone
 * (fontkit, zlib, stream polyfills all baked in) is vendored and inlined as a raw
 * string, then executed once as a classic script so it bundles fully offline — no
 * CDN. It's only parsed/run on the first PDF export.
 */
import SVGtoPDF from 'svg-to-pdfkit';
import pdfkitSource from '../vendor/pdfkit.standalone.js?raw';
import { shapeSvgTextToPaths, loadFontBytes, FONT_CONFIG } from './harfbuzz.js';
import { downloadBlob } from './download.js';

const PDF_FONT = 'VazirmatnEmbed';
const PDF_FONT_BOLD = 'VazirmatnEmbed-Bold';

let _PDFDocument = null;
// The vendored UMD assigns window.PDFDocument when run as a classic script.
function ensurePDFKit() {
  if (_PDFDocument) return _PDFDocument;
  if (!globalThis.PDFDocument) {
    const s = document.createElement('script');
    s.textContent = pdfkitSource;
    document.head.appendChild(s);
  }
  if (!globalThis.PDFDocument) throw new Error('PDFKit failed to initialise');
  _PDFDocument = globalThis.PDFDocument;
  return _PDFDocument;
}

// Intrinsic SVG size from width/height, falling back to the viewBox.
function getSvgSize(svgStr) {
  const head = svgStr.slice(0, svgStr.indexOf('>') + 1);
  const num = (re) => {
    const m = head.match(re);
    return m ? parseFloat(m[1]) : NaN;
  };
  let w = num(/\bwidth="([\d.]+)/);
  let h = num(/\bheight="([\d.]+)/);
  if (isNaN(w) || isNaN(h)) {
    const vb = head.match(/viewBox="([^"]+)"/);
    if (vb) {
      const p = vb[1].split(/[\s,]+/).map(Number);
      if (p.length === 4) {
        w = p[2];
        h = p[3];
      }
    }
  }
  if (isNaN(w) || isNaN(h)) return null;
  return { width: w, height: h };
}

function getSvgBackground(svgStr) {
  const head = svgStr.slice(0, svgStr.indexOf('>') + 1);
  const m = head.match(/background:\s*([^;"']+)/);
  return m ? m[1].trim() : '#FFFFFF';
}

/**
 * Render a cleaned SVG string to a downloaded PDF.
 * @param {string} cleanedSvg
 * @param {object} [opts]
 * @param {number} [opts.padding=24] page padding in points around the diagram
 * @param {string} [opts.filename='diagram']
 * @param {object} [opts.fontConfig]
 * @returns {Promise<{ width: number, height: number }>} the page size used
 */
export async function exportSvgToPdf(cleanedSvg, opts = {}) {
  const { padding = 24, filename = 'diagram', fontConfig = FONT_CONFIG } = opts;

  const PDFDocument = ensurePDFKit();
  const [{ svg: vectorSvg, lines }, fontBytes] = await Promise.all([
    shapeSvgTextToPaths(cleanedSvg, fontConfig),
    loadFontBytes(),
  ]);

  const size = getSvgSize(vectorSvg) || { width: 600, height: 400 };
  const pageW = size.width + padding * 2;
  const pageH = size.height + padding * 2;

  // Tagged PDF: a logical-order structure tree drives copy/reading order (Acrobat,
  // Chrome/Edge), decoupled from the visual glyph geometry. RTL doc → /Lang ar.
  const docLang = lines.some((l) => l.rtl) ? 'ar' : 'en';
  const doc = new PDFDocument({ size: [pageW, pageH], margin: 0, pdfVersion: '1.7', tagged: true, lang: docLang });
  doc.registerFont(PDF_FONT, fontBytes.normal);
  doc.registerFont(PDF_FONT_BOLD, fontBytes.bold);
  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', resolve);
    doc.on('error', reject);
  });

  // Paint the diagram background across the whole padded page.
  doc.save().rect(0, 0, pageW, pageH).fill(getSvgBackground(vectorSvg)).restore();

  // Visible layer: the SVG's vector glyph outlines (assumePt → 1 unit = 1pt).
  // These are paths (no text), so they carry nothing for copy/extraction.
  SVGtoPDF(doc, vectorSvg, padding, padding, {
    width: size.width,
    height: size.height,
    assumePt: true,
  });

  // Selectable layer: invisible real text, tagged in logical reading order.
  drawSelectableTextLayer(doc, lines, padding);

  doc.end();
  await finished;

  downloadBlob(new Blob(chunks, { type: 'application/pdf' }), `${filename}.pdf`);
  return { width: pageW, height: pageH };
}

// Build the invisible, selectable text layer as a tagged structure tree.
//
// PDFKit has no bidi (it lays text logical-left-to-right), so we never let it
// order anything. The shaper gives each line's characters in VISUAL order, each
// at its glyph's x; we draw one invisible glyph per cell there (render mode 3) so
// the selection highlight tracks the visible glyphs exactly. Reading/copy order
// comes from the structure tree instead: one /P element per line, in logical
// document order, each carrying /ActualText = the line's logical Unicode. A
// structure-aware reader (Acrobat, Chrome/Edge) copies that logical text; the
// glyph geometry only drives selection.
function drawSelectableTextLayer(doc, lines, padding) {
  if (!lines?.length) return;
  const root = doc.struct('Document');
  doc.addStructure(root);
  doc.save();
  doc.addContent('3 Tr'); // text render mode 3 = present but not painted
  for (const ln of lines) {
    if (!ln.cells || !ln.cells.length || !ln.text.trim()) continue;
    const fontName = ln.bold ? PDF_FONT_BOLD : PDF_FONT;
    doc.font(fontName).fontSize(ln.fontSize); // set before reading ascender
    // PDFKit's text y is the top of the em box; offset by the font ascent so the
    // baseline lands on ln.y (the same baseline the glyph outlines use).
    const ascRatio = (doc._font && doc._font.ascender ? doc._font.ascender : 900) / 1000;
    const topY = padding + ln.y - ascRatio * ln.fontSize;
    const p = doc.struct('P', { actual: ln.text, lang: ln.rtl ? 'ar' : 'en' }, () => {
      doc.font(fontName).fontSize(ln.fontSize);
      for (const c of ln.cells) {
        if (c.ch) doc.text(c.ch, padding + c.x, topY, { lineBreak: false });
      }
    });
    root.add(p);
  }
  doc.addContent('0 Tr');
  doc.restore();
  root.end();
}
