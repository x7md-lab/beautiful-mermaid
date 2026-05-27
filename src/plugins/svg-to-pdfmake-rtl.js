/**
 * SVG-to-PDF plugin for pdfmake
 *
 * Hook-up based on reverse engineering of:
 * - research/SVG-to-PDFKit (SVGtoPDF + PDFKit)
 * - pdfmake (uses PDFKit + bundled svg-to-pdfkit)
 *
 * pdfmake natively supports { svg, width, height } in content.
 * This plugin provides a convenience wrapper and font mapping.
 */

/**
 * Create a pdfmake content item for SVG.
 * @param {string|SVGElement} svg - SVG markup or DOM element
 * @param {Object} options
 * @param {number} [options.width] - Width in pt
 * @param {number} [options.height] - Height in pt
 * @param {string} [options.fontMap] - Map SVG font-family to pdfmake font (e.g. 'Vazirmatn' -> 'Roboto')
 * @returns {Object} pdfmake content item
 */
export function svgToPdfMakeContent(svg, options = {}) {
  let svgStr = typeof svg === 'string' ? svg : (svg?.outerHTML || svg?.toString?.() || '');
  const width = options.width ?? 600;
  const height = options.height ?? 400;

  // Optional: map custom fonts to pdfmake fonts (Roboto default)
  const fontMap = options.fontMap ?? { Vazirmatn: 'Roboto', 'Vazirmatn, system-ui': 'Roboto' };
  if (Object.keys(fontMap).length) {
    for (const [from, to] of Object.entries(fontMap)) {
      svgStr = svgStr.replace(
        new RegExp(`font-family:\\s*["']?${escapeRegex(from)}["']?`, 'gi'),
        `font-family: "${to}"`
      );
      svgStr = svgStr.replace(
        new RegExp(`font-family=["']${escapeRegex(from)}["']`, 'gi'),
        `font-family="${to}"`
      );
    }
  }

  return {
    svg: svgStr,
    width,
    height,
  };
}

/**
 * Create a full pdfmake document definition for a single SVG.
 * @param {string|SVGElement} svg
 * @param {Object} options
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @param {boolean} [options.rtl]
 * @param {Object} [options.fontMap]
 * @returns {Object} pdfmake document definition
 */
export function svgToPdfMakeDoc(svg, options = {}) {
  const width = options.width ?? 600;
  const height = options.height ?? 400;
  const content = svgToPdfMakeContent(svg, { width, height, fontMap: options.fontMap });

  return {
    rtl: options.rtl ?? false,
    pageSize: { width, height },
    pageMargins: 0,
    content: [content],
  };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
