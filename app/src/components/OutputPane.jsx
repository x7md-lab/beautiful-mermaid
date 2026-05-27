import { useMemo, useState } from 'preact/hooks';
import { TabBar } from './ui/Tabs.jsx';
import { IconButton } from './ui/IconButton.jsx';
import { CodeEditor } from './ui/CodeEditor.jsx';
import { CopyIcon, CheckIcon, SvgDownloadIcon, PdfDownloadIcon, EyeIcon, CodeIcon } from './ui/Icons.jsx';
import { formatXml } from '../lib/format-xml.js';
import { t } from '../lib/i18n.js';

function EmptyState() {
  return (
    <div class="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <EyeIcon width="2.2em" height="2.2em" class="text-gray-300" />
      <p class="text-sm font-medium text-gray-500">{t('emptyOutput')}</p>
      <p class="text-xs text-gray-400">{t('emptyOutputHint')}</p>
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
        <div class="preview-checkerboard flex-1 overflow-auto">
          <div class="flex min-h-full min-w-max items-center justify-center p-6">
            {/* eslint-disable-next-line react/no-danger */}
            <div class="rounded-sm border border-gray-200 bg-white p-3 shadow-md" dangerouslySetInnerHTML={{ __html: output }} />
          </div>
        </div>
      ) : (
        <div class="min-h-0 flex-1 bg-gray-50/60">
          <CodeEditor value={formatted} readOnly language="xml" />
        </div>
      )}
    </section>
  );
}
