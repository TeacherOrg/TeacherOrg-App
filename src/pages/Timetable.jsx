import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Lesson, YearlyLesson, Topic, Subject, Setting, Class, Holiday } from "@/api/entities";
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
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import debounce from 'lodash/debounce';
import OverlayView from "../components/timetable/OverlayView";
import { adjustColor } from '@/utils/colorUtils';
import { useLessonStore } from '@/store'; // Passe den Pfad an, falls nötig
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import pb from '@/api/pb';
const ACADEMIC_WEEKS = 52; // Increased to 52 for full year cycle
function getCurrentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + start.getDay() + 1) / 7);
}
// Simplified and corrected getWeekInfo function
function getWeekInfo(week, year) {
    // Create January 4th of the given year (always in week 1)
    const jan4 = new Date(year, 0, 4);
    // Get the Monday of week 1
    const mondayOfWeek1 = new Date();
    mondayOfWeek1.setTime(jan4.getTime() - ((jan4.getDay() + 6) % 7) * 86400000);
    // Calculate the Monday of the requested week
    const monday = new Date();
    monday.setTime(mondayOfWeek1.getTime() + (week - 1) * 7 * 86400000);
    // Calculate Friday of the same week
    const friday = new Date();
    friday.setTime(monday.getTime() + 4 * 86400000);
    const mondayStr = monday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const fridayStr = friday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    // Create date objects for holiday checking
    const mondayForHolidayCheck = new Date(monday);
    mondayForHolidayCheck.setHours(0, 0, 0, 0);
    const fridayForHolidayCheck = new Date(friday);
    fridayForHolidayCheck.setHours(23, 59, 59, 999);
    return {
        start: mondayForHolidayCheck,
        end: fridayForHolidayCheck,
        calendarWeek: week,
        mondayStr,
        fridayStr,
        year: monday.getFullYear()
    };
}
// Re-added the missing generateTimeSlots function
function generateTimeSlots(settings) {
    if (!settings || !settings.startTime) {
        return [];
    }
    const slots = [];
    const {
        startTime,
        lessonsPerDay = 8,
        lessonDuration = 45,
        shortBreak = 5,
        morningBreakAfter = 2,
        morningBreakDuration = 20,
        lunchBreakAfter = 4,
        lunchBreakDuration = 40,
        afternoonBreakAfter = 6,
        afternoonBreakDuration = 15,
    } = settings;
    const [startHour, startMinute] = startTime.split(':').map(Number);
    // Use a fixed date to avoid issues with daylight saving time changes
    let currentTime = new Date(2000, 0, 1, startHour, startMinute, 0);
    for (let i = 1; i <= lessonsPerDay; i++) {
        const slotStartTime = new Date(currentTime);
    
        currentTime.setMinutes(currentTime.getMinutes() + lessonDuration);
        const slotEndTime = new Date(currentTime);
        slots.push({
            period: i,
            start: slotStartTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
            end: slotEndTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        });
        // Add break for the next lesson
        if (i < lessonsPerDay) {
            let breakDuration = shortBreak;
            if (i === morningBreakAfter) {
                breakDuration = morningBreakDuration;
            } else if (i === lunchBreakAfter) {
                breakDuration = lunchBreakDuration;
            } else if (i === afternoonBreakAfter) {
                breakDuration = afternoonBreakDuration;
            }
            currentTime.setMinutes(currentTime.getMinutes() + breakDuration);
        }
    }
    return slots;
}
const DraggableItem = ({ id, data, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useDraggable({ id, data });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };
  return <div ref={setNodeRef} style={style} {...listeners} {...attributes}>{children}</div>;
};
const queryClient = new QueryClient();
export default function TimetablePage() {
  return <QueryClientProvider client={queryClient}><InnerTimetablePage /></QueryClientProvider>;
}
function InnerTimetablePage() {
  const navigate = useNavigate();
  const allLessons = useLessonStore((state) => state.allLessons);
  const yearlyLessons = useLessonStore((state) => state.yearlyLessons);
  const { setAllLessons, setYearlyLessons, optimisticUpdateAllLessons, optimisticUpdateYearlyLessons, addAllLesson, removeAllLesson } = useLessonStore();
  const [renderKey, setRenderKey] = useState(0);
  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [allLessons]);
  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [yearlyLessons]);
  const [topics, setTopics] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [settings, setSettings] = useState({});
  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [settings.cellWidth, settings.cellHeight]);
  const [holidays, setHolidays] = useState([]);
  const [viewMode, setViewMode] = useState('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [slotInfo, setSlotInfo] = useState({ day: null, period: null });
  const [isLoading, setIsLoading] = useState(true);
  const [activeClassId, setActiveClassId] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentView, setCurrentView] = useState('Woche');
  const [initialSubjectForModal, setInitialSubjectForModal] = useState(null);
  const [isCopying, setIsCopying] = useState(false);
  const [copiedLesson, setCopiedLesson] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);
  const [hoverLesson, setHoverLesson] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ top: 0, left: 0 });
  const [disableHover, setDisableHover] = useState(false); // Optional: Setze auf true für Mobile via Media Query
  const overlayRef = useRef(null);
  const debouncedShowRef = useRef(null);
  const debouncedHideRef = useRef(null);
  const handleShowHover = (lesson, event) => {
    if (disableHover) return; // Optional: Hover deaktivieren, z.B. auf Mobile
    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      top: rect.top + window.scrollY,
      left: rect.right + window.scrollX + 10, // Positioniert das Overlay rechts neben der Karte (anpassen bei Bedarf)
    };
    debouncedShowRef.current(lesson, position);
  };
  const handleHideHover = () => {
    debouncedHideRef.current();
  };
  // Debounce für Flicker-Vermeidung
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const dayName = useMemo(() => dayNames[currentDate.getDay()], [currentDate]);
  const formatDate = useCallback((date) => date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), []);
  const timeSlots = useMemo(() => generateTimeSlots(settings), [settings]);
  useEffect(() => {
    if (settings.cellWidth) {
      document.documentElement.style.setProperty('--cell-width', `${settings.cellWidth}px`);
    }
    if (settings.cellHeight && timeSlots) { // Zusätzliche Check, um Crash zu vermeiden
      const maxHeightPerCell = Math.min(settings.cellHeight, Math.floor((window.innerHeight - 280) / timeSlots.length));
      document.documentElement.style.setProperty('--cell-height', `${maxHeightPerCell}px`);
    }
  }, [settings, timeSlots]); // Ändere Abhängigkeit zu [settings, timeSlots], da timeSlots.length implizit abgedeckt ist
  useEffect(() => {
  const handleResize = () => {
    if (settings.cellHeight && timeSlots?.length > 0) {
      const maxHeightPerCell = Math.min(settings.cellHeight, Math.floor((window.innerHeight - 280) / timeSlots.length));
      document.documentElement.style.setProperty('--cell-height', `${maxHeightPerCell}px`);
    }
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [settings.cellHeight, timeSlots?.length]);
  const weekInfo = useMemo(() => getWeekInfo(currentWeek, currentYear), [currentWeek, currentYear]);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150, // ms delay before drag activates
        tolerance: 5, // px movement tolerance during delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const gridRef = useRef(null);
  useEffect(() => {
    if (viewMode !== 'week') {
      const applyCellHeight = () => {
        const timetableContainer = document.querySelector('.timetable-container');
        if (!timetableContainer) return;
        const headerHeight = 220;
        const availableHeight = window.innerHeight - headerHeight;
        const userCellHeight = settings.cellHeight || 80;
        const maxAllowedHeight = availableHeight > 0 && timeSlots.length > 0
          ? Math.floor(availableHeight / timeSlots.length)
          : userCellHeight;
        const finalCellHeight = Math.min(userCellHeight, maxAllowedHeight, 100);
        document.documentElement.style.setProperty('--cell-height', 'auto');
        document.documentElement.style.setProperty('--cell-width', 'auto');
        return;
      }
      applyCellHeight();
      window.addEventListener('resize', applyCellHeight);
      return () => window.removeEventListener('resize', applyCellHeight);
    }
  }, [settings.cellWidth, settings.cellHeight, timeSlots.length, viewMode]);
  const queryClientLocal = useQueryClient();
  const { data, isLoading: queryLoading, refetch } = useQuery({
    queryKey: ['timetableData', currentYear, currentWeek],
    queryFn: async () => {
      const [lessonsData, yearlyLessonsData, topicsData, subjectsData, classesData, settingsData, holidaysData] = await Promise.all([
        Lesson.list(),
        YearlyLesson.list(),
        Topic.list(),
        Subject.list(),
        Class.list(),
        Setting.list(),
        Holiday.list()
      ]);
      return { lessonsData, yearlyLessonsData, topicsData, subjectsData, classesData, settingsData, holidaysData };
    },
    staleTime: 0,
  });
  useEffect(() => {
    const initializeData = async () => {
      if (data) {
        setAllLessons(data.lessonsData || []);
        setYearlyLessons(data.yearlyLessonsData.map(l => ({...l, lesson_number: Number(l.lesson_number)})) || []);
        setTopics(data.topicsData || []);
        setSubjects(data.subjectsData || []);
        setClasses(data.classesData || []);
        setHolidays(data.holidaysData || []);
        if (Array.isArray(data.classesData) && data.classesData.length > 0 && !activeClassId) {
          setActiveClassId(data.classesData[0].id);
        }
        if (data.settingsData.length > 0) {
          setSettings(data.settingsData[0]);
        } else {
          const defaultSettings = { startTime: "08:00", lessonsPerDay: 8, lessonDuration: 45, shortBreak: 5, morningBreakAfter: 2, morningBreakDuration: 20, lunchBreakAfter: 4, lunchBreakDuration: 40, afternoonBreakAfter: 6, afternoonBreakDuration: 15, cellWidth: 120, cellHeight: 80 };
          const newSettings = await Setting.create(defaultSettings);
          setSettings(newSettings);
        }
      }
      setIsLoading(queryLoading);
    };
    initializeData();
  }, [data, queryLoading, activeClassId, setAllLessons, setYearlyLessons]);
  useEffect(() => {
    const handleDataRefresh = () => queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
    window.addEventListener('holidays-changed', handleDataRefresh);
    window.addEventListener('settings-changed', handleDataRefresh);
    return () => {
      window.removeEventListener('holidays-changed', handleDataRefresh);
      window.removeEventListener('settings-changed', handleDataRefresh);
    };
  }, [currentYear, currentWeek, queryClientLocal]);
  useEffect(() => {
    if (currentView === 'Tag') {
      const urlParams = new URLSearchParams(window.location.search);
      const dateParam = urlParams.get('date');
      if (dateParam) {
        const newDate = new Date(dateParam);
        if (!isNaN(newDate.getTime())) {
          setCurrentDate(newDate);
        }
      }
    }
  }, [currentView]);
  const handlePrint = () => {
    if (!gridRef.current) return;
    const printWin = window.open('', '', 'width=800,height=600');
    printWin.document.write('<html><head>');
    printWin.document.write(document.head.innerHTML);
    printWin.document.write('</head><body>');
    printWin.document.write(gridRef.current.outerHTML);
    printWin.document.write('<script>');
    printWin.document.write('window.addEventListener("afterprint", () => window.close());');
    printWin.document.write('window.onload = () => { window.print(); };');
    printWin.document.write('</script>');
    printWin.document.write('</body></html>');
    printWin.document.close();
    printWin.focus(); // Optional: Fokussiert das Fenster, um Popups zu vermeiden
  };
  const handleViewChange = (view) => {
    setCurrentView(view);
    if (view === 'Tag') {
      setViewMode('day');
    } else if (view === 'Woche') {
      setViewMode('week');
    } else if (view === 'Jahr') {
      navigate(createPageUrl('YearlyOverview'));
    }
  };
  // FIX: Improved reassign function that properly handles lesson ordering and integrated lessons
  const reassignYearlyLessonLinks = useCallback(async (subjectName, currentLessons, yearlyLessonsParam = yearlyLessons) => {
    const dayOrder = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
    // Sort lessons by day and period to reflect new timetable order
    const lessonsForSubject = currentLessons
      .filter(l => l.expand?.subject?.name === subjectName && !l.is_allerlei && l.week_number === currentWeek)
      .sort((a, b) => {
        const dayDiff = dayOrder[a.day_of_week] - dayOrder[b.day_of_week];
        if (dayDiff !== 0) return dayDiff;
        return a.period_slot - b.period_slot;
      });
    const integratedYearlyIds = new Set();
    currentLessons
      .filter(l => l.is_allerlei && l.week_number === currentWeek)
      .forEach(l => l.allerlei_yearly_lesson_ids?.forEach(id => {
        if (id) integratedYearlyIds.add(id);
      }));
    // Sort yearly lessons by lesson_number to maintain yearly order
    const yearlyLessonsForSubject = yearlyLessonsParam
      .filter(yl => yl.expand?.subject?.name === subjectName && yl.week_number === currentWeek)
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
    const normalYearlies = yearlyLessonsForSubject.filter(yl => !yl.is_half_class);
    const halfYearlies = yearlyLessonsForSubject.filter(yl => yl.is_half_class);
    let normalIndex = 0;
    let halfIndex = 0;
    let currentHalfYl = null;
    let halfCount = 0;
    const updatePromises = [];
    const updatedLessonsMap = new Map(currentLessons.map(l => [l.id, l]));
    let i = 0;
    while (i < lessonsForSubject.length) {
      let lesson = lessonsForSubject[i];
      let yearlyLessonToLink = null;
      if (!lesson.is_half_class) {
        // Assign yearly lessons based on timetable position, respecting yearly order
        while (normalIndex < normalYearlies.length && integratedYearlyIds.has(normalYearlies[normalIndex].id)) {
          normalIndex++;
        }
        if (normalIndex < normalYearlies.length) {
          yearlyLessonToLink = normalYearlies[normalIndex];
          normalIndex++;
        }
      } else {
        if (halfCount === 0) {
          while (halfIndex < halfYearlies.length && integratedYearlyIds.has(halfYearlies[halfIndex].id)) {
            halfIndex++;
          }
          if (halfIndex < halfYearlies.length) {
            currentHalfYl = halfYearlies[halfIndex];
            halfIndex++;
          } else {
            currentHalfYl = null;
          }
        }
        if (currentHalfYl) {
          yearlyLessonToLink = currentHalfYl;
          halfCount = (halfCount + 1) % 2;
        }
      }
      if (yearlyLessonToLink) {
        const isDouble = yearlyLessonToLink.is_double_lesson && !lesson.is_half_class;
        const updateData = {
          yearly_lesson_id: yearlyLessonToLink.id,
          topic_id: yearlyLessonToLink.topic_id || null,
          is_double_lesson: isDouble,
          second_yearly_lesson_id: isDouble ? yearlyLessonToLink.second_yearly_lesson_id : null,
          is_exam: yearlyLessonToLink.is_exam,
          is_allerlei: yearlyLessonToLink.is_allerlei,
          is_half_class: lesson.is_half_class,
          allerlei_subjects: yearlyLessonToLink.allerlei_subjects || [],
        };
        // Update lesson if the yearly_lesson_id or related fields have changed
        if (lesson.yearly_lesson_id !== yearlyLessonToLink.id ||
            lesson.second_yearly_lesson_id !== updateData.second_yearly_lesson_id ||
            lesson.is_double_lesson !== updateData.is_double_lesson ||
            lesson.topic_id !== updateData.topic_id ||
            lesson.is_exam !== updateData.is_exam ||
            lesson.is_allerlei !== updateData.is_allerlei ||
            lesson.is_half_class !== updateData.is_half_class) {
          updatePromises.push(Lesson.update(lesson.id, updateData));
          const updatedLesson = { ...lesson, ...updateData };
          updatedLessonsMap.set(lesson.id, updatedLesson);
        }
        if (isDouble && yearlyLessonToLink.second_yearly_lesson_id) {
          if (i < lessonsForSubject.length - 1) {
            const nextLesson = lessonsForSubject[i + 1];
            if (nextLesson.day_of_week === lesson.day_of_week &&
                nextLesson.period_slot === lesson.period_slot + 1) {
              const secondYearly = yearlyLessonsParam.find(yl => yl.id === yearlyLessonToLink.second_yearly_lesson_id);
              if (secondYearly) {
                const updateDataNext = {
                  yearly_lesson_id: secondYearly.id,
                  topic_id: secondYearly.topic_id || null,
                  is_double_lesson: true,
                  second_yearly_lesson_id: yearlyLessonToLink.id,
                  is_exam: secondYearly.is_exam,
                  is_allerlei: secondYearly.is_allerlei,
                  is_half_class: secondYearly.is_half_class,
                  allerlei_subjects: secondYearly.allerlei_subjects || [],
                };
                updatePromises.push(Lesson.update(nextLesson.id, updateDataNext));
                const updatedNext = { ...nextLesson, ...updateDataNext };
                updatedLessonsMap.set(nextLesson.id, updatedNext);
                i++; // Skip the next lesson as it's the secondary part of the double lesson
              } else {
                // Fallback: Remove double lesson flag if secondary yearly lesson is missing
                updatePromises.push(Lesson.update(lesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }));
                updatePromises.push(YearlyLesson.update(yearlyLessonToLink.id, { is_double_lesson: false, second_yearly_lesson_id: null }));
                updatedLessonsMap.set(lesson.id, { ...lesson, is_double_lesson: false, second_yearly_lesson_id: null });
              }
            } else {
              // Fallback: Remove double lesson flag if next slot is not consecutive
              updatePromises.push(Lesson.update(lesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }));
              updatePromises.push(YearlyLesson.update(yearlyLessonToLink.id, { is_double_lesson: false, second_yearly_lesson_id: null }));
              updatedLessonsMap.set(lesson.id, { ...lesson, is_double_lesson: false, second_yearly_lesson_id: null });
            }
          } else {
            // Fallback: Remove double lesson flag if no next lesson exists
            updatePromises.push(Lesson.update(lesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }));
            updatePromises.push(YearlyLesson.update(yearlyLessonToLink.id, { is_double_lesson: false, second_yearly_lesson_id: null }));
            updatedLessonsMap.set(lesson.id, { ...lesson, is_double_lesson: false, second_yearly_lesson_id: null });
          }
        }
      } else {
        // If no yearly lesson is available, unlink the lesson
        if (lesson.yearly_lesson_id !== null) {
          const updateData = { 
            yearly_lesson_id: null, 
            topic_id: null, 
            is_double_lesson: false, 
            second_yearly_lesson_id: null, 
            is_exam: false, 
            is_allerlei: false, 
            is_half_class: false, 
            allerlei_subjects: [] 
          };
          updatePromises.push(Lesson.update(lesson.id, updateData));
          const updatedLesson = { ...lesson, ...updateData };
          updatedLessonsMap.set(lesson.id, updatedLesson);
        }
      }
      i++;
    }
    // Validate double lessons
    for (const lesson of lessonsForSubject) {
      const mappedLesson = updatedLessonsMap.get(lesson.id);
      if (mappedLesson.is_double_lesson && mappedLesson.second_yearly_lesson_id) {
        const secondLesson = updatedLessonsMap.values().find(l =>
          l.yearly_lesson_id === mappedLesson.second_yearly_lesson_id &&
          l.day_of_week === mappedLesson.day_of_week &&
          l.period_slot === mappedLesson.period_slot + 1
        );
        if (!secondLesson) {
          updatePromises.push(Lesson.update(mappedLesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }));
          updatePromises.push(YearlyLesson.update(mappedLesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null }));
          updatedLessonsMap.set(mappedLesson.id, { ...mappedLesson, is_double_lesson: false, second_yearly_lesson_id: null });
        }
      }
    }
    // Validate half-class lessons
    const ylToCount = new Map();
    lessonsForSubject.forEach(l => {
      const mappedL = updatedLessonsMap.get(l.id);
      if (mappedL.yearly_lesson_id) {
        ylToCount.set(mappedL.yearly_lesson_id, (ylToCount.get(mappedL.yearly_lesson_id) || 0) + 1);
      }
    });
    for (const [ylId, count] of ylToCount) {
      const yl = yearlyLessonsParam.find(y => y.id === ylId);
      if (yl && yl.is_half_class && count !== 2) {
        await YearlyLesson.update(ylId, { is_half_class: false });
        optimisticUpdateYearlyLessons(ylId, { is_half_class: false });
        Array.from(updatedLessonsMap.values()).forEach(mappedL => {
          if (mappedL.yearly_lesson_id === ylId) {
            const updateData = { is_half_class: false };
            updatePromises.push(Lesson.update(mappedL.id, updateData));
            updatedLessonsMap.set(mappedL.id, { ...mappedL, ...updateData });
          }
        });
      }
    }
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    // Debug-Log to verify reassignment
    console.log('Debug: Reassigned lessons', lessonsForSubject.map(l => ({
      id: l.id,
      yearly_lesson_id: updatedLessonsMap.get(l.id)?.yearly_lesson_id,
      day: l.day_of_week,
      period: l.period_slot,
      name: yearlyLessonsParam.find(yl => yl.id === updatedLessonsMap.get(l.id)?.yearly_lesson_id)?.name || 'Unbekannt'
    })));
    return Array.from(updatedLessonsMap.values());
  }, [currentWeek, yearlyLessons, optimisticUpdateYearlyLessons]);
  const updateYearlyLessonOrder = useCallback(async (subjectName, currentLessons, yearlyLessonsParam = yearlyLessons) => {
    const dayOrder = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
    const contributingEvents = [];
    currentLessons
      .filter(l => l.expand?.subject?.name === subjectName && !l.is_allerlei && l.week_number === currentWeek)
      .forEach(l => {
        contributingEvents.push({
          type: 'linked',
          dayOrder: dayOrder[l.day_of_week],
          period: l.period_slot,
          ylId: l.yearly_lesson_id,
          isDouble: l.is_double_lesson,
          secondYlId: l.second_yearly_lesson_id,
          isHalf: l.is_half_class
        });
      });
    currentLessons
      .filter(l => l.is_allerlei && l.week_number === currentWeek && l.allerlei_yearly_lesson_ids?.some(id => {
        const yl = yearlyLessonsParam.find(y => y.id === id);
        return yl && yl.expand?.subject?.name === subjectName;
      }))
      .forEach(l => {
        const ylIdForSubject = l.allerlei_yearly_lesson_ids.find(id => {
          const yl = yearlyLessonsParam.find(y => y.id === id);
          return yl && yl.expand?.subject?.name === subjectName;
        });
        if (ylIdForSubject) {
          contributingEvents.push({
            type: 'integrated',
            dayOrder: dayOrder[l.day_of_week],
            period: l.period_slot,
            ylId: ylIdForSubject
          });
        }
      });
    // Sort events by day and period to reflect timetable order
    contributingEvents.sort((a, b) => {
      const dayDiff = a.dayOrder - b.dayOrder;
      return dayDiff !== 0 ? dayDiff : a.period - b.period;
    });
    // Map lessons to their new lesson_number based on timetable position
    const orderedScheduledYearlyIds = [];
    let i = 0;
    while (i < contributingEvents.length) {
      const event = contributingEvents[i];
      if (event.type === 'linked' && event.ylId && !orderedScheduledYearlyIds.includes(event.ylId)) {
        orderedScheduledYearlyIds.push(event.ylId);
        if (event.isDouble && event.secondYlId) {
          // Ensure secondary lesson follows primary in order
          const nextEvent = contributingEvents[i + 1];
          if (nextEvent && nextEvent.ylId === event.secondYlId && nextEvent.dayOrder === event.dayOrder && nextEvent.period === event.period + 1) {
            orderedScheduledYearlyIds.push(event.secondYlId);
            i++; // Skip the next event if it's the secondary lesson
          }
        }
      } else if (event.type === 'integrated' && event.ylId && !orderedScheduledYearlyIds.includes(event.ylId)) {
        orderedScheduledYearlyIds.push(event.ylId);
      }
      i++;
    }
    // Include unlinked yearly lessons, maintaining their original lesson_number order
    const allYearlyForSubject = yearlyLessonsParam
      .filter(yl => yl.expand?.subject?.name === subjectName && yl.week_number === currentWeek)
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
    const unlinkedYearly = allYearlyForSubject
      .filter(yl => !orderedScheduledYearlyIds.includes(yl.id))
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
    // Assign new lesson_number starting from 1
    let lessonNum = 1;
    const yearlyToNewNum = new Map();
    orderedScheduledYearlyIds.forEach(ylId => {
      yearlyToNewNum.set(ylId, lessonNum);
      lessonNum++;
    });
    unlinkedYearly.forEach(yl => {
      yearlyToNewNum.set(yl.id, lessonNum);
      lessonNum++;
    });
    // Update yearly lessons with new lesson_number
    const updatePromises = [];
    const updatedYearlyLessons = [...yearlyLessonsParam];
    for (const [ylId, newNum] of yearlyToNewNum) {
      const ylIndex = updatedYearlyLessons.findIndex(y => y.id === ylId);
      const yl = updatedYearlyLessons[ylIndex];
      if (yl && Number(yl.lesson_number) !== newNum) {
        updatePromises.push(YearlyLesson.update(ylId, { lesson_number: newNum }));
        updatedYearlyLessons[ylIndex] = { ...yl, lesson_number: newNum };
      }
    }
    await Promise.all(updatePromises);
    // Debug-Log to verify lesson_number updates
    console.log('Debug: Updated yearly lesson order', Array.from(yearlyToNewNum.entries()).map(([ylId, newNum]) => ({
      yearly_lesson_id: ylId,
      lesson_number: newNum,
      name: yearlyLessonsParam.find(yl => yl.id === ylId)?.name || 'Unbekannt'
    })));
    return updatedYearlyLessons;
  }, [currentWeek, yearlyLessons]);
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
  const handleSaveLesson = useCallback(async (lessonData, toDeleteIds) => {
    const originalLesson = editingLesson;
    let subjectsToReassign = new Set();
    if (!Array.isArray(toDeleteIds)) {
      toDeleteIds = toDeleteIds ? [toDeleteIds] : [];
    }
    try {
      let primaryYearlyLesson = null;
      let secondYearlyLesson = null;
      if (lessonData.yearly_lesson_id) {
        primaryYearlyLesson = yearlyLessons.find(yl => yl.id === lessonData.yearly_lesson_id);
      }
      if (lessonData.is_double_lesson && lessonData.second_yearly_lesson_id) {
        secondYearlyLesson = yearlyLessons.find(yl => yl.id === lessonData.second_yearly_lesson_id);
      }
      if (lessonData.is_allerlei) {
        console.log('Saving Allerlei lesson:', {
          allerlei_subjects: lessonData.allerlei_subjects,
          allerlei_yearly_lesson_ids: lessonData.allerlei_yearly_lesson_ids,
          steps: lessonData.steps
        });
        lessonData.yearly_lesson_id = null;
        lessonData.second_yearly_lesson_id = null;
        lessonData.is_double_lesson = false;
      }
      let oldLesson = null;
      if (!lessonData.isNew) {
        oldLesson = allLessons.find(l => l.id === lessonData.id);
      }
  
      if (lessonData.isNew) {
        const { isNew, steps, ...createDataWithoutSteps } = lessonData;
        if (lessonData.is_allerlei) {
          createDataWithoutSteps.steps = steps;
        }
        const subjectName = subjects.find(s => s.id === createDataWithoutSteps.subject)?.name;
        subjectsToReassign.add(subjectName);
    
        if (!createDataWithoutSteps.start_time || !createDataWithoutSteps.end_time) {
          const timeSlot = timeSlots.find(ts => ts.period === createDataWithoutSteps.period_slot);
          if (timeSlot) {
            createDataWithoutSteps.start_time = timeSlot.start;
            createDataWithoutSteps.end_time = timeSlot.end;
          }
        }
        // Neu: Setze user_id (required Feld)
        createDataWithoutSteps.user_id = pb.authStore.model.id;
        // Neu: Log den Payload zum Debuggen
        console.log('Create payload for lesson:', createDataWithoutSteps);
        const newLesson = await Lesson.create(createDataWithoutSteps);
    
        if (!newLesson.yearly_lesson_id && !newLesson.is_allerlei && newLesson.subject) {
          const existingYearlyForSub = yearlyLessons
            .filter(yl => yl.subject === newLesson.subject && yl.week_number === newLesson.week_number);
       
          const nextLessonNumber = existingYearlyForSub.length > 0
            ? Math.max(...existingYearlyForSub.map(yl => yl.lesson_number)) + 1
            : 1;
          const newYearlyLessonPayload = {
            subject: newLesson.subject,
            week_number: newLesson.week_number,
            lesson_number: nextLessonNumber,
            school_year: currentYear,
            steps: lessonData.steps || [],
            topic_id: newLesson.topic_id || null,
            is_double_lesson: newLesson.is_double_lesson || false,
            second_yearly_lesson_id: newLesson.second_yearly_lesson_id || null,
            is_exam: newLesson.is_exam || false,
            is_allerlei: newLesson.is_allerlei || false,
            is_half_class: newLesson.is_half_class || false,
            user_id: pb.authStore.model.id // Hinzugefügt: Falls du es im Schema required machst
          };
       
          const createdYearlyLesson = await YearlyLesson.create({
            ...newYearlyLessonPayload,
            name: `Lektion ${nextLessonNumber} für ${subjects.find(s => s.id === newLesson.subject)?.name || 'Unbekannt'}`, // Hinzugefügt: Required name
            description: '' // Hinzugefügt: Optional, aber gesetzt
          });
       
          await Lesson.update(newLesson.id, { yearly_lesson_id: createdYearlyLesson.id });
          newLesson.yearly_lesson_id = createdYearlyLesson.id;
          optimisticUpdateYearlyLessons(createdYearlyLesson, true);
        }
    
        optimisticUpdateAllLessons(newLesson, true);
        if (newLesson.yearly_lesson_id && !newLesson.is_allerlei) {
          const yearlyLessonToUpdate = yearlyLessons.find(yl => yl.id === newLesson.yearly_lesson_id);
          if (yearlyLessonToUpdate) {
            const yearlyUpdateData = {
              steps: lessonData.steps?.filter(s => !s.id?.startsWith('second-')) || [], // Only primary steps
              topic_id: newLesson.topic_id || null,
              is_double_lesson: newLesson.is_double_lesson || false,
              second_yearly_lesson_id: newLesson.second_yearly_lesson_id || null,
              is_exam: newLesson.is_exam || false,
              is_half_class: newLesson.is_half_class || false
            };
        
            console.log('Syncing new weekly lesson back to yearly lesson:', yearlyLessonToUpdate.id, yearlyUpdateData);
            await YearlyLesson.update(yearlyLessonToUpdate.id, yearlyUpdateData);
        
            optimisticUpdateYearlyLessons(yearlyLessonToUpdate.id, yearlyUpdateData);
          }
        }
        // NEU: Halbklassen-Kopie-Logik hier einfügen
        if (lessonData.is_half_class && lessonData.isNew) {
          const nextPeriod = lessonData.period_slot + 1;
          if (nextPeriod <= timeSlots.length && !allLessons.some(l => l.day_of_week === lessonData.day_of_week && l.period_slot === nextPeriod && l.week_number === currentWeek)) {
            const copyData = { ...lessonData, period_slot: nextPeriod, id: null, yearly_lesson_id: newLesson.yearly_lesson_id }; // Referenziere dieselbe Yearly, use newLesson's updated id
            const copyLesson = await Lesson.create(copyData);
            optimisticUpdateAllLessons(copyLesson, true);
          }
        } else if (!lessonData.is_half_class && originalLesson?.is_half_class) {
          // Lösche Kopie, wenn Flag entfernt
          const nextPeriod = originalLesson.period_slot + 1;
          const copyLesson = allLessons.find(l => l.day_of_week === originalLesson.day_of_week && l.period_slot === nextPeriod && l.week_number === currentWeek && l.yearly_lesson_id === originalLesson.yearly_lesson_id);
          if (copyLesson) {
            await Lesson.delete(copyLesson.id);
            removeAllLesson(copyLesson.id);
          }
        }
      } else {
        const { id, steps, ...updateDataWithoutSteps } = lessonData;
        if (lessonData.is_allerlei) {
          updateDataWithoutSteps.steps = steps;
        }
        if (oldLesson?.subject) {
          const oldSubjectName = subjects.find(s => s.id === oldLesson.subject)?.name;
          subjectsToReassign.add(oldSubjectName);
        }
        if (updateDataWithoutSteps.subject) {
          const updateSubjectName = subjects.find(s => s.id === updateDataWithoutSteps.subject)?.name;
          subjectsToReassign.add(updateSubjectName);
        }
        if (oldLesson && oldLesson.is_allerlei) {
            const oldSubs = oldLesson.allerlei_subjects || [];
            const newSubs = lessonData.is_allerlei ? (lessonData.allerlei_subjects || []) : [];
            oldSubs.forEach(sub => {
                if (!newSubs.includes(sub)) {
                    subjectsToReassign.add(sub);
                }
            });
            if (!lessonData.is_allerlei) {
              oldSubs.forEach(sub => subjectsToReassign.add(sub));
            }
        } else if (oldLesson && !oldLesson.is_allerlei && lessonData.is_allerlei) {
            const oldSubjectName = subjects.find(s => s.id === oldLesson.subject)?.name;
            subjectsToReassign.add(oldSubjectName);
        }
        console.log('Updating lesson with data:', updateDataWithoutSteps);
        await Lesson.update(id, updateDataWithoutSteps);
    
        const updatedLesson = { ...oldLesson, ...updateDataWithoutSteps };
        optimisticUpdateAllLessons(updatedLesson);
        if (updatedLesson.yearly_lesson_id && !updatedLesson.is_allerlei) {
          const yearlyLessonToUpdate = yearlyLessons.find(yl => yl.id === updatedLesson.yearly_lesson_id);
          if (yearlyLessonToUpdate) {
            const yearlyUpdateData = {
              steps: steps?.filter(s => !s.id?.startsWith('second-')) || [], // Only primary steps
              topic_id: updatedLesson.topic_id || null,
              is_double_lesson: updatedLesson.is_double_lesson || false,
              second_yearly_lesson_id: updatedLesson.second_yearly_lesson_id || null,
              is_exam: updatedLesson.is_exam || false,
              is_half_class: updatedLesson.is_half_class || false
            };
        
            console.log('Syncing updated weekly lesson back to yearly lesson:', yearlyLessonToUpdate.id, yearlyUpdateData);
            await YearlyLesson.update(yearlyLessonToUpdate.id, yearlyUpdateData);
        
            optimisticUpdateYearlyLessons(yearlyLessonToUpdate.id, yearlyUpdateData);
          }
        }
      }
      for (const deleteId of toDeleteIds) {
        const lessonToDelete = allLessons.find(l => l.id === deleteId);
        if (lessonToDelete) {
          if (lessonToDelete.subject) {
            const deleteSubjectName = subjects.find(s => s.id === lessonToDelete.subject)?.name;
            if (deleteSubjectName) {
              subjectsToReassign.add(deleteSubjectName);
            } else {
              console.warn('Subject name not found for ID:', lessonToDelete.subject);
            }
          }
          if (lessonToDelete.is_allerlei && lessonToDelete.allerlei_subjects) {
            lessonToDelete.allerlei_subjects.forEach(sub => subjectsToReassign.add(sub));
          }
          try {
            await Lesson.delete(deleteId);
            removeAllLesson(deleteId);
          } catch (deleteError) {
            if (deleteError.response && deleteError.response.status === 404) {
              console.warn(`Lesson with ID ${deleteId} not found on server during delete attempt, likely already deleted. Removing from local state.`);
            } else {
              console.error(`Error deleting lesson ${deleteId}:`, deleteError);
              throw deleteError;
            }
            removeAllLesson(deleteId);
          }
        } else {
          console.warn(`Lesson with ID ${deleteId} not found in current state for deletion during save operation.`);
        }
      }
      const wasDoubleLesson = oldLesson ? oldLesson.is_double_lesson : false;
      const isDoubleLesson = lessonData.is_double_lesson;
      if (isDoubleLesson && lessonData.yearly_lesson_id && lessonData.second_yearly_lesson_id) {
        const primaryYL = yearlyLessons.find(yl => yl.id === lessonData.yearly_lesson_id);
        const secondYL = yearlyLessons.find(yl => yl.id === lessonData.second_yearly_lesson_id);
        if (primaryYL && secondYL) {
          const allSteps = lessonData.steps || [];
          const pSteps = allSteps.filter(s => !s.id?.startsWith('second-'));
          const sSteps = allSteps.filter(s => s.id?.startsWith('second-')).map(s => ({ ...s, id: s.id.replace('second-', '') }));
      
          const primaryUpdate = {
            steps: pSteps,
            notes: lessonData.notes || primaryYL.notes || '',
            is_double_lesson: true,
            second_yearly_lesson_id: secondYL.id,
          };
      
          await YearlyLesson.update(primaryYL.id, primaryUpdate);
          await YearlyLesson.update(secondYL.id, { steps: sSteps, is_double_lesson: true });
          optimisticUpdateYearlyLessons(primaryYL.id, primaryUpdate);
          optimisticUpdateYearlyLessons(secondYL.id, { steps: sSteps, is_double_lesson: true });
        }
      } else if (!isDoubleLesson && wasDoubleLesson && oldLesson?.yearly_lesson_id) {
        const primaryYearlyLessonToRevert = yearlyLessons.find(yl => yl.id === oldLesson.yearly_lesson_id);
        if (primaryYearlyLessonToRevert) {
          await YearlyLesson.update(primaryYearlyLessonToRevert.id, {
            is_double_lesson: false,
            second_yearly_lesson_id: null,
          });
          const oldSecondId = oldLesson.second_yearly_lesson_id;
          if (oldSecondId) {
            await YearlyLesson.update(oldSecondId, { is_double_lesson: false });
          }
          optimisticUpdateYearlyLessons(primaryYearlyLessonToRevert.id, { is_double_lesson: false, second_yearly_lesson_id: null });
          if (oldSecondId) {
            optimisticUpdateYearlyLessons(oldSecondId, { is_double_lesson: false });
          }
        }
      }
  
      const refreshedYearly = await YearlyLesson.list();
      console.log('Debug: Updated yearlyLessons after drag', {
        affectedSubjects: [...affectedSubjects],
        tempYearlyLessons
      });
      setYearlyLessons(refreshedYearly.map(l => ({ ...l, lesson_number: Number(l.lesson_number) })));
  
      let finalLessons = allLessons;
  
      setAllLessons(JSON.parse(JSON.stringify(finalLessons)));
      console.log('Set deep-copied finalLessons:', finalLessons);
      for (const sub of subjectsToReassign) {
        if (sub) {
          finalLessons = await reassignYearlyLessonLinks(sub, finalLessons);
        }
      }
      setAllLessons(JSON.parse(JSON.stringify(finalLessons)));
  
      setIsModalOpen(false);
      setEditingLesson(null);
      setInitialSubjectForModal(null);
      setCopiedLesson(null);
      // Invalidate queries after mutation
      queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
    } catch (error) {
      setYearlyLessons(yearlyLessons);
      setAllLessons(allLessons);
      console.error("Error saving lesson:", error);
      queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
    }
  }, [editingLesson, currentYear, allLessons, yearlyLessons, timeSlots, currentWeek, queryClientLocal]);
  const handleDeleteLesson = useCallback(async (lessonId) => {
    try {
      const lessonToDelete = allLessons.find(l => l.id === lessonId);
      if (!lessonToDelete) {
        console.warn("Lesson not found in local state for deletion:", lessonId);
        setIsModalOpen(false);
        setEditingLesson(null);
        return;
      }

      // Identify the secondary lesson if this is a double lesson
      let secondaryLesson = null;
      if (lessonToDelete.is_double_lesson && lessonToDelete.second_yearly_lesson_id) {
        secondaryLesson = allLessons.find(l =>
          l.day_of_week === lessonToDelete.day_of_week &&
          l.period_slot === lessonToDelete.period_slot + 1 &&
          l.yearly_lesson_id === lessonToDelete.second_yearly_lesson_id &&
          l.week_number === lessonToDelete.week_number
        );
      }

      // Delete the primary lesson
      try {
        await Lesson.delete(lessonId);
      } catch (deleteError) {
        if (deleteError.response && deleteError.response.status === 404) {
          console.warn(`Lesson with ID ${lessonId} already deleted on server. Removing from local state.`);
        } else {
          console.error(`Error deleting lesson ${lessonId}:`, deleteError);
          throw deleteError;
        }
      }
      removeAllLesson(lessonId);

      // Delete the secondary lesson if it exists
      if (secondaryLesson) {
        try {
          await Lesson.delete(secondaryLesson.id);
        } catch (deleteError) {
          if (deleteError.response && deleteError.response.status === 404) {
            console.warn(`Secondary lesson with ID ${secondaryLesson.id} already deleted on server. Removing from local state.`);
          } else {
            console.error(`Error deleting secondary lesson ${secondaryLesson.id}:`, deleteError);
            throw deleteError;
          }
        }
        removeAllLesson(secondaryLesson.id);
      }

      // Collect subjects to reassign
      const subjectsToReassign = new Set();
      if (lessonToDelete.subject) {
        const deleteSubjectName = subjects.find(s => s.id === lessonToDelete.subject)?.name;
        if (deleteSubjectName) {
          subjectsToReassign.add(deleteSubjectName);
        } else {
          console.warn('Subject name not found for ID:', lessonToDelete.subject);
        }
      }
      if (lessonToDelete.is_allerlei && lessonToDelete.allerlei_subjects) {
        lessonToDelete.allerlei_subjects.forEach(sub => subjectsToReassign.add(sub));
      }

      // Update lessons after deletion
      let finalLessons = allLessons.filter(l => l.id !== lessonId && (!secondaryLesson || l.id !== secondaryLesson.id));

      // Reassign yearly lesson links for affected subjects
      await queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
      await queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
      for (const sub of subjectsToReassign) {
        if (sub) {
          finalLessons = await reassignYearlyLessonLinks(sub, finalLessons);
        }
      }

      setAllLessons(finalLessons);
      setIsModalOpen(false);
      setEditingLesson(null);
      queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
    } catch (error) {
      console.error("Critical error during lesson deletion, reloading data:", error);
      queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
    }
  }, [allLessons, yearlyLessons, currentWeek, queryClientLocal, currentYear, subjects, reassignYearlyLessonLinks, removeAllLesson, setAllLessons]);
  const handleCopyLayout = async () => {
      setIsCopying(true);
      const previousWeekNumber = currentWeek - 1;
      const lessonsToCopy = allLessons.filter(l => l.week_number === previousWeekNumber);
      if (lessonsToCopy.length === 0) {
          setIsCopying(false);
          return;
      }
  
      const newLessonPayloads = lessonsToCopy.map(l => ({
          subject: l.subject,
          day_of_week: l.day_of_week,
          period_slot: l.period_slot,
          start_time: l.start_time,
          end_time: l.end_time,
          is_double_lesson: l.is_double_lesson,
          is_exam: l.is_exam,
          is_allerlei: l.is_allerlei,
          is_half_class: l.is_half_class,
          allerlei_subjects: l.allerlei_subjects || [],
          description: "",
          yearly_lesson_id: null,
          second_yearly_lesson_id: null,
          allerlei_yearly_lesson_ids: [],
          week_number: currentWeek,
      }));
      try {
          if (newLessonPayloads.length > 0) {
            const createdLessons = await Lesson.bulkCreate(newLessonPayloads);
            let tempAllLessons = [...allLessons, ...createdLessons];
        
            const subjectsAffectedByCopy = new Set(createdLessons.map(l => subjects.find(s => s.id === l.subject)?.name)); // Geändert: Hole Namen aus IDs
            for (const subjectName of subjectsAffectedByCopy) {
                if (subjectName) {
                    tempAllLessons = await reassignYearlyLessonLinks(subjectName, tempAllLessons);
                }
            }
            setAllLessons(tempAllLessons);
          }
          // Invalidate queries after copy
          queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
          queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
      } catch (error) {
          console.error("Error copying week layout:", error);
          queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
          queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
      } finally {
          setIsCopying(false);
      }
  };
  const lessonsForCurrentWeek = useMemo(() => {
    return allLessons.filter(l => l.week_number === currentWeek);
  }, [allLessons, currentWeek]);
  const lessonsWithDetails = useMemo(() => {
    const yearlyLessonsById = new Map(yearlyLessons.map(yl => [yl.id, yl]));
    const topicsById = new Map(topics.map(t => [t.id, t]));
    const subjectsByName = subjects.reduce((acc, s) => { acc[s.name] = s; return acc; }, {});
    const dayOrder = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
    const lessonsToRender = lessonsForCurrentWeek.map(lesson => {
      const subjectsById = new Map(subjects.map(s => [s.id, s]));
      const subjectDetail = subjectsById.get(lesson.subject);
      const primaryYearlyLesson = lesson.yearly_lesson_id ? yearlyLessonsById.get(lesson.yearly_lesson_id) : null;
      const secondYearlyLesson = lesson.second_yearly_lesson_id ? yearlyLessonsById.get(lesson.second_yearly_lesson_id) : null;
      const topic = lesson.topic_id ? topicsById.get(lesson.topic_id) : (primaryYearlyLesson?.topic_id ? topicsById.get(primaryYearlyLesson.topic_id) : null);
      let lessonDetails = {
        ...lesson,
        subject: subjectDetail?.name || 'Unbekannt',
        color: subjectDetail?.color || "#3b82f6",
        topic: topic,
        isGradient: false,
        primaryYearlyLesson: primaryYearlyLesson,
        secondYearlyLesson: secondYearlyLesson,
      };
      // FIX: Always merge steps from separate Yearly lessons for display, even after swap
      let lessonSteps = lesson.is_allerlei ? lesson.steps || [] : primaryYearlyLesson?.steps || [];
      if (lesson.is_double_lesson && secondYearlyLesson) {
        lessonSteps = [...(primaryYearlyLesson?.steps || []), ...(secondYearlyLesson?.steps || [])];
        lessonDetails.steps = lessonSteps;
        const pNotes = primaryYearlyLesson?.notes || '';
        const sNotes = secondYearlyLesson?.notes || '';
        if (pNotes && sNotes) {
            lessonDetails.description = `${pNotes} + ${sNotes}`;
        } else {
            lessonDetails.description = pNotes || sNotes || `Doppellektion`;
        }
      } else if (primaryYearlyLesson) {
        lessonDetails.description = lesson.description || `Lektion ${primaryYearlyLesson.lesson_number}`;
        lessonDetails.steps = lessonSteps;
      }
      if (lesson.is_allerlei) {
        if (!lesson.description) {
            lessonDetails.description = `Allerlei: ${(lesson.allerlei_subjects || []).join(', ')}`;
        }
    
        const allSubjectsForGradient = [...new Set([subjectDetail?.name || 'Unbekannt', ...(lesson.allerlei_subjects || [])])]; // Geändert: Name statt ID
        const colors = allSubjectsForGradient.map(name => subjectsByName[name]?.color).filter(Boolean);
    
        if (colors.length > 1) {
          const sortedColors = [...colors].sort();
          const gradientParts = sortedColors.map((color, index) => {
            const angle = (index * 360) / sortedColors.length;
            const x = 50 + Math.cos(angle * Math.PI / 180) * 30;
            const y = 50 + Math.sin(angle * Math.PI / 180) * 30;
            return `radial-gradient(circle at ${x}% ${y}%, ${color} 0%, ${color}80 40%, transparent 70%)`;
          });
          const baseGradient = `linear-gradient(45deg, ${sortedColors[0]}40, ${sortedColors[sortedColors.length - 1]}40)`;
          lessonDetails.color = [baseGradient, ...gradientParts].join(', ');
          lessonDetails.isGradient = true;
        }
      }
      return lessonDetails;
    });
    return lessonsToRender;
  }, [lessonsForCurrentWeek, yearlyLessons, topics, subjects]);
  const subjectsForActiveClass = useMemo(() => {
    if (!activeClassId) return [];
    return subjects.filter(s => s.class_id === activeClassId);
  }, [subjects, activeClassId]);
  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };
  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;
    console.log('Debug: handleDragEnd started:', { activeId: active.id, overId: over.id });
    let affectedSubjects = new Set();
    const [targetDay, targetPeriodStr] = over.id.split('-');
    const targetPeriod = parseInt(targetPeriodStr, 10);
    let tempLessons = [...allLessons];
    let tempYearlyLessons = [...yearlyLessons];

    if (active.data.current.type === 'pool') {
      const subjectDetail = active.data.current.subject;
      console.log('Debug: Dragging from pool:', { subject: subjectDetail.name, targetDay, targetPeriod });
      if (allLessons.some(l => l.day_of_week === targetDay && l.period_slot === targetPeriod && l.week_number === currentWeek)) {
        console.warn('Target slot already occupied:', { targetDay, targetPeriod });
        return;
      }
      try {
        const timeSlot = timeSlots.find(ts => ts.period === targetPeriod);
        if (!timeSlot) {
          console.warn('No time slot found for period:', targetPeriod);
          return;
        }
        const subjectYearlyLessons = yearlyLessons
          .filter(yl =>
            yl.expand?.subject?.name === subjectDetail.name &&
            yl.week_number === currentWeek &&
            !allLessons.some(l => l.yearly_lesson_id === yl.id)
          )
          .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
        console.log('Debug: Available yearly lessons:', subjectYearlyLessons.map(yl => ({
          id: yl.id,
          lesson_number: yl.lesson_number,
          is_double_lesson: yl.is_double_lesson
        })));
        const nextAvailableYearlyLesson = subjectYearlyLessons[0];
        if (!nextAvailableYearlyLesson) {
          console.warn('No available YearlyLesson found for subject:', subjectDetail.name);
          return;
        }
        const newLessonPayload = {
          subject: subjectDetail.id,
          day_of_week: targetDay,
          period_slot: targetPeriod,
          start_time: timeSlot.start,
          end_time: timeSlot.end,
          week_number: currentWeek,
          description: "",
          yearly_lesson_id: nextAvailableYearlyLesson.id,
          second_yearly_lesson_id: nextAvailableYearlyLesson.is_double_lesson ? nextAvailableYearlyLesson.second_yearly_lesson_id : null,
          is_double_lesson: nextAvailableYearlyLesson.is_double_lesson || false,
          is_exam: nextAvailableYearlyLesson.is_exam || false,
          is_allerlei: nextAvailableYearlyLesson.is_allerlei || false,
          is_half_class: nextAvailableYearlyLesson.is_half_class || false,
          allerlei_subjects: nextAvailableYearlyLesson.allerlei_subjects || [],
          allerlei_yearly_lesson_ids: [],
          user_id: pb.authStore.model.id
        };
        console.log('Debug: Create lesson payload from pool:', newLessonPayload);
        const newLesson = await Lesson.create(newLessonPayload);
        tempLessons.push(newLesson);
        affectedSubjects.add(subjectDetail.name);
        if (newLesson.is_double_lesson && newLesson.second_yearly_lesson_id) {
          const nextPeriod = targetPeriod + 1;
          if (nextPeriod <= timeSlots.length && !allLessons.some(l => l.day_of_week === targetDay && l.period_slot === nextPeriod && l.week_number === currentWeek)) {
            const secondYearlyLesson = yearlyLessons.find(yl => yl.id === newLesson.second_yearly_lesson_id);
            if (secondYearlyLesson) {
              const secondLessonPayload = {
                subject: subjectDetail.id,
                day_of_week: targetDay,
                period_slot: nextPeriod,
                start_time: timeSlots.find(ts => ts.period === nextPeriod)?.start,
                end_time: timeSlots.find(ts => ts.period === nextPeriod)?.end,
                week_number: currentWeek,
                description: "",
                yearly_lesson_id: secondYearlyLesson.id,
                second_yearly_lesson_id: newLesson.yearly_lesson_id,
                is_double_lesson: true,
                is_exam: secondYearlyLesson.is_exam || false,
                is_allerlei: secondYearlyLesson.is_allerlei || false,
                is_half_class: secondYearlyLesson.is_half_class || false,
                allerlei_subjects: secondYearlyLesson.allerlei_subjects || [],
                allerlei_yearly_lesson_ids: [],
                user_id: pb.authStore.model.id
              };
              console.log('Debug: Create second lesson payload:', secondLessonPayload);
              const secondLesson = await Lesson.create(secondLessonPayload);
              tempLessons.push(secondLesson);
              optimisticUpdateAllLessons(secondLesson, true);
            } else {
              console.warn('Second YearlyLesson not found:', newLesson.second_yearly_lesson_id);
              await Lesson.update(newLesson.id, { is_double_lesson: false, second_yearly_lesson_id: null });
              await YearlyLesson.update(newLesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null });
              newLesson.is_double_lesson = false;
              newLesson.second_yearly_lesson_id = null;
              optimisticUpdateAllLessons(newLesson, true);
              optimisticUpdateYearlyLessons(newLesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null });
            }
          } else {
            console.warn('Next period not available for double lesson:', { targetDay, nextPeriod });
            await Lesson.update(newLesson.id, { is_double_lesson: false, second_yearly_lesson_id: null });
            await YearlyLesson.update(newLesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null });
            newLesson.is_double_lesson = false;
            newLesson.second_yearly_lesson_id = null;
            optimisticUpdateAllLessons(newLesson, true);
            optimisticUpdateYearlyLessons(newLesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null });
          }
        }
        // Verschiebe diese Aufrufe in den pool-Block
        await reassignYearlyLessonLinks(subjectDetail.name, tempLessons, tempYearlyLessons);
        const updatedYearlyLessons = await updateYearlyLessonOrder(subjectDetail.name, tempLessons, tempYearlyLessons);
        tempYearlyLessons = updatedYearlyLessons;
        await queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
        await queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
        await refetch();
        setAllLessons([...tempLessons]);
        setYearlyLessons([...tempYearlyLessons]);
        setRenderKey(prev => prev + 1);
      } catch (error) {
        console.error("Error creating lesson from pool:", error);
        queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
        return;
      }
    } else {
      const draggedLesson = active.data.current.lesson;
      console.log('Debug: Dragging lesson:', { lessonId: draggedLesson.id, yearlyLessonId: draggedLesson.yearly_lesson_id });
      let secondaryLesson = null;
      if (draggedLesson.is_double_lesson && draggedLesson.second_yearly_lesson_id) {
        secondaryLesson = tempLessons.find(l =>
          l.day_of_week === draggedLesson.day_of_week &&
          l.period_slot === draggedLesson.period_slot + 1 &&
          l.yearly_lesson_id === draggedLesson.second_yearly_lesson_id &&
          l.week_number === currentWeek
        );
      }
      const targetLesson = tempLessons.find(l => l.day_of_week === targetDay && l.period_slot === targetPeriod && l.week_number === currentWeek);
      if (targetLesson) {
        // Swap logic
        const updatedDragged = { ...draggedLesson, day_of_week: targetDay, period_slot: targetPeriod };
        const updatedTarget = { ...targetLesson, day_of_week: draggedLesson.day_of_week, period_slot: draggedLesson.period_slot };
        tempLessons = tempLessons.map(l =>
          l.id === updatedDragged.id ? updatedDragged :
          l.id === updatedTarget.id ? updatedTarget : l
        );
        optimisticUpdateAllLessons(updatedDragged);
        optimisticUpdateAllLessons(updatedTarget);
        affectedSubjects.add(subjects.find(s => s.id === draggedLesson.subject)?.name);
        affectedSubjects.add(subjects.find(s => s.id === targetLesson.subject)?.name);
        try {
          await Promise.all([
            Lesson.update(draggedLesson.id, { day_of_week: targetDay, period_slot: targetPeriod }),
            Lesson.update(targetLesson.id, { day_of_week: draggedLesson.day_of_week, period_slot: draggedLesson.period_slot })
          ]);
        } catch (error) {
          console.error("Error swapping lessons:", error);
          queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
          return;
        }
        if (secondaryLesson) {
          console.log('Debug: Removing double lesson flag for swapped lesson:', draggedLesson.id);
          await Lesson.update(updatedDragged.id, { is_double_lesson: false, second_yearly_lesson_id: null });
          await YearlyLesson.update(updatedDragged.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null });
          await Lesson.update(secondaryLesson.id, { is_double_lesson: false, second_yearly_lesson_id: null });
          await YearlyLesson.update(secondaryLesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null });
          tempLessons = tempLessons.map(l =>
            l.id === updatedDragged.id ? { ...l, is_double_lesson: false, second_yearly_lesson_id: null } :
            l.id === secondaryLesson.id ? { ...l, is_double_lesson: false, second_yearly_lesson_id: null } : l
          );
          optimisticUpdateAllLessons({ ...updatedDragged, is_double_lesson: false, second_yearly_lesson_id: null });
          optimisticUpdateAllLessons({ ...secondaryLesson, is_double_lesson: false, second_yearly_lesson_id: null });
          optimisticUpdateYearlyLessons(updatedDragged.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null });
          optimisticUpdateYearlyLessons(secondaryLesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null });
        }
      } else {
        // Move to free slot
        if (secondaryLesson) {
          const nextTarget = tempLessons.find(l => l.day_of_week === targetDay && l.period_slot === targetPeriod + 1 && l.week_number === currentWeek);
          if (nextTarget) {
            console.warn('Next slot not free for double lesson move');
            return;
          }
          const updatedPrimary = { ...draggedLesson, day_of_week: targetDay, period_slot: targetPeriod };
          const updatedSecondary = { ...secondaryLesson, day_of_week: targetDay, period_slot: targetPeriod + 1 };
          tempLessons = tempLessons.map(l =>
            l.id === updatedPrimary.id ? updatedPrimary :
            l.id === updatedSecondary.id ? updatedSecondary : l
          );
          optimisticUpdateAllLessons(updatedPrimary);
          optimisticUpdateAllLessons(updatedSecondary);
          affectedSubjects.add(subjects.find(s => s.id === draggedLesson.subject)?.name);
          try {
            await Promise.all([
              Lesson.update(draggedLesson.id, { day_of_week: targetDay, period_slot: targetPeriod }),
              Lesson.update(secondaryLesson.id, { day_of_week: targetDay, period_slot: targetPeriod + 1 })
            ]);
          } catch (error) {
            console.error("Error moving double lesson:", error);
            queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
            return;
          }
        } else {
          const updatedLesson = { ...draggedLesson, day_of_week: targetDay, period_slot: targetPeriod };
          tempLessons = tempLessons.map(l => l.id === updatedLesson.id ? updatedLesson : l);
          optimisticUpdateAllLessons(updatedLesson);
          affectedSubjects.add(subjects.find(s => s.id === draggedLesson.subject)?.name);
          try {
            await Lesson.update(draggedLesson.id, { day_of_week: targetDay, period_slot: targetPeriod });
          } catch (error) {
            console.error("Error moving lesson:", error);
            queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
            return;
          }
        }
      }
      // Check for invalid doubles after move/swap
      for (const lesson of tempLessons) {
        if (lesson.is_double_lesson && lesson.second_yearly_lesson_id) {
          const secondLesson = tempLessons.find(l =>
            l.yearly_lesson_id === lesson.second_yearly_lesson_id &&
            l.day_of_week === lesson.day_of_week &&
            l.period_slot === lesson.period_slot + 1
          );
          if (!secondLesson) {
            console.log('Debug: Removing double lesson flag for lesson:', lesson.id);
            await Lesson.update(lesson.id, { is_double_lesson: false, second_yearly_lesson_id: null });
            await YearlyLesson.update(lesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null });
            tempLessons = tempLessons.map(l =>
              l.id === lesson.id ? { ...l, is_double_lesson: false, second_yearly_lesson_id: null } : l
            );
            optimisticUpdateAllLessons({ ...lesson, is_double_lesson: false, second_yearly_lesson_id: null });
            optimisticUpdateYearlyLessons(lesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null });
          }
        }
      }
      // Reassign and update order for affected subjects
      for (const subjectName of affectedSubjects) {
        if (subjectName) {
          tempLessons = await reassignYearlyLessonLinks(subjectName, tempLessons, tempYearlyLessons);
          const updatedYearlyLessons = await updateYearlyLessonOrder(subjectName, tempLessons, tempYearlyLessons);
          tempYearlyLessons = updatedYearlyLessons;
        }
      }
      await queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
      await queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
      await refetch();
      setAllLessons([...tempLessons]);
      setYearlyLessons([...tempYearlyLessons]);
      setRenderKey(prev => prev + 1);
    }
  }, [allLessons, currentWeek, yearlyLessons, timeSlots, currentYear, queryClientLocal, refetch, subjects, activeClassId, optimisticUpdateAllLessons, optimisticUpdateYearlyLessons, reassignYearlyLessonLinks, updateYearlyLessonOrder, setAllLessons, setYearlyLessons]);
 
  const availableYearlyLessonsForPool = useMemo(() => {
    if (!activeClassId) return [];
    const subjectsForClass = subjects.filter(s => s.class_id === activeClassId);
    const uniqueSubjectsForClass = [...new Map(subjectsForClass.map(s => [s.name, s])).values()];
    const scheduledLessonsInWeek = allLessons.filter(l => l.week_number === currentWeek);
    const scheduledCounts = scheduledLessonsInWeek.reduce((acc, lesson) => {
      // Skip if this lesson is the secondary part of a double lesson
      const isSecondary = scheduledLessonsInWeek.some(primary =>
        primary.is_double_lesson &&
        primary.second_yearly_lesson_id === lesson.yearly_lesson_id &&
        primary.day_of_week === lesson.day_of_week &&
        primary.week_number === lesson.week_number &&
        primary.period_slot === lesson.period_slot - 1
      );
      if (isSecondary) {
        return acc; // Skip counting this secondary lesson
      }
      // Skip if lesson is secondary but not marked as double (edge case)
      if (lesson.second_yearly_lesson_id && !lesson.is_double_lesson) {
        return acc;
      }
      let lessonValue = lesson.is_double_lesson ? 2 : 1;
      if (lesson.is_half_class) {
        lessonValue *= 0.5;
      }
      const subjectsInvolved = lesson.is_allerlei && lesson.allerlei_subjects && lesson.allerlei_subjects.length > 0
        ? [...new Set([lesson.expand?.subject?.name, ...lesson.allerlei_subjects])]
        : [lesson.expand?.subject?.name];
      subjectsInvolved.forEach(subjectName => {
        if (subjectName) {
          if (!acc[subjectName]) acc[subjectName] = 0;
          acc[subjectName] += lessonValue;
        }
      });
      return acc;
    }, {});
    const result = uniqueSubjectsForClass.map(subject => {
      const totalScheduled = scheduledCounts[subject.name] || 0;
      const availableLessons = yearlyLessons
        .filter(yl =>
          yl.expand?.subject?.name === subject.name &&
          yl.week_number === currentWeek &&
          !scheduledLessonsInWeek.some(l => l.yearly_lesson_id === yl.id)
        )
        .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
      return {
        subject,
        totalScheduled,
        lessonsPerWeek: subject.lessons_per_week || 4,
        availableLessons
      };
    });
    console.log('Debug: availableYearlyLessonsForPool', result.map(s => ({
      subject: s.subject.name,
      totalScheduled: s.totalScheduled,
      lessonsPerWeek: s.lessonsPerWeek,
      availableLessons: s.availableLessons.map(l => ({
        id: l.id,
        lesson_number: l.lesson_number,
        is_double_lesson: l.is_double_lesson,
        second_yearly_lesson_id: l.second_yearly_lesson_id
      }))
    })));
    return result;
  }, [subjects, activeClassId, allLessons, yearlyLessons, currentWeek]);
  const renderDragOverlay = (id) => {
    if (id.startsWith('pool-')) {
      const subjectId = id.replace('pool-', '');
      const subjectData = availableYearlyLessonsForPool.find(s => String(s.subject.id) === subjectId);
      if (!subjectData) return null;
      return (
        <div className="rounded-lg border text-sm shadow-sm select-none cursor-grab" style={{ borderColor: `${subjectData.subject.color}80` }}>
          <div className="p-2" style={{ background: `linear-gradient(135deg, ${subjectData.subject.color} 0%, ${adjustColor(subjectData.subject.color, -20)} 100%)` }}>
            <div className="font-medium text-white text-center flex items-center justify-between">
              <span className="font-bold">{subjectData.subject.name}</span>
              <span className="text-xs opacity-90">
                ({subjectData.totalScheduled}/{subjectData.lessonsPerWeek})
              </span>
            </div>
          </div>
        </div>
      );
    } else {
      const lesson = lessonsWithDetails.find(l => l.id === id);
      if (!lesson) return null;
      return <LessonCard lesson={lesson} isDragging={true} onEdit={() => {}} />;
    }
  };
  const handlePrevWeek = () => {
      if (currentWeek > 1) {
          setCurrentWeek(w => w - 1);
      } else {
          setCurrentYear(prevYear => prevYear - 1);
          setCurrentWeek(52);
      }
  };
  const handleNextWeek = () => {
      if (currentWeek < ACADEMIC_WEEKS) {
          setCurrentWeek(w => w + 1);
      } else {
          setCurrentYear(prevYear => prevYear + 1);
          setCurrentWeek(1);
      }
  };
  const handlePrevDay = () => {
    const prevDate = new Date(currentDate);
    prevDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(prevDate);
  };
  const handleNextDay = () => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(nextDate);
  };
  return (
    <div className="min-h-full p-6 bg-slate-100 dark:bg-slate-900">
      <div className="max-w-full mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center items-center gap-4 mb-6 pt-4">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md backdrop-lg rounded-lg p-1 border border-slate-200 dark:border-slate-700 shadow-lg">
            {['Tag', 'Woche', 'Jahr'].map((view) => (
              <Button key={view} variant={currentView === view ? 'default' : 'ghost'} size="sm" onClick={() => handleViewChange(view)} className={`px-4 py-2 ${currentView === view ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                {view}
              </Button>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={currentView === 'Woche' ? handlePrevWeek : handlePrevDay}
            className="rounded-lg bg-white dark:bg-slate-800/80 backdrop-blur-md border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 shadow-md text-slate-800 dark:text-white"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          {currentView === 'Woche' ? (
            <div className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-lg shadow-md text-center w-48">
              <div>Woche {weekInfo.calendarWeek}</div>
              <div className="text-sm opacity-90">{weekInfo.mondayStr} - {weekInfo.fridayStr}</div>
            </div>
          ) : currentView === 'Tag' ? (
            <div className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-lg shadow-md text-center w-48">
              <div>{dayName}, {formatDate(currentDate)}</div>
            </div>
          ) : null}
          <Button
            variant="outline"
            size="icon"
            onClick={currentView === 'Woche' ? handleNextWeek : handleNextDay}
            className="rounded-lg bg-white dark:bg-slate-800/80 backdrop-blur-md border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 shadow-md text-slate-800 dark:text-white"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </motion.div>
        {viewMode === 'week' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToWindowEdges]}
          >
            <div className="flex gap-4 w-fit max-w-full h-auto overflow-x-auto mx-auto justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-slate-800 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex-grow w-auto overflow-hidden" // Bleibt gleich
              >
                {isLoading ? (
                  <CalendarLoader />
                ) : (
                  <TimetableGrid
                    ref={gridRef}
                    key={renderKey}
                    lessons={lessonsWithDetails}
                    onCreateLesson={handleCreateLesson}
                    onEditLesson={handleEditLesson}
                    currentWeek={currentWeek}
                    timeSlots={timeSlots}
                    holidays={holidays}
                    weekInfo={weekInfo}
                    onShowHover={handleShowHover}
                    onHideHover={handleHideHover}
                  />
                )}
              </motion.div>
          
              <div className="w-[250px] min-w-[200px] flex-shrink-0">
                <CopyWeekLayout
                  currentWeek={currentWeek}
                  allLessons={allLessons}
                  onCopyLayout={handleCopyLayout}
                  isLoading={isCopying}
                />
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-slate-800 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 h-fit"
                >
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Stundenpool</h3>
              
                  {classes.length > 0 && (
                    <div className="mb-4">
                      <select
                        value={activeClassId || ''}
                        onChange={(e) => setActiveClassId(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                      >
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
              
                  <div className="space-y-2">
                    {availableYearlyLessonsForPool.length > 0 ? (
                      availableYearlyLessonsForPool.map((subjectData) => (
                        <DraggableItem
                          key={`pool-${subjectData.subject.id}`}
                          id={`pool-${subjectData.subject.id}`}
                          data={{ type: 'pool', subject: subjectData.subject, totalScheduled: subjectData.totalScheduled, lessonsPerWeek: subjectData.lessonsPerWeek }}
                        >
                          <div
                            className={`rounded-xl border text-sm shadow-sm select-none transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-md p-2`} // Padding und rounded-xl in äußere div verschoben
                            style={{
                              borderColor: `${subjectData.subject.color}80`,
                              background: `linear-gradient(135deg, ${subjectData.subject.color} 0%, ${adjustColor(subjectData.subject.color, -20)} 100%)`
                            }}
                          >
                            <div className="p-2" style={{ background: `linear-gradient(135deg, ${subjectData.subject.color} 0%, ${adjustColor(subjectData.subject.color, -20)} 100%)` }}>
                              <div className="font-medium text-white text-center flex items-center justify-between">
                                <span className="font-bold">{subjectData.subject.name}</span>
                                <span className="text-xs opacity-90">
                                  ({subjectData.totalScheduled}/{subjectData.lessonsPerWeek})
                                </span>
                              </div>
                            </div>
                          </div>
                        </DraggableItem>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                          {activeClassId ? 'Alle Lektionen dieser Woche sind geplant.' : 'Bitte eine Klasse auswählen.'}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
            <div className="flex justify-center mt-2">
              <Button onClick={handlePrint} variant="outline">Drucken</Button>
            </div>
            <DragOverlay>
              {activeDragId ? renderDragOverlay(activeDragId) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <DailyView currentDate={currentDate} />
        )}
        {hoverLesson && (
          <OverlayView
            lesson={hoverLesson}
            schedule={{ workForms: { // Definiere WORK_FORMS hier oder importiere global
              'Single': '👤 Single',
              'Partner': '👥 Partner',
              'Group': '👨‍👩‍👧‍👦 Group',
              'Plenum': '🏛️ Plenum'
            }}}
            overlayRef={overlayRef}
            disableHover={disableHover}
            isDragging={!!activeDragId}
            onMouseMove={() => { if (debouncedShowRef.current) debouncedShowRef.current(hoverLesson, hoverPosition); }}
            onMouseLeave={() => { if (debouncedHideRef.current) debouncedHideRef.current(); }}
            position={hoverPosition}
            subjectColor={hoverLesson.color}
          />
        )}
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
          subjectColor={subjects.find(s => s.id === (editingLesson?.subject || initialSubjectForModal))?.color} // Geändert: Suche per ID
          initialSubject={initialSubjectForModal}
          subjects={subjects}
          topics={topics}
          activeClassId={activeClassId}
        />
      </div>
    </div>
  );
}