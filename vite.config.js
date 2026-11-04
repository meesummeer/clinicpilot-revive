import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Served from meesummeer.github.io/clinicpilot-revive/. If a custom domain is
  // added later, set a repo Actions variable VITE_BASE_PATH to "/".
  base: process.env.VITE_BASE_PATH || '/clinicpilot-revive/',
  build: { outDir: 'dist' },
});
