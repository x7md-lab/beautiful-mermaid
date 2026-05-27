import { renderMermaidSVG } from 'beautiful-mermaid';

/** Render Mermaid source to an SVG string (renderMermaidSVG may be sync or async). */
export async function renderMermaid(input) {
  let svg = renderMermaidSVG(input);
  if (svg?.then) svg = await svg;
  if (!svg) throw new Error('renderMermaidSVG returned empty');
  return String(svg);
}

/** Derive a filename from the first line of the Mermaid source. */
export function fileNameFromInput(input) {
  const first = (input || '').trim().split('\n')[0] || 'mermaid-diagram';
  const cleaned = first
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'mermaid-diagram';
}
