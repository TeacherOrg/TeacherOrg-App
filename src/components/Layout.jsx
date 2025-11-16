import React from 'react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="px-4 sm:px-6 py-4 shadow-sm transition-colors duration-300 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white tracking-tight">
          TimeGrid
        </h1>
        {/* Add other header elements here as needed, e.g., navigation, buttons */}
      </header>
      <main>
        {children}
      </main>
    </div>
  );
}
