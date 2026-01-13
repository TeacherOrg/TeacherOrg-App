import React from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { emitTourEvent, TOUR_EVENTS } from '@/components/onboarding/tours/tourEvents';

/**
 * Row of toggle switches for lesson properties.
 * Used by both timetable and yearly LessonModals.
 *
 * @param {Object} props
 * @param {boolean} props.isHalfClass - Half class toggle state
 * @param {boolean} props.isDoubleLesson - Double lesson toggle state
 * @param {boolean} props.isExam - Exam toggle state
 * @param {Function} props.onHalfClassChange - Handler for half class toggle
 * @param {Function} props.onDoubleLessonChange - Handler for double lesson toggle
 * @param {Function} props.onExamChange - Handler for exam toggle
 * @param {React.ReactNode} [props.extraToggles] - Additional toggles (e.g., Allerlei for timetable)
 * @param {string} [props.className] - Additional CSS classes
 */
export function LessonTogglesRow({
  isHalfClass = false,
  isDoubleLesson = false,
  isExam = false,
  onHalfClassChange,
  onDoubleLessonChange,
  onExamChange,
  extraToggles,
  className = ''
}) {
  return (
    <div className={`lesson-toggles-row flex flex-wrap items-center justify-around gap-x-6 gap-y-4 p-3 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="flex items-center gap-2">
        <Switch
          id="half-class"
          checked={isHalfClass}
          onCheckedChange={onHalfClassChange}
        />
        <Label
          htmlFor="half-class"
          className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer"
        >
          Halbklasse
        </Label>
      </div>

      <div className="double-lesson-toggle flex items-center gap-2">
        <Switch
          id="double-lesson"
          checked={isDoubleLesson}
          onCheckedChange={(checked) => {
            onDoubleLessonChange(checked);
            if (checked) {
              emitTourEvent(TOUR_EVENTS.DOUBLE_LESSON_TOGGLED);
            }
          }}
        />
        <Label
          htmlFor="double-lesson"
          className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer"
        >
          Doppellektion
        </Label>
      </div>

      {extraToggles}

      <div className="flex items-center gap-2">
        <Switch
          id="exam"
          checked={isExam}
          onCheckedChange={onExamChange}
        />
        <Label
          htmlFor="exam"
          className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer"
        >
          Prüfung
        </Label>
      </div>
    </div>
  );
}

export default LessonTogglesRow;
