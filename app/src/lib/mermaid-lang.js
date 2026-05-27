import { StreamLanguage } from '@codemirror/language';

// Minimal Mermaid highlighting (no official CodeMirror grammar exists). Returns
// standard token names that StreamLanguage maps to default highlight tags.
const KEYWORDS =
  /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|subgraph|end|participant|actor|class|state|note|loop|alt|opt|par|and|else|critical|break|rect|activate|deactivate|direction|click|style|linkStyle|classDef)\b/;
const DIR = /^(TB|TD|BT|RL|LR)\b/;
const ARROW = /^(--?>>?|--[xo]|<--?|-\.->|-\.-|==+>|===+|\.\.>|--|::|:)/;

export const mermaidLanguage = StreamLanguage.define({
  name: 'mermaid',
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(/%%.*/)) return 'comment';
    if (stream.match(/"(?:[^"\\]|\\.)*"/) || stream.match(/'(?:[^'\\]|\\.)*'/)) return 'string';
    if (stream.match(/\[[^\]]*\]|\{[^}]*\}|\([^)]*\)/)) return 'string'; // node / edge labels
    if (stream.match(/\|[^|]*\|/)) return 'string'; // edge text |label|
    if (stream.match(KEYWORDS) || stream.match(DIR)) return 'keyword';
    if (stream.match(ARROW)) return 'operator';
    if (stream.match(/[A-Za-z_][\w-]*/)) return 'variableName';
    stream.next();
    return null;
  },
});

export const mermaid = () => mermaidLanguage;
