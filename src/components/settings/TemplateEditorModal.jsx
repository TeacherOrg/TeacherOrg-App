import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FixedScheduleTemplateEditor from './FixedScheduleTemplateEditor';

export default function TemplateEditorModal({ isOpen, onClose, initialTemplate, onSave, classes, subjects, lessonsPerDay }) {
  const [localTemplate, setLocalTemplate] = useState(initialTemplate || {});
  const [showValidationWarning, setShowValidationWarning] = useState(false);

  useEffect(() => {
    setLocalTemplate(initialTemplate || {});
  }, [initialTemplate]);

  // Calculate how many lessons are distributed per subject+class
  const distributedCounts = useMemo(() => {
    const counts = {};

    Object.keys(localTemplate).forEach(day => {
      (localTemplate[day] || []).forEach(slot => {
        const key = `${slot.subject}_${slot.class_id}`;
        counts[key] = (counts[key] || 0) + 1;
      });
    });

    return counts;
  }, [localTemplate]);

  // Calculate expected lesson counts per subject+class
  const expectedCounts = useMemo(() => {
    const counts = {};

    subjects.forEach(subject => {
      const key = `${subject.name}_${subject.class_id}`;
      // Expected: weekly_lessons (from subject) or default 1
      counts[key] = subject.weekly_lessons || 1;
    });

    return counts;
  }, [subjects]);

  // Find subjects with incomplete distribution
  const incompleteSubjects = useMemo(() => {
    const incomplete = [];

    Object.keys(expectedCounts).forEach(key => {
      const [subjectName, classId] = key.split('_');
      const expected = expectedCounts[key];
      const distributed = distributedCounts[key] || 0;

      if (distributed < expected) {
        const subject = subjects.find(s => s.name === subjectName && s.class_id === classId);
        const className = classes.find(c => c.id === classId)?.name || 'Unbekannt';

        incomplete.push({
          subjectName,
          className,
          expected,
          distributed,
          missing: expected - distributed
        });
      }
    });

    return incomplete;
  }, [expectedCounts, distributedCounts, subjects, classes]);

  const handleSaveClick = () => {
    if (incompleteSubjects.length > 0) {
      setShowValidationWarning(true);
      return;
    }

    onSave(localTemplate);
    onClose();
  };

  const handleForceSubmit = () => {
    onSave(localTemplate);
    setShowValidationWarning(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1100] backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Stundenplan-Vorlage bearbeiten
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Ziehen Sie Fächer in die Zeitfenster, um Ihren fixen Stundenplan zu erstellen
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Validation Warning */}
        {showValidationWarning && incompleteSubjects.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                  Unvollständige Stundenverteilung
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
                  Folgende Fächer haben noch nicht alle Wochenstunden verteilt:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-amber-800 dark:text-amber-300 mb-4">
                  {incompleteSubjects.map((item, idx) => (
                    <li key={idx}>
                      <strong>{item.subjectName}</strong> ({item.className}): {item.distributed}/{item.expected} Stunden
                      <span className="text-amber-700 dark:text-amber-400"> ({item.missing} fehlen)</span>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowValidationWarning(false)}
                    className="border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300"
                  >
                    Zurück zum Editor
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleForceSubmit}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Trotzdem speichern
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <FixedScheduleTemplateEditor
            initialTemplate={localTemplate}
            onSave={setLocalTemplate}
            classes={classes}
            subjects={subjects}
            lessonsPerDay={lessonsPerDay}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {incompleteSubjects.length === 0 ? (
              <span className="text-green-600 dark:text-green-400">✓ Alle Fächer vollständig verteilt</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                ⚠ {incompleteSubjects.length} Fach{incompleteSubjects.length !== 1 ? 'er' : ''} noch nicht vollständig verteilt
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Abbrechen
            </Button>
            <Button
              variant="default"
              onClick={handleSaveClick}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Speichern
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
