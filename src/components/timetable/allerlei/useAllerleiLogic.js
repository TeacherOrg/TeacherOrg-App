import { useState, useEffect, useCallback, useRef } from 'react';
import { allerleiService } from '@/components/timetable/hooks/allerleiService';  
import pb from '@/api/pb';                     // ← NEU (für pb.authStore)
import { YearlyLesson } from '@/api/entities';  // ← NEU (für YearlyLesson.create)

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
  initialLessonId,
  currentYear,  
  activeClassId,  
  selectedSubject  
}) => {
  const [isAllerlei, setIsAllerlei] = useState(initialData.is_allerlei || false);
  const [allerleiSubjects, setAllerleiSubjects] = useState(initialData.allerlei_subjects || []);
  const [selectedLessons, setSelectedLessons] = useState({});
  const [allerleiSteps, setAllerleiSteps] = useState({});
  const [integratedOriginalData, setIntegratedOriginalData] = useState({});

  const createTriggered = useRef(false);

  const generateId = useCallback(() => Math.random().toString(36).substr(2, 9), []);

  // Initialize from initial data (reaktiv bei Changes)
  useEffect(() => {
    // Für bestehende Allerlei: Lade aus initialData
    if (initialData.primary_yearly_lesson_id) {
      const initialSelected = { 0: initialData.primary_yearly_lesson_id };
      const addedIds = Array.isArray(initialData.added_yearly_lesson_ids) ? initialData.added_yearly_lesson_ids : [];
      const subjectsArray = Array.isArray(initialData.allerlei_subjects) ? initialData.allerlei_subjects : [];

      // Immer alle added YLs laden (unabhängig von subjectsArray)
      addedIds.forEach((id, index) => {
        if (id) {
          initialSelected[index + 1] = id;
        }
      });

      console.log('Debug: useAllerleiLogic init - initialSelected:', initialSelected, 'initialData:', initialData);

      setSelectedLessons(initialSelected);
      setIsAllerlei(true);

      // Fallback: wenn allerlei_subjects fehlt oder zu kurz → aus YearlyLessons extrahieren
      if (subjectsArray.length === 0 || subjectsArray.length < addedIds.length + 1) {
        const fallbackSubjects = [];
        addedIds.forEach(id => {
          const yl = yearlyLessons.find(yl => yl.id === id);
          if (yl) {
            const subjectObj = subjectOptions.find(s => s.id === yl.subject);
            const subjectName = subjectObj?.name || yl.subject || 'Unbekannt';
            fallbackSubjects.push(subjectName);
          }
        });
        setAllerleiSubjects(fallbackSubjects);
        console.log('Debug: Fallback allerlei_subjects aus YearlyLessons:', fallbackSubjects);
      } else {
        setAllerleiSubjects(subjectsArray);
      }

      createTriggered.current = false;
      return;
    }

    // Für neue Allerlei: Erstelle Primary YL nur, wenn isAllerlei true und noch nicht getriggert
    if (isAllerlei && !createTriggered.current) {
      createTriggered.current = true;
      const initiatingSubject = 
        initialData.subject || 
        selectedSubject ||                         
        (initialLessonId ? allLessons.find(l => l.id === initialLessonId)?.subject : '') ||
        '';
      console.log('Debug: useAllerleiLogic init - Initiating subject:', initiatingSubject);
      
      if (!initiatingSubject) {
        console.warn('No initiating subject provided; skipping primary lesson setup.');
        setSelectedLessons({});
        setAllerleiSteps({});
        setIntegratedOriginalData({});
        setIsAllerlei(false);
        setAllerleiSubjects([]);
        createTriggered.current = false;
        return;
      }
      
      (async () => {
        try {
          const nextNumber = yearlyLessons.filter(yl => yl.subject === initiatingSubject && yl.week_number === currentWeek).length + 1;
          const newYl = await YearlyLesson.create({
            subject: initiatingSubject,
            week_number: currentWeek,
            lesson_number: nextNumber,
            school_year: currentYear,
            name: `Lektion ${nextNumber}`,
            steps: [],
            topic_id: null,
            is_double_lesson: false,
            is_exam: false,
            is_half_class: false,
            user_id: pb.authStore.model.id,
            class_id: activeClassId
          });
          const primaryYlId = newYl.id;
          console.log('Debug: Created new YL for primary:', primaryYlId);

          setSelectedLessons({ 0: primaryYlId });
          setAllerleiSubjects([]);
        } catch (error) {
          console.error('Error creating new YL in useAllerleiLogic:', error);
          setSelectedLessons({});
          setAllerleiSteps({});
          setIntegratedOriginalData({});
          setIsAllerlei(false);
          setAllerleiSubjects([]);
          createTriggered.current = false;
        }
      })();
    } else if (!isAllerlei) {
      createTriggered.current = false;
      setSelectedLessons({});
      setAllerleiSteps({});
      setIntegratedOriginalData({});
      setAllerleiSubjects([]);
    }
  }, [
    isAllerlei,
    initialData.primary_yearly_lesson_id,
    initialData.added_yearly_lesson_ids,
    initialData.allerlei_subjects,
    initialData.subject,
    initialLessonId,
    allLessons,
    yearlyLessons,
    currentWeek,
    subjectOptions,
    currentYear,
    activeClassId,
    selectedSubject
  ]);

  // Load steps when lessons are selected (unverändert)
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
        const intIdx = parseInt(idx);
        if (intIdx > 0) {
          newSteps[intIdx - 1] = yearlyLesson.steps.map(step => ({
            ...step,
            id: `allerlei-${intIdx - 1}-${generateId()}-${step.id || generateId()}`
          }));
          hasChanges = true;
        }
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
      const isCurrentlySelected = selectedLessons[subjectIndex + 1] === yl.id;
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
    
    const actualIndex = index + 1;
    delete newSelected[actualIndex];
    delete newSteps[index];
    
    Object.keys(newSelected).forEach(key => {
      const idx = parseInt(key);
      if (idx > actualIndex) {
        newSelected[idx - 1] = newSelected[idx];
        delete newSelected[idx];
      }
    });

    Object.keys(newSteps).forEach(key => {
      const idx = parseInt(key);
      if (idx > index) {
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
    
    const newSelected = { ...selectedLessons };
    const newSteps = { ...allerleiSteps };
    
    const actualIndex = index + 1;
    delete newSelected[actualIndex];
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
    let newSelected;
    setSelectedLessons(prev => {
      newSelected = { ...prev, [subjectIndex + 1]: lessonId };
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
    const ids = [];
    Object.keys(selectedLessons).forEach(key => {
      const idx = parseInt(key);
      if (idx >= 0 && selectedLessons[idx]) {  // Geändert: >= 0 statt > 0, um Primary einzuschließen
        ids.push(selectedLessons[idx]);
      }
    });
    return ids;
  }, [selectedLessons]);

  const validate = useCallback(() => {
    if (!isAllerlei) return true;
    if (!selectedLessons[0]) throw new Error('Bitte wählen Sie eine primäre Lektion für eine Allerleilektion aus.');
    const allIds = Object.entries(selectedLessons)
      .filter(([key, value]) => value)
      .map(([key, value]) => value);
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