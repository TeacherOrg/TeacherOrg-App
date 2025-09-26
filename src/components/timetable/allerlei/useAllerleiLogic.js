import { useState, useEffect, useCallback } from 'react';
import { handleAllerleiUnlink, validateAllerlei } from './AllerleiUtils';
import { Lesson, YearlyLesson } from '@/api/entities';

const WORK_FORMS = ['👤 Single', '👥 Partner', '👨‍👩‍👧‍👦 Group', '🏛️ Plenum'];

export const useAllerleiLogic = ({
  initialData,
  yearlyLessons,
  allLessons,
  timeSlots,
  currentWeek,
  currentPosition,
  subjectOptions,
  onToggleChange,
  onSubjectsChange,
  onLessonsChange,
  onStepsChange,
  onIntegratedDataChange
}) => {
  const [isAllerlei, setIsAllerlei] = useState(initialData.is_allerlei || false);
  const [allerleiSubjects, setAllerleiSubjects] = useState(initialData.allerlei_subjects || []);
  const [selectedLessons, setSelectedLessons] = useState({});
  const [allerleiSteps, setAllerleiSteps] = useState({});
  const [integratedOriginalData, setIntegratedOriginalData] = useState({});

  const generateId = useCallback(() => Math.random().toString(36).substr(2, 9), []);

  // Initialize selectedLessons from initial data
  useEffect(() => {
    if (initialData.allerlei_yearly_lesson_ids && initialData.allerlei_subjects) {
      const initialSelected = {};
      initialData.allerlei_yearly_lesson_ids.forEach((id, index) => {
        if (initialData.allerlei_subjects[index] && id) {
          initialSelected[index] = id;
        }
      });
      setSelectedLessons(initialSelected);
    }
  }, [initialData.allerlei_yearly_lesson_ids, initialData.allerlei_subjects]);

  const getCurrentLessonPosition = useCallback(() => {
    return currentPosition || { dayOrder: 0, period: 0 };
  }, [currentPosition]);

  const getAvailableAllerleiLessons = useCallback((subjectName, subjectIndex) => {
    if (!subjectName) return [];

    // Filter valid subjects for active class
    const validSubjectNames = subjectOptions.map(s => s.name);
    if (!validSubjectNames.includes(subjectName)) return [];

    const currentPosition = getCurrentLessonPosition();
    const subjectYearlyLessons = yearlyLessons
      .filter(yl => 
        (yl.subject_name === subjectName || yl.expand?.subject?.name === subjectName) && 
        yl.week_number === currentWeek
      )
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));

    // Get scheduled lessons for this subject
    const scheduledLessonsForSubject = allLessons
      .filter(l => 
        (l.subject_name === subjectName || l.expand?.subject?.name === subjectName) && 
        l.week_number === currentWeek && 
        l.yearly_lesson_id
      )
      .map(l => {
        const dayOrderMap = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
        const dayOrder = dayOrderMap[l.day_of_week.toLowerCase()] || 0;
        return {
          yearly_lesson_id: l.yearly_lesson_id,
          dayOrder,
          period: l.period_slot,
          isBeforeCurrent: dayOrder < currentPosition.dayOrder || 
                          (dayOrder === currentPosition.dayOrder && l.period_slot < currentPosition.period),
          isHidden: l.is_hidden
        };
      });

    // Filter available lessons
    const availableLessons = subjectYearlyLessons.filter(yl => {
      // Always show currently selected lesson
      const isCurrentlySelected = selectedLessons[subjectIndex] === yl.id;
      if (isCurrentlySelected) return true;

      // Don't show lessons scheduled before current position (unless hidden)
      const scheduledBefore = scheduledLessonsForSubject.some(sl => 
        sl.yearly_lesson_id === yl.id && sl.isBeforeCurrent && !sl.isHidden
      );
      if (scheduledBefore) return false;

      // Prevent duplicates in other Allerlei lessons
      const isDuplicateInOtherAllerlei = allLessons.some(l => 
        l.is_allerlei && l.week_number === currentWeek && 
        l.allerlei_yearly_lesson_ids?.includes(yl.id) && 
        l.id !== initialData.id // Exclude current lesson if editing
      );
      if (isDuplicateInOtherAllerlei) return false;

      return true;
    });

    return availableLessons;
  }, [yearlyLessons, allLessons, currentWeek, selectedLessons, subjectOptions, getCurrentLessonPosition, initialData.id]);

  // Load steps when lessons are selected
  useEffect(() => {
    if (!isAllerlei) return;
    
    const newSteps = {};
    Object.entries(selectedLessons).forEach(([idx, lessonId]) => {
      if (!lessonId) return;
      
      const yearlyLesson = yearlyLessons.find(yl => yl.id === lessonId);
      if (yearlyLesson && yearlyLesson.steps) {
        newSteps[idx] = yearlyLesson.steps.map(step => ({
          ...step,
          id: `allerlei-${idx}-${generateId()}-${step.id || generateId()}`
        }));
      } else {
        newSteps[idx] = [];
      }
    });
    
    // Vermeide unnötige Updates, indem wir prüfen, ob newSteps sich geändert hat
    setAllerleiSteps(prev => {
      if (JSON.stringify(prev) === JSON.stringify(newSteps)) {
        return prev;
      }
      return newSteps;
    });
    onStepsChange?.(newSteps);
  }, [isAllerlei, selectedLessons, yearlyLessons, generateId, onStepsChange]);

  const handleToggle = useCallback(async (checked) => {
    setIsAllerlei(checked);
    onToggleChange?.(checked);
    
    if (!checked && Object.keys(selectedLessons).length > 0) {
      const lessonIds = Object.values(selectedLessons).filter(Boolean);
      await handleAllerleiUnlink(
        lessonIds, 
        allLessons, 
        timeSlots, 
        currentWeek, 
        integratedOriginalData
      );
      setSelectedLessons({});
      setAllerleiSteps({});
      setIntegratedOriginalData({});
    }
  }, [allLessons, timeSlots, currentWeek, integratedOriginalData, onToggleChange]);

  const addSubject = useCallback(() => {
    const newIndex = allerleiSubjects.length;
    const newSubjects = [...allerleiSubjects, ''];
    setAllerleiSubjects(newSubjects);
    onSubjectsChange?.(newSubjects);
    setSelectedLessons(prev => ({ ...prev, [newIndex]: null }));
  }, [allerleiSubjects, onSubjectsChange]);

  const removeSubject = useCallback((index) => {
    const newSubjects = allerleiSubjects.filter((_, i) => i !== index);
    const newSelected = { ...selectedLessons };
    const newSteps = { ...allerleiSteps };
    
    // Reindex remaining subjects
    delete newSelected[index];
    delete newSteps[index];
    
    Object.keys(newSelected).forEach(key => {
      const idx = parseInt(key);
      if (idx > index) {
        newSelected[idx - 1] = newSelected[idx];
        delete newSelected[idx];
        newSteps[idx - 1] = newSteps[idx];
        delete newSteps[idx];
      }
    });
    
    setAllerleiSubjects(newSubjects);
    setSelectedLessons(newSelected);
    setAllerleiSteps(newSteps);
    onSubjectsChange?.(newSubjects);
    onLessonsChange?.(newSelected);
    onStepsChange?.(newSteps);
  }, [allerleiSubjects, selectedLessons, allerleiSteps, onSubjectsChange, onLessonsChange, onStepsChange]);

  const updateSubject = useCallback((index, value) => {
    const newSubjects = [...allerleiSubjects];
    newSubjects[index] = value;
    
    // Clear lesson selection when subject changes
    const newSelected = { ...selectedLessons };
    delete newSelected[index];
    const newSteps = { ...allerleiSteps };
    delete newSteps[index];
    
    setAllerleiSubjects(newSubjects);
    setSelectedLessons(newSelected);
    setAllerleiSteps(newSteps);
    onSubjectsChange?.(newSubjects);
    onLessonsChange?.(newSelected);
    onStepsChange?.(newSteps);
  }, [allerleiSubjects, selectedLessons, allerleiSteps, onSubjectsChange, onLessonsChange, onStepsChange]);

  const selectLesson = useCallback((subjectIndex, lessonId) => {
    setSelectedLessons(prev => ({ ...prev, [subjectIndex]: lessonId }));
    onLessonsChange?.({ ...selectedLessons, [subjectIndex]: lessonId });
  }, [selectedLessons, onLessonsChange]);

  const updateStep = useCallback((subjectIndex, stepId, field, value) => {
    setAllerleiSteps(prev => ({
      ...prev,
      [subjectIndex]: prev[subjectIndex]?.map(step => 
        step.id === stepId ? { ...step, [field]: value } : step
      ) || []
    }));
    onStepsChange?.(allerleiSteps);
  }, [allerleiSteps, onStepsChange]);

  const addStep = useCallback((subjectIndex) => {
    setAllerleiSteps(prev => ({
      ...prev,
      [subjectIndex]: [...(prev[subjectIndex] || []), {
        id: `allerlei-${subjectIndex}-${generateId()}`,
        time: null,
        workForm: '',
        activity: '',
        material: ''
      }]
    }));
    onStepsChange?.(allerleiSteps);
  }, [generateId, allerleiSteps, onStepsChange]);

  const removeStep = useCallback((subjectIndex, stepId) => {
    setAllerleiSteps(prev => ({
      ...prev,
      [subjectIndex]: prev[subjectIndex]?.filter(step => step.id !== stepId) || []
    }));
    onStepsChange?.(allerleiSteps);
  }, [allerleiSteps, onStepsChange]);

  const getAllerleiYearlyLessonIds = useCallback(() => {
    return allerleiSubjects.map((_, index) => selectedLessons[index] || null);
  }, [allerleiSubjects, selectedLessons]);

  const validate = useCallback(() => {
    const data = {
      is_allerlei: isAllerlei,
      allerlei_subjects: allerleiSubjects,
      allerlei_yearly_lesson_ids: getAllerleiYearlyLessonIds()
    };
    if (!validateAllerlei(data)) return false;

    // Check duplicates
    const uniqueIds = new Set(data.allerlei_yearly_lesson_ids.filter(id => id));
    if (uniqueIds.size !== data.allerlei_yearly_lesson_ids.length) {
      throw new Error('Keine doppelten Lektionen in Allerlei erlaubt.');
    }

    // Check no already-scheduled non-hidden
    for (const id of uniqueIds) {
      const isScheduledVisible = allLessons.some(l => l.yearly_lesson_id === id && l.week_number === currentWeek && !l.is_hidden);
      if (isScheduledVisible) {
        throw new Error('Kann keine bereits sichtbar geplante Lektion in Allerlei integrieren.');
      }
    }

    return true;
  }, [isAllerlei, allerleiSubjects, selectedLessons, allLessons, currentWeek]);

  return {
    // States
    isAllerlei,
    allerleiSubjects,
    selectedLessons,
    allerleiSteps,
    integratedOriginalData,
    
    // Handlers
    handleToggle,
    addSubject,
    removeSubject,
    updateSubject,
    selectLesson,
    updateStep,
    addStep,
    removeStep,
    
    // Computed
    getAvailableAllerleiLessons,
    getAllerleiYearlyLessonIds,
    
    // Actions
    validate,
    
    // Callbacks for parent
    setIntegratedOriginalData: onIntegratedDataChange || setIntegratedOriginalData
  };
};