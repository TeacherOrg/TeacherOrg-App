import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGradient, getTextColorForBackground } from '@/utils/colorUtils';
import { generateId } from '@/components/lesson-planning/utils';
import { useStepManagement, useTemplateSaveModal } from '@/components/lesson-planning/hooks';
import TemplateSaveModal from '@/components/lesson-planning/TemplateSaveModal';
import { emitTourEvent, TOUR_EVENTS } from '@/components/onboarding/tours/tourEvents';
import { useTour } from '@/components/onboarding/TourProvider';

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
  settings = null,
  canEdit = true     // Team Teaching: Nur-Einsicht-Modus
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
    handleUpdateSecondStep,
    reorderPrimarySteps,
    reorderSecondSteps
  } = useStepManagement();

  const {
    showTemplateSave,
    templateName,
    setTemplateName,
    handleSaveAsTemplate: saveTemplate,
    openTemplateSave,
    closeTemplateSave
  } = useTemplateSaveModal();

  // Tour-State für Prevent-Close während Tour
  const { activeTour } = useTour();

  // Local state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addSecondLesson, setAddSecondLesson] = useState(false);
  const [secondYearlyLessonId, setSecondYearlyLessonId] = useState('');
  const [saveAndNext, setSaveAndNext] = useState(false);

  const prevIsOpenRef = useRef(false);
  const isEditing = !!lesson;
  const displayLesson = lesson || newLessonSlot || {};

  // Subject resolution
  const rawSubject = displayLesson?.subject;
  const subjectId = typeof rawSubject === 'object' ? rawSubject.id : rawSubject;

  const subjectName = useMemo(() => {
    // 1. Check if subject is already an object with name
    if (typeof rawSubject === 'object' && rawSubject?.name) return rawSubject.name;

    // 2. Check for PocketBase expand pattern
    if (displayLesson?.expand?.subject?.name) return displayLesson.expand.subject.name;

    // 3. Try to find by ID in subjects array
    const subjectById = subjects.find(s => String(s.id) === String(subjectId));
    if (subjectById) return subjectById.name;

    // 4. Try to find by name match (in case rawSubject is already a name string)
    const subjectByName = subjects.find(s => s.name === rawSubject);
    if (subjectByName) return subjectByName.name;

    // 5. Fallback to raw value or default
    return typeof rawSubject === 'string' && rawSubject.length > 0 ? rawSubject : 'Fach';
  }, [rawSubject, subjectId, subjects, displayLesson]);

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

  // Emit tour event when modal opens
  useEffect(() => {
    if (isOpen) {
      emitTourEvent(TOUR_EVENTS.LESSON_MODAL_OPENED);
    }
  }, [isOpen]);

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

    // In fixed schedule mode, double lessons are template-based unified blocks (no second lesson editing)
    // In flexible mode, double lessons always link two separate lessons
    const isFixedModeDouble = settings?.scheduleType === 'fixed' &&
      (currentLesson?.is_double_lesson || isTemplateDoubleLesson);

    if (isFixedModeDouble) {
      setAddSecondLesson(false);
    } else if (hasSecondLesson || (currentLesson?.is_double_lesson && !isFixedModeDouble)) {
      setAddSecondLesson(true);
    } else {
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
      // In fixed schedule mode, double lessons are template-based (no manual second lesson)
      // In flexible mode, double lessons always link two separate lessons
      if (settings?.scheduleType !== 'fixed') {
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
    }
  }, [setSecondSteps, settings]);

  // Effect for second lesson linking (flexible mode)
  useEffect(() => {
    if (!addSecondLesson) {
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
  }, [addSecondLesson, lesson, newLessonSlot, allYearlyLessons, setSecondSteps]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      closeTemplateSave();
    }
  }, [isOpen, closeTemplateSave]);

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
      secondSteps: addSecondLesson ? cleanStepsData(secondSteps) : [],
      is_double_lesson: data.is_double_lesson,
      second_yearly_lesson_id: addSecondLesson ? secondYearlyLessonId : null,
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

      // Emit tour event when lesson is saved
      emitTourEvent(TOUR_EVENTS.LESSON_SAVED, {
        lessonId: lesson?.id || 'new',
        isDoubleLesson: formData.is_double_lesson
      });

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
  const modalBackground = createGradient(modalColor);
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
        onInteractOutside={(e) => {
          // Prevent closing during tour
          if (activeTour) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing during tour
          if (activeTour) {
            e.preventDefault();
          }
        }}
      >
        <LessonModalHeader
          title={modalTitle}
          subtitle={lesson ? 'Jahreslektion bearbeiten' : 'Neue Jahreslektion erstellen'}
          color={modalColor}
          gradient={modalBackground}
        />

        {/* Team Teaching: View-Only Banner */}
        {!canEdit && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-3 flex items-center gap-2 mt-4">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Nur-Einsicht-Modus – Diese Klasse wurde mit Ihnen geteilt (keine Bearbeitungsrechte)
            </span>
          </div>
        )}

        <form id="yearly-lesson-form" onSubmit={handleSubmit} className="space-y-6 pt-4">
          <LessonTogglesRow
            isHalfClass={formData.is_half_class}
            isDoubleLesson={formData.is_double_lesson}
            isExam={formData.is_exam}
            onHalfClassChange={(checked) => setFormData(prev => ({ ...prev, is_half_class: checked }))}
            onDoubleLessonChange={handleDoubleLessonToggle}
            onExamChange={(checked) => setFormData(prev => ({ ...prev, is_exam: checked }))}
            disabled={!canEdit}  // Team Teaching: Nur-Einsicht-Modus
          />

          {/* Topic Selector - full width */}
          <div className="space-y-2">
            <TopicSelector
              value={formData.topic_id}
              onChange={(value) => setFormData(prev => ({ ...prev, topic_id: value }))}
              topics={subjectTopics}
              disabled={!canEdit}  // Team Teaching: Nur-Einsicht-Modus
            />
          </div>

          {/* Title section - both titles on one row when double lesson */}
          <div className={`grid gap-4 ${formData.is_double_lesson && addSecondLesson ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900 dark:text-white">
                {formData.is_double_lesson && addSecondLesson
                  ? 'Titel (1. Lektion)'
                  : `Titel (Lektion ${displayLesson?.lesson_number})`}
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="lesson-title-input bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                placeholder={`Lektion ${displayLesson?.lesson_number || ''}`}
                maxLength={30}
                disabled={!canEdit}  // Team Teaching: Nur-Einsicht-Modus
              />
            </div>

            {formData.is_double_lesson && addSecondLesson && (
              <div className="space-y-2">
                <Label htmlFor="second_name" className="text-sm font-semibold text-slate-900 dark:text-white">
                  Titel (2. Lektion)
                </Label>
                <Input
                  id="second_name"
                  name="second_name"
                  value={formData.second_name || ''}
                  onChange={handleInputChange}
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                  placeholder={`Lektion ${Number(displayLesson?.lesson_number || 1) + 1}`}
                  maxLength={30}
                  disabled={!canEdit}  // Team Teaching: Nur-Einsicht-Modus
                />
              </div>
            )}
          </div>

          <DoubleLessonSection
            isDoubleLesson={formData.is_double_lesson}
            addSecondLesson={addSecondLesson}
            secondName={formData.second_name}
            secondYearlyLessonId={secondYearlyLessonId}
            availableSecondLessons={[]}
            currentLessonNumber={displayLesson?.lesson_number || 1}
            scheduleType={settings?.scheduleType || 'flexible'}
            onAddSecondLessonChange={setAddSecondLesson}
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
            onReorderSteps={reorderPrimarySteps}
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
            buttonLabel="Schritt hinzufügen (Lektion 1)"
            showSaveAsTemplate={canEdit}  // Team Teaching: Nur bei Bearbeitungsrechten
            onSaveAsTemplate={() => {
              const defaultName = formData.name?.trim() || lesson?.name?.trim() || "Meine Vorlage";
              setTemplateName(defaultName);
              openTemplateSave();
            }}
            lessonDuration={settings?.lessonDuration || 45}
            readOnly={!canEdit}  // Team Teaching: Nur-Einsicht-Modus
          />

          {formData.is_double_lesson && addSecondLesson && (
            <div className="second-lesson-steps-section">
              <StepsSection
                label="Zweite Lektion – Schritte"
                steps={secondSteps}
                onAddStep={handleAddSecondStep}
                onUpdateStep={handleUpdateSecondStep}
                onRemoveStep={handleRemoveSecondStep}
                onReorderSteps={reorderSecondSteps}
                onInsertTemplate={(steps) => {
                  const withNewIds = steps.map(s => ({ ...s, id: generateId() }));
                  setSecondSteps(prev => [...prev, ...withNewIds]);
                }}
                subjectId={subjectId}
                topicMaterials={currentTopic?.materials || []}
                topicColor={topicColor}
                buttonLabel="Schritt hinzufügen (2. Lektion)"
                lessonDuration={settings?.lessonDuration || 45}
                readOnly={!canEdit}  // Team Teaching: Nur-Einsicht-Modus
              />
            </div>
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
            canEdit={canEdit}    // Team Teaching: Nur-Einsicht-Modus
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
