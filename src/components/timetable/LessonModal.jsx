import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Trash2, PlusCircle, BookOpen, Copy } from "lucide-react";
import { Lesson, YearlyLesson } from '@/api/entities';
import { debounce } from 'lodash';
import { useAllerleiLogic } from '@/components/timetable/allerlei/useAllerleiLogic';
import { AllerleiSubjectSelector, AllerleiToggleSection } from '@/components/timetable/allerlei/AllerleiComponents';
import { validateAllerlei, prepareAllerleiForPersist, handleAllerleiIntegration, calculateAllerleiGradient } from '@/components/timetable/allerlei/AllerleiUtils';
import { findFreeSlot } from '@/utils/slotUtils';
import pb from '@/api/pb';

const WORK_FORMS = [
  { value: 'frontal', label: 'Frontal' },
  { value: 'einzel', label: 'Einzelarbeit' },
  { value: 'partner', label: 'Partnerarbeit' },
  { value: 'gruppe', label: 'Gruppenarbeit' },
  { value: 'diskussion', label: 'Diskussion' },
  { value: 'experiment', label: 'Experiment' },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

const StepRow = ({ step, onUpdate, onRemove, maxTime }) => (
  <div className="grid grid-cols-[60px_140px_1fr_1fr_auto] gap-2 items-center">
    <Input
      type="number"
      value={step.time || ''}
      onChange={e => onUpdate('time', e.target.value ? Number(e.target.value) : null)}
      placeholder="Zeit"
      className="text-center bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
      min="0"
      max={maxTime}
    />
    <Select value={step.workForm || ''} onValueChange={val => onUpdate('workForm', val)}>
      <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
        <SelectValue placeholder="Form" />
      </SelectTrigger>
      <SelectContent>
        {WORK_FORMS.map(form => (
          <SelectItem key={form.value} value={form.value}>{form.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Input
      value={step.activity || ''}
      onChange={e => onUpdate('activity', e.target.value)}
      placeholder="Aktivität / Was wird gemacht"
      className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
    />
    <Input
      value={step.material || ''}
      onChange={e => onUpdate('material', e.target.value)}
      placeholder="Material"
      className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
    />
    <Button variant="ghost" size="icon" onClick={onRemove} className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30">
      <Trash2 className="w-4 h-4" />
    </Button>
  </div>
);

export default function LessonModal({
  isOpen, onClose, onSave, onDelete, onDuplicate,
  lesson, copiedLesson, slotInfo, currentWeek, allLessons, allYearlyLessons, timeSlots,
  subjectColor, initialSubject, subjects, topics, activeClassId
}) {
  const [formData, setFormData] = useState({});
  const [primarySteps, setPrimarySteps] = useState([]);
  const [secondSteps, setSecondSteps] = useState([]);
  const [addSecondLesson, setAddSecondLesson] = useState(false);
  const [selectedSecondLesson, setSelectedSecondLesson] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [integratedOriginalData, setIntegratedOriginalData] = useState({});

  const isEditing = !!lesson;
  const isNew = !lesson;

  const originalLessonRef = useRef(null);

  const scheduledLessonIds = useMemo(() => 
    new Set([
      ...allLessons.filter(l => l.yearly_lesson_id).map(l => l.yearly_lesson_id),
      ...allLessons.filter(l => l.second_yearly_lesson_id).map(l => l.second_yearly_lesson_id)
    ]),
    [allLessons]
  );

  const scheduledLessonsForSubject = useMemo(() => {
    if (!selectedSubject) return [];
    return allLessons
      .filter(l => 
        l.subject === selectedSubject && 
        l.week_number === currentWeek && 
        !l.is_hidden
      )
      .map(l => ({
        yearly_lesson_id: l.yearly_lesson_id,
        day_of_week: l.day_of_week,
        period_slot: l.period_slot,
        isHidden: l.is_hidden
      }));
  }, [selectedSubject, allLessons, currentWeek]);

  const subjectOptions = useMemo(() => {
    if (!subjects || !activeClassId) return [];
    
    return subjects
      .filter(s => s.class_id === activeClassId)
      .reduce((unique, subject) => {
        if (!unique.find(u => u.name === subject.name)) {
          unique.push(subject);
        }
        return unique;
      }, [])
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [subjects, activeClassId]);

  const subjectTopics = useMemo(() => {
    const validSubjectIds = subjectOptions.map(s => s.id);
    return topics?.filter(topic => validSubjectIds.includes(topic.subject)) || [];
  }, [topics, subjectOptions]);

  const getCurrentLessonPosition = useCallback(() => {
    const targetLesson = isEditing ? lesson : slotInfo;
    if (!targetLesson || (!targetLesson.day_of_week && !targetLesson.day)) return { dayOrder: 0, period: 0 };

    const day = targetLesson.day_of_week || targetLesson.day;
    const period = targetLesson.period_slot || targetLesson.period;

    const dayOrderMap = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
    return {
      dayOrder: dayOrderMap[day.toLowerCase()] || 0,
      period: period || 0
    };
  }, [slotInfo, isEditing, lesson]);

  const availableSecondLessons = useMemo(() => {
    if (!formData.is_double_lesson || !selectedSubject) return [];
  
    const subjectYearlyLessons = allYearlyLessons
      .filter(yl => 
        yl.subject === selectedSubject && 
        yl.week_number === currentWeek &&
        (!yl.is_double_lesson || (yl.is_double_lesson && yl.second_yearly_lesson_id !== null)) &&
        !scheduledLessonIds.has(yl.id)
      )
      .sort((a, b) => a.lesson_number - b.lesson_number);

    let currentLessonNumber = 1;
    if (lesson?.yearly_lesson_id) {
      const currentYearlyLesson = subjectYearlyLessons.find(yl => yl.id === lesson.yearly_lesson_id);
      currentLessonNumber = currentYearlyLesson?.lesson_number || 1;
    } else if (slotInfo) {
      const firstAvailableYearlyLesson = subjectYearlyLessons.find(yl => !scheduledLessonIds.has(yl.id));
      currentLessonNumber = firstAvailableYearlyLesson?.lesson_number || 1;
    }

    const nextLesson = subjectYearlyLessons.find(yl => 
      yl.lesson_number === currentLessonNumber + 1 && 
      !scheduledLessonIds.has(yl.id)
    );
  
    return nextLesson ? [nextLesson] : [];
  }, [formData.is_double_lesson, selectedSubject, allYearlyLessons, currentWeek, lesson, slotInfo, scheduledLessonIds]);

  // Memoisiere Callbacks, um Referenzänderungen zu verhindern
  const onToggleChange = useCallback((checked) => {
    setFormData(prev => ({ ...prev, is_allerlei: checked }));
  }, []);

  const onSubjectsChange = useCallback((subjects) => {
    setFormData(prev => ({ ...prev, allerlei_subjects: subjects }));
  }, []);

  const onLessonsChange = useCallback((lessons) => {
    setFormData(prev => ({ ...prev, allerlei_yearly_lesson_ids: Object.values(lessons) }));
  }, []);

  const onStepsChange = useCallback((steps) => {
    setFormData(prev => ({ ...prev, steps: Object.values(steps).flat() }));
  }, []);

  const onIntegratedDataChange = useCallback((data) => {
    setIntegratedOriginalData(data);
  }, []);

  const { 
    isAllerlei, 
    handleToggle: handleAllerleiToggleHook, 
    allerleiSubjects, 
    addSubject, 
    removeSubject, 
    updateSubject, 
    selectedLessons, 
    selectLesson, 
    getAvailableAllerleiLessons, 
    allerleiSteps, 
    updateStep: updateAllerleiStep, 
    addStep: addAllerleiStep, 
    removeStep: removeAllerleiStep, 
    getAllerleiYearlyLessonIds, 
    validate: validateAllerleiSelection
    // setIntegratedOriginalData wird nicht destrukturiert
  } = useAllerleiLogic({
    initialData: formData,
    yearlyLessons: allYearlyLessons,
    allLessons,
    timeSlots,
    currentWeek,
    currentPosition: getCurrentLessonPosition(),
    subjectOptions,
    onToggleChange,
    onSubjectsChange,
    onLessonsChange,
    onStepsChange,
    onIntegratedDataChange
  });

  const handleAllerleiToggle = async (checked) => {
    setValidationError(null);
    await handleAllerleiToggleHook(checked);
    if (!checked) {
      const primaryId = Object.values(selectedLessons)[0];
      const originalName = integratedOriginalData[primaryId]?.original_name;
      if (originalName) {
        setFormData(prev => ({ ...prev, name: originalName }));
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      const lessonToLoad = copiedLesson || lesson || {};
      originalLessonRef.current = lesson;
      let loadedTopicId = lessonToLoad.topic_id || "no_topic";
      let loadedName = '';
      let loadedSecondName = '';
      let loadedPrimarySteps = [];
      let loadedAllerleiSubjects = lessonToLoad.allerlei_subjects || []; // Neu: Allerlei-Fächer laden
      let loadedAllerleiYearlyLessonIds = lessonToLoad.allerlei_yearly_lesson_ids || []; // Neu: Allerlei-Lektionen laden

      if (lessonToLoad.is_allerlei) {
        loadedName = lessonToLoad.name || 'Allerlei';
        if (lessonToLoad.allerlei_yearly_lesson_ids?.length > 0) {
          const primaryYL = allYearlyLessons.find(yl => yl.id === lessonToLoad.allerlei_yearly_lesson_ids[0]);
          if (primaryYL) {
            loadedName = primaryYL.name || `Lektion ${primaryYL.lesson_number}`;
            loadedTopicId = primaryYL.topic_id || "no_topic";
            loadedPrimarySteps = lessonToLoad.steps?.filter(step => !step.id.startsWith('allerlei-') && !step.id.startsWith('second-'))
              .map(s => ({ ...s, id: s.id || generateId() })) || [];
          }
        }
      } else if (lessonToLoad.yearly_lesson_id) {
        const primaryYL = allYearlyLessons.find(yl => yl.id === lessonToLoad.yearly_lesson_id);
        if (primaryYL) {
          loadedTopicId = primaryYL.topic_id || "no_topic";
          loadedName = primaryYL.name || `Lektion ${primaryYL.lesson_number}`;
          loadedPrimarySteps = primaryYL.steps?.map(s => ({ ...s, id: s.id || generateId() })) || [];
        }
      }

      if (lessonToLoad.is_double_lesson && lessonToLoad.second_yearly_lesson_id) {
        const secondYL = allYearlyLessons.find(yl => yl.id === lessonToLoad.second_yearly_lesson_id);
        if (secondYL) {
          loadedSecondName = secondYL.name || `Lektion ${Number(lessonToLoad.yearly_lesson_id ? allYearlyLessons.find(yl => yl.id === lessonToLoad.yearly_lesson_id)?.lesson_number || 1 : 1) + 1}`;
        }
      }

      setFormData({
        topic_id: loadedTopicId,
        is_double_lesson: lessonToLoad.is_double_lesson || false,
        is_exam: lessonToLoad.is_exam || false,
        is_allerlei: lessonToLoad.is_allerlei || false,
        is_half_class: lessonToLoad.is_half_class || false,
        original_topic_id: lesson?.topic_id || "no_topic",
        name: loadedName,
        second_name: loadedSecondName,
        allerlei_subjects: loadedAllerleiSubjects, // Neu: Hinzufügen
        allerlei_yearly_lesson_ids: loadedAllerleiYearlyLessonIds // Neu: Hinzufügen
      });
      setSelectedSubject(lessonToLoad.subject || initialSubject || "");
      setAddSecondLesson(lessonToLoad.is_double_lesson && !!lessonToLoad.second_yearly_lesson_id);
      setSelectedSecondLesson(lessonToLoad.second_yearly_lesson_id || "");
      setPrimarySteps(loadedPrimarySteps);

      if (lessonToLoad.is_double_lesson && lessonToLoad.second_yearly_lesson_id) {
        const secondYL = allYearlyLessons.find(yl => yl.id === lessonToLoad.second_yearly_lesson_id);
        setSecondSteps(secondYL?.steps?.map(s => ({ ...s, id: `second-${s.id || generateId()}` })) || []);
      } else {
        setSecondSteps(lessonToLoad.steps?.filter(step => step.id?.startsWith('second-')).map(s => ({ ...s, id: `second-${s.id || generateId()}` })) || []);
      }
    }
  }, [isOpen, lesson, copiedLesson, initialSubject, allYearlyLessons]);

  useEffect(() => {
    if (!isOpen || isEditing || copiedLesson) return;
    if (selectedSubject) {
      const availableYearlyLessons = allYearlyLessons.filter(
        yl => yl.subject === selectedSubject && yl.week_number === currentWeek && !scheduledLessonIds.has(yl.id)
      ).sort((a, b) => a.lesson_number - b.lesson_number);
      if (availableYearlyLessons.length > 0) {
        const yearlyLessonToUse = availableYearlyLessons[0];
        setFormData(prev => ({
          ...prev,
          topic_id: yearlyLessonToUse.topic_id || "no_topic",
          is_double_lesson: yearlyLessonToUse.is_double_lesson || false,
          is_exam: yearlyLessonToUse.is_exam || false,
          is_allerlei: yearlyLessonToUse.is_allerlei || false,
          is_half_class: yearlyLessonToUse.is_half_class || false,
        }));
        setPrimarySteps(yearlyLessonToUse.steps?.map(s => ({ ...s, id: s.id || generateId() })) || []);
        if (yearlyLessonToUse.is_double_lesson && yearlyLessonToUse.second_yearly_lesson_id) {
          setAddSecondLesson(true);
          setSelectedSecondLesson(yearlyLessonToUse.second_yearly_lesson_id);
          const secondYL = allYearlyLessons.find(yl => yl.id === yearlyLessonToUse.second_yearly_lesson_id);
          setSecondSteps(secondYL?.steps?.map(s => ({ ...s, id: `second-${s.id || generateId()}` })) || []);
        } else {
          setAddSecondLesson(false);
          setSelectedSecondLesson("");
          setSecondSteps([]);
        }
      } else {
        setFormData({ topic_id: "no_topic", is_double_lesson: false, is_exam: false, is_allerlei: false, is_half_class: false });
        setPrimarySteps([]);
        setSecondSteps([]);
        setAddSecondLesson(false);
        setSelectedSecondLesson("");
      }
    } else {
      setFormData({ topic_id: "no_topic", is_double_lesson: false, is_exam: false, is_allerlei: false, is_half_class: false });
      setPrimarySteps([]);
      setSecondSteps([]);
      setAddSecondLesson(false);
      setSelectedSecondLesson("");
    }
  }, [isOpen, isEditing, copiedLesson, selectedSubject, currentWeek, allYearlyLessons, scheduledLessonIds]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        document.getElementById('lesson-form').requestSubmit();
      } else if (e.key === 'Delete' && isEditing) {
        handleDeleteClick();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditing, onClose]);

  const handleDoubleToggle = (checked) => {
    setFormData(prev => ({ ...prev, is_double_lesson: checked }));
    
    if (checked) {
      setAddSecondLesson(true);
      
      if (!selectedSecondLesson) {
        const subjectYearlyLessons = allYearlyLessons
          .filter(yl => yl.subject === selectedSubject && yl.week_number === currentWeek)
          .sort((a, b) => a.lesson_number - b.lesson_number);

        let currentLessonNumber = 1;
        if (lesson?.yearly_lesson_id) {
          const currentYearlyLesson = subjectYearlyLessons.find(yl => yl.id === lesson.yearly_lesson_id);
          currentLessonNumber = currentYearlyLesson?.lesson_number || 1;
        } else if (slotInfo) {
          const firstAvailableYearlyLesson = subjectYearlyLessons.find(yl => !scheduledLessonIds.has(yl.id));
          if (firstAvailableYearlyLesson) {
            currentLessonNumber = firstAvailableYearlyLesson.lesson_number;
          }
        }

        const nextLesson = subjectYearlyLessons.find(yl => 
          yl.lesson_number === currentLessonNumber + 1
        );
        
        if (nextLesson) {
          setSelectedSecondLesson(nextLesson.id);
          const newSecondSteps = nextLesson.steps?.map(step => ({
            ...step,
            id: `second-${generateId()}-${step.id || generateId()}`
          })) || [];
          setSecondSteps(newSecondSteps);
        }
      }
    } else {
      setAddSecondLesson(false);
      setSecondSteps([]);
      setSelectedSecondLesson("");
    }
  };

  const handleAddSecondLessonToggle = (checked) => {
    setAddSecondLesson(checked);
    
    if (!checked) {
      setSecondSteps([]);
      setSelectedSecondLesson("");
    }
  };

  const handleSecondLessonSelection = (yearlyLessonId) => {
    setSelectedSecondLesson(yearlyLessonId);
    
    if (!yearlyLessonId) {
      setSecondSteps([]);
      return;
    }

    const selectedYearlyLesson = allYearlyLessons.find(yl => yl.id === yearlyLessonId);
    if (selectedYearlyLesson && selectedYearlyLesson.steps) {
      const newSecondLessonSteps = selectedYearlyLesson.steps.map(step => ({
        ...step,
        id: `second-${generateId()}-${step.id || generateId()}`
      }));
      setSecondSteps(newSecondLessonSteps);
    }
  };

  // Handlers for Primary Steps
  const handleUpdatePrimaryStep = (id, field, value) => setPrimarySteps(primarySteps.map(step => step.id === id ? { ...step, [field]: value } : step));
  const handleRemovePrimaryStep = (id) => setPrimarySteps(primarySteps.filter(step => step.id !== id));
  const handleAddPrimaryStep = () => setPrimarySteps([...primarySteps, { id: generateId(), time: null, workForm: '', activity: '', material: '' }]);

  // Handlers for Second Steps
  const handleUpdateSecondStep = (id, field, value) => setSecondSteps(secondSteps.map(step => step.id === id ? { ...step, [field]: value } : step));
  const handleRemoveSecondStep = (id) => setSecondSteps(secondSteps.filter(step => step.id !== id));
  const handleAddSecondStep = () => setSecondSteps([...secondSteps, { id: `second-${generateId()}`, time: null, workForm: '', activity: '', material: '' }]);

  const isFormValid = useMemo(() => {
    if (!isAllerlei) return !!selectedSubject || isEditing;
    return allerleiSubjects.filter(Boolean).length >= 1 && 
           getAllerleiYearlyLessonIds().every(id => id) &&
           (selectedSubject || isEditing);
  }, [isAllerlei, allerleiSubjects, selectedSubject, isEditing, getAllerleiYearlyLessonIds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !isFormValid) return;
    setIsSubmitting(true);
    setValidationError(null);
    try {
      // Validate Allerlei
      validateAllerleiSelection();

      let lessonData = null;
      let toDeleteIds = [];
      const finalSubject = selectedSubject || lesson?.subject;
      if (!finalSubject) {
        setValidationError('Bitte wählen Sie ein Fach aus.');
        return;
      }

      if (formData.is_double_lesson && addSecondLesson && selectedSecondLesson) {
        const lessonOnGridToDelete = allLessons.find(l => l.yearly_lesson_id === selectedSecondLesson);
        if (lessonOnGridToDelete) {
          toDeleteIds.push(lessonOnGridToDelete.id);
        }
      } else if (isEditing && !formData.is_double_lesson && lesson?.is_double_lesson) {
        if (lesson.yearly_lesson_id) {
          await YearlyLesson.update(lesson.yearly_lesson_id, {
            is_double_lesson: false,
            second_yearly_lesson_id: null
          });
        }
        if (lesson.second_yearly_lesson_id) {
          await YearlyLesson.update(lesson.second_yearly_lesson_id, { is_double_lesson: false });
        }
        const nextPeriodLesson = allLessons.find(l =>
          l.day_of_week === lesson.day_of_week &&
          l.period_slot === lesson.period_slot + 1 &&
          l.week_number === currentWeek
        );
        if (nextPeriodLesson) {
          toDeleteIds.push(nextPeriodLesson.id);
        }
      }

      // Handle Allerlei integration
      if (isAllerlei) {
        await handleAllerleiIntegration(
          getAllerleiYearlyLessonIds(),
          allLessons,
          currentWeek,
          getCurrentLessonPosition(),
          allYearlyLessons,
          onIntegratedDataChange,
          lesson?.id
        );
      }

      console.log('Submitting with steps (primary):', primarySteps);
      console.log('Submitting with steps (second):', secondSteps);
      console.log('Submitting with steps (allerlei):', allerleiSteps);
      console.log('Is Allerlei:', isAllerlei);
      console.log('Allerlei subjects:', allerleiSubjects);
      console.log('Selected lessons:', selectedLessons);
      console.log('Lessons to delete:', toDeleteIds);

      // Prepare data for persist
      const preparedFormData = prepareAllerleiForPersist(formData, isAllerlei);

      if (isEditing) {
        lessonData = {
          id: lesson.id,
          ...preparedFormData,
          steps: [...primarySteps, ...Object.values(allerleiSteps).flat(), ...secondSteps],
          subject: finalSubject,
          yearly_lesson_id: isAllerlei ? null : (lesson.allerlei_yearly_lesson_ids?.[0] || lesson.yearly_lesson_id || null),
          second_yearly_lesson_id: (preparedFormData.is_double_lesson && addSecondLesson && selectedSecondLesson) ? selectedSecondLesson : null,
          allerlei_subjects: isAllerlei ? allerleiSubjects.filter(Boolean) : [],
          allerlei_yearly_lesson_ids: isAllerlei ? getAllerleiYearlyLessonIds() : [],
          topic_id: isAllerlei ? undefined : (preparedFormData.topic_id === 'no_topic' ? undefined : preparedFormData.topic_id),
          is_hidden: preparedFormData.is_hidden ?? false
        };
        if (lessonData.yearly_lesson_id && !isAllerlei) {
          const primaryYL = allYearlyLessons.find(yl => yl.id === lessonData.yearly_lesson_id);
          if (primaryYL) {
            await YearlyLesson.update(lessonData.yearly_lesson_id, {
              name: preparedFormData.name || primaryYL.name || `Lektion ${primaryYL.lesson_number}`,
              steps: primarySteps,
              topic_id: lessonData.topic_id,
              is_double_lesson: lessonData.is_double_lesson,
              second_yearly_lesson_id: lessonData.second_yearly_lesson_id,
              is_exam: lessonData.is_exam,
              is_half_class: lessonData.is_half_class
            });
          }
        }
        if (lessonData.is_double_lesson && lessonData.second_yearly_lesson_id) {
          await YearlyLesson.update(lessonData.second_yearly_lesson_id, {
            name: preparedFormData.second_name || `Lektion ${Number(allYearlyLessons.find(yl => yl.id === lessonData.yearly_lesson_id)?.lesson_number || 1) + 1}`,
            steps: secondSteps,
            is_double_lesson: true
          });
        }
      } else {
        const timeSlotForNewLesson = timeSlots.find(ts => ts.period === slotInfo.period);
        const newLessonBase = copiedLesson
          ? { ...copiedLesson, ...preparedFormData, steps: [...primarySteps, ...Object.values(allerleiSteps).flat(), ...secondSteps] }
          : { ...preparedFormData, steps: [...primarySteps, ...Object.values(allerleiSteps).flat(), ...secondSteps] };
        lessonData = {
          isNew: true,
          subject: finalSubject,
          ...newLessonBase,
          day_of_week: slotInfo.day,
          period_slot: slotInfo.period,
          week_number: currentWeek,
          start_time: timeSlotForNewLesson?.start,
          end_time: timeSlotForNewLesson?.end,
          allerlei_subjects: isAllerlei ? allerleiSubjects.filter(Boolean) : [],
          allerlei_yearly_lesson_ids: isAllerlei ? getAllerleiYearlyLessonIds() : [],
          topic_id: isAllerlei ? undefined : (preparedFormData.topic_id === 'no_topic' ? undefined : preparedFormData.topic_id),
          yearly_lesson_id: isAllerlei ? null : (copiedLesson?.yearly_lesson_id || null),
          second_yearly_lesson_id: (preparedFormData.is_double_lesson && addSecondLesson && selectedSecondLesson) ? selectedSecondLesson : null,
          user_id: pb.authStore.model.id,
          is_hidden: preparedFormData.is_hidden ?? false
        };
        if (!lessonData.is_allerlei) {
          const subjectYearlyLessons = allYearlyLessons
            .filter(yl => yl.subject === lessonData.subject && yl.week_number === lessonData.week_number)
            .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
          const nextLessonNumber = subjectYearlyLessons.length > 0
            ? Math.max(...subjectYearlyLessons.map(yl => Number(yl.lesson_number))) + 1
            : 1;
          const newYearlyLesson = await YearlyLesson.create({
            subject: lessonData.subject,
            week_number: lessonData.week_number,
            lesson_number: nextLessonNumber,
            school_year: currentYear,
            name: preparedFormData.name || `Lektion ${nextLessonNumber}`,
            description: '',
            steps: primarySteps,
            topic_id: lessonData.topic_id,
            is_double_lesson: lessonData.is_double_lesson,
            second_yearly_lesson_id: lessonData.second_yearly_lesson_id,
            is_exam: lessonData.is_exam,
            is_half_class: lessonData.is_half_class,
            user_id: pb.authStore.model.id,
            class_id: activeClassId
          });
          lessonData.yearly_lesson_id = newYearlyLesson.id;
          // Update store if needed
          if (typeof setYearlyLessons === 'function') {
            setYearlyLessons(prev => [...prev, { ...newYearlyLesson, lesson_number: Number(newYearlyLesson.lesson_number) }]);
          }
          if (lessonData.is_double_lesson && lessonData.second_yearly_lesson_id) {
            await YearlyLesson.update(lessonData.second_yearly_lesson_id, {
              name: preparedFormData.second_name || `Lektion ${Number(nextLessonNumber) + 1}`,
              steps: secondSteps,
              is_double_lesson: true
            });
            // Update store if needed
            if (typeof setYearlyLessons === 'function') {
              setYearlyLessons(prev => prev.map(yl =>
                yl.id === lessonData.second_yearly_lesson_id
                  ? { ...yl, name: preparedFormData.second_name || `Lektion ${Number(nextLessonNumber) + 1}`, steps: secondSteps, is_double_lesson: true }
                  : yl
              ));
            }
          }
        }
      }

      console.log('onSave called with lessonData:', lessonData, 'toDeleteIds:', toDeleteIds);
      await onSave(lessonData, toDeleteIds);
      onClose();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setValidationError(error.message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    if (isEditing && window.confirm("Sind Sie sicher, dass Sie diese Lektion löschen möchten?")) {
      onDelete(lesson.id);
    }
  };

  const displayModalColor = useMemo(() => {
    if (isAllerlei && allerleiSubjects.length > 0) {
      const allSubjectNames = [subjects.find(s => s.id === selectedSubject)?.name, ...allerleiSubjects].filter(Boolean);
      return calculateAllerleiGradient(allSubjectNames, subjects);
    }
    return subjectColor || '#3b82f6';
  }, [isAllerlei, allerleiSubjects, selectedSubject, subjects, subjectColor]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" 
        style={{ borderColor: (subjectColor || '#3b82f6') + '40' }}
      >
        <DialogHeader 
          className="pb-4 border-b"
          style={{ borderColor: (subjectColor || '#3b82f6') + '20', background: `linear-gradient(135deg, ${(subjectColor || '#3b82f6')}15, transparent)` }}
        >
          <DialogTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-white">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" 
              style={{ 
                background: displayModalColor
              }}
            >
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            {isAllerlei ? 
              `Allerlei: ${formData.name || 'Allerlei'} ${allerleiSubjects.length > 0 ? `(${allerleiSubjects.join(', ')})` : ''}` :
              (isEditing ? "Lektion bearbeiten" : (copiedLesson ? "Kopierte Lektion einfügen" : "Neue Lektion planen"))
            }
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {isEditing ? `${lesson.expand?.subject?.name || lesson.subject} • ${lesson.day_of_week} • Period ${lesson.period_slot}` : `${slotInfo.day} • Period ${slotInfo.period}`}
          </DialogDescription>
        </DialogHeader>
        
        <form id="lesson-form" onSubmit={handleSubmit} className="space-y-6 pt-4">
          {validationError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
              {validationError}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-around gap-x-6 gap-y-4 p-3 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Switch id="half-class" checked={formData.is_half_class || false} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_half_class: checked }))} />
              <Label htmlFor="half-class" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">Halbklasse</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="double-lesson" checked={formData.is_double_lesson || false} onCheckedChange={handleDoubleToggle} />
              <Label htmlFor="double-lesson" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">Doppellektion</Label>
            </div>
            <AllerleiToggleSection isAllerlei={isAllerlei} onToggle={handleAllerleiToggle} />
            <div className="flex items-center gap-2">
              <Switch id="exam" checked={formData.is_exam || false} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_exam: checked }))} />
              <Label htmlFor="exam" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">Prüfung</Label>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900 dark:text-white">Fach</Label>
              <Select 
                value={selectedSubject} 
                onValueChange={setSelectedSubject}
                disabled={isEditing}
              >
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"><SelectValue placeholder="Fach auswählen" /></SelectTrigger>
                <SelectContent>
                  {subjectOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900 dark:text-white">Thema</Label>
              <Select value={formData.topic_id || "no_topic"} onValueChange={(value) => setFormData({ ...formData, topic_id: value })} disabled={!selectedSubject || isAllerlei}>
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"><SelectValue placeholder="Thema auswählen (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_topic">Kein Thema</SelectItem>
                  {subjectTopics.map((topic) => (<SelectItem key={topic.id} value={topic.id}>{topic.title}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="name" className="text-right text-sm font-semibold text-slate-900 dark:text-white">Titel (Lektion)</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="col-span-3 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
              placeholder={`Lektion ${lesson?.yearly_lesson_id ? allYearlyLessons.find(yl => yl.id === lesson.yearly_lesson_id)?.lesson_number || '' : slotInfo?.period || ''}`}
              maxLength={30}
            />
          </div>
          {formData.is_double_lesson && addSecondLesson && (
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="second_name" className="text-right text-sm font-semibold text-slate-900 dark:text-white">Titel (Zweite Lektion)</Label>
              <Input
                id="second_name"
                value={formData.second_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, second_name: e.target.value }))}
                className="col-span-3 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                placeholder={`Lektion ${Number(lesson?.yearly_lesson_id ? allYearlyLessons.find(yl => yl.id === lesson.yearly_lesson_id)?.lesson_number || slotInfo?.period || 1 : slotInfo?.period || 1) + 1}`}
                maxLength={30}
              />
            </div>
          )}      

          {formData.is_double_lesson && (
            <div className="space-y-4 p-4 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Switch 
                  id="add-second-lesson" 
                  checked={addSecondLesson} 
                  onCheckedChange={handleAddSecondLessonToggle} 
                />
                <Label htmlFor="add-second-lesson" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">
                  Zusätzliche Lektion hinzufügen
                </Label>
              </div>
              
              {addSecondLesson && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-900 dark:text-white">Zweite Lektion auswählen</Label>
                  <Select 
                    value={selectedSecondLesson} 
                    onValueChange={handleSecondLessonSelection}
                  >
                    <SelectTrigger className="bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                      <SelectValue placeholder="Lektion zum Hinzufügen auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSecondLessons.length > 0 ? (
                        availableSecondLessons.map(yl => {
                          const isScheduled = allLessons.some(l => l.yearly_lesson_id === yl.id && l.week_number === currentWeek && !l.is_hidden);
                          return (
                            <SelectItem key={yl.id} value={yl.id}>
                              {yl.name || `Lektion ${yl.lesson_number}`}
                              {yl.notes ? ` - ${yl.notes}` : ''}
                              {isScheduled ? ' (bereits geplant)' : ''}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem disabled value="none">Keine verfügbaren Lektionen</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {availableSecondLessons.length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Alle nachfolgenden Lektionen für {subjects.find(s => s.id === selectedSubject)?.name} sind bereits geplant oder nicht verfügbar.
                    </p>
                  )}
                </div>
              )}
              
              {!addSecondLesson && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Die aktuelle Lektion wird einfach als Doppellektion (90 Min) geführt, ohne zusätzliche Inhalte.
                </p>
              )}
            </div>
          )}

          {isAllerlei && (
            <div className="space-y-4 p-4 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <Label className="font-semibold text-slate-900 dark:text-white">Allerlei-Fächer</Label>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Wählen Sie mindestens ein Fach für eine Allerleilektion aus.
              </p>
              <div className="space-y-3">
                {allerleiSubjects.map((fach, index) => (
                  <AllerleiSubjectSelector
                    key={index}
                    index={index}
                    subject={fach}
                    availableSubjects={subjectOptions}
                    onUpdateSubject={updateSubject}
                    onRemoveSubject={removeSubject}
                    selectedLesson={selectedLessons[index]}
                    onSelectLesson={selectLesson}
                    availableLessons={getAvailableAllerleiLessons(fach, index)}
                    steps={allerleiSteps[index] || []}
                    onUpdateStep={updateAllerleiStep}
                    onRemoveStep={removeAllerleiStep}
                    onAddStep={addAllerleiStep}
                    allLessons={allLessons}
                    currentWeek={currentWeek}
                  />
                ))}
                <Button type="button" variant="outline" onClick={addSubject} className="w-full border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Fach hinzufügen
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Label className="font-semibold text-slate-900 dark:text-white">Primäre Lektion Schritte</Label>
            <div className="space-y-3 p-4 border rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              {primarySteps.map(step => (
                <StepRow key={step.id} step={step} onUpdate={(f, v) => handleUpdatePrimaryStep(step.id, f, v)} onRemove={() => handleRemovePrimaryStep(step.id)} maxTime={45} />
              ))}
              <Button type="button" variant="outline" onClick={handleAddPrimaryStep} className="w-full mt-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600">
                <PlusCircle className="w-4 h-4 mr-2" />
                <span className="text-slate-900 dark:text-white">Schritt hinzufügen</span>
              </Button>
            </div>
          </div>

          {addSecondLesson && (
            <div className="space-y-4">
              <Label className="font-semibold text-slate-900 dark:text-white">Zweite Lektion Schritte</Label>
              <div className="space-y-3 p-4 border rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                {secondSteps.map(step => (
                  <StepRow key={step.id} step={step} onUpdate={(f, v) => handleUpdateSecondStep(step.id, f, v)} onRemove={() => handleRemoveSecondStep(step.id)} maxTime={45} />
                ))}
                <Button type="button" variant="outline" onClick={handleAddSecondStep} className="w-full mt-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  <span className="text-slate-900 dark:text-white">Schritt hinzufügen</span>
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center gap-3 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex gap-2">
              {isEditing && (
                <>
                  <Button type="button" variant="destructive" onClick={handleDeleteClick}>
                    <Trash2 className="w-4 h-4 mr-2" />Löschen
                  </Button>
                  <Button type="button" variant="outline" onClick={() => onDuplicate(lesson)} className="border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600">
                    <Copy className="w-4 h-4 mr-2" />Kopieren
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600">
                <X className="w-4 h-4 mr-2" />
                <span className="text-slate-900 dark:text-white">Abbrechen</span>
              </Button>
              <Button 
                type="submit" 
                className="text-white hover:opacity-90" 
                style={{ background: displayModalColor }} 
                disabled={isSubmitting || !isFormValid}
                title={!isFormValid ? 'Bitte wählen Sie mindestens ein Fach und eine Lektion aus.' : ''}
              >
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? "Änderungen speichern" : "Lektion planen"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}