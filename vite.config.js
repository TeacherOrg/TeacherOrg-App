import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

console.log('Vite config loaded successfully!');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.jsx': 'jsx',
      },
    },
  },
  build: {
    minify: 'terser',     // ✅ Code verschleiern & komprimieren
    sourcemap: false,     // ✅ Source Maps deaktivieren (kein Original-Code sichtbar)
    terserOptions: {
      compress: {
        drop_console: true,      // Console-Logs in Produktion entfernen
        drop_debugger: true,     // Debugger-Statements entfernen
        pure_funcs: ['console.log', 'console.debug', 'console.info']
      },
      mangle: {
        safari10: true           // Safari-Kompatibilität
      },
      format: {
        comments: false          // Alle Kommentare entfernen
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@tanstack/react-query'],
          pocketbase: ['pocketbase'],  // ✅ PocketBase separat bundeln
          components: [
            './src/components/yearly/YearlyGrid.jsx',
            './src/components/yearly/LessonModal.jsx',
            './src/components/topics/TopicModal.jsx',
            './src/components/yearly/TopicLessonsModal.jsx',
            './src/components/yearly/YearLessonCell.jsx',
            './src/components/yearly/YearLessonOverlay.jsx',
          ],
        },
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});