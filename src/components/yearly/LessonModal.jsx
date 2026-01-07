import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGradient, getTextColorForBackground } from '@/utils/colorUtils';
import { generateId } from '@/components/lesson-planning/utils';
import { useStepManagement, useTemplateSaveModal } from '@/components/lesson-planning/hooks';
import TemplateSaveModal from '@/components/lesson-planning/TemplateSaveModal';

// Shared components
import {
  LessonModalHeader,
  LessonTogglesRow,
  TopicSelector,
  DoubleLessonSection,
  StepsSection,
  LessonModalFooter
} from '@/components/shared/lesson-modal';

/**
 * LessonModal for yearly overview.
 * Refactored to use shared components for better maintainability.
 */
export default function LessonModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  lesson,
  topics = [],
  newLessonSlot,
  subjectColor,
  allYearlyLessons = [],
  currentWeek = null,
  autoAssignTopicId,
  onSaveAndNext,
  subjects = [],
  settings = null
}) {
  // Check if this lesson slot is part of a template double lesson
  const isTemplateDoubleLesson = useMemo(() => {
    if (!newLessonSlot || lesson) return false;
    if (!settings || settings.scheduleType !== 'fixed') return false;

    const template = settings.fixedScheduleTemplate || {};
    if (!template || Object.keys(template).length === 0) return false;

    const subjectName = newLessonSlot?.subject;
    const lessonNumber = newLessonSlot?.lesson_number;
    const classId = newLessonSlot?.class_id;

    if (!subjectName || !lessonNumber || !classId) return false;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const allSubjectSlots = [];

    days.forEach(day => {
      (template[day] || []).forEach(slot => {
        if (slot.subject === subjectName && slot.class_id === classId) {
          allSubjectSlots.push({ day, period: slot.period });
        }
      });
    });

    allSubjectSlots.sort((a, b) => {
      const dayOrder = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
      return dayOrder[a.day] - dayOrder[b.day] || a.period - b.period;
    });

    const slotIndex = lessonNumber - 1;
    if (slotIndex < 0 || slotIndex >= allSubjectSlots.length) return false;

    const currentSlot = allSubjectSlots[slotIndex];
    const nextSlot = allSubjectSlots[slotIndex + 1];

    return nextSlot && currentSlot.day === nextSlot.day && currentSlot.period + 1 === nextSlot.period;
  }, [settings, newLessonSlot, lesson]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    second_name: '',
    topic_id: '',
    is_double_lesson: false,
    is_exam: false,
    is_half_class: false,
    notes: '',
    second_yearly_lesson_id: null
  });

  // Use extracted hooks
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

  // Local state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addSecondLesson, setAddSecondLesson] = useState(false);
  const [secondYearlyLessonId, setSecondYearlyLessonId] = useState('');
  const [isUnifiedDouble, setIsUnifiedDouble] = useState(false);
  const [saveAndNext, setSaveAndNext] = useState(false);

  const prevIsOpenRef = useRef(false);
  const isEditing = !!lesson;
  const displayLesson = lesson || newLessonSlot || {};

  // Subject resolution
  const rawSubject = displayLesson?.subject;
  const subjectId = typeof rawSubject === 'object' ? rawSubject.id : rawSubject;

  const subjectName = useMemo(() => {
    if (typeof rawSubject === 'object' && rawSubject?.name) return rawSubject.name;
    // Use String conversion to ensure type-safe comparison
    const subjectById = subjects.find(s => String(s.id) === String(subjectId));
    if (subjectById) return subjectById.name;
    const subjectByName = subjects.find(s => s.name === rawSubject);
    if (subjectByName) return subjectByName.name;
    return rawSubject || 'Fach';
  }, [rawSubject, subjectId, subjects]);

  // Filter topics by subject
  const subjectTopics = useMemo(() => {
    return (topics || []).filter(topic => {
      const topicSubjectId = topic.subject || topic.subject_id || topic.subjectName;
      return String(topicSubjectId) === String(subjectId);
    });
  }, [topics, subjectId]);

  // Current topic for materials
  const currentTopic = useMemo(() => {
    if (!formData.topic_id || formData.topic_id === 'no_topic') return null;
    return subjectTopics.find(t => t.id === formData.topic_id);
  }, [formData.topic_id, subjectTopics]);

  const topicColor = currentTopic?.color || subjectColor || '#3b82f6';

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      initializeForm();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Update form when lesson changes while open
  useEffect(() => {
    if (isOpen && (lesson || newLessonSlot)) {
      initializeForm();
    }
  }, [lesson, newLessonSlot, allYearlyLessons, autoAssignTopicId, isOpen]);

  const initializeForm = useCallback(() => {
    const currentLesson = lesson || newLessonSlot;
    const hasSecondLesson = !!currentLesson?.second_yearly_lesson_id;
    const secondLesson = hasSecondLesson && allYearlyLessons?.length > 0
      ? allYearlyLessons.find(yl => String(yl.id) === String(currentLesson.second_yearly_lesson_id))
      : null;

    const initialTopicId = currentLesson?.topic_id || autoAssignTopicId || '';

    setFormData({
      name: currentLesson?.name || `Lektion ${currentLesson?.lesson_number || 1}`,
      second_name: secondLesson?.name || (hasSecondLesson ? `Lektion ${Number(currentLesson?.lesson_number || 1) + 1}` : ''),
      topic_id: initialTopicId,
      is_double_lesson: currentLesson?.is_double_lesson || isTemplateDoubleLesson || false,
      is_exam: currentLesson?.is_exam || false,
      is_half_class: currentLesson?.is_half_class || false,
      notes: currentLesson?.notes || '',
      second_yearly_lesson_id: currentLesson?.second_yearly_lesson_id || null
    });

    // In fixed schedule mode, all double lessons are unified 90-minute blocks
    const isFixedModeDouble = settings?.scheduleType === 'fixed' &&
      (currentLesson?.is_double_lesson || isTemplateDoubleLesson);

    if (isFixedModeDouble || isTemplateDoubleLesson) {
      setIsUnifiedDouble(true);
      setAddSecondLesson(false);
    } else if (hasSecondLesson) {
      setIsUnifiedDouble(false);
      setAddSecondLesson(true);
    } else {
      setIsUnifiedDouble(false);
      setAddSecondLesson(false);
    }

    setSecondYearlyLessonId(currentLesson?.second_yearly_lesson_id || '');
    setPrimarySteps(currentLesson?.steps?.map(step => ({ ...step, id: step.id || generateId() })) || []);

    if ((currentLesson?.is_double_lesson || isTemplateDoubleLesson) && hasSecondLesson && secondLesson) {
      setSecondSteps(secondLesson.steps?.map(step => ({ ...step, id: `second-${step.id || generateId()}` })) || []);
    } else {
      setSecondSteps([]);
    }
  }, [lesson, newLessonSlot, allYearlyLessons, autoAssignTopicId, isTemplateDoubleLesson, setPrimarySteps, setSecondSteps, settings]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        document.getElementById('yearly-lesson-form')?.requestSubmit();
      }
      else if (e.key === 'Delete' && isEditing) handleDelete();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditing, onClose]);

  // Handle double lesson toggle
  const handleDoubleLessonToggle = useCallback((checked) => {
    setFormData(prev => ({ ...prev, is_double_lesson: checked }));

    if (checked) {
      // In fixed schedule mode, double lessons are unified 90-minute blocks
      if (settings?.scheduleType === 'fixed') {
        setIsUnifiedDouble(true);
        setAddSecondLesson(false);
      } else {
        setAddSecondLesson(true);
      }
    } else {
      setAddSecondLesson(false);
      setSecondSteps([]);
      setSecondYearlyLessonId('');
      setFormData(prev => ({
        ...prev,
        second_name: '',
        second_yearly_lesson_id: null
      }));
      setIsUnifiedDouble(false);
    }
  }, [setSecondSteps, settings]);

  // Effect for second lesson linking (flexible mode)
  useEffect(() => {
    if (!addSecondLesson || isUnifiedDouble) {
      setSecondSteps([]);
      setSecondYearlyLessonId('');
      setFormData(prev => ({ ...prev, second_name: '', second_yearly_lesson_id: null }));
      return;
    }

    const currentLesson = lesson || newLessonSlot;
    if (!currentLesson) return;

    const subjectLessonsThisWeek = allYearlyLessons
      .filter(yl =>
        yl.subject === currentLesson.subject &&
        yl.week_number === currentLesson.week_number
      )
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));

    const currentNum = Number(currentLesson.lesson_number);
    const nextLesson = subjectLessonsThisWeek.find(yl => Number(yl.lesson_number) === currentNum + 1);

    if (nextLesson) {
      setSecondYearlyLessonId(nextLesson.id);
      setFormData(prev => ({
        ...prev,
        second_name: nextLesson.name || `Lektion ${currentNum + 1}`,
        second_yearly_lesson_id: nextLesson.id
      }));

      const loadedSteps = (nextLesson.steps || []).map(step => ({
        ...step,
        id: `second-${step.id || generateId()}`
      }));
      setSecondSteps(loadedSteps);
    } else {
      const tempId = generateId();
      setSecondYearlyLessonId(tempId);
      setFormData(prev => ({
        ...prev,
        second_name: `Lektion ${currentNum + 1}`,
        second_yearly_lesson_id: tempId
      }));
      setSecondSteps([]);
    }
  }, [addSecondLesson, lesson, newLessonSlot, allYearlyLessons, isUnifiedDouble, setSecondSteps]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      closeTemplateSave();
    }
  }, [isOpen, closeTemplateSave]);

  // Handle unified double toggle
  const handleUnifiedDoubleToggle = useCallback((checked) => {
    setIsUnifiedDouble(checked);
    if (checked) {
      setPrimarySteps(prev => [...prev, ...secondSteps.map(s => ({ ...s, id: generateId() }))]);
      setSecondSteps([]);
      setAddSecondLesson(false);
    }
  }, [secondSteps, setPrimarySteps, setSecondSteps]);

  // Clean steps for save
  const cleanStepsData = (stepsArray) => {
    return stepsArray.map(step => ({
      id: step.id,
      time: step.time || null,
      workForm: step.workForm || '',
      activity: step.activity || '',
      material: step.material || ''
    }));
  };

  // Execute save (no debounce - debounce doesn't return Promise and caused save to fail)
  const executeSave = async (data) => {
    const finalData = {
      ...data,
      id: lesson?.id,  // WICHTIG: ID für Updates mitgeben
      topic_id: data.topic_id === 'no_topic' ? null : data.topic_id,
      steps: cleanStepsData(primarySteps),
      secondSteps: isUnifiedDouble ? [] : (addSecondLesson ? cleanStepsData(secondSteps) : []),
      is_double_lesson: data.is_double_lesson,
      second_yearly_lesson_id: isUnifiedDouble || !addSecondLesson ? null : secondYearlyLessonId,
      notes: data.notes
    };

    await onSave(finalData);
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.persist?.();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await executeSave(formData);

      if (saveAndNext) {
        const increment = formData.is_double_lesson ? 2 : 1;
        const nextNumber = Number(displayLesson.lesson_number) + increment;
        await onSaveAndNext?.(nextNumber);
        setSaveAndNext(false);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      import('react-hot-toast').then(({ toast }) => {
        const message = error.data?.data?.id?.code === 'validation_not_unique'
          ? 'Fehler: Lektion mit dieser ID existiert bereits. Bitte versuchen Sie es erneut.'
          : 'Fehler beim Speichern der Lektion: ' + (error.data?.message || error.message || 'Unbekannter Fehler');
        toast.error(message);
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = useCallback(() => {
    if (lesson && lesson.id && window.confirm("Sind Sie sicher, dass Sie diese Lektion löschen möchten?")) {
      onDelete(lesson.id);
    }
  }, [lesson, onDelete]);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Template save handler
  const handleSaveAsTemplate = useCallback(() => {
    saveTemplate(primarySteps, subjectId);
  }, [saveTemplate, primarySteps, subjectId]);

  // Colors
  const modalColor = subjectColor || '#3b82f6';
  const modalBackground = createGradient(modalColor, -20, '135deg');
  const buttonTextColor = getTextColorForBackground(modalBackground);

  // Form validity
  const isFormValid = formData.name?.trim().length > 0;

  // Build title
  const modalTitle = `${subjectName} – Woche ${displayLesson?.week_number}, ${
    formData.is_double_lesson && addSecondLesson
      ? `Lektionen ${displayLesson?.lesson_number}-${Number(displayLesson?.lesson_number || 0) + 1}`
      : `Lektion ${displayLesson?.lesson_number}`
  }`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 max-h-[80vh] overflow-y-auto"
        style={{ borderColor: modalColor + '40' }}
      >
        <LessonModalHeader
          title={modalTitle}
          subtitle={lesson ? 'Jahreslektion bearbeiten' : 'Neue Jahreslektion erstellen'}
          color={modalColor}
        />

        <form id="yearly-lesson-form" onSubmit={handleSubmit} className="space-y-6 pt-4">
          <LessonTogglesRow
            isHalfClass={formData.is_half_class}
            isDoubleLesson={formData.is_double_lesson}
            isExam={formData.is_exam}
            onHalfClassChange={(checked) => setFormData(prev => ({ ...prev, is_half_class: checked }))}
            onDoubleLessonChange={handleDoubleLessonToggle}
            onExamChange={(checked) => setFormData(prev => ({ ...prev, is_exam: checked }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TopicSelector
              value={formData.topic_id}
              onChange={(value) => setFormData(prev => ({ ...prev, topic_id: value }))}
              topics={subjectTopics}
            />

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900 dark:text-white">
                Titel (Lektion {displayLesson?.lesson_number})
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                placeholder={`Lektion ${displayLesson?.lesson_number || ''}`}
                maxLength={30}
              />
            </div>
          </div>

          <DoubleLessonSection
            isDoubleLesson={formData.is_double_lesson}
            addSecondLesson={addSecondLesson}
            isUnifiedDouble={isUnifiedDouble}
            secondName={formData.second_name}
            secondYearlyLessonId={secondYearlyLessonId}
            availableSecondLessons={[]}
            currentLessonNumber={displayLesson?.lesson_number || 1}
            scheduleType={settings?.scheduleType || 'flexible'}
            onAddSecondLessonChange={setAddSecondLesson}
            onUnifiedDoubleChange={handleUnifiedDoubleToggle}
            onSecondNameChange={(value) => setFormData(prev => ({ ...prev, second_name: value }))}
            onSecondLessonSelect={() => {}}
            subjectName={subjectName}
          />

          <StepsSection
            label="Lektionsplan Schritte"
            steps={primarySteps}
            onAddStep={handleAddPrimaryStep}
            onUpdateStep={handleUpdatePrimaryStep}
            onRemoveStep={handleRemovePrimaryStep}
            onInsertTemplate={(steps, templateName) => {
              const withNewIds = steps.map(s => ({ ...s, id: generateId() }));
              setPrimarySteps(prev => [...prev, ...withNewIds]);
              if (templateName) {
                setFormData(prev => ({ ...prev, name: templateName }));
              }
            }}
            subjectId={subjectId}
            topicMaterials={currentTopic?.materials || []}
            topicColor={topicColor}
            isUnifiedDouble={isUnifiedDouble}
            buttonLabel="Schritt hinzufügen (Lektion 1)"
            showSaveAsTemplate={true}
            onSaveAsTemplate={() => {
              const defaultName = formData.name?.trim() || lesson?.name?.trim() || "Meine Vorlage";
              setTemplateName(defaultName);
              openTemplateSave();
            }}
            lessonDuration={settings?.lessonDuration || 45}
          />

          {formData.is_double_lesson && addSecondLesson && !isUnifiedDouble && (
            <StepsSection
              label="Zweite Lektion – Schritte"
              steps={secondSteps}
              onAddStep={handleAddSecondStep}
              onUpdateStep={handleUpdateSecondStep}
              onRemoveStep={handleRemoveSecondStep}
              onInsertTemplate={(steps) => {
                const withNewIds = steps.map(s => ({ ...s, id: generateId() }));
                setSecondSteps(prev => [...prev, ...withNewIds]);
              }}
              subjectId={subjectId}
              topicMaterials={currentTopic?.materials || []}
              topicColor={topicColor}
              isUnifiedDouble={isUnifiedDouble}
              buttonLabel="Schritt hinzufügen (2. Lektion)"
              lessonDuration={settings?.lessonDuration || 45}
            />
          )}

          <LessonModalFooter
            isEditing={isEditing}
            isSubmitting={isSubmitting}
            isFormValid={isFormValid}
            onDelete={handleDelete}
            onClose={onClose}
            onSaveAndNext={() => setSaveAndNext(true)}
            saveButtonColor={modalBackground}
            saveButtonTextColor={buttonTextColor}
            deleteLabel="Lektion löschen"
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
