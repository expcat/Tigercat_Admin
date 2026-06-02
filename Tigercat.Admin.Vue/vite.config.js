import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import process from 'node:process';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: parseInt(process.env.PORT || '5173'),
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
            id.includes('node_modules/vue') ||
            id.includes('node_modules/vue-router')
          ) {
            return 'vendor-framework';
          }
          return undefined;
        },
      },
    },
  },
});
