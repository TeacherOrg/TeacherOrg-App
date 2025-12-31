import React from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Section for configuring double lessons.
 * Handles both "unified" (90-min single block) and "split" (two separate lessons) modes.
 *
 * @param {Object} props
 * @param {boolean} props.isDoubleLesson - Whether double lesson is enabled
 * @param {boolean} props.addSecondLesson - Whether to add second lesson content
 * @param {boolean} props.isUnifiedDouble - Whether to use unified 90-min mode
 * @param {string} props.secondName - Name of the second lesson
 * @param {string} props.secondYearlyLessonId - ID of linked second yearly lesson
 * @param {Array} props.availableSecondLessons - Available lessons for linking
 * @param {number} props.currentLessonNumber - Current lesson number (for display)
 * @param {string} props.scheduleType - 'fixed' or 'flexible'
 * @param {Function} props.onAddSecondLessonChange - Handler for add second toggle
 * @param {Function} props.onUnifiedDoubleChange - Handler for unified mode toggle
 * @param {Function} props.onSecondNameChange - Handler for second name change
 * @param {Function} props.onSecondLessonSelect - Handler for second lesson selection
 * @param {string} [props.subjectName] - Subject name for display
 */
export function DoubleLessonSection({
  isDoubleLesson,
  addSecondLesson,
  isUnifiedDouble,
  secondName,
  secondYearlyLessonId,
  availableSecondLessons = [],
  currentLessonNumber = 1,
  scheduleType = 'flexible',
  onAddSecondLessonChange,
  onUnifiedDoubleChange,
  onSecondNameChange,
  onSecondLessonSelect,
  subjectName = ''
}) {
  if (!isDoubleLesson) return null;

  const nextLessonNumber = Number(currentLessonNumber) + 1;

  return (
    <div className="space-y-4">
      {/* Second lesson name input */}
      {addSecondLesson && (
        <div className="grid grid-cols-4 items-center gap-4">
          <Label
            htmlFor="second_name"
            className="text-right text-sm font-semibold text-slate-900 dark:text-white"
          >
            Titel (Lektion {nextLessonNumber})
          </Label>
          <Input
            id="second_name"
            value={secondName || ''}
            onChange={(e) => onSecondNameChange(e.target.value)}
            className="col-span-3 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
            placeholder={`Lektion ${nextLessonNumber}`}
            maxLength={30}
          />
        </div>
      )}

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

      {/* Flexible mode: Unified double option */}
      {scheduleType === 'flexible' && (
        <div className="p-3 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              id="unified-double"
              checked={isUnifiedDouble}
              onCheckedChange={onUnifiedDoubleChange}
            />
            <Label
              htmlFor="unified-double"
              className="text-sm font-medium cursor-pointer"
            >
              Als eine 90-Minuten-Lektion planen (ein Steps-Block)
            </Label>
          </div>
          {isUnifiedDouble && (
            <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
              Die Zeit-Spalte erlaubt jetzt bis 90 Minuten. Im Stundenplan wird es trotzdem als Doppellektion angezeigt.
            </p>
          )}
        </div>
      )}

      {/* Second lesson selector (for timetable modal with available lessons) */}
      {availableSecondLessons.length > 0 && addSecondLesson && !isUnifiedDouble && (
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
      {!addSecondLesson && !isUnifiedDouble && scheduleType === 'flexible' && (
        <p className="text-sm text-slate-500 dark:text-slate-400 p-3">
          Die aktuelle Lektion wird einfach als Doppellektion (90 Min) geführt, ohne zusätzliche Inhalte.
        </p>
      )}
    </div>
  );
}

export default DoubleLessonSection;
