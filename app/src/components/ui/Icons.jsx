// Small inline stroke icons (currentColor). Sized 1em by default.
const base = {
  width: '1.1em',
  height: '1.1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
};

export const PlayIcon = (p) => (
  <svg {...base} {...p}>
    <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" />
  </svg>
);
export const CopyIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);
export const CheckIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
export const DownloadIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);
export const FileIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </svg>
);
export const TrashIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M9 7V4h6v3m-7 0v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7" />
  </svg>
);
export const InfoIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5m0-8h.01" />
  </svg>
);
export const EyeIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const CodeIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m8 6-6 6 6 6m8-12 6 6-6 6" />
  </svg>
);
export const EditIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
export const SpinnerIcon = (p) => (
  <svg {...base} {...p} class={`animate-spin ${p?.class || ''}`}>
    <path d="M21 12a9 9 0 1 1-6.2-8.5" />
  </svg>
);
export const ChevronIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

// Composite "download" icons: a content glyph (document for PDF, </> for SVG)
// with a small download arrow nested in the bottom-left corner — shared style.
const DownloadBadge = () => (
  <>
    <path d="M5.4 12.4V18" />
    <path d="M3 15.6l2.4 2.4 2.4-2.4" />
    <path d="M2.4 20.8h6" />
  </>
);
export const PdfDownloadIcon = (p) => (
  <svg {...base} stroke-width="1.7" {...p}>
    <path d="M11 2.5h6l4 4V16a1.5 1.5 0 0 1-1.5 1.5H11A1.5 1.5 0 0 1 9.5 16V4A1.5 1.5 0 0 1 11 2.5Z" />
    <path d="M17 2.5V6h4" />
    <DownloadBadge />
  </svg>
);
export const SvgDownloadIcon = (p) => (
  <svg {...base} stroke-width="1.7" {...p}>
    <path d="M13.5 5 10 9l3.5 4" />
    <path d="M18 5l3.5 4-3.5 4" />
    <path d="M16.4 4 15.2 14" />
    <DownloadBadge />
  </svg>
);
