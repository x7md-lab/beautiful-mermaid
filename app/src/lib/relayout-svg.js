// iOS multiline fix for SVG.
//
// beautiful-mermaid emits multi-line labels as one <text> with a <tspan x dy>
// per line. iOS/WebKit drops the per-tspan `dy` when the SVG is used as an image
// (e.g. <img src>, CSS background), collapsing every line onto one baseline. The
// robust, cross-browser form is one *standalone* <text> per line at an absolute
// (x, y) — no tspans, no dy.
//
// We re-derive that layout instead of trusting the original dy:
//   • pretext  — measures each line's width (canvas, same engine the browser
//                paints with) and its base direction (UAX #9).
//   • a canvas — gives the font's ascent/descent for the baseline within a line.
//   • Yoga     — lays the lines out as a flex column (the line boxes), giving
//                each line's vertical offset; the block is centred on the
//                original anchor so it still sits in beautiful-mermaid's box.
// The text stays real/selectable; the SVG renders identically on iOS.
import { fromXml } from 'xast-util-from-xml';
import { toXml } from 'xast-util-to-xml';
import { prepareWithSegments, measureNaturalWidth } from '@chenglou/pretext';
import Yoga from 'yoga-layout';
import { baseDirection } from './bidi.js';
// Static import: yoga-layout's asm entry uses top-level await; importing it
// statically lets the bundler sequence its init correctly (a dynamic import,
// inlined by vite-plugin-singlefile, causes a TDZ on the asm bindings).

let _ctx = null;
function measureCtx() {
  if (_ctx) return _ctx;
  _ctx =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(1, 1).getContext('2d')
      : document.createElement('canvas').getContext('2d');
  return _ctx;
}

// Font ascent/descent (px) for the baseline offset within a line box.
function vMetrics(fontSize, family, bold) {
  const ctx = measureCtx();
  ctx.font = `${bold ? '600 ' : ''}${fontSize}px ${family}`;
  const m = ctx.measureText('Mخل');
  const asc = m.fontBoundingBoxAscent || fontSize * 0.92;
  const desc = m.fontBoundingBoxDescent || fontSize * 0.28;
  return { asc, desc };
}

const attr = (node, name, def) => {
  const v = node.attributes?.[name];
  return v != null ? String(v) : def;
};
function collectText(node) {
  if (!node?.children) return '';
  let s = '';
  for (const c of node.children) {
    if (c.type === 'text') s += c.value;
    else if (c.children) s += collectText(c);
  }
  return s;
}
function lineWidth(text, font) {
  try {
    return measureNaturalWidth(prepareWithSegments(text, font));
  } catch {
    return text.length * 7;
  }
}

function makeLineText(text, x, y, base) {
  const dir = baseDirection(text);
  const attrs = {
    x: String(Math.round(x * 100) / 100),
    y: String(Math.round(y * 100) / 100),
    'text-anchor': base.anchor,
    'font-size': base.fontSize,
    'font-family': base.family,
  };
  if (base.fontWeight) attrs['font-weight'] = base.fontWeight;
  if (base.fill) attrs.fill = base.fill;
  if (dir === 'rtl' || dir === 'ltr') {
    attrs.direction = dir;
    attrs['unicode-bidi'] = 'isolate';
  }
  return { type: 'element', name: 'text', attributes: attrs, children: [{ type: 'text', value: text }] };
}

// Flatten one multi-line <text> → array of absolute single-line <text> nodes.
function flattenText(textEl) {
  const tspans = (textEl.children || []).filter((c) => c.type === 'element' && c.name === 'tspan');
  if (tspans.length < 2) return null; // single-line already iOS-safe

  const x = parseFloat(attr(textEl, 'x', '0')) || 0;
  const y = parseFloat(attr(textEl, 'y', '0')) || 0;
  const fontSize = parseFloat(attr(textEl, 'font-size', '13')) || 13;
  const family = attr(textEl, 'font-family', 'Vazirmatn, system-ui, sans-serif');
  const fontWeight = attr(textEl, 'font-weight', '');
  const bold = /bold|[6-9]00/.test(fontWeight);
  const base = { anchor: attr(textEl, 'text-anchor', 'start'), fontSize, family, fontWeight, fill: attr(textEl, 'fill', '') };
  const font = `${bold ? '600 ' : ''}${fontSize}px ${family}`;

  const lines = tspans.map((t) => collectText(t)).filter((l) => l.length);
  if (!lines.length) return null;

  // Inter-line advance: the original tspans' dy (box-tuned by beautiful-mermaid);
  // fall back to a typographic 1.3em.
  const lineHeight = Math.abs(parseFloat(attr(tspans[1], 'dy', ''))) || fontSize * 1.3;
  const widths = lines.map((l) => lineWidth(l, font));
  const { asc, desc } = vMetrics(fontSize, family, bold);

  // Yoga: column of line boxes → vertical offsets.
  const root = Yoga.Node.create();
  root.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN);
  const kids = lines.map((_, i) => {
    const c = Yoga.Node.create();
    c.setWidth(widths[i] || 1);
    c.setHeight(lineHeight);
    root.insertChild(c, i);
    return c;
  });
  const blockH = lines.length * lineHeight;
  root.setWidth(Math.max(...widths, 1));
  root.setHeight(blockH);
  root.calculateLayout(undefined, blockH, Yoga.DIRECTION_LTR);

  // Centre the block on the original anchor y; baseline centred within each box.
  const blockTop = y - blockH / 2;
  const baselineInBox = lineHeight / 2 + (asc - desc) / 2;
  const out = lines.map((line, i) => makeLineText(line, x, blockTop + kids[i].getComputedTop() + baselineInBox, base));

  root.freeRecursive();
  return out;
}

/**
 * Replace every multi-line <text> (with <tspan dy> lines) in a cleaned SVG with
 * absolute per-line <text> elements. No-op (returns input) when there are none.
 * @param {string} svg
 * @returns {Promise<string>}
 */
export async function relayoutMultilineSvg(svg) {
  if (!svg || !svg.includes('<tspan')) return svg; // nothing multi-line → skip
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready; // accurate metrics for the bundled font
    } catch {
      /* ignore */
    }
  }

  let tree;
  try {
    tree = fromXml(svg);
  } catch {
    return svg;
  }

  let changed = false;
  (function walk(node) {
    if (!node.children) return;
    const next = [];
    for (const child of node.children) {
      if (child.type === 'element' && child.name === 'text') {
        const flat = flattenText(child);
        if (flat) {
          for (const n of flat) n.parent = node;
          next.push(...flat);
          changed = true;
          continue;
        }
      }
      if (child.type === 'element') walk(child);
      next.push(child);
    }
    node.children = next;
  })(tree);

  if (!changed) return svg;
  try {
    return toXml(tree, { closeEmptyElements: true, quote: '"' })
      .replace(/^<\?xml[^?]*\?>\n?/, '')
      .trimEnd();
  } catch {
    return svg;
  }
}
