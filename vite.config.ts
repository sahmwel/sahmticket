// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'; // put all node_modules in a 'vendor' chunk
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000, // increase limit to 1 MB if needed
  }
});
