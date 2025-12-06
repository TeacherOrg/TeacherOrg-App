// src/components/yearly/SlotPickerModal.jsx
import React from 'react';
import { X } from 'lucide-react';

export default function SlotPickerModal({
  isOpen,
  onClose,
  onSelect,
  week,
  year,
  subjects = [],
  occupiedSlots = new Set(), // z.B. new Set(['subjectId-3', 'subjectId-5'])
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">
            Ziel-Slot in <span className="text-blue-600">KW {week}</span> {year !== new Date().getFullYear() && `(${year})`}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {subjects.map((subject) => (
            <div key={subject.id} className="border-b pb-4 last:border-0">
              <h4 className="font-bold text-lg mb-3 text-slate-800 dark:text-slate-200">
                {subject.name}
              </h4>
              <div className="grid grid-cols-8 gap-2">
                {Array.from({ length: subject.lessons_per_week || 4 }, (_, i) => i + 1).map((num) => {
                  const key = `${subject.id}-${num}`;
                  const isOccupied = occupiedSlots.has(key);

                  return (
                    <button
                      key={num}
                      onClick={() =>
                        onSelect({
                          week_number: week,
                          school_year: year,
                          subject: subject.id,
                          lesson_number: num,
                          subjectName: subject.name,
                        })
                      }
                      disabled={isOccupied}
                      className={`
                        h-14 rounded-xl font-bold text-lg transition-all
                        ${isOccupied
                          ? 'bg-red-100 dark:bg-red-900/40 text-red-600 cursor-not-allowed'
                          : 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 hover:dark:bg-emerald-800 text-emerald-700 hover:scale-110 shadow-md'
                        }
                      `}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}