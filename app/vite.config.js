import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The whole app builds to ONE self-contained dist/index.html:
//  - @preact/preset-vite  → JSX + Preact
//  - @tailwindcss/vite     → Tailwind v4 utility CSS (no config file needed)
//  - vite-plugin-singlefile→ inline every JS chunk and CSS file as <script>/<style>
// Heavy, optional PDF deps (PDFKit, blob-stream, svg-to-pdfkit, HarfBuzz) are
// loaded lazily from a CDN at export time, so they never bloat the HTML.
export default defineConfig({
  plugins: [preact(), tailwindcss(), viteSingleFile()],
  build: {
    target: 'es2020',
    // singlefile sets these too, but be explicit for clarity.
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
});
