// main.jsx - PERFORMANCE PROFILER + GLOBALER QUERYCLIENT
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';
import { BrowserRouter } from 'react-router-dom';
import { Profiler } from 'react';

// TanStack React Query
import { QueryClientProvider } from '@tanstack/react-query';
// Optional: Devtools – super hilfreich beim Debuggen von Queries, Refetch, Cache usw.
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Display Scaling für 4K-Displays
import { initializeDisplayScaling } from '@/utils/displayScaling';

// QueryClient (aus separater Datei um zirkuläre Imports zu vermeiden)
import { queryClient } from '@/lib/queryClient';

// ✅ PERFORMANCE PROFILER
const enableProfiling = false; // 🔄 false = Logs deaktiviert, true = aktiviert (nur in dev)

const onRenderCallback = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
  if (process.env.NODE_ENV === 'development' && enableProfiling) {
    console.group(`🎭 ${id} - ${phase}`);
    console.log(`⏱️  Actual: ${actualDuration.toFixed(2)}ms`);
    console.log(`📊 Base: ${baseDuration.toFixed(2)}ms`);
    console.log(`🕐 Commit: ${new Date(commitTime).toLocaleTimeString()}`);
    console.groupEnd();

    if (actualDuration > 16) {
      console.warn(`🚨 SLOW RENDER: ${id} (${phase}) took ${actualDuration.toFixed(2)}ms (>16ms = <60fps)`);
    }

    if (actualDuration > 50) {
      console.error(`💥 CRITICAL: ${id} blocked main thread for ${actualDuration.toFixed(2)}ms!`);
    }

    if (id.includes('YearLessonCell') && actualDuration > 5) {
      console.warn(`📱 YearLessonCell ${id} zu langsam: ${actualDuration.toFixed(2)}ms`);
    }

    if (id.includes('YearlyGrid') && actualDuration > 20) {
      console.error(`📊 YearlyGrid ${id} blockiert: ${actualDuration.toFixed(2)}ms`);
    }
  }
};

// ✅ Display-Skalierung VOR React-Render initialisieren
initializeDisplayScaling();

ReactDOM.createRoot(document.getElementById('root')).render(
  <Profiler id="RootApp" onRender={onRenderCallback}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>

      {/* Optional: React Query Devtools – nur in Development sichtbar */}
      {/* {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />} */}
    </QueryClientProvider>
  </Profiler>
);