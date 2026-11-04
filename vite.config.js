import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Served from the root of clinicpilot.revivehealthcarepk.com.
  base: process.env.VITE_BASE_PATH || '/',
  build: { outDir: 'dist' },
});
