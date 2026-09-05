import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import process from 'node:process';

function isTigercatBarrel(id) {
  return /node_modules[/\\]@expcat[/\\]tigercat-(?:react|vue)[/\\]dist[/\\]index\.m?js/.test(
    id,
  );
}

function isStaticallyReachableFromEntry(id, getModuleInfo) {
  const seen = new Set();
  const stack = [id];
  while (stack.length) {
    const current = stack.pop();
    if (seen.has(current)) continue;
    seen.add(current);
    const info = getModuleInfo(current);
    if (!info) continue;
    if (info.isEntry) return true;
    for (const importer of info.importers) {
      // The package barrel re-exports every component. Walking through it
      // would pull lazy chart/editor/cropper modules into vendor-ui.
      if (isTigercatBarrel(importer)) continue;
      stack.push(importer);
    }
  }
  return false;
}

export default defineConfig({
  base: process.env.VITE_TIGERCAT_BASE_PATH || '/',
  plugins: [vue()],
  server: {
    port: parseInt(process.env.PORT || '5173'),
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://127.0.0.1:5100',
        changeOrigin: true,
      },
      '/hubs': {
        target: process.env.VITE_API_URL || 'http://127.0.0.1:5100',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: process.env.VITE_TIGERCAT_OUT_DIR || 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id, { getModuleInfo }) {
          if (id.includes('node_modules/@expcat/tigercat-')) {
            // Only the statically reachable shell stays in vendor-ui.
            // Route/interaction lazy entries (charts, editors, cropper, Gantt)
            // must not be forced into that chunk.
            if (isStaticallyReachableFromEntry(id, getModuleInfo)) {
              return 'vendor-ui';
            }
            return undefined;
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
