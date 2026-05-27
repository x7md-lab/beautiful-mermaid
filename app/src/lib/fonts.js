// Register the bundled Vazirmatn faces for the on-screen preview, reusing the
// same inlined font assets HarfBuzz shapes with (Vite dedupes identical ?url
// imports), so the preview renders Arabic offline with no CDN webfont.
import vazirmatnRegular from '../assets/fonts/Vazirmatn-Regular.ttf?url';
import vazirmatnBold from '../assets/fonts/Vazirmatn-Bold.ttf?url';

export function registerPreviewFonts() {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const faces = [
    new FontFace('Vazirmatn', `url(${vazirmatnRegular})`, { weight: '400 500', display: 'swap' }),
    new FontFace('Vazirmatn', `url(${vazirmatnBold})`, { weight: '600 900', display: 'swap' }),
  ];
  for (const face of faces) {
    face
      .load()
      .then((f) => document.fonts.add(f))
      .catch(() => {});
  }
}
