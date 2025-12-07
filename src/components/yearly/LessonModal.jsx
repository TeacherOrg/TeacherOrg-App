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

const MaterialQuickAdd = ({ step, onUpdate, topicMaterials = [], topicColor }) => {
  if (!topicMaterials.length) return null;

  const currentMaterials = step.material 
    ? step.material.split(',').map(m => m.trim().toLowerCase()) 
    : [];

  const toggleMaterial = (mat) => {
    const lowerMat = mat.toLowerCase();
    if (currentMaterials.includes(lowerMat)) {
      // entfernen
      const newList = step.material
        .split(',')
        .map(m => m.trim())
        .filter(m => m.toLowerCase() !== lowerMat)
        .join(', ');
      onUpdate('material', newList.replace(/^,\s|,$/g, '').trim());
    } else {
      // hinzufügen
      const newValue = step.material ? `${step.material}, ${mat}` : mat;
      onUpdate('material', newValue);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {topicMaterials.map((mat) => {
        const isSelected = currentMaterials.includes(mat.toLowerCase());
        return (
          <button
            key={mat}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => toggleMaterial(mat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shadow-sm
              ${isSelected 
                ? 'text-white shadow-md scale-105' 
                : 'text-white/80 border border-white/30 hover:scale-105 hover:shadow-md'
              }`}
            style={{
              backgroundColor: isSelected ? topicColor : topicColor + '40',
            }}
          >
            {mat}
          </button>
        );
      })}
    </div>
  );
};

const StepRow = ({ step, onUpdate, onRemove, topicMaterials = [], topicColor, isLast = false, isUnifiedDouble }) => {
  const [isMaterialFocused, setIsMaterialFocused] = useState(false);

  const showQuickAdd = topicMaterials.length > 0 && (isLast || isMaterialFocused);

  return (
    <div className="grid grid-cols-[60px_140px_1fr_1fr_auto] gap-2 items-start">
      {/* Zeit */}
      <Input
        type="number"
        value={step.time || ''}
        onChange={e => onUpdate('time', e.target.value ? Number(e.target.value) : null)}
        placeholder="Zeit"
        className="text-center bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
        min="0"
        max={isUnifiedDouble ? 90 : 45}  // ← dynamisch!
      />

      {/* Arbeitsform */}
      <Select value={step.workForm || ''} onValueChange={val => onUpdate('workForm', val)}>
        <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
          <SelectValue placeholder="Form" />
        </SelectTrigger>
        <SelectContent>
          {WORK_FORMS.map(form => (
            <SelectItem key={form.value} value={form.value}>{form.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Aktivität */}
      <Input
        value={step.activity || ''}
        onChange={e => onUpdate('activity', e.target.value)}
        placeholder="Aktivität / Was wird gemacht"
        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
      />

      {/* Material + QuickAdd */}
      <div className="space-y-1">
        <Input
          value={step.material || ''}
          onChange={e => onUpdate('material', e.target.value)}
          onFocus={() => setIsMaterialFocused(true)}
          onBlur={() => setIsMaterialFocused(false)}
          placeholder="Material"
          className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
        />

        {/* QuickAdd mit sanfter Transition */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            showQuickAdd ? 'opacity-100 mt-2' : 'opacity-0 mt-0 h-0'
          }`}
        >
          {showQuickAdd && (
            <MaterialQuickAdd
              step={step}
              onUpdate={(field, value) => onUpdate(field, value)}
              topicMaterials={topicMaterials}
              topicColor={topicColor}
            />
          )}
        </div>
      </div>

      {/* Löschen */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

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
  onSaveAndNext // new prop
}) {
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

  const isEditing = !!lesson;

  const displayLesson = lesson || newLessonSlot;

  // Berechne subjectId und subjectTopics außerhalb von useEffect
  // Robust: topic.subject kann entweder die Subject-ID oder der Subject-Name sein.
  const rawSubject = displayLesson?.subject;
  const subjectId = typeof rawSubject === 'object' ? rawSubject.id : rawSubject;
  const subjectName = displayLesson?.subject_name || displayLesson?.subjectName || null;
  const subjectCandidates = [subjectId, subjectName].filter(Boolean).map(s => String(s).toLowerCase());
  const subjectTopics = (topics || []).filter(topic => {
    const topicSubject = topic?.subject ?? topic?.subject_id ?? topic?.subjectName ?? '';
    return subjectCandidates.some(candidate => String(topicSubject).toLowerCase() === candidate);
  });

  // Initialize form data and steps when the modal opens or lesson changes
  useEffect(() => {
    if (isOpen) {
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
        is_double_lesson: currentLesson?.is_double_lesson || false,
        is_exam: currentLesson?.is_exam || false,
        is_half_class: currentLesson?.is_half_class || false,
        notes: currentLesson?.notes || '',
        second_yearly_lesson_id: currentLesson?.second_yearly_lesson_id || null,
        steps: currentLesson?.steps || [],
        allerlei_subjects: currentLesson?.allerlei_subjects || []
      });

      setAddSecondLesson(hasSecondLesson);
      setSecondYearlyLessonId(currentLesson?.second_yearly_lesson_id || '');

      setPrimarySteps(currentLesson?.steps?.map(step => ({ ...step, id: step.id || generateId() })) || []);

      if (currentLesson?.is_double_lesson && hasSecondLesson && secondLesson) {
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
  }, [isOpen, lesson, newLessonSlot, allYearlyLessons, autoAssignTopicId]);

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
  useEffect(() => {
    if (!addSecondLesson) {
      setSecondSteps([]);
      setSecondYearlyLessonId('');
      setFormData(prev => ({ ...prev, second_name: '', second_yearly_lesson_id: null }));
      return;
    }

    // Nur ausführen, wenn wir ein displayLesson haben (also Fach + Woche bekannt)
    if (!displayLesson || !allYearlyLessons.length === 0) return;

    const subjectLessonsThisWeek = allYearlyLessons
      .filter(yl => 
        yl.subject === displayLesson.subject && 
        yl.week_number === displayLesson.week_number
      )
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));

    const currentNum = Number(displayLesson.lesson_number);
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
      // Keine nächste Lektion → neue anlegen (wie im weekly-Modal)
      const newSecond = {
        subject: displayLesson.subject,
        week_number: displayLesson.week_number,
        lesson_number: currentNum + 1,
        school_year: currentYear,
        name: `Lektion ${currentNum + 1}`,
        steps: [],
        is_double_lesson: true,
        notes: '',
        topic_id: formData.topic_id === 'no_topic' ? null : formData.topic_id,
      };

      // Wir erzeugen nur eine temporäre ID – wird beim Speichern wirklich angelegt
      const tempId = generateId();
      setSecondYearlyLessonId(tempId);
      setFormData(prev => ({ 
        ...prev, 
        second_name: newSecond.name,
        second_yearly_lesson_id: tempId 
      }));
      setSecondSteps([]);
    }
  }, [addSecondLesson, displayLesson, allYearlyLessons, currentYear, formData.topic_id]);

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

      let savedLesson;
      if (isEditing && lesson?.id) {
        // Update existing lesson
        savedLesson = await YearlyLesson.update(lesson.id, {
          ...finalData,
          subject: displayLesson.subject,
          week_number: displayLesson.week_number,
          lesson_number: displayLesson.lesson_number,
          school_year: currentYear,
          user_id: pb.authStore.model?.id,
          class_id: displayLesson.class_id
        });

        // Update second lesson if double lesson
        if (finalData.is_double_lesson && secondYearlyLessonId) {
          const secondLessonData = {
            name: finalData.second_name || `Lektion ${Number(displayLesson.lesson_number) + 1}`,
            steps: cleanStepsData(secondSteps),
            is_double_lesson: true,
            topic_id: finalData.topic_id,
            notes: finalData.notes,
            subject: displayLesson.subject,
            week_number: displayLesson.week_number,
            lesson_number: Number(displayLesson.lesson_number) + 1,
            school_year: currentYear,
            user_id: pb.authStore.model?.id,
            class_id: displayLesson.class_id
          };
          await YearlyLesson.update(secondYearlyLessonId, secondLessonData);
        }
      } else {
        // Create new lesson
        savedLesson = await YearlyLesson.create({
          ...finalData,
          subject: displayLesson.subject,
          week_number: displayLesson.week_number,
          lesson_number: displayLesson.lesson_number,
          school_year: currentYear,
          user_id: pb.authStore.model?.id,
          class_id: displayLesson.class_id
        });

        // Create second lesson if double lesson
        if (finalData.is_double_lesson && !secondYearlyLessonId) {
          const secondLessonData = {
            name: finalData.second_name || `Lektion ${Number(displayLesson.lesson_number) + 1}`,
            steps: cleanStepsData(secondSteps),
            is_double_lesson: true,
            topic_id: finalData.topic_id,
            notes: finalData.notes,
            subject: displayLesson.subject,
            week_number: displayLesson.week_number,
            lesson_number: Number(displayLesson.lesson_number) + 1,
            school_year: currentYear,
            user_id: pb.authStore.model?.id,
            class_id: displayLesson.class_id
          };
          const secondLesson = await YearlyLesson.create(secondLessonData);
          finalData.second_yearly_lesson_id = secondLesson.id;
        }
      }

      onSave({ ...finalData, id: savedLesson.id });
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
      setIsSubmitting(false);
      import('react-hot-toast').then(({ toast }) => {
        toast.success('Lektion erfolgreich gespeichert');
      });

      // new logic for save and next
      if (saveAndNext) {
        const nextNumber = Number(displayLesson.lesson_number) + 1;
        onSaveAndNext?.(nextNumber);
        setSaveAndNext(false);
      }
    } catch (error) {
      setIsSubmitting(false);
      console.error('Error in handleSubmit:', error);
      import('react-hot-toast').then(({ toast }) => {
        const message = error.data?.data?.id?.code === 'validation_not_unique'
          ? 'Fehler: Lektion mit dieser ID existiert bereits. Bitte versuchen Sie es erneut.'
          : 'Fehler beim Speichern der Lektion: ' + (error.data?.message || error.message || 'Unbekannter Fehler');
        toast.error(message);
      });
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
            {lesson ? 'Jahreslektion bearbeiten' : 'Neue Jahreslektion erstellen'}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {displayLesson?.subject} - Woche {displayLesson?.week_number}, Lektion {displayLesson?.lesson_number}
          </DialogDescription>
        </DialogHeader>
        
        <form id="yearly-lesson-form" onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right text-sm font-semibold text-slate-900 dark:text-white">Titel (Lektion {displayLesson?.lesson_number})</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="col-span-3 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
              placeholder={`Lektion ${displayLesson?.lesson_number || ''}`}
              maxLength={30}
            />
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
          
          {formData.is_double_lesson && (
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

          {formData.is_double_lesson && (
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

          <div className="flex justify-between items-start">
            <div className="flex-1 space-y-2 mr-6">
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
          </div>
          
          <div className="space-y-4">
            <Label className="font-semibold text-slate-900 dark:text-white">Lektionsplan Schritte</Label>
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
                <Button type="button" variant="outline" onClick={handleAddPrimaryStep} className="w-full mt-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  <span className="text-slate-900 dark:text-white">Schritt hinzufügen (Lektion 1)</span>
                </Button>
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
            </div>
          </div>
          
          {formData.is_double_lesson && addSecondLesson && !isUnifiedDouble && (
            <div className="space-y-4">
              <Label className="font-semibold text-slate-900 dark:text-white">Zweite Lektion – Schritte</Label>
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
                <div className="flex gap-2 mt-2">
                  <Button type="button" variant="outline" onClick={handleAddSecondStep} className="w-full mt-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    <span className="text-slate-900 dark:text-white">Schritt hinzufügen (2. Lektion)</span>
                  </Button>
                  <LessonTemplatePopover
                    subjectId={subjectId}
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
                className={`text-${buttonTextColor} shadow-md hover:opacity-90`}
                style={{ background: modalBackground }}
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4 mr-2" />
                Lektionsplan speichern
              </Button>
              <Button
                type="button"
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setSaveAndNext(true)}
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4 mr-2" />
                Speichern & nächste
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