import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The whole app builds to ONE self-contained dist/index.html:
//  - @preact/preset-vite  → JSX + Preact
//  - @tailwindcss/vite     → Tailwind v4 utility CSS (no config file needed)
//  - vite-plugin-singlefile→ inline every JS chunk and CSS file as <script>/<style>
// PDFKit loads lazily from a CDN only at PDF-export time; HarfBuzz wasm and the
// fonts are bundled (inlined).
export default defineConfig({
  plugins: [preact(), tailwindcss(), viteSingleFile()],
  optimizeDeps: {
    // yoga-layout's entry uses top-level await; dev-time esbuild needs es2022 too.
    esbuildOptions: { target: 'es2022' },
  },
  build: {
    // es2022: yoga-layout's asm.js entry uses top-level await (fine in module
    // scripts; iOS Safari 15.4+ supports it).
    target: 'es2022',
    // singlefile sets these too, but be explicit for clarity.
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
});
