// Pretty-print an XML/SVG string with 2-space indentation, reusing the xast
// parser/serializer (already a dependency). Inline text containers (<text>,
// <tspan>, …) are left untouched so glyph text isn't reflowed. Falls back to the
// input unchanged if it isn't well-formed.
import { fromXml } from 'xast-util-from-xml';
import { toXml } from 'xast-util-to-xml';

const INDENT = '  ';
const INLINE = new Set(['text', 'tspan', 'title', 'desc', 'tref', 'textPath']);
const textNode = (value) => ({ type: 'text', value });

function indent(node, depth = 0) {
  if (node.type !== 'element' && node.type !== 'root') return;
  if (INLINE.has(node.name)) return; // don't touch mixed inline content
  const children = node.children ?? [];
  if (!children.some((c) => c.type === 'element')) return; // leaf / text-only

  const pad = INDENT.repeat(depth + 1);
  const close = INDENT.repeat(depth);
  const spaced = [];
  for (const child of children) {
    if (child.type === 'text' && child.value.trim() === '') continue; // drop existing whitespace
    spaced.push(textNode('\n' + pad));
    spaced.push(child);
    indent(child, depth + 1);
  }
  if (spaced.length) spaced.push(textNode('\n' + close));
  node.children = spaced;
}

export function formatXml(xml) {
  if (!xml || typeof xml !== 'string') return xml || '';
  try {
    const tree = fromXml(xml);
    indent(tree);
    return toXml(tree, { closeEmptyElements: true, quote: '"' })
      .replace(/^<\?xml[^?]*\?>\n?/, '')
      .trimEnd();
  } catch {
    return xml; // not strict XML — show as-is
  }
}
