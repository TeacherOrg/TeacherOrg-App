// main.jsx - PERFORMANCE PROFILER IMPLEMENTIERT
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';
import { BrowserRouter } from 'react-router-dom';
import { Profiler } from 'react'; // ✅ PERFORMANCE PROFILER

const enableProfiling = false; // 🔄 Setze auf false, um Logs temporär zu deaktivieren; true zum Aktivieren

// ✅ PERFORMANCE CALLBACK (nur im Development)
const onRenderCallback = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
  // Nur im Development loggen
  if (process.env.NODE_ENV === 'development' && enableProfiling) { // 🔄 Hinzugefügte Prüfung
    // Gruppierte Logs für bessere Lesbarkeit
    console.group(`🎭 ${id} - ${phase}`);
    console.log(`⏱️  Actual: ${actualDuration.toFixed(2)}ms`);
    console.log(`📊 Base: ${baseDuration.toFixed(2)}ms`);
    console.log(`🕐 Commit: ${new Date(commitTime).toLocaleTimeString()}`);
    console.groupEnd();
    
    // 🚨 WARNUNG bei >16ms (60fps)
    if (actualDuration > 16) {
      console.warn(`🚨 SLOW RENDER: ${id} (${phase}) took ${actualDuration.toFixed(2)}ms (>16ms = <60fps)`);
    }
    
    // 💥 KRITISCH bei >50ms (Main-Thread Block)
    if (actualDuration > 50) {
      console.error(`💥 CRITICAL: ${id} blocked main thread for ${actualDuration.toFixed(2)}ms!`);
    }
    
    // 🎯 SPEZIFISCHE WARNS für unsere Komponenten
    if (id.includes('YearLessonCell') && actualDuration > 5) {
      console.warn(`📱 YearLessonCell ${id} zu langsam: ${actualDuration.toFixed(2)}ms`);
    }
    
    if (id.includes('YearlyGrid') && actualDuration > 20) {
      console.error(`📊 YearlyGrid ${id} blockiert: ${actualDuration.toFixed(2)}ms`);
    }
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <Profiler id="RootApp" onRender={onRenderCallback}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Profiler>
);