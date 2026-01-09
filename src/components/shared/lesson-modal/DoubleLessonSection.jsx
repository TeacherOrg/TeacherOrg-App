import React from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Section for configuring double lessons.
 * In flexible mode: links two separate lessons
 * In fixed mode: template-based unified 90-min blocks
 *
 * @param {Object} props
 * @param {boolean} props.isDoubleLesson - Whether double lesson is enabled
 * @param {boolean} props.addSecondLesson - Whether to add second lesson content
 * @param {string} props.secondName - Name of the second lesson
 * @param {string} props.secondYearlyLessonId - ID of linked second yearly lesson
 * @param {Array} props.availableSecondLessons - Available lessons for linking
 * @param {number} props.currentLessonNumber - Current lesson number (for display)
 * @param {string} props.scheduleType - 'fixed' or 'flexible'
 * @param {Function} props.onAddSecondLessonChange - Handler for add second toggle
 * @param {Function} props.onSecondNameChange - Handler for second name change
 * @param {Function} props.onSecondLessonSelect - Handler for second lesson selection
 * @param {string} [props.subjectName] - Subject name for display
 */
export function DoubleLessonSection({
  isDoubleLesson,
  addSecondLesson,
  secondName,
  secondYearlyLessonId,
  availableSecondLessons = [],
  currentLessonNumber = 1,
  scheduleType = 'flexible',
  onAddSecondLessonChange,
  onSecondNameChange,
  onSecondLessonSelect,
  subjectName = ''
}) {
  if (!isDoubleLesson) return null;

  const nextLessonNumber = Number(currentLessonNumber) + 1;

  return (
    <div className="space-y-4">
      {/* Flexible mode: Option to add second lesson content */}
      {scheduleType === 'flexible' && (
        <div className="p-3 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              id="add-second-content"
              checked={addSecondLesson}
              onCheckedChange={onAddSecondLessonChange}
            />
            <Label
              htmlFor="add-second-content"
              className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer"
            >
              Inhalte aus zweiter Lektion bearbeiten
            </Label>
          </div>

          {addSecondLesson && secondYearlyLessonId && (
            <div className="text-xs text-slate-600 dark:text-slate-400 pl-8">
              Verknüpft mit: <span className="font-medium">
                {secondName || `Lektion ${nextLessonNumber}`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Second lesson selector (for timetable modal with available lessons) */}
      {availableSecondLessons.length > 0 && addSecondLesson && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-900 dark:text-white">
            Zweite Lektion auswählen
          </Label>
          <Select
            value={secondYearlyLessonId || ''}
            onValueChange={onSecondLessonSelect}
          >
            <SelectTrigger className="bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
              <SelectValue placeholder="Lektion zum Hinzufügen auswählen" />
            </SelectTrigger>
            <SelectContent>
              {availableSecondLessons.map(yl => (
                <SelectItem key={yl.id} value={yl.id}>
                  {yl.name || `Lektion ${yl.lesson_number}`}
                  {yl.notes ? ` - ${yl.notes}` : ''}
                  {yl.isScheduled ? ' (bereits geplant)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {availableSecondLessons.length === 0 && subjectName && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Alle nachfolgenden Lektionen für {subjectName} sind bereits geplant oder nicht verfügbar.
            </p>
          )}
        </div>
      )}

      {/* Info when no second lesson content */}
      {!addSecondLesson && scheduleType === 'flexible' && (
        <p className="text-sm text-slate-500 dark:text-slate-400 p-3">
          Die aktuelle Lektion wird einfach als Doppellektion (90 Min) geführt, ohne zusätzliche Inhalte.
        </p>
      )}
    </div>
  );
}

export default DoubleLessonSection;
