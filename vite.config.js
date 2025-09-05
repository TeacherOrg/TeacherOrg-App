import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Exponiert auf 0.0.0.0 für Dev
    port: 5173, // Optional: Standardport explizit setzen
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
    minify: false, // Deaktiviert Minification für Debugging (zeigt echte Variablennamen)
    sourcemap: true, // Aktiviert Sourcemaps für besseres Debugging
    rollupOptions: {
      // Optional: Begrenzt Chunk-Größe, um Bundle-Probleme zu vermeiden
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@tanstack/react-query'],
          components: [
            './src/components/yearly/YearlyGrid.jsx',
            './src/components/yearly/LessonModal.jsx',
            './src/components/yearly/TopicModal.jsx',
            './src/components/yearly/TopicLessonsModal.jsx',
            './src/components/yearly/YearLessonCell.jsx',
            './src/components/yearly/YearLessonOverlay.jsx',
          ],
        },
      },
    },
  },
  // Polyfill für process.env
  define: {
    'process.env': {}, // Leerer Fallback
  },
});