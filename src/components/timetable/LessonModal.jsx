import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Trash2, PlusCircle, BookOpen, Copy } from "lucide-react";
import { debounce } from 'lodash';

const generateId = () => Math.random().toString(36).substr(2, 9);

const WORK_FORMS = [ '👤 Single', '👥 Partner', '👨‍👩‍👧‍👦 Group', '🏛️ Plenum' ];

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
          <SelectItem key={form} value={form.split(' ')[1]}>{form}</SelectItem>
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
  const [allerleiFaecher, setAllerleiFaecher] = useState([]);
  const [selectedLessonsForAllerlei, setSelectedLessonsForAllerlei] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isEditing = !!lesson;
  const isNew = !lesson;

  // Generate unique IDs for steps
  const generateId = useCallback(() => Math.random().toString(36).substr(2, 9), []);

  const originalLessonRef = useRef(null);

  const scheduledLessonIds = useMemo(() => 
    new Set(allLessons.filter(l => l.yearly_lesson_id).map(l => l.yearly_lesson_id)),
    [allLessons]
  );
  
  const subjectOptions = useMemo(() => {
    if (!subjects || !activeClassId) return [];
    
    // Filter subjects by active class and return unique names
    return subjects
      .filter(s => s.class_id === activeClassId)
      .reduce((unique, subject) => {
        // Only add if we haven't seen this subject name before
        if (!unique.find(u => u.name === subject.name)) {
          unique.push(subject);
        }
        return unique;
      }, [])
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [subjects, activeClassId]);
  
  const subjectTopics = useMemo(() => {
    // Also filter topics by subjects that belong to the active class
    const validSubjectNames = subjectOptions.map(s => s.name);
    return topics?.filter(topic => 
      validSubjectNames.includes(topic.subject) && 
      topic.subject === selectedSubject
    ) || [];
  }, [topics, selectedSubject, subjectOptions]);


  // Calculate the current lesson's position in the weekly sequence
  const getCurrentLessonPosition = useCallback(() => {
    const targetLesson = isEditing ? lesson : slotInfo;
    if (!targetLesson || (!targetLesson.day_of_week && !targetLesson.day)) return { dayOrder: 0, period: 0 };

    const day = targetLesson.day_of_week || targetLesson.day; // day_of_week for existing lesson, day for new slot
    const period = targetLesson.period_slot || targetLesson.period; // period_slot for existing, period for new

    const dayOrderMap = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
    return {
      dayOrder: dayOrderMap[day.toLowerCase()] || 0, // Ensure lowercase for map lookup
      period: period || 0
    };
  }, [slotInfo, isEditing, lesson]);

  // Get the next available lesson position after current (this function is not directly used by availableSecondLessons after the change)
  const getNextLessonPosition = useCallback(() => {
    const lessonsInWeek = allLessons
      .filter(l => l.week_number === currentWeek)
      .map(l => ({
        dayOrder: { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 }[l.day_of_week] || 0,
        period: l.period_slot,
        subject: l.subject
      }))
      .sort((a, b) => {
        const dayDiff = a.dayOrder - b.dayOrder;
        return dayDiff !== 0 ? dayDiff : a.period - b.period;
      });

    // Find lessons that come after the current position
    return lessonsInWeek.filter(l => 
      l.dayOrder > currentDayOrder || 
      (l.dayOrder === currentDayOrder && l.period > currentPeriod)
    );
  }, [allLessons, currentWeek]);

  // NEW: Calculate available lessons for double lesson based on position logic - RESTRICTED to next lesson only
  const availableSecondLessons = useMemo(() => {
    if (!formData.is_double_lesson || !selectedSubject) return [];
    
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
    
    return nextLesson ? [nextLesson] : [];
  }, [formData.is_double_lesson, selectedSubject, allYearlyLessons, currentWeek, lesson, slotInfo, scheduledLessonIds]);

  // Calculate available lessons for Allerlei based on position and scheduling logic
  const getAvailableAllerleiLessons = useCallback((subjectName, subjectIndex) => {
    if (!subjectName) return [];
    
    // ADDITIONAL FIX: Only allow subjects that are valid for the active class
    const validSubjectNames = subjectOptions.map(s => s.name);
    if (!validSubjectNames.includes(subjectName)) return [];

    const currentPosition = getCurrentLessonPosition();
    const subjectYearlyLessons = allYearlyLessons
      .filter(yl => yl.subject === subjectName && yl.week_number === currentWeek)
      .sort((a, b) => a.lesson_number - b.lesson_number);

    // Get all lessons for this subject that are already scheduled this week
    const scheduledLessonsForSubject = allLessons
      .filter(l => l.subject === subjectName && l.week_number === currentWeek && l.yearly_lesson_id)
      .map(l => {
        const dayOrderMap = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
        const dayOrder = dayOrderMap[l.day_of_week.toLowerCase()] || 0;
        return {
          yearly_lesson_id: l.yearly_lesson_id,
          dayOrder,
          period: l.period_slot,
          isBeforeCurrent: dayOrder < currentPosition.dayOrder || 
                          (dayOrder === currentPosition.dayOrder && l.period_slot < currentPosition.period)
        };
      });

    // Filter out lessons that:
    // 1. Are already scheduled before the current lesson
    // 2. Are duplicates in other Allerlei lessons (prevent conflicts)
    const availableLessons = subjectYearlyLessons.filter(yl => {
      // If it's the currently selected lesson for *this* Allerlei slot, always show it.
      const isCurrentlySelectedForThisAllerleiSlot = selectedLessonsForAllerlei[subjectIndex] === yl.id;
      if (isCurrentlySelectedForThisAllerleiSlot) {
        return true;
      }

      // Don't show lessons that are scheduled before the current position
      const scheduledBefore = scheduledLessonsForSubject.some(sl => 
        sl.yearly_lesson_id === yl.id && sl.isBeforeCurrent
      );
      if (scheduledBefore) {
        return false;
      }

      // NEW: Allow scheduled after (will be deleted on save), but prevent duplicates
      // Check if this yearly lesson is already integrated in another Allerlei of this week
      const isDuplicateInOtherAllerlei = allLessons.some(l => 
        l.is_allerlei && l.week_number === currentWeek && 
        l.allerlei_yearly_lesson_ids?.includes(yl.id) && 
        (lesson ? l.id !== lesson.id : true) // Exclude current lesson if editing
      );
      if (isDuplicateInOtherAllerlei) {
        return false;
      }

      // If it's not scheduled and not before, it's available.
      // If it's scheduled after current, it's also available (will be integrated).
      return true;
    });

    return availableLessons;
  }, [getCurrentLessonPosition, allYearlyLessons, currentWeek, allLessons, selectedLessonsForAllerlei, subjectOptions, lesson]);

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

  // FIX: Load primarySteps and secondSteps from Yearly lessons for consistency
  useEffect(() => {
    if (isOpen) {
      const lessonToLoad = copiedLesson || lesson || {};
      originalLessonRef.current = lesson;

      // Load topic_id from YearlyLesson if available
      let loadedTopicId = lessonToLoad.topic_id || "no_topic";
      if (lessonToLoad.yearly_lesson_id) {
        const primaryYL = allYearlyLessons.find(yl => yl.id === lessonToLoad.yearly_lesson_id);
        if (primaryYL?.topic_id) {
          loadedTopicId = primaryYL.topic_id;
        }
      }

      setFormData({
        topic_id: loadedTopicId,
        is_double_lesson: lessonToLoad.is_double_lesson || false,
        is_exam: lessonToLoad.is_exam || false,
        is_allerlei: lessonToLoad.is_allerlei || false,
        is_half_class: lessonToLoad.is_half_class || false,
        original_topic_id: lesson?.topic_id || "no_topic"
      });

      setSelectedSubject(lessonToLoad.subject || initialSubject || "");
      setAddSecondLesson(lessonToLoad.is_double_lesson && !!lessonToLoad.second_yearly_lesson_id);
      setSelectedSecondLesson(lessonToLoad.second_yearly_lesson_id || "");

      if (lessonToLoad.is_allerlei) {
        setAllerleiFaecher(lessonToLoad.allerlei_subjects || []);
        if (lessonToLoad.allerlei_yearly_lesson_ids) {
          const selectedLessons = {};
          lessonToLoad.allerlei_yearly_lesson_ids.forEach((id, index) => {
            if (lessonToLoad.allerlei_subjects && index < lessonToLoad.allerlei_subjects.length && id) {
              selectedLessons[index] = id;
            }
          });
          setSelectedLessonsForAllerlei(selectedLessons);
        }
      } else {
        setAllerleiFaecher([]);
        setSelectedLessonsForAllerlei({});
      }

      if (lessonToLoad.yearly_lesson_id) {
        const primaryYL = allYearlyLessons.find(yl => yl.id === lessonToLoad.yearly_lesson_id);
        setPrimarySteps(primaryYL?.steps?.map(s => ({...s, id: s.id || generateId() })) || []);
        
        if (lessonToLoad.is_double_lesson && lessonToLoad.second_yearly_lesson_id) {
          const secondYL = allYearlyLessons.find(yl => yl.id === lessonToLoad.second_yearly_lesson_id);
          setSecondSteps(secondYL?.steps?.map(s => ({...s, id: `second-${s.id || generateId()}` })) || []);
        } else {
          setSecondSteps([]);
        }
      } else {
        const loadedSteps = lessonToLoad.steps || [];
        setPrimarySteps(loadedSteps.filter(step => !step.id?.startsWith('second-')).map(s => ({...s, id: s.id || generateId() })));
        setSecondSteps(loadedSteps.filter(step => step.id?.startsWith('second-')).map(s => ({...s, id: `second-${s.id || generateId()}` })));
      }
    }
  }, [isOpen, lesson, copiedLesson, initialSubject, allYearlyLessons, generateId]);

  // FIX: Load first available YearlyLesson data for new lessons or when subject changes
  useEffect(() => {
    // This effect runs for new lessons or when subject changes for a new lesson
    if (!isOpen || isEditing || copiedLesson) return;

    if (selectedSubject) {
      const availableYearlyLessons = allYearlyLessons.filter(
          yl => yl.week_number === currentWeek && yl.subject === selectedSubject && !scheduledLessonIds.has(yl.id)
      ).sort((a,b) => a.lesson_number - b.lesson_number);

      if (availableYearlyLessons.length > 0) {
        const yearlyLessonToUse = availableYearlyLessons[0];
        setFormData(prev => ({
          ...prev,
          topic_id: yearlyLessonToUse.topic_id || "no_topic",
          is_double_lesson: yearlyLessonToUse.is_double_lesson || false,
          is_exam: yearlyLessonToUse.is_exam || false,
          is_half_class: yearlyLessonToUse.is_half_class || false,
          is_allerlei: yearlyLessonToUse.is_allerlei || false,
        }));
        
        // Load steps for the primary yearly lesson
        setPrimarySteps(yearlyLessonToUse.steps?.map(s => ({...s, id: s.id || generateId() })) || []);
        
        // If yearly lesson suggests double lesson and second_yearly_lesson_id exists, load its steps
        if (yearlyLessonToUse.is_double_lesson && yearlyLessonToUse.second_yearly_lesson_id) {
          setAddSecondLesson(true);  // Erweitert: Force true if suggested
          setSelectedSecondLesson(yearlyLessonToUse.second_yearly_lesson_id);
          setSecondSteps(secondYLForPreload?.steps?.map(s => ({...s, id: `second-${s.id || generateId()}` })) || []);
        } else {
          setAddSecondLesson(false);
          setSelectedSecondLesson("");
          setSecondSteps([]);
        }

        setAllerleiFaecher(yearlyLessonToUse.is_allerlei ? yearlyLessonToUse.allerlei_subjects || [] : []);
        
      } else {
        // No yearly lesson available, reset form data and steps
        setFormData({ topic_id: "no_topic", is_double_lesson: false, is_exam: false, is_allerlei: false, is_half_class: false });
        setPrimarySteps([]);
        setSecondSteps([]);
        setAllerleiFaecher([]);
        setSelectedLessonsForAllerlei({});
        setAddSecondLesson(false);
        setSelectedSecondLesson("");
      }
    } else {
      // Selected subject is cleared, reset form data and steps
      setFormData({ topic_id: "no_topic", is_double_lesson: false, is_exam: false, is_allerlei: false, is_half_class: false });
      setPrimarySteps([]);
      setSecondSteps([]);
      setAllerleiFaecher([]);
      setSelectedLessonsForAllerlei({});
      setAddSecondLesson(false);
      setSelectedSecondLesson("");
    }
  }, [selectedSubject, isOpen, isEditing, copiedLesson, currentWeek, allYearlyLessons, scheduledLessonIds, generateId]);

  const saveLesson = onSave;

  const handleDoubleToggle = (checked) => {
    setFormData(prev => ({ ...prev, is_double_lesson: checked }));
    
    if (checked) {
      setAddSecondLesson(true);
      
      if (!selectedSecondLesson) {  // Nur setzen, wenn noch nicht vorhanden
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

  const handleAllerleiToggle = (checked) => {
    setFormData(prev => ({ ...prev, is_allerlei: checked }));
    
    if (!checked) {
      // If Allerlei is turned off, clear all Allerlei related steps
      // Filter primary steps to remove any steps that were added as part of Allerlei
      setPrimarySteps(prevSteps => prevSteps.filter(step => !step.id || !step.id.includes('allerlei-')));
      setFormData(prev => ({ 
        ...prev, 
        topic_id: prev.original_topic_id || "no_topic" // Ensure 'no_topic' if original was null
      }));
      setAllerleiFaecher([]);
      setSelectedLessonsForAllerlei({});
    } else {
       setFormData(prev => ({...prev, yearly_lesson_id: null, topic_id: "no_topic"})); // Reset topic to 'no_topic' not null
       setSecondSteps([]); // Clear second steps if switching to Allerlei mode
       setAddSecondLesson(false);
       setSelectedSecondLesson("");
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

  const handleAddAllerleiSubject = () => {
    setAllerleiFaecher([...allerleiFaecher, ""]);
  };

  const handleRemoveAllerleiSubject = (index) => {
    const newFaecher = allerleiFaecher.filter((_, i) => i !== index);
    
    // Filter primary steps to remove steps associated with the removed Allerlei subject
    const updatedSteps = primarySteps.filter(step => {
      if (!step.id || !step.id.includes('allerlei-')) return true;
      const match = step.id.match(/allerlei-(\d+)-/);
      return !match || parseInt(match[1]) !== index;
    });
    setPrimarySteps(updatedSteps); // Update primary steps

    setAllerleiFaecher(newFaecher);

    const newSelectedLessons = {};
    Object.keys(selectedLessonsForAllerlei).forEach(key => {
      const idx = parseInt(key);
      if (idx < index) {
        newSelectedLessons[idx] = selectedLessonsForAllerlei[idx];
      } else if (idx > index) {
        newSelectedLessons[idx - 1] = selectedLessonsForAllerlei[idx];
      }
    });
    setSelectedLessonsForAllerlei(newSelectedLessons);
  };

  const handleUpdateAllerleiSubject = (index, value) => {
    const newFaecher = [...allerleiFaecher];
    newFaecher[index] = value;
    
    // If subject changes, clear the selected lesson for that index and remove its steps
    const currentSelectedLessonId = selectedLessonsForAllerlei[index];
    if (currentSelectedLessonId) {
      const updatedSteps = primarySteps.filter(step => { // Operating on primarySteps
        if (!step.id || !step.id.includes('allerlei-')) return true;
        const match = step.id.match(/allerlei-(\d+)-/);
        return !match || parseInt(match[1]) !== index;
      });
      setPrimarySteps(updatedSteps); // Update primary steps
      setSelectedLessonsForAllerlei(prev => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
    }

    setAllerleiFaecher(newFaecher);
  };

  const handleAllerleiLessonSelection = (subjectIndex, lessonId) => {
    console.log('Selecting Allerlei lesson:', subjectIndex, lessonId);
    
    // Remove existing steps from this subject index from primarySteps
    const stepsWithoutThisSubject = primarySteps.filter(step => { // Operating on primarySteps
      if (!step.id || !step.id.includes('allerlei-')) return true;
      const match = step.id.match(/allerlei-(\d+)-/);
      return !match || parseInt(match[1]) !== subjectIndex;
    });
    
    let newSteps = [...stepsWithoutThisSubject];
    if (lessonId) {
      const selectedYearlyLesson = allYearlyLessons.find(yl => yl.id === lessonId);
      console.log('Found yearly lesson:', selectedYearlyLesson);
      
      if (selectedYearlyLesson && selectedYearlyLesson.steps) {
        const newStepsToAdd = selectedYearlyLesson.steps.map(step => ({ 
          ...step, 
          id: `allerlei-${subjectIndex}-${generateId()}-${step.id || generateId()}`
        }));
        console.log('Adding steps:', newStepsToAdd);
        newSteps = [...newSteps, ...newStepsToAdd];
      }
    }
    
    console.log('Final steps array:', newSteps);
    setPrimarySteps(newSteps); // Update primary steps
    setSelectedLessonsForAllerlei(prev => ({
        ...prev,
        [subjectIndex]: lessonId
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      let lessonData = null;
      let toDeleteIds = [];

      const finalSubject = selectedSubject || lesson?.subject;
      if (!finalSubject) return; 

      if (formData.is_double_lesson && addSecondLesson && selectedSecondLesson) {
          const lessonOnGridToDelete = allLessons.find(l => l.yearly_lesson_id === selectedSecondLesson);
          if (lessonOnGridToDelete) {
              toDeleteIds.push(lessonOnGridToDelete.id);
          }
      } 
      else if (isEditing && formData.is_double_lesson && !originalLessonRef.current?.is_double_lesson) {
          const nextPeriodLesson = allLessons.find(l =>
              l.day_of_week === lesson.day_of_week &&
              l.period_slot === lesson.period_slot + 1 &&
              l.week_number === currentWeek
          );
          if (nextPeriodLesson) {
              toDeleteIds.push(nextPeriodLesson.id);
          }
      }

      if (formData.is_allerlei) {
        const currentPosition = getCurrentLessonPosition();
        const dayOrderMap = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };

        Object.values(selectedLessonsForAllerlei).forEach(ylId => {
          if (ylId) {
            const scheduledLesson = allLessons.find(l => 
              l.yearly_lesson_id === ylId && 
              l.week_number === currentWeek
            );
            if (scheduledLesson) {
              const scheduledDayOrder = dayOrderMap[scheduledLesson.day_of_week.toLowerCase()] || 0;
              
              const isAfterCurrent = scheduledDayOrder > currentPosition.dayOrder || 
                                  (scheduledDayOrder === currentPosition.dayOrder && scheduledLesson.period_slot > currentPosition.period);
              
              if (isAfterCurrent && scheduledLesson.id !== lesson?.id) {
                toDeleteIds.push(scheduledLesson.id);
              }
            }
          }
        });
      }
      
      console.log('Submitting with steps (primary):', primarySteps);
      console.log('Submitting with steps (second):', secondSteps);
      console.log('Is Allerlei:', formData.is_allerlei);
      console.log('Allerlei subjects:', allerleiFaecher);
      console.log('Selected lessons:', selectedLessonsForAllerlei);
      console.log('Lessons to delete:', toDeleteIds);

      if (isEditing) {
        lessonData = { 
          ...lesson, 
          ...formData, 
          steps: [...primarySteps, ...secondSteps],
          subject: finalSubject,
          yearly_lesson_id: lesson.yearly_lesson_id,
          second_yearly_lesson_id: (formData.is_double_lesson && addSecondLesson && selectedSecondLesson) ? selectedSecondLesson : null,
          allerlei_subjects: formData.is_allerlei ? allerleiFaecher.filter(Boolean) : [],
          allerlei_yearly_lesson_ids: formData.is_allerlei ? 
            allerleiFaecher.map((_, index) => selectedLessonsForAllerlei[index] || null) : [],
          topic_id: formData.is_allerlei ? null : (formData.topic_id === 'no_topic' ? null : formData.topic_id),
        };
        
      } else {
        const timeSlotForNewLesson = timeSlots.find(ts => ts.period === slotInfo.period);

        const newLessonBase = copiedLesson 
          ? { ...copiedLesson, ...formData, steps: [...primarySteps, ...secondSteps] } 
          : { ...formData, steps: [...primarySteps, ...secondSteps] }; 

        lessonData = {
          isNew: true,
          subject: finalSubject,
          ...newLessonBase,
          day_of_week: slotInfo.day,
          period_slot: slotInfo.period,
          week_number: currentWeek,
          start_time: timeSlotForNewLesson?.start,
          end_time: timeSlotForNewLesson?.end,
          allerlei_subjects: formData.is_allerlei ? allerleiFaecher.filter(Boolean) : [],
          allerlei_yearly_lesson_ids: formData.is_allerlei ? 
            allerleiFaecher.map((_, index) => selectedLessonsForAllerlei[index] || null) : [],
          topic_id: formData.is_allerlei ? null : (formData.topic_id === 'no_topic' ? null : formData.topic_id),
          yearly_lesson_id: formData.is_allerlei ? null : null,
          second_yearly_lesson_id: (formData.is_double_lesson && addSecondLesson && selectedSecondLesson) ? selectedSecondLesson : null
        };
        // Hier einfügen:
        if (isNew) {
          lessonData.class_id = activeClassId; // Add this
          lessonData.school_year = new Date().getFullYear(); // Add this
          // ... rest of code
        }
      }

      console.log('Final lesson data:', lessonData);
      await saveLesson(lessonData, toDeleteIds);
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
      if (formData.is_allerlei && allerleiFaecher.length > 0) {
        const allSubjects = [selectedSubject, ...allerleiFaecher].filter(Boolean);
        const colors = allSubjects.map(name => subjects.find(s => s.name === name)?.color).filter(Boolean);
        if (colors.length > 1) {
            const uniqueColors = [...new Set(colors)];
            if (uniqueColors.length === 1) return uniqueColors[0];
            
            // Generate a gradient with minimum 2 colors. If more, distribute them.
            const gradientStops = uniqueColors.map((color, index, arr) => 
              `${color} ${((index) / (arr.length - 1)) * 100}%`
            ).join(', ');
            return `linear-gradient(135deg, ${gradientStops})`;
        }
        return colors[0] || subjectColor || '#3b82f6';
      }
      return subjectColor || '#3b82f6';
  }, [formData.is_allerlei, allerleiFaecher, selectedSubject, subjects, subjectColor]);

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
            {isEditing ? "Lektion bearbeiten" : (copiedLesson ? "Kopierte Lektion einfügen" : "Neue Lektion planen")}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {isEditing ? `${lesson.subject} • ${lesson.day_of_week} • Period ${lesson.period_slot}` : `${slotInfo.day} • Period ${slotInfo.period}`}
          </DialogDescription>
        </DialogHeader>
        
        <form id="lesson-form" onSubmit={handleSubmit} className="space-y-6 pt-4">
          
          <div className="flex flex-wrap items-center justify-around gap-x-6 gap-y-4 p-3 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Switch id="half-class" checked={formData.is_half_class || false} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_half_class: checked }))} />
                <Label htmlFor="half-class" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">Halbklasse</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="double-lesson" checked={formData.is_double_lesson || false} onCheckedChange={handleDoubleToggle} />
                <Label htmlFor="double-lesson" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">Doppellektion</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="allerlei" checked={formData.is_allerlei || false} onCheckedChange={handleAllerleiToggle} />
                <Label htmlFor="allerlei" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">Allerleilektion</Label>
              </div>
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
                <SelectContent>{subjectOptions.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900 dark:text-white">Thema</Label>
              <Select value={formData.topic_id || "no_topic"} onValueChange={(value) => setFormData({ ...formData, topic_id: value })} disabled={!selectedSubject || formData.is_allerlei}>
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"><SelectValue placeholder="Thema auswählen (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_topic">Kein Thema</SelectItem>
                  {subjectTopics.map((topic) => (<SelectItem key={topic.id} value={topic.id}>{topic.title}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
                        availableSecondLessons.map(yl => (
                          <SelectItem key={yl.id} value={yl.id}>
                            Lektion {yl.lesson_number}: {yl.notes || 'Keine Beschreibung'}
                            {scheduledLessonIds.has(yl.id) && selectedSecondLesson !== yl.id ? ' (bereits geplant)' : ''}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem disabled value="none">Keine nächste Lektion verfügbar</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {availableSecondLessons.length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Alle nachfolgenden Lektionen für {selectedSubject} sind bereits geplant oder nicht verfügbar.
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

          {formData.is_allerlei && (
            <div className="space-y-4 p-4 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <Label className="font-semibold text-slate-900 dark:text-white">Allerlei-Fächer</Label>
              <div className="space-y-3">
                {allerleiFaecher.map((fach, index) => {
                  const availableLessons = getAvailableAllerleiLessons(fach, index);
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <Select value={fach} onValueChange={value => handleUpdateAllerleiSubject(index, value)}>
                          <SelectTrigger className="bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                            <SelectValue placeholder="Fach auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjectOptions.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAllerleiSubject(index)} className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {fach && (
                        <div className="ml-4 space-y-1">
                          <Select 
                              value={selectedLessonsForAllerlei[index] || ""} 
                              onValueChange={value => handleAllerleiLessonSelection(index, value)}
                          >
                            <SelectTrigger className="bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                              <SelectValue placeholder="Lektion zum Hinzufügen auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLessons.length > 0 ? (
                                availableLessons.map(yl => {
                                  const isScheduled = scheduledLessonIds.has(yl.id) && selectedLessonsForAllerlei[index] !== yl.id;
                                  return (
                                    <SelectItem key={yl.id} value={yl.id}>
                                      L{yl.lesson_number}: {yl.notes || 'Keine Beschreibung'}
                                      {isScheduled ? ' (bereits geplant)' : ''}
                                    </SelectItem>
                                  );
                                })
                              ) : (
                                <SelectItem disabled value="none">Keine verfügbaren Lektionen</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {availableLessons.length === 0 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Alle Lektionen für {fach} sind bereits früher geplant oder nicht verfügbar.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button type="button" variant="outline" onClick={handleAddAllerleiSubject} className="w-full border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600">
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
                // Erweitert: Füge isSubmitting zum disabled hinzu
                disabled={isSubmitting || !selectedSubject && !isEditing}
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