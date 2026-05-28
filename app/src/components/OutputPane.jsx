import { useEffect, useMemo, useState } from 'preact/hooks';
import { ReactFlow, ReactFlowProvider, Background, Controls, useReactFlow } from '@xyflow/react';
import { TabBar } from './ui/Tabs.jsx';
import { IconButton } from './ui/IconButton.jsx';
import { CodeEditor } from './ui/CodeEditor.jsx';
import { CopyIcon, CheckIcon, SvgDownloadIcon, PdfDownloadIcon, EyeIcon, CodeIcon } from './ui/Icons.jsx';
import { formatXml } from '../lib/format-xml.js';
import { t } from '../lib/i18n.js';

function svgSize(svg) {
  const head = svg.slice(0, svg.indexOf('>') + 1);
  const w = parseFloat((head.match(/\bwidth="([\d.]+)/) || [])[1]);
  const h = parseFloat((head.match(/\bheight="([\d.]+)/) || [])[1]);
  if (!isNaN(w) && !isNaN(h)) return { w, h };
  const vb = (head.match(/viewBox="([^"]+)"/) || [])[1];
  if (vb) {
    const p = vb.split(/[\s,]+/).map(Number);
    if (p.length === 4) return { w: p[2], h: p[3] };
  }
  return { w: 600, h: 400 };
}

function SvgNode({ data }) {
  return (
    <div
      class="rounded-sm border border-gray-200 bg-white p-3 shadow-md"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: data.svg }}
    />
  );
}

const nodeTypes = { svg: SvgNode };

function AutoFit({ output }) {
  const rf = useReactFlow();
  useEffect(() => {
    if (!output) return;
    const id = requestAnimationFrame(() => rf.fitView({ padding: 0.15, duration: 200 }));
    return () => cancelAnimationFrame(id);
  }, [output, rf]);
  return null;
}

function EmptyState() {
  return (
    <div class="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <EyeIcon width="2.2em" height="2.2em" class="text-gray-300" />
      <p class="text-sm font-medium text-gray-500">{t('emptyOutput')}</p>
      <p class="text-xs text-gray-400">{t('emptyOutputHint')}</p>
    </div>
  );
}

function Preview({ output }) {
  const { w, h } = useMemo(() => svgSize(output), [output]);
  const nodes = useMemo(
    () => [
      {
        id: 'svg',
        type: 'svg',
        position: { x: 0, y: 0 },
        data: { svg: output, w, h },
        draggable: false,
        selectable: false,
      },
    ],
    [output, w, h]
  );

  return (
    // ReactFlow's chrome is LTR; isolate from the app-level RTL so controls
    // and pan gestures aren't mirrored.
    <div class="preview-checkerboard relative min-h-0 flex-1" style="direction:ltr;">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={[]}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.1}
          maxZoom={5}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          edgesFocusable={false}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant="dots" gap={20} size={1} color="#cbd5e1" />
          <Controls showInteractive={false} />
        </ReactFlow>
        <AutoFit output={output} />
      </ReactFlowProvider>
    </div>
  );
}

export function OutputPane({ output, onCopy, copied, onSaveSvg, onSavePdf, pdfBusy }) {
  const [view, setView] = useState('preview');
  const has = !!output;
  const formatted = useMemo(() => (output ? formatXml(output) : ''), [output]);

  return (
    <section class="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div class="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
        <TabBar
          value={view}
          onValueChange={setView}
          tabs={[
            { value: 'preview', label: t('preview'), icon: EyeIcon },
            { value: 'code', label: t('code'), icon: CodeIcon },
          ]}
        />
        <div role="toolbar" aria-label={t('cleanedOutput')} class="flex items-center gap-0.5">
          <IconButton icon={copied ? CheckIcon : CopyIcon} label={copied ? t('copied') : t('copy')} variant="success" onClick={onCopy} disabled={!has} />
          <IconButton icon={SvgDownloadIcon} label={t('saveSvg')} variant="primary" onClick={onSaveSvg} disabled={!has} />
          <IconButton icon={PdfDownloadIcon} label={t('savePdf')} variant="primary" loading={pdfBusy} onClick={onSavePdf} disabled={!has} />
        </div>
      </div>

      {!has ? (
        <EmptyState />
      ) : view === 'preview' ? (
        <Preview output={output} />
      ) : (
        <div class="min-h-0 flex-1 bg-gray-50/60">
          <CodeEditor value={formatted} readOnly language="xml" />
        </div>
      )}
    </section>
  );
}
