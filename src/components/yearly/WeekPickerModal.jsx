// src/components/yearly/WeekPickerModal.jsx
import React from 'react';
import { X } from 'lucide-react';

export default function WeekPickerModal({
  isOpen,
  onClose,
  onWeekSelect, // gibt { week, year } zurück
  currentYear,
  yearViewMode,
  schoolYearStartWeek = 35,
  currentWeek,
}) {
  if (!isOpen) return null;

  const weeks = [];
  if (yearViewMode === 'calendar') {
    for (let w = 1; w <= 52; w++) weeks.push({ week: w, year: currentYear });
  } else {
    for (let w = schoolYearStartWeek; w <= 52; w++) weeks.push({ week: w, year: currentYear });
    for (let w = 1; w < schoolYearStartWeek; w++) weeks.push({ week: w, year: currentYear + 1 });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Woche wählen</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-6 gap-3">
          {weeks.map(({ week, year }) => (
            <button
              key={`${year}-${week}`}
              onClick={() => {
                onWeekSelect(week, year);
                onClose();
              }}
              className={
                week === currentWeek && year === new Date().getFullYear()
                  ? 'py-4 px-3 rounded-xl font-bold text-lg shadow-md transition-all duration-200 bg-gradient-to-br from-orange-500 to-red-600 text-white ring-4 ring-orange-300 scale-110'
                  : 'py-4 px-3 rounded-xl font-bold text-lg shadow-md transition-all duration-200 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:scale-105'
              }
            >
              <div>KW</div>
              <div className="text-2xl">{week}</div>
              {year !== currentYear && <div className="text-xs opacity-80">{year}</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}