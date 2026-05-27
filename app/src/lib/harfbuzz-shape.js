/**
 * Pure SVG-text → vector-glyph-path shaping (no bundler/asset imports, so it is
 * unit-testable in plain Node). The HarfBuzz instance and a font loader are
 * injected by the caller (see harfbuzz.js for the browser wiring).
 *
 * Every <text>/<tspan> is replaced by a <g> of <path> glyph outlines: shaped by
 * HarfBuzz (contextual Arabic joining), ordered as visual BiDi runs (pretext),
 * and positioned per the element's text-anchor.
 */
import { fromXml } from 'xast-util-from-xml';
import { toXml } from 'xast-util-to-xml';
import { baseDirection, visualRuns } from './bidi.js';

// ─── inherited-attribute helpers ──────────────────────────────────────────────
function getNodeAttr(node, attr, def) {
  const v = node?.attributes?.[attr];
  return v != null ? String(v) : def;
}
function collectText(node) {
  if (!node?.children) return '';
  let text = '';
  for (const child of node.children) {
    if (child.type === 'text') text += child.value;
    else if (child.children) text += collectText(child);
  }
  return text;
}
function inheritedNumber(node, attr, fallback) {
  let n = node;
  while (n) {
    const v = parseFloat(getNodeAttr(n, attr, ''));
    if (!isNaN(v)) return v;
    n = n.parent?.type === 'element' ? n.parent : null;
  }
  return fallback;
}
function inheritedFontFamily(node) {
  let n = node;
  while (n) {
    const v = getNodeAttr(n, 'font-family', '');
    if (v) return v.split(',')[0].trim().replace(/^["']|["']$/g, '');
    n = n.parent?.type === 'element' ? n.parent : null;
  }
  return 'Vazirmatn';
}
function inheritedFontWeight(node) {
  let n = node;
  while (n) {
    const v = getNodeAttr(n, 'font-weight', '');
    if (v && /bold|600|700|800|900/i.test(v)) return true;
    n = n.parent?.type === 'element' ? n.parent : null;
  }
  return false;
}
function inheritedFill(node) {
  let n = node;
  while (n) {
    const v = getNodeAttr(n, 'fill', '') || getNodeAttr(n, 'color', '');
    if (v && v !== 'none') return v;
    n = n.parent?.type === 'element' ? n.parent : null;
  }
  return '#000000';
}
function setParentRefs(node, parent) {
  if (node.type === 'element') node.parent = parent;
  node.children?.forEach((c) => setParentRefs(c, node));
}

// ─── shape one uni-directional run → scaled glyph placements + advance ─────────
// Glyph coords/advances are in the font's design units (units-per-em). We scale
// by fontSize / upem — using the font's *real* upem (Vazirmatn is 2048, not the
// commonly-assumed 1000), otherwise glyphs come out ~2× too large.
function makeRunShaper(hb, getHbFont, resolveFontUrl) {
  return function shapeRun(text, fontSize, fontFamily, bold) {
    const url = resolveFontUrl(fontFamily, bold);
    if (!url) return Promise.resolve({ glyphs: [], advance: 0, scale: fontSize / 1000 });
    return getHbFont(url).then(({ font, upem }) => {
      const buffer = hb.createBuffer();
      buffer.addText(text);
      buffer.guessSegmentProperties(); // direction/script/language from content
      hb.shape(font, buffer);
      const glyphs = buffer.json();
      buffer.destroy();
      const scale = fontSize / (upem || 1000);
      const out = [];
      let x = 0;
      let y = 0;
      for (const g of glyphs || []) {
        const pathStr = font.glyphToPath(g.g);
        const dx = (g.dx || 0) * scale;
        const dy = (g.dy || 0) * scale;
        const adv = (g.ax || 0) * scale;
        // Keep every glyph (incl. spaces with no outline). `cl` is the cluster
        // (offset into the run's text); `adv`/`x` give the glyph's visual box,
        // used to place the selectable-text layer exactly over the glyphs.
        out.push({ d: pathStr && pathStr.length > 1 ? String(pathStr) : null, tx: x + dx, ty: -(y + dy), cl: g.cl, x, adv });
        x += adv;
        y += (g.ay || 0) * scale;
      }
      return { glyphs: out, advance: x, scale };
    });
  };
}

/**
 * @param {string} svgStr cleaned SVG
 * @param {object} deps
 * @param {object} deps.hb HarfBuzz instance (hbjs)
 * @param {(url:string)=>Promise<{font:any}>} deps.getHbFont resolves a font URL → hb font
 * @param {object} deps.fontConfig { fonts:[{name,urls:{normal,bold}}], svgFontMap }
 * @returns {Promise<{svg:string, lines:Array<{text,x,y,width,fontSize,bold}>}>}
 *   `svg` has all text replaced by <path> glyph outlines; `lines` is per-line
 *   metadata (logical text + visual box) for an invisible selectable-text overlay.
 */
export async function shapeSvgToVectorPaths(svgStr, { hb, getHbFont, fontConfig }) {
  if (!fontConfig?.fonts?.length) throw new Error('fontConfig.fonts is required for HarfBuzz shaping');

  let tree;
  try {
    tree = fromXml(svgStr);
  } catch (e) {
    throw new Error('Invalid SVG for PDF: ' + e.message);
  }
  setParentRefs(tree, null);

  const fontMap = fontConfig.svgFontMap ?? {};
  function resolveFontUrl(family, bold) {
    const fam = family.split(',')[0].trim().replace(/^["']|["']$/g, '');
    for (const f of fontConfig.fonts) {
      if (fam === f.name || fam === (fontMap[f.name] ?? f.name)) {
        const u = f.urls;
        return bold && u?.bold ? u.bold : u?.normal ?? u?.bold;
      }
    }
    const first = fontConfig.fonts[0]?.urls;
    return first ? (bold && first.bold ? first.bold : first.normal ?? first.bold) : null;
  }
  const shapeRun = makeRunShaper(hb, getHbFont, resolveFontUrl);
  const round = (n) => Math.round(n * 1000) / 1000; // point-space positions
  const round6 = (n) => Math.round(n * 1e6) / 1e6; // tiny em-scale factor needs more precision

  // Shape one line of text → glyph <path> nodes positioned at (originX, originY),
  // honouring text-anchor (mapped through the paragraph base direction).
  async function shapeLine(text, originX, originY, props, anchor, rtlBase) {
    const { fontSize, fontFamily, bold, fill } = props;
    let runs = null;
    try {
      runs = visualRuns(text, rtlBase ? 'rtl' : 'ltr');
    } catch {
      runs = null;
    }
    if (!runs) runs = [{ text, rtl: rtlBase }];

    const shaped = [];
    let totalW = 0;
    for (const run of runs) {
      const r = await shapeRun(run.text, fontSize, fontFamily, bold);
      shaped.push({ glyphs: r.glyphs, base: totalW, scale: r.scale, run });
      totalW += r.advance;
    }
    // text-anchor is logical; runs are laid out L→R, so map via the base
    // direction: for an RTL line "start" is the right edge, "end" the left.
    const anchorDx =
      anchor === 'middle' ? -totalW / 2 : anchor === 'end' ? (rtlBase ? 0 : -totalW) : rtlBase ? -totalW : 0;

    const paths = [];
    const cells = []; // { ch, x } in VISUAL (left→right) order for the text layer
    for (const rs of shaped) {
      const runX = originX + anchorDx + rs.base;
      // Visible glyph outlines.
      for (const gl of rs.glyphs) {
        if (!gl.d) continue; // no outline (e.g. space)
        const px = runX + gl.tx;
        const py = originY + gl.ty;
        paths.push({
          type: 'element',
          name: 'path',
          attributes: {
            d: gl.d,
            transform: `translate(${round(px)},${round(py)}) scale(${round6(rs.scale)},${round6(-rs.scale)})`,
            fill: fill || '#000000',
          },
          children: [],
        });
      }
      // Map each glyph cluster to its visual box, then emit one cell per source
      // character at its glyph's x, sorted by x → VISUAL order. Storing the
      // selectable text in visual order (the PDF convention for shaped runs) lets
      // a bidi-aware viewer recover the logical reading order on copy, while the
      // visual x makes the selection highlight track the glyphs exactly.
      const runText = rs.run.text;
      const clBox = new Map();
      for (const gl of rs.glyphs) {
        const left = runX + gl.x;
        const right = left + (gl.adv || 0);
        const b = clBox.get(gl.cl);
        if (!b) clBox.set(gl.cl, { left, right });
        else {
          if (left < b.left) b.left = left;
          if (right > b.right) b.right = right;
        }
      }
      const clusters = [...clBox.keys()].sort((a, b) => a - b);
      const leftFor = (c) => {
        if (clBox.has(c)) return clBox.get(c).left;
        let best; // ligature: nearest preceding cluster
        for (const k of clusters) {
          if (k <= c) best = k;
          else break;
        }
        return best !== undefined ? clBox.get(best).left : runX;
      };
      const runCells = [];
      for (let c = 0; c < runText.length; c++) {
        runCells.push({ ch: runText[c], x: leftFor(c) });
      }
      runCells.sort((a, b) => a.x - b.x); // logical → visual within the run
      cells.push(...runCells);
    }
    return { paths, cells };
  }

  const lineProps = (node) => ({
    fontSize: inheritedNumber(node, 'font-size', 16),
    fontFamily: inheritedFontFamily(node),
    bold: inheritedFontWeight(node),
    fill: inheritedFill(node),
  });

  // Replace a whole <text> element with a <g> of glyph paths. (Glyphs must NOT be
  // nested inside <text> — svg-to-pdfkit ignores non-text children of <text>.)
  async function shapeTextElement(textEl) {
    const anchor = getNodeAttr(textEl, 'text-anchor', 'start');
    // Honour the `direction` attribute cleanSVG set (the label's paragraph
    // direction) so a Latin-led line like "kpi_overall_by_dept لقسمه" shapes in
    // the same order as its RTL siblings; only re-detect if it's absent.
    const dirAttr = getNodeAttr(textEl, 'direction', '');
    const rtlBase = dirAttr ? dirAttr === 'rtl' : baseDirection(collectText(textEl)) === 'rtl';
    const textX = parseFloat(getNodeAttr(textEl, 'x', '')) || 0;
    const textY = parseFloat(getNodeAttr(textEl, 'y', '')) || 0;
    // mermaid puts a baseline `dy` on <text> to vertically centre the line within
    // its box (≈0.35em). Without it glyphs sit too high, leaving a gap at the
    // bottom — so fold it into the starting baseline.
    const textDy = parseFloat(getNodeAttr(textEl, 'dy', '')) || 0;
    const baseY = textY + textDy;
    const tspans = (textEl.children || []).filter((c) => c.type === 'element' && c.name === 'tspan');

    const glyphPaths = [];
    const lines = []; // metadata for the invisible selectable-text layer
    const addLine = (lineText, props, res, y) => {
      glyphPaths.push(...res.paths);
      lines.push({
        text: lineText,
        y,
        fontSize: props.fontSize,
        bold: props.bold,
        rtl: rtlBase, // paragraph base direction (for the tag's /Lang)
        cells: res.cells, // { ch, x } in visual order for the selectable layer
      });
    };

    if (tspans.length) {
      // Each <tspan> is a line; baselines accumulate via dy (or absolute y).
      let cy = baseY;
      for (const t of tspans) {
        const tx = parseFloat(getNodeAttr(t, 'x', ''));
        const ty = parseFloat(getNodeAttr(t, 'y', ''));
        const dy = parseFloat(getNodeAttr(t, 'dy', '')) || 0;
        cy = isNaN(ty) ? cy + dy : ty;
        const lineText = collectText(t);
        if (!lineText.trim()) continue;
        const lineX = isNaN(tx) ? textX : tx;
        const tAnchor = getNodeAttr(t, 'text-anchor', anchor);
        const props = lineProps(t);
        addLine(lineText, props, await shapeLine(lineText, lineX, cy, props, tAnchor, rtlBase), cy);
      }
    } else {
      const lineText = collectText(textEl);
      if (lineText.trim()) {
        const props = lineProps(textEl);
        addLine(lineText, props, await shapeLine(lineText, textX, baseY, props, anchor, rtlBase), baseY);
      }
    }

    if (!glyphPaths.length) return { g: null, lines: [] };
    const g = {
      type: 'element',
      name: 'g',
      attributes: { fill: lineProps(textEl).fill || '#000000' },
      children: glyphPaths,
    };
    glyphPaths.forEach((p) => (p.parent = g));
    return { g, lines };
  }

  // Walk the tree; swap each <text> element for its glyph <g> in the parent,
  // collecting per-line metadata for the selectable-text overlay.
  const allLines = [];
  async function processNode(node) {
    if (!node?.children) return;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.type === 'element' && child.name === 'text') {
        const { g, lines } = await shapeTextElement(child);
        if (g) {
          g.parent = node;
          node.children[i] = g;
          allLines.push(...lines);
        }
      } else if (child.type === 'element') {
        await processNode(child);
      }
    }
  }

  await processNode(tree);

  let svg;
  try {
    svg = toXml(tree, { closeEmptyElements: true, quote: '"' })
      .replace(/^<\?xml[^?]*\?>\n?/, '')
      .trimEnd();
  } catch (e) {
    throw new Error('HarfBuzz SVG serialization failed: ' + e.message);
  }
  return { svg, lines: allLines };
}
