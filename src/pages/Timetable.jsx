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

const ACADEMIC_WEEKS = 52;

function getCurrentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + start.getDay() + 1) / 7);
}

function getWeekInfo(week, year) {
  const jan4 = new Date(year, 0, 4);
  const mondayOfWeek1 = new Date();
  mondayOfWeek1.setTime(jan4.getTime() - ((jan4.getDay() + 6) % 7) * 86400000);
  const monday = new Date();
  monday.setTime(mondayOfWeek1.getTime() + (week - 1) * 7 * 86400000);
  const friday = new Date();
  friday.setTime(monday.getTime() + 4 * 86400000);
  const mondayStr = monday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  const fridayStr = friday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
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
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
};

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
  const [disableHover, setDisableHover] = useState(false);
  const overlayRef = useRef(null);
  const debouncedShowRef = useRef(null);
  const debouncedHideRef = useRef(null);
  const handleShowHover = (lesson, event) => {
    if (disableHover) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      top: rect.top + window.scrollY,
      left: rect.right + window.scrollX + 10,
    };
    debouncedShowRef.current(lesson, position);
  };
  const handleHideHover = useCallback(() => {
    if (debouncedHideRef.current) debouncedHideRef.current();
  }, []);
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
    const handleResize = () => {
      if (settings.cellHeight && timeSlots?.length > 0) {
        const maxHeightPerCell = Math.min(settings.cellHeight, Math.floor((window.innerHeight - 280) / timeSlots.length));
        document.documentElement.style.setProperty('--cell-height', `${maxHeightPerCell}px`);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    document.documentElement.style.setProperty('--cell-width', `${settings.cellWidth || 120}px`);
    document.documentElement.style.setProperty('--cell-height', `${settings.cellHeight || 80}px`);
  }, [settings.cellWidth, settings.cellHeight]);
  const weekInfo = useMemo(() => getWeekInfo(currentWeek, currentYear), [currentWeek, currentYear]);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
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
  const { data, isLoading: queryLoading, error: queryError, refetch } = useQuery({
    queryKey: ['timetableData', currentYear, currentWeek],
    queryFn: async () => {
      const userId = pb.authStore.model?.id;
      if (!userId) {
        console.error('No user ID available for query');
        return {
          lessonsData: [],
          yearlyLessonsData: [],
          allerleiLessonsData: [],
          topicsData: [],
          subjectsData: [],
          classesData: [],
          settingsData: [],
          holidaysData: []
        };
      }
      try {
        const [lessonsData, yearlyLessonsData, allerleiLessonsData, topicsData, subjectsData, classesData, settingsData, holidaysData] = await Promise.all([
          Lesson.list({ user_id: userId }).catch(err => {
            console.error('Error fetching lessons:', err?.data ? JSON.stringify(err.data) : err.message);
            return [];
          }),
          YearlyLesson.list({ user_id: userId }).catch(err => {
            console.error('Error fetching yearly lessons:', err?.data ? JSON.stringify(err.data) : err.message);
            return [];
          }),
          AllerleiLesson.list({ user_id: userId }).catch(err => {
            console.error('Error fetching allerlei lessons:', err?.data ? JSON.stringify(err.data) : err.message);
            return [];
          }),
          Topic.list({ 'class_id.user_id': userId }).catch(err => {
            console.error('Error fetching topics:', err?.data ? JSON.stringify(err.data) : err.message);
            return [];
          }),
          Subject.list({ 'class_id.user_id': userId }).catch(err => {
            console.error('Error fetching subjects:', err?.data ? JSON.stringify(err.data) : err.message);
            return [];
          }),
          Class.list({ user_id: userId }).catch(err => {
            console.error('Error fetching classes:', err?.data ? JSON.stringify(err.data) : err.message);
            return [];
          }),
          Setting.list({ user_id: userId }).catch(err => {
            console.error('Error fetching settings:', err?.data ? JSON.stringify(err.data) : err.message);
            return [];
          }),
          Holiday.list({ user_id: userId }).catch(err => {
            console.error('Error fetching holidays:', err?.data ? JSON.stringify(err.data) : err.message);
            return [];
          }),
        ]);
        console.log('Debug: Raw query response:', {
          lessonsCount: lessonsData.length,
          yearlyLessonsCount: yearlyLessonsData.length,
          allerleiLessonsCount: allerleiLessonsData.length,
          topicsCount: topicsData.length,
          subjectsCount: subjectsData.length,
          classesCount: classesData.length,
          settingsCount: settingsData.length,
          holidaysCount: holidaysData.length,
        });
        return {
          lessonsData: lessonsData || [],
          yearlyLessonsData: yearlyLessonsData || [],
          allerleiLessonsData: allerleiLessonsData || [],
          topicsData: topicsData || [],
          subjectsData: subjectsData || [],
          classesData: classesData || [],
          settingsData: settingsData || [],
          holidaysData: holidaysData || []
        };
      } catch (error) {
        console.error('Critical error in timetableData query:', error?.data ? JSON.stringify(error.data) : error.message);
        import('react-hot-toast').then(({ toast }) => {
          toast.error('Fehler beim Laden der Daten. Überprüfen Sie die Konsole.');
        });
        throw error;
      }
    },
    staleTime: 300000,
  });
  useEffect(() => {
    const initializeData = async () => {
      if (!pb.authStore.isValid || !pb.authStore.model) {
        console.error('No valid auth, cannot initialize data');
        setIsLoading(false);
        return;
      }
      const currentUserId = pb.authStore.model.id;
      if (!currentUserId) {
        console.error('No user ID available');
        setIsLoading(false);
        return;
      }
      if (data) {
        const hasPendingChanges = allLessons.some(l => l.id && l.id.startsWith('temp-'));
        if (!hasPendingChanges) {
          console.log('Debug: Setting lessons from fetched data', {
            fetchedLessons: data.lessonsData?.length || 0,
            allLessonsIds: data.lessonsData?.map(l => l.id) || [],
          });
          setAllLessons(data.lessonsData || []);
        }
        console.log('Debug: Setting yearlyLessons', {
          yearlyLessons: data.yearlyLessonsData?.map(l => ({
            id: l.id,
            lesson_number: l.lesson_number,
            subject: l.expand?.subject?.name,
            subject_name: l.subject_name,
            week_number: l.week_number,
            class_id: l.class_id,
          })) || [],
        });
        setYearlyLessons(data.yearlyLessonsData?.map(l => ({ ...l, lesson_number: Number(l.lesson_number) })) || []);
        setAllerleiLessons(data.allerleiLessonsData || []);
        console.log('Debug: Setting allerleiLessons', {
          allerleiLessons: data.allerleiLessonsData?.map(l => ({
            id: l.id,
            primary_yearly_lesson_id: l.primary_yearly_lesson_id,
            added_yearly_lesson_ids: l.added_yearly_lesson_ids,
            description: l.description,
            week_number: l.week_number,
          })) || [],
        });
        setTopics(data.topicsData || []);
        console.log('Debug: Subjects data:', data.subjectsData.map(s => ({
          id: s.id,
          name: s.name,
          class_id: s.class_id,
        })));
        console.log('Debug: YearlyLessons data:', data.yearlyLessonsData.map(yl => ({
          id: yl.id,
          subject_name: yl.subject_name,
          subject_id: yl.subject,
          week_number: yl.week_number,
          lesson_number: yl.lesson_number,
          class_id: yl.class_id,
        })));
        setSubjects(data.subjectsData || []);
        if (!data.subjectsData.some(s => s.name === 'Mathematik') && activeClassId) {
          try {
            const newSubject = await Subject.create({
              name: 'Mathematik',
              class_id: activeClassId,
              user_id: currentUserId,
              color: '#3b82f6',
              lessons_per_week: 4,
            });
            setSubjects(prev => [...prev, newSubject]);
            console.log('Created missing subject: Mathematik', newSubject);
            queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
          } catch (error) {
            console.error('Error creating subject Mathematik:', error?.data ? JSON.stringify(error.data) : error.message);
            import('react-hot-toast').then(({ toast }) => {
              toast.error('Fehler beim Erstellen des Fachs Mathematik.');
            });
          }
        }
        setClasses(data.classesData || []);
        console.log('Debug: Fetched classesData:', {
          length: data.classesData?.length || 0,
          classes: data.classesData?.map(c => ({ id: c.id, name: c.name, user_id: c.user_id })) || [],
          currentUserId,
          activeClassIdBefore: activeClassId,
        });
        if (Array.isArray(data.classesData) && data.classesData.length === 0) {
          console.log('Debug: No classes found, attempting to create default...');
          try {
            const defaultClass = await Class.create({
              name: 'Default Klasse',
              user_id: currentUserId,
              year: currentYear,
            });
            console.log('Created default class:', defaultClass);
            setClasses([defaultClass]);
            setActiveClassId(defaultClass.id);
            queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
            await refetch();
            import('react-hot-toast').then(({ toast }) => {
              toast.success('Default-Klasse erstellt. Stundenplan sollte nun laden.');
            });
          } catch (error) {
            console.error('Error creating default class:', error?.data ? JSON.stringify(error.data) : error.message);
            import('react-hot-toast').then(({ toast }) => {
              toast.error('Fehler beim Erstellen der Default-Klasse. Überprüfen Sie die Konsole.');
            });
          }
        } else if (data.classesData.length > 0 && !activeClassId) {
          const firstClassId = data.classesData[0].id;
          setActiveClassId(firstClassId);
          console.log('Debug: Set activeClassId to first class:', firstClassId);
          const subjectsForClass = data.subjectsData.filter(s => s.class_id === firstClassId);
          console.log('Debug: Subjects for selected class:', {
            classId: firstClassId,
            subjectsCount: subjectsForClass.length,
            subjects: subjectsForClass.map(s => ({ id: s.id, name: s.name })),
          });
        }
        setHolidays(data.holidaysData || []);
        if (data.settingsData?.length > 0) {
          const latestSettings = data.settingsData.sort((a, b) => new Date(b.updated) - new Date(a.updated))[0];
          console.log('Debug: Selected latest settings', {
            id: latestSettings.id,
            updated: latestSettings.updated,
          });
          setSettings(latestSettings);
        } else {
          const defaultSettings = {
            user_id: currentUserId,
            startTime: '08:00',
            lessonsPerDay: 8,
            lessonDuration: 45,
            shortBreak: 5,
            morningBreakAfter: 2,
            morningBreakDuration: 20,
            lunchBreakAfter: 4,
            lunchBreakDuration: 40,
            afternoonBreakAfter: 6,
            afternoonBreakDuration: 15,
            cellWidth: 120,
            cellHeight: 80,
          };
          try {
            console.log('Creating default settings with payload:', defaultSettings);
            const newSettings = await Setting.create(defaultSettings);
            setSettings(newSettings);
            queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
          } catch (error) {
            if (error.status === 409) {
              console.log('Unique constraint violation, fetching existing settings');
              const existingSettings = await Setting.findOne({ user_id: currentUserId });
              if (existingSettings) {
                setSettings(existingSettings);
              } else {
                console.error('Failed to fetch existing settings after 409 error:', error?.data ? JSON.stringify(error.data) : error);
              }
            } else {
              console.error('Failed to create default settings:', error?.data ? JSON.stringify(error.data) : error);
            }
          }
        }
      }
      setIsLoading(queryLoading);
    };
    initializeData();
  }, [data, queryLoading, activeClassId, setAllLessons, setYearlyLessons, setAllerleiLessons, setTopics, setSubjects, setClasses, setHolidays, setSettings, queryClientLocal, currentYear, currentWeek, refetch]);
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
    printWin.document.write('<html>');
    printWin.document.write(document.head.innerHTML);
    printWin.document.write('<body>');
    printWin.document.write(gridRef.current.outerHTML);
    printWin.document.write('</body>');
    printWin.document.write('</html>');
    printWin.document.close();
    printWin.focus();
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
  const reassignYearlyLessonLinks = useCallback(async (subjectName, currentLessons, yearlyLessonsParam = yearlyLessons) => {
    const dayOrder = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
    const lessonsForSubject = currentLessons
      .filter(l => 
        l.expand?.subject?.name === subjectName &&
        l.week_number === currentWeek &&
        (!l.is_allerlei || (l.is_allerlei === false && l.yearly_lesson_id))
      )
      .sort((a, b) => {
        const dayDiff = dayOrder[a.day_of_week] - dayOrder[b.day_of_week];
        return dayDiff !== 0 ? dayDiff : a.period_slot - b.period_slot;
      });
    const integratedYearlyIds = new Set();
    currentLessons
      .filter(l => l.is_allerlei && l.week_number === currentWeek)
      .forEach(l => l.allerlei_yearly_lesson_ids?.forEach(id => {
        if (id) integratedYearlyIds.add(id);
      }));
    const yearlyLessonsForSubject = yearlyLessonsParam
      .filter(yl => yl.expand?.subject?.name === subjectName && yl.week_number === currentWeek)
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
    const normalYearlies = yearlyLessonsForSubject
      .filter(yl => !yl.is_half_class && !integratedYearlyIds.has(yl.id))
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
    const halfYearlies = yearlyLessonsForSubject
      .filter(yl => yl.is_half_class && !integratedYearlyIds.has(yl.id))
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
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
        if (normalIndex < normalYearlies.length) {
          yearlyLessonToLink = normalYearlies[normalIndex++];
        }
      } else {
        if (halfCount === 0) {
          if (halfIndex < halfYearlies.length) {
            currentHalfYl = halfYearlies[halfIndex++];
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
          is_hidden: false,
        };
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
                  is_hidden: false
                };
                updatePromises.push(Lesson.update(nextLesson.id, updateDataNext));
                const updatedNext = { ...nextLesson, ...updateDataNext };
                updatedLessonsMap.set(nextLesson.id, updatedNext);
                i++;
              } else {
                updatePromises.push(Lesson.update(lesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }));
                updatedLessonsMap.set(lesson.id, { ...lesson, is_double_lesson: false, second_yearly_lesson_id: null });
              }
            } else {
              updatePromises.push(Lesson.update(lesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }));
              updatedLessonsMap.set(lesson.id, { ...lesson, is_double_lesson: false, second_yearly_lesson_id: null });
            }
          } else {
            updatePromises.push(Lesson.update(lesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }));
            updatedLessonsMap.set(lesson.id, { ...lesson, is_double_lesson: false, second_yearly_lesson_id: null });
          }
        }
      } else {
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
    for (const lesson of lessonsForSubject) {
      const mappedLesson = updatedLessonsMap.get(lesson.id);
      if (mappedLesson.is_double_lesson && mappedLesson.second_yearly_lesson_id) {
        const secondLesson = Array.from(updatedLessonsMap.values()).find(l =>
          l.yearly_lesson_id === mappedLesson.second_yearly_lesson_id &&
          l.day_of_week === mappedLesson.day_of_week &&
          l.period_slot === mappedLesson.period_slot + 1
        );
        if (!secondLesson) {
          updatePromises.push(Lesson.update(mappedLesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }));
          updatedLessonsMap.set(mappedLesson.id, { ...mappedLesson, is_double_lesson: false, second_yearly_lesson_id: null });
        }
      }
    }
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
    contributingEvents.sort((a, b) => {
      const dayDiff = a.dayOrder - b.dayOrder;
      return dayDiff !== 0 ? dayDiff : a.period - b.period;
    });
    const orderedScheduledYearlyIds = [];
    let i = 0;
    while (i < contributingEvents.length) {
      const event = contributingEvents[i];
      if (event.type === 'linked' && event.ylId && !orderedScheduledYearlyIds.includes(event.ylId)) {
        orderedScheduledYearlyIds.push(event.ylId);
        if (event.isDouble && event.secondYlId) {
          const nextEvent = contributingEvents[i + 1];
          if (nextEvent && nextEvent.ylId === event.secondYlId && nextEvent.dayOrder === event.dayOrder && nextEvent.period === event.period + 1) {
            orderedScheduledYearlyIds.push(event.secondYlId);
            i++;
          }
        }
      } else if (event.type === 'integrated' && event.ylId && !orderedScheduledYearlyIds.includes(event.ylId)) {
        orderedScheduledYearlyIds.push(event.ylId);
      }
      i++;
    }
    const allYearlyForSubject = yearlyLessonsParam
      .filter(yl => yl.expand?.subject?.name === subjectName && yl.week_number === currentWeek)
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
    const unlinkedYearly = allYearlyForSubject
      .filter(yl => !orderedScheduledYearlyIds.includes(yl.id))
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
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
    if (!lessonData) {
      await refetch();
      return;
    }
    const originalLesson = editingLesson;
    let subjectsToReassign = new Set();
    if (!Array.isArray(toDeleteIds)) {
      toDeleteIds = toDeleteIds ? [toDeleteIds] : [];
    }
    try {
      let oldLesson = null;
      if (!lessonData.isNew) {
        oldLesson = allLessons.find(l => l.id === lessonData.id);
      }
      if (lessonData.collectionName === 'allerlei_lessons') {
        if (lessonData.isNew) {
          addAllerleiLesson(lessonData);
        } else {
          optimisticUpdateAllerleiLessons(lessonData.id, lessonData);
        }
        if (lessonData.allerlei_subjects) {
          lessonData.allerlei_subjects.forEach(sub => subjectsToReassign.add(sub));
        }
      } else {
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
          createDataWithoutSteps.user_id = pb.authStore.model.id;
          console.log('Create payload for lesson:', createDataWithoutSteps);
          const newLesson = await Lesson.create(createDataWithoutSteps);
          if (!newLesson.yearly_lesson_id && !newLesson.is_allerlei && newLesson.subject) {
            const existingYearlyForSub = yearlyLessons
              .filter(yl => yl.subject === newLesson.subject && yl.week_number === newLesson.week_number)
              .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
            const nextLessonNumber = existingYearlyForSub.length > 0
              ? Math.max(...existingYearlyForSub.map(yl => Number(yl.lesson_number))) + 1
              : 1;
            const newYearlyLesson = await YearlyLesson.create({
              subject: newLesson.subject,
              week_number: newLesson.week_number,
              lesson_number: nextLessonNumber,
              school_year: currentYear,
              name: lessonData.name || `Lektion ${nextLessonNumber} für ${subjects.find(s => s.id === newLesson.subject)?.name || 'Unbekannt'}`,
              steps: lessonData.steps?.filter(s => !s.id?.startsWith('second-')) || [],
              topic_id: newLesson.topic_id || null,
              is_double_lesson: newLesson.is_double_lesson || false,
              second_yearly_lesson_id: newLesson.second_yearly_lesson_id || null,
              is_exam: newLesson.is_exam || false,
              is_half_class: newLesson.is_half_class || false,
              user_id: pb.authStore.model.id,
              class_id: activeClassId
            });
            await Lesson.update(newLesson.id, { yearly_lesson_id: newYearlyLesson.id });
            newLesson.yearly_lesson_id = newYearlyLesson.id;
            optimisticUpdateYearlyLessons(newYearlyLesson, true);
          }
          optimisticUpdateAllLessons(newLesson, true);
          if (newLesson.yearly_lesson_id && !newLesson.is_allerlei) {
            const yearlyLessonToUpdate = yearlyLessons.find(yl => yl.id === newLesson.yearly_lesson_id);
            if (yearlyLessonToUpdate) {
              const yearlyUpdateData = {
                steps: lessonData.steps?.filter(s => !s.id?.startsWith('second-')) || [],
                topic_id: newLesson.topic_id || null,
                is_double_lesson: newLesson.is_double_lesson || false,
                second_yearly_lesson_id: newLesson.second_yearly_lesson_id || null,
                is_exam: newLesson.is_exam || false,
                is_allerlei: newLesson.is_allerlei || false,
                is_half_class: newLesson.is_half_class || false,
                name: lessonData.name || yearlyLessonToUpdate.name || `Lektion ${yearlyLessonToUpdate.lesson_number}`
              };
              console.log('Syncing new weekly lesson back to yearly lesson:', yearlyLessonToUpdate.id, yearlyUpdateData);
              await YearlyLesson.update(yearlyLessonToUpdate.id, yearlyUpdateData);
              optimisticUpdateYearlyLessons(yearlyLessonToUpdate.id, yearlyUpdateData);
            }
          }
          if (lessonData.is_half_class && lessonData.isNew) {
            const nextPeriod = lessonData.period_slot + 1;
            if (nextPeriod <= timeSlots.length && !allLessons.some(l => l.day_of_week === lessonData.day_of_week && l.period_slot === nextPeriod && l.week_number === currentWeek)) {
              const copyData = { ...lessonData, period_slot: nextPeriod, id: null, yearly_lesson_id: newLesson.yearly_lesson_id };
              const copyLesson = await Lesson.create(copyData);
              optimisticUpdateAllLessons(copyLesson, true);
            }
          } else if (!lessonData.is_half_class && originalLesson?.is_half_class) {
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
          if (oldLesson && oldLesson.is_allerlei && !lessonData.is_allerlei) {
            const originalYearlyLessonId = oldLesson.allerlei_yearly_lesson_ids?.[0] || oldLesson.yearly_lesson_id;
            if (originalYearlyLessonId) {
              updateDataWithoutSteps.yearly_lesson_id = originalYearlyLessonId;
              const originalYearlyLesson = yearlyLessons.find(yl => yl.id === originalYearlyLessonId);
              if (originalYearlyLesson) {
                await YearlyLesson.update(originalYearlyLessonId, {
                  name: lessonData.name || originalYearlyLesson.name || `Lektion ${originalYearlyLesson.lesson_number}`,
                  steps: steps?.filter(s => !s.id?.startsWith('second-')) || [],
                  topic_id: lessonData.topic_id || null,
                  is_double_lesson: lessonData.is_double_lesson || false,
                  second_yearly_lesson_id: lessonData.second_yearly_lesson_id || null,
                  is_exam: lessonData.is_exam || false,
                  is_allerlei: false,
                  is_half_class: lessonData.is_half_class || false
                });
              }
            }
            const oldSubs = oldLesson.allerlei_subjects || [];
            oldSubs.forEach(sub => subjectsToReassign.add(sub));
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
                steps: steps?.filter(s => !s.id?.startsWith('second-')) || [],
                topic_id: updatedLesson.topic_id || null,
                is_double_lesson: updatedLesson.is_double_lesson || false,
                second_yearly_lesson_id: updatedLesson.second_yearly_lesson_id || null,
                is_exam: updatedLesson.is_exam || false,
                is_half_class: updatedLesson.is_half_class || false,
                name: lessonData.name || yearlyLessonToUpdate.name || `Lektion ${yearlyLessonToUpdate.lesson_number}`
              };
              console.log('Syncing updated weekly lesson back to yearly lesson:', yearlyLessonToUpdate.id, yearlyUpdateData);
              await YearlyLesson.update(yearlyLessonToUpdate.id, yearlyUpdateData);
              optimisticUpdateYearlyLessons(yearlyLessonToUpdate.id, yearlyUpdateData);
            }
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
              name: lessonData.name || primaryYL.name || `Lektion ${primaryYL.lesson_number}`
            };
            await YearlyLesson.update(primaryYL.id, primaryUpdate);
            await YearlyLesson.update(secondYL.id, {
              steps: sSteps,
              is_double_lesson: true,
              name: lessonData.second_name || secondYL.name || `Lektion ${Number(primaryYL.lesson_number) + 1}`
            });
            optimisticUpdateYearlyLessons(primaryYL.id, primaryUpdate);
            optimisticUpdateYearlyLessons(secondYL.id, {
              steps: sSteps,
              is_double_lesson: true,
              name: lessonData.second_name || secondYL.name || `Lektion ${Number(primaryYL.lesson_number) + 1}`
            });
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
      const refreshedYearly = await YearlyLesson.list();
      if (!refreshedYearly) {
        console.error('Failed to fetch refreshed yearly lessons');
        throw new Error('Failed to fetch yearly lessons');
      }
      console.log('Debug: Updated yearlyLessons after save', {
        affectedSubjects: [...subjectsToReassign],
        yearlyLessons: refreshedYearly.map(l => ({
          id: l.id,
          lesson_number: l.lesson_number,
          subject_name: l.expand?.subject?.name || l.subject_name
        }))
      });
      setYearlyLessons(refreshedYearly.map(l => ({ ...l, lesson_number: Number(l.lesson_number) })));
      let finalLessons = allLessons;
      for (const sub of subjectsToReassign) {
        if (sub) {
          finalLessons = await reassignYearlyLessonLinks(sub, finalLessons);
        }
      }
      setAllLessons(JSON.parse(JSON.stringify(finalLessons)));
      console.log('Set deep-copied finalLessons:', finalLessons);
      await refetch();
      queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
      setIsModalOpen(false);
      setEditingLesson(null);
      setInitialSubjectForModal(null);
      setCopiedLesson(null);
      queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
    } catch (error) {
      setYearlyLessons(yearlyLessons);
      setAllLessons(allLessons);
      console.error("Error saving lesson:", error);
      queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
    }
  }, [editingLesson, currentYear, allLessons, yearlyLessons, timeSlots, currentWeek, queryClientLocal, subjects, optimisticUpdateAllLessons, optimisticUpdateYearlyLessons, addAllerleiLesson, removeAllLesson, setAllLessons, setYearlyLessons, activeClassId]);
  const handleDeleteLesson = useCallback(async (lessonId) => {
    const lessonToDelete = allLessons.find(l => l.id === lessonId);
    if (!lessonToDelete) return;
    let subjectsToReassign = new Set();
    const subjectName = subjects.find(s => s.id === lessonToDelete.subject)?.name;
    if (subjectName) subjectsToReassign.add(subjectName);
    if (lessonToDelete.is_allerlei && lessonToDelete.allerlei_subjects) {
      lessonToDelete.allerlei_subjects.forEach(sub => subjectsToReassign.add(sub));
    }
    try {
      if (lessonToDelete.collectionName === 'allerlei_lessons') {
        await allerleiService.unlink(lessonToDelete.id, allLessons, timeSlots, currentWeek);
        queryClient.invalidateQueries(['timetableData', currentYear, currentWeek]);
        queryClient.invalidateQueries(['yearlyData', currentYear]);
        await refetch();
      }
      await Lesson.delete(lessonId);
      removeAllLesson(lessonId);
      let finalLessons = allLessons.filter(l => l.id !== lessonId);
      for (const sub of subjectsToReassign) {
        if (sub) {
          finalLessons = await reassignYearlyLessonLinks(sub, finalLessons);
        }
      }
      setAllLessons(finalLessons);
      await refetch();
      queryClient.invalidateQueries(['timetableData', currentYear, currentWeek]);
      queryClient.invalidateQueries(['yearlyData', currentYear]);
    } catch (error) {
      console.error('Error deleting lesson:', error);
      queryClient.invalidateQueries(['timetableData', currentYear, currentWeek]);
    }
  }, [allLessons, subjects, currentYear, currentWeek, queryClient, removeAllLesson, setAllLessons, refetch, reassignYearlyLessonLinks]);
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
        const subjectsAffectedByCopy = new Set(createdLessons.map(l => subjects.find(s => s.id === l.subject)?.name));
        for (const subjectName of subjectsAffectedByCopy) {
          if (subjectName) {
            tempAllLessons = await reassignYearlyLessonLinks(subjectName, tempAllLessons);
          }
        }
        setAllLessons(tempAllLessons);
      }
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
    return [...allLessons, ...allerleiLessons].filter(l => l.week_number === currentWeek);
  }, [allLessons, allerleiLessons, currentWeek]);
  const [lessonsWithDetails, setLessonsWithDetails] = useState([]);
  useEffect(() => {
    const computeLessonsWithDetails = async () => {
      const yearlyLessonsById = new Map(yearlyLessons.map(yl => [yl.id, yl]));
      const topicsById = new Map(topics.map(t => [t.id, t]));
      const subjectsByName = subjects.reduce((acc, s) => { acc[s.name] = s; return acc; }, {});
      const resolvedLessons = await Promise.all(lessonsForCurrentWeek.map(async (lesson) => {
        const subjectsById = new Map(subjects.map(s => [s.id, s]));
        const subjectDetail = subjectsById.get(lesson.subject);
        const primaryYearlyLesson = lesson.yearly_lesson_id ? yearlyLessonsById.get(lesson.yearly_lesson_id) : null;
        const secondYearlyLesson = lesson.second_yearly_lesson_id ? yearlyLessonsById.get(lesson.second_yearly_lesson_id) : null;
        const topic = lesson.topic_id ? topicsById.get(lesson.topic_id) : (primaryYearlyLesson?.topic_id ? topicsById.get(primaryYearlyLesson.topic_id) : null);
        let lessonDetails = {
          ...lesson,
          subject: lesson.subject,
          subject_name: lesson.subject_name || subjectDetail?.name || 'Unbekannt',
          color: subjectDetail?.color || "#3b82f6",
          topic: topic,
          isGradient: false,
          primaryYearlyLesson: primaryYearlyLesson,
          secondYearlyLesson: secondYearlyLesson,
        };
        if (lesson.collectionName === 'allerlei_lessons') {
          lessonDetails = await normalizeAllerleiData(lesson, subjects, lesson.subject);
        } else {
          let lessonSteps = lesson.is_allerlei ? lesson.steps || [] : primaryYearlyLesson?.steps || [];
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
            lessonDetails.description = lesson.description || `Lektion ${primaryYearlyLesson.lesson_number}`;
            lessonDetails.steps = lessonSteps;
          }
          if (lesson.is_allerlei) {
            if (!lesson.description) {
              lessonDetails.description = `Allerlei: ${(lesson.allerlei_subjects || []).join(', ')}`;
            }
            const allSubjectsForGradient = [...new Set([subjectDetail?.name || 'Unbekannt', ...(lesson.allerlei_subjects || [])])];
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
        }
        return lessonDetails;
      }));
      setLessonsWithDetails(resolvedLessons);
    };
    computeLessonsWithDetails();
  }, [lessonsForCurrentWeek, yearlyLessons, topics, subjects]);
  const subjectsForActiveClass = useMemo(() => {
    if (!activeClassId) return [];
    return subjects.filter(s => s.class_id === activeClassId);
  }, [subjects, activeClassId]);
  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };
  const findAlternativeSlot = useCallback((lessons, targetDay, startPeriod, timeSlots, currentWeek) => {
    for (let p = startPeriod + 2; p <= timeSlots.length; p++) {
      if (!lessons.some(l => l.day_of_week === targetDay && l.period_slot === p && l.week_number === currentWeek)) {
        return { day: targetDay, period: p };
      }
    }
    const nextDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayIndex = nextDays.indexOf(targetDay);
    if (dayIndex < nextDays.length - 1) {
      const nextDay = nextDays[dayIndex + 1];
      for (let p = 1; p <= timeSlots.length; p++) {
        if (!lessons.some(l => l.day_of_week === nextDay && l.period_slot === p && l.week_number === currentWeek)) {
          return { day: nextDay, period: p };
        }
      }
    }
    return null;
  }, [timeSlots.length]);
  const handleDragEnd = useCallback(async (event) => {
    console.log('Debug: handleDragEnd gestartet:', new Date().toISOString());
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) {
      console.log('Debug: Kein over-Target, Abbruch.');
      return;
    }
    console.log('Debug: handleDragEnd started:', { activeId: active.id, overId: over.id });
    let affectedSubjects = new Set();
    const [targetDay, targetPeriodStr] = over.id.split('-');
    const targetPeriod = parseInt(targetPeriodStr, 10);
    if (isNaN(targetPeriod)) {
      console.warn('Invalid targetPeriod:', targetPeriodStr);
      return;
    }
    let tempLessons = [...lessonsForCurrentWeek];
    let tempYearlyLessons = [...yearlyLessons];
    const freshYearlyLessons = await YearlyLesson.list({ user_id: pb.authStore.model.id });
    tempYearlyLessons = freshYearlyLessons;
    setYearlyLessons(tempYearlyLessons);
    if (active.data.current.type === 'pool') {
      const subjectDetail = active.data.current.subject;
      console.log('Debug: Dragging from pool:', { subject: subjectDetail.name, subjectId: subjectDetail.id, targetDay, targetPeriod });
      if (tempLessons.some(l => l.day_of_week === targetDay && l.period_slot === targetPeriod && l.week_number === currentWeek)) {
        console.warn('Target slot already occupied:', { targetDay, targetPeriod });
        import('react-hot-toast').then(({ toast }) => {
          toast.error('Der gewählte Zeitraum ist bereits belegt.');
        });
        return;
      }
      try {
        const timeSlot = timeSlots.find(ts => ts.period === targetPeriod);
        if (!timeSlot) {
          console.warn('No time slot found for period:', targetPeriod);
          import('react-hot-toast').then(({ toast }) => {
            toast.error('Kein Zeitfenster für diese Periode gefunden.');
          });
          return;
        }
        console.log('Debug: All yearlyLessons for current week:', tempYearlyLessons.filter(yl => yl.week_number === currentWeek).map(yl => ({
          id: yl.id,
          subject: yl.expand?.subject?.name || yl.subject_name,
          subject_id: yl.subject,
          lesson_number: yl.lesson_number,
          is_assigned: tempLessons.some(l => l.yearly_lesson_id === yl.id && l.week_number === currentWeek),
        })));
        const subjectYearlyLessons = tempYearlyLessons
          .filter(yl => {
            const matchesSubject = yl.subject === subjectDetail.id || yl.expand?.subject?.name === subjectDetail.name || yl.subject_name === subjectDetail.name;
            const matchesWeek = yl.week_number === currentWeek;
            const isNotScheduled = !tempLessons.some(l => {
              if (l.collectionName === 'allerlei_lessons') {
                return (
                  l.primary_yearly_lesson_id === yl.id ||
                  (Array.isArray(l.added_yearly_lesson_ids) ? l.added_yearly_lesson_ids.includes(yl.id) : false)
                );
              }
              return (
                (l.yearly_lesson_id === yl.id || l.second_yearly_lesson_id === yl.id) &&
                !l.is_hidden
              );
            });
            const isNotAllerlei = !yl.is_allerlei;
            console.log('Debug: Filtering YearlyLesson:', {
              id: yl.id,
              subject: yl.expand?.subject?.name || yl.subject_name,
              subject_id: yl.subject,
              matchesSubject,
              isNotScheduled,
              matchesWeek,
              isNotAllerlei,
              targetSubjectId: subjectDetail.id,
              targetSubjectName: subjectDetail.name
            });
            return matchesSubject && isNotScheduled && matchesWeek && isNotAllerlei;
          })
          .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
        console.log('Debug: Available yearly lessons:', subjectYearlyLessons.map(yl => ({
          id: yl.id,
          lesson_number: yl.lesson_number,
          subject: yl.expand?.subject?.name || yl.subject_name,
          subject_id: yl.subject,
          is_double_lesson: yl.is_double_lesson,
        })));
        let nextAvailableYearlyLesson = subjectYearlyLessons[0];
        if (!nextAvailableYearlyLesson) {
          console.log(`No unassigned YearlyLesson available for ${subjectDetail.name} in week ${currentWeek}, creating new one`);
          const existingYearlyForSub = tempYearlyLessons
            .filter(yl => yl.subject === subjectDetail.id && yl.week_number === currentWeek);
          const nextLessonNumber = existingYearlyForSub.length > 0
            ? Math.max(...existingYearlyForSub.map(yl => Number(yl.lesson_number))) + 1
            : 1;
          nextAvailableYearlyLesson = await YearlyLesson.create({
            subject: subjectDetail.id,
            week_number: currentWeek,
            lesson_number: nextLessonNumber,
            school_year: currentYear,
            name: `Lektion ${nextLessonNumber} für ${subjectDetail.name}`,
            description: '',
            user_id: pb.authStore.model.id,
            class_id: activeClassId,
            is_double_lesson: false,
            is_exam: false,
            is_allerlei: false,
            is_half_class: false
          });
          tempYearlyLessons.push(nextAvailableYearlyLesson);
          optimisticUpdateYearlyLessons(nextAvailableYearlyLesson, true);
        }
        const isValidYearlyLesson = tempYearlyLessons.some(yl => yl.id === nextAvailableYearlyLesson.id);
        if (!isValidYearlyLesson) {
          console.error(`Invalid yearly_lesson_id: ${nextAvailableYearlyLesson.id}`);
          import('react-hot-toast').then(({ toast }) => {
            toast.error('Ungültige Lektion referenziert. Bitte wählen Sie eine andere Lektion.');
          });
          return;
        }
        let secondYearlyLessonId = nextAvailableYearlyLesson.is_double_lesson ? nextAvailableYearlyLesson.second_yearly_lesson_id : null;
        if (secondYearlyLessonId) {
          const isValidSecondYearlyLesson = tempYearlyLessons.some(yl => yl.id === secondYearlyLessonId);
          if (!isValidSecondYearlyLesson) {
            console.warn(`Invalid second_yearly_lesson_id: ${secondYearlyLessonId}, resetting to null`);
            secondYearlyLessonId = null;
            await YearlyLesson.update(nextAvailableYearlyLesson.id, { is_double_lesson: false, second_yearly_lesson_id: null });
            optimisticUpdateYearlyLessons(nextAvailableYearlyLesson.id, { is_double_lesson: false, second_yearly_lesson_id: null });
          }
        }
        const newLessonPayload = {
          subject: subjectDetail.id,
          day_of_week: targetDay,
          period_slot: targetPeriod,
          start_time: timeSlot.start,
          end_time: timeSlot.end,
          week_number: currentWeek,
          description: '',
          yearly_lesson_id: nextAvailableYearlyLesson.id,
          second_yearly_lesson_id: secondYearlyLessonId,
          is_double_lesson: nextAvailableYearlyLesson.is_double_lesson && secondYearlyLessonId !== null,
          is_exam: nextAvailableYearlyLesson.is_exam || false,
          is_allerlei: nextAvailableYearlyLesson.is_allerlei || false,
          is_half_class: nextAvailableYearlyLesson.is_half_class || false,
          allerlei_subjects: nextAvailableYearlyLesson.allerlei_subjects || [],
          allerlei_yearly_lesson_ids: [],
          user_id: pb.authStore.model.id,
          is_hidden: false
        };
        console.log('Debug: newLessonPayload vor Create:', JSON.stringify(newLessonPayload, null, 2));
        console.log('Debug: Prepared payload nach prepareForPersist:', JSON.stringify(Lesson.prepareForPersist(newLessonPayload), null, 2));
        let newLesson = await Lesson.create(newLessonPayload);
        try {
          newLesson = await Lesson.findById(newLesson.id);
          console.log('Debug: Refetched new Lesson:', newLesson);
        } catch (error) {
          console.error('Error refetching new Lesson:', error);
        }
        tempLessons = tempLessons.filter(l => l.id !== newLesson.id);
        tempLessons.push(newLesson);
        optimisticUpdateAllLessons(newLesson, true);
        affectedSubjects.add(subjectDetail.name);
        if (newLesson.is_double_lesson && newLesson.second_yearly_lesson_id) {
          const nextPeriod = targetPeriod + 1;
          if (nextPeriod <= timeSlots.length && !tempLessons.some(l => l.day_of_week === targetDay && l.period_slot === nextPeriod && l.week_number === currentWeek)) {
            const secondYearlyLesson = tempYearlyLessons.find(yl => yl.id === newLesson.second_yearly_lesson_id);
            if (secondYearlyLesson) {
              const timeSlotNext = timeSlots.find(ts => ts.period === nextPeriod);
              const secondLessonPayload = {
                subject: subjectDetail.id,
                day_of_week: targetDay,
                period_slot: nextPeriod,
                start_time: timeSlotNext?.start,
                end_time: timeSlotNext?.end,
                week_number: currentWeek,
                description: '',
                yearly_lesson_id: secondYearlyLesson.id,
                second_yearly_lesson_id: null,
                is_double_lesson: true,
                is_exam: secondYearlyLesson.is_exam || false,
                is_allerlei: secondYearlyLesson.is_allerlei || false,
                is_half_class: secondYearlyLesson.is_half_class || false,
                allerlei_subjects: secondYearlyLesson.allerlei_subjects || [],
                allerlei_yearly_lesson_ids: [],
                user_id: pb.authStore.model.id
              };
              console.log('Debug: Create second lesson payload:', secondLessonPayload);
              let secondLesson = await Lesson.create(secondLessonPayload);
              try {
                secondLesson = await Lesson.findById(secondLesson.id);
                console.log('Debug: Refetched second Lesson:', secondLesson);
              } catch (error) {
                console.error('Error refetching second Lesson:', error);
              }
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
        await reassignYearlyLessonLinks(subjectDetail.name, tempLessons, tempYearlyLessons);
        const updatedYearlyLessons = await updateYearlyLessonOrder(subjectDetail.name, tempLessons, tempYearlyLessons);
        tempYearlyLessons = updatedYearlyLessons;
        await queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
        await queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
        await refetch();
        setAllLessons([...tempLessons]);
        console.log('Debug: allLessons after set:', JSON.stringify(tempLessons, null, 2));
        setYearlyLessons([...tempYearlyLessons]);
        setRenderKey(prev => prev + 1);
        await refetch();
        queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
        queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
      } catch (error) {
        console.error('Error creating lesson from pool:', {
          message: error.message,
          data: error.data ? JSON.stringify(error.data, null, 2) : error,
          stack: error.stack
        });
        import('react-hot-toast').then(({ toast }) => {
          toast.error('Fehler beim Erstellen der Lektion. Bitte versuchen Sie es erneut.');
        });
        await refetch();
        queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
        queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
        return;
      }
    } else {
      const draggedLesson = active.data.current.lesson;
      console.log('Debug: Dragged lesson data:', JSON.stringify(active.data.current, null, 2));
      if (!draggedLesson || !draggedLesson.id) {
        console.error('Invalid dragged lesson:', draggedLesson);
        return;
      }
      const isAllerleiLesson = draggedLesson.collectionName === 'allerlei_lessons' || draggedLesson.is_allerlei;
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
      const updateFunc = isAllerleiLesson ? optimisticUpdateAllerleiLessons : optimisticUpdateAllLessons;
      if (targetLesson) {
        const draggedFields = {
          yearly_lesson_id: draggedLesson.yearly_lesson_id,
          second_yearly_lesson_id: draggedLesson.second_yearly_lesson_id,
          topic_id: draggedLesson.topic_id,
          is_double_lesson: draggedLesson.is_double_lesson,
          is_exam: draggedLesson.is_exam,
          is_allerlei: draggedLesson.is_allerlei,
          is_half_class: draggedLesson.is_half_class,
          allerlei_subjects: draggedLesson.allerlei_subjects || [],
          allerlei_yearly_lesson_ids: draggedLesson.allerlei_yearly_lesson_ids || []
        };
        const targetFields = {
          yearly_lesson_id: targetLesson.yearly_lesson_id,
          second_yearly_lesson_id: targetLesson.second_yearly_lesson_id,
          topic_id: targetLesson.topic_id,
          is_double_lesson: targetLesson.is_double_lesson,
          is_exam: targetLesson.is_exam,
          is_allerlei: targetLesson.is_allerlei,
          is_half_class: targetLesson.is_half_class,
          allerlei_subjects: targetLesson.allerlei_subjects || [],
          allerlei_yearly_lesson_ids: targetLesson.allerlei_yearly_lesson_ids || []
        };
        const updatedDragged = {
          ...draggedLesson,
          day_of_week: targetDay,
          period_slot: targetPeriod,
          ...targetFields
        };
        const updatedTarget = {
          ...targetLesson,
          day_of_week: draggedLesson.day_of_week,
          period_slot: draggedLesson.period_slot,
          ...draggedFields
        };
        tempLessons = tempLessons.map(l =>
          l.id === updatedDragged.id ? updatedDragged :
          l.id === updatedTarget.id ? updatedTarget : l
        );
        updateFunc(updatedDragged.id, updatedDragged);
        updateFunc(updatedTarget.id, updatedTarget);
        const draggedSubjectName = subjects.find(s => s.id === draggedLesson.subject)?.name;
        const targetSubjectName = subjects.find(s => s.id === targetLesson.subject)?.name;
        if (draggedSubjectName) affectedSubjects.add(draggedSubjectName);
        if (targetSubjectName) affectedSubjects.add(targetSubjectName);
        try {
          const draggedEntity = isAllerleiLesson ? AllerleiLesson : Lesson;
          const targetEntity = targetLesson.collectionName === 'allerlei_lessons' || targetLesson.is_allerlei ? AllerleiLesson : Lesson;
          await Promise.all([
            draggedEntity.update(draggedLesson.id, {
              day_of_week: targetDay,
              period_slot: targetPeriod,
              ...targetFields
            }),
            targetEntity.update(targetLesson.id, {
              day_of_week: draggedLesson.day_of_week,
              period_slot: draggedLesson.period_slot,
              ...draggedFields
            })
          ]);
        } catch (error) {
          console.error('Error swapping lessons:', error);
          queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
          return;
        }
        if (secondaryLesson) {
          console.log('Debug: Removing double lesson flag for swapped lesson:', draggedLesson.id);
          await Promise.all([
            Lesson.update(updatedDragged.id, { is_double_lesson: false, second_yearly_lesson_id: null }),
            YearlyLesson.update(updatedDragged.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null }),
            Lesson.update(secondaryLesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }),
            YearlyLesson.update(secondaryLesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null })
          ]);
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
        const updatedLesson = { ...draggedLesson, day_of_week: targetDay, period_slot: targetPeriod };
        tempLessons = tempLessons.map(l => l.id === updatedLesson.id ? updatedLesson : l);
        updateFunc(updatedLesson.id, updatedLesson);
        const subjectName = subjects.find(s => s.id === draggedLesson.subject)?.name;
        if (subjectName) affectedSubjects.add(subjectName);
        try {
          const entity = isAllerleiLesson ? AllerleiLesson : Lesson;
          await entity.update(draggedLesson.id, { day_of_week: targetDay, period_slot: targetPeriod });
        } catch (error) {
          console.error('Error moving lesson:', error);
          queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
          return;
        }
        if (secondaryLesson) {
          const nextTargetPeriod = targetPeriod + 1;
          const nextTargetLesson = tempLessons.find(l => l.day_of_week === targetDay && l.period_slot === nextTargetPeriod && l.week_number === currentWeek);
          const isEdgeCase = nextTargetPeriod > timeSlots.length;
          if (nextTargetLesson || isEdgeCase) {
            console.warn(`Double lesson at edge/corner: Splitting to single. Slot ${nextTargetPeriod} occupied or invalid.`);
            const secondYearlyLesson = tempYearlyLessons.find(yl => yl.id === draggedLesson.second_yearly_lesson_id);
            if (secondYearlyLesson && !nextTargetLesson && !isEdgeCase) {
              const altSlot = findAlternativeSlot(tempLessons, targetDay, targetPeriod, timeSlots, currentWeek);
              if (altSlot) {
                const timeSlotAlt = timeSlots.find(ts => ts.period === altSlot.period);
                const altPayload = {
                  subject: draggedLesson.subject,
                  day_of_week: altSlot.day,
                  period_slot: altSlot.period,
                  start_time: timeSlotAlt?.start,
                  end_time: timeSlotAlt?.end,
                  week_number: currentWeek,
                  description: '',
                  yearly_lesson_id: secondYearlyLesson.id,
                  second_yearly_lesson_id: null,
                  is_double_lesson: false,
                  is_exam: secondYearlyLesson.is_exam || false,
                  is_allerlei: secondYearlyLesson.is_allerlei || false,
                  is_half_class: secondYearlyLesson.is_half_class || false,
                  allerlei_subjects: secondYearlyLesson.allerlei_subjects || [],
                  allerlei_yearly_lesson_ids: [],
                  user_id: pb.authStore.model.id
                };
                let altLesson = await Lesson.create(altPayload);
                altLesson = await Lesson.findById(altLesson.id);
                tempLessons.push(altLesson);
                optimisticUpdateAllLessons(altLesson, true);
                console.log('Relocated secondary to alt slot:', altSlot);
              } else {
                console.warn('No alternative slot found for secondary; leaving unplaced.');
              }
            }
            await Promise.all([
              Lesson.update(updatedLesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }),
              YearlyLesson.update(updatedLesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null }),
              Lesson.update(secondaryLesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }),
              YearlyLesson.update(secondaryLesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null })
            ]);
            tempLessons = tempLessons.map(l =>
              l.id === updatedLesson.id ? { ...l, is_double_lesson: false, second_yearly_lesson_id: null } :
              l.id === secondaryLesson.id ? { ...l, is_double_lesson: false, second_yearly_lesson_id: null } : l
            );
            optimisticUpdateAllLessons({ ...updatedLesson, is_double_lesson: false, second_yearly_lesson_id: null });
            optimisticUpdateAllLessons({ ...secondaryLesson, is_double_lesson: false, second_yearly_lesson_id: null });
            optimisticUpdateYearlyLessons(updatedLesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null });
            optimisticUpdateYearlyLessons(secondaryLesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null });
          } else {
            const updatedSecondary = { ...secondaryLesson, day_of_week: targetDay, period_slot: nextTargetPeriod };
            tempLessons = tempLessons.map(l => l.id === updatedSecondary.id ? updatedSecondary : l);
            optimisticUpdateAllLessons(updatedSecondary);
            try {
              await Lesson.update(secondaryLesson.id, { day_of_week: targetDay, period_slot: nextTargetPeriod });
            } catch (error) {
              console.error('Error moving secondary lesson:', error);
              queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
              return;
            }
          }
        }
      }
    }
    for (const lesson of tempLessons) {
      if (lesson.is_double_lesson && lesson.second_yearly_lesson_id) {
        const secondLesson = tempLessons.find(l =>
          l.yearly_lesson_id === lesson.second_yearly_lesson_id &&
          l.day_of_week === lesson.day_of_week &&
          l.period_slot === lesson.period_slot + 1 &&
          l.week_number === currentWeek
        );
        if (!secondLesson) {
          console.log('Debug: Removing double lesson flag for lesson:', lesson.id);
          await Promise.all([
            Lesson.update(lesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }),
            YearlyLesson.update(lesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null })
          ]);
          tempLessons = tempLessons.map(l =>
            l.id === lesson.id ? { ...l, is_double_lesson: false, second_yearly_lesson_id: null } : l
          );
          optimisticUpdateAllLessons({ ...lesson, is_double_lesson: false, second_yearly_lesson_id: null });
          optimisticUpdateYearlyLessons(lesson.yearly_lesson_id, { is_double_lesson: false, second_yearly_lesson_id: null });
        }
      }
    }
    for (const subjectName of affectedSubjects) {
      if (subjectName) {
        const updatedYearlyLessons = await updateYearlyLessonOrder(subjectName, tempLessons, tempYearlyLessons);
        tempYearlyLessons = updatedYearlyLessons;
      }
    }
    const updatedLessons = await Lesson.list({ filter: `week_number = ${currentWeek}` });
    const updatedAllerlei = await AllerleiLesson.list({ filter: `week_number = ${currentWeek}` });
    setAllLessons(updatedLessons);
    setAllerleiLessons(updatedAllerlei);
    setRenderKey(prev => prev + 1);
    await refetch();
    queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
    queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
  }, [lessonsForCurrentWeek, allLessons, allerleiLessons, currentWeek, yearlyLessons, timeSlots, currentYear, queryClientLocal, subjects, activeClassId, optimisticUpdateAllLessons, optimisticUpdateYearlyLessons, optimisticUpdateAllerleiLessons, reassignYearlyLessonLinks, updateYearlyLessonOrder, setAllLessons, setYearlyLessons, setAllerleiLessons, refetch]);
  const availableYearlyLessonsForPool = useMemo(() => {
    if (!activeClassId) return [];
    const subjectsForClass = subjects.filter(s => s.class_id === activeClassId);
    const uniqueSubjectsForClass = [...new Map(subjectsForClass.map(s => [s.name, s])).values()];
    const scheduledLessonsInWeek = lessonsForCurrentWeek;

    console.log('Debug: Recalculating availableYearlyLessonsForPool', {
      allLessonsLength: allLessons.length,
      allerleiLessonsLength: allerleiLessons.length,
      currentWeek,
      scheduledLessonsInWeek: scheduledLessonsInWeek.length
    });

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
        let lessonValue = lesson.is_double_lesson ? 2 : 1;
        if (lesson.is_half_class) {
          lessonValue *= 0.5;
        }
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
      const availableLessons = yearlyLessons
        .filter(yl => {
          const matchesSubject = yl.subject_name === subject.name || yl.expand?.subject?.name === subject.name;
          const matchesWeek = yl.week_number === currentWeek;
          const isNotScheduled = !scheduledLessonsInWeek.some(l => {
            console.log('Debug: Checking scheduled for yl.id:', yl.id, 'l.collectionName:', l.collectionName, 'l.primary_yearly_lesson_id:', l.primary_yearly_lesson_id, 'l.added_yearly_lesson_ids:', l.added_yearly_lesson_ids);
            if (l.collectionName === 'allerlei_lessons') {
              return (
                l.primary_yearly_lesson_id === yl.id ||
                (Array.isArray(l.added_yearly_lesson_ids) ? l.added_yearly_lesson_ids.includes(yl.id) : false)
              );
            }
            return (
              (l.yearly_lesson_id === yl.id || l.second_yearly_lesson_id === yl.id) &&
              !l.is_hidden
            );
          });
          const isNotAllerlei = !yl.is_allerlei;
          console.log('Debug filter yl:', yl.id, 'matchesSubject:', matchesSubject, 'matchesWeek:', matchesWeek, 'isNotScheduled:', isNotScheduled, 'isNotAllerlei:', isNotAllerlei);
          return matchesSubject && isNotScheduled && matchesWeek && isNotAllerlei;
        })
        .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
      return {
        subject,
        totalScheduled,
        lessonsPerWeek: subject.lessons_per_week || 4,
        availableLessons
      };
    });

    console.log('Debug: availableYearlyLessonsForPool summary', result.map(s => ({
      subject: s.subject.name,
      totalScheduled: s.totalScheduled,
      lessonsPerWeek: s.lessonsPerWeek,
      availableCount: s.availableLessons.length,
      availableLessonIds: s.availableLessons.map(l => l.id)
    })));

    return result;
  }, [
    subjects,
    activeClassId,
    JSON.stringify(allLessons.map(l => l.id + l.week_number + l.yearly_lesson_id + l.second_yearly_lesson_id + l.is_hidden)),
    JSON.stringify(allerleiLessons.map(al => al.id + al.week_number + al.primary_yearly_lesson_id + (Array.isArray(al.added_yearly_lesson_ids) ? al.added_yearly_lesson_ids.join(',') : ''))),
    JSON.stringify(yearlyLessons.map(yl => yl.id + yl.week_number + yl.lesson_number + yl.is_allerlei)),
    currentWeek
  ]);
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
    <div className="timetable-page-container flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center p-4 bg-white dark:bg-slate-800 shadow-lg">
        <div className="flex space-x-4 mb-4 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg">
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
        <div className="flex items-center space-x-4 my-4 p-2 bg-gray-100 dark:bg-slate-700 rounded-lg shadow-md">
          {currentView === 'Woche' ? (
            <>
              <Button variant="ghost" onClick={handlePrevWeek} className="rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600">
                <ChevronsLeft />
              </Button>
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">
                Woche {weekInfo.calendarWeek}
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  {weekInfo.mondayStr} - {weekInfo.fridayStr}
                </span>
              </h2>
              <Button variant="ghost" onClick={handleNextWeek} className="rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600">
                <ChevronsRight />
              </Button>
            </>
          ) : currentView === 'Tag' ? (
            <>
              <Button variant="ghost" onClick={handlePrevDay} className="rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600">
                <ChevronsLeft />
              </Button>
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">
                {dayName}, {formatDate(currentDate)}
              </h2>
              <Button variant="ghost" onClick={handleNextDay} className="rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600">
                <ChevronsRight />
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {viewMode === 'week' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToWindowEdges]}
        >
          <div className="flex-grow flex overflow-auto p-4">
            <motion.div
              key={renderKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="timetable-grid-wrapper flex-1 rounded-2xl overflow-hidden"
            >
              {isLoading ? (
                <CalendarLoader />
              ) : (
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
                  onHideHover={handleHideHover} // Hinzugefügt
                  subjects={subjects}
                />
              )}
            </motion.div>
            <div className="timetable-pool-container w-1/4 min-w-[250px] p-4 shadow-md rounded-2xl overflow-auto" style={{ minHeight: '200px', maxHeight: 'calc(100vh - 300px)' }}>
              <h3 className="text-lg font-semibold mb-2">Stundenpool</h3>
              {classes.length > 0 && (
                <select
                  value={activeClassId || ''}
                  onChange={e => setActiveClassId(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                >
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              )}
              <div className="flex flex-col gap-1 mt-1">
                {availableYearlyLessonsForPool.length > 0 ? (
                  availableYearlyLessonsForPool.map((subjectData) => {
                    const subjectColor = subjectData.subject.color || '#3b82f6';
                    return (
                      <DraggableItem key={`pool-${subjectData.subject.id}`} id={`pool-${subjectData.subject.id}`} data={{ type: 'pool', subject: subjectData.subject }}>
                        <div
                          className="w-full h-full p-2 rounded cursor-grab active:cursor-grabbing flex items-center justify-between"
                          style={{ backgroundColor: subjectColor }} // Entferne bg-opacity-80
                        >
                          <div className="font-bold text-white truncate">
                            {subjectData.subject.name}
                          </div>
                          <span className="text-sm text-white">
                            ({subjectData.totalScheduled}/{subjectData.lessonsPerWeek})
                          </span>
                        </div>
                      </DraggableItem>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-500 dark:text-gray-400">
                    {activeClassId ? 'Alle Lektionen dieser Woche sind geplant.' : 'Bitte eine Klasse auswählen.'}
                  </p>
                )}
              </div>
            </div>
          </div>
          <DragOverlay>
            {activeDragId ? renderDragOverlay(activeDragId) : null}
          </DragOverlay>
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={handlePrint} className="rounded">
              Drucken
            </Button>
          </div>
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
      {hoverLesson && (
        <OverlayView
          ref={overlayRef}
          lesson={hoverLesson}
          onMouseEnter={() => { if (debouncedShowRef.current) debouncedShowRef.current(hoverLesson, hoverPosition); }}
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
        subjectColor={subjects.find(s => s.id === (editingLesson?.subject || initialSubjectForModal))?.color}
        initialSubject={initialSubjectForModal}
        subjects={subjects}
        topics={topics}
        activeClassId={activeClassId}
        setEditingLesson={setEditingLesson}
        setIsModalOpen={setIsModalOpen}
      />
    </div>
  );
}