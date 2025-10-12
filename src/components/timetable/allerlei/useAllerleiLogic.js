import { useState, useEffect, useCallback, useRef } from 'react';
import { allerleiService } from '@/components/timetable/hooks/allerleiService';  

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
  onIntegratedDataChange,
  initialLessonId  
}) => {
  const [isAllerlei, setIsAllerlei] = useState(!!initialData.id);
  const [allerleiSubjects, setAllerleiSubjects] = useState(initialData.allerlei_subjects || []);
  const [selectedLessons, setSelectedLessons] = useState({});
  const [allerleiSteps, setAllerleiSteps] = useState({});
  const [integratedOriginalData, setIntegratedOriginalData] = useState({});

  const isInitialized = useRef(false);

  const generateId = useCallback(() => Math.random().toString(36).substr(2, 9), []);

  // Initialize from initial data
  useEffect(() => {
    if (isInitialized.current) return;

    isInitialized.current = true;

    if (initialData.primary_yearly_lesson_id && initialData.added_yearly_lesson_ids) {
      const initialSelected = {};
      initialSelected[0] = initialData.primary_yearly_lesson_id;
      initialData.added_yearly_lesson_ids.forEach((id, index) => {
        if (initialData.allerlei_subjects[index + 1] && id) {
          initialSelected[index + 1] = id;
        }
      });
      console.log('Debug: useAllerleiLogic init - initialSelected:', initialSelected, 'initialData:', initialData);
      setSelectedLessons(initialSelected);
      setIsAllerlei(true);
      setAllerleiSubjects(initialData.allerlei_subjects || []);
    } else {
      // Set primary lesson based on initiating lesson
      const initiatingSubject = initialData.subject || initialLessonId ? allLessons.find(l => l.id === initialLessonId)?.subject : '';
      console.log('Debug: useAllerleiLogic init - Initiating subject:', initiatingSubject, 'InitialData:', initialData, 'InitialLessonId:', initialLessonId);
      
      // NEU: Füge diesen Block hier ein (direkt nach der console.log)
      if (!initiatingSubject) {
        console.warn('No initiating subject provided; skipping primary lesson setup.');
        setSelectedLessons({});
        setAllerleiSteps({});
        setIntegratedOriginalData({});
        setIsAllerlei(false);
        setAllerleiSubjects([]);
        return;  // Early return, um den Rest zu überspringen
      }
      // ENDE DES NEUEN BLOCKS
      
      const primaryYl = yearlyLessons.find(yl => yl.subject === initiatingSubject && yl.week_number === currentWeek);
      if (primaryYl) {
        console.log('Debug: useAllerleiLogic init - Setting primary lesson:', primaryYl.id, 'Subject:', primaryYl.subject_name || primaryYl.expand?.subject?.name);
        setSelectedLessons({ 0: primaryYl.id });
        setAllerleiSubjects(['']);
        setIsAllerlei(true);
      } else {
        console.warn('Debug: useAllerleiLogic init - No yearly lesson found for initiating subject:', initiatingSubject, 'Week:', currentWeek);
        setSelectedLessons({});
        setAllerleiSteps({});
        setIntegratedOriginalData({});
        setIsAllerlei(false);
        setAllerleiSubjects([]);
      }
    }
  }, [
    initialData.primary_yearly_lesson_id,
    initialData.added_yearly_lesson_ids,
    initialData.allerlei_subjects,
    initialData.subject,
    initialLessonId,
    allLessons,
    yearlyLessons,
    currentWeek,
    subjectOptions
  ]);

  // Load steps when lessons are selected
  useEffect(() => {
    if (!isAllerlei) {
      setAllerleiSteps({});
      onStepsChange?.({});
      return;
    }

    const newSteps = {};
    let hasChanges = false;
    Object.entries(selectedLessons).forEach(([idx, lessonId]) => {
      if (!lessonId) {
        newSteps[idx] = [];
        hasChanges = true;
        return;
      }

      const yearlyLesson = yearlyLessons.find(yl => yl.id === lessonId);
      if (yearlyLesson && yearlyLesson.steps) {
        newSteps[idx] = yearlyLesson.steps.map(step => ({
          ...step,
          id: `allerlei-${idx}-${generateId()}-${step.id || generateId()}`
        }));
        hasChanges = true;
      } else {
        newSteps[idx] = [];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setAllerleiSteps(newSteps);
      onStepsChange?.(newSteps);
    }
  }, [isAllerlei, selectedLessons, yearlyLessons, generateId]);

  const getCurrentLessonPosition = useCallback(() => {
    return currentPosition || { dayOrder: 0, period: 0 };
  }, [currentPosition]);

  const getAvailableAllerleiLessons = useCallback((subjectName, subjectIndex) => {
    if (!subjectName) return [];

    const validSubjectNames = subjectOptions.map(s => s.name);
    if (!validSubjectNames.includes(subjectName)) return [];

    const currentPosition = getCurrentLessonPosition();
    const subjectYearlyLessons = yearlyLessons
      .filter(yl => 
        (yl.subject_name === subjectName || yl.expand?.subject?.name === subjectName) && 
        yl.week_number === currentWeek
      )
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));

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

    const availableLessons = subjectYearlyLessons.filter(yl => {
      const isCurrentlySelected = selectedLessons[subjectIndex] === yl.id;
      if (isCurrentlySelected) return true;

      const scheduledBefore = scheduledLessonsForSubject.some(sl => 
        sl.yearly_lesson_id === yl.id && sl.isBeforeCurrent && !sl.isHidden
      );
      if (scheduledBefore) return false;

      const isDuplicateInOtherAllerlei = allLessons.some(l => 
        l.collectionName === 'allerlei_lessons' && l.week_number === currentWeek && 
        l.added_yearly_lesson_ids?.includes(yl.id) && 
        l.id !== initialData.id
      );
      if (isDuplicateInOtherAllerlei) return false;

      return true;
    });

    return availableLessons;
  }, [yearlyLessons, allLessons, currentWeek, selectedLessons, subjectOptions, getCurrentLessonPosition, initialData.id]);

  const handleToggle = useCallback(async (checked) => {
    setIsAllerlei(checked);
    onToggleChange?.(checked);
    if (!checked && initialLessonId) { 
      // Unlink logic now in service, but handle in modal
    }
    if (!checked) {
      setSelectedLessons({});
      setAllerleiSteps({});
      setIntegratedOriginalData({});
    }
  }, [onToggleChange]);

  const addSubject = useCallback(() => {
    const newIndex = allerleiSubjects.length; // Use next available index
    const newSubjects = [...allerleiSubjects, '']; // Add empty subject
    console.log('Debug: addSubject - Adding subject at index:', newIndex, 'New subjects:', newSubjects);
    setAllerleiSubjects(newSubjects);
    onSubjectsChange?.(newSubjects);
  }, [allerleiSubjects, onSubjectsChange]);

  const removeSubject = useCallback((index) => {
    const newSubjects = allerleiSubjects.filter((_, i) => i !== index);
    const newSelected = { ...selectedLessons };
    const newSteps = { ...allerleiSteps };
    
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
    // Prevent overwriting primary lesson (index 0) unless explicitly changing it
    if (index === 0) {
      console.log('Debug: updateSubject - Attempting to update primary subject, ignoring:', { index, value });
      return;
    }
    const newSubjects = [...allerleiSubjects];
    newSubjects[index] = value;
    
    const newSelected = { ...selectedLessons };
    const newSteps = { ...allerleiSteps };
    
    delete newSelected[index];
    delete newSteps[index];
    
    console.log('Debug: updateSubject - New subjects:', newSubjects, 'New selectedLessons:', newSelected);
    setAllerleiSubjects(newSubjects);
    setSelectedLessons(newSelected);
    setAllerleiSteps(newSteps);
    onSubjectsChange?.(newSubjects);
    onLessonsChange?.(newSelected);
    onStepsChange?.(newSteps);
  }, [allerleiSubjects, selectedLessons, allerleiSteps, onSubjectsChange, onLessonsChange, onStepsChange]);

  const selectLesson = useCallback((subjectIndex, lessonId) => {
    // Prevent overwriting primary lesson (index 0)
    if (subjectIndex === 0) {
      console.log('Debug: selectLesson - Attempting to update primary lesson, ignoring:', { subjectIndex, lessonId });
      return;
    }
    let newSelected;
    setSelectedLessons(prev => {
      newSelected = { ...prev, [subjectIndex]: lessonId };
      console.log('Debug: selectLesson - New selectedLessons:', newSelected);
      return newSelected;
    });
    onLessonsChange?.(newSelected);
  }, [onLessonsChange]);

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
    if (!isAllerlei) return true;
    if (!selectedLessons[0]) throw new Error('Bitte wählen Sie eine primäre Lektion für eine Allerleilektion aus.');
    const allIds = Object.values(selectedLessons).filter(Boolean);
    const uniqueIds = new Set(allIds);
    if (uniqueIds.size !== allIds.length) throw new Error('Keine doppelten Lektionen in Allerleilektion erlaubt.');
    const scheduled = allLessons.filter(l => l.week_number === currentWeek && !l.is_hidden);
    const invalid = allIds.some((id, index) => {
      const isPrimary = index === 0;
      const isScheduled = scheduled.some(l => l.yearly_lesson_id === id && l.id !== initialLessonId);
      if (isScheduled && !isPrimary) {
        console.log('Debug: validate - Invalid lesson detected:', { id, isPrimary, scheduledLesson: scheduled.find(l => l.yearly_lesson_id === id) });
        return true;
      }
      return false;
    });
    if (invalid) throw new Error('Kann keine bereits sichtbar geplante Lektion in Allerlei integrieren.');
    console.log('Debug: validate - Validation passed, selectedLessons:', selectedLessons);
    return true;
  }, [isAllerlei, selectedLessons, allLessons, currentWeek, initialLessonId]);

  return {
    isAllerlei,
    allerleiSubjects,
    setAllerleiSubjects,
    selectedLessons,
    setSelectedLessons,
    allerleiSteps,
    setAllerleiSteps,
    integratedOriginalData,
    handleToggle,
    addSubject,
    removeSubject,
    updateSubject,
    selectLesson,
    updateStep,
    addStep,
    removeStep,
    getAvailableAllerleiLessons,
    getAllerleiYearlyLessonIds,
    validate,
    setIntegratedOriginalData: onIntegratedDataChange || setIntegratedOriginalData
  };
};