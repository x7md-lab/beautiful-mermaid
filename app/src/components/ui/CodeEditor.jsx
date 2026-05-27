import { useEffect, useRef } from 'preact/hooks';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language';
import { xml } from '@codemirror/lang-xml';
import { mermaid } from '../../lib/mermaid-lang.js';

const THEME = EditorView.theme({
  '&': { height: '100%', fontSize: '13px', backgroundColor: 'transparent' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace", lineHeight: '1.55' },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: '#cbd5e1' },
  '.cm-activeLine': { backgroundColor: 'rgba(99,102,241,0.05)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#94a3b8' },
  '.cm-content': { padding: '12px 0' },
  '.cm-line': { padding: '0 12px' },
});

function langExtension(language) {
  if (language === 'xml') return xml();
  if (language === 'mermaid') return mermaid();
  return [];
}

/**
 * CodeMirror 6 wrapped for Preact. Code is always LTR.
 * @param {{value, onChange?, onSubmit?, readOnly?, language?, placeholder?, class?}} p
 */
export function CodeEditor({ value, onChange, onSubmit, readOnly = false, language = 'none', placeholder, class: cls = '' }) {
  const host = useRef(null);
  const view = useRef(null);
  const cbs = useRef({});
  cbs.current = { onChange, onSubmit };

  // (Re)create the editor when structural options change.
  useEffect(() => {
    const extensions = [
      lineNumbers(),
      history(),
      bracketMatching(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      EditorView.lineWrapping,
      THEME,
      langExtension(language),
      keymap.of([
        { key: 'Mod-Enter', run: () => (cbs.current.onSubmit?.(), true) },
        indentWithTab,
        ...defaultKeymap,
        ...historyKeymap,
      ]),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) cbs.current.onChange?.(u.state.doc.toString());
      }),
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
      ...(readOnly ? [] : [highlightActiveLine(), highlightActiveLineGutter()]),
      ...(placeholder ? [cmPlaceholder(placeholder)] : []),
    ];
    const v = new EditorView({ doc: value ?? '', extensions, parent: host.current });
    view.current = v;
    return () => v.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, language]);

  // Sync external value changes (preset load, processing output) without
  // clobbering the cursor while the user types.
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const current = v.state.doc.toString();
    if ((value ?? '') !== current) {
      v.dispatch({ changes: { from: 0, to: current.length, insert: value ?? '' } });
    }
  }, [value]);

  return <div ref={host} dir="ltr" class={`h-full overflow-hidden ${cls}`} />;
}
