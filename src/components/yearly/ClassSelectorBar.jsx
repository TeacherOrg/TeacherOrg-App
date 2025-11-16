import React from 'react';
import { Button } from '@/components/ui/button';

export default function ClassSelectorBar({ classes, activeClassId, onSelectClass }) {
  if (!classes || classes.length === 0) return null;

  const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex items-center justify-center gap-3 py-3 px-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 border-b-2 border-slate-200 dark:border-slate-600 shadow-sm">
      {/* "Alle" Button nur bei mehr als einer Klasse */}
      {classes.length > 1 && (
        <Button
          variant={activeClassId === null ? "default" : "outline"}
          size="lg"
          onClick={() => onSelectClass(null)}
          className="font-semibold whitespace-nowrap"
        >
          Alle Klassen
        </Button>
      )}

      {/* Klassen-Buttons */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {sortedClasses.map((cls) => (
          <Button
            key={cls.id}
            variant={activeClassId === cls.id ? "default" : "outline"}
            size="lg"
            onClick={() => onSelectClass(cls.id)}
            className="font-semibold min-w-28 whitespace-nowrap"
          >
            {cls.name}
          </Button>
        ))}
      </div>
    </div>
  );
}