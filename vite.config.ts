import path from 'path';
import { readFileSync } from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as { version: string };

const featureChunkMap: Array<{ match: string; chunk: string }> = [
  { match: '/src/renderer/features/writing/', chunk: 'feature-writing' },
  { match: '/src/renderer/features/assistant/', chunk: 'feature-assistant' },
  { match: '/src/renderer/features/knowledge/', chunk: 'feature-knowledge' },
  { match: '/src/renderer/features/world/', chunk: 'feature-world' },
  { match: '/src/renderer/features/cards/', chunk: 'feature-cards' },
  { match: '/src/renderer/features/chapters/', chunk: 'feature-chapters' },
  { match: '/src/renderer/features/characters/', chunk: 'feature-characters' },
  { match: '/src/renderer/features/settings/', chunk: 'feature-settings' },
  { match: '/src/renderer/features/timeline/', chunk: 'feature-timeline' },
  { match: '/src/renderer/features/consistency/', chunk: 'feature-consistency' },
];

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  publicDir: path.resolve(__dirname, 'src/assets'),
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'build/renderer'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'vendor-react';
            }
            if (id.includes('@google/genai') || id.includes('chromadb') || id.includes('vectra')) {
              return 'vendor-ai';
            }
            if (id.includes('font-awesome')) {
              return 'vendor-ui';
            }
            return 'vendor-misc';
          }

          const normalizedId = id.replace(/\\/g, '/');
          const matchedFeature = featureChunkMap.find((item) => normalizedId.includes(item.match));
          return matchedFeature?.chunk;
        },
      },
    },
  },
});
