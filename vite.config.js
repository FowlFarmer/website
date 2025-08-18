import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the portfolio gallery.  This config enables the
// React plugin and leaves most other settings at their defaults.  See
// https://vitejs.dev/config/ for more details.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});