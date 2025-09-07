import React, { useState, useEffect, useCallback, useMemo } from "react";
import { YearlyLesson, Topic, Subject, Class, Holiday, Lesson } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { motion } from "framer-motion";
import { useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import TopicModal from "@/components/topics/TopicModal";
import LessonModal from "../components/yearly/LessonModal";
import YearlyGrid from "../components/yearly/YearlyGrid";
import TopicManager from "../components/yearly/TopicManager";
import TopicLessonsModal from "../components/yearly/TopicLessonsModal";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import debounce from 'lodash/debounce';
import YearLessonOverlay from "../components/yearly/YearLessonOverlay";
import { adjustColor } from '@/utils/colorUtils';
import { useLessonStore } from '@/store'; // Passe den Pfad an, falls nötig
import pb from '@/api/pb';


const ACADEMIC_WEEKS = 52;

const queryClient = new QueryClient();

export default function YearlyOverviewPage() {
  return <QueryClientProvider client={queryClient}><InnerYearlyOverviewPage /></QueryClientProvider>;
}

function InnerYearlyOverviewPage() {
  const navigate = useNavigate();
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

  // NEW: State for topic lessons modal
  const [isTopicLessonsModalOpen, setIsTopicLessonsModalOpen] = useState(false);
  const [selectedTopicLessons, setSelectedTopicLessons] = useState([]);
  const [selectedTopicInfo, setSelectedTopicInfo] = useState(null);

  const [currentView, setCurrentView] = useState('Jahr');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const [hoverLesson, setHoverLesson] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ top: 0, left: 0 });
  const overlayRef = useRef(null);

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

  const queryClientLocal = useQueryClient();

  const { data, isLoading: queryLoading, refetch } = useQuery({
    queryKey: ['yearlyData', currentYear],
    queryFn: async () => {
      const [lessonsData, topicsData, subjectsData, classesData, holidaysData] = await Promise.all([
        YearlyLesson.list(),
        Topic.list(),
        Subject.list(),
        Class.list(),
        Holiday.list()
      ]);
      return { lessonsData, topicsData, subjectsData, classesData, holidaysData };
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (data) {
      console.log('Debug: Loaded yearlyLessons', data.lessonsData);
      setYearlyLessons(data.lessonsData.map(l => ({...l, lesson_number: Number(l.lesson_number)})) || []);
      setTopics(data.topicsData.sort((a, b) => a.title.localeCompare(b.title)) || []);
      setSubjects(data.subjectsData || []);
      setClasses(data.classesData || []);
      setHolidays(data.holidaysData || []);

      if (Array.isArray(data.classesData) && data.classesData.length > 0 && !activeClassId) {
        setActiveClassId(data.classesData[0].id);
      }
    }
    setIsLoading(queryLoading);
  }, [data, queryLoading, activeClassId, setYearlyLessons]);

  useEffect(() => {
    const handleDataRefresh = () => queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
    window.addEventListener('holidays-changed', handleDataRefresh);

    return () => {
      window.removeEventListener('holidays-changed', handleDataRefresh);
    };
  }, [currentYear, queryClientLocal]);

  const handleViewChange = (view) => {
    setCurrentView(view);
    if (view === 'Woche') {
      navigate(createPageUrl('Timetable'));
    }
  };

  const topicsById = useMemo(() => new Map(topics.map(t => [t.id, t])), [topics]);

  const handleLessonClick = useCallback(async (lesson, slot) => {
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
                  name: 'Neue Lektion', // Erforderlich
                  description: '',
                  user_id: pb.authStore.model.id,
                  class_id: activeClassId,
                  subject: subjects.find(s => s.name === slot.subject)?.id
                }).then(gapCreated => {
                  optimisticUpdateYearlyLessons(gapLesson, false, true); // Entferne temp
                  optimisticUpdateYearlyLessons(gapCreated, true); // Füge reale Lektion hinzu
                }).catch(err => {
                  console.error("Error creating gap lesson:", err);
                  optimisticUpdateYearlyLessons(gapLesson, false, true); // Entferne temp bei Fehler
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
          await refetch(); // Explizites Neuladen der Daten
        } catch (error) {
          console.error("Error updating block lesson topics:", error);
          setYearlyLessons(yearlyLessons); // Rollback
        }
      } else if (slot) {
        const subjectId = subjects.find(s => s.name === slot.subject)?.id;
        console.log('Debug: Creating lesson with subject', { slotSubject: slot.subject, subjectId, subjects }); // Debug-Log
        if (!subjectId) {
          console.error('Error: No valid subject ID found for', slot.subject);
          return; // Verhindere Erstellung ohne gültigen subject
        }

        const newLesson = {
          id: `temp-${Date.now()}`,
          ...slot,
          topic_id: activeTopicId,
          school_year: currentYear,
          notes: '',
          is_double_lesson: false,
          second_yearly_lesson_id: null
        };

        const gapPromises = [];

        try {
          const createdLesson = await YearlyLesson.create({
            ...slot,
            topic_id: activeTopicId,
            school_year: currentYear,
            name: 'Neue Lektion',
            description: '',
            user_id: pb.authStore.model.id,
            class_id: activeClassId,
            subject: subjectId, // Verwende subjectId
            notes: '',
            is_double_lesson: false,
            second_yearly_lesson_id: null,
            is_exam: false,
            is_half_class: false,
            is_allerlei: false,
            allerlei_subjects: []
          });

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
                  class_id: activeClassId,
                  subject: subjectId // Verwende subjectId
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
          await refetch(); // Explizites Neuladen
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
        setEditingLesson(null);
        setNewLessonSlot({ ...slot, school_year: currentYear });
      }
      setIsLessonModalOpen(true);
    }
  }, [activeTopicId, currentYear, topicsById, yearlyLessons, activeClassId, subjects, refetch]);

  const handleSaveLesson = useCallback(async (lessonData, lessonContext) => {
    const originalLesson = lessonContext || editingLesson;
    const wasDoubleLesson = originalLesson?.is_double_lesson || false;
    const oldSecondYearlyId = originalLesson?.second_yearly_lesson_id;

    let finalLessonData = { ...lessonData };
    if (finalLessonData.is_double_lesson) {
      const nextLesson = yearlyLessons.find(l => l.id === finalLessonData.second_yearly_lesson_id);
      if (!nextLesson || parseInt(nextLesson.lesson_number) !== parseInt(originalLesson?.lesson_number || newLessonSlot?.lesson_number) + 1) {
        // Neue zweite Lektion erstellen, falls sie nicht existiert
        if (!nextLesson) {
          const subjectId = subjects.find(s => s.name === (originalLesson?.subject || newLessonSlot?.subject))?.id;
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
      optimisticUpdateYearlyLessons(finalLessonData);

      let primaryId = originalLesson?.id;

      if (primaryId) {
        // Nur die Schritte der ersten Lektion speichern
        await YearlyLesson.update(primaryId, { ...finalLessonData, steps: finalLessonData.steps });
      } else if (newLessonSlot) {
        const subjectId = subjects.find(s => s.name === newLessonSlot.subject)?.id;
        console.log('Debug: Saving lesson with subject', { subject: newLessonSlot.subject, subjectId });
        if (!subjectId) {
          throw new Error('No valid subject ID found for ' + newLessonSlot.subject);
        }

        const created = await YearlyLesson.create({
          ...newLessonSlot,
          ...finalLessonData,
          steps: finalLessonData.steps, // Nur erste Lektion
          name: finalLessonData.name || 'Neue Lektion',
          description: finalLessonData.description || '',
          user_id: pb.authStore.model.id,
          class_id: activeClassId,
          subject: subjectId
        });
        primaryId = created.id;
        optimisticUpdateYearlyLessons(created, true);
        console.log('Debug: Created lesson', created);
      }

      // Zweite Lektion separat aktualisieren
      if (finalLessonData.is_double_lesson && finalLessonData.second_yearly_lesson_id) {
        await YearlyLesson.update(finalLessonData.second_yearly_lesson_id, {
          steps: finalLessonData.secondSteps, // Nur Schritte der zweiten Lektion
          is_double_lesson: true,
          name: finalLessonData.second_name
        });
        optimisticUpdateYearlyLessons(finalLessonData.second_yearly_lesson_id, {
          steps: finalLessonData.secondSteps,
          is_double_lesson: true,
          name: finalLessonData.second_name
        });
      }

      // Handle "un-doubling"
      if (!finalLessonData.is_double_lesson && wasDoubleLesson && oldSecondYearlyId) {
        const primaryYL = yearlyLessons.find(yl => yl.id === primaryId);
        const originalTopicId = primaryYL?.topic_id;

        await YearlyLesson.update(oldSecondYearlyId, { is_double_lesson: false, topic_id: originalTopicId });
        optimisticUpdateYearlyLessons(oldSecondYearlyId, { is_double_lesson: false, topic_id: originalTopicId });
        await YearlyLesson.update(primaryId, { is_double_lesson: false, second_yearly_lesson_id: null, topic_id: originalTopicId });
        optimisticUpdateYearlyLessons(primaryId, { is_double_lesson: false, second_yearly_lesson_id: null, topic_id: originalTopicId });
      }

      // Sync basic flags to weekly lesson (Timetable)
      const week = originalLesson?.week_number || newLessonSlot?.week_number;
      if (week && primaryId) {
        const allWeeklyLessons = await Lesson.list();
        const primaryWeeklyLesson = allWeeklyLessons.find(l => l.yearly_lesson_id === primaryId);
        if (primaryWeeklyLesson) {
          await Lesson.update(primaryWeeklyLesson.id, {
            is_double_lesson: finalLessonData.is_double_lesson,
            second_yearly_lesson_id: finalLessonData.is_double_lesson ? finalLessonData.second_yearly_lesson_id : null,
            topic_id: finalLessonData.topic_id
          });
        }
      }

      // Close modals and invalidate queries
      setIsLessonModalOpen(false);
      setEditingLesson(null);
      setNewLessonSlot(null);
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
      queryClientLocal.invalidateQueries(['timetableData']);

    } catch (error) {
      optimisticUpdateYearlyLessons(originalLesson);
      console.error("CRITICAL ERROR saving lesson:", error);
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
      queryClientLocal.invalidateQueries(['timetableData']);
    }
  }, [editingLesson, newLessonSlot, queryClientLocal, currentYear, yearlyLessons, subjects, activeClassId]);

  const handleDeleteLesson = useCallback(async (lessonId) => {
    try {
      const lessonToDelete = yearlyLessons.find(l => l.id === lessonId);
      if (lessonToDelete) {
        // Optimistic delete
        optimisticUpdateYearlyLessons(lessonToDelete, false, true);

        await YearlyLesson.delete(lessonId);

        setIsLessonModalOpen(false);
        setEditingLesson(null);
        setIsTopicLessonsModalOpen(false); // Close topic lessons modal if open
        queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
        queryClientLocal.invalidateQueries(['timetableData']);
      }
    } catch (error) {
      console.error("Error deleting lesson:", error);
      // Revert on error
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
      queryClientLocal.invalidateQueries(['timetableData']);
    }
  }, [yearlyLessons, queryClientLocal, currentYear]);

  const handleAddTopic = useCallback(() => {
    setEditingTopic(null);
    setIsTopicModalOpen(true);
  }, []);

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
  
  const subjectsForClass = useMemo(() => {
    if (!activeClassId) return [];
    return subjects.filter(s => s.class_id === activeClassId);
  }, [subjects, activeClassId]);

  const lessonsForYear = useMemo(() => {
    return yearlyLessons.filter(lesson => {
      const lessonYear = Number(lesson.school_year); // Konvertiere zu Number
      if (!lessonYear) {
        return currentYear === new Date().getFullYear();
      }
      return lessonYear === currentYear;
    });
  }, [yearlyLessons, currentYear]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Sticky Header Section */}
      <div className="flex-shrink-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0">
        <div className="p-6 pb-4 max-w-screen-2xl mx-auto">
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
              className="rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-md text-black dark:text-white"  // Hell machen + Textfarbe
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
              className="rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-md text-black dark:text-white"  // Hell machen + Textfarbe
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 pt-2 max-w-screen-2xl mx-auto w-full flex gap-8 bg-slate-50 dark:bg-slate-900">
        <div className="flex-[3] overflow-auto relative">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 h-full"  // Entferne p-4
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
              </div>
            ) : (
              <>
                {(!topics || topics.length === 0) ? (
                  <div className="text-center text-slate-400">Keine Themen verfügbar – Lade Daten neu.</div>
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
                  />
                )}
              </>
            )}
          </motion.div>
        </div>

        <div className="flex-1 w-80 flex-shrink-0">
          <div className="sticky top-6">
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
            />
          </div>
        </div>
      </div>

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
        currentYear={currentYear}  // Neu: Übergebe currentYear als Prop
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
      />
    </div>
  );
}