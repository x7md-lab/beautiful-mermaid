// Example diagrams, grouped by directionality so the picker can offer
// RTL / LTR / Mix. Each: { id, titleAr, dir, source }.

export const PRESETS = [
  // ── LTR ────────────────────────────────────────────────────────────────────
  {
    id: 'ltr-flow',
    titleAr: 'مخطط انسيابي (إنجليزي)',
    dir: 'ltr',
    source: `graph TD
  A[Start] --> B{Process?}
  B -->|Yes| C[Render via beautiful-mermaid]
  C --> D[Inline CSS & Clean Variables]
  D --> E[Output Clean SVG]
  B -->|No| F[End]`,
  },
  {
    id: 'ltr-seq',
    titleAr: 'مخطط تسلسل (إنجليزي)',
    dir: 'ltr',
    source: `sequenceDiagram
  participant U as User
  participant A as App
  participant S as Server
  U->>A: Click export
  A->>S: POST /render
  S-->>A: clean SVG
  A-->>U: download PDF`,
  },

  // ── RTL ────────────────────────────────────────────────────────────────────
  {
    id: 'rtl-flow',
    titleAr: 'مخطط انسيابي (عربي)',
    dir: 'rtl',
    source: `graph TD
  A[البداية] --> B{قرار؟}
  B -->|نعم| C[عرض عبر beautiful-mermaid]
  C --> D[تنظيف CSS والمتغيرات]
  D --> E[إخراج SVG نظيف]
  B -->|لا| F[نهاية]`,
  },
  {
    id: 'rtl-seq',
    titleAr: 'مخطط تسلسل (عربي)',
    dir: 'rtl',
    source: `sequenceDiagram
  participant م as المستخدم
  participant ت as التطبيق
  participant خ as الخادم
  م->>ت: طلب التصدير
  ت->>خ: إرسال الطلب
  خ-->>ت: إرجاع SVG
  ت-->>م: تنزيل PDF`,
  },

  // ── Mix ────────────────────────────────────────────────────────────────────
  {
    id: 'mix-methodology',
    titleAr: 'منهجية (عناوين أقسام + أسطر متعددة)',
    dir: 'mix',
    source: `graph TD
  subgraph S1[التحميل إلى PocketBase]
    M["لوحة المدير<br/>kpi_overall_by_dept لقسمه<br/>الرسومات مفلترة على قسمه"]
  end
  subgraph S2[Extract — القراءة]
    C[DuckDB / openpyxl] --> D[تطبيع النصوص]
  end
  S1 --> S2`,
  },
  {
    id: 'mix-flow',
    titleAr: 'مخطط انسيابي مختلط',
    dir: 'mix',
    source: `graph TD
  A[ابدأ build] --> B{deploy؟}
  B -->|نعم| C[رفع إلى production]
  B -->|لا| D[تشغيل tests محلياً]
  C --> E[إشعار الفريق]`,
  },
];

export const DEFAULT_PRESET_ID = 'mix-methodology';

export const PRESET_GROUPS = [
  { dir: 'rtl', items: PRESETS.filter((p) => p.dir === 'rtl') },
  { dir: 'ltr', items: PRESETS.filter((p) => p.dir === 'ltr') },
  { dir: 'mix', items: PRESETS.filter((p) => p.dir === 'mix') },
];

export function presetById(id) {
  return PRESETS.find((p) => p.id === id) || PRESETS[0];
}
