/**
 * BiDi helpers built on chenglou/pretext (`@chenglou/pretext`).
 *
 * pretext segments text and resolves a per-segment Unicode BiDi embedding level
 * (UAX #9, forked from pdf.js) during its measurement pass. We reuse just the
 * segments + levels it computes to:
 *   1. detect a label's base paragraph direction, and
 *   2. reorder mixed-direction text into visual runs for the PDF glyph shaper.
 *
 * pretext measures via a canvas (browser only); every entry point degrades to a
 * sensible default when metrics aren't available.
 */
import { prepareWithSegments } from '@chenglou/pretext';
import { direction } from 'direction';

const BIDI_FONT = '16px Inter, system-ui, sans-serif';
const _cache = new Map();

/** prepareWithSegments() with caching + graceful failure (returns null). */
function analyze(text) {
  const t = typeof text === 'string' ? text : '';
  if (_cache.has(t)) return _cache.get(t);
  let p = null;
  try {
    p = prepareWithSegments(t, BIDI_FONT);
  } catch {
    p = null;
  }
  _cache.set(t, p);
  return p;
}

/**
 * Base paragraph direction. The base embedding level is the minimum segment
 * level (levels only rise above the paragraph base); pure-LTR text yields
 * `segLevels === null`. Falls back to the `direction` heuristic if pretext has
 * no canvas to measure with.
 * @param {string} text
 * @returns {'rtl' | 'ltr' | null} `null` for empty input.
 */
export function baseDirection(text) {
  const t = (text || '').trim();
  if (!t) return null;
  const p = analyze(t);
  if (p && p.segLevels && p.segLevels.length) {
    let min = Infinity;
    for (const lv of p.segLevels) if (lv < min) min = lv;
    return min & 1 ? 'rtl' : 'ltr';
  }
  if (p) return 'ltr';
  return direction(t) || null;
}

/**
 * UAX #9 rule L2 — turn per-segment embedding levels into a visual segment order
 * (logical indices ordered left → right).
 * @param {ArrayLike<number>} levels
 * @returns {number[]}
 */
export function reorderVisual(levels) {
  const n = levels.length;
  const order = Array.from({ length: n }, (_, i) => i);
  let highest = 0;
  let lowestOdd = Infinity;
  for (const lv of levels) {
    if (lv > highest) highest = lv;
    if (lv & 1 && lv < lowestOdd) lowestOdd = lv;
  }
  for (let lvl = highest; lvl >= lowestOdd; lvl--) {
    let i = 0;
    while (i < n) {
      if (levels[order[i]] >= lvl) {
        let j = i + 1;
        while (j < n && levels[order[j]] >= lvl) j++;
        for (let a = i, b = j - 1; a < b; a++, b--) {
          const t = order[a];
          order[a] = order[b];
          order[b] = t;
        }
        i = j;
      } else {
        i++;
      }
    }
  }
  return order;
}

/**
 * Split mixed-direction text into directional runs in visual (left → right)
 * order. Each run keeps its text in logical order — HarfBuzz reorders glyphs
 * within a single-direction run itself.
 * @param {string} text
 * @param {'rtl' | 'ltr'} [forceBase] Pin the paragraph base direction (so every
 *   line of a multi-line label shares one direction) via an RLM/LRM prefix that
 *   is stripped from the result.
 * @returns {{ text: string, rtl: boolean }[] | null} `null` when no reordering
 *   is needed (pure LTR) or metrics are unavailable.
 */
export function visualRuns(text, forceBase) {
  const probe =
    forceBase === 'rtl' ? '‏' + text : forceBase === 'ltr' ? '‎' + text : text;
  const p = analyze(probe);
  if (!p || !p.segLevels) return null;
  const segs = p.segments;
  const levels = p.segLevels;
  // Char offset of each segment in the joined text, so each run can report where
  // it begins logically (used to order the selectable-text layer in pdf.js).
  const segOffset = new Array(segs.length);
  for (let k = 0, off = 0; k < segs.length; k++) {
    segOffset[k] = off;
    off += segs[k].length;
  }
  const markerLen = forceBase ? 1 : 0;
  const order = reorderVisual(levels);
  const runs = [];
  let i = 0;
  while (i < order.length) {
    const lvl = levels[order[i]];
    let j = i + 1;
    while (j < order.length && levels[order[j]] === lvl) j++;
    const idxs = order.slice(i, j).sort((a, b) => a - b); // restore logical order
    let s = '';
    for (const k of idxs) s += segs[k];
    runs.push({ text: s, rtl: (lvl & 1) === 1, start: segOffset[idxs[0]] - markerLen });
    i = j;
  }
  if (forceBase) {
    for (const r of runs) r.text = r.text.replace(/[‎‏]/g, '');
    return runs.filter((r) => r.text.length);
  }
  return runs;
}
