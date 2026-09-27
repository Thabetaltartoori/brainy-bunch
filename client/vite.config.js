import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API always lives on :4100. During development Vite proxies
// /api and /health to it, so the browser only ever talks to one origin
// and the session cookie works without any CORS configuration.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4100',
      '/health': 'http://localhost:4100',
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
