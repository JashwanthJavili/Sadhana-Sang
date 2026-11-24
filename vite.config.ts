import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Unique per build: the app compares it with /version.json to detect a new release
    const buildId = String(Date.now());
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'emit-version-json',
          generateBundle() {
            this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ buildId }) });
          },
        },
      ],
      define: {
        __BUILD_ID__: JSON.stringify(mode === 'production' ? buildId : 'dev'),
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Cache busting - add hash to filenames
        rollupOptions: {
          output: {
            // Vendor libraries change rarely — split them so browsers cache them across releases
            manualChunks: {
              react: ['react', 'react-dom', 'react-router-dom'],
              firebase: ['firebase/app', 'firebase/auth', 'firebase/database'],
            },
            entryFileNames: 'assets/[name].[hash].js',
            chunkFileNames: 'assets/[name].[hash].js',
            assetFileNames: 'assets/[name].[hash].[ext]'
          }
        },
        // Clear output directory before build
        emptyOutDir: true,
        // Generate manifest for cache tracking
        manifest: true
      }
    };
});
