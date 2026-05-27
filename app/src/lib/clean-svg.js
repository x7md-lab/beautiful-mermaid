/**
 * Turn beautiful-mermaid's raw SVG into a clean, portable, BiDi-aware SVG:
 *   - inline CSS custom properties (resolve var() / color-mix())
 *   - hoist inline `style` declarations to presentation attributes
 *   - drop <style> blocks and prettify output
 *   - set a per-paragraph text `direction` and right-align RTL section labels
 *
 * Built on xast (strict XML) + @adobe/css-tools, with base directions from the
 * pretext-backed BiDi helper.
 */
import { parse as parseCSS } from '@adobe/css-tools';
import { fromXml } from 'xast-util-from-xml';
import { toXml } from 'xast-util-to-xml';
import { baseDirection } from './bidi.js';

// ─── XML pre-sanitiser ────────────────────────────────────────────────────────
// @rgrove/parse-xml (used by xast-util-from-xml) is a *strict* XML parser, but
// Mermaid emits HTML-flavoured SVG with bare & and HTML entities.
function sanitiseForXml(svg) {
  return svg
    .replace(/^<\?xml[^?]*\?>\s*/i, '') // strip xml declaration
    .replace(/&(?!(?:#\d+|#x[\da-fA-F]+|[a-zA-Z]\w*);)/g, '&amp;') // bare &
    .replace(/&nbsp;/g, '&#160;')
    .replace(/&mdash;/g, '&#8212;')
    .replace(/&ndash;/g, '&#8211;')
    .replace(/<(br|hr|img|input)(\s[^>]*)?\s*>/gi, '<$1$2/>'); // self-close voids
}

// ─── colour helpers ─────────────────────────────────────────────────────────
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((x) => x + x).join('');
  if (hex.length === 8) hex = hex.slice(0, 6);
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}
const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();
const mixHex = (c1, c2, w1) => {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(r1 * w1 + r2 * (1 - w1), g1 * w1 + g2 * (1 - w1), b1 * w1 + b2 * (1 - w1));
};

// Resolve var(--name, fallback) and color-mix(in srgb, …) against an env map.
function resolveCss(str, env) {
  if (typeof str !== 'string') return str;
  let lim = 60;
  while (str.includes('var(') && lim-- > 0) {
    const s = str.lastIndexOf('var(');
    let e = s + 4;
    let p = 1;
    while (e < str.length && p > 0) {
      if (str[e] === '(') p++;
      if (str[e] === ')') p--;
      e++;
    }
    const inner = str.slice(s + 4, e - 1);
    const ci = inner.indexOf(',');
    const name = (ci < 0 ? inner : inner.slice(0, ci)).trim();
    const fb = ci < 0 ? '' : inner.slice(ci + 1).trim();
    str = str.slice(0, s) + (env[name] ?? fb) + str.slice(e);
  }
  lim = 60;
  while (str.includes('color-mix(') && lim-- > 0) {
    const s = str.lastIndexOf('color-mix(');
    let e = s + 10;
    let p = 1;
    while (e < str.length && p > 0) {
      if (str[e] === '(') p++;
      if (str[e] === ')') p--;
      e++;
    }
    const m = str
      .slice(s + 10, e - 1)
      .match(/in\s+srgb\s*,\s*(#[a-fA-F0-9]+)\s+(\d+(?:\.\d+)?)%\s*,\s*(#[a-fA-F0-9]+)/);
    if (m) str = str.slice(0, s) + mixHex(m[1], m[3], parseFloat(m[2]) / 100) + str.slice(e);
    else break;
  }
  return str;
}

// ─── tree helpers ─────────────────────────────────────────────────────────────
function collectText(node) {
  if (!node?.children) return '';
  let text = '';
  for (const child of node.children) {
    if (child.type === 'text') text += child.value;
    else if (child.children) text += collectText(child);
  }
  return text;
}
function getNodeAttr(node, attr, def) {
  const v = node?.attributes?.[attr];
  return v != null ? String(v) : def;
}
function getNodeDirection(node) {
  const text = collectText(node).trim();
  if (!text) return null;
  return baseDirection(text);
}

// Block-graph section labels (`<g class="subgraph">`) are emitted at the header's
// left edge — correct for LTR, wrong for RTL titles. When the title is RTL we move
// its anchor x to the header's right edge (minus the original padding). text-anchor
// is *logical*: for an RTL line "start" is the right edge, so we keep
// text-anchor="start" (right edge anchored, text grows left). Using "end" would
// anchor the left edge and overflow to the right.
function alignClusterLabel(g) {
  const children = g.children || [];
  const label = children.find((c) => c.type === 'element' && c.name === 'text');
  if (!label) return;
  const text = collectText(label).trim();
  if (!text || baseDirection(text) !== 'rtl') return;

  let band = null; // header/body band = widest rect
  for (const c of children) {
    if (c.type === 'element' && c.name === 'rect') {
      const w = parseFloat(c.attributes?.width);
      const x = parseFloat(c.attributes?.x);
      if (!isNaN(w) && !isNaN(x) && (!band || w > band.w)) band = { x, w };
    }
  }
  if (!band) return;

  const curX = parseFloat(getNodeAttr(label, 'x', ''));
  const pad = !isNaN(curX) ? Math.max(0, curX - band.x) : 0;
  label.attributes ??= {};
  label.attributes['text-anchor'] = 'start'; // RTL start = right edge
  label.attributes.x = String(band.x + band.w - pad);
  label.attributes.direction = 'rtl';
  label.attributes['unicode-bidi'] = 'isolate';
}

// ─── pretty-print: inject indent whitespace nodes (xast-util-to-xml has none) ──
const INDENT = '  ';
const textNode = (v) => ({ type: 'text', value: v });
const INLINE_ELEMENTS = new Set(['text', 'tspan', 'title', 'desc']);
function indentTree(node, depth = 0) {
  if (node.type !== 'element' && node.type !== 'root') return;
  const children = node.children ?? [];
  if (INLINE_ELEMENTS.has(node.name)) return; // never touch inline text content
  if (!children.some((c) => c.type === 'element')) return;
  const pad = INDENT.repeat(depth + 1);
  const closePad = INDENT.repeat(depth);
  const spaced = [];
  for (const child of children) {
    if (child.type === 'text' && child.value.trim() === '') continue;
    spaced.push(textNode('\n' + pad));
    spaced.push(child);
    indentTree(child, depth + 1);
  }
  if (spaced.length > 0) spaced.push(textNode('\n' + closePad));
  node.children = spaced;
}

// ─── main cleaner ───────────────────────────────────────────────────────────
const PRESENTATION_ATTRS = new Set(['fill', 'stroke', 'stroke-width', 'opacity', 'color', 'font-size', 'font-weight']);
const ROUND_ATTRS = new Set(['x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2']);

export function cleanSVG(rawSvg) {
  let tree;
  try {
    tree = fromXml(sanitiseForXml(rawSvg));
  } catch (e) {
    throw new Error('fromXml: ' + e.message);
  }

  // pass 1 — collect CSS custom properties into env
  const env = {};
  (function extractVars(node) {
    if (node.type === 'element') {
      if (node.name === 'svg' && node.attributes?.style) {
        for (const rule of node.attributes.style.split(';')) {
          const i = rule.indexOf(':');
          if (i > 0 && rule.slice(0, i).trim().startsWith('--'))
            env[rule.slice(0, i).trim()] = rule.slice(i + 1).trim();
        }
      }
      if (node.name === 'style') {
        const css = (node.children ?? []).filter((c) => c.type === 'text').map((c) => c.value).join('');
        if (css) {
          try {
            parseCSS(css)?.stylesheet?.rules?.forEach((rule) =>
              rule.declarations?.forEach((d) => {
                if (d.type === 'declaration' && d.property?.startsWith('--')) env[d.property] = d.value;
              })
            );
          } catch {
            /* ignore CSS parse errors */
          }
        }
      }
    }
    node.children?.forEach(extractVars);
  })(tree);

  // pass 2 — walk, mutate in place, return false to drop a node
  function walk(node) {
    if (node.type !== 'element') {
      node.children?.forEach(walk);
      return true;
    }
    if (node.name === 'style') return false; // CSS is being inlined
    if (node.name === 'defs' && !node.children?.length) return false;

    node.attributes ??= {};

    // RTL section labels: right-align the title within its band (before recursing
    // so the per-text handler below keeps our anchor).
    if (node.name === 'g' && /\b(subgraph|cluster)\b/.test(node.attributes.class || '')) {
      alignClusterLabel(node);
    }

    if (node.name === 'svg') {
      const bg = env['--bg'] ? resolveCss(env['--bg'], env) : '#FFFFFF';
      node.attributes.style = `background:${bg}`;
      node.attributes.xmlns ??= 'http://www.w3.org/2000/svg';
    } else {
      // font fallback + BiDi on text elements
      if (node.name === 'text' || node.name === 'tspan') {
        node.attributes['font-family'] = 'Vazirmatn, system-ui, sans-serif';
        // A multi-line label is one <text> with a <tspan> per line. Resolve the
        // base direction once from the whole label and apply it to every line, so
        // a Latin-led line (e.g. "kpi_overall_by_dept لقسمه") doesn't flip relative
        // to its Arabic siblings. unicode-bidi:isolate honours the `direction` we
        // set, whereas plaintext re-detects each line's base independently.
        if (node.name === 'text') {
          const dir = getNodeDirection(node);
          if (dir === 'rtl' || dir === 'ltr') {
            node.attributes.direction = dir;
            node.attributes['unicode-bidi'] = 'isolate';
            for (const c of node.children || []) {
              if (c.type === 'element' && c.name === 'tspan') {
                c.attributes ??= {};
                c.attributes.direction = dir;
                c.attributes['unicode-bidi'] = 'isolate';
              }
            }
          }
        } else if (!node.attributes.direction) {
          const dir = getNodeDirection(node);
          if (dir === 'rtl' || dir === 'ltr') {
            node.attributes.direction = dir;
            node.attributes['unicode-bidi'] = 'isolate';
          }
        }
      }

      // inline style → presentation attributes
      if (node.attributes.style) {
        const keep = [];
        for (const s of node.attributes.style.split(';')) {
          const i = s.indexOf(':');
          if (i < 0) continue;
          const k = s.slice(0, i).trim();
          const v = resolveCss(s.slice(i + 1).trim(), env);
          if (PRESENTATION_ATTRS.has(k)) node.attributes[k] = v;
          else if (!k.startsWith('--') && k !== 'background') keep.push(`${k}:${v}`);
        }
        if (keep.length) node.attributes.style = keep.join(';');
        else delete node.attributes.style;
      }

      // resolve remaining var()/color-mix(), round geometry
      for (const attr of Object.keys(node.attributes)) {
        let v = String(node.attributes[attr]);
        if (v.includes('var(') || v.includes('color-mix(')) v = resolveCss(v, env);
        if (ROUND_ATTRS.has(attr)) {
          const f = parseFloat(v);
          if (!isNaN(f)) v = String(parseFloat(f.toFixed(2)));
        }
        node.attributes[attr] = v;
      }
    }

    if (node.children) node.children = node.children.filter((c) => walk(c));
    return true;
  }
  walk(tree);

  indentTree(tree);

  let out;
  try {
    out = toXml(tree, { closeEmptyElements: true, quote: '"' });
  } catch (e) {
    throw new Error('toXml: ' + e.message);
  }
  return out.replace(/^<\?xml[^?]*\?>\n?/, '').trimEnd();
}
