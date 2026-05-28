import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useMediaQuery } from '@base-ui-components/react/unstable-use-media-query';
import { Header } from './components/Header.jsx';
import { EditorPane } from './components/EditorPane.jsx';
import { OutputPane } from './components/OutputPane.jsx';
import { TabBar } from './components/ui/Tabs.jsx';
import { useToast } from './components/ui/Toast.jsx';
import { EditIcon, EyeIcon } from './components/ui/Icons.jsx';
import { renderMermaid, fileNameFromInput } from './lib/render.js';
import { cleanSVG } from './lib/clean-svg.js';
import { relayoutMultilineSvg } from './lib/relayout-svg.js';
import { formatXml } from './lib/format-xml.js';
import { exportSvgToPdf } from './lib/pdf.js';
import { downloadText } from './lib/download.js';
import { presetById, DEFAULT_PRESET_ID } from './lib/presets.js';
import { t } from './lib/i18n.js';

export function App() {
  const [input, setInput] = useState(presetById(DEFAULT_PRESET_ID).source);
  const [output, setOutput] = useState('');
  const [preset, setPreset] = useState(DEFAULT_PRESET_ID);
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileView, setMobileView] = useState('editor');
  const notify = useToast();
  const isDesktop = useMediaQuery('(min-width: 768px)', {});
  const inputRef = useRef(input);
  inputRef.current = input;

  const process = useCallback(
    async (src) => {
      const text = (src ?? inputRef.current).trim();
      if (!text) {
        notify(t('needInput'), 'error');
        return;
      }
      setBusy(true);
      try {
        const cleaned = cleanSVG(await renderMermaid(text));
        // Flatten multi-line <tspan dy> labels to absolute per-line <text> so the
        // SVG renders correctly on iOS/WebKit (and as an image).
        const out = await relayoutMultilineSvg(cleaned);
        setOutput(out);
        setMobileView('preview');
        notify(t('done'), 'ok');
      } catch (e) {
        console.error('[process]', e);
        notify(`${t('errorPrefix')}: ${e.message}`, 'error');
      } finally {
        setBusy(false);
      }
    },
    [notify]
  );

  // Render the default preset on first mount so the user sees output immediately.
  useEffect(() => {
    process(inputRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPreset = useCallback(
    (id) => {
      const p = presetById(id);
      setPreset(id);
      setInput(p.source);
      notify(`${t('loadedPreset')}: ${p.titleAr}`);
      process(p.source);
    },
    [notify, process]
  );

  const onLoadFile = useCallback(
    (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = String(e.target.result);
        setInput(text);
        notify(`${t('loadedFile')}: ${file.name}`);
        process(text);
      };
      reader.readAsText(file);
    },
    [notify, process]
  );

  const onCopy = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(formatXml(output)).catch(() => {});
    setCopied(true);
    notify(t('copied'), 'ok');
    setTimeout(() => setCopied(false), 2000);
  }, [output, notify]);

  const onSaveSvg = useCallback(() => {
    if (!output) return;
    downloadText(output, `${fileNameFromInput(input)}.svg`, 'image/svg+xml;charset=utf-8');
    notify(t('savedSvg'), 'ok');
  }, [output, input, notify]);

  const onSavePdf = useCallback(async () => {
    if (!output) return;
    setPdfBusy(true);
    notify(t('buildingPdf'));
    try {
      const { width, height } = await exportSvgToPdf(output, { filename: fileNameFromInput(input) });
      notify(`${t('savedPdf')}  (${Math.round(width)}×${Math.round(height)} pt)`, 'ok');
    } catch (e) {
      console.error('[pdf]', e);
      notify(`${t('pdfErrorPrefix')}: ${e.message}`, 'error');
    } finally {
      setPdfBusy(false);
    }
  }, [output, input, notify]);

  const onClear = useCallback(() => {
    setInput('');
    setOutput('');
    notify(t('cleared'));
  }, [notify]);

  const editor = (
    <EditorPane value={input} onInput={setInput} onClear={onClear} onProcess={() => process()} busy={busy} />
  );
  const out = (
    <OutputPane output={output} onCopy={onCopy} copied={copied} onSaveSvg={onSaveSvg} onSavePdf={onSavePdf} pdfBusy={pdfBusy} />
  );

  return (
    <div class="flex h-screen flex-col bg-gray-50 text-gray-800">
      <Header preset={preset} onPreset={onPreset} onLoadFile={onLoadFile} />

      {isDesktop ? (
        <main class="flex flex-1 gap-4 overflow-hidden p-4">
          <div class="min-w-0 flex-1">{editor}</div>
          <div class="min-w-0 flex-1">{out}</div>
        </main>
      ) : (
        <main class="flex flex-1 flex-col gap-3 overflow-hidden p-3">
          <TabBar
            fitted
            value={mobileView}
            onValueChange={setMobileView}
            tabs={[
              { value: 'editor', label: t('editor'), icon: EditIcon },
              { value: 'preview', label: t('preview'), icon: EyeIcon },
            ]}
          />
          <div class="min-h-0 flex-1">{mobileView === 'editor' ? editor : out}</div>
        </main>
      )}
    </div>
  );
}
