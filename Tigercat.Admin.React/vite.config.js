import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT || '5174'),
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL,
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-framework': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@expcat/tigercat-react', '@expcat/tigercat-core'],
        },
      },
    },
  },
});
