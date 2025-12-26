import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Trash2, PlusCircle, BookOpen, Copy } from "lucide-react";
import { debounce } from 'lodash';
import pb from '@/api/pb';
import { createGradient, getTextColorForBackground } from '@/utils/colorUtils';
import { YearlyLesson } from '@/api/entities';
import LessonTemplatePopover from '@/components/lesson-planning/LessonTemplatePopover';
import StepRow from '@/components/lesson-planning/StepRow';
import { generateId } from '@/components/lesson-planning/utils';

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
  currentYear = new Date().getFullYear(),
  autoAssignTopicId,
  onSaveAndNext, // new prop
  subjects = [], // new prop
  settings = null // new prop for fixed schedule template
}) {
  // Check if this lesson slot is part of a template double lesson
  const isTemplateDoubleLesson = useMemo(() => {
    // Only apply to NEW lessons (empty slots), not existing lessons
    if (!newLessonSlot || lesson) return false;
    if (!settings || settings.scheduleType !== 'fixed') return false;

    const template = settings.fixedScheduleTemplate || {};
    if (!template || Object.keys(template).length === 0) return false;

    // Get subject name and lesson number
    const subjectName = newLessonSlot?.subject;
    const lessonNumber = newLessonSlot?.lesson_number;
    const classId = newLessonSlot?.class_id;

    if (!subjectName || !lessonNumber || !classId) return false;

    // Get all template slots for this subject, sorted
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

    // Map lesson_number to slot index (lesson_number is 1-based)
    const slotIndex = lessonNumber - 1;
    if (slotIndex < 0 || slotIndex >= allSubjectSlots.length) return false;

    const currentSlot = allSubjectSlots[slotIndex];
    const nextSlot = allSubjectSlots[slotIndex + 1];

    // Check if current and next slot are consecutive on the same day
    if (nextSlot && currentSlot.day === nextSlot.day && currentSlot.period + 1 === nextSlot.period) {
      return true;
    }

    return false;
  }, [settings, newLessonSlot, lesson]);

  const [formData, setFormData] = useState({
    name: '',
    second_name: '',
    topic_id: '',
    is_double_lesson: false,
    is_exam: false,
    is_half_class: false,
    notes: '',
    second_yearly_lesson_id: null,
    steps: [],
    allerlei_subjects: []
  });
  const [primarySteps, setPrimarySteps] = useState([]);
  const [secondSteps, setSecondSteps] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addSecondLesson, setAddSecondLesson] = useState(false);
  const [secondYearlyLessonId, setSecondYearlyLessonId] = useState('');
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isUnifiedDouble, setIsUnifiedDouble] = useState(false); // neu!
  const [saveAndNext, setSaveAndNext] = useState(false); // new state

  const prevIsOpenRef = useRef(false);

  const isEditing = !!lesson;

  const displayLesson = lesson || newLessonSlot || {};

  // Berechne subjectId und subjectTopics außerhalb von useEffect
  // Robust: topic.subject kann entweder die Subject-ID oder der Subject-Name sein.
  const rawSubject = displayLesson?.subject;
  const subjectId = typeof rawSubject === 'object' ? rawSubject.id : rawSubject;
  
  // Finde den Subject-Namen
  const subjectName = (() => {
    if (typeof rawSubject === 'object' && rawSubject?.name) {
      return rawSubject.name;
    }
    // Versuche anhand der ID zu finden
    const subjectById = subjects.find(s => s.id === subjectId);
    if (subjectById) return subjectById.name;
    // Versuche anhand des Namens zu finden
    const subjectByName = subjects.find(s => s.name === rawSubject);
    if (subjectByName) return subjectByName.name;
    // Fallback: zeige die rohe Subject-Info
    return rawSubject || 'Fach';
  })();
  
  const subjectTopics = (topics || []).filter(topic => {
    const topicSubjectId = topic.subject || topic.subject_id || topic.subjectName;
    return String(topicSubjectId) === String(subjectId);
  });

  // Initialize form data and steps when the modal opens
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // Modal wurde gerade geöffnet → initialisieren
      const currentLesson = lesson || newLessonSlot;
      const hasSecondLesson = !!currentLesson?.second_yearly_lesson_id;
      const secondLesson = hasSecondLesson && allYearlyLessons?.length > 0
        ? allYearlyLessons.find(yl => String(yl.id) === String(currentLesson.second_yearly_lesson_id))
        : null;

      const initialTopicId = currentLesson?.topic_id || autoAssignTopicId || '';
      console.log('LessonModal: Initializing formData with topic_id =', initialTopicId);

      setFormData({
        name: currentLesson?.name || `Lektion ${currentLesson?.lesson_number || 1}`,
        second_name: secondLesson?.name || (hasSecondLesson ? `Lektion ${Number(currentLesson?.lesson_number || 1) + 1}` : ''),
        topic_id: initialTopicId,
        is_double_lesson: currentLesson?.is_double_lesson || isTemplateDoubleLesson || false,
        is_exam: currentLesson?.is_exam || false,
        is_half_class: currentLesson?.is_half_class || false,
        notes: currentLesson?.notes || '',
        second_yearly_lesson_id: currentLesson?.second_yearly_lesson_id || null,
        steps: currentLesson?.steps || [],
        allerlei_subjects: currentLesson?.allerlei_subjects || []
      });

      // In fixed mode: Template doubles should use unified mode (one lesson with is_double_lesson: true)
      // In flexible mode: Use traditional two-lesson approach
      if (isTemplateDoubleLesson) {
        setIsUnifiedDouble(true); // Auto-enable unified mode for template doubles
        setAddSecondLesson(false); // Don't create second lesson
      } else if (hasSecondLesson) {
        // Existing manual double lesson (flexible mode)
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

      console.log('LessonModal init: autoAssignTopicId =', autoAssignTopicId);
      console.log('LessonModal init: currentLesson.topic_id =', currentLesson?.topic_id);
      console.log('LessonModal init: formData.topic_id (after set) =', initialTopicId);
      console.log('LessonModal init: displayLesson.subject =', displayLesson?.subject, ' (type:', typeof displayLesson?.subject, ')');
      console.log('LessonModal init: subjectId =', subjectId);
      console.log('LessonModal init: topics prop =', topics);
      console.log('LessonModal init: subjectTopics (filtered) =', subjectTopics);
    }

    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Separate effect for when lesson or newLessonSlot changes while modal is open (e.g., save and next)
  useEffect(() => {
    if (isOpen && (lesson || newLessonSlot)) {
      const currentLesson = lesson || newLessonSlot;
      const hasSecondLesson = !!currentLesson?.second_yearly_lesson_id;
      const secondLesson = hasSecondLesson && allYearlyLessons?.length > 0
        ? allYearlyLessons.find(yl => String(yl.id) === String(currentLesson.second_yearly_lesson_id))
        : null;

      const initialTopicId = currentLesson?.topic_id || autoAssignTopicId || '';
      console.log('LessonModal: Re-initializing formData for next lesson with topic_id =', initialTopicId);

      setFormData({
        name: currentLesson?.name || `Lektion ${currentLesson?.lesson_number || 1}`,
        second_name: secondLesson?.name || (hasSecondLesson ? `Lektion ${Number(currentLesson?.lesson_number || 1) + 1}` : ''),
        topic_id: initialTopicId,
        is_double_lesson: currentLesson?.is_double_lesson || isTemplateDoubleLesson || false,
        is_exam: currentLesson?.is_exam || false,
        is_half_class: currentLesson?.is_half_class || false,
        notes: currentLesson?.notes || '',
        second_yearly_lesson_id: currentLesson?.second_yearly_lesson_id || null,
        steps: currentLesson?.steps || [],
        allerlei_subjects: currentLesson?.allerlei_subjects || []
      });

      // In fixed mode: Template doubles should use unified mode (one lesson with is_double_lesson: true)
      // In flexible mode: Use traditional two-lesson approach
      if (isTemplateDoubleLesson) {
        setIsUnifiedDouble(true); // Auto-enable unified mode for template doubles
        setAddSecondLesson(false); // Don't create second lesson
      } else if (hasSecondLesson) {
        // Existing manual double lesson (flexible mode)
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
    }
  }, [lesson, newLessonSlot, allYearlyLessons, autoAssignTopicId, isOpen]);

  // Handles keyboard shortcuts for modal actions
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) document.getElementById('yearly-lesson-form')?.requestSubmit();
      else if (e.key === 'Delete' && isEditing) handleDelete();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditing, onClose]);

  // Handle double lesson toggle
  const handleDoubleLessonToggle = (checked) => {
    setFormData(prev => ({ ...prev, is_double_lesson: checked }));
    
    if (checked) {
      // Automatisch zweiten Teil aktivieren
      setAddSecondLesson(true);
    } else {
      // Doppellektion deaktivieren → alles zurücksetzen
      setAddSecondLesson(false);
      setSecondSteps([]);
      setSecondYearlyLessonId('');
      setFormData(prev => ({ 
        ...prev, 
        second_name: '',
        second_yearly_lesson_id: null 
      }));
      setIsUnifiedDouble(false); // neu: reset unified mode
    }
  };

  // Effect for toggling addSecondLesson and handling second lesson content
  // This is only for flexible mode (traditional two-lesson approach)
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
      // Bestehende nächste Lektion gefunden → verknüpfen
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
      // Temporäre neue Lektion
      const tempId = generateId();
      setSecondYearlyLessonId(tempId);
      setFormData(prev => ({ 
        ...prev, 
        second_name: `Lektion ${currentNum + 1}`,
        second_yearly_lesson_id: tempId 
      }));
      setSecondSteps([]);
    }
  }, [addSecondLesson, lesson, newLessonSlot, allYearlyLessons, currentYear]);

  // Neu: Cleanup beim Schließen des Modals
  useEffect(() => {
    if (!isOpen) {
      setShowTemplateSave(false);
      setTemplateName("");
    }
  }, [isOpen]);

  const handleUpdatePrimaryStep = (id, field, value) => {
    setPrimarySteps(primarySteps.map(step => step.id === id ? { ...step, [field]: value } : step));
  };

  const handleRemovePrimaryStep = (id) => {
    setPrimarySteps(primarySteps.filter(step => step.id !== id));
  };

  const handleRemoveSecondStep = (id) => {
    setSecondSteps(secondSteps.filter(step => step.id !== id));
  };

  const handleAddPrimaryStep = () => {
    setPrimarySteps([...primarySteps, {
      id: generateId(),
      time: null,
      workForm: '',
      activity: '',
      material: '' // Changed from topicMaterialsString to empty string
    }]);
  };

  const handleUpdateSecondStep = (id, field, value) => {
    setSecondSteps(secondSteps.map(step => step.id === id ? { ...step, [field]: value } : step));
  };

  const handleAddSecondStep = () => {
    setSecondSteps([...secondSteps, {
      id: `second-${generateId()}`,
      time: null,
      workForm: '',
      activity: '',
      material: '' // Changed from topicMaterialsString to empty string
    }]);
  };

  const cleanStepsData = (stepsArray) => {
    return stepsArray.map(step => ({
      id: step.id,
      time: step.time || null,
      workForm: step.workForm || '',
      activity: step.activity || '',
      material: step.material || ''
    }));
  };

  const debouncedSave = debounce(async (data) => {
    try {
      const finalData = {
        ...data,
        topic_id: data.topic_id === 'no_topic' ? null : data.topic_id,
        steps: cleanStepsData(primarySteps),
        secondSteps: isUnifiedDouble ? [] : (addSecondLesson ? cleanStepsData(secondSteps) : []),
        is_double_lesson: data.is_double_lesson, // bleibt true!
        second_yearly_lesson_id: isUnifiedDouble || !addSecondLesson ? null : secondYearlyLessonId,
        notes: data.notes
      };

      onSave(finalData);
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Fehler beim Speichern der Lektion: ' + (error.data?.message || 'Unbekannter Fehler'));
    }
  }, 300);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.persist();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await debouncedSave(formData);

      if (saveAndNext) {
        const increment = formData.is_double_lesson ? 2 : 1;
        const nextNumber = Number(displayLesson.lesson_number) + increment;
        await onSaveAndNext?.(nextNumber);
        setSaveAndNext(false);
        // KEIN onClose() hier!
      } else {
        onClose(); // Nur beim normalen Speichern schließen
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

  const handleDelete = () => {
    if (lesson && lesson.id && window.confirm("Sind Sie sicher, dass Sie diese Lektion löschen möchten?")) {
      onDelete(lesson.id);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  console.log('LessonModal render: Selected value in Select =', formData.topic_id || "no_topic");

  const modalColor = subjectColor || '#3b82f6';
  const modalBackground = createGradient(modalColor, -20, '135deg');
  const buttonTextColor = getTextColorForBackground(modalBackground);

  const secondLessonNote = useMemo(() => {
    if (secondYearlyLessonId && allYearlyLessons) {
      const secondLesson = allYearlyLessons.find(l => String(l.id) === String(secondYearlyLessonId));
      if (secondLesson && Number(secondLesson.lesson_number) === Number(displayLesson?.lesson_number) + 1) {
        const hasContent = !!secondLesson.notes || (secondLesson.steps || []).length > 0;
        const contentInfo = `${secondLesson.notes || formData.second_name || `Lektion ${secondLesson.lesson_number}`}${secondLesson.steps ? ` (${(secondLesson.steps || []).length} Schritte)` : ''}`;
        return `Nächste: ${hasContent ? contentInfo : `${formData.second_name || `Lektion ${secondLesson.lesson_number}`} (leer)`}`;
      }
    }
    return 'Keine aufeinanderfolgende Lektion verfügbar.';
  }, [secondYearlyLessonId, allYearlyLessons, displayLesson, formData.second_name]);

  const currentTopic = useMemo(() => {
    if (!formData.topic_id || formData.topic_id === 'no_topic') return null;
    return subjectTopics.find(t => t.id === formData.topic_id);
  }, [formData.topic_id, subjectTopics]);

  const topicMaterials = currentTopic?.materials || [];
  const topicMaterialsString = topicMaterials.join(', ');
  const topicColor = currentTopic?.color || subjectColor || '#3b82f6';

  // Berechne IDs der letzten Schritte
  const lastPrimaryStepId = primarySteps[primarySteps.length - 1]?.id ?? null;
  const lastSecondStepId = secondSteps[secondSteps.length - 1]?.id ?? null;

  // ← Vor dem return!
  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return;

    try {
      await pb.collection('lesson_templates').create({
        name: templateName.trim(),
        steps: primarySteps,
        subject: subjectId || null,
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

  // Einfach immer erlaubt – oder nur prüfen, ob ein Name da ist
  const isFormValid = formData.name?.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 max-h-[80vh] overflow-y-auto" 
        style={{ 
          borderColor: modalColor + '40'
        }}
      >
        <DialogHeader 
          className="pb-4 border-b"
          style={{ 
            borderColor: modalColor + '20',
            background: `linear-gradient(135deg, ${modalColor}15, transparent)`
          }}
        >
          <DialogTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-white">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
              style={{ backgroundColor: modalColor }}
            >
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            {subjectName} – Woche {displayLesson?.week_number}, {
              formData.is_double_lesson && addSecondLesson
                ? `Lektionen ${displayLesson?.lesson_number}-${Number(displayLesson?.lesson_number || 0) + 1}`
                : `Lektion ${displayLesson?.lesson_number}`
            }
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {lesson ? 'Jahreslektion bearbeiten' : 'Neue Jahreslektion erstellen'}
          </DialogDescription>
        </DialogHeader>
        
        <form id="yearly-lesson-form" onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="flex flex-wrap items-center justify-around gap-x-6 gap-y-4 p-3 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Switch id="half-class" checked={formData.is_half_class || false} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_half_class: checked }))} />
              <Label htmlFor="half-class" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">Halbklasse</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="double-lesson" checked={formData.is_double_lesson || false} onCheckedChange={handleDoubleLessonToggle} />
              <Label htmlFor="double-lesson" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">Doppellektion</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="exam" checked={formData.is_exam || false} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_exam: checked }))} />
              <Label htmlFor="exam" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">Prüfung</Label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900 dark:text-white">Thema</Label>
              <Select
                value={formData.topic_id || "no_topic"}
                onValueChange={(value) => setFormData({...formData, topic_id: value})}
              >
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                  <SelectValue placeholder="Thema auswählen (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_topic">Kein Thema</SelectItem>
                  {subjectTopics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>{topic.title || topic.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900 dark:text-white">Titel (Lektion {displayLesson?.lesson_number})</Label>
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

          {formData.is_double_lesson && addSecondLesson && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="second_name" className="text-right text-sm font-semibold text-slate-900 dark:text-white">Titel (Lektion {Number(displayLesson?.lesson_number || 1) + 1})</Label>
              <Input
                id="second_name"
                name="second_name"
                value={formData.second_name}
                onChange={handleInputChange}
                className="col-span-3 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                placeholder={`Lektion ${Number(displayLesson?.lesson_number || 1) + 1}`}
                maxLength={30}
              />
            </div>
          )}
          
          {formData.is_double_lesson && settings?.scheduleType === 'flexible' && (
            <div className="p-3 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="add-second-content"
                  checked={addSecondLesson}
                  onCheckedChange={setAddSecondLesson}
                />
                <Label htmlFor="add-second-content" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">
                  Inhalte aus zweiter Lektion bearbeiten
                </Label>
              </div>

              {addSecondLesson && secondYearlyLessonId && (
                <div className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                  Verknüpft mit: <span className="font-medium">
                    {formData.second_name || `Lektion ${Number(displayLesson?.lesson_number || 0) + 1}`}
                  </span>
                  {secondSteps.length > 0 && ` (${secondSteps.length} Schritt${secondSteps.length === 1 ? '' : 'e'})`}
                </div>
              )}
            </div>
          )}

          {formData.is_double_lesson && settings?.scheduleType === 'flexible' && (
            <div className="p-3 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3 mt-4">
              <div className="flex items-center gap-2">
                <Switch 
                  id="unified-double" 
                  checked={isUnifiedDouble} 
                  onCheckedChange={(checked) => {
                    setIsUnifiedDouble(checked);
                    if (checked) {
                      // Wenn wir auf "eine 90-Min-Lektion" umstellen → zweite Steps in erste mergen
                      setPrimarySteps(prev => [...prev, ...secondSteps.map(s => ({ ...s, id: generateId() }))]);
                      setSecondSteps([]);
                      setAddSecondLesson(false); // Zweiter Block wird ausgeblendet
                    }
                  }}
                />
                <Label htmlFor="unified-double" className="text-sm font-medium cursor-pointer">
                  Als eine 90-Minuten-Lektion planen (ein Steps-Block)
                </Label>
              </div>
              {isUnifiedDouble && (
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                  Die Zeit-Spalte erlaubt jetzt bis 90 Minuten. Im Stundenplan wird es trotzdem als Doppellektion angezeigt.
                </p>
              )}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label className="font-semibold text-slate-900 dark:text-white">Lektionsplan Schritte</Label>
              <LessonTemplatePopover
                subjectId={subjectId}
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
              {primarySteps.map(step => (
                <StepRow
                  key={step.id}
                  step={step}
                  onUpdate={(field, value) => handleUpdatePrimaryStep(step.id, field, value)}
                  onRemove={() => handleRemovePrimaryStep(step.id)}
                  topicMaterials={currentTopic?.materials || []}
                  topicColor={topicColor}
                  isLast={step.id === lastPrimaryStepId}
                  isUnifiedDouble={isUnifiedDouble}
                />
              ))}
              <div className="flex gap-2 mt-2">
                <Button type="button" variant="outline" onClick={handleAddPrimaryStep} className="flex-[2] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  <span className="text-slate-900 dark:text-white">Schritt hinzufügen (Lektion 1)</span>
                </Button>
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
                  className="flex-[2] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  <span className="text-slate-900 dark:text-white">Als Vorlage speichern</span>
                </Button>
              </div>
            </div>
          </div>
          
          {formData.is_double_lesson && addSecondLesson && !isUnifiedDouble && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-slate-900 dark:text-white">Zweite Lektion – Schritte</Label>
                <LessonTemplatePopover
                  subjectId={subjectId}
                  onInsert={(steps) => {
                    const withNewIds = steps.map(s => ({ ...s, id: generateId() }));
                    setSecondSteps(prev => [...prev, ...withNewIds]);
                  }}
                  currentSteps={secondSteps}
                />
              </div>
              <div className="space-y-3 p-4 border rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                {secondSteps.map(step => (
                  <StepRow
                    key={step.id}
                    step={step}
                    onUpdate={(field, value) => handleUpdateSecondStep(step.id, field, value)}
                    onRemove={() => handleRemoveSecondStep(step.id)}
                    topicMaterials={currentTopic?.materials || []}
                    topicColor={topicColor}
                    isLast={step.id === lastSecondStepId}
                    isUnifiedDouble={isUnifiedDouble}
                  />
                ))}
                <Button type="button" variant="outline" onClick={handleAddSecondStep} className="w-full mt-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  <span className="text-slate-900 dark:text-white">Schritt hinzufügen (2. Lektion)</span>
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center gap-3 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <div>
              {lesson && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Lektion löschen
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600">
                <span className="text-slate-900 dark:text-white">Abbrechen</span>
              </Button>
              <Button
                type="submit"
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setSaveAndNext(true)}
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4 mr-2" />
                Speichern & nächste
              </Button>
              <Button 
                type="submit"
                className={`text-${buttonTextColor} shadow-md hover:opacity-90`}
                style={{ background: modalBackground }}
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>
            </div>
          </div>
        </form>

        {/* Template-Popup Modal */}
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
      </DialogContent>
    </Dialog>
  );
}