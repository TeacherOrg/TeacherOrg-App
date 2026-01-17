import React from 'react';
import { Button } from "@/components/ui/button";
import { Save, X, Trash2 } from "lucide-react";

/**
 * Footer with action buttons for LessonModals.
 * Includes delete, cancel, save & next, and save buttons.
 *
 * @param {Object} props
 * @param {boolean} props.isEditing - Whether editing an existing lesson
 * @param {boolean} props.isSubmitting - Whether form is currently submitting
 * @param {boolean} [props.isFormValid] - Whether form is valid for submission
 * @param {boolean} [props.canEdit] - Whether user has edit permission (Team Teaching)
 * @param {Function} props.onDelete - Handler for delete action
 * @param {Function} props.onClose - Handler for cancel/close action
 * @param {Function} [props.onSaveAndNext] - Handler for save & next action (optional)
 * @param {string} [props.saveButtonColor] - Background color for save button
 * @param {string} [props.saveButtonTextColor] - Text color for save button
 * @param {string} [props.saveLabel] - Custom label for save button
 * @param {string} [props.deleteLabel] - Custom label for delete button
 */
export function LessonModalFooter({
  isEditing,
  isSubmitting,
  isFormValid = true,
  canEdit = true,
  onDelete,
  onClose,
  onSaveAndNext,
  saveButtonColor = '#3b82f6',
  saveButtonTextColor = 'white',
  saveLabel = 'Speichern',
  deleteLabel = 'Löschen'
}) {
  return (
    <div className="flex justify-between items-center gap-3 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
      <div>
        {isEditing && canEdit && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleteLabel}
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600"
        >
          <X className="w-4 h-4 mr-2" />
          <span className="text-slate-900 dark:text-white">Abbrechen</span>
        </Button>

        {onSaveAndNext && canEdit && (
          <Button
            type="submit"
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isSubmitting || !isFormValid || !canEdit}
            onClick={(e) => {
              // Call the onSaveAndNext callback to set the state
              onSaveAndNext?.();
              // Set flag for save and next before form submission
              e.currentTarget.form?.setAttribute('data-save-and-next', 'true');
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            Speichern & nächste
          </Button>
        )}

        {canEdit ? (
          <Button
            type="submit"
            className="lesson-save-button hover:opacity-90"
            style={{
              background: saveButtonColor,
              color: saveButtonTextColor
            }}
            disabled={isSubmitting || !isFormValid}
            title={!isFormValid ? 'Bitte füllen Sie alle erforderlichen Felder aus.' : ''}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveLabel}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600"
          >
            Schliessen
          </Button>
        )}
      </div>
    </div>
  );
}

export default LessonModalFooter;
