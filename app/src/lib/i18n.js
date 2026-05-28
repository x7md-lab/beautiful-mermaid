// Arabic UI strings. The interface is Arabic-only (RTL); there is no toggle.
export const AR = {
  appTitle: 'ميرميد ← SVG نظيف',
  subtitle: 'تحويل مخططات ميرميد إلى SVG ثنائي الاتجاه وتصدير PDF متجهي قابل للتحديد',

  // actions
  process: 'تحويل',
  processing: 'جارٍ التحويل…',
  rendering: 'جارٍ الرسم…',
  cleaning: 'جارٍ التنظيف…',
  loadFile: 'فتح ملف',
  clear: 'مسح',
  copy: 'نسخ الشيفرة',
  copied: 'تم النسخ ✓',
  saveSvg: 'حفظ SVG',
  savePdf: 'حفظ PDF',
  buildingPdf: 'تجهيز الـ PDF…',
  about: 'حول',
  github: 'GitHub',
  repoUrl: 'https://github.com/x7md-lab/beautiful-mermaid',

  // panes / tabs
  editor: 'المحرر',
  preview: 'المعاينة',
  code: 'الشيفرة',
  mermaidSyntax: 'صيغة ميرميد',
  cleanedOutput: 'الناتج النظيف',

  // presets
  presets: 'الأمثلة',
  choosePreset: 'اختر مثالاً',
  groupRtl: 'يمين ← يسار',
  groupLtr: 'يسار ← يمين',
  groupMix: 'مختلط',

  // placeholders / states
  editorPlaceholder: 'الصق صيغة ميرميد هنا…',
  emptyOutput: 'اضغط «تحويل» لعرض النتيجة هنا',
  emptyOutputHint: 'سيظهر الـ SVG النظيف والمعاينة بعد التحويل',

  // status / toasts
  done: 'تم ✓',
  loadedPreset: 'تم تحميل المثال',
  loadedFile: 'تم فتح الملف',
  cleared: 'تم المسح',
  savedSvg: 'تم حفظ SVG ✓',
  savedPdf: 'تم حفظ PDF ✓',
  needInput: 'الرجاء إدخال صيغة ميرميد',
  errorPrefix: 'خطأ',
  pdfErrorPrefix: 'خطأ في الـ PDF',

  // about dialog
  aboutTitle: 'عن الأداة',
  aboutBody:
    'تعرض هذه الأداة مخططات ميرميد كـ SVG نظيف يدعم النصوص ثنائية الاتجاه (عربي/لاتيني)، وتصدّرها كملف PDF متجهي بنصوص قابلة للتحديد والبحث. تعمل بالكامل دون اتصال.',
  aboutShortcuts: 'اختصار: Ctrl/⌘ + Enter للتحويل',
  close: 'إغلاق',
};

/** Look up an Arabic string by key (returns the key if missing). */
export function t(key) {
  return AR[key] ?? key;
}
