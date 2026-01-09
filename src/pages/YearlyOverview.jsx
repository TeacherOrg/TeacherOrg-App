import React, { useState, useEffect, useCallback, useMemo } from "react";
import { YearlyLesson, Topic, Subject, Class, Holiday, Lesson, Setting } from "@/api/entities"; 
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import debounce from 'lodash/debounce';
import YearLessonOverlay from "../components/yearly/YearLessonOverlay";
import { adjustColor } from '@/utils/colorUtils';
import { useLessonStore } from '@/store';
import pb from '@/api/pb';
import toast from 'react-hot-toast';
import { Calendar, GraduationCap } from 'lucide-react';
import useAllYearlyLessons from '@/hooks/useAllYearlyLessons';
import { syncYearlyLessonToWeekly } from '@/hooks/useYearlyLessonSync';
import { safeSortByName } from '@/utils/safeData';
import { getCurrentSchoolYear } from '@/utils/weekYearUtils';

const ACADEMIC_WEEKS = 52;

export default function YearlyOverviewPage() {
  return <InnerYearlyOverviewPage />;
}

function InnerYearlyOverviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const assignSubject = searchParams.get('subject');
  const isAssignMode = mode === 'assign';
  const isReassignMode = mode === 'reassign';
  const isAnyAssignMode = isAssignMode || isReassignMode;
  const topicMode = searchParams.get('topic');

  // Nicht mehr benötigt - verwenden jetzt optimisticUpdate aus Hook
  // const { setAllYearlyLessons, optimisticUpdateYearlyLessons } = useLessonStore();
  const [topics, setTopics] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [settings, setSettings] = useState(null);

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
  const [currentYear, setCurrentYear] = useState(() => getCurrentSchoolYear(35));

  // Neue States für Quick Actions
  const [showQuickActions, setShowQuickActions] = useState(false);

  // densityMode aus Settings ableiten (wird aus DB geladen)
  const densityMode = settings?.yearlyDensity || 'standard';

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
  const [sharedLessonsLimit, setSharedLessonsLimit] = useState(null); // Limit für geteilte Lektionen
  const [sharedLessonsData, setSharedLessonsData] = useState([]); // Die geteilten Lektionsdaten

  // Lade sharedLessonsLimit und sharedLessonsData beim Mount im Assign-Modus
  useEffect(() => {
    if (isAssignMode) {
      try {
        const pendingData = localStorage.getItem('pendingSharedLessons');
        if (pendingData) {
          const parsed = JSON.parse(pendingData);
          const topicId = searchParams.get('topic');
          if (parsed.topicId === topicId && parsed.lessons?.length > 0) {
            setSharedLessonsLimit(parsed.lessons.length);
            setSharedLessonsData(parsed.lessons);
          }
        }
      } catch (e) {
        console.error('Error loading sharedLessonsLimit:', e);
      }
    }
  }, [isAssignMode, searchParams]);

  // Lade archivierte Lektionen beim Mount im Reassign-Modus
  useEffect(() => {
    if (isReassignMode) {
      try {
        const pendingData = localStorage.getItem('pendingArchivedLessons');
        if (pendingData) {
          const parsed = JSON.parse(pendingData);
          const topicId = searchParams.get('topic');
          if (parsed.topicId === topicId && parsed.lessons?.length > 0) {
            setSharedLessonsLimit(parsed.lessons.length);
            setSharedLessonsData(parsed.lessons);
          }
        }
      } catch (e) {
        console.error('Error loading pendingArchivedLessons:', e);
      }
    }
  }, [isReassignMode, searchParams]);

  // Sofortiges Setzen beim Betreten
  const handleShowHover = useCallback((lesson, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverLesson(lesson);
    setHoverPosition({
      top: rect.bottom + 10,
      left: rect.left + rect.width / 2, // zentriert
    });
  }, []);

  // Sofortiges Löschen beim Verlassen
  const handleHideHover = useCallback(() => {
    setHoverLesson(null);
    setHoverPosition({ top: 0, left: 0 });
  }, []);

  // Overlay schließen beim Ansichtswechsel oder Klassenwechsel
  useEffect(() => {
    handleHideHover();
  }, [currentYear, activeClassId, yearViewMode, handleHideHover]);

  // Overlay schließen beim Klicken irgendwo
  useEffect(() => {
    const handleClick = () => {
      handleHideHover();
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [handleHideHover]);

  // Füge hier ein:
  const handleSelectLesson = useCallback((slot) => {
    if (!slot?.week_number || !slot.subject || slot.lesson_number == null) return;

    const key = `${slot.week_number}-${slot.subject}-${slot.lesson_number}`;
    // Prüfe ob Slot eine Doppellektion ist (aus Template ODER sharedLessonsData)
    const isDoubleFromTemplate = slot.is_double_lesson || slot._isTemplateDouble;

    setSelectedLessons(prev => {
      // Prüfe ob Key bereits existiert (unterstützt beide Formate: string und object)
      const exists = prev.some(item =>
        typeof item === 'string' ? item === key : item.key === key
      );

      if (exists) {
        // Entferne den Eintrag
        return prev.filter(item =>
          typeof item === 'string' ? item !== key : item.key !== key
        );
      } else {
        // Beim Hinzufügen: Prüfe Limit
        const nextLessonIndex = prev.length;
        const nextSharedLesson = sharedLessonsData[nextLessonIndex];
        const isDouble = isDoubleFromTemplate || nextSharedLesson?.is_double_lesson;

        if (sharedLessonsLimit !== null && prev.length + 1 > sharedLessonsLimit) {
          toast.error(`Maximal ${sharedLessonsLimit} Lektionen verfuegbar`);
          return prev;
        }

        // Speichere Key mit is_double_lesson Info als Objekt
        return [...prev, { key, is_double_lesson: isDouble }];
      }
    });
  }, [sharedLessonsLimit, sharedLessonsData]);

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

    // Prüfe ob geteilte oder archivierte Lektionen vorhanden sind
    let pendingShared = null;
    let sharedLessons = [];
    let pendingArchived = null;
    let archivedLessons = [];

    try {
      const pendingData = localStorage.getItem('pendingSharedLessons');
      if (pendingData) {
        pendingShared = JSON.parse(pendingData);
        if (pendingShared.topicId === assignTopicId) {
          sharedLessons = pendingShared.lessons || [];
        }
      }
    } catch (e) {
      console.error('Error parsing pendingSharedLessons:', e);
    }

    // Für Reassign-Mode: Lade archivierte Lektionen (diese haben bereits IDs!)
    try {
      const archivedData = localStorage.getItem('pendingArchivedLessons');
      if (archivedData) {
        pendingArchived = JSON.parse(archivedData);
        if (pendingArchived.topicId === assignTopicId) {
          archivedLessons = pendingArchived.lessons || [];
        }
      }
    } catch (e) {
      console.error('Error parsing pendingArchivedLessons:', e);
    }

    // Kombiniere: Im Reassign-Mode verwende archivedLessons, sonst sharedLessons
    const lessonsToAssign = isReassignMode ? archivedLessons : sharedLessons;

    // Sammle alle Optimistic Updates VOR den API-Calls
    const optimisticLessons = [];
    const apiCalls = [];

    // Sortiere selectedLessons nach Woche und Lektionsnummer für korrekte Zuordnung
    // Unterstützt beide Formate: string ("week-subject-num") und object ({ key, is_double_lesson })
    const sortedLessons = [...selectedLessons].sort((a, b) => {
      const keyA = typeof a === 'string' ? a : a.key;
      const keyB = typeof b === 'string' ? b : b.key;
      const [weekA, , numA] = keyA.split('-');
      const [weekB, , numB] = keyB.split('-');
      if (parseInt(weekA) !== parseInt(weekB)) {
        return parseInt(weekA) - parseInt(weekB);
      }
      return parseInt(numA) - parseInt(numB);
    });

    sortedLessons.forEach((item, index) => {
      // Extrahiere Key und is_double_lesson aus dem Item (string oder object)
      const keyStr = typeof item === 'string' ? item : item.key;
      const isDoubleFromSlot = typeof item === 'object' ? item.is_double_lesson : false;

      const [week, subjName, number] = keyStr.split("-");
      const weekNum = parseInt(week);
      const lessonNum = parseInt(number);

      // Hole Lektionsdaten aus Snapshot (falls vorhanden) - verwende lessonsToAssign
      const lessonData = lessonsToAssign[index] || {};
      // Doppellektion: aus Slot-Info ODER aus Snapshot
      const isDouble = isDoubleFromSlot || lessonData.is_double_lesson || false;

      const existingLesson = lessonsForYear.find(
        (l) =>
          l.week_number === weekNum &&
          l.subject === subjectObj?.id &&
          l.lesson_number === lessonNum
      );

      if (existingLesson) {
        // Optimistic Update für bestehende Lektion SOFORT
        const updateData = {
          topic_id: assignTopicId,
          // Überschreibe mit Snapshot-Daten falls vorhanden
          ...(lessonData.name && { name: lessonData.name }),
          ...(lessonData.notes && { notes: lessonData.notes }),
          ...(lessonData.steps && { steps: lessonData.steps }),
          ...(lessonData.is_exam !== undefined && { is_exam: lessonData.is_exam }),
          // Verwende is_double_lesson aus Slot oder Snapshot
          is_double_lesson: isDouble,
        };
        const optimisticLesson = { ...existingLesson, ...updateData };
        optimisticUpdate(optimisticLesson, false);

        // API-Call für später - mit Sync zur Wochenansicht
        apiCalls.push(
          YearlyLesson.update(existingLesson.id, updateData).then(async () => {
            // Sync zur Wochenansicht im Fixed-Schedule-Modus
            try {
              const updatedLesson = { ...existingLesson, ...updateData };
              await syncYearlyLessonToWeekly(updatedLesson, settings, subjects, allYearlyLessons);
            } catch (syncError) {
              console.warn('Failed to sync updated lesson to weekly timetable:', syncError);
            }
          })
        );
      } else {
        // Temporäre ID für optimistic update
        const tempId = `temp-assign-${Date.now()}-${weekNum}-${lessonNum}`;
        const newLessonData = {
          week_number: weekNum,
          lesson_number: lessonNum,
          subject: subjectObj?.id,
          school_year: currentYear,
          topic_id: assignTopicId,
          user_id: pb.authStore.model?.id,
          class_id: activeClassId || subjectObj?.class_id,
          name: lessonData.name || "Neue Lektion",
          notes: lessonData.notes || "",
          steps: lessonData.steps || [],
          is_exam: lessonData.is_exam || false,
          // Verwende is_double_lesson aus Slot oder Snapshot
          is_double_lesson: isDouble,
        };
        const tempLesson = {
          id: tempId,
          ...newLessonData,
        };

        // Optimistic Update SOFORT
        optimisticUpdate(tempLesson, true);
        optimisticLessons.push({ tempId, weekNum, lessonNum });

        // API-Call für später (ersetzt temp mit echter Lektion) - mit Sync zur Wochenansicht
        apiCalls.push(
          YearlyLesson.create(newLessonData).then(async (createdLesson) => {
            // Entferne temp-Lektion und füge echte hinzu
            const tempLesson = optimisticLessons.find(l => l.weekNum === weekNum && l.lessonNum === lessonNum);
            if (tempLesson) {
              optimisticUpdate({ id: tempLesson.tempId }, false, true); // Entferne temp
              optimisticUpdate({ ...createdLesson, lesson_number: lessonNum }, true); // Füge echte hinzu
            }

            // Sync zur Wochenansicht im Fixed-Schedule-Modus
            try {
              await syncYearlyLessonToWeekly(createdLesson, settings, subjects, [...allYearlyLessons, createdLesson]);
            } catch (syncError) {
              console.warn('Failed to sync created lesson to weekly timetable:', syncError);
            }
          })
        );
      }
    });

    // Warte auf alle API-Calls
    await Promise.all(apiCalls);

    // Entferne pendingSharedLessons aus localStorage nach erfolgreicher Zuweisung
    if (pendingShared && pendingShared.topicId === assignTopicId) {
      localStorage.removeItem('pendingSharedLessons');
    }

    // Entferne pendingArchivedLessons aus localStorage nach erfolgreicher Zuweisung (Reassign-Mode)
    if (pendingArchived && pendingArchived.topicId === assignTopicId) {
      localStorage.removeItem('pendingArchivedLessons');
    }

    // Draft-Status entfernen falls vorhanden
    try {
      await Topic.update(assignTopicId, { /* is_draft: false – falls du das Feld hast */ });
    } catch (_) {}

    // Invalidiere Queries um sicherzustellen, dass alle Daten aktuell sind
    queryClientLocal.invalidateQueries({ queryKey: ['allYearlyLessons'], refetchType: 'all' });
    queryClientLocal.invalidateQueries({ queryKey: ['topics'], refetchType: 'all' });
    queryClientLocal.invalidateQueries({ queryKey: ['yearlyLessons'], refetchType: 'all' });

    navigate(-1);
    toast.success("Lektionen erfolgreich zugewiesen!");
  };

  const queryClientLocal = useQueryClient();
  const userId = pb.authStore.model?.id;

  const { allYearlyLessons, isLoading: yearlyLoading, refetch: refetchYearly, optimisticUpdate } = useAllYearlyLessons(currentYear);

  const { data: topicsData, isLoading: topicsLoading } = useQuery({
    queryKey: ['topics', userId],
    queryFn: () => Topic.list({ 'class_id.user_id': userId }),
    staleTime: 0, // Immer frische Daten holen
  });

  const { data: subjectsData, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects', userId, currentYear],
    queryFn: () => Subject.list({ 'class_id.user_id': userId }),
  });

  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['classes', userId, currentYear],
    queryFn: () => Class.list({ user_id: userId }),
  });

  const { data: holidaysData, isLoading: holidaysLoading } = useQuery({
    queryKey: ['holidays', userId, currentYear],
    queryFn: () => Holiday.list({ user_id: userId }),
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings', userId, currentYear],
    queryFn: () => Setting.list({ user_id: userId }),
  });

  const prevModeRef = useRef(mode);

  useEffect(() => {
    if (topicsData) {
      const safeTopics = safeSortByName(topicsData || []);
      setTopics(safeTopics);
    }
    if (subjectsData) {
      setSubjects(subjectsData || []);
    }
    if (classesData) {
      setClasses(classesData || []);
      // REMOVED: Auto-selection to first class
      // activeClassId starts as null → shows "Alle Klassen" by default
      // User can explicitly select a class if desired
    }
    if (holidaysData) {
      setHolidays(holidaysData || []);
    }
    if (settingsData && settingsData.length > 0) {
      const latestSettings = settingsData.sort((a, b) => new Date(b.updated) - new Date(a.updated))[0];
      setSettings(latestSettings);
    }
  }, [topicsData, subjectsData, classesData, holidaysData, settingsData, activeClassId, yearViewMode]);

  // Computed loading state - no useEffect needed
  const isLoading = yearlyLoading || topicsLoading || subjectsLoading || classesLoading || holidaysLoading || settingsLoading;

  useEffect(() => {
    if (assignSubject && subjectsData) {
      const matchingSubject = subjectsData.find(s => s.name.toLowerCase() === assignSubject.toLowerCase());
      if (matchingSubject) {
        setActiveSubjectName(matchingSubject.name);
      } else {
        console.error('No subject found for assignSubject:', assignSubject);
      }
    }
  }, [assignSubject, subjectsData]);

  // Schuljahr und schoolYearStartWeek aus Settings laden
  useEffect(() => {
    if (settings?.schoolYearStartWeek) {
      setSchoolYearStartWeek(settings.schoolYearStartWeek);
      // Korrigiere das Schuljahr basierend auf den Settings
      const correctYear = getCurrentSchoolYear(settings.schoolYearStartWeek);
      setCurrentYear(correctYear);
    }
  }, [settings?.schoolYearStartWeek]);

  useEffect(() => {
    const handleDataRefresh = () => queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
    window.addEventListener('holidays-changed', handleDataRefresh);

    return () => {
      window.removeEventListener('holidays-changed', handleDataRefresh);
    };
  }, [currentYear, queryClientLocal]);

  // Auf Settings-Änderungen reagieren (z.B. Dichte-Einstellung)
  useEffect(() => {
    const handleSettingsChanged = (e) => {
      if (e.detail?.settings) {
        setSettings(e.detail.settings);
        // Auch die Query invalidieren für konsistenten State
        queryClientLocal.invalidateQueries(['settings']);
      }
    };
    window.addEventListener('settings-changed', handleSettingsChanged);
    return () => window.removeEventListener('settings-changed', handleSettingsChanged);
  }, [queryClientLocal]);

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
    } else if (view === 'Tag') {
      navigate('/Timetable?view=Tag');
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
    if (isAnyAssignMode && assignSubject) {
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
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        allSubjects.push(...classSubjects);
      });
      return allSubjects;
    }

    return subjects
      .filter((s) => s.class_id === activeClassId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [isAnyAssignMode, assignSubject, subjects, activeClassId, classes]);

  const activeClassName = useMemo(() => classes.find(c => c.id === activeClassId)?.name || '', [classes, activeClassId]);

  const activeClassDisplayName = activeClassId === null ? 'Alle Klassen' : activeClassName;

  const lessonsForYear = useMemo(() => {
    let filtered = allYearlyLessons;

    // CRITICAL: Filter by activeClassId first
    if (activeClassId !== null) {
      filtered = filtered.filter(l => l.class_id === activeClassId);
    }

    // Then filter by year mode
    if (yearViewMode === 'calendar') {
      return filtered.filter(
        (lesson) => Number(lesson.school_year) === currentYear || !lesson.school_year
      );
    }

    // Im Schuljahr-Modus: aktuelles + nächstes Kalenderjahr anzeigen
    // (weil Schuljahr z. B. 2025/26 = KW 35 2025 bis KW 34 2026)
    return filtered.filter((lesson) => {
      const lessonYear = Number(lesson.school_year);
      return lessonYear === currentYear || lessonYear === currentYear + 1 || !lesson.school_year;
    });
  }, [allYearlyLessons, currentYear, yearViewMode, activeClassId]);

  const handleLessonClick = useCallback(
    async (lesson, slot) => {
      if (isAnyAssignMode) {
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
          let tempUpdatedPrev = allYearlyLessons.map(p => {
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
                    optimisticUpdate(gapLesson, false, true);
                    optimisticUpdate(gapCreated, true);
                  }).catch(err => {
                    console.error("Error creating gap lesson:", err);
                    optimisticUpdate(gapLesson, false, true);
                  });

                  gapPromises.push(createPromise);
                }
              }
            }
          }

          // Optimistic Update für die Hauptlektionen SOFORT durchführen
          lessonsToUpdate.forEach(mergedLesson => {
            optimisticUpdate({ ...mergedLesson, topic_id: newTopicId }, false);
          });

          try {
            await Promise.all(
              lessonsToUpdate.map(mergedLesson =>
                YearlyLesson.update(mergedLesson.id, { topic_id: newTopicId })
              )
            );
            await Promise.all(gapPromises);
            // KEIN refetch - optimistic updates haben bereits aktualisiert
          } catch (error) {
            console.error("Error updating block lesson topics:", error);
            // Bei Fehler: Rollback durch Refetch
            await refetchYearly();
          }
        } else if (slot) {
          // NEW: Get class_id from slot instead of activeClassId
          // This allows creating lessons in "Alle Klassen" view
          const slotClassId = slot.class_id || activeClassId;

          if (!slotClassId) {
            console.error('Error: No class_id available for creating new lesson');
            alert('Bitte wählen Sie eine Klasse aus, bevor Sie eine neue Lektion erstellen.');
            return;
          }
          const subjectId = subjects.find(s => s.name === slot.subject && s.class_id === slotClassId)?.id;
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
            class_id: slotClassId // Use class from slot, not activeClassId
          };
          optimisticUpdate(newLesson, true);

          const gapPromises = [];

          try {
            const createdLesson = await YearlyLesson.create({
              ...slot,
              topic_id: activeTopicId,
              school_year: currentYear,
              name: 'Neue Lektion',
              description: '',
              user_id: pb.authStore.model.id,
              class_id: slotClassId, // Use class from slot, not activeClassId
              subject: subjectId, // ← Verwende ID
              notes: '',
              is_double_lesson: false,
              second_yearly_lesson_id: null,
              is_exam: false,
              is_half_class: false,
              is_allerlei: false,
              allerlei_subjects: []
            });
            optimisticUpdate(newLesson, false, true);
            optimisticUpdate({ ...createdLesson, lesson_number: Number(createdLesson.lesson_number) }, true);

            // Sync to weekly timetable if in fixed schedule mode
            let tempUpdatedPrev = [...allYearlyLessons, { ...createdLesson, lesson_number: Number(createdLesson.lesson_number) }];

            try {
              await syncYearlyLessonToWeekly(createdLesson, settings, subjects, tempUpdatedPrev);
            } catch (syncError) {
              console.warn('Failed to sync to weekly timetable:', syncError);
            }

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
                    optimisticUpdate(gapLesson, false, true);
                    optimisticUpdate(gapCreated, true);
                  }).catch(err => {
                    console.error("Error creating gap lesson:", err);
                    optimisticUpdate(gapLesson, false, true);
                  });

                  gapPromises.push(createPromise);
                }
              }
            }

            // setYearlyLessons(tempUpdatedPrev); // Removed - using optimistic updates and hook
            await Promise.all(gapPromises);
            // KEIN refetch - optimistic updates haben bereits aktualisiert
          } catch (error) {
            console.error("Error creating lesson:", error);
            optimisticUpdate(newLesson, false, true);
          }
        }
      } else {
        if (lesson && lesson.topic_id && ((lesson.mergedLessons && lesson.mergedLessons.length > 1) || lesson.is_double_lesson)) {
          let topicLessons = [];
          if (lesson.is_double_lesson && (!lesson.mergedLessons || lesson.mergedLessons.length <= 1)) {
            const secondLesson = allYearlyLessons.find(l => l.id === lesson.second_yearly_lesson_id);
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
          const fullLesson = allYearlyLessons.find(l => l.id === lesson.id);
          setEditingLesson(fullLesson);
          setNewLessonSlot(null);
        } else {
          // NEW: Get class_id from slot instead of activeClassId
          // This allows creating lessons in "Alle Klassen" view
          const slotClassId = slot.class_id || activeClassId;

          if (!slotClassId) {
            console.error('Error: No class_id available for creating new lesson');
            alert('Bitte wählen Sie eine Klasse aus, bevor Sie eine neue Lektion erstellen.');
            return;
          }
          setEditingLesson(null);
          setNewLessonSlot({
            ...slot,
            subject: subjects.find(s => s.name === slot.subject && s.class_id === slotClassId)?.id || slot.subject, // ← fallback auf ID
            school_year: currentYear,
            class_id: slotClassId // Use class from slot, not activeClassId
          });
        }
        setIsLessonModalOpen(true);
      }
    },
    [
      isAnyAssignMode,
      handleSelectLesson,
      toast,
      activeTopicId,
      currentYear,
      topicsById,
      allYearlyLessons,
      activeClassId,
      subjects,
      refetchYearly,
      optimisticUpdate,
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

    // Only create/link second lesson in FLEXIBLE mode (traditional two-lesson approach)
    // In FIXED mode with unified doubles, second_yearly_lesson_id should be null
    if (finalLessonData.is_double_lesson && settings?.scheduleType === 'flexible') {
      const nextLesson = allYearlyLessons.find(l => l.id === finalLessonData.second_yearly_lesson_id);
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
          optimisticUpdate(newSecondLesson, true);
        } else {
          finalLessonData.is_double_lesson = false;
          finalLessonData.second_yearly_lesson_id = null;
          console.warn('Invalid double lesson pairing; resetting flags');
        }
      }
    } else if (finalLessonData.is_double_lesson && settings?.scheduleType === 'fixed') {
      // FIXED mode with unified double: ensure second_yearly_lesson_id is null
      finalLessonData.second_yearly_lesson_id = null;
    }

    try {
      const { id, ...cleanLessonData } = finalLessonData;
      // Kein optimistic update hier - warten auf Server-Response

      let primaryId = originalLesson?.id;

      if (primaryId) {
        // Update bestehende Lektion
        // Remove secondSteps and second_name from cleanLessonData (these belong to the slave lesson)
        const { secondSteps, second_name, ...primaryLessonData } = cleanLessonData;

        const updatePayload = {
          ...primaryLessonData,
          steps: primaryLessonData.steps,
          subject: originalLesson.subject,
          class_id: originalLesson.class_id || activeClassId,
          user_id: originalLesson.user_id || pb.authStore.model?.id,
          name: primaryLessonData.name || originalLesson.name,
          school_year: originalLesson.school_year || currentYear
        };

        await YearlyLesson.update(primaryId, updatePayload);
        optimisticUpdate({ id: primaryId, ...updatePayload }, false);

        // Sync is_exam and is_half_class to all weekly Lessons with this yearly_lesson_id
        try {
          const linkedLessons = await Lesson.list({ yearly_lesson_id: primaryId });
          for (const weeklyLesson of linkedLessons) {
            await Lesson.update(weeklyLesson.id, {
              is_exam: updatePayload.is_exam || false,
              is_half_class: updatePayload.is_half_class || false
            });
          }
        } catch (syncFlagsError) {
          console.warn('Failed to sync is_exam/is_half_class to weekly lessons:', syncFlagsError);
        }

        // Sync updated lesson to weekly timetable if in fixed schedule mode
        try {
          // Important: spread originalLesson first, then updatePayload to ensure new values take precedence
          const updatedLesson = { ...originalLesson, ...updatePayload, id: primaryId };
          const updatedYearlyLessons = allYearlyLessons.map(yl =>
            yl.id === primaryId ? updatedLesson : yl
          );
          await syncYearlyLessonToWeekly(updatedLesson, settings, subjects, updatedYearlyLessons);
        } catch (syncError) {
          console.warn('Failed to sync updated lesson to weekly timetable:', syncError);
        }

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
          class_id: newLessonSlot?.class_id || activeClassId,
          user_id: pb.authStore.model.id,
          school_year: currentYear,
          week_number: newLessonSlot?.week_number || cleanLessonData.week_number,
          lesson_number: newLessonSlot?.lesson_number || cleanLessonData.lesson_number,
          topic_id: cleanLessonData.topic_id || null
        };

        const created = await YearlyLesson.create(createPayload);
        primaryId = created.id;
        optimisticUpdate({ ...created, lesson_number: Number(created.lesson_number) }, true);

        // Sync to weekly timetable if in fixed schedule mode
        try {
          const updatedYearlyLessons = [...allYearlyLessons, created];
          await syncYearlyLessonToWeekly(created, settings, subjects, updatedYearlyLessons);
        } catch (syncError) {
          console.warn('Failed to sync created lesson to weekly timetable:', syncError);
        }

      }

      // Only update second lesson in FLEXIBLE mode (traditional two-lesson approach)
      // In FIXED mode, there is no second lesson to update
      if (finalLessonData.is_double_lesson && finalLessonData.second_yearly_lesson_id && settings?.scheduleType === 'flexible') {
        const secondLesson = allYearlyLessons.find(l => l.id === finalLessonData.second_yearly_lesson_id);
        await YearlyLesson.update(finalLessonData.second_yearly_lesson_id, {
          steps: finalLessonData.secondSteps,
          is_double_lesson: false,     // ← false!
          second_yearly_lesson_id: null, // ← null!
          name: finalLessonData.second_name,
          topic_id: finalLessonData.topic_id || null,
          subject: secondLesson?.subject || originalLesson?.subject || newLessonSlot?.subject,
          class_id: secondLesson?.class_id || activeClassId,
          user_id: secondLesson?.user_id || pb.authStore.model?.id
        });
        optimisticUpdate({
          id: finalLessonData.second_yearly_lesson_id,
          steps: finalLessonData.secondSteps,
          is_double_lesson: false,     // ← false!
          second_yearly_lesson_id: null, // ← null!
          name: finalLessonData.second_name,
          topic_id: finalLessonData.topic_id || null
        }, false);

      }

      if (!finalLessonData.is_double_lesson && wasDoubleLesson && oldSecondYearlyId) {
        const primaryYL = allYearlyLessons.find(yl => yl.id === primaryId);
        const originalTopicId = primaryYL?.topic_id;

        await YearlyLesson.update(oldSecondYearlyId, { is_double_lesson: false, second_yearly_lesson_id: null, topic_id: originalTopicId });
        optimisticUpdate({ id: oldSecondYearlyId, is_double_lesson: false, second_yearly_lesson_id: null, topic_id: originalTopicId }, false);
        await YearlyLesson.update(primaryId, { is_double_lesson: false, second_yearly_lesson_id: null, topic_id: originalTopicId });
        optimisticUpdate({ id: primaryId, is_double_lesson: false, second_yearly_lesson_id: null, topic_id: originalTopicId }, false);

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

      // Invalidiere Query und warte auf Refetch um TopicLessonsModal zu aktualisieren
      await queryClientLocal.refetchQueries({
        queryKey: ['allYearlyLessons', userId, currentYear],
        type: 'active' // Nur aktive Queries neu laden
      });

      toast.success('Lektion erfolgreich gespeichert');
    } catch (error) {
      console.error("CRITICAL ERROR saving lesson:", error);
      if (originalLesson) {
        optimisticUpdate(originalLesson, false);
      }
      await refetchYearly(); // auch im Fehlerfall: zurück auf Server-Stand
      queryClientLocal.invalidateQueries(['timetableData']);
      toast.error('Fehler beim Speichern der Lektion: ' + (error.message || 'Unbekannter Fehler'));
    }
  }, [editingLesson, newLessonSlot, queryClientLocal, currentYear, allYearlyLessons, subjects, activeClassId, optimisticUpdate, refetchYearly]);

  const handleDeleteLesson = useCallback(async (lessonId) => {
    try {
      const lessonToDelete = allYearlyLessons.find(l => l.id === lessonId);
      if (lessonToDelete) {
        await YearlyLesson.delete(lessonId);
        optimisticUpdate({ id: lessonId }, false, true);
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
  }, [allYearlyLessons, optimisticUpdate]);

  const handleEditTopic = useCallback((topic) => {
    setEditingTopic(topic);
    setIsTopicModalOpen(true);
  }, []);

  const handleSaveTopic = useCallback(async (topicData) => {
    try {
      let savedTopic;
      if (editingTopic) {
        savedTopic = await Topic.update(editingTopic.id, topicData);
      } else {
        savedTopic = await Topic.create({
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
      // Invalidiere alle relevanten Queries
      queryClientLocal.invalidateQueries({ queryKey: ['topics'] });
      queryClientLocal.invalidateQueries({ queryKey: ['yearlyData', currentYear] });
      queryClientLocal.invalidateQueries({ queryKey: ['timetableData'] });
      // Aktualisiere lokalen State sofort
      if (savedTopic) {
        setTopics(prev => {
          const exists = prev.some(t => t.id === savedTopic.id);
          if (exists) {
            return prev.map(t => t.id === savedTopic.id ? savedTopic : t);
          }
          return [...prev, savedTopic];
        });
      }
    } catch (error) {
      console.error("Error saving topic:", error);
    }
  }, [editingTopic, activeSubjectName, activeClassId, currentYear, queryClientLocal]);

  const handleDeleteTopic = useCallback(async (topicId) => {
    try {
      const affectedLessons = allYearlyLessons.filter(l => l.topic_id === topicId);
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
      // Aktualisiere lokalen State sofort
      setTopics(prev => prev.filter(t => t.id !== topicId));
      // Invalidiere alle relevanten Queries
      queryClientLocal.invalidateQueries({ queryKey: ['topics'] });
      queryClientLocal.invalidateQueries({ queryKey: ['yearlyData', currentYear] });
      queryClientLocal.invalidateQueries({ queryKey: ['timetableData'] });
    } catch (error) {
      console.error("Error deleting topic:", error);
    }
  }, [allYearlyLessons, activeTopicId, queryClientLocal, currentYear]);

  const selectedSubject = useMemo(() => subjects.find(s => s.name === activeSubjectName), [subjects, activeSubjectName]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden transition-colors duration-300">
      {/* Header - gleiche Struktur wie TimetableHeader */}
      <div className="flex flex-col items-center p-4">
        {/* View Toggle Buttons */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex space-x-4 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg">
            {['Tag', 'Woche', 'Jahr'].map((view) => (
              <Button
                key={view}
                variant={currentView === view ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange(view)}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${currentView === view ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-inner' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md'}`}
              >
                {view}
              </Button>
            ))}
          </div>
        </div>

        {/* Navigation Section - gleicher Style wie TimetableHeader */}
        <div className="flex items-center space-x-4 my-4 p-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg">
          <Button variant="ghost" onClick={() => setCurrentYear(y => y - 1)} className="rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600">
            <ChevronsLeft />
          </Button>
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">
            {yearViewMode === 'school' ? 'Schuljahr' : 'Kalenderjahr'} {currentYear}/{currentYear + 1}
          </h2>
          <Button variant="ghost" onClick={() => setCurrentYear(y => y + 1)} className="rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600">
            <ChevronsRight />
          </Button>

          {/* Separater Icon-Button für Kalender/Schuljahr-Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setYearViewMode(prev => prev === 'calendar' ? 'school' : 'calendar')}
            className="ml-2 rounded-lg"
            title={yearViewMode === 'calendar' ? 'Zu Schuljahr wechseln' : 'Zu Kalenderjahr wechseln'}
          >
            {yearViewMode === 'school' ? <GraduationCap className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 pt-2 max-w-full min-w-0 yearly-main-grid">
        {/* Table Container */}
        <div className="h-full relative min-w-0 min-h-0">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 h-full w-full min-h-0"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
              </div>
            ) : (
              <>
                {isAnyAssignMode && (
                  <>
                    {/* Assign/Reassign Mode Header Banner */}
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
                          Klicke auf freie Lektionen oder leere Slots · {sharedLessonsLimit !== null
                            ? `${selectedLessons.length}/${sharedLessonsLimit} Lektionen`
                            : `${selectedLessons.length} ausgewaehlt`}
                        </p>
                        <Button
                          onClick={handleAssignAndBack}
                          size="lg"
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                          disabled={selectedLessons.length === 0 || (sharedLessonsLimit !== null && selectedLessons.length < sharedLessonsLimit)}
                        >
                          {selectedLessons.length === 0
                            ? 'Nichts ausgewaehlt'
                            : sharedLessonsLimit !== null && selectedLessons.length < sharedLessonsLimit
                              ? `Noch ${sharedLessonsLimit - selectedLessons.length} Lektionen waehlen`
                              : `Zuweisen & Zurueck (${selectedLessons.length})`
                          }
                        </Button>
                      </div>
                    </div>

                    {/* Floating Counter - sichtbar beim Scrollen */}
                    {selectedLessons.length > 0 && (
                      <div className={`fixed bottom-6 right-6 z-50 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-3 ${
                        sharedLessonsLimit !== null && selectedLessons.length === sharedLessonsLimit
                          ? 'bg-green-600'
                          : 'bg-blue-600 animate-pulse'
                      }`}>
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                          <span className="font-bold text-lg">
                            {sharedLessonsLimit !== null
                              ? `${selectedLessons.length}/${sharedLessonsLimit}`
                              : selectedLessons.length}
                          </span>
                        </div>
                        <span className="font-medium">
                          {sharedLessonsLimit !== null && selectedLessons.length === sharedLessonsLimit
                            ? 'Alle Lektionen verteilt'
                            : `Lektion${selectedLessons.length !== 1 ? 'en' : ''} ausgewaehlt`}
                        </span>
                      </div>
                    )}
                  </>
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
                    allYearlyLessons={allYearlyLessons}
                    densityMode={densityMode}
                    isAssignMode={isAnyAssignMode}
                    selectedLessons={selectedLessons}
                    onSelectLesson={handleSelectLesson}
                    classes={classes}
                    onSelectClass={setActiveClassId}
                    yearViewMode={yearViewMode}
                    schoolYearStartWeek={schoolYearStartWeek}
                    refetch={refetchYearly}
                    optimisticUpdateYearlyLessons={optimisticUpdate}
                    settings={settings}
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
        subjects={subjects}
        newLessonSlot={newLessonSlot}
        subjectColor={subjects.find(s => s.name === (newLessonSlot?.subject || editingLesson?.subject))?.color}
        allYearlyLessons={allYearlyLessons}
        currentWeek={editingLesson?.week_number || newLessonSlot?.week_number}
        currentYear={currentYear}
        settings={settings}
        onSaveAndNext={async (nextLessonNumber) => {
          const currentWeek = newLessonSlot?.week_number || editingLesson?.week_number;
          const currentSubjectId = newLessonSlot ? subjects.find(s => s.name === newLessonSlot.subject)?.id : editingLesson?.subject;

          if (!currentWeek || !currentSubjectId) {
            console.warn('Keine gültige Woche oder Fach-ID für nächste Lektion');
            return;
          }

          const nextLesson = allYearlyLessons.find(
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
          const subjectLessonsInWeek = allYearlyLessons.filter(
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
            const currentLesson = editingLesson || allYearlyLessons.find(l => l.id === newLessonSlot?.id);
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
            optimisticUpdate(createdLesson, true);

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
        subjectColor={subjects.find(s => s.id === selectedTopicInfo?.subject)?.color}
        allYearlyLessons={allYearlyLessons}
        onSaveLesson={handleSaveLesson}
        onDeleteLesson={handleDeleteLesson}
        topics={topics}
        currentYear={currentYear}
        autoAssignTopicId={selectedTopicInfo?.topic?.id} // Corrected: Pass topic ID directly
      />
    </div>
  );
}