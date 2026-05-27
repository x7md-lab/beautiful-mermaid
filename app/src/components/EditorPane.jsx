import { IconButton } from './ui/IconButton.jsx';
import { CodeEditor } from './ui/CodeEditor.jsx';
import { TrashIcon } from './ui/Icons.jsx';
import { t } from '../lib/i18n.js';

export function EditorPane({ value, onInput, onClear, onProcess }) {
  return (
    <section class="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div class="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <span class="text-sm font-semibold text-gray-700">{t('mermaidSyntax')}</span>
        <IconButton icon={TrashIcon} label={t('clear')} variant="danger" onClick={onClear} />
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
