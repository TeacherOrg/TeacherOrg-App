import React, { useState, useEffect, useCallback, useMemo } from "react";
import { YearlyLesson, Topic, Subject, Class, Holiday, Lesson } from "@/api/entities"; 
import { Button } from "@/components/ui/button";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { motion } from "framer-motion";
import { useRef } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import TopicModal from "@/components/topics/TopicModal";
import LessonModal from "../components/yearly/LessonModal";
import YearlyGrid from "../components/yearly/YearlyGrid";
import TopicManager from "../components/yearly/TopicManager";
import TopicLessonsModal from "../components/yearly/TopicLessonsModal";
import QuickActionsFloating from "../components/yearly/QuickActionsFloating";
import QuickActionsOverlay from "../components/yearly/QuickActionsOverlay";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import debounce from 'lodash/debounce';
import YearLessonOverlay from "../components/yearly/YearLessonOverlay";
import { adjustColor } from '@/utils/colorUtils';
import { useLessonStore } from '@/store';
import pb from '@/api/pb';

const ACADEMIC_WEEKS = 52;

const queryClient = new QueryClient();

// SAFE STRING HELPER - gleiche Funktion wie in TopicLessonsModal
const ultraSafeString = (value) => {
  try {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') {
      if (React.isValidElement(value)) return '';
      if (Array.isArray(value)) return value.length.toString();
      if (value.title) return ultraSafeString(value.title);
      if (value.name) return ultraSafeString(value.name);
      return '[Objekt]';
    }
    return String(value);
  } catch (e) {
    console.warn('ultraSafeString error:', e);
    return '';
  }
};

// SAFE SORT HELPER
const safeSortByName = (items) => {
  try {
    return items.filter(item => item && (item.name || item.title)).sort((a, b) => {
      const nameA = ultraSafeString(a.name || a.title || '');
      const nameB = ultraSafeString(b.name || b.title || '');
      return nameA.localeCompare(nameB);
    });
  } catch (e) {
    console.error('safeSortByName error:', e);
    return items || [];
  }
};

export default function YearlyOverviewPage() {
  return <QueryClientProvider client={queryClient}><InnerYearlyOverviewPage /></QueryClientProvider>;
}

function InnerYearlyOverviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const assignSubject = searchParams.get('subject');
  const isAssignMode = mode === 'assign';
  const topicMode = searchParams.get('topic');

  const yearlyLessons = useLessonStore((state) => state.yearlyLessons);
  const { setYearlyLessons, optimisticUpdateYearlyLessons } = useLessonStore();
  const [topics, setTopics] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeClassId, setActiveClassId] = useState(null);
  const [activeSubjectName, setActiveSubjectName] = useState('');
  const [activeTopicId, setActiveTopicId] = useState(null);

  const [editingTopic, setEditingTopic] = useState(null);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);

  const [editingLesson, setEditingLesson] = useState(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [newLessonSlot, setNewLessonSlot] = useState(null);

  const [isTopicLessonsModalOpen, setIsTopicLessonsModalOpen] = useState(false);
  const [selectedTopicLessons, setSelectedTopicLessons] = useState([]);
  const [selectedTopicInfo, setSelectedTopicInfo] = useState(null);

  const [currentView, setCurrentView] = useState('Jahr');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Neue States für Quick Actions & Density
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [densityMode, setDensityMode] = useState('standard'); // 'compact' | 'standard' | 'spacious'

  const [hoverLesson, setHoverLesson] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ top: 0, left: 0 });
  const handleAddTopic = useCallback(() => {
    setEditingTopic(null);
    setIsTopicModalOpen(true);
  }, []);
  const overlayRef = useRef(null);

  const [selectedLessons, setSelectedLessons] = useState([]); // Für Assign-Modus

  const debouncedShowRef = useRef(null);
  const debouncedHideRef = useRef(null);

  useEffect(() => {
    debouncedShowRef.current = debounce((lesson, position) => {
      if (debouncedHideRef.current) debouncedHideRef.current.cancel();
      setHoverLesson(lesson);
      setHoverPosition(position);
    }, 150, { leading: true, trailing: true });

    debouncedHideRef.current = debounce(() => {
      if (debouncedShowRef.current) debouncedShowRef.current.cancel();
      setHoverLesson(null);
    }, 150, { leading: false, trailing: true });

    return () => {
      if (debouncedShowRef.current) debouncedShowRef.current.cancel();
      if (debouncedHideRef.current) debouncedHideRef.current.cancel();
    };
  }, []);

  const handleShowHover = useCallback((lesson, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (debouncedShowRef.current) debouncedShowRef.current(lesson, { top: rect.bottom + 10, left: rect.left });
    console.log('Hover-Lesson-Objekt:', JSON.stringify(lesson, null, 2));
    console.log('Übergebene Farbe:', lesson?.color || 'undefined');
  }, []);

  const handleHideHover = useCallback(() => {
    if (debouncedHideRef.current) debouncedHideRef.current();
  }, []);

  // Füge hier ein:
  const handleSelectLesson = useCallback((slot) => {
    if (!slot || typeof slot.week_number === 'undefined' || !slot.subject || typeof slot.lesson_number === 'undefined') {
      console.error('Invalid slot for selection:', slot);
      return;
    }
    const key = `${slot.week_number}-${slot.subject}-${slot.lesson_number}`;
    setSelectedLessons(prev => {
      const safePrev = prev.filter(k => typeof k === 'string');
      if (safePrev.includes(key)) {
        return safePrev.filter(k => k !== key);
      }
      return [...safePrev, key];
    });
  }, []);

  const handleAssignAndBack = async () => {
    const topicId = searchParams.get('topic');
    if (!topicId) {
      console.error('No topicId provided for assign');
      return;
    }

    try {
      const updates = selectedLessons.map(key => {
        const [week, subject, number] = key.split('-');
        const lesson = lessonsForYear.find(l => l.week_number == week && l.subject === subject && l.lesson_number == number);
        if (lesson) {
          return YearlyLesson.update(lesson.id, { topic_id: topicId });
        } else {
          const subjectObj = subjects.find(s => s.name.toLowerCase() === subject.toLowerCase());
          if (!subjectObj) {
            console.error('No subject found for:', subject);
            return Promise.resolve();
          }
          return YearlyLesson.create({
            week_number: parseInt(week),
            lesson_number: parseInt(number),
            subject: subjectObj.id,
            school_year: currentYear,
            topic_id: topicId,
            user_id: pb.authStore.model.id,
            class_id: activeClassId,
            name: 'Neue Lektion'
          });
        }
      });

      await Promise.all(updates);
      await Topic.update(topicId, { is_draft: false });
      // Save topicId to localStorage for modal to load
      const draft = JSON.parse(localStorage.getItem('draftTopic')) || {};
      draft.topicId = topicId;
      localStorage.setItem('draftTopic', JSON.stringify(draft));
      navigate(-1); // Back to modal
    } catch (error) {
      console.error('Error assigning lessons:', error);
      alert('Fehler beim Zuweisen der Lektionen: ' + (error.data?.message || 'Unbekannter Fehler'));
    }
  };

  const queryClientLocal = useQueryClient();

  const { data, isLoading: queryLoading, refetch } = useQuery({
    queryKey: ['yearlyData', currentYear],
    queryFn: async () => {
      const [lessonsData, topicsData, subjectsData, classesData, holidaysData] = await Promise.all([
        YearlyLesson.list({ user_id: pb.authStore.model.id }),
        Topic.list({ 'class_id.user_id': pb.authStore.model.id }),
        Subject.list({ 'class_id.user_id': pb.authStore.model.id }),
        Class.list({ user_id: pb.authStore.model.id }),
        Holiday.list({ user_id: pb.authStore.model.id })
      ]);
      return { lessonsData, topicsData, subjectsData, classesData, holidaysData };
    },
    staleTime: 0,
  });

  const prevModeRef = useRef(mode);

  useEffect(() => {
    if (prevModeRef.current === 'assign' && mode !== 'assign') {
      refetch();
    }
    prevModeRef.current = mode;
  }, [mode, refetch]);

  useEffect(() => {
    if (data) {
      console.log('Debug: Loaded yearlyLessons', data.lessonsData);
      setYearlyLessons(data.lessonsData.map(l => ({ ...l, lesson_number: Number(l.lesson_number) })) || []);
      
      const safeTopics = safeSortByName(data.topicsData || []);
      console.log('Debug: Safe topics after sorting:', safeTopics);
      setTopics(safeTopics);
      
      setSubjects(data.subjectsData || []);
      setClasses(data.classesData || []);
      setHolidays(data.holidaysData || []);

      if (Array.isArray(data.classesData) && data.classesData.length > 0 && !activeClassId) {
        setActiveClassId(data.classesData[0].id);
      }

      if (assignSubject && data.subjectsData) {
        const matchingSubject = data.subjectsData.find(s => s.name.toLowerCase() === assignSubject.toLowerCase());
        if (matchingSubject) {
          setActiveSubjectName(matchingSubject.name);
          console.log('Debug: Set activeSubjectName to', matchingSubject.name);
        } else {
          console.error('No subject found for assignSubject:', assignSubject);
        }
      }
    }
    setIsLoading(queryLoading);
  }, [data, queryLoading, assignSubject]);

  useEffect(() => {
    const handleDataRefresh = () => queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
    window.addEventListener('holidays-changed', handleDataRefresh);

    return () => {
      window.removeEventListener('holidays-changed', handleDataRefresh);
    };
  }, [currentYear, queryClientLocal]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setShowQuickActions(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleViewChange = (view) => {
    setCurrentView(view);
    if (view === 'Woche') {
      navigate(createPageUrl('Timetable'));
    }
  };

  const topicsById = useMemo(() => new Map(topics.map(t => [t.id, t])), [topics]);

  // Memo für gefilterte Topics
  const filteredTopics = useMemo(() => {
    return topics.filter(topic => topic.subject === activeSubjectName);
  }, [topics, activeSubjectName]);

  const subjectsForClass = useMemo(() => {
    if (!activeClassId) return [];
    return subjects.filter(s => s.class_id === activeClassId);
  }, [subjects, activeClassId]);

  const lessonsForYear = useMemo(() => {
    let filtered = yearlyLessons.filter(lesson => Number(lesson.school_year) === currentYear || !lesson.school_year);
    if (isAssignMode && assignSubject) {
      const subject = subjects.find(s => s.name.toLowerCase() === assignSubject.toLowerCase());
      if (subject) {
        filtered = filtered.filter(lesson => lesson.subject === subject.id && !lesson.topic_id);
      } else {
        console.error('No subject found for assignSubject:', assignSubject);
        filtered = [];
      }
    }
    return filtered;
  }, [yearlyLessons, currentYear, isAssignMode, assignSubject, subjects]);

const handleLessonClick = useCallback(async (lesson, slot) => {
    if (isAssignMode) {
      const id = lesson?.id || `${slot.week_number}-${slot.subject}-${slot.lesson_number}`;
      setSelectedLessons(prev => {
        if (prev.includes(id)) {
          return prev.filter(l => l !== id);
        }
        return [...prev, id];
      });
      return;
    }

    if (activeTopicId) {
      if (lesson && lesson.id) {
        const newTopicId = lesson.topic_id === activeTopicId ? null : activeTopicId;
        let lessonsToUpdate = lesson.mergedLessons || [lesson];
        let tempUpdatedPrev = yearlyLessons.map(p => {
          const toUpdate = lessonsToUpdate.find(l => l.id === p.id);
          if (toUpdate) {
            return { ...p, topic_id: newTopicId };
          }
          return p;
        });

        const gapPromises = [];
        if (newTopicId) {
          const weekLessons = tempUpdatedPrev
            .filter(l => l.week_number === lesson.week_number && l.subject === lesson.subject && l.topic_id === newTopicId)
            .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));

          if (weekLessons.length > 1) {
            const minNum = Math.min(...weekLessons.map(l => Number(l.lesson_number)));
            const maxNum = Math.max(...weekLessons.map(l => Number(l.lesson_number)));

            for (let num = minNum; num <= maxNum; num++) {
              if (!weekLessons.some(l => Number(l.lesson_number) === num)) {
                const gapSlot = { week_number: lesson.week_number, subject: lesson.subject, lesson_number: num, school_year: currentYear };
                const gapLesson = {
                  id: `temp-gap-${Date.now() + num}`,
                  ...gapSlot,
                  topic_id: newTopicId,
                  notes: '',
                  is_double_lesson: false,
                  second_yearly_lesson_id: null
                };
                tempUpdatedPrev = [...tempUpdatedPrev, gapLesson];

                const createPromise = YearlyLesson.create({
                  ...gapSlot,
                  topic_id: newTopicId,
                  notes: '',
                  is_double_lesson: false,
                  second_yearly_lesson_id: null,
                  name: 'Neue Lektion',
                  description: '',
                  user_id: pb.authStore.model.id,
                  class_id: activeClassId, // Sicherstellen, dass class_id gesetzt ist
                  subject: subjects.find(s => s.name === gapSlot.subject)?.id
                }).then(gapCreated => {
                  optimisticUpdateYearlyLessons(gapLesson, false, true);
                  optimisticUpdateYearlyLessons(gapCreated, true);
                }).catch(err => {
                  console.error("Error creating gap lesson:", err);
                  optimisticUpdateYearlyLessons(gapLesson, false, true);
                });

                gapPromises.push(createPromise);
              }
            }
          }
        }

        setYearlyLessons(tempUpdatedPrev);

        try {
          await Promise.all(
            lessonsToUpdate.map(mergedLesson =>
              YearlyLesson.update(mergedLesson.id, { topic_id: newTopicId })
            )
          );
          await Promise.all(gapPromises);
          await refetch();
        } catch (error) {
          console.error("Error updating block lesson topics:", error);
          setYearlyLessons(yearlyLessons);
        }
      } else if (slot) {
        if (!activeClassId) {
          console.error('Error: No activeClassId set for creating new lesson');
          alert('Bitte wählen Sie eine Klasse aus, bevor Sie eine neue Lektion erstellen.');
          return;
        }
        const subjectId = subjects.find(s => s.name === slot.subject)?.id;
        console.log('Debug: Subject mapping in handleLessonClick', {
          slotSubject: slot.subject,
          subjectId,
          slot,
          availableSubjects: subjects.map(s => ({ id: s.id, name: s.name }))
        });
        if (!subjectId) {
          console.error('Error: No valid subject ID found for', slot.subject);
          alert('Ungültiges Fach. Bitte wählen Sie ein gültiges Fach aus.');
          return;
        }

        const newLesson = {
          id: `temp-${Date.now()}`,
          ...slot,
          topic_id: activeTopicId,
          school_year: currentYear,
          notes: '',
          is_double_lesson: false,
          second_yearly_lesson_id: null,
          class_id: activeClassId // Hinzufügen von class_id
        };
        optimisticUpdateYearlyLessons(newLesson, true);

        const gapPromises = [];

        try {
          const createdLesson = await YearlyLesson.create({
            ...slot,
            topic_id: activeTopicId,
            school_year: currentYear,
            name: 'Neue Lektion',
            description: '',
            user_id: pb.authStore.model.id,
            class_id: activeClassId, // Sicherstellen, dass class_id gesetzt ist
            subject: subjectId,
            notes: '',
            is_double_lesson: false,
            second_yearly_lesson_id: null,
            is_exam: false,
            is_half_class: false,
            is_allerlei: false,
            allerlei_subjects: []
          });
          optimisticUpdateYearlyLessons(newLesson, false, true);
          optimisticUpdateYearlyLessons({ ...createdLesson, lesson_number: Number(createdLesson.lesson_number) }, true);

          let tempUpdatedPrev = [...yearlyLessons, { ...createdLesson, lesson_number: Number(createdLesson.lesson_number) }];

          const weekLessons = tempUpdatedPrev
            .filter(l => l.week_number === slot.week_number && l.subject === slot.subject && l.topic_id === activeTopicId)
            .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));

          if (weekLessons.length > 1) {
            const minNum = Math.min(...weekLessons.map(l => Number(l.lesson_number)));
            const maxNum = Math.max(...weekLessons.map(l => Number(l.lesson_number)));

            for (let num = minNum; num <= maxNum; num++) {
              if (!weekLessons.some(l => Number(l.lesson_number) === num)) {
                const gapSlot = { week_number: slot.week_number, subject: slot.subject, lesson_number: num, school_year: currentYear };
                const gapLesson = {
                  id: `temp-gap-${Date.now() + num}`,
                  ...gapSlot,
                  topic_id: activeTopicId,
                  notes: '',
                  is_double_lesson: false,
                  second_yearly_lesson_id: null
                };
                tempUpdatedPrev = [...tempUpdatedPrev, gapLesson];

                const createPromise = YearlyLesson.create({
                  ...gapSlot,
                  topic_id: activeTopicId,
                  notes: '',
                  is_double_lesson: false,
                  second_yearly_lesson_id: null,
                  name: 'Neue Lektion',
                  description: '',
                  user_id: pb.authStore.model.id,
                  class_id: activeClassId, // Sicherstellen, dass class_id gesetzt ist
                  subject: subjectId
                }).then(gapCreated => {
                  optimisticUpdateYearlyLessons(gapLesson, false, true);
                  optimisticUpdateYearlyLessons(gapCreated, true);
                }).catch(err => {
                  console.error("Error creating gap lesson:", err);
                  optimisticUpdateYearlyLessons(gapLesson, false, true);
                });

                gapPromises.push(createPromise);
              }
            }
          }

          setYearlyLessons(tempUpdatedPrev);
          await Promise.all(gapPromises);
          await refetch();
        } catch (error) {
          console.error("Error creating lesson:", error);
          optimisticUpdateYearlyLessons(newLesson, false, true);
        }
      }
    } else {
      if (lesson && lesson.topic_id && ((lesson.mergedLessons && lesson.mergedLessons.length > 1) || lesson.is_double_lesson)) {
        let topicLessons = [];
        if (lesson.is_double_lesson && (!lesson.mergedLessons || lesson.mergedLessons.length <= 1)) {
          const secondLesson = yearlyLessons.find(l => l.id === lesson.second_yearly_lesson_id);
          topicLessons = [lesson];
          if (secondLesson) {
            topicLessons.push(secondLesson);
          }
        } else {
          topicLessons = lesson.mergedLessons;
        }

        const topic = topicsById.get(lesson.topic_id);
        setSelectedTopicLessons(topicLessons);
        setSelectedTopicInfo({
          topic: topic,
          subject: lesson.subject,
          week: lesson.week_number
        });
        setIsTopicLessonsModalOpen(true);
        return;
      }

      if (lesson && lesson.id) {
        const fullLesson = yearlyLessons.find(l => l.id === lesson.id);
        setEditingLesson(fullLesson);
        setNewLessonSlot(null);
      } else {
        if (!activeClassId) {
          console.error('Error: No activeClassId set for creating new lesson');
          alert('Bitte wählen Sie eine Klasse aus, bevor Sie eine neue Lektion erstellen.');
          return;
        }
        setEditingLesson(null);
        setNewLessonSlot({ 
          ...slot, 
          school_year: currentYear,
          class_id: activeClassId // Hinzufügen von class_id
        });
      }
      setIsLessonModalOpen(true);
    }
  }, [activeTopicId, currentYear, topicsById, yearlyLessons, activeClassId, subjects, refetch, setYearlyLessons, optimisticUpdateYearlyLessons, setSelectedTopicLessons, setSelectedTopicInfo, setIsTopicLessonsModalOpen, setEditingLesson, setNewLessonSlot, setIsLessonModalOpen, isAssignMode]);

  const handleSaveLesson = useCallback(async (lessonData, lessonContext) => {
    const originalLesson = lessonContext || editingLesson;
    const wasDoubleLesson = originalLesson?.is_double_lesson || false;
    const oldSecondYearlyId = originalLesson?.second_yearly_lesson_id;

    let finalLessonData = { ...lessonData };
    if (finalLessonData.is_double_lesson) {
      const nextLesson = yearlyLessons.find(l => l.id === finalLessonData.second_yearly_lesson_id);
      if (!nextLesson || parseInt(nextLesson.lesson_number) !== parseInt(originalLesson?.lesson_number || newLessonSlot?.lesson_number) + 1) {
        if (!nextLesson) {
          const subjectId = originalLesson?.subject || newLessonSlot?.subject;
          if (!subjectId) {
            throw new Error('No valid subject ID found for ' + (originalLesson?.subject || newLessonSlot?.subject));
          }
          const newSecondLesson = await YearlyLesson.create({
            subject: subjectId,
            week_number: finalLessonData.week_number || newLessonSlot?.week_number,
            lesson_number: parseInt(originalLesson?.lesson_number || newLessonSlot?.lesson_number) + 1,
            school_year: currentYear,
            steps: finalLessonData.secondSteps || [],
            notes: finalLessonData.notes || '',
            is_double_lesson: true,
            name: finalLessonData.second_name || `Lektion ${parseInt(originalLesson?.lesson_number || newLessonSlot?.lesson_number) + 1}`,
            description: '',
            user_id: pb.authStore.model.id,
            class_id: activeClassId,
            topic_id: finalLessonData.topic_id || null
          });
          finalLessonData.second_yearly_lesson_id = newSecondLesson.id;
          optimisticUpdateYearlyLessons(newSecondLesson, true);
        } else {
          finalLessonData.is_double_lesson = false;
          finalLessonData.second_yearly_lesson_id = null;
          console.warn('Invalid double lesson pairing; resetting flags');
        }
      }
    }

    try {
      // Entferne id aus finalLessonData für Create
      const { id, ...cleanLessonData } = finalLessonData;
      optimisticUpdateYearlyLessons(cleanLessonData, true);

      let primaryId = originalLesson?.id;

      if (primaryId) {
        await YearlyLesson.update(primaryId, { ...cleanLessonData, steps: cleanLessonData.steps });
      } else if (newLessonSlot) {
        const subjectId = newLessonSlot.subject;
        console.log('Debug: Saving lesson with subject', { subject: newLessonSlot.subject, subjectId });
        if (!subjectId) {
          throw new Error('No valid subject ID found for ' + newLessonSlot.subject);
        }
        if (!activeClassId) {
          throw new Error('No valid class_id found');
        }
        if (!pb.authStore.model?.id) {
          throw new Error('No authenticated user found');
        }

        const createPayload = {
          ...newLessonSlot,
          ...cleanLessonData,
          steps: cleanLessonData.steps,
          name: cleanLessonData.name || 'Neue Lektion',
          description: cleanLessonData.description || '',
          user_id: pb.authStore.model.id,
          class_id: activeClassId,
          subject: subjectId,
          topic_id: cleanLessonData.topic_id || null
        };
        // Entferne id explizit aus dem Create-Payload
        delete createPayload.id;

        const created = await YearlyLesson.create(createPayload);
        primaryId = created.id;
        if (created) {
          optimisticUpdateYearlyLessons({ ...created, lesson_number: Number(created.lesson_number) }, true);
          console.log('Debug: Created lesson', created);
        } else {
          throw new Error('Failed to create lesson: No response from server');
        }
      }

      if (finalLessonData.is_double_lesson && finalLessonData.second_yearly_lesson_id) {
        await YearlyLesson.update(finalLessonData.second_yearly_lesson_id, {
          steps: finalLessonData.secondSteps,
          is_double_lesson: true,
          name: finalLessonData.second_name,
          topic_id: finalLessonData.topic_id || null
        });
        optimisticUpdateYearlyLessons({
          id: finalLessonData.second_yearly_lesson_id,
          steps: finalLessonData.secondSteps,
          is_double_lesson: true,
          name: finalLessonData.second_name,
          topic_id: finalLessonData.topic_id || null
        }, false);
      }

      if (!finalLessonData.is_double_lesson && wasDoubleLesson && oldSecondYearlyId) {
        const primaryYL = yearlyLessons.find(yl => yl.id === primaryId);
        const originalTopicId = primaryYL?.topic_id;

        await YearlyLesson.update(oldSecondYearlyId, { is_double_lesson: false, topic_id: originalTopicId });
        optimisticUpdateYearlyLessons({ id: oldSecondYearlyId, is_double_lesson: false, topic_id: originalTopicId }, false);
        await YearlyLesson.update(primaryId, { is_double_lesson: false, second_yearly_lesson_id: null, topic_id: originalTopicId });
        optimisticUpdateYearlyLessons({ id: primaryId, is_double_lesson: false, second_yearly_lesson_id: null, topic_id: originalTopicId }, false);
      }

      // Separater try-catch für Lesson.list()
      const week = originalLesson?.week_number || newLessonSlot?.week_number;
      if (week && primaryId) {
        try {
          const allWeeklyLessons = await Lesson.list();
          const primaryWeeklyLesson = allWeeklyLessons.find(l => l.yearly_lesson_id === primaryId);
          if (primaryWeeklyLesson) {
            await Lesson.update(primaryWeeklyLesson.id, {
              is_double_lesson: finalLessonData.is_double_lesson,
              second_yearly_lesson_id: finalLessonData.is_double_lesson ? finalLessonData.second_yearly_lesson_id : null,
              topic_id: finalLessonData.topic_id || null
            });
          }
        } catch (error) {
          console.warn('Warning: Failed to update weekly lesson, continuing with save:', error);
          // Fortfahren, da dies die Hauptspeicherung nicht beeinflussen sollte
        }
      }

      setIsLessonModalOpen(false);
      setEditingLesson(null);
      setNewLessonSlot(null);
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
      queryClientLocal.invalidateQueries(['timetableData']);
      import('react-hot-toast').then(({ toast }) => {
        toast.success('Lektion erfolgreich gespeichert');
      });
    } catch (error) {
      console.error("CRITICAL ERROR saving lesson:", error);
      if (originalLesson) {
        optimisticUpdateYearlyLessons(originalLesson, false);
      }
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
      queryClientLocal.invalidateQueries(['timetableData']);
      import('react-hot-toast').then(({ toast }) => {
        toast.error('Fehler beim Speichern der Lektion: ' + (error.message || 'Unbekannter Fehler'));
      });
    }
  }, [editingLesson, newLessonSlot, queryClientLocal, currentYear, yearlyLessons, subjects, activeClassId]);

  const handleDeleteLesson = useCallback(async (lessonId) => {
    try {
      const lessonToDelete = yearlyLessons.find(l => l.id === lessonId);
      if (lessonToDelete) {
        optimisticUpdateYearlyLessons(lessonToDelete, false, true);
        await YearlyLesson.delete(lessonId);
        setIsLessonModalOpen(false);
        setEditingLesson(null);
        setIsTopicLessonsModalOpen(false);
        queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
        queryClientLocal.invalidateQueries(['timetableData']);
      }
    } catch (error) {
      console.error("Error deleting lesson:", error);
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
      queryClientLocal.invalidateQueries(['timetableData']);
    }
  }, [yearlyLessons, queryClientLocal, currentYear]);

  const handleEditTopic = useCallback((topic) => {
    setEditingTopic(topic);
    setIsTopicModalOpen(true);
  }, []);

  const handleSaveTopic = useCallback(async (topicData) => {
    try {
      if (editingTopic) {
        await Topic.update(editingTopic.id, topicData);
      } else {
        await Topic.create({
          name: topicData.name,
          description: topicData.description,
          color: topicData.color,
          subject: activeSubjectName,
          class_id: activeClassId,
          school_year: currentYear
        });
      }
      setIsTopicModalOpen(false);
      setEditingTopic(null);
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
      queryClientLocal.invalidateQueries(['timetableData']);
    } catch (error) {
      console.error("Error saving topic:", error);
    }
  }, [editingTopic, activeSubjectName, activeClassId, currentYear, queryClientLocal]);

  const handleDeleteTopic = useCallback(async (topicId) => {
    try {
      const affectedLessons = yearlyLessons.filter(l => l.topic_id === topicId);
      if (affectedLessons.length > 0) {
        await Promise.all(
          affectedLessons.map(l => YearlyLesson.update(l.id, { ...l, topic_id: null }))
        );
      }
      await Topic.delete(topicId);
      if (activeTopicId === topicId) {
        setActiveTopicId(null);
      }
      setIsTopicModalOpen(false);
      setEditingTopic(null);
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
      queryClientLocal.invalidateQueries(['timetableData']);
    } catch (error) {
      console.error("Error deleting topic:", error);
    }
  }, [yearlyLessons, activeTopicId, queryClientLocal, currentYear]);

  const activeClassName = useMemo(() => classes.find(c => c.id === activeClassId)?.name || '', [classes, activeClassId]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <div className="flex-shrink-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0">
        <div className="p-6 pb-4 max-w-none mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center items-center gap-4 mb-6"
          >
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-lg p-1 border border-slate-200 dark:border-slate-700 shadow-lg">
              {['Tag', 'Woche', 'Jahr'].map((view) => (
                <Button
                  key={view}
                  variant={currentView === view ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewChange(view)}
                  className={`px-4 py-2 ${currentView === view ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-300 hover:bg-slate-700'}`}
                >
                  {view}
                </Button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center items-center gap-4"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentYear(y => y - 1)}
              className="rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-md text-black dark:text-white"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>

            <div className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-lg shadow-md">
              Schuljahr {currentYear}/{currentYear + 1}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentYear(y => y + 1)}
              className="rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-md text-black dark:text-white"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>

            {/* Density Control */}
            <div className="flex items-center gap-2 ml-4">
              <label className="text-sm text-gray-600 dark:text-slate-300">Dichte:</label>
              <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                {['compact', 'standard', 'spacious'].map((mode) => (
                  <Button
                    key={mode}
                    variant={densityMode === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDensityMode(mode)}
                    className={`px-2 py-1 text-xs ${densityMode === mode ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-slate-300'}`}
                  >
                    {mode === 'compact' ? 'K' : mode === 'standard' ? 'S' : 'L'}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 p-6 pt-2 w-full bg-slate-50 dark:bg-slate-900 yearly-main-grid">
        {/* Table Container */}
        <div className="flex-1 overflow-hidden relative">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 h-full yearly-table-container"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
              </div>
            ) : (
              <>
                {isAssignMode && (
                  <div className="p-4">
                    <Button onClick={handleAssignAndBack} className="mb-4">
                      Zuweisen & Zurück
                    </Button>
                  </div>
                )}
                {subjectsForClass.length === 0 ? (
                  <div className="text-center text-slate-400">Keine Fächer verfügbar – Bitte fügen Sie ein Fach hinzu.</div>
                ) : (
                  <YearlyGrid
                    lessons={lessonsForYear}
                    topics={topics}
                    subjects={subjectsForClass}
                    academicWeeks={ACADEMIC_WEEKS}
                    onLessonClick={handleLessonClick}
                    activeClassId={activeClassId}
                    activeTopicId={activeTopicId}
                    currentYear={currentYear}
                    activeClassName={activeClassName}
                    holidays={holidays}
                    onShowHover={handleShowHover}
                    onHideHover={handleHideHover}
                    allYearlyLessons={yearlyLessons}
                    densityMode={densityMode}
                    isAssignMode={isAssignMode}
                    selectedLessons={selectedLessons}
                    onSelectLesson={handleSelectLesson}
                  />
                )}
              </>
            )}
          </motion.div>
        </div>

        {/* Intelligente Sidebar - VERSTECKT bei sehr kleinen Screens */}
        {window.innerWidth >= 768 ? ( // ← Sidebar nur ab 768px
          <div className="yearly-sidebar flex-shrink-0">
            <div className="sticky top-6 max-h-[70vh] overflow-hidden flex flex-col">
              <TopicManager
                topics={topics}
                subjects={subjects}
                classes={classes}
                activeClassId={activeClassId}
                onSelectClass={setActiveClassId}
                activeSubjectName={activeSubjectName}
                onSelectSubject={setActiveSubjectName}
                activeTopicId={activeTopicId}
                onSelectTopic={setActiveTopicId}
                onAddTopic={handleAddTopic}
                onEditTopic={handleEditTopic}
                yearlyLessons={lessonsForYear}
                isCompact={window.innerWidth < 1024}
              />
            </div>
          </div>
        ) : null} {/* ← Bei < 768px: komplett ausblenden */}
      </div>

      {/* Floating Quick Actions (nur auf Mobile) */}
      {window.innerWidth < 768 && ( // ← Nur bei sehr kleinen Screens
        <div className="floating-quick-actions">
          <QuickActionsFloating
            activeClassId={activeClassId}
            activeSubjectName={activeSubjectName}
            activeTopicId={activeTopicId}
            classes={classes}
            subjects={subjectsForClass}
            topics={filteredTopics}
            onSelectClass={setActiveClassId}
            onSelectSubject={setActiveSubjectName}
            onSelectTopic={setActiveTopicId}
            onAddTopic={handleAddTopic}
            onToggleQuickActions={() => setShowQuickActions(!showQuickActions)}
          />
        </div>
      )}

      {/* Quick Actions Overlay */}
      <QuickActionsOverlay
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        activeClassId={activeClassId}
        activeSubjectName={activeSubjectName}
        activeTopicId={activeTopicId}
        classes={classes}
        subjects={subjectsForClass}
        topics={filteredTopics}
        onSelectClass={setActiveClassId}
        onSelectSubject={setActiveSubjectName}
        onSelectTopic={setActiveTopicId}
        onAddTopic={handleAddTopic}
      />

      {hoverLesson && (
        <YearLessonOverlay
          lesson={hoverLesson}
          overlayRef={overlayRef}
          position={hoverPosition}
          onMouseMove={() => { if (debouncedShowRef.current) debouncedShowRef.current(hoverLesson, hoverPosition); }}
          onMouseLeave={() => { if (debouncedHideRef.current) debouncedHideRef.current(); }}
          lessonColor={hoverLesson?.color}
        />
      )}

      <TopicModal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        onSave={handleSaveTopic}
        onDelete={handleDeleteTopic}
        topic={editingTopic}
        subjectColor={subjects.find(s => s.name === activeSubjectName)?.color}
        subject={subjects.find(s => s.name === activeSubjectName)}
        topics={topics} // Ensure topics are passed for the Select in LessonModal
        autoAssignTopicId={editingTopic?.id}
      />

      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        onSave={handleSaveLesson}
        onDelete={handleDeleteLesson}
        lesson={editingLesson}
        topics={topics}
        newLessonSlot={newLessonSlot}
        subjectColor={subjects.find(s => s.name === (newLessonSlot?.subject || editingLesson?.subject))?.color}
        allYearlyLessons={yearlyLessons}
        currentWeek={editingLesson?.week_number || newLessonSlot?.week_number}
        currentYear={currentYear}
      />

      <TopicLessonsModal
        isOpen={isTopicLessonsModalOpen}
        onClose={() => setIsTopicLessonsModalOpen(false)}
        topicLessons={selectedTopicLessons}
        topic={selectedTopicInfo?.topic}
        subject={selectedTopicInfo?.subject}
        week={selectedTopicInfo?.week}
        activeTopicId={activeTopicId}
        subjectColor={subjects.find(s => s.name === selectedTopicInfo?.subject)?.color}
        allYearlyLessons={yearlyLessons}
        onSaveLesson={handleSaveLesson}
        onDeleteLesson={handleDeleteLesson}
        topics={topics}
        currentYear={currentYear}
        autoAssignTopicId={selectedTopicInfo?.topic?.id} // Corrected: Pass topic ID directly
      />
    </div>
  );
}