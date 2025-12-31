import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Modal dialog for saving lesson steps as a reusable template.
 * Used by both yearly and timetable LessonModals.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Handler to close the modal
 * @param {string} props.templateName - Current template name input value
 * @param {Function} props.setTemplateName - Setter for template name
 * @param {Function} props.onSave - Handler to save the template
 */
export const TemplateSaveModal = ({
  isOpen,
  onClose,
  templateName,
  setTemplateName,
  onSave
}) => {
  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSave();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 w-96 max-w-[90vw]">
        <h3 className="text-lg font-semibold mb-4">Name der Vorlage</h3>

        <Input
          autoFocus
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="z. B. Einstieg Photosynthese"
          className="mb-4"
        />

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Abbrechen
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={!templateName.trim()}
          >
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TemplateSaveModal;
