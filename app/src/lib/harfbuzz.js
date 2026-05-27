/**
 * Browser wiring for the HarfBuzz shaper: bundles the wasm + fonts so PDF export
 * is fully offline (no CDN). The HarfBuzz wasm is inlined by Vite's `?init`
 * (harfbuzzjs@0.3.6's raw-instance build, 0 wasm imports) and the Vazirmatn fonts
 * as data URIs. The actual shaping lives in the bundler-agnostic harfbuzz-shape.js.
 */
import hbjs from '../vendor/hbjs.js';
import initHbWasm from '../assets/hb.wasm?init';
import vazirmatnRegular from '../assets/fonts/Vazirmatn-Regular.ttf?url';
import vazirmatnBold from '../assets/fonts/Vazirmatn-Bold.ttf?url';
import { shapeSvgToVectorPaths } from './harfbuzz-shape.js';

// Vazirmatn covers both Arabic and Latin, matching the cleaned SVG. The URLs
// resolve to inlined data URIs after build, so fetch() reads them with no network.
export const FONT_CONFIG = {
  fonts: [{ name: 'Vazirmatn', urls: { normal: vazirmatnRegular, bold: vazirmatnBold } }],
  svgFontMap: { Vazirmatn: 'Vazirmatn', 'Vazirmatn, system-ui': 'Vazirmatn' },
};

let _hb = null;
let _hbPromise = null;
const _hbFontCache = new Map();

export async function ensureHarfbuzz() {
  if (_hb) return _hb;
  if (!_hbPromise) {
    // ?init returns (imports?) => Promise<WebAssembly.Instance>; hb.wasm needs none.
    _hbPromise = initHbWasm().then((instance) => {
      _hb = hbjs(instance);
      return _hb;
    });
  }
  return _hbPromise;
}

async function getHbFont(fontUrl) {
  if (_hbFontCache.has(fontUrl)) return _hbFontCache.get(fontUrl);
  const hb = await ensureHarfbuzz();
  const buf = await fetch(fontUrl).then((r) => r.arrayBuffer());
  const blob = hb.createBlob(new Uint8Array(buf));
  const face = hb.createFace(blob, 0);
  const font = hb.createFont(face);
  // face.upem (units-per-em) is the font's design grid — Vazirmatn is 2048, not
  // the common 1000. The shaper scales glyph coords by fontSize / upem.
  const entry = { font, face, blob, upem: face.upem || 1000 };
  _hbFontCache.set(fontUrl, entry);
  return entry;
}

/**
 * Replace every text node in a cleaned SVG with vector glyph paths.
 * @param {string} svgStr
 * @param {object} [fontConfig]
 * @returns {Promise<{svg:string, lines:Array}>} vector SVG + per-line metadata
 */
export async function shapeSvgTextToPaths(svgStr, fontConfig = FONT_CONFIG) {
  const hb = await ensureHarfbuzz();
  return shapeSvgToVectorPaths(svgStr, { hb, getHbFont, fontConfig });
}

/** Raw font bytes (Uint8Array) for embedding in the PDF (selectable-text layer). */
export async function loadFontBytes() {
  const [normal, bold] = await Promise.all([
    fetch(vazirmatnRegular).then((r) => r.arrayBuffer()),
    fetch(vazirmatnBold).then((r) => r.arrayBuffer()),
  ]);
  return { normal: new Uint8Array(normal), bold: new Uint8Array(bold) };
}
