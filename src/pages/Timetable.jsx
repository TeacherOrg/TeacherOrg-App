import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Lesson, YearlyLesson, Topic, Subject, Setting, Class, Holiday, AllerleiLesson } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { motion } from "framer-motion";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useDraggable } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import LessonCard from "../components/timetable/LessonCard";
import TimetableGrid from "../components/timetable/TimetableGrid";
import LessonModal from "../components/timetable/LessonModal";
import DailyView from "../pages/DailyView";
import CopyWeekLayout from "../components/timetable/CopyWeekLayout";
import CalendarLoader from "../components/ui/CalendarLoader";
import { createPageUrl } from '@/utils/index.js';
import { useNavigate } from "react-router-dom";
import debounce from 'lodash/debounce';
import OverlayView from "../components/timetable/OverlayView";
import { adjustColor } from '@/utils/colorUtils';
import { useLessonStore } from '@/store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import pb from '@/api/pb';
import { calculateAllerleiGradient } from '@/components/timetable/allerlei/AllerleiUtils';
import { findFreeSlot, findAlternativeSlot } from '@/utils/slotUtils';
import TimetableHeader from '../components/timetable/TimetableHeader';
import TimetablePool from '../components/timetable/TimetablePool';
import TimetableOverlays from '../components/timetable/TimetableOverlays';
import useTimetableData from '../hooks/useTimetableData';
import useTimetableStates from '../hooks/useTimetableStates';
import useDragAndDrop from '../hooks/useDragAndDrop';
import useLessonHandlers from '../hooks/useLessonHandlers';
import { getCurrentWeek, getWeekInfo, generateTimeSlots } from '../utils/timetableUtils';
import { isEqual } from 'lodash';
import { createMixedSubjectGradient } from '@/utils/colorUtils';
import useAllYearlyLessons from '@/hooks/useAllYearlyLessons';


const ACADEMIC_WEEKS = 52;

export default function TimetablePage() {
  return <InnerTimetablePage />;
}

function InnerTimetablePage() {
  const navigate = useNavigate();
  const allLessons = useLessonStore((state) => state.allLessons);
  const allerleiLessons = useLessonStore((state) => state.allerleiLessons);
  const {
    setAllLessons,
    setAllYearlyLessons,
    setAllerleiLessons,
    optimisticUpdateAllLessons,
    optimisticUpdateYearlyLessons,
    optimisticUpdateAllerleiLessons,
    addAllLesson,
    addAllerleiLesson,
    removeAllLesson,
    removeAllerleiLesson
  } = useLessonStore();

  // formData hier definieren – VOR allen Hooks, die es benutzen!
  const [formData, setFormData] = useState({});

  // Neu: States für Merge-Preview
  const [mergePreview, setMergePreview] = useState(null); // { day, startPeriod, endPeriod, lessons }
  const [isSelectingMerge, setIsSelectingMerge] = useState(false);

  // Neu: State für Alt-Key
  const [isAltPressed, setIsAltPressed] = useState(false);

  // Neu: State für Pool-Refresh
  const [poolRefreshKey, setPoolRefreshKey] = useState(0);

  // Initialize currentYear and currentWeek
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Call useTimetableData with currentYear and currentWeek
  const { data, isLoading: queryLoading, classes, subjects, settings, holidays, topics, refetch, activeClassId, setActiveClassId } = useTimetableData(currentYear, currentWeek);

  const { allYearlyLessons } = useAllYearlyLessons(currentYear);

  // Debug: Check if allYearlyLessons is loaded
  useEffect(() => {
    console.log('allYearlyLessons loaded:', allYearlyLessons?.length || 0);
  }, [allYearlyLessons]);
  
  const memoizedSubjects = useMemo(() => subjects || [], [subjects]);
  const memoizedTopics = useMemo(() => topics || [], [topics]);

  // Call useTimetableStates with settings, currentYear, and currentWeek
  const { currentView, setCurrentView, viewMode, setViewMode, currentDate, setCurrentDate, renderKey, setRenderKey, isModalOpen, setIsModalOpen, editingLesson, setEditingLesson, slotInfo, setSlotInfo, initialSubjectForModal, setInitialSubjectForModal, isCopying, setIsCopying, copiedLesson, setCopiedLesson, activeDragId, setActiveDragId, hoverLesson, setHoverLesson, hoverPosition, setHoverPosition, disableHover, setDisableHover, overlayRef, handleShowHover, handleHideHover, timeSlots, weekInfo, autoFit, setAutoFit } = useTimetableStates(settings || {}, currentYear, currentWeek);

  const queryClientLocal = useQueryClient();

  const stableAllLessons = useMemo(() => 
    Array.isArray(allLessons) ? allLessons : [], 
    [allLessons]
  );

  const lessonsForCurrentWeek = useMemo(() => {
    console.log('Debug: Computing lessonsForCurrentWeek', {
      allLessonsLength: stableAllLessons.length,
      allerleiLessonsLength: allerleiLessons.length,
      currentWeek,
    });
    return [...stableAllLessons, ...allerleiLessons].filter(l => l.week_number === currentWeek);
  }, [stableAllLessons, allerleiLessons, currentWeek]);

  useEffect(() => {
    console.log('Debug: lessonsForCurrentWeek changed', {
      lessonsForCurrentWeekLength: lessonsForCurrentWeek.length,
      allLessonsLength: allLessons.length,
      allerleiLessonsLength: allerleiLessons.length,
      currentWeek,
    });
  }, [lessonsForCurrentWeek, allLessons, allerleiLessons, currentWeek]);

  // Call useLessonHandlers first
  const { 
    handleSaveLesson, 
    handleDeleteLesson, 
    reassignYearlyLessonLinks, 
    updateYearlyLessonOrder, 
    handleCreateFromPool 
  } = useLessonHandlers(
    editingLesson,
    currentYear,
    allLessons,
    allYearlyLessons,
    timeSlots,
    currentWeek,
    queryClientLocal,
    subjects,
    optimisticUpdateAllLessons,
    optimisticUpdateYearlyLessons,
    addAllerleiLesson,
    removeAllLesson,
    setAllLessons,
    setAllYearlyLessons,
    activeClassId,
    refetch,
    setIsModalOpen,
    setEditingLesson,              // Neu: Für Reset nach Save/Unlink
    setInitialSubjectForModal,     // Neu: Falls verwendet, für Initial-Subject-Reset
    setCopiedLesson                // Neu: Für Copy-Reset
  );

  // Then call useDragAndDrop, passing reassignYearlyLessonLinks and updateYearlyLessonOrder
  const { sensors, handleDragStart, handleDragEnd: handleDragEndFromHook } = useDragAndDrop(
    lessonsForCurrentWeek,
    allLessons,
    allerleiLessons,
    currentWeek,
    allYearlyLessons,
    timeSlots,
    currentYear,
    queryClientLocal,
    subjects,
    activeClassId,
    optimisticUpdateAllLessons,
    optimisticUpdateYearlyLessons,
    optimisticUpdateAllerleiLessons,
    reassignYearlyLessonLinks,
    updateYearlyLessonOrder,
    setAllLessons,
    setAllYearlyLessons,
    setAllerleiLessons,
    refetch,
    setActiveDragId
  );

  const [lessonsWithDetails, setLessonsWithDetails] = useState([]);

  useEffect(() => {
    const computeLessonsWithDetails = () => {
      console.log('Debug: computeLessonsWithDetails running', {
        normalLessons: stableAllLessons.filter(l => l.week_number === currentWeek).length,
        allerleiLessons: allerleiLessons.filter(l => l.week_number === currentWeek).length,
        yearlyLessons: allYearlyLessons.length,
        memoizedTopics: memoizedTopics.length,
        memoizedSubjects: memoizedSubjects.length,
      });

      // 1. NUR normale Lektionen (collectionName !== 'allerlei_lessons') verarbeiten
      const normalLessons = stableAllLessons.filter(l => l.week_number === currentWeek);

      const resolvedNormalLessons = normalLessons.map((lesson) => {
        const subjectsById = new Map(memoizedSubjects.map(s => [s.id, s]));
        const yearlyLessonsById = new Map(allYearlyLessons.map(yl => [yl.id, yl]));
        const topicsById = new Map(memoizedTopics.map(t => [t.id, t]));
        const subjectsByName = memoizedSubjects.reduce((acc, s) => {
          acc[s.name] = s;
          return acc;
        }, {});

        const subjectDetail = subjectsById.get(lesson.subject);
        const primaryYearlyLesson = lesson.yearly_lesson_id
          ? yearlyLessonsById.get(lesson.yearly_lesson_id)
          : null;
        const secondYearlyLesson = lesson.second_yearly_lesson_id
          ? yearlyLessonsById.get(lesson.second_yearly_lesson_id)
          : null;

        const resolveTopic = (value) => {
          if (!value) return null;
          if (topicsById.has(value)) return topicsById.get(value);
          const byTitle = memoizedTopics.find(t =>
            t.id === value ||
            t.title === value ||
            (typeof t.title === 'string' && typeof value === 'string' && t.title.toLowerCase() === value.toLowerCase())
          );
          if (byTitle) return byTitle;
          const byTopicName = memoizedTopics.find(t =>
            (t.title && primaryYearlyLesson && typeof primaryYearlyLesson.topic_id === 'string' && t.title.toLowerCase() === String(primaryYearlyLesson.topic_id).toLowerCase())
          );
          if (byTopicName) return byTopicName;
          return null;
        };

        const topic = resolveTopic(lesson.topic_id) || resolveTopic(primaryYearlyLesson?.topic_id) || null;

        let lessonDetails = {
          ...lesson,
          subject: lesson.subject,
          subject_name: lesson.subject_name || subjectDetail?.name || 'Unbekannt',
          color: subjectDetail?.color || '#3b82f6',
          topic: topic,
          isGradient: false,
          primaryYearlyLesson: primaryYearlyLesson,
          secondYearlyLesson: secondYearlyLesson,
        };

        // Normale Lektionen (keine Allerlei)
        let lessonSteps = lesson.is_allerlei
          ? lesson.steps || []
          : primaryYearlyLesson?.steps || [];

        if (lesson.is_double_lesson && secondYearlyLesson) {
          lessonSteps = [...(primaryYearlyLesson?.steps || []), ...(secondYearlyLesson?.steps || [])];
          lessonDetails.steps = lessonSteps;
          const pNotes = primaryYearlyLesson?.notes || '';
          const sNotes = secondYearlyLesson?.notes || '';
          if (pNotes && sNotes) {
            lessonDetails.description = `${pNotes} + ${sNotes}`;
          } else {
            lessonDetails.description = pNotes || sNotes || 'Doppellektion';
          }
        } else if (primaryYearlyLesson) {
          lessonDetails.description =
            lesson.description || `Lektion ${primaryYearlyLesson.lesson_number}`;
          lessonDetails.steps = lessonSteps;
        }

        // Falls es doch eine alte Allerlei-Lektion ohne collectionName ist (sicherheitshalber)
        if (lesson.is_allerlei && !lesson.collectionName?.startsWith('allerlei')) {
          if (!lesson.description) {
            lessonDetails.description = `Allerlei: ${(lesson.allerlei_subjects || []).join(', ')}`;
          }
          const allSubjectsForGradient = [
            ...new Set([subjectDetail?.name || 'Unbekannt', ...(lesson.allerlei_subjects || [])]),
          ];
          const colors = allSubjectsForGradient
            .map(name => subjectsByName[name]?.color)
            .filter(Boolean);
          if (colors.length > 1) {
            const sortedColors = [...colors].sort();
            const gradientParts = sortedColors.map((color, index) => {
              const angle = (index * 360) / sortedColors.length;
              const x = 50 + Math.cos((angle * Math.PI) / 180) * 30;
              const y = 50 + Math.sin((angle * Math.PI) / 180) * 30;
              return `radial-gradient(circle at ${x}% ${y}%, ${color} 0%, ${color}80 40%, transparent 70%)`;
            });
            const baseGradient = `linear-gradient(45deg, ${sortedColors[0]}40, ${sortedColors[sortedColors.length - 1]}40)`;
            lessonDetails.color = [baseGradient, ...gradientParts].join(', ');
            lessonDetails.isGradient = true;
          }
        }

        return lessonDetails;
      });

      // 2. Allerlei-Lektionen verarbeiten – immer, egal was kommt
      const normalizedAllerleiLessons = allerleiLessons
        .filter(l => l.week_number === currentWeek)
        .map(l => {
          // Kein normalize mehr nötig – direkt normalisieren
          const colors = (l.allerlei_subjects || [])
            .map(name => memoizedSubjects.find(s => s.name === name)?.color)
            .filter(Boolean);

          // NEU: Alle Steps aus allen beteiligten YearlyLessons sammeln
          const allSteps = [];

          // Falls steps bereits im Record vorhanden sind (aus Modal gespeichert) → Primary Steps
          if (l.steps && l.steps.length > 0) {
            allSteps.push(...l.steps); // gespeicherte haben Vorrang für Primary
          } else {
            // Primary aus YL
            if (l.expand?.primary_yearly_lesson_id) {
              allSteps.push(...(l.expand.primary_yearly_lesson_id.steps || []));
            } else if (l.primary_yearly_lesson_id) {
              const primaryYL = allYearlyLessons.find(yl => yl.id === l.primary_yearly_lesson_id);
              allSteps.push(...(primaryYL?.steps || []));
            }
          }

          // Added immer aus YLs
          if (l.expand?.added_yearly_lesson_ids) {
            l.expand.added_yearly_lesson_ids.forEach(yl => {
              allSteps.push(...(yl.steps || []));
            });
          } else if (Array.isArray(l.added_yearly_lesson_ids)) {
            l.added_yearly_lesson_ids.forEach(id => {
              const yl = allYearlyLessons.find(yl => yl.id === id);
              if (yl) allSteps.push(...(yl.steps || []));
            });
          }

          return {
            ...l,
            color: colors.length > 0 ? createMixedSubjectGradient(colors) : '#94a3b8',
            isGradient: colors.length > 1,
            subject_name: 'Allerlei',
            description: `Allerlei: ${(l.allerlei_subjects || []).join(' + ')}`,
            steps: allSteps,
          };
        });
      // 3. Zusammenführen
      const finalLessons = [...resolvedNormalLessons, ...normalizedAllerleiLessons];

      setLessonsWithDetails(prev => isEqual(prev, finalLessons) ? prev : finalLessons);
    };

    computeLessonsWithDetails();
  }, [
    allLessons,           // ← statt stableAllLessons
    allerleiLessons,      // ← statt stableAllerleiLessons
    currentWeek,
    allYearlyLessons,
    memoizedTopics,
    memoizedSubjects
  ]);

  const availableYearlyLessonsForPool = useMemo(() => {
    if (!activeClassId) {
      console.log('Debug: No activeClassId, returning empty pool');
      return [];
    }

    console.log('Pool recompute – allerleiLessons:', allerleiLessons.map(al => ({
      id: al.id,
      primary: al.primary_yearly_lesson_id,
      added: al.added_yearly_lesson_ids
    })));

    const subjectsForClass = subjects.filter(s => s.class_id === activeClassId);
    const uniqueSubjectsForClass = [...new Map(subjectsForClass.map(s => [s.name, s])).values()];
    const scheduledLessonsInWeek = lessonsForCurrentWeek;
    const scheduledCounts = lessonsForCurrentWeek.reduce((acc, lesson) => {
      // Normale Lektionen (nicht Allerlei)
      if (lesson.collectionName !== 'allerlei_lessons') {
        const isSecondary = lessonsForCurrentWeek.some(primary =>
          primary.is_double_lesson &&
          primary.second_yearly_lesson_id === lesson.yearly_lesson_id &&
          primary.day_of_week === lesson.day_of_week &&
          primary.week_number === lesson.week_number &&
          primary.period_slot === lesson.period_slot - 1
        );
        if (isSecondary) return acc;

        let lessonValue = lesson.is_double_lesson ? 2 : lesson.is_half_class ? 0.5 : 1;
        const subjectName = lesson.expand?.subject?.name || lesson.subject_name || 'Unbekannt';
        if (subjectName !== 'Unbekannt') {
          acc[subjectName] = (acc[subjectName] || 0) + lessonValue;
        }
        return acc;
      }

      // === NEU: Allerlei-Lektionen mitzählen ===
      const primaryId = lesson.primary_yearly_lesson_id;
      const addedIds = Array.isArray(lesson.added_yearly_lesson_ids) ? lesson.added_yearly_lesson_ids : [];

      [...(primaryId ? [primaryId] : []), ...addedIds].forEach(ylId => {
        let yl = allYearlyLessons.find(y => y.id === ylId);
        if (!yl && lesson.expand) {
          yl = lesson.expand.primary_yearly_lesson_id || 
               lesson.expand.added_yearly_lesson_ids?.find(y => y.id === ylId);
        }
        if (yl) {
          const subjectName = yl.expand?.subject?.name || yl.subject_name || subjects.find(s => s.id === yl.subject)?.name || 'Unbekannt';
          if (subjectName !== 'Unbekannt') {
            const value = yl.is_half_class ? 0.5 : 1;
            acc[subjectName] = (acc[subjectName] || 0) + value;
          }
        }
      });

      return acc;
    }, {});
    const result = uniqueSubjectsForClass.map(subject => {
      const totalScheduled = scheduledCounts[subject.name] || 0;
      const subjectLessons = scheduledLessonsInWeek.filter(l => 
        (l.expand?.subject?.name === subject.name || l.subject_name === subject.name) && 
        l.week_number === currentWeek && 
        !l.is_hidden
      );
      const availableLessons = allYearlyLessons
        .filter(yl => {
          const matchesSubject = yl.subject_name === subject.name || yl.expand?.subject?.name === subject.name;
          const matchesWeek = yl.week_number === currentWeek;
          const lessonCount = subjectLessons.filter(l => 
            (l.yearly_lesson_id === yl.id || l.second_yearly_lesson_id === yl.id) && 
            !l.is_hidden &&
            (l.collectionName !== 'allerlei_lessons' || 
            l.primary_yearly_lesson_id === yl.id || 
            (Array.isArray(l.added_yearly_lesson_ids) && l.added_yearly_lesson_ids.includes(yl.id)))
          ).length;
          const isNotAllerlei = !yl.is_allerlei;
          const isPlannedInAllerlei = allerleiLessons.some(al => 
            al.week_number === currentWeek &&
            (al.primary_yearly_lesson_id === yl.id || 
             (Array.isArray(al.added_yearly_lesson_ids) && al.added_yearly_lesson_ids.includes(yl.id)))
          );
          const isPlannedAsSlave = scheduledLessonsInWeek.some(l => 
            l.second_yearly_lesson_id === yl.id && 
            !l.is_hidden
          );
          return matchesSubject && matchesWeek && isNotAllerlei && lessonCount < (yl.is_half_class ? 2 : 1) && !isPlannedInAllerlei && !isPlannedAsSlave;
        })
        .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
      console.log('Debug: Subject data for pool:', {
        subject: subject.name,
        totalScheduled,
        lessonsPerWeek: subject.lessons_per_week || 4,
        availableLessonsCount: availableLessons.length,
        subjectLessonsCount: subjectLessons.length
      });
      return {
        subject,
        totalScheduled,
        lessonsPerWeek: subject.lessons_per_week || 4,
        availableLessons,
        lessons: subjectLessons // Ensure lessons is always an array
      };
    });
    return result;
  }, [subjects, activeClassId, allLessons, allerleiLessons, allYearlyLessons, currentWeek, poolRefreshKey]);

  const handleCreateLesson = (dayOfWeek, periodSlot, subject = null) => {
    setSlotInfo({ day: dayOfWeek, period: periodSlot, week: currentWeek });
    setInitialSubjectForModal(subject);
    setEditingLesson(null);
    setIsModalOpen(true);
  };

  const handleEditLesson = (lessonId) => {
    // Finde die aktuelle Version der Lektion aus lessonsWithDetails
    const currentLesson = lessonsWithDetails.find(l => l.id === lessonId);
    
    if (!currentLesson) {
      console.warn('Lesson not found for editing:', lessonId);
      return;
    }

    setEditingLesson(currentLesson);
    setInitialSubjectForModal(null);
    setSlotInfo({ 
      day: currentLesson.day_of_week, 
      period: currentLesson.period_slot, 
      week: currentWeek 
    });
    setIsModalOpen(true);
  };

  const handleDuplicateLesson = (lessonData) => {
    const lessonToCopy = lessonsWithDetails.find(l => l.id === lessonData.id);
    if (!lessonToCopy) return;
    setCopiedLesson({
      ...lessonToCopy,
      day_of_week: null,
      period_slot: null,
      id: null,
      yearly_lesson_id: null,
      allerlei_yearly_lesson_ids: [],
      second_yearly_lesson_id: null,
    });
    setIsModalOpen(false);
  };

  const gridRef = useRef(null);

  const renderDragOverlay = (id) => {
    if (id.startsWith('pool-')) {
      const subjectId = id.replace('pool-', '');
      const subjectData = availableYearlyLessonsForPool.find(s => String(s.subject.id) === subjectId);
      if (!subjectData) return null;

      return (
        <div 
          className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-2xl border border-slate-300 dark:border-slate-600"
          style={{ zIndex: 9999 }}
        >
          <div className="font-bold text-lg">
            {subjectData.subject.name}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            ({subjectData.totalScheduled}/{subjectData.lessonsPerWeek} geplant)
          </div>
        </div>
      );
    }

    // Normale Lektion
    const lesson = lessonsWithDetails.find(l => l.id === id);
    if (!lesson) return null;

    return (
      <div 
        className="opacity-90 scale-105"
        style={{ zIndex: 9999 }}
      >
        <LessonCard lesson={lesson} isDragging={true} />
      </div>
    );
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    if (view === 'Woche') {
      setViewMode('week');
    } else if (view === 'Jahr') {
      navigate(createPageUrl('YearlyOverview'));
      return;
    } else {
      setViewMode('day');
    }
  };

  const handlePrevWeek = () => {
    setCurrentWeek(prev => {
      if (prev > 1) {
        return prev - 1;
      } else {
        setCurrentYear(year => year - 1);
        return ACADEMIC_WEEKS;
      }
    });
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => {
      if (prev < ACADEMIC_WEEKS) {
        return prev + 1;
      } else {
        setCurrentYear(year => year + 1);
        return 1;
      }
    });
  };

  const handlePrevDay = () => {
    const prevDay = new Date(currentDate);
    prevDay.setDate(currentDate.getDate() - 1);
    setCurrentDate(prevDay);
  };

  const handleNextDay = () => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(currentDate.getDate() + 1);
    setCurrentDate(nextDay);
  };

  useEffect(() => {
    const handleSettingsChanged = () => {
      refetch(); // Lädt neue settings (inkl. cellWidth, cellHeight, autoFit)
      setRenderKey(Date.now()); // Optional: Force-Re-Render der Grid, falls nötig
    };

    window.addEventListener('settings-changed', handleSettingsChanged);
    return () => window.removeEventListener('settings-changed', handleSettingsChanged);
  }, [refetch, setRenderKey]);

  // Neu: Key-Handler für Alt-Key
  useEffect(() => {
    const handleKeyDown = (e) => e.altKey && setIsAltPressed(true);
    const handleKeyUp = () => setIsAltPressed(false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Neu: Pointer Handler für Alt+Drag direkt im Grid
  const handleGridPointerDown = useCallback((e) => {
    if (!e.altKey) return;
    e.preventDefault();
    e.stopPropagation(); // ← zusätzlich hier

    const cell = e.target.closest('[data-day][data-period]');
    if (!cell) return;

    const day = cell.dataset.day;
    const period = parseInt(cell.dataset.period, 10);
    const lesson = lessonsWithDetails.find(l => 
      l.day_of_week === day && 
      l.period_slot === period &&
      !l.double_master_id &&
      l.collectionName !== 'allerlei_lessons'
    );

    if (!lesson) return;

    setIsSelectingMerge(true);
    setMergePreview({
      day,
      startPeriod: period,
      lessons: [lesson]
    });
  }, [lessonsWithDetails]);

  const handleGridPointerMove = useCallback((e) => {
    if (!isSelectingMerge || !mergePreview) return;

    const cell = e.target.closest('[data-day][data-period]');
    if (!cell) return;

    const day = cell.dataset.day;
    const period = parseInt(cell.dataset.period, 10);

    if (day !== mergePreview.day) return;

    const minPeriod = Math.min(mergePreview.startPeriod, period);
    const maxPeriod = Math.max(mergePreview.startPeriod, period);

    const lessonsInRange = lessonsWithDetails.filter(l => {
      if (l.day_of_week !== day) return false;
      if (l.collectionName === 'allerlei_lessons') return false;
      if (l.double_master_id) return false; // Slave ignorieren

      const start = l.period_slot;
      const end = start + (l.period_span || (l.is_double_lesson ? 2 : 1)) - 1;
      return start <= maxPeriod && end >= minPeriod;
    });

    // Nur Lektionen die wirklich im sichtbaren Block liegen
    const validLessons = lessonsInRange.filter(l => 
      l.period_slot >= minPeriod && 
      l.period_slot <= maxPeriod
    );

    if (validLessons.length === 0) return;

    setMergePreview({
      day,
      startPeriod: Math.min(...validLessons.map(l => l.period_slot)),
      lessons: validLessons,
    });
  }, [isSelectingMerge, mergePreview, lessonsWithDetails]);

  const handleGridPointerUp = useCallback(async () => {
    if (!isSelectingMerge || !mergePreview || mergePreview.lessons.length < 2) {
      setMergePreview(null);
      setIsSelectingMerge(false);
      return;
    }

    const lessonsToMerge = mergePreview.lessons.sort((a, b) => a.period_slot - b.period_slot);
    const startPeriod = Math.min(...lessonsToMerge.map(l => l.period_slot));
    const day = mergePreview.day;

    try {
    // 1. Beim Merge: ALLE beteiligten normalen Lektionen löschen
    const lessonIdsToDelete = lessonsToMerge.map(l => l.id);

    for (const id of lessonIdsToDelete) {
      await Lesson.delete(id);
    }

    // 2. Neue Allerlei-Lektion erstellen
    // --- NEU: Primäre Lektion ist immer die oberste im Block ---
    const lessonsToMergeSorted = lessonsToMerge.sort((a, b) => a.period_slot - b.period_slot);
    const primaryLesson = lessonsToMergeSorted[0];  // Die mit dem kleinsten period_slot

    let primaryYearlyId = primaryLesson.yearly_lesson_id || primaryLesson.second_yearly_lesson_id;

    if (!primaryYearlyId) {
      throw new Error('Die oberste Lektion im Block hat keine gültige YearlyLesson-ID.');
    }

    // Sicherstellen, dass die Primary nicht als "added" auftaucht
    const addedYearlyIds = lessonsToMergeSorted
      .slice(1)  // Alle außer der ersten
      .map(l => l.yearly_lesson_id || l.second_yearly_lesson_id)
      .filter(Boolean);

    const uniqueSubjectNames = [...new Set(lessonsToMerge.map(l => l.subject_name))];

    const newAllerleiData = {
      primary_yearly_lesson_id: primaryYearlyId,
      added_yearly_lesson_ids: addedYearlyIds,
      day_of_week: day,
      period_slot: startPeriod,
      period_span: lessonsToMerge.length,
      week_number: currentWeek,
      school_year: currentYear,
      class_id: activeClassId,
      user_id: pb.authStore.model?.id,
      subject_name: 'Allerlei',
      allerlei_subjects: uniqueSubjectNames, // ← NEU
      description: `Allerlei: ${uniqueSubjectNames.join(' + ')}`,
      steps: primaryLesson.steps || [],
    };
    let createdWithExpand;
    let finalAllerleiLesson;
    try {
      // 1. Erstelle OHNE expand
      const created = await AllerleiLesson.create(newAllerleiData);

      // 2. Lade SOFORT mit expand nach – das funktioniert IMMER bei deinen Entities
      createdWithExpand = await pb.collection('allerlei_lessons').getOne(created.id, {
        expand: 'primary_yearly_lesson_id,added_yearly_lesson_ids,primary_yearly_lesson_id.subject,added_yearly_lesson_ids.subject'
      });

      // Erstelle finale Allerlei-Lektion direkt
      finalAllerleiLesson = {
        ...created,
        expand: createdWithExpand.expand, // für Steps
        primary_yearly_lesson_id: newAllerleiData.primary_yearly_lesson_id, // ← HINZUFÜGEN
        added_yearly_lesson_ids: newAllerleiData.added_yearly_lesson_ids,     // ← HINZUFÜGEN
        allerlei_subjects: uniqueSubjectNames,
        color: calculateAllerleiGradient(uniqueSubjectNames, memoizedSubjects),
        isGradient: uniqueSubjectNames.length > 1,
        subject_name: 'Allerlei',
        description: `Allerlei: ${uniqueSubjectNames.join(' + ')}`,
        period_span: lessonsToMerge.length,
      };

    } catch (err) {
      console.error('Allerlei merge failed:', err);
      import('react-hot-toast').then(m => m.toast.error('Fehler beim Erstellen der Allerleilektion'));
      setMergePreview(null);
      setIsSelectingMerge(false);
      return;
    }

    useLessonStore.setState((state) => {
      const currentAllLessons = Array.isArray(state.allLessons) ? state.allLessons : [];
      const currentAllerleiLessons = Array.isArray(state.allerleiLessons) ? state.allerleiLessons : [];

      const newAllLessons = currentAllLessons.filter(l => !lessonIdsToDelete.includes(l.id));

      const newAllerleiLessons = currentAllerleiLessons
        .filter(l => !(l.day_of_week === day && l.period_slot === startPeriod && l.week_number === currentWeek))
        .concat(finalAllerleiLesson); // ← jetzt mit expand + schöner Gradient!

      return { allLessons: newAllLessons, allerleiLessons: newAllerleiLessons };
    });

    // DEBUG
    console.log('Nach Merge – allerleiLessons im Store:', useLessonStore.getState().allerleiLessons);

    // Danach: Pool refresh trigger + Rendern forcieren + Toast
    setPoolRefreshKey(prev => prev + 1); // ← Das ist der entscheidende Trigger
    setRenderKey(Date.now());
    import('react-hot-toast').then(m => m.toast.success('Allerlei erstellt!'));

  } catch (error) {
    console.error('Merge fehlgeschlagen:', error);
    import('react-hot-toast').then(m => m.toast.error('Fehler beim Mergen'));
  } finally {
    setMergePreview(null);
    setIsSelectingMerge(false);
  }
  }, [
    isSelectingMerge,
    mergePreview,
    currentWeek,
    currentYear,
    activeClassId,
    subjects,
  ]);

  return (
    <div className="timetable-page-container flex flex-col h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">
      <div className="timetable-header-container">
        <TimetableHeader
          currentView={currentView}
          setCurrentView={setCurrentView}
          handleViewChange={handleViewChange}
          currentWeek={currentWeek}
          setCurrentWeek={setCurrentWeek}
          currentYear={currentYear}
          setCurrentYear={setCurrentYear}
          weekInfo={weekInfo}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          handlePrevWeek={handlePrevWeek}
          handleNextWeek={handleNextWeek}
          handlePrevDay={handlePrevDay}
          handleNextDay={handleNextDay}
        />
      </div>

      {queryLoading || !settings ? (
        <CalendarLoader />
      ) : viewMode === 'week' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEndFromHook}
          modifiers={[restrictToWindowEdges]}
        >
          <div className="timetable-content flex-grow flex overflow-hidden p-4 gap-4"
            onPointerDown={handleGridPointerDown}
            onPointerMove={handleGridPointerMove}
            onPointerUp={handleGridPointerUp}
            onPointerLeave={() => setIsSelectingMerge(false)}
            style={{ 
              cursor: isSelectingMerge 
                ? 'ns-resize' 
                : isAltPressed 
                  ? 'crosshair' 
                  : 'default' 
            }}
          >
            <motion.div
              key={renderKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="timetable-grid-wrapper rounded-2xl overflow-hidden"
              style={{ maxWidth: 'fit-content' }}
            >
              <TimetableGrid
                ref={gridRef}
                timeSlots={timeSlots}
                lessons={lessonsWithDetails}
                onCreateLesson={handleCreateLesson}
                onEditLesson={handleEditLesson}
                onDeleteLesson={handleDeleteLesson}
                holidays={holidays}
                weekInfo={weekInfo}
                onShowHover={handleShowHover}
                onHideHover={handleHideHover}
                subjects={subjects}
                mergePreview={mergePreview}
                isSelectingMerge={isSelectingMerge}
              />
            </motion.div>
            <TimetablePool
              classes={classes}
              activeClassId={activeClassId}
              setActiveClassId={setActiveClassId}
              availableYearlyLessonsForPool={availableYearlyLessonsForPool}
              subjects={subjects}
            />
          </div>
          <DragOverlay>
            {activeDragId && renderDragOverlay(activeDragId)}
          </DragOverlay>
        </DndContext>
      ) : (
        <DailyView
          currentDate={currentDate}
          lessons={lessonsWithDetails}
          timeSlots={timeSlots}
          onEditLesson={handleEditLesson}
          onDeleteLesson={handleDeleteLesson}
          holidays={holidays}
        />
      )}

      <TimetableOverlays
        hoverLesson={hoverLesson}
        hoverPosition={hoverPosition}
        disableHover={disableHover}
        activeDragId={activeDragId}
        lessonsWithDetails={lessonsWithDetails}
        renderDragOverlay={renderDragOverlay}
        overlayRef={overlayRef}
      />

      <LessonModal
        key={editingLesson?.id || 'new'}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setInitialSubjectForModal(null); setCopiedLesson(null); }}
        onSave={handleSaveLesson}
        onDelete={handleDeleteLesson}
        onDuplicate={handleDuplicateLesson}
        lesson={editingLesson}
        copiedLesson={copiedLesson}
        slotInfo={slotInfo}
        currentWeek={currentWeek}
        allLessons={Array.isArray(allLessons) ? allLessons : []}
        allYearlyLessons={allYearlyLessons}
        timeSlots={timeSlots}
        subjectColor={subjects.find(s => s.id === (editingLesson?.subject || initialSubjectForModal))?.color}
        initialSubject={initialSubjectForModal}
        subjects={subjects}
        topics={topics}
        activeClassId={activeClassId}
        setEditingLesson={setEditingLesson}
        setIsModalOpen={setIsModalOpen}
        currentYear={currentYear}
        formData={formData} // DIESE ZEILE HINZUFÜGEN
      />
    </div>
  );
}