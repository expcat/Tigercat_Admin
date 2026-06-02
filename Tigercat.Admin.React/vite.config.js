import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT || '5174'),
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://127.0.0.1:5100',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@expcat/tigercat-')) {
            return 'vendor-ui';
          }
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-router-dom')
          ) {
            return 'vendor-framework';
          }
          return undefined;
        },
      },
    },
  },
});
