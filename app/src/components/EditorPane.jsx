import { Button } from './ui/Button.jsx';
import { IconButton } from './ui/IconButton.jsx';
import { CodeEditor } from './ui/CodeEditor.jsx';
import { TrashIcon, PlayIcon } from './ui/Icons.jsx';
import { t } from '../lib/i18n.js';

export function EditorPane({ value, onInput, onClear, onProcess, busy }) {
  return (
    <section class="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div class="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2">
        <span class="text-sm font-semibold text-gray-700">{t('mermaidSyntax')}</span>
        <div class="flex items-center gap-2">
          <IconButton icon={TrashIcon} label={t('clear')} variant="danger" onClick={onClear} />
          <Button variant="primary" size="sm" icon={PlayIcon} loading={busy} onClick={onProcess}>
            {busy ? t('processing') : t('process')}
          </Button>
        </div>
      </div>
      <div class="min-h-0 flex-1">
        <CodeEditor
          value={value}
          onChange={onInput}
          onSubmit={onProcess}
          language="mermaid"
          placeholder={t('editorPlaceholder')}
        />
      </div>
    </section>
  );
}
