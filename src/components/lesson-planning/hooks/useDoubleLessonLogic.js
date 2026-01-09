import { useState, useEffect, useCallback, useMemo } from 'react';
import { generateId } from '../utils';

/**
 * Custom hook for managing double lesson logic.
 * Handles linking primary and secondary lessons, unified mode, and state management.
 * Used by both yearly and timetable LessonModals.
 *
 * @param {Object} options
 * @param {Object} options.lesson - Current lesson being edited (or null for new)
 * @param {Object} options.newLessonSlot - Slot info for new lesson (or null for edit)
 * @param {Array} options.allYearlyLessons - All yearly lessons for finding linked lessons
 * @param {number} options.currentWeek - Current week number
 * @param {number} options.currentYear - Current school year
 * @param {Object} options.settings - App settings (for scheduleType)
 * @param {boolean} options.isTemplateDoubleLesson - Whether this is a template double
 * @param {Function} options.setSecondSteps - Setter for secondary steps
 * @returns {Object} Double lesson state and handlers
 */
export const useDoubleLessonLogic = ({
  lesson,
  newLessonSlot,
  allYearlyLessons = [],
  currentWeek,
  currentYear,
  settings,
  isTemplateDoubleLesson = false,
  setSecondSteps
}) => {
  const currentLesson = lesson || newLessonSlot;

  // State
  const [isDoubleLesson, setIsDoubleLesson] = useState(false);
  const [addSecondLesson, setAddSecondLesson] = useState(false);
  const [secondYearlyLessonId, setSecondYearlyLessonId] = useState('');
  const [secondName, setSecondName] = useState('');

  // Initialize state when lesson changes
  useEffect(() => {
    if (!currentLesson) return;

    const hasSecondLesson = !!currentLesson.second_yearly_lesson_id;
    const isDouble = currentLesson.is_double_lesson || isTemplateDoubleLesson;

    setIsDoubleLesson(isDouble);
    setSecondYearlyLessonId(currentLesson.second_yearly_lesson_id || '');

    // Determine mode based on lesson state
    // In fixed mode (template), no second lesson editing
    // In flexible mode, always use separate second lesson linking
    if (isTemplateDoubleLesson) {
      setAddSecondLesson(false);
    } else if (hasSecondLesson || isDouble) {
      setAddSecondLesson(true);
    } else {
      setAddSecondLesson(false);
    }

    // Load second lesson name
    if (hasSecondLesson) {
      const secondLesson = allYearlyLessons.find(
        yl => String(yl.id) === String(currentLesson.second_yearly_lesson_id)
      );
      setSecondName(
        secondLesson?.name ||
        `Lektion ${Number(currentLesson.lesson_number || 1) + 1}`
      );
    } else {
      setSecondName('');
    }
  }, [currentLesson, isTemplateDoubleLesson, allYearlyLessons]);

  // Find available second lessons (next lesson number, not already scheduled)
  const availableSecondLessons = useMemo(() => {
    if (!currentLesson?.subject || !isDoubleLesson) return [];

    const currentNum = Number(currentLesson.lesson_number);
    const subjectLessons = allYearlyLessons
      .filter(yl =>
        yl.subject === currentLesson.subject &&
        yl.week_number === currentLesson.week_number &&
        Number(yl.lesson_number) === currentNum + 1
      );

    return subjectLessons;
  }, [currentLesson, allYearlyLessons, isDoubleLesson]);

  // Handle double lesson toggle
  const handleDoubleLessonToggle = useCallback((checked) => {
    setIsDoubleLesson(checked);

    if (checked) {
      setAddSecondLesson(true);

      // Auto-select next lesson if available
      if (availableSecondLessons.length > 0 && !secondYearlyLessonId) {
        const nextLesson = availableSecondLessons[0];
        setSecondYearlyLessonId(nextLesson.id);
        setSecondName(nextLesson.name || `Lektion ${Number(currentLesson?.lesson_number || 1) + 1}`);

        // Load steps from second lesson
        if (nextLesson.steps && setSecondSteps) {
          setSecondSteps(nextLesson.steps.map(step => ({
            ...step,
            id: `second-${step.id || generateId()}`
          })));
        }
      }
    } else {
      // Reset all double lesson state
      setAddSecondLesson(false);
      setSecondYearlyLessonId('');
      setSecondName('');
      if (setSecondSteps) {
        setSecondSteps([]);
      }
    }
  }, [availableSecondLessons, secondYearlyLessonId, currentLesson, setSecondSteps]);

  // Handle add second lesson toggle
  const handleAddSecondLessonToggle = useCallback((checked) => {
    setAddSecondLesson(checked);

    if (!checked) {
      setSecondYearlyLessonId('');
      setSecondName('');
      if (setSecondSteps) {
        setSecondSteps([]);
      }
    } else if (checked && availableSecondLessons.length > 0) {
      // Auto-link to next lesson
      const nextLesson = availableSecondLessons[0];
      setSecondYearlyLessonId(nextLesson.id);
      setSecondName(nextLesson.name || `Lektion ${Number(currentLesson?.lesson_number || 1) + 1}`);

      if (nextLesson.steps && setSecondSteps) {
        setSecondSteps(nextLesson.steps.map(step => ({
          ...step,
          id: `second-${step.id || generateId()}`
        })));
      }
    }
  }, [availableSecondLessons, currentLesson, setSecondSteps]);

  // Handle second lesson selection
  const handleSecondLessonSelect = useCallback((yearlyLessonId) => {
    setSecondYearlyLessonId(yearlyLessonId);

    if (!yearlyLessonId) {
      setSecondName('');
      if (setSecondSteps) {
        setSecondSteps([]);
      }
      return;
    }

    const selectedLesson = allYearlyLessons.find(yl => yl.id === yearlyLessonId);
    if (selectedLesson) {
      setSecondName(selectedLesson.name || `Lektion ${selectedLesson.lesson_number}`);

      if (selectedLesson.steps && setSecondSteps) {
        setSecondSteps(selectedLesson.steps.map(step => ({
          ...step,
          id: `second-${generateId()}-${step.id || generateId()}`
        })));
      }
    }
  }, [allYearlyLessons, setSecondSteps]);

  // Handle second name change
  const handleSecondNameChange = useCallback((name) => {
    setSecondName(name);
  }, []);

  // Get form data for double lesson
  const getDoubleLessonFormData = useCallback(() => {
    return {
      is_double_lesson: isDoubleLesson,
      second_yearly_lesson_id: addSecondLesson ? secondYearlyLessonId : null,
      second_name: secondName
    };
  }, [isDoubleLesson, addSecondLesson, secondYearlyLessonId, secondName]);

  return {
    // State
    isDoubleLesson,
    addSecondLesson,
    secondYearlyLessonId,
    secondName,
    availableSecondLessons,

    // Setters (for external control if needed)
    setIsDoubleLesson,
    setAddSecondLesson,
    setSecondYearlyLessonId,
    setSecondName,

    // Handlers
    handleDoubleLessonToggle,
    handleAddSecondLessonToggle,
    handleSecondLessonSelect,
    handleSecondNameChange,

    // Utilities
    getDoubleLessonFormData
  };
};

export default useDoubleLessonLogic;
