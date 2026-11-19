import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// TrueAttend — Vite configuration
export default defineConfig({
  plugins: [react()],
  build: {
    // Split heavy vendor libraries into their own chunks for faster first paint.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
