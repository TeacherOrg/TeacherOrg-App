import { useState, useCallback } from 'react';
import pb from '@/api/pb';

/**
 * Custom hook for managing template save modal state and logic.
 * Used by both yearly and timetable LessonModals.
 *
 * @returns {Object} Template save state and handlers
 */
export const useTemplateSaveModal = () => {
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState('');

  /**
   * Save steps as a reusable template
   * @param {Array} steps - The steps to save as template
   * @param {string|null} subjectId - Optional subject ID to associate with template
   */
  const handleSaveAsTemplate = useCallback(async (steps, subjectId = null) => {
    if (!templateName.trim()) return;

    try {
      await pb.collection('lesson_templates').create({
        name: templateName.trim(),
        steps: steps,
        subject: subjectId || null,
        user_id: pb.authStore.model.id,
        is_global: false,
      });

      // Dynamic import to avoid circular dependencies
      import('react-hot-toast').then(({ toast }) => toast.success("Vorlage gespeichert!"));
      setShowTemplateSave(false);
      setTemplateName('');
    } catch (err) {
      import('react-hot-toast').then(({ toast }) => toast.error("Fehler beim Speichern"));
    }
  }, [templateName]);

  const openTemplateSave = useCallback(() => {
    setShowTemplateSave(true);
  }, []);

  const closeTemplateSave = useCallback(() => {
    setShowTemplateSave(false);
    setTemplateName('');
  }, []);

  return {
    // State
    showTemplateSave,
    templateName,

    // Setters
    setTemplateName,

    // Actions
    handleSaveAsTemplate,
    openTemplateSave,
    closeTemplateSave
  };
};

export default useTemplateSaveModal;
