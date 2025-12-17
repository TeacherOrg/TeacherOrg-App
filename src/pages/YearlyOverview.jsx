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
import { Plus } from "lucide-react";
import toast from 'react-hot-toast';
import { Calendar, GraduationCap } from 'lucide-react';

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

  // NEU: States für Jahresmodus
  const [yearViewMode, setYearViewMode] = useState('calendar'); // 'calendar' | 'school'
  const [schoolYearStartWeek, setSchoolYearStartWeek] = useState(35);

  // NEU: localStorage für yearViewMode
  useEffect(() => {
    const saved = localStorage.getItem('yearViewMode');
    if (saved === 'school' || saved === 'calendar') {
      setYearViewMode(saved);
    }
  }, []);

  // Beim Wechseln speichern
  useEffect(() => {
    localStorage.setItem('yearViewMode', yearViewMode);
  }, [yearViewMode]);

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
  }, []);

  const handleHideHover = useCallback(() => {
    if (debouncedHideRef.current) debouncedHideRef.current();
  }, []);

  // Füge hier ein:
  const handleSelectLesson = useCallback((slot) => {
    if (!slot?.week_number || !slot.subject || slot.lesson_number == null) return;

    const key = `${slot.week_number}-${slot.subject}-${slot.lesson_number}`;

    setSelectedLessons(prev => {
      const exists = prev.includes(key);
      if (exists) {
        // toast.success("Auswahl entfernt");
        return prev.filter(k => k !== key);
      } else {
        // toast.success("Slot ausgewählt");
        return [...prev, key];
      }
    });
  }, []);

  const handleAssignAndBack = async () => {
    if (selectedLessons.length === 0) {
      toast.error("Bitte wähle mindestens eine Lektion/Slot aus");
      return;
    }
    const assignTopicId = searchParams.get("topic");
    if (!assignTopicId) return;

    const subjectObj = subjects.find(
      (s) => s.name.toLowerCase() === assignSubject?.toLowerCase()
    );

    const updates = selectedLessons.map(async (key) => {
      const [week, subjName, number] = key.split("-");
      const weekNum = parseInt(week);
      const lessonNum = parseInt(number);

      const existingLesson = lessonsForYear.find(
        (l) =>
          l.week_number === weekNum &&
          l.subject === subjectObj?.id &&
          l.lesson_number === lessonNum
      );

      if (existingLesson) {
        await YearlyLesson.update(existingLesson.id, { topic_id: assignTopicId });
      } else {
        // Leerer Slot → neue Lektion anlegen
        await YearlyLesson.create({
          week_number: weekNum,
          lesson_number: lessonNum,
          subject: subjectObj?.id,
          school_year: currentYear,
          topic_id: assignTopicId,
          user_id: pb.authStore.model?.id,
          class_id: activeClassId || subjectObj?.class_id,
          name: "Neue Lektion",
        });
      }
    });

    await Promise.all(updates);
    // Draft-Status entfernen falls vorhanden
    try {
      await Topic.update(assignTopicId, { /* is_draft: false – falls du das Feld hast */ });
    } catch (_) {}

    navigate(-1);
    toast.success("Lektionen erfolgreich zugewiesen!");
  };

  const queryClientLocal = useQueryClient();

  const { data, isLoading: queryLoading, refetch } = useQuery({
    queryKey: ['yearlyData', currentYear],
    queryFn: async () => {
      const [lessonsData, topicsData, subjectsData, classesData, holidaysData] = await Promise.all([
        YearlyLesson.list({ user_id: pb.authStore.model?.id }),
        Topic.list({ 'class_id.user_id': pb.authStore.model?.id }),
        Subject.list({ 'class_id.user_id': pb.authStore.model?.id }),
        Class.list({ user_id: pb.authStore.model?.id }),
        Holiday.list({ user_id: pb.authStore.model?.id })
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

      // NEU: Schuljahr-Startwoche aus den Settings holen
      // Angenommen, du lädst Settings separat oder sie sind in data; passe an, falls nötig
      // Hier als Beispiel, falls du Setting.list() hinzufügst:
      // const settingsData = await Setting.list({ user_id: pb.authStore.model?.id });
      // if (settingsData && settingsData.length > 0) {
      //   const latestSettings = settingsData.sort((a,b) => new Date(b.updated) - new Date(a.updated))[0];
      //   setSchoolYearStartWeek(latestSettings.schoolYearStartWeek || 35);
      // }
      // Für jetzt: setze Standard
      setSchoolYearStartWeek(35); // Passe an, wenn Settings geladen werden
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

  const displayedSubjects = useMemo(() => {
    if (isAssignMode && assignSubject) {
      const subj = subjects.find(
        (s) => s.name.toLowerCase() === assignSubject.toLowerCase()
      );
      return subj ? [subj] : [];
    }

    // Normaler Code für Nicht-Assign-Modus
    if (!activeClassId) {
      const allSubjects = [];
      const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name));
      sortedClasses.forEach((cls) => {
        const classSubjects = subjects
          .filter((s) => s.class_id === cls.id)
          .sort((a, b) => a.name.localeCompare(b.name));
        allSubjects.push(...classSubjects);
      });
      return allSubjects;
    }

    return subjects.filter((s) => s.class_id === activeClassId);
  }, [isAssignMode, assignSubject, subjects, activeClassId, classes]);

  const activeClassName = useMemo(() => classes.find(c => c.id === activeClassId)?.name || '', [classes, activeClassId]);

  const activeClassDisplayName = activeClassId === null ? 'Alle Klassen' : activeClassName;

  const lessonsForYear = useMemo(() => {
    // Im Kalender-Modus: nur aktuelles Kalenderjahr
    if (yearViewMode === 'calendar') {
      return yearlyLessons.filter(
        (lesson) => Number(lesson.school_year) === currentYear || !lesson.school_year
      );
    }

    // Im Schuljahr-Modus: aktuelles + nächstes Kalenderjahr anzeigen
    // (weil Schuljahr z. B. 2025/26 = KW 35 2025 bis KW 34 2026)
    return yearlyLessons.filter((lesson) => {
      const lessonYear = Number(lesson.school_year);
      return lessonYear === currentYear || lessonYear === currentYear + 1 || !lesson.school_year;
    });
  }, [yearlyLessons, currentYear, yearViewMode]);

  const handleLessonClick = useCallback(
    async (lesson, slot) => {
      if (isAssignMode) {
        if (lesson?.topic_id) {
          toast.error("Diese Lektion ist bereits einem anderen Thema zugewiesen");
          return;
        }

        // WICHTIG: immer den Namen benutzen → konsistent!
        const subjectName = lesson 
          ? subjects.find(s => s.id === lesson.subject)?.name || 'Unbekannt'
          : slot.subject;   // slot.subject ist immer der Name

        const selectSlot = {
          week_number: lesson?.week_number || slot.week_number,
          subject: subjectName,
          lesson_number: lesson?.lesson_number || slot.lesson_number,
        };

        handleSelectLesson(selectSlot);
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
            subject: subjectId, // ← Konvertiere Name zu ID
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
              subject: subjectId, // ← Verwende ID
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
              .filter(l => l.week_number === slot.week_number && l.subject === subjectId && l.topic_id === activeTopicId) // ← Verwende subjectId
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
                    subject: subjectId, // ← Verwende ID
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
                    subject: subjectId // ← Verwende ID
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
            subject: subjects.find(s => s.name === slot.subject)?.id || slot.subject, // ← fallback auf ID
            school_year: currentYear,
            class_id: activeClassId // Hinzufügen von class_id
          });
        }
        setIsLessonModalOpen(true);
      }
    },
    [
      isAssignMode,
      handleSelectLesson,
      toast,
      activeTopicId,
      currentYear,
      topicsById,
      yearlyLessons,
      activeClassId,
      subjects,
      refetch,
      setYearlyLessons,
      optimisticUpdateYearlyLessons,
      setSelectedTopicLessons,
      setSelectedTopicInfo,
      setIsTopicLessonsModalOpen,
      setEditingLesson,
      setNewLessonSlot,
      setIsLessonModalOpen,
    ]
  );

  const handleSaveLesson = useCallback(async (lessonData, originalLessonOverride) => {
    const originalLesson = originalLessonOverride || editingLesson;
    const wasDoubleLesson = originalLesson?.is_double_lesson || false;
    const oldSecondYearlyId = originalLesson?.second_yearly_lesson_id;

    let finalLessonData = { ...lessonData };
    console.log('Debug: Saving lesson with is_half_class:', finalLessonData.is_half_class); // Debugging hinzufügen

    console.log('handleSaveLesson called with:', {
      hasOriginalLesson: !!originalLesson,
      hasNewLessonSlot: !!newLessonSlot,
      primaryId: originalLesson?.id,
      subjectId: newLessonSlot?.subject || originalLesson?.subject
    });

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
            is_double_lesson: false,  // Zweite Lektion darf kein Doppelflag haben
            second_yearly_lesson_id: null,  // explizit!
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
      const { id, ...cleanLessonData } = finalLessonData;
      optimisticUpdateYearlyLessons(cleanLessonData, true);

      let primaryId = originalLesson?.id;

      if (primaryId) {
        // Update bestehende Lektion
        const updatePayload = {
          ...cleanLessonData,
          steps: cleanLessonData.steps,
          subject: originalLesson.subject
        };
        await YearlyLesson.update(primaryId, updatePayload);
        optimisticUpdateYearlyLessons({ id: primaryId, ...updatePayload }, false);
      } else {
        // Neue Lektion → Create
        // Subject ID aus newLessonSlot oder fallback aus displayLesson in formData
        const subjectId = newLessonSlot?.subject || 
                          subjects.find(s => s.id === cleanLessonData.subject || s.name === cleanLessonData.subject)?.id;

        if (!subjectId) {
          throw new Error('Kein gültiges Fach gefunden – subject fehlt');
        }

        const createPayload = {
          ...newLessonSlot,
          ...cleanLessonData,
          steps: cleanLessonData.steps,
          name: cleanLessonData.name || 'Neue Lektion',
          subject: subjectId,
          class_id: activeClassId,
          user_id: pb.authStore.model.id,
          school_year: currentYear,
          week_number: newLessonSlot?.week_number || cleanLessonData.week_number,
          lesson_number: newLessonSlot?.lesson_number || cleanLessonData.lesson_number,
          topic_id: cleanLessonData.topic_id || null
        };

        const created = await YearlyLesson.create(createPayload);
        primaryId = created.id;
        optimisticUpdateYearlyLessons({ ...created, lesson_number: Number(created.lesson_number) }, true);
      }

      if (finalLessonData.is_double_lesson && finalLessonData.second_yearly_lesson_id) {
        await YearlyLesson.update(finalLessonData.second_yearly_lesson_id, {
          steps: finalLessonData.secondSteps,
          is_double_lesson: false,     // ← false!
          second_yearly_lesson_id: null, // ← null!
          name: finalLessonData.second_name,
          topic_id: finalLessonData.topic_id || null
        });
        optimisticUpdateYearlyLessons({
          id: finalLessonData.second_yearly_lesson_id,
          steps: finalLessonData.secondSteps,
          is_double_lesson: false,     // ← false!
          second_yearly_lesson_id: null, // ← null!
          name: finalLessonData.second_name,
          topic_id: finalLessonData.topic_id || null
        }, false);
      }

      if (!finalLessonData.is_double_lesson && wasDoubleLesson && oldSecondYearlyId) {
        const primaryYL = yearlyLessons.find(yl => yl.id === primaryId);
        const originalTopicId = primaryYL?.topic_id;

        await YearlyLesson.update(oldSecondYearlyId, { is_double_lesson: false, second_yearly_lesson_id: null, topic_id: originalTopicId });
        optimisticUpdateYearlyLessons({ id: oldSecondYearlyId, is_double_lesson: false, second_yearly_lesson_id: null, topic_id: originalTopicId }, false);
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

      // setIsLessonModalOpen(false); // Entfernt: Modal wird nur in handleSubmit geschlossen
      setEditingLesson(null);
      setNewLessonSlot(null);
      // queryClientLocal.invalidateQueries(['yearlyData', currentYear]); // Entfernt, da optimistic updates die UI aktualisieren
      // queryClientLocal.invalidateQueries(['timetableData']);
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
        // queryClientLocal.invalidateQueries(['yearlyData', currentYear]); // Entfernt
        // queryClientLocal.invalidateQueries(['timetableData']);
      }
    } catch (error) {
      console.error("Error deleting lesson:", error);
      // queryClientLocal.invalidateQueries(['yearlyData', currentYear]); // Entfernt
      // queryClientLocal.invalidateQueries(['timetableData']);
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

  const selectedSubject = useMemo(() => subjects.find(s => s.name === activeSubjectName), [subjects, activeSubjectName]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden transition-colors duration-300">
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

            {/* NEU: Umschaltbarer Jahr-Button */}
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg shadow-md flex items-center gap-3 min-w-[300px] justify-center"
              onClick={() => setYearViewMode(prev => prev === 'calendar' ? 'school' : 'calendar')}
            >
              {yearViewMode === 'calendar' ? (
                <>
                  <Calendar className="w-5 h-5" />
                  Kalenderjahr {currentYear}/{currentYear + 1}
                </>
              ) : (
                <>
                  <GraduationCap className="w-5 h-5" />
                  Schuljahr {currentYear}/{currentYear + 1}
                </>
              )}
            </Button>

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

            {/* Add Topic button moved here, directly opens TopicModal */}
            <Button
              onClick={handleAddTopic}
              className="ml-4 bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-md flex items-center gap-2 px-4 py-2"
            >
              <Plus className="w-4 h-4" />
              Thema hinzufügen
            </Button>
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
                  <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-slate-800 rounded-lg shadow-2xl px-8 py-5 border border-green-500/50 max-w-lg">
                    <div className="text-center">
                      <p className="text-xl font-bold mb-2">
                        Lektionen zuweisen an Thema:
                      </p>
                      <p className="text-2xl font-extrabold mb-3" style={{ 
                        color: topics.find(t => t.id === searchParams.get('topic'))?.color || '#3b82f6' 
                      }}>
                        {topics.find(t => t.id === searchParams.get('topic'))?.name || 'Draft-Thema'}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Klicke auf freie Lektionen oder leere Slots · {selectedLessons.length} ausgewählt
                      </p>
                      <Button 
                        onClick={handleAssignAndBack}
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                        disabled={selectedLessons.length === 0}
                      >
                        {selectedLessons.length === 0 
                          ? 'Nichts ausgewählt' 
                          : `Zuweisen & Zurück (${selectedLessons.length})`
                        }
                      </Button>
                    </div>
                  </div>
                )}
                {displayedSubjects.length === 0 ? (
                  <div className="text-center text-slate-400">Keine Fächer verfügbar – Bitte fügen Sie ein Fach hinzu.</div>
                ) : (
                  <YearlyGrid
                    lessons={lessonsForYear}
                    topics={topics}
                    subjects={displayedSubjects}
                    academicWeeks={ACADEMIC_WEEKS}
                    onLessonClick={handleLessonClick}
                    activeClassId={activeClassId}
                    activeTopicId={activeTopicId}
                    currentYear={currentYear}
                    holidays={holidays}
                    onShowHover={handleShowHover}
                    onHideHover={handleHideHover}
                    allYearlyLessons={yearlyLessons}
                    densityMode={densityMode}
                    isAssignMode={isAssignMode}
                    selectedLessons={selectedLessons}
                    onSelectLesson={handleSelectLesson}
                    classes={classes}
                    onSelectClass={setActiveClassId}
                    yearViewMode={yearViewMode}
                    schoolYearStartWeek={schoolYearStartWeek}
                    refetch={refetch}
                    optimisticUpdateYearlyLessons={optimisticUpdateYearlyLessons}  // ← NEU!
                  />
                )}
              </>
            )}
          </motion.div>
        </div>
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
        subjectColor={selectedSubject?.color}
        subject={selectedSubject}
        topics={topics} // Ensure topics are passed for the Select in LessonModal
        autoAssignTopicId={editingTopic?.id}
      />

      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={() => {
          setIsLessonModalOpen(false);
          queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
          queryClientLocal.invalidateQueries(['timetableData']);
        }}
        onSave={handleSaveLesson}
        onDelete={handleDeleteLesson}
        lesson={editingLesson}
        topics={topics}
        newLessonSlot={newLessonSlot}
        subjectColor={subjects.find(s => s.name === (newLessonSlot?.subject || editingLesson?.subject))?.color}
        allYearlyLessons={yearlyLessons}
        currentWeek={editingLesson?.week_number || newLessonSlot?.week_number}
        currentYear={currentYear}
        onSaveAndNext={async (nextLessonNumber) => {
          const currentWeek = newLessonSlot?.week_number || editingLesson?.week_number;
          const currentSubjectId = newLessonSlot ? subjects.find(s => s.name === newLessonSlot.subject)?.id : editingLesson?.subject;

          if (!currentWeek || !currentSubjectId) {
            console.warn('Keine gültige Woche oder Fach-ID für nächste Lektion');
            return;
          }

          const nextLesson = yearlyLessons.find(
            l =>
              l.week_number === currentWeek &&
              l.subject === currentSubjectId &&
              Number(l.lesson_number) === nextLessonNumber
          );

          if (nextLesson) {
            // Beide States gleichzeitig setzen
            setEditingLesson(nextLesson);
            setNewLessonSlot(null);
            return;
          }

          // Prüfe, ob in der aktuellen Woche noch Platz für die nächste Lektion ist
          const subjectLessonsInWeek = yearlyLessons.filter(
            l => l.week_number === currentWeek && l.subject === currentSubjectId
          );
          const maxLessonNumber = subjectLessonsInWeek.length > 0 
            ? Math.max(...subjectLessonsInWeek.map(l => Number(l.lesson_number))) 
            : 0;

          let targetWeek = currentWeek;
          let targetLessonNumber = nextLessonNumber;

          if (nextLessonNumber <= maxLessonNumber + 1) {
            // Erstelle in der aktuellen Woche
          } else {
            // Kein Platz mehr in dieser Woche → nächste Woche, erste Lektion
            targetWeek = currentWeek + 1;
            if (targetWeek > 52) {
              console.warn('Keine weitere Woche verfügbar für neue Lektion');
              return;
            }
            targetLessonNumber = 1;
          }

          // Erstelle die neue Lektion automatisch
          try {
            const currentLesson = editingLesson || yearlyLessons.find(l => l.id === newLessonSlot?.id);
            const newLessonData = {
              subject: currentSubjectId,
              week_number: targetWeek,
              lesson_number: targetLessonNumber,
              school_year: currentYear,
              class_id: activeClassId,
              name: `Lektion ${targetLessonNumber}`,
              description: '',
              user_id: pb.authStore.model.id,
              topic_id: currentLesson?.topic_id || null,
              steps: [],
              notes: '',
              is_double_lesson: false,
              is_exam: false,
              is_half_class: false,
              second_yearly_lesson_id: null,
              allerlei_subjects: []
            };

            const createdLesson = await YearlyLesson.create(newLessonData);
            optimisticUpdateYearlyLessons(createdLesson, true);

            // Setze editingLesson auf die neu erstellte Lektion
            setEditingLesson(createdLesson);
            setNewLessonSlot(null);
          } catch (error) {
            console.error('Fehler beim automatischen Erstellen der nächsten Lektion:', error);
          }
        }}
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