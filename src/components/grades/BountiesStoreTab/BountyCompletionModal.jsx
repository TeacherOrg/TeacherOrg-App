import React, { useState, useMemo } from 'react';
import { X, Check, Users, Coins, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStudentSortPreference } from '@/hooks/useStudentSortPreference';
import { sortStudents } from '@/utils/studentSortUtils';

/**
 * BountyCompletionModal - Select students who completed a bounty
 */
export default function BountyCompletionModal({ bounty, students = [], onClose, onSubmit }) {
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortPreference] = useStudentSortPreference();

  // Sort students by global preference
  const sortedStudents = useMemo(() =>
    sortStudents(students, sortPreference),
    [students, sortPreference]
  );

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAll = () => {
    setSelectedStudents(sortedStudents.map(s => s.id));
  };

  const selectNone = () => {
    setSelectedStudents([]);
  };

  const handleSubmit = async () => {
    if (selectedStudents.length === 0) return;

    setIsSubmitting(true);
    try {
      // Note: awardCurrencyFn will be handled by the bounty manager
      // which creates currency transactions for each student
      await onSubmit(bounty.id, selectedStudents);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{bounty.title}</h3>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <Coins className="w-4 h-4 text-amber-500" />
              {bounty.reward} Punkte pro Schüler
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Wähle die Schüler aus, die das Bounty erledigt haben:
            </p>
            <div className="flex gap-2 text-xs">
              <button onClick={selectAll} className="text-purple-600 hover:underline">
                Alle
              </button>
              <span className="text-slate-400">|</span>
              <button onClick={selectNone} className="text-purple-600 hover:underline">
                Keine
              </button>
            </div>
          </div>

          {/* Student List */}
          <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2 dark:border-slate-700">
            {sortedStudents.map(student => {
              const isSelected = selectedStudents.includes(student.id);

              return (
                <button
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`
                    w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left
                    ${isSelected
                      ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                    }
                  `}
                >
                  <div className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                    ${isSelected
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                    }
                  `}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                  <span className="font-medium">{student.name}</span>
                </button>
              );
            })}

            {sortedStudents.length === 0 && (
              <p className="text-center text-slate-500 py-4">
                Keine Schüler in dieser Klasse
              </p>
            )}
          </div>

          {/* Selected Count */}
          {selectedStudents.length > 0 && (
            <div className="mt-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  {selectedStudents.length} Schüler ausgewählt
                </span>
                <span className="flex items-center gap-1 font-medium text-amber-600">
                  <Coins className="w-4 h-4" />
                  {selectedStudents.length * bounty.reward} Punkte total
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedStudents.length === 0 || isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Bounty abschliessen
          </Button>
        </div>
      </div>
    </div>
  );
}
