import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import { Lesson, YearlyLesson, AllerleiLesson } from '@/api/entities';
import { debounce } from 'lodash';
import { useAllerleiLogic } from '@/components/timetable/allerlei/useAllerleiLogic';
import { AllerleiSubjectSelector, AllerleiToggleSection } from '@/components/timetable/allerlei/AllerleiComponents';
import { prepareAllerleiForPersist } from '@/components/timetable/allerlei/AllerleiUtils';
import { createGradient, createMixedSubjectGradient } from '@/utils/colorUtils';
import pb from '@/api/pb';
import { allerleiService } from '@/components/timetable/hooks/allerleiService';
import { useLessonStore } from '@/store';
import LessonTemplatePopover from '@/components/lesson-planning/LessonTemplatePopover';
import { useQueryClient } from '@tanstack/react-query';
import StepRow from '@/components/lesson-planning/StepRow';
import { generateId } from '@/components/lesson-planning/utils';
import { useStepManagement, useTemplateSaveModal } from '@/components/lesson-planning/hooks';
import TemplateSaveModal from '@/components/lesson-planning/TemplateSaveModal';

// Shared components
import {
  LessonModalHeader,
  LessonTogglesRow,
  TopicSelector,
  LessonModalFooter
} from '@/components/shared/lesson-modal';

const dayTranslations = {
  'monday': 'Montag',
  'tuesday': 'Dienstag',
  'wednesday': 'Mittwoch',
  'thursday': 'Donnerstag',
  'friday': 'Freitag',
  'saturday': 'Samstag',
  'sunday': 'Sonntag'
};

const translateDay = (day) => {
  if (!day) return 'Wochentag';
  const lowerDay = day.toLowerCase();
  return dayTranslations[lowerDay] || day.charAt(0).toUpperCase() + day.slice(1);
};

export default function LessonModal({
  isOpen, onClose, onSave, onDelete, onDuplicate,
  lesson, copiedLesson, slotInfo, currentWeek, allLessons, allYearlyLessons, timeSlots,
  subjectColor, initialSubject, subjects, topics, activeClassId, setEditingLesson,
  setIsModalOpen, currentYear,
  formData: propFormData = {},
  settings = null
}) {
  const { setAllLessons } = useLessonStore();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(() => {
    if (propFormData && Object.keys(propFormData).length > 0) {
      return propFormData;
    }
    return {};
  });

  // Use extracted hooks for step management and template save
  const {
    primarySteps,
    secondSteps,
    setPrimarySteps,
    setSecondSteps,
    handleAddPrimaryStep,
    handleRemovePrimaryStep,
    handleUpdatePrimaryStep,
    handleAddSecondStep,
    handleRemoveSecondStep,
    handleUpdateSecondStep
  } = useStepManagement();

  const {
    showTemplateSave,
    templateName,
    setTemplateName,
    handleSaveAsTemplate: saveTemplate,
    openTemplateSave,
    closeTemplateSave
  } = useTemplateSaveModal();

  const [addSecondLesson, setAddSecondLesson] = useState(false);
  const [selectedSecondLesson, setSelectedSecondLesson] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("no_topic");
  const [availableTopics, setAvailableTopics] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [integratedOriginalData, setIntegratedOriginalData] = useState({});
  const [wasAllerlei, setWasAllerlei] = useState(lesson?.collectionName === 'allerlei_lessons');
  const [isUnifiedDouble, setIsUnifiedDouble] = useState(false);
  const [dissolvingPrimaryId, setDissolvingPrimaryId] = useState(null);
  const [topicMaterials, setTopicMaterials] = useState([]);

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
    const selectedSubjectObj = subjectOptions.find(s => s.id === selectedSubject);
    const selectedSubjectName = selectedSubjectObj?.name;
    return topics?.filter(topic =>
      topic.subject === selectedSubject ||
      (selectedSubjectName && topic.subject === selectedSubjectName)
    ) || [];
  }, [topics, subjectOptions, selectedSubject]);

  const currentTopic = useMemo(() => {
    if (!formData.topic_id || formData.topic_id === 'no_topic') return null;
    return subjectTopics.find(t => t.id === formData.topic_id);
  }, [formData.topic_id, subjectTopics]);

  const [displayModalColor, setDisplayModalColor] = useState(subjectColor || '#3b82f6');
  const topicColor = currentTopic?.color || displayModalColor || subjectColor || '#3b82f6';

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

  // Allerlei callbacks
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
    selectedSubject
  });

  // Update modal color based on allerlei state
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

  // Available second lessons for double lesson
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

  // Handle Allerlei toggle
  const handleAllerleiToggle = async (checked) => {
    setValidationError(null);
    handleAllerleiToggleHook(checked);

    if (checked) {
      let primaryYlId = lesson?.yearly_lesson_id || null;

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
      }

      setFormData(prev => ({
        ...prev,
        is_allerlei: true,
        primary_yearly_lesson_id: primaryYlId,
        added_yearly_lesson_ids: []
      }));

      setSelectedLessons({ 0: primaryYlId });
      setAllerleiSubjects([]);
    } else {
      const currentPrimaryId = getAllerleiYearlyLessonIds()[0];

      if (!currentPrimaryId) {
        setValidationError('Primäre Lektion konnte nicht ermittelt werden.');
        return;
      }

      setDissolvingPrimaryId(currentPrimaryId);

      const primaryYL = allYearlyLessons.find(yl => yl.id === currentPrimaryId);
      const primaryOrig = integratedOriginalData[currentPrimaryId] || {};

      if (!primaryYL) {
        setValidationError('Primäre Lektion nicht gefunden.');
        return;
      }

      handleAllerleiToggleHook(false);

      setSelectedSubject(primaryYL.subject);
      // Prüfen ob die Primary-YL eine Prüfung/Halbklasse war (aus Allerlei oder YL selbst)
      const wasExam = lesson?.exam_yearly_lesson_ids?.includes(currentPrimaryId) || primaryYL.is_exam || false;
      const wasHalfClass = lesson?.half_class_yearly_lesson_ids?.includes(currentPrimaryId) || primaryYL.is_half_class || false;
      setFormData(prev => ({
        ...prev,
        name: primaryOrig.original_name || primaryYL.name || 'Primäre Lektion',
        topic_id: primaryOrig.original_topic_id || primaryYL.topic_id || "no_topic",
        is_allerlei: false,
        primary_yearly_lesson_id: null,
        added_yearly_lesson_ids: [],
        is_exam: wasExam,
        is_half_class: wasHalfClass,
        is_double_lesson: primaryYL.is_double_lesson || false,
      }));

      setPrimarySteps((primaryOrig.steps || primaryYL.steps || []).map(s => ({ ...s, id: generateId() })));
      setSecondSteps([]);
      setAllerleiSteps({});
      setAllerleiSubjects([]);
      setSelectedLessons({});
      setAddSecondLesson(false);
    }
  };

  // Initialize form data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const lessonToLoad = copiedLesson || lesson || {};
    originalLessonRef.current = lesson;

    const rawTopicRef = lessonToLoad.topic_id || "no_topic";
    let resolvedTopicId = "no_topic";
    if (rawTopicRef && rawTopicRef !== 'no_topic') {
      const foundById = topics?.find(t => t.id === rawTopicRef);
      if (foundById) {
        resolvedTopicId = foundById.id;
      } else {
        const foundByTitle = topics?.find(t => (t.title || '').toString().toLowerCase() === String(rawTopicRef).toLowerCase());
        resolvedTopicId = foundByTitle ? foundByTitle.id : rawTopicRef;
      }
    }

    let loadedTopicId = resolvedTopicId;
    let loadedName = '';
    let loadedSecondName = '';
    let loadedPrimarySteps = [];
    let loadedPrimaryYlId = null;
    let loadedAddedYlIds = [];

    if (lessonToLoad.collectionName === 'allerlei_lessons') {
      loadedName = lessonToLoad.description || 'Allerlei';
      loadedPrimaryYlId = lessonToLoad.primary_yearly_lesson_id;
      loadedAddedYlIds = lessonToLoad.added_yearly_lesson_ids || [];
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
        // Nur YearlyLesson-Topic verwenden wenn Lesson selbst kein Topic hat
        if (!lessonToLoad.topic_id || lessonToLoad.topic_id === 'no_topic') {
          loadedTopicId = primaryYL.topic_id || "no_topic";
        }
        loadedName = primaryYL.name || `Lektion ${primaryYL.lesson_number}`;
        loadedPrimarySteps = primaryYL.steps?.map(s => ({ ...s, id: s.id || generateId() })) || [];
      }
    }

    setPrimarySteps(loadedPrimarySteps);

    if (lessonToLoad.is_double_lesson && lessonToLoad.second_yearly_lesson_id) {
      const secondYL = allYearlyLessons.find(yl => yl.id === lessonToLoad.second_yearly_lesson_id);
      if (secondYL) {
        loadedSecondName = secondYL.name || `Lektion ${Number(lessonToLoad.yearly_lesson_id ? allYearlyLessons.find(yl => yl.id === lesson.yearly_lesson_id)?.lesson_number || 1 : 1) + 1}`;
      }
    }

    let loadedSubject = initialSubject || "";
    if (lessonToLoad.subject) {
      loadedSubject = lessonToLoad.subject;
    } else if (lessonToLoad.collectionName === 'allerlei_lessons' && loadedPrimaryYlId) {
      const primaryYL = allYearlyLessons.find(yl => yl.id === loadedPrimaryYlId);
      if (primaryYL?.subject) {
        loadedSubject = primaryYL.subject;
      }
    } else if (lessonToLoad.yearly_lesson_id) {
      const yl = allYearlyLessons.find(yl => yl.id === lessonToLoad.yearly_lesson_id);
      if (yl?.subject) {
        loadedSubject = yl.subject;
      }
    } else {
      loadedSubject = initialSubject || "";
    }

    const selectedSubjectObj = subjectOptions.find(s => s.id === loadedSubject);
    const selectedSubjectName = selectedSubjectObj?.name;

    const currentSubjectTopics = topics?.filter(topic =>
      topic.subject === loadedSubject ||
      (selectedSubjectName && topic.subject === selectedSubjectName)
    ) || [];

    const resolvedTopic = loadedTopicId !== "no_topic"
      ? currentSubjectTopics.find(t => t.id === loadedTopicId)
      : null;

    const resolvedMaterials = resolvedTopic?.materials || [];

    setAvailableTopics(currentSubjectTopics);
    setSelectedTopicId(loadedTopicId);
    setTopicMaterials(resolvedMaterials);
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
      subject: loadedSubject
    });
    setSelectedSubject(loadedSubject);
    setAddSecondLesson(lessonToLoad.is_double_lesson && !!lessonToLoad.second_yearly_lesson_id);
    setSelectedSecondLesson(lessonToLoad.second_yearly_lesson_id || "");

    // In fixed schedule mode, double lessons are treated as unified 90-minute blocks
    if (settings?.scheduleType === 'fixed' && lessonToLoad.is_double_lesson) {
      setIsUnifiedDouble(true);
      setAddSecondLesson(false);
    } else {
      setIsUnifiedDouble(false);
    }

    if (lessonToLoad.is_double_lesson && lessonToLoad.second_yearly_lesson_id) {
      const secondYL = allYearlyLessons.find(yl => yl.id === lessonToLoad.second_yearly_lesson_id);
      setSecondSteps(secondYL?.steps?.map(s => ({
        ...s,
        id: s.id?.startsWith('second-') ? s.id : `second-${s.id || generateId()}`
      })) || []);
    } else {
      setSecondSteps(lessonToLoad.steps?.filter(step => step.id?.startsWith('second-'))
        .map(s => ({
          ...s,
          id: s.id?.startsWith('second-') ? s.id : `second-${s.id || generateId()}`
        })) || []);
    }
    setWasAllerlei(lessonToLoad.collectionName === 'allerlei_lessons');
  }, [isOpen, lesson, copiedLesson, initialSubject, allYearlyLessons, topics, subjectOptions, settings]);

  // Sync selectedSubject to formData
  useEffect(() => {
    if (selectedSubject && !isAllerlei && (!formData.subject || formData.subject !== selectedSubject)) {
      setFormData(prev => ({ ...prev, subject: selectedSubject }));
    }
  }, [selectedSubject, isAllerlei, formData.subject]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedTopicId("no_topic");
      setAvailableTopics([]);
    }
  }, [isOpen]);

  // Sync topic_id
  useEffect(() => {
    if (selectedTopicId !== formData.topic_id) {
      setFormData(prev => ({ ...prev, topic_id: selectedTopicId }));
    }
  }, [selectedTopicId, formData.topic_id]);

  // Auto-fill for new lessons
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
  }, [selectedSubject, allYearlyLessons, currentWeek, setPrimarySteps, setSecondSteps]);

  useEffect(() => {
    if (isOpen && !isEditing && !copiedLesson) {
      handleAutoFill();
    }
  }, [isOpen, isEditing, copiedLesson, handleAutoFill]);

  // Handle double lesson toggle
  const handleDoubleToggle = (checked) => {
    setFormData(prev => ({ ...prev, is_double_lesson: checked }));

    if (checked) {
      // In fixed schedule mode, double lessons are unified 90-minute blocks
      if (settings?.scheduleType === 'fixed') {
        setIsUnifiedDouble(true);
        setAddSecondLesson(false);
      } else {
        setAddSecondLesson(true);
      }

      if (!selectedSecondLesson && settings?.scheduleType !== 'fixed') {
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

        const nextLesson = subjectYearlyLessons.find(yl => yl.lesson_number === currentLessonNumber + 1);

        if (nextLesson) {
          setSelectedSecondLesson(nextLesson.id);
          const newSecondSteps = nextLesson.steps?.map(step => ({
            ...step,
            id: step.id?.startsWith('second-') ? step.id : `second-${generateId()}-${step.id || generateId()}`
          })) || [];
          setSecondSteps(newSecondSteps);
        }
      }
    } else {
      setAddSecondLesson(false);
      setSecondSteps([]);
      setSelectedSecondLesson("");
      setIsUnifiedDouble(false);
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
        id: step.id?.startsWith('second-') ? step.id : `second-${generateId()}-${step.id || generateId()}`
      }));
      setSecondSteps(newSecondLessonSteps);
    }
  };

  const isFormValid = useMemo(() => {
    if (!isAllerlei) return !!selectedSubject || isEditing;
    return allerleiSubjects.filter(Boolean).length >= 1 &&
           getAllerleiYearlyLessonIds().every(id => id) &&
           (selectedSubject || isEditing);
  }, [isAllerlei, allerleiSubjects, selectedSubject, isEditing, getAllerleiYearlyLessonIds]);

  // Submit handler (kept as-is due to complexity)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !isFormValid) return;
    setIsSubmitting(true);
    setValidationError(null);

    try {
      if (isAllerlei) {
        validateAllerleiSelection();
      }

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

          const ylIdsToRestore = dissolvingPrimaryId
            ? [dissolvingPrimaryId, ...getAllerleiYearlyLessonIds().slice(1)]
            : getAllerleiYearlyLessonIds();

          const restoredLessons = await allerleiService.restoreYearlyLessons(
            ylIdsToRestore,
            allLessons,
            timeSlots,
            currentWeek,
            lesson.day_of_week,
            lesson.period_slot,
            lesson  // Pass Allerlei lesson for exam/half_class info
          );

          try {
            await AllerleiLesson.delete(lesson.id);
          } catch (err) {
            if (err.status !== 404) throw err;
          }

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
        await YearlyLesson.update(selectedSecondLesson, {
          is_double_lesson: false,
          second_yearly_lesson_id: null
        });
      } else if (isEditing && !formData.is_double_lesson && lesson?.is_double_lesson) {
        if (lesson.yearly_lesson_id) {
          await YearlyLesson.update(lesson.yearly_lesson_id, {
            is_double_lesson: false,
            second_yearly_lesson_id: null
          });
        }

        const slaveLesson = allLessons.find(l =>
          l.double_master_id === lesson.id &&
          l.week_number === currentWeek
        );

        if (slaveLesson) {
          await Lesson.update(slaveLesson.id, {
            double_master_id: null,
            is_double_lesson: false,
            second_yearly_lesson_id: null,
            period_span: 1
          });

          if (slaveLesson.yearly_lesson_id) {
            await YearlyLesson.update(slaveLesson.yearly_lesson_id, {
              is_double_lesson: false
            });
          }
        }

        // Master-Lesson period_span zurücksetzen
        await Lesson.update(lesson.id, { period_span: 1 });
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

      const preparedFormData = prepareAllerleiForPersist(formData);

      if (isEditing && lesson.collectionName === 'allerlei_lessons' && isAllerlei) {
        // Sammle exam/half_class IDs NEU von den ausgewählten YearlyLessons
        const editYearlyIds = getAllerleiYearlyLessonIds();
        const editExamYlIds = [];
        const editHalfClassYlIds = [];
        editYearlyIds.forEach(ylId => {
          const yl = allYearlyLessons.find(y => y.id === ylId);
          if (yl?.is_exam) editExamYlIds.push(ylId);
          if (yl?.is_half_class) editHalfClassYlIds.push(ylId);
        });

        lessonData = {
          id: lesson.id,
          ...preparedFormData,
          is_allerlei: true,
          collectionName: 'allerlei_lessons',
          description: "Allerlei: " + (allerleiSubjects || []).filter(Boolean).join(', '),
          steps: [
            ...primarySteps,
            ...Object.values(allerleiSteps).flat(),
            ...(!isAllerlei && addSecondLesson ? secondSteps : [])
          ],
          subject: null,
          primary_yearly_lesson_id: editYearlyIds[0],
          added_yearly_lesson_ids: editYearlyIds.slice(1),
          allerlei_subjects: allerleiSubjects,
          period_span: formData.period_span || 1,
          exam_yearly_lesson_ids: editExamYlIds,
          half_class_yearly_lesson_ids: editHalfClassYlIds,
        };
        await AllerleiLesson.update(lesson.id, lessonData);
      } else if (isEditing && lesson.collectionName !== 'allerlei_lessons' && isAllerlei) {
        // Sammle exam/half_class IDs von den ausgewählten YearlyLessons
        const convertYearlyIds = getAllerleiYearlyLessonIds();
        const convertExamYlIds = [];
        const convertHalfClassYlIds = [];
        convertYearlyIds.forEach(ylId => {
          const yl = allYearlyLessons.find(y => y.id === ylId);
          if (yl?.is_exam) convertExamYlIds.push(ylId);
          if (yl?.is_half_class) convertHalfClassYlIds.push(ylId);
        });

        lessonData = {
          ...preparedFormData,
          description: "Allerlei: " + (allerleiSubjects || []).filter(Boolean).join(', '),
          steps: [
            ...primarySteps,
            ...Object.values(allerleiSteps).flat(),
            ...(!isAllerlei && addSecondLesson ? secondSteps : [])
          ],
          primary_yearly_lesson_id: convertYearlyIds[0],
          added_yearly_lesson_ids: convertYearlyIds.slice(1),
          user_id: pb.authStore.model.id,
          week_number: currentWeek,
          day_of_week: lesson.day_of_week,
          period_slot: lesson.period_slot,
          isNew: true,
          collectionName: 'allerlei_lessons',
          allerlei_subjects: allerleiSubjects,
          period_span: formData.period_span || 1,
          exam_yearly_lesson_ids: convertExamYlIds,
          half_class_yearly_lesson_ids: convertHalfClassYlIds,
        };
        const newAllerlei = await allerleiService.convertToAllerlei(lesson.id, lessonData);
        lessonData.id = newAllerlei.id;
        toDeleteIds.push(lesson.id);
      } else if (isNew && isAllerlei) {
        const yearlyIds = getAllerleiYearlyLessonIds();
        if (yearlyIds.length === 0 || !yearlyIds[0]) {
          throw new Error('No primary yearly lesson selected for Allerlei creation.');
        }

        // Sammle exam/half_class IDs von den ausgewählten YearlyLessons
        const newExamYlIds = [];
        const newHalfClassYlIds = [];
        yearlyIds.forEach(ylId => {
          const yl = allYearlyLessons.find(y => y.id === ylId);
          if (yl?.is_exam) newExamYlIds.push(ylId);
          if (yl?.is_half_class) newHalfClassYlIds.push(ylId);
        });

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
          period_span: formData.period_span || 1,
          exam_yearly_lesson_ids: newExamYlIds,
          half_class_yearly_lesson_ids: newHalfClassYlIds,
        };
        const newAllerlei = await AllerleiLesson.create(lessonData);
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
            second_yearly_lesson_id: (preparedFormData.is_double_lesson && addSecondLesson && selectedSecondLesson && !isUnifiedDouble) ? selectedSecondLesson : null,
            topic_id: preparedFormData.topic_id === 'no_topic' ? undefined : preparedFormData.topic_id,
            period_span: (preparedFormData.is_double_lesson && addSecondLesson && !isUnifiedDouble) ? 2 : 1,
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
              is_double_lesson: false,
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
            second_yearly_lesson_id: (preparedFormData.is_double_lesson && addSecondLesson && selectedSecondLesson && !isUnifiedDouble) ? selectedSecondLesson : null,
            user_id: pb.authStore.model.id,
            is_hidden: false,
            period_span: (preparedFormData.is_double_lesson && addSecondLesson && !isUnifiedDouble) ? 2 : 1
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

          if (formData.is_double_lesson && addSecondLesson && selectedSecondLesson) {
            const existingSecondLesson = allLessons.find(l =>
              l.yearly_lesson_id === selectedSecondLesson &&
              l.week_number === currentWeek
            );

            if (existingSecondLesson) {
              // Existierende Lektion als Slave verknüpfen
              await Lesson.update(existingSecondLesson.id, {
                double_master_id: newLesson.id,
                period_slot: slotInfo.period + 1
              });
            } else {
              // NEUE Slave-Lesson erstellen, wenn keine existierende gefunden wurde
              const secondYL = allYearlyLessons.find(yl => yl.id === selectedSecondLesson);
              if (secondYL) {
                const nextPeriod = slotInfo.period + 1;
                const nextTimeSlot = timeSlots.find(ts => ts.period === nextPeriod);

                const slaveData = {
                  subject: lessonData.subject,
                  day_of_week: lessonData.day_of_week,
                  period_slot: nextPeriod,
                  week_number: currentWeek,
                  yearly_lesson_id: secondYL.id,
                  topic_id: secondYL.topic_id || null,
                  is_double_lesson: true,
                  second_yearly_lesson_id: lessonData.yearly_lesson_id,
                  double_master_id: newLesson.id,
                  start_time: nextTimeSlot?.start,
                  end_time: nextTimeSlot?.end,
                  is_exam: secondYL.is_exam || false,
                  is_half_class: secondYL.is_half_class || false,
                  is_hidden: false,
                  user_id: pb.authStore.model.id,
                  class_id: activeClassId
                };

                await Lesson.create(slaveData);
              }
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

    const slave = allLessons.find(l => l.double_master_id === lesson.id);
    if (slave) {
      await Lesson.delete(slave.id);
    }

    onDelete(lesson.id);
    onClose();
  };

  const handleSaveAsTemplate = useCallback(() => {
    saveTemplate(primarySteps, selectedSubject);
  }, [saveTemplate, primarySteps, selectedSubject]);

  // Build modal title
  const buildModalTitle = () => {
    if (isAllerlei) {
      return `Allerlei: ${formData.name || 'Allerlei'} ${allerleiSubjects.length > 0 ? `(${allerleiSubjects.join(', ')})` : ''}`;
    }

    if (isEditing) {
      const subjectName = lesson.expand?.subject?.name || subjects?.find(s => s.id === lesson.subject)?.name || lesson.subject;
      const timeInfo = timeSlots && timeSlots[lesson.period_slot - 1]
        ? `${timeSlots[lesson.period_slot - 1].start}${formData.is_double_lesson ? '-' + (timeSlots[lesson.period_slot] ? timeSlots[lesson.period_slot].end : timeSlots[lesson.period_slot - 1].end) : '-' + timeSlots[lesson.period_slot - 1].end}`
        : `Period ${lesson.period_slot}`;
      return `${subjectName} – ${translateDay(lesson.day_of_week)}, ${timeInfo}`;
    }

    const subjectName = subjects?.find(s => s.id === selectedSubject)?.name || 'Fach';
    const timeInfo = timeSlots && slotInfo?.period && timeSlots[slotInfo.period - 1]
      ? `${timeSlots[slotInfo.period - 1].start}-${timeSlots[slotInfo.period - 1].end}`
      : `Period ${slotInfo?.period || ''}`;
    return `${subjectName} – ${translateDay(slotInfo?.day)}, ${timeInfo}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="max-w-4xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 max-h-[80vh] overflow-y-auto"
        style={{ borderColor: (subjectColor || '#3b82f6') + '40' }}
      >
        <LessonModalHeader
          title={buildModalTitle()}
          subtitle={isEditing ? "Lektion bearbeiten" : (copiedLesson ? "Kopierte Lektion einfügen" : "Neue Lektion planen")}
          color={subjectColor || '#3b82f6'}
          gradient={displayModalColor}
        />

        <form id="lesson-form" onSubmit={handleSubmit} className="space-y-6 pt-4">
          {validationError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
              {validationError}
            </div>
          )}

          <LessonTogglesRow
            isHalfClass={formData.is_half_class}
            isDoubleLesson={formData.is_double_lesson}
            isExam={formData.is_exam}
            onHalfClassChange={(checked) => setFormData(prev => ({ ...prev, is_half_class: checked }))}
            onDoubleLessonChange={handleDoubleToggle}
            onExamChange={(checked) => setFormData(prev => ({ ...prev, is_exam: checked }))}
            extraToggles={<AllerleiToggleSection isAllerlei={isAllerlei} onToggle={handleAllerleiToggle} />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900 dark:text-white">Fach</Label>
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
                disabled={isEditing}
              >
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                  <SelectValue placeholder="Fach auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <TopicSelector
              value={selectedTopicId}
              onChange={(value) => {
                // Leere Werte von Radix Select ignorieren (Bug-Workaround)
                if (!value) return;
                setSelectedTopicId(value);
                setFormData(prev => ({ ...prev, topic_id: value }));
              }}
              topics={availableTopics}
              disabled={!selectedSubject || isAllerlei}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900 dark:text-white">Titel (Lektion)</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                placeholder={`Lektion ${lesson?.yearly_lesson_id ? allYearlyLessons.find(yl => yl.id === lesson.yearly_lesson_id)?.lesson_number || '' : slotInfo?.period || ''}`}
                maxLength={30}
              />
            </div>
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

          {/* Double lesson section for non-Allerlei - only in flexible mode */}
          {formData.is_double_lesson && !isAllerlei && settings?.scheduleType !== 'fixed' && (
            <div className="space-y-4 p-4 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="add-second-lesson"
                  checked={addSecondLesson}
                  onChange={(e) => handleAddSecondLessonToggle(e.target.checked)}
                  className="rounded"
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

          {/* Allerlei secondary subjects section */}
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
                  Noch keine sekundären Fächer ausgewählt – klicke oben auf „Fach hinzufügen".
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

          {/* Allerlei duration selector */}
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

          {/* Primary steps section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label className="font-semibold text-slate-900 dark:text-white">Primäre Lektion Schritte</Label>
              <LessonTemplatePopover
                subjectId={selectedSubject}
                onInsert={(steps, templateName) => {
                  const withNewIds = steps.map(s => ({ ...s, id: generateId() }));
                  setPrimarySteps(prev => [...prev, ...withNewIds]);
                  if (templateName) {
                    setFormData(prev => ({ ...prev, name: templateName }));
                  }
                }}
                currentSteps={primarySteps}
              />
            </div>
            <div className="space-y-3 p-4 border rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              {primarySteps.length === 0 && topicMaterials.length > 0 ? (
                <StepRow
                  key={`dummy-materials-${topicMaterials.length}`}
                  step={{ id: 'dummy', time: null, workForm: '', activity: '', material: '' }}
                  onUpdate={() => {}}
                  onRemove={() => {}}
                  topicMaterials={topicMaterials}
                  topicColor={topicColor}
                  isLast={true}
                  isUnifiedDouble={isUnifiedDouble}
                  lessonDuration={settings?.lessonDuration || 45}
                />
              ) : (
                primarySteps.map((step, index) => (
                  <StepRow
                    key={`primary-${index}-${step.id}`}
                    step={step}
                    onUpdate={(field, value) => handleUpdatePrimaryStep(step.id, field, value)}
                    onRemove={() => handleRemovePrimaryStep(step.id)}
                    topicMaterials={topicMaterials}
                    topicColor={topicColor}
                    isLast={index === primarySteps.length - 1}
                    isUnifiedDouble={isUnifiedDouble}
                    lessonDuration={settings?.lessonDuration || 45}
                  />
                ))
              )}
              <div className="flex gap-2 mt-2">
                <Button type="button" variant="outline" onClick={handleAddPrimaryStep} className="w-full border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  <span className="text-slate-900 dark:text-white">Schritt hinzufügen</span>
                </Button>
                <LessonTemplatePopover
                  subjectId={selectedSubject}
                  onInsert={(steps, templateName) => {
                    const withNewIds = steps.map(s => ({ ...s, id: generateId() }));
                    setPrimarySteps(prev => [...prev, ...withNewIds]);
                    if (templateName) {
                      setFormData(prev => ({ ...prev, name: templateName }));
                    }
                  }}
                  currentSteps={primarySteps}
                />
              </div>
            </div>
          </div>

          {/* Second lesson steps section */}
          {addSecondLesson && !isUnifiedDouble && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-slate-900 dark:text-white">Zweite Lektion Schritte</Label>
                <LessonTemplatePopover
                  subjectId={selectedSubject}
                  onInsert={(steps) => {
                    const withNewIds = steps.map(s => ({ ...s, id: generateId() }));
                    setSecondSteps(prev => [...prev, ...withNewIds]);
                  }}
                  currentSteps={secondSteps}
                />
              </div>
              <div className="space-y-3 p-4 border rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                {secondSteps.length === 0 && topicMaterials.length > 0 ? (
                  <StepRow
                    key={`dummy-second-materials-${topicMaterials.length}`}
                    step={{ id: 'dummy-second', time: null, workForm: '', activity: '', material: '' }}
                    onUpdate={() => {}}
                    onRemove={() => {}}
                    topicMaterials={topicMaterials}
                    topicColor={topicColor}
                    isLast={true}
                    isUnifiedDouble={isUnifiedDouble}
                    lessonDuration={settings?.lessonDuration || 45}
                  />
                ) : (
                  secondSteps.map((step, index) => (
                    <StepRow
                      key={`second-${index}-${step.id}`}
                      step={step}
                      onUpdate={(field, value) => handleUpdateSecondStep(step.id, field, value)}
                      onRemove={() => handleRemoveSecondStep(step.id)}
                      topicMaterials={topicMaterials}
                      topicColor={topicColor}
                      isLast={index === secondSteps.length - 1}
                      isUnifiedDouble={isUnifiedDouble}
                      lessonDuration={settings?.lessonDuration || 45}
                    />
                  ))
                )}
                <Button type="button" variant="outline" onClick={handleAddSecondStep} className="w-full mt-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  <span className="text-slate-900 dark:text-white">Schritt hinzufügen</span>
                </Button>
              </div>
            </div>
          )}

          <LessonModalFooter
            isEditing={isEditing}
            isSubmitting={isSubmitting}
            isFormValid={isFormValid}
            onDelete={handleDeleteClick}
            onClose={onClose}
            saveButtonColor={displayModalColor}
            saveButtonTextColor="white"
          />
        </form>

        <TemplateSaveModal
          isOpen={showTemplateSave}
          onClose={closeTemplateSave}
          templateName={templateName}
          setTemplateName={setTemplateName}
          onSave={handleSaveAsTemplate}
        />
      </DialogContent>
    </Dialog>
  );
}
