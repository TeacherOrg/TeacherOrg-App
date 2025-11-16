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
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import pb from '@/api/pb';
import { normalizeAllerleiData, calculateAllerleiGradient } from '@/components/timetable/allerlei/AllerleiUtils';
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

const ACADEMIC_WEEKS = 52;
const queryClient = new QueryClient();

export default function TimetablePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <InnerTimetablePage />
    </QueryClientProvider>
  );
}

function InnerTimetablePage() {
  const navigate = useNavigate();
  const allLessons = useLessonStore((state) => state.allLessons);
  const yearlyLessons = useLessonStore((state) => state.yearlyLessons);
  const allerleiLessons = useLessonStore((state) => state.allerleiLessons);
  const {
    setAllLessons,
    setYearlyLessons,
    setAllerleiLessons,
    optimisticUpdateAllLessons,
    optimisticUpdateYearlyLessons,
    optimisticUpdateAllerleiLessons,
    addAllLesson,
    addAllerleiLesson,
    removeAllLesson,
    removeAllerleiLesson
  } = useLessonStore();

  // Initialize currentYear and currentWeek in the component
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Call useTimetableData with currentYear and currentWeek
  const { data, isLoading: queryLoading, classes, subjects, settings, holidays, topics, refetch, activeClassId, setActiveClassId } = useTimetableData(currentYear, currentWeek);
  
  const memoizedSubjects = useMemo(() => subjects || [], [subjects]);
  const memoizedTopics = useMemo(() => topics || [], [topics]);

  // Call useTimetableStates with settings, currentYear, and currentWeek
  const { currentView, setCurrentView, viewMode, setViewMode, currentDate, setCurrentDate, renderKey, setRenderKey, isModalOpen, setIsModalOpen, editingLesson, setEditingLesson, slotInfo, setSlotInfo, initialSubjectForModal, setInitialSubjectForModal, isCopying, setIsCopying, copiedLesson, setCopiedLesson, activeDragId, setActiveDragId, hoverLesson, setHoverLesson, hoverPosition, setHoverPosition, disableHover, setDisableHover, overlayRef, debouncedShowRef, debouncedHideRef, handleShowHover, handleHideHover, timeSlots, weekInfo, autoFit, setAutoFit } = useTimetableStates(settings || {}, currentYear, currentWeek);

  const queryClientLocal = useQueryClient();

  const stableAllLessons = useMemo(() => allLessons, [JSON.stringify(allLessons)]);
  const stableAllerleiLessons = useMemo(() => allerleiLessons, [JSON.stringify(allerleiLessons)]);

  const lessonsForCurrentWeek = useMemo(() => {
    console.log('Debug: Computing lessonsForCurrentWeek', {
      allLessonsLength: stableAllLessons.length,
      allerleiLessonsLength: stableAllerleiLessons.length,
      currentWeek,
    });
    return [...stableAllLessons, ...stableAllerleiLessons].filter(l => l.week_number === currentWeek);
  }, [stableAllLessons, stableAllerleiLessons, currentWeek]);

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
    yearlyLessons,
    timeSlots,
    currentWeek,
    queryClientLocal,
    subjects,
    optimisticUpdateAllLessons,
    optimisticUpdateYearlyLessons,
    addAllerleiLesson,
    removeAllLesson,
    setAllLessons,
    setYearlyLessons,
    activeClassId,
    refetch,
    setIsModalOpen,
    setEditingLesson,              // Neu: Für Reset nach Save/Unlink
    setInitialSubjectForModal,     // Neu: Falls verwendet, für Initial-Subject-Reset
    setCopiedLesson                // Neu: Für Copy-Reset
  );

  // Then call useDragAndDrop, passing reassignYearlyLessonLinks and updateYearlyLessonOrder
  const { sensors, handleDragStart, handleDragEnd } = useDragAndDrop(
    lessonsForCurrentWeek,
    allLessons,
    allerleiLessons,
    currentWeek,
    yearlyLessons,
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
    setYearlyLessons,
    setAllerleiLessons,
    refetch,
    setActiveDragId
  );

  const [lessonsWithDetails, setLessonsWithDetails] = useState([]);

  useEffect(() => {
    const computeLessonsWithDetails = async () => {
      console.log('Debug: computeLessonsWithDetails running', {
        lessonsForCurrentWeek: lessonsForCurrentWeek.length,
        yearlyLessons: yearlyLessons.length,
        memoizedTopics: memoizedTopics.length,
        memoizedSubjects: memoizedSubjects.length,
      });

      const resolvedLessons = await Promise.all(
        lessonsForCurrentWeek.map(async (lesson) => {
          const subjectsById = new Map(memoizedSubjects.map(s => [s.id, s]));
          const yearlyLessonsById = new Map(yearlyLessons.map(yl => [yl.id, yl]));
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

          // Robust topic resolution: ID -> lookup, else try title/name matching (case-insensitive), else fallback to primaryYl.topic_id/title
          const resolveTopic = (value) => {
            if (!value) return null;
            // direct ID lookup
            if (topicsById.has(value)) return topicsById.get(value);
            // try to find by title (exact or case-insensitive)
            const byTitle = memoizedTopics.find(t =>
              t.id === value ||
              t.title === value ||
              (typeof t.title === 'string' && typeof value === 'string' && t.title.toLowerCase() === value.toLowerCase())
            );
            if (byTitle) return byTitle;
            // sometimes topic_id was stored as topic.title on yearly/lesson -> try match with yearly expand name
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
          if (lesson.collectionName === 'allerlei_lessons') {
            lessonDetails = await normalizeAllerleiData(lesson, memoizedSubjects, lesson.subject);
          } else {
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
            if (lesson.is_allerlei) {
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
          }
          return lessonDetails;
        })
      );

      // Prüfe, ob resolvedLessons sich von lessonsWithDetails unterscheidet
      setLessonsWithDetails(prev => {
        if (isEqual(prev, resolvedLessons)) {
          console.log('Debug: lessonsWithDetails unchanged, skipping set');
          return prev;
        }
        console.log('Debug: Updating lessonsWithDetails', resolvedLessons);
        return resolvedLessons;
      });
    };

    computeLessonsWithDetails();
  }, [lessonsForCurrentWeek, yearlyLessons, memoizedTopics, memoizedSubjects]);

  const availableYearlyLessonsForPool = useMemo(() => {
    if (!activeClassId) {
      console.log('Debug: No activeClassId, returning empty pool');
      return [];
    }
    const subjectsForClass = subjects.filter(s => s.class_id === activeClassId);
    const uniqueSubjectsForClass = [...new Map(subjectsForClass.map(s => [s.name, s])).values()];
    const scheduledLessonsInWeek = lessonsForCurrentWeek;
    const scheduledCounts = scheduledLessonsInWeek.reduce((acc, lesson) => {
      if (lesson.collectionName !== 'allerlei_lessons') {
        const isSecondary = scheduledLessonsInWeek.some(primary =>
          primary.is_double_lesson &&
          primary.second_yearly_lesson_id === lesson.yearly_lesson_id &&
          primary.day_of_week === lesson.day_of_week &&
          primary.week_number === lesson.week_number &&
          primary.period_slot === lesson.period_slot - 1
        );
        if (isSecondary) {
          return acc;
        }
        if (lesson.second_yearly_lesson_id && !lesson.is_double_lesson) {
          return acc;
        }
        let lessonValue = lesson.is_double_lesson ? 2 : lesson.is_half_class ? 0.5 : 1;
        const subjectName = lesson.expand?.subject?.name || lesson.subject_name;
        if (subjectName) {
          acc[subjectName] = (acc[subjectName] || 0) + lessonValue;
        }
        return acc;
      }
      const yearlyIds = [
        lesson.primary_yearly_lesson_id,
        ...(Array.isArray(lesson.added_yearly_lesson_ids) ? lesson.added_yearly_lesson_ids : [])
      ].filter(Boolean);
      yearlyIds.forEach(ylId => {
        const yl = yearlyLessons.find(y => y.id === ylId);
        if (yl) {
          const subjectName = yl.expand?.subject?.name || yl.subject_name;
          if (subjectName) {
            const lessonValue = yl.is_half_class ? 0.5 : 1;
            acc[subjectName] = (acc[subjectName] || 0) + lessonValue;
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
      const availableLessons = yearlyLessons
        .filter(yl => {
          const matchesSubject = yl.subject_name === subject.name || yl.expand?.subject?.name === subject.name;
          const matchesWeek = yl.week_number === currentWeek;
          const lessonCount = subjectLessons.filter(l => 
            l.yearly_lesson_id === yl.id && 
            !l.is_hidden &&
            (l.collectionName !== 'allerlei_lessons' || 
            l.primary_yearly_lesson_id === yl.id || 
            (Array.isArray(l.added_yearly_lesson_ids) && l.added_yearly_lesson_ids.includes(yl.id)))
          ).length;
          const isNotAllerlei = !yl.is_allerlei;
          return matchesSubject && matchesWeek && isNotAllerlei && lessonCount < (yl.is_half_class ? 2 : 1);
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
  }, [subjects, activeClassId, allLessons, allerleiLessons, yearlyLessons, currentWeek]);

  const handleCreateLesson = (dayOfWeek, periodSlot, subject = null) => {
    setSlotInfo({ day: dayOfWeek, period: periodSlot, week: currentWeek });
    setInitialSubjectForModal(subject);
    setEditingLesson(null);
    setIsModalOpen(true);
  };

  const handleEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setInitialSubjectForModal(null);
    setSlotInfo({ day: lesson.day_of_week, period: lesson.period_slot, week: currentWeek });
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
        <div className="bg-white dark:bg-slate-800 p-2 rounded shadow">
          <div className="font-bold">
            {subjectData.subject.name}
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              ({subjectData.totalScheduled}/{subjectData.lessonsPerWeek})
            </span>
          </div>
        </div>
      );
    } else {
      const lesson = lessonsWithDetails.find(l => l.id === id);
      if (!lesson) return null;
      return <LessonCard lesson={lesson} />;
    }
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
    setCurrentWeek(prev => prev > 1 ? prev - 1 : ACADEMIC_WEEKS);
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => prev < ACADEMIC_WEEKS ? prev + 1 : 1);
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
          onDragEnd={handleDragEnd}
          modifiers={[restrictToWindowEdges]}
        >
          <div className="timetable-content flex-grow flex overflow-hidden p-4 gap-4">
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
            {activeDragId ? renderDragOverlay(activeDragId) : null}
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
        setHoverLesson={setHoverLesson}
        debouncedShowRef={debouncedShowRef}
        debouncedHideRef={debouncedHideRef}
        disableHover={disableHover}
        activeDragId={activeDragId}
        lessonsWithDetails={lessonsWithDetails}
        renderDragOverlay={renderDragOverlay}
        setHoverPosition={setHoverPosition}
        overlayRef={overlayRef}
      />

      <LessonModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setInitialSubjectForModal(null); setCopiedLesson(null); }}
        onSave={handleSaveLesson}
        onDelete={handleDeleteLesson}
        onDuplicate={handleDuplicateLesson}
        lesson={editingLesson}
        copiedLesson={copiedLesson}
        slotInfo={slotInfo}
        currentWeek={currentWeek}
        allLessons={allLessons}
        allYearlyLessons={yearlyLessons}
        timeSlots={timeSlots}
        subjectColor={subjects.find(s => s.id === (editingLesson?.subject || initialSubjectForModal))?.color}
        initialSubject={initialSubjectForModal}
        subjects={subjects}
        topics={topics}
        activeClassId={activeClassId}
        setEditingLesson={setEditingLesson}
        setIsModalOpen={setIsModalOpen}
        currentYear={currentYear}  // Neu
      />
    </div>
  );
}