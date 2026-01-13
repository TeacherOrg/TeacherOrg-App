import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PlusCircle, Copy } from "lucide-react";
import StepRow from '@/components/lesson-planning/StepRow';
import LessonTemplatePopover from '@/components/lesson-planning/LessonTemplatePopover';

/**
 * Section for managing lesson steps (primary or secondary).
 * Includes step rows, add button, and template popover.
 *
 * @param {Object} props
 * @param {string} props.label - Section label
 * @param {Array} props.steps - Array of step objects
 * @param {Function} props.onAddStep - Handler for adding a new step
 * @param {Function} props.onUpdateStep - Handler for updating a step (id, field, value)
 * @param {Function} props.onRemoveStep - Handler for removing a step (id)
 * @param {Function} props.onInsertTemplate - Handler for inserting template (steps, templateName)
 * @param {string} [props.subjectId] - Subject ID for template filtering
 * @param {Array} [props.topicMaterials] - Materials from current topic
 * @param {string} [props.topicColor] - Color from current topic
 * @param {string} [props.buttonLabel] - Custom label for add button
 * @param {boolean} [props.showSaveAsTemplate] - Whether to show save as template button
 * @param {Function} [props.onSaveAsTemplate] - Handler for save as template
 * @param {string} [props.templateDefaultName] - Default name for template save
 * @param {number} [props.lessonDuration] - Duration of a single lesson in minutes (from settings)
 */
export function StepsSection({
  label,
  steps = [],
  onAddStep,
  onUpdateStep,
  onRemoveStep,
  onInsertTemplate,
  subjectId,
  topicMaterials = [],
  topicColor = '#3b82f6',
  buttonLabel = 'Schritt hinzufügen',
  showSaveAsTemplate = false,
  onSaveAsTemplate,
  templateDefaultName = '',
  lessonDuration = 45
}) {
  return (
    <div className="lesson-steps-section space-y-4">
      <div className="flex items-center gap-2">
        <Label className="font-semibold text-slate-900 dark:text-white">
          {label}
        </Label>
        <LessonTemplatePopover
          subjectId={subjectId}
          onInsert={onInsertTemplate}
          currentSteps={steps}
        />
      </div>

      <div className="space-y-3 p-4 border rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
        {steps.map((step, index) => (
          <StepRow
            key={`step-${index}-${step.id}`}
            step={step}
            onUpdate={(field, value) => onUpdateStep(step.id, field, value)}
            onRemove={() => onRemoveStep(step.id)}
            topicMaterials={topicMaterials}
            topicColor={topicColor}
            isLast={index === steps.length - 1}
            lessonDuration={lessonDuration}
          />
        ))}

        <div className="flex gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onAddStep}
            className="flex-[2] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            <span className="text-slate-900 dark:text-white">{buttonLabel}</span>
          </Button>

          {showSaveAsTemplate && onSaveAsTemplate && (
            <Button
              type="button"
              variant="outline"
              onClick={onSaveAsTemplate}
              className="save-template-button flex-[2] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600"
            >
              <Copy className="w-4 h-4 mr-2" />
              <span className="text-slate-900 dark:text-white">Als Vorlage speichern</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default StepsSection;
