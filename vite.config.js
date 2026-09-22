import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sceneSnapshotPlugin } from './scripts/dev/sceneSnapshotPlugin.mjs';

// Vite configuration for the portfolio gallery.  This config enables the
// React plugin and leaves most other settings at their defaults.  See
// https://vitejs.dev/config/ for more details.
export default defineConfig({
  plugins: [react(), sceneSnapshotPlugin()],
  define: {
    'import.meta.env.VITE_VERCEL_ENV': JSON.stringify(process.env.VERCEL_ENV || ''),
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});