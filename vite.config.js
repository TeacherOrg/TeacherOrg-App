import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Exponiert auf 0.0.0.0 für Dev
    port: 5173, // Standardport explizit setzen
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'), // Expliziter Alias für Komponenten
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  build: {
    minify: false, // Deaktiviert Minification für Debugging
    sourcemap: true, // Aktiviert Sourcemaps
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@tanstack/react-query'],
          components: [
            './src/components/yearly/YearlyGrid.jsx',
            './src/components/yearly/LessonModal.jsx',
            './src/components/topics/TopicModal.jsx', // Korrigierter Pfad
            './src/components/yearly/TopicLessonsModal.jsx',
            './src/components/yearly/YearLessonCell.jsx',
            './src/components/yearly/YearLessonOverlay.jsx',
          ],
        },
      },
    },
  },
  define: {
    'process.env': {}, // Leerer Fallback
  },
});