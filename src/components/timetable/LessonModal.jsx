import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Trash2, PlusCircle, BookOpen, Copy } from "lucide-react";
import { Lesson, YearlyLesson, AllerleiLesson } from '@/api/entities';
import { debounce } from 'lodash';
import { useAllerleiLogic } from '@/components/timetable/allerlei/useAllerleiLogic';
import { AllerleiSubjectSelector, AllerleiToggleSection } from '@/components/timetable/allerlei/AllerleiComponents';
import { calculateAllerleiGradient, prepareAllerleiForPersist } from '@/components/timetable/allerlei/AllerleiUtils';
import { findFreeSlot } from '@/utils/slotUtils';
import { createGradient, createMixedSubjectGradient } from '@/utils/colorUtils';
import pb from '@/api/pb';
import { allerleiService } from '@/components/timetable/hooks/allerleiService';
import { useLessonStore } from '@/store';
import LessonTemplatePopover from '@/components/lesson-planning/LessonTemplatePopover';
import { useQueryClient } from '@tanstack/react-query';

const WORK_FORMS = [
  { value: 'frontal', label: '🗣️ Frontal' },
  { value: 'single', label: '👤 Einzelarbeit' },
  { value: 'partner', label: '👥 Partnerarbeit' },
  { value: 'group', label: '👨‍👩‍👧‍👦 Gruppenarbeit' },
  { value: 'plenum', label: '🏛️ Plenum' },
  { value: 'discussion', label: '💬 Diskussion' },
  { value: 'experiment', label: '🧪 Experiment' }
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
  subjectColor, initialSubject, subjects, topics, activeClassId, setEditingLesson,
  setIsModalOpen, currentYear,
  formData: propFormData = {} // Rename prop to propFormData
}) {
  const { setAllLessons } = useLessonStore();  // Korrigiert: Hook an Top-Level
  const queryClient = useQueryClient();

  // Direkt nach den Props
  const [formData, setFormData] = useState(() => {
    // Wenn formData von außen kommt (z.B. beim Allerlei-Drag), dann verwenden
    if (propFormData && Object.keys(propFormData).length > 0) {
      return propFormData;
    }
    // Sonst normal initialisieren
    return {};
  });
  const [primarySteps, setPrimarySteps] = useState([]);
  const [secondSteps, setSecondSteps] = useState([]);
  const [addSecondLesson, setAddSecondLesson] = useState(false);
  const [selectedSecondLesson, setSelectedSecondLesson] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [integratedOriginalData, setIntegratedOriginalData] = useState({});
  const [wasAllerlei, setWasAllerlei] = useState(!!lesson?.collectionName === 'allerlei_lessons');
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isUnifiedDouble, setIsUnifiedDouble] = useState(false); // neu!
  const [dissolvingPrimaryId, setDissolvingPrimaryId] = useState(null);

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
    if (!selectedSubject) return [];
    // selectedSubject ist die Subject-ID; Topic.subject kann aber entweder die ID oder der Subject-Name sein.
    const selectedSubjectObj = subjectOptions.find(s => s.id === selectedSubject);
    const selectedSubjectName = selectedSubjectObj?.name;
    return topics?.filter(topic =>
      // Akzeptiere Topics, deren topic.subject mit der ID übereinstimmt
      topic.subject === selectedSubject ||
      // ...oder mit dem Subject-Namen übereinstimmt (Fallback)
      (selectedSubjectName && topic.subject === selectedSubjectName)
    ) || [];
  }, [topics, subjectOptions, selectedSubject]);

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

  // Memoisiere Callbacks
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
    setSelectedLessons,
    selectLesson,
    getAvailableAllerleiLessons,
    allerleiSteps,
    setAllerleiSteps,
    updateStep: updateAllerleiStep,
    addStep: addAllerleiStep,
    removeStep: removeAllerleiStep,
    getAllerleiYearlyLessonIds,
    validate: validateAllerleiSelection,
    setAllerleiSubjects
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
    onIntegratedDataChange,
    currentYear, 
    activeClassId,
    selectedSubject  // ← NEU: hinzufügen
  });

  // Jetzt erst dürfen wir isAllerlei benutzen!
  const availableSecondLessons = useMemo(() => {
    if (isAllerlei || !formData.is_double_lesson || !selectedSubject) return [];
  
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
  }, [isAllerlei, formData.is_double_lesson, selectedSubject, allYearlyLessons, currentWeek, lesson, slotInfo, scheduledLessonIds]);

  const handleAllerleiToggle = async (checked) => {
    setValidationError(null);
    handleAllerleiToggleHook(checked);

    if (checked) {
      // ─────── Primary YL bestimmen (bestehende Lektion) oder neu anlegen (neuer Slot) ───────
      let primaryYlId = lesson?.yearly_lesson_id || null;

      // Nur bei neuem Slot (keine lesson) → neue Primary YL anlegen
      if (!primaryYlId && selectedSubject) {
        const nextNumber = allYearlyLessons.filter(yl => yl.subject === selectedSubject && yl.week_number === currentWeek).length + 1;
        const newYl = await YearlyLesson.create({
          subject: selectedSubject,
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
        primaryYlId = newYl.id;
        console.log('Debug: Created new primary YL for empty slot:', primaryYlId);
      }

      // ─────── formData sofort auf "bestehende Allerlei" setzen → Hook erstellt KEINE neue YL ───────
      setFormData(prev => ({
        ...prev,
        is_allerlei: true,
        primary_yearly_lesson_id: primaryYlId,
        added_yearly_lesson_ids: []
      }));

      setSelectedLessons({ 0: primaryYlId });
      setAllerleiSubjects([]);
      // Removed: setAddSecondLesson(true); // No longer mixes with double lessons
    } else {
      // Primary-ID holen, BEVOR wir den Modus wechseln
      const currentPrimaryId = getAllerleiYearlyLessonIds()[0];

      if (!currentPrimaryId) {
        setValidationError('Primäre Lektion konnte nicht ermittelt werden.');
        return;
      }

      // ID für den Submit-Zweig merken
      setDissolvingPrimaryId(currentPrimaryId);

      const primaryYL = allYearlyLessons.find(yl => yl.id === currentPrimaryId);
      const primaryOrig = integratedOriginalData[currentPrimaryId] || {};

      if (!primaryYL) {
        setValidationError('Primäre Lektion nicht gefunden.');
        return;
      }

      // Jetzt erst den Modus wechseln
      handleAllerleiToggleHook(false);

      setSelectedSubject(primaryYL.subject);
      setFormData(prev => ({ 
        ...prev, 
        name: primaryOrig.original_name || primaryYL.name || 'Primäre Lektion',
        topic_id: primaryOrig.original_topic_id || primaryYL.topic_id || "no_topic",
        is_allerlei: false,
        primary_yearly_lesson_id: null,
        added_yearly_lesson_ids: [],
      }));

      setPrimarySteps((primaryOrig.steps || primaryYL.steps || []).map(s => ({ ...s, id: generateId() })));
      setSecondSteps([]);  
      setAllerleiSteps({});  
      setAllerleiSubjects([]);
      setSelectedLessons({});
      setAddSecondLesson(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const lessonToLoad = copiedLesson || lesson || {};
      originalLessonRef.current = lesson;
      // Normalize topic id: topic may be stored as ID, as title/name, or be 'no_topic'
      const rawTopicRef = lessonToLoad.topic_id || "no_topic";
      let resolvedTopicId = "no_topic";
      if (rawTopicRef && rawTopicRef !== 'no_topic') {
        // Try direct ID match in topics prop
        const foundById = topics?.find(t => t.id === rawTopicRef);
        if (foundById) {
          resolvedTopicId = foundById.id;
        } else {
          // Try matching by title/name (case-insensitive)
          const foundByTitle = topics?.find(t => (t.title || '').toString().toLowerCase() === String(rawTopicRef).toLowerCase());
          resolvedTopicId = foundByTitle ? foundByTitle.id : rawTopicRef;
        }
      }
      let loadedTopicId = resolvedTopicId;
      let loadedName = '';
      let loadedSecondName = '';
      let loadedPrimarySteps = [];
      let loadedAllerleiSubjects = [];
      let loadedAllerleiYearlyLessonIds = [];
      let loadedPrimaryYlId = null;
      let loadedAddedYlIds = [];

      if (lessonToLoad.collectionName === 'allerlei_lessons') {
        loadedName = lessonToLoad.description || 'Allerlei';
        loadedPrimaryYlId = lessonToLoad.primary_yearly_lesson_id;
        loadedAddedYlIds = lessonToLoad.added_yearly_lesson_ids || [];
        loadedAllerleiSubjects = []; // Extrahiere aus YLs
        loadedAllerleiYearlyLessonIds = [loadedPrimaryYlId, ...loadedAddedYlIds];
        if (loadedPrimaryYlId) {
          const primaryYL = allYearlyLessons.find(yl => yl.id === loadedPrimaryYlId);
          if (primaryYL) {
            loadedName = primaryYL.name || `Lektion ${primaryYL.lesson_number}`;
            loadedTopicId = primaryYL.topic_id || "no_topic";
            loadedPrimarySteps = lessonToLoad.steps?.filter(step => !step.id?.startsWith('allerlei-') && !step.id?.startsWith('second-'))
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
          loadedSecondName = secondYL.name || `Lektion ${Number(lessonToLoad.yearly_lesson_id ? allYearlyLessons.find(yl => yl.id === lesson.yearly_lesson_id)?.lesson_number || 1 : 1) + 1}`;
        }
      }

      // ─── NEU: loadedSubject berechnen ─────────────────────────────────────
      let loadedSubject = lessonToLoad.subject || initialSubject || "";
      if (lessonToLoad.collectionName === 'allerlei_lessons' && loadedPrimaryYlId) {
        const primaryYL = allYearlyLessons.find(yl => yl.id === loadedPrimaryYlId);
        loadedSubject = primaryYL?.subject || initialSubject || "";
      }

      setFormData({
        topic_id: loadedTopicId,
        is_double_lesson: lessonToLoad.is_double_lesson || false,
        is_exam: lessonToLoad.is_exam || false,
        is_half_class: lessonToLoad.is_half_class || false,
        original_topic_id: lesson?.topic_id || "no_topic",
        name: loadedName,
        second_name: loadedSecondName,
        primary_yearly_lesson_id: loadedPrimaryYlId,
        added_yearly_lesson_ids: loadedAddedYlIds,
        is_allerlei: lessonToLoad.collectionName === 'allerlei_lessons',
        subject: loadedSubject                     // ← NEU: subject in formData speichern
      });

      setSelectedSubject(loadedSubject);             // ← WICHTIG: selectedSubject korrekt setzen
      setAddSecondLesson(lessonToLoad.is_double_lesson && !!lessonToLoad.second_yearly_lesson_id);
      setSelectedSecondLesson(lessonToLoad.second_yearly_lesson_id || "");
      setPrimarySteps(loadedPrimarySteps);

      if (lessonToLoad.is_double_lesson && lessonToLoad.second_yearly_lesson_id) {
        const secondYL = allYearlyLessons.find(yl => yl.id === lessonToLoad.second_yearly_lesson_id);
        setSecondSteps(secondYL?.steps?.map(s => ({ ...s, id: `second-${s.id || generateId()}` })) || []);
      } else {
        setSecondSteps(lessonToLoad.steps?.filter(step => step.id?.startsWith('second-'))
          .map(s => ({ ...s, id: `second-${s.id || generateId()}` })) || []);
      }
      setWasAllerlei(lessonToLoad.collectionName === 'allerlei_lessons');
    }
  }, [isOpen, lesson, copiedLesson, initialSubject, allYearlyLessons]);

  // ─── Sync selectedSubject → formData.subject (für neue Lektionen wichtig) ─────
  useEffect(() => {
    if (selectedSubject && !isAllerlei && (!formData.subject || formData.subject !== selectedSubject)) {
      setFormData(prev => ({ ...prev, subject: selectedSubject }));
    }
  }, [selectedSubject, isAllerlei, formData.subject]);

  const handleAutoFill = useCallback(() => {
    if (!selectedSubject) return;

    const subjectYearlyLessons = allYearlyLessons.filter(yl => yl.subject === selectedSubject && yl.week_number === currentWeek);
    if (subjectYearlyLessons.length === 0) return;

    const firstLesson = subjectYearlyLessons[0];
    const firstSteps = firstLesson.steps?.map(s => ({ ...s, id: generateId() })) || [];

    setPrimarySteps(firstSteps);
    setFormData(prev => ({
      ...prev,
      topic_id: firstLesson.topic_id || "no_topic",
      is_double_lesson: firstLesson.is_double_lesson || false,
      is_exam: firstLesson.is_exam || false,
      is_half_class: firstLesson.is_half_class || false,
    }));

    if (firstLesson.is_double_lesson && firstLesson.second_yearly_lesson_id) {
      const secondLesson = subjectYearlyLessons.find(yl => yl.id === firstLesson.second_yearly_lesson_id);
      const secondSteps = secondLesson?.steps?.map(s => ({ ...s, id: `second-${s.id || generateId()}` })) || [];
      setSecondSteps(secondSteps);
      setAddSecondLesson(true);
      setSelectedSecondLesson(secondLesson.id);
    } else {
      setSecondSteps([]);
      setAddSecondLesson(false);
      setSelectedSecondLesson("");
    }
  }, [selectedSubject, allYearlyLessons, currentWeek]);

  useEffect(() => {
    if (isOpen && !isEditing && !copiedLesson) {
      handleAutoFill();
    }
  }, [isOpen, isEditing, copiedLesson, handleAutoFill]);

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
      setIsUnifiedDouble(false); // neu: reset unified mode
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
  const handleUpdateSecondStep = (id, field, value) => setSecondSteps(secondSteps.map((step) => step.id === id ? { ...step, [field]: value } : step));
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
      if (isAllerlei) {
        validateAllerleiSelection();
      }

      // Optional: Prüfung, ob Folgeslots frei sind
      if (isAllerlei && (formData.period_span || 1) > 1) {
        const span = formData.period_span || 1;
        const startPeriod = slotInfo?.period || lesson.period_slot;
        const endPeriod = startPeriod + span - 1;

        const conflicting = allLessons.some(l => 
          l.week_number === currentWeek &&
          l.day_of_week === (slotInfo?.day || lesson.day_of_week) &&
          l.period_slot > startPeriod &&
          l.period_slot <= endPeriod &&
          !l.is_hidden
        );

        if (conflicting) {
          setValidationError(`Die folgenden ${span - 1} Perioden sind nicht frei. Bitte wähle einen freien Block.`);
          return;
        }
      }

      let lessonData = null;
      let toDeleteIds = [];
      const finalSubject = selectedSubject || lesson?.subject;
      if (!finalSubject) {
        setValidationError('Bitte wählen Sie ein Fach aus.');
        return;
      }

      // Handle dissolution: Von Allerlei → normale Lektion
      if (isEditing && wasAllerlei && !isAllerlei) {
        try {
          const primaryId = dissolvingPrimaryId || getAllerleiYearlyLessonIds()[0];
          
          if (!primaryId) {
            setValidationError('Primäre Lektion konnte nicht ermittelt werden.');
            return;
          }

          // IDs zum Wiederherstellen
          const ylIdsToRestore = dissolvingPrimaryId 
            ? [dissolvingPrimaryId, ...getAllerleiYearlyLessonIds().slice(1)]
            : getAllerleiYearlyLessonIds();

          // Normale Lessons aus YearlyLessons erstellen
          const restoredLessons = await allerleiService.restoreYearlyLessons(
            ylIdsToRestore,
            allLessons,
            timeSlots,
            currentWeek,
            lesson.day_of_week,
            lesson.period_slot
          );

          // WICHTIG: Die Allerlei-Lektion nur löschen, wenn sie noch existiert
          try {
            await AllerleiLesson.delete(lesson.id);
            console.log('Allerlei-Lektion erfolgreich gelöscht:', lesson.id);
          } catch (err) {
            if (err.status === 404) {
              console.log('Allerlei-Lektion war bereits gelöscht – das ist ok.');
            } else {
              throw err; // Nur bei echtem Fehler weiterwerfen
            }
          }

          // Refetch + invalidate
          const updatedLessons = await Lesson.find({ week_number: currentWeek, user_id: pb.authStore.model.id });
          setAllLessons(updatedLessons);

          await queryClient.invalidateQueries({ queryKey: ['lessons', currentWeek] });
          await queryClient.invalidateQueries({ queryKey: ['yearlyLessons'] });

          const restoredPrimary = restoredLessons.find(l => l.yearly_lesson_id === primaryId) ||
                                  updatedLessons.find(l => l.yearly_lesson_id === primaryId && !l.is_hidden);

          if (restoredPrimary) {
            setEditingLesson(restoredPrimary);
            onClose();
            setTimeout(() => setIsModalOpen(true), 150);
          } else {
            setValidationError('Primäre Lektion konnte nach Auflösung nicht gefunden werden.');
          }

          setDissolvingPrimaryId(null);
        } catch (error) {
          console.error('Fehler beim Auflösen der Allerlei-Lektion:', error);
          setValidationError('Fehler beim Auflösen. Bitte Seite neu laden und erneut versuchen.');
        }
        return;
      }

      // Handle double lesson deletion
      if (formData.is_double_lesson && addSecondLesson && selectedSecondLesson) {
        const lessonOnGridToDelete = allLessons.find(l => l.yearly_lesson_id === selectedSecondLesson);
        if (lessonOnGridToDelete) {
          toDeleteIds.push(lessonOnGridToDelete.id);
        }
        // Bereinige die zweite YearlyLesson – sie darf KEIN is_double_lesson haben
        await YearlyLesson.update(selectedSecondLesson, {
          is_double_lesson: false,
          second_yearly_lesson_id: null
        });
      } else if (isEditing && !formData.is_double_lesson && lesson?.is_double_lesson) {
        // Doppellektion wird aufgelöst → Slave-Lesson freigeben

        // 1. Master auf normal setzen
        if (lesson.yearly_lesson_id) {
          await YearlyLesson.update(lesson.yearly_lesson_id, {
            is_double_lesson: false,
            second_yearly_lesson_id: null
          });
        }

        // 2. Slave-Lesson suchen und freigeben
        const slaveLesson = allLessons.find(l => 
          l.double_master_id === lesson.id &&
          l.week_number === currentWeek
        );

        if (slaveLesson) {
          await Lesson.update(slaveLesson.id, {
            double_master_id: null,
            is_double_lesson: false,
            second_yearly_lesson_id: null
          });

          // Optional: Auch deren YearlyLesson bereinigen
          if (slaveLesson.yearly_lesson_id) {
            await YearlyLesson.update(slaveLesson.yearly_lesson_id, {
              is_double_lesson: false
            });
          }
        }
      }

      // Handle integration
      if (isAllerlei) {
        if (typeof allerleiService.integrate !== 'function') {
          console.error('Debug: integrate missing in allerleiService', allerleiService);
          setValidationError('Integration service not available. Check console for details.');
          setIsSubmitting(false);
          return;
        }
        await allerleiService.integrate(
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

      const preparedFormData = prepareAllerleiForPersist(formData);

      if (isEditing && lesson.collectionName === 'allerlei_lessons' && isAllerlei) {  
        lessonData = {
          id: lesson.id,
          ...preparedFormData,
          description: "Allerlei: " + (allerleiSubjects || []).filter(Boolean).join(', '),
          steps: [
            ...primarySteps,
            ...Object.values(allerleiSteps).flat(),
            ...(!isAllerlei && addSecondLesson ? secondSteps : [])
          ],
          subject: null,
          primary_yearly_lesson_id: getAllerleiYearlyLessonIds()[0],
          added_yearly_lesson_ids: getAllerleiYearlyLessonIds().slice(1),
          allerlei_subjects: allerleiSubjects,
          period_span: formData.period_span || 1, // ← NEU
        };
        await AllerleiLesson.update(lesson.id, lessonData);
      } else if (isEditing && lesson.collectionName !== 'allerlei_lessons' && isAllerlei) {  
        lessonData = {
          ...preparedFormData,
          description: "Allerlei: " + (allerleiSubjects || []).filter(Boolean).join(', '),
          steps: [
            ...primarySteps,
            ...Object.values(allerleiSteps).flat(),
            ...(!isAllerlei && addSecondLesson ? secondSteps : [])
          ],
          primary_yearly_lesson_id: getAllerleiYearlyLessonIds()[0],
          added_yearly_lesson_ids: getAllerleiYearlyLessonIds().slice(1),
          user_id: pb.authStore.model.id,
          week_number: currentWeek,
          day_of_week: lesson.day_of_week,
          period_slot: lesson.period_slot,
          isNew: true,
          collectionName: 'allerlei_lessons',
          allerlei_subjects: allerleiSubjects,
          period_span: formData.period_span || 1, // ← NEU
        };
        const newAllerlei = await allerleiService.convertToAllerlei(lesson.id, lessonData);
        lessonData.id = newAllerlei.id;
        toDeleteIds.push(lesson.id);
      } else if (isNew && isAllerlei) {  
        const yearlyIds = getAllerleiYearlyLessonIds();
        if (yearlyIds.length === 0 || !yearlyIds[0]) {
          throw new Error('No primary yearly lesson selected for Allerlei creation.');
        }
        lessonData = {
          ...preparedFormData,
          description: "Allerlei: " + (allerleiSubjects || []).filter(Boolean).join(', '),
          steps: [
            ...primarySteps,
            ...Object.values(allerleiSteps).flat(),
            ...(!isAllerlei && addSecondLesson ? secondSteps : [])
          ],
          subject: null,
          primary_yearly_lesson_id: yearlyIds[0],
          added_yearly_lesson_ids: yearlyIds.slice(1),
          user_id: pb.authStore.model.id,
          week_number: currentWeek,
          day_of_week: slotInfo.day,
          period_slot: slotInfo.period,
          allerlei_subjects: allerleiSubjects,
          period_span: formData.period_span || 1, // ← NEU
        };
        const newAllerlei = await AllerleiLesson.create(lessonData);
        // Neu: Verify creation
        const verified = await AllerleiLesson.findById(newAllerlei.id);
        if (!verified) {
          throw new Error('Allerlei creation failed, record not found.');
        }
        lessonData.id = newAllerlei.id;
      } else {  
        if (isEditing) {
          lessonData = {
            id: lesson.id,
            ...preparedFormData,
            steps: [
              ...primarySteps,
              ...(!isAllerlei && addSecondLesson ? secondSteps : [])
            ],
            subject: finalSubject,
            yearly_lesson_id: lesson.yearly_lesson_id,
            second_yearly_lesson_id: (preparedFormData.is_double_lesson && addSecondLesson && selectedSecondLesson && !isUnifiedDouble) ? selectedSecondLesson : null, // angepasst
            topic_id: preparedFormData.topic_id === 'no_topic' ? undefined : preparedFormData.topic_id,
          };
          await Lesson.update(lesson.id, lessonData);
          if (lessonData.yearly_lesson_id) {
            const primaryYL = allYearlyLessons.find(yl => yl.id === lessonData.yearly_lesson_id);
            if (primaryYL) {
              await YearlyLesson.update(lessonData.yearly_lesson_id, {
                name: preparedFormData.name || primaryYL.name || `Lektion ${primaryYL.lesson_number}`,
                steps: preparedFormData.steps?.filter(s => !s.id?.startsWith('second-')) || primaryYL.steps || [],
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
              steps: preparedFormData.steps?.filter(s => s.id?.startsWith('second-')).map(s => ({ ...s, id: s.id.replace('second-', '') })) || [],
              is_double_lesson: false,  // Bereinigen: Zweite Lektion darf kein Doppelflag haben
              second_yearly_lesson_id: null
            });
          }
        } else {
          const timeSlotForNewLesson = timeSlots.find(ts => ts.period === slotInfo.period);
          const newLessonBase = copiedLesson
            ? { ...copiedLesson, ...preparedFormData, steps: [...primarySteps, ...(!isAllerlei && addSecondLesson ? secondSteps : [])] }
            : { ...preparedFormData, steps: [...primarySteps, ...(!isAllerlei && addSecondLesson ? secondSteps : [])] };
          lessonData = {
            isNew: true,
            subject: finalSubject,
            ...newLessonBase,
            day_of_week: slotInfo.day,
            period_slot: slotInfo.period,
            week_number: currentWeek,
            start_time: timeSlotForNewLesson?.start,
            end_time: timeSlotForNewLesson?.end,
            topic_id: preparedFormData.topic_id === 'no_topic' ? undefined : preparedFormData.topic_id,
            yearly_lesson_id: copiedLesson?.yearly_lesson_id || null,
            second_yearly_lesson_id: (preparedFormData.is_double_lesson && addSecondLesson && selectedSecondLesson && !isUnifiedDouble) ? selectedSecondLesson : null, // angepasst
            user_id: pb.authStore.model.id,
            is_hidden: false
          };
          if (!lessonData.yearly_lesson_id) {
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
              steps: lessonData.steps?.filter(s => !s.id?.startsWith('second-')) || [],
              topic_id: lessonData.topic_id,
              is_double_lesson: lessonData.is_double_lesson,
              second_yearly_lesson_id: lessonData.second_yearly_lesson_id,
              is_exam: lessonData.is_exam,
              is_half_class: lessonData.is_half_class,
              user_id: pb.authStore.model.id,
              class_id: activeClassId
            });
            lessonData.yearly_lesson_id = newYearlyLesson.id;
          }
          const newLesson = await Lesson.create(lessonData);
          lessonData.id = newLesson.id;
          // Statt zwei Lessons anzulegen → nur eine Master-Lesson + Slave verlinken
          if (formData.is_double_lesson && addSecondLesson && selectedSecondLesson) {
            // Wir haben bereits eine Master-Lesson (die gerade erstellt wird)
            // Jetzt nur die zweite Lesson als Slave markieren
            const existingSecondLesson = allLessons.find(l => 
              l.yearly_lesson_id === selectedSecondLesson &&
              l.week_number === currentWeek
            );

            if (existingSecondLesson) {
              await Lesson.update(existingSecondLesson.id, {
                double_master_id: newLesson.id,  // ← Verlinkung!
                period_slot: slotInfo.period + 1
              });
            }
          }
        }
      }
      await onSave(lessonData, toDeleteIds);
      onClose();
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      setValidationError(error.message);
      import('react-hot-toast').then(({ toast }) => {
        toast.error(error.message);
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!isEditing || !window.confirm("Lektion wirklich löschen?")) return;

    // Slave-Lesson suchen und mitlöschen
    const slave = allLessons.find(l => l.double_master_id === lesson.id);
    if (slave) {
      await Lesson.delete(slave.id);
    }

    onDelete(lesson.id);
    onClose();
  };

  const [displayModalColor, setDisplayModalColor] = useState(subjectColor || '#3b82f6');

  useEffect(() => {
    if (isAllerlei) {
    const allSubjectNames = [
      subjects.find(s => s.id === selectedSubject)?.name,
      ...Object.values(selectedLessons).map(id => {
        const yl = allYearlyLessons.find(y => y.id === id);
        return yl?.expand?.subject?.name || yl?.subject_name || subjects.find(s => s.id === yl?.subject)?.name;
      }),
      ...allerleiSubjects
    ].filter(Boolean);

    const uniqueNames = [...new Set(allSubjectNames)];
    const colors = uniqueNames
      .map(name => subjects.find(s => s.name === name)?.color)
      .filter(Boolean);

    setDisplayModalColor(
      colors.length > 1 
        ? createMixedSubjectGradient(colors)
        : createGradient(colors[0] || '#3b82f6')
    );
  } else {
    const singleColor = subjects.find(s => s.id === selectedSubject)?.color || subjectColor || '#3b82f6';
    setDisplayModalColor(createGradient(singleColor));
  }
  }, [isAllerlei, selectedSubject, selectedLessons, allerleiSubjects, allYearlyLessons, subjects, subjectColor]);

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return;

    try {
      await pb.collection('lesson_templates').create({
        name: templateName.trim(),
        steps: primarySteps,
        subject: selectedSubject || null,
        user_id: pb.authStore.model.id,
        is_global: false,
      });
      import('react-hot-toast').then(({ toast }) => toast.success("Vorlage gespeichert!"));
      setShowTemplateSave(false);
      setTemplateName("");
    } catch (err) {
      import('react-hot-toast').then(({ toast }) => toast.error("Fehler beim Speichern"));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 max-h-[80vh] overflow-y-auto" 
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
                placeholder={`Lektion ${Number(lesson?.yearly_lesson_id ? allYearlyLessons.find(yl => yl.id === lesson.yearly_lesson_id)?.lesson_number || slotInfo?.period || 1 : 1) + 1}`}
                maxLength={30}
              />
            </div>
          )}      

          {(formData.is_double_lesson && !isAllerlei) && (
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

          {/* ==================== ALLERLEI SEKUNDÄRFÄCHER (nur wenn Allerlei aktiv) ==================== */}
          {isAllerlei && (
            <div className="space-y-6 mt-6 p-5 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold text-purple-900 dark:text-purple-300">
                  Sekundäre Fächer / Lektionen hinzufügen
                </Label>
                <Button onClick={addSubject} size="sm" variant="outline" className="border-purple-400 text-purple-700 hover:bg-purple-100 dark:border-purple-600 dark:text-purple-300">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Fach hinzufügen
                </Button>
              </div>

              {allerleiSubjects.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                  Noch keine sekundären Fächer ausgewählt – klicke oben auf „Fach hinzufügen“.
                </p>
              ) : (
                <div className="space-y-4">
                  {allerleiSubjects.map((subjectName, index) => {
                    const selectedLessonId = selectedLessons[index + 1] || '';
                    const availableLessons = getAvailableAllerleiLessons(subjectName, index);
                    const stepsForSubject = allerleiSteps[index] || [];

                    return (
                      <AllerleiSubjectSelector
                        key={index}
                        index={index}
                        subject={subjectName}
                        availableSubjects={subjectOptions}
                        primarySubject={subjects.find(s => s.id === selectedSubject)?.name || ''}
                        onUpdateSubject={updateSubject}
                        onRemoveSubject={removeSubject}
                        selectedLesson={selectedLessonId}
                        onSelectLesson={selectLesson}
                        availableLessons={availableLessons}
                        steps={stepsForSubject}
                        onUpdateStep={updateAllerleiStep}
                        onRemoveStep={removeAllerleiStep}
                        onAddStep={addAllerleiStep}
                        allLessons={allLessons}
                        currentWeek={currentWeek}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== DAUER DER ALLERLEI-BLOCKSTUNDE ==================== */}
          {isAllerlei && (
            <div className="space-y-2 mt-6">
              <Label className="text-sm font-semibold text-slate-900 dark:text-white">
                Dauer dieser Allerlei-Lektion
              </Label>
              <Select 
                value={formData.period_span || 1} 
                onValueChange={(val) => setFormData(prev => ({ ...prev, period_span: Number(val) }))}
              >
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={1}>1 Stunde</SelectItem>
                  <SelectItem value={2}>2 Stunden</SelectItem>
                  <SelectItem value={3}>3 Stunden</SelectItem>
                  <SelectItem value={4}>4 Stunden</SelectItem>
                  <SelectItem value={5}>5 Stunden</SelectItem>
                  <SelectItem value={6}>6 Stunden</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Die Lektion wird über {formData.period_span || 1} Perioden angezeigt. Die folgenden Slots müssen frei sein.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Label className="font-semibold text-slate-900 dark:text-white">Primäre Lektion Schritte</Label>
            <div className="space-y-3 p-4 border rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              {primarySteps.map(step => (
                <StepRow key={step.id} step={step} onUpdate={(f, v) => handleUpdatePrimaryStep(step.id, f, v)} onRemove={() => handleRemovePrimaryStep(step.id)} maxTime={isUnifiedDouble ? 90 : 45} />
              ))}
              <div className="flex gap-2 mt-2">
                <Button type="button" variant="outline" onClick={handleAddPrimaryStep} className="w-full border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  <span className="text-slate-900 dark:text-white">Schritt hinzufügen</span>
                </Button>
                <LessonTemplatePopover
                  subjectId={selectedSubject}
                  onInsert={(steps, templateName) => {  // ← templateName als zweiter Parameter
                    const withNewIds = steps.map(s => ({ ...s, id: generateId() }));
                    setPrimarySteps(prev => [...prev, ...withNewIds]);

                    // Titel der Vorlage übernehmen (falls vorhanden)
                    if (templateName) {
                      setFormData(prev => ({ ...prev, name: templateName }));
                    }
                  }}
                  currentSteps={primarySteps}
                />
              </div>
            </div>
          </div>

          {addSecondLesson && !isUnifiedDouble && (
            <div className="space-y-4">
              <Label className="font-semibold text-slate-900 dark:text-white">Zweite Lektion Schritte</Label>
              <div className="space-y-3 p-4 border rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                {secondSteps.map(step => (
                  <StepRow key={step.id} step={step} onUpdate={(f, v) => handleUpdateSecondStep(step.id, f, v)} onRemove={() => handleRemoveSecondStep(step.id)} maxTime={45} />
                ))}
                <div className="flex gap-2 mt-2">
                  <Button type="button" variant="outline" onClick={handleAddSecondStep} className="w-full border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    <span className="text-slate-900 dark:text-white">Schritt hinzufügen</span>
                  </Button>
                  <LessonTemplatePopover
                    subjectId={selectedSubject}
                    onInsert={(steps) => {
                      const withNewIds = steps.map(s => ({ ...s, id: generateId() }));
                      setSecondSteps(prev => [...prev, ...withNewIds]);
                    }}
                    currentSteps={secondSteps}
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center gap-3 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex gap-2">
              {isEditing && (
                <Button type="button" variant="destructive" onClick={handleDeleteClick}>
                  <Trash2 className="w-4 h-4 mr-2" />Löschen
                </Button>
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
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const defaultName = formData.name?.trim() || 
                                        lesson?.name?.trim() || 
                                        "Meine Vorlage";
                    setTemplateName(defaultName);
                    setShowTemplateSave(true);
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Als Vorlage speichern
                </Button>

                {/* Popup als fixed Overlay – ragt über alles hinaus */}
                {showTemplateSave && (
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    {/* Backdrop */}
                    <div 
                      className="absolute inset-0 bg-black/50"
                      onClick={() => {
                        setShowTemplateSave(false);
                        setTemplateName("");
                      }}
                    />

                    {/* Dialog */}
                    <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 w-96 max-w-[90vw]">
                      <h3 className="text-lg font-semibold mb-4">Name der Vorlage</h3>
                      
                      <Input
                        autoFocus
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveAsTemplate()}
                        placeholder="z. B. Einstieg Photosynthese"
                        className="mb-4"
                      />

                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowTemplateSave(false);
                            setTemplateName("");
                          }}
                        >
                          Abbrechen
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveAsTemplate}
                          disabled={!templateName.trim()}
                        >
                          Speichern
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}