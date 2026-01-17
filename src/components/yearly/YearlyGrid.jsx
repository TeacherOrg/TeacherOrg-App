import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import YearLessonCell from './YearLessonCell';
import { adjustColor, createGradient } from '@/utils/colorUtils';
import { Checkbox } from '@/components/ui/checkbox';
import ClassSelectorBar from './ClassSelectorBar';
import LessonContextMenu from './LessonContextMenu';
import WeekPickerModal from './WeekPickerModal';
import SlotPickerModal from './SlotPickerModal';
import toast from 'react-hot-toast';
import { YearlyLesson } from '@/api/entities';
import { LessonBadge } from '@/components/shared/lesson/LessonBadge';
import { getCurrentWeek } from '@/utils/timetableUtils';

const ACADEMIC_WEEKS = 52;

const getHolidayDisplay = (holiday) => {
  if (!holiday) return { emoji: '', color: '', gradient: '', pattern: '' };
  switch (holiday.type) {
    case 'vacation':
      if (holiday.name.includes('Sommer')) return {
        emoji: '☀️',
        color: 'bg-yellow-800/50 dark:bg-yellow-800/50',
        gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fb923c 100%)',
        pattern: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 20%), repeating-conic-gradient(from 0deg at 50% 50%, rgba(255, 255, 255, 0.15) 0deg 15deg, transparent 15deg 30deg)'
      };
      if (holiday.name.includes('Herbst')) return {
        emoji: '🍂',
        color: 'bg-orange-800/50 dark:bg-orange-800/50',
        gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
        pattern: 'radial-gradient(ellipse 8px 12px at 15% 20%, rgba(139, 69, 19, 0.25) 0%, transparent 100%), radial-gradient(ellipse 10px 14px at 45% 35%, rgba(139, 69, 19, 0.2) 0%, transparent 100%), radial-gradient(ellipse 7px 11px at 75% 15%, rgba(139, 69, 19, 0.22) 0%, transparent 100%), radial-gradient(ellipse 9px 13px at 25% 65%, rgba(139, 69, 19, 0.18) 0%, transparent 100%), radial-gradient(ellipse 8px 12px at 60% 75%, rgba(139, 69, 19, 0.23) 0%, transparent 100%), radial-gradient(ellipse 6px 10px at 85% 55%, rgba(139, 69, 19, 0.2) 0%, transparent 100%), radial-gradient(ellipse 11px 15px at 35% 85%, rgba(139, 69, 19, 0.15) 0%, transparent 100%), radial-gradient(ellipse 7px 11px at 90% 90%, rgba(139, 69, 19, 0.25) 0%, transparent 100%)'
      };
      if (holiday.name.includes('Weihnacht')) return {
        emoji: '🎄',
        color: 'bg-green-800/50 dark:bg-green-800/50',
        gradient: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)',
        pattern: 'radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.12) 2px, transparent 2px), radial-gradient(circle at 60% 70%, rgba(255, 255, 255, 0.08) 3px, transparent 3px), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 2px, transparent 2px), radial-gradient(circle at 35% 80%, rgba(255, 255, 255, 0.1) 2px, transparent 2px), radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.1) 2.5px, transparent 2.5px), radial-gradient(circle at 15% 60%, rgba(255, 255, 255, 0.09) 2px, transparent 2px), radial-gradient(circle at 70% 50%, rgba(255, 255, 255, 0.11) 2px, transparent 2px), radial-gradient(circle at 40% 15%, rgba(255, 255, 255, 0.13) 2.5px, transparent 2.5px), radial-gradient(circle at 85% 65%, rgba(255, 255, 255, 0.1) 2px, transparent 2px), radial-gradient(circle at 25% 90%, rgba(255, 255, 255, 0.08) 3px, transparent 3px), radial-gradient(circle at 90% 85%, rgba(255, 255, 255, 0.12) 2px, transparent 2px), radial-gradient(circle at 45% 55%, rgba(255, 255, 255, 0.09) 2.5px, transparent 2.5px)'
      };
      if (holiday.name.includes('Sport')) return {
        emoji: '⛷️',
        color: 'bg-blue-800/50 dark:bg-blue-800/50',
        gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)',
        pattern: 'radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.12) 2px, transparent 2px), radial-gradient(circle at 60% 70%, rgba(255, 255, 255, 0.08) 3px, transparent 3px), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 2px, transparent 2px), radial-gradient(circle at 35% 80%, rgba(255, 255, 255, 0.1) 2px, transparent 2px), radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.1) 2.5px, transparent 2.5px), radial-gradient(circle at 15% 60%, rgba(255, 255, 255, 0.09) 2px, transparent 2px), radial-gradient(circle at 70% 50%, rgba(255, 255, 255, 0.11) 2px, transparent 2px), linear-gradient(150deg, transparent 65%, rgba(255, 255, 255, 0.08) 65%, rgba(255, 255, 255, 0.08) 75%, transparent 75%), linear-gradient(30deg, transparent 70%, rgba(255, 255, 255, 0.06) 70%, rgba(255, 255, 255, 0.06) 85%, transparent 85%)'
      };
      if (holiday.name.includes('Frühling')) return {
        emoji: '🌸',
        color: 'bg-pink-800/50 dark:bg-pink-800/50',
        gradient: 'linear-gradient(135deg, #f9a8d4 0%, #f472b6 50%, #ec4899 100%)',
        pattern: 'radial-gradient(circle at 10% 15%, rgba(255, 255, 255, 0.2) 3px, transparent 3px), radial-gradient(circle at 25% 35%, rgba(255, 255, 255, 0.15) 4px, transparent 4px), radial-gradient(circle at 45% 10%, rgba(255, 255, 255, 0.18) 3px, transparent 3px), radial-gradient(circle at 65% 45%, rgba(255, 255, 255, 0.2) 5px, transparent 5px), radial-gradient(circle at 85% 25%, rgba(255, 255, 255, 0.12) 3px, transparent 3px), radial-gradient(circle at 15% 70%, rgba(255, 255, 255, 0.16) 4px, transparent 4px), radial-gradient(circle at 35% 85%, rgba(255, 255, 255, 0.14) 3px, transparent 3px), radial-gradient(circle at 55% 65%, rgba(255, 255, 255, 0.2) 4px, transparent 4px), radial-gradient(circle at 75% 80%, rgba(255, 255, 255, 0.18) 5px, transparent 5px), radial-gradient(circle at 90% 60%, rgba(255, 255, 255, 0.15) 3px, transparent 3px)'
      };
      return {
        emoji: '🏖️',
        color: 'bg-blue-800/50 dark:bg-blue-800/50',
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
        pattern: 'repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0px, transparent 2px)'
      };
    case 'holiday': return {
      emoji: '🎉',
      color: 'bg-purple-800/50 dark:bg-purple-800/50',
      gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #7e22ce 100%)',
      pattern: 'radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.3) 0%, transparent 70%)'
    };
    case 'training': return {
      emoji: '📚',
      color: 'bg-orange-800/50 dark:bg-orange-800/50',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
      pattern: 'repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(99, 102, 241, 0.15) 15px)'
    };
    default: return {
      emoji: '📅',
      color: 'bg-gray-800/50 dark:bg-gray-800/50',
      gradient: 'linear-gradient(135deg, #64748b 0%, #475569 50%, #334155 100%)',
      pattern: ''
    };
  }
};

const YearlyGrid = ({
  lessons,
  topics,
  subjects,
  academicWeeks = ACADEMIC_WEEKS,
  onLessonClick,
  activeClassId,
  activeTopicId,
  currentYear,
  holidays = [],
  onShowHover,
  onHideHover,
  allYearlyLessons,
  densityMode = 'standard',
  isAssignMode = false,
  selectedLessons = [],
  onSelectLesson,
  classes,
  onSelectClass,
  yearViewMode = 'calendar',
  schoolYearStartWeek = 35,
  refetch,
  optimisticUpdateYearlyLessons,
  settings, // ← NEU: für Fixed Schedule Template
  readOnly = false, // Team Teaching: Nur-Einsicht-Modus
}) => {
  const containerRef = useRef(null);
  const subjectHeaderRef = useRef(null);
  const hasScrolledToCurrentWeek = useRef(false);

  const weekColumnWidth = 120;
  const horizontalPadding = 0;

  const [availableWidth, setAvailableWidth] = useState(0);
  // === NEU ===
  const [contextMenu, setContextMenu] = useState(null); // { x, y, lesson, slot }
  const [pendingOperation, setPendingOperation] = useState(null); // { mode, lesson, fromSlot }
  const [weekPicker, setWeekPicker] = useState(null); // { mode, lesson, fromSlot }
  const [slotPicker, setSlotPicker] = useState(null); // { week, year }
  // Drag-Logik
  const [dragOverSlot, setDragOverSlot] = useState(null);

  // Breite updaten
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setAvailableWidth(containerRef.current.clientWidth - weekColumnWidth - horizontalPadding);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    const ro = new ResizeObserver(updateWidth);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', updateWidth);
      ro.disconnect();
    };
  }, []);

  const lessonsByWeek = useMemo(() => {
    const result = {};
    const missingSubjects = new Set();

    lessons.forEach(lesson => {
      const subjectObj = subjects.find(s => s.id === lesson.subject);

      if (!subjectObj) {
        missingSubjects.add(lesson.subject);
        // Skip lessons whose subject is not in displayed subjects
        return;
      }

      const weekNum = Number(lesson.week_number);
      const lessonNum = Number(lesson.lesson_number);
      // Use subject ID instead of name - ID is unique per class
      const key = `${weekNum}-${lesson.subject}-${lessonNum}`;
      result[key] = { ...lesson, subjectName: subjectObj.name };
    });

    // Note: missingSubjects can occur when viewing "Alle Klassen" or during async loading
    // This is expected behavior and doesn't affect functionality

    return result;
  }, [lessons, subjects]);

  const topicsById = useMemo(() => {
    if (!topics) return new Map();
    return new Map(topics.map(t => [t.id, t]));
  }, [topics]);

  const uniqueSubjects = useMemo(() => {
    // subjects is already filtered by active class in YearlyOverview.jsx
    // Each subject has unique ID even if names are the same across classes
    return subjects;
  }, [subjects]);

  const getDisplayName = useCallback((sub) => {
    if (activeClassId === null) {
      const className = classes.find(c => c.id === sub.class_id)?.name || '';
      return `${className} – ${sub.name}`;
    }
    return sub.name;
  }, [activeClassId, classes]);

  const yearlyLessonsById = useMemo(() => {
    const map = new Map();
    lessons.forEach(lesson => {
      map.set(lesson.id, lesson);
    });
    return map;
  }, [lessons]);

  // Helper function: Check if a slot (by position) is part of a template double lesson
  const isSlotPartOfTemplateDouble = useCallback((week, subject, lessonNumber, classId) => {
    if (!settings || settings.scheduleType !== 'fixed') return { isDouble: false, isFirst: false, isSecond: false };

    const template = settings.fixedScheduleTemplate || {};
    if (!template || Object.keys(template).length === 0) return { isDouble: false, isFirst: false, isSecond: false };

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    // Get all template slots for this subject AND class (sorted)
    const allSubjectSlots = [];
    days.forEach(d => {
      (template[d] || []).forEach(slot => {
        // CRITICAL FIX: Also check class_id to avoid mixing subjects from different classes
        if (slot.subject === subject && slot.class_id === classId) {
          allSubjectSlots.push({ day: d, period: slot.period });
        }
      });
    });
    allSubjectSlots.sort((a, b) => {
      const dayOrder = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
      return dayOrder[a.day] - dayOrder[b.day] || a.period - b.period;
    });

    // Check if lessonNumber corresponds to a double lesson slot
    if (lessonNumber <= allSubjectSlots.length) {
      const currentSlot = allSubjectSlots[lessonNumber - 1];
      const nextSlot = allSubjectSlots[lessonNumber];
      const prevSlot = allSubjectSlots[lessonNumber - 2];

      // Is this the first part of a double lesson?
      if (nextSlot && currentSlot.day === nextSlot.day && currentSlot.period + 1 === nextSlot.period) {
        return { isDouble: true, isFirst: true, isSecond: false };
      }

      // Is this the second part of a double lesson?
      if (prevSlot && prevSlot.day === currentSlot.day && prevSlot.period + 1 === currentSlot.period) {
        return { isDouble: true, isFirst: false, isSecond: true };
      }
    }

    return { isDouble: false, isFirst: false, isSecond: false };
  }, [settings]);

  // ═══════════ NEU: AUTO-SPANNING DETECTION FÜR FIXED SCHEDULE ═══════════
  const spanningInfo = useMemo(() => {
    const spans = new Map(); // Maps lesson.id → { spanCount, isSecondPart, secondLessonId }

    // Nur im Fixed-Modus aktivieren
    if (!settings || settings.scheduleType !== 'fixed') {
      return spans;
    }

    const template = settings.fixedScheduleTemplate || {};
    if (!template || Object.keys(template).length === 0) {
      return spans;
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    // Erkenne Doppellektionen im Template
    const doubleLessonPairs = []; // Array of { subject, day, periods: [p1, p2] }

    days.forEach(day => {
      const daySlots = (template[day] || []).sort((a, b) => a.period - b.period);

      for (let i = 0; i < daySlots.length - 1; i++) {
        const curr = daySlots[i];
        const next = daySlots[i + 1];

        // Prüfe: gleiches Fach, aufeinanderfolgende Perioden
        if (curr.subject === next.subject &&
            curr.class_id === next.class_id &&
            curr.period + 1 === next.period) {
          doubleLessonPairs.push({
            subject: curr.subject,
            class_id: curr.class_id,
            day,
            periods: [curr.period, next.period]
          });
          i++; // Skip next slot, da es schon Teil der Doppellektion ist
        }
      }
    });

    // Für jede Woche: Mappe YearlyLessons auf Doppellektionen
    for (let week = 1; week <= academicWeeks; week++) {
      doubleLessonPairs.forEach(pair => {
        // Hole alle Template-Slots für dieses Fach (sortiert)
        const allSubjectSlots = [];
        days.forEach(d => {
          (template[d] || []).forEach(slot => {
            if (slot.subject === pair.subject && slot.class_id === pair.class_id) {
              allSubjectSlots.push({ day: d, period: slot.period });
            }
          });
        });
        allSubjectSlots.sort((a, b) => {
          const dayOrder = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
          return dayOrder[a.day] - dayOrder[b.day] || a.period - b.period;
        });

        // Finde den Index der ersten Periode des Doppellektion-Paares
        const pairIndex = allSubjectSlots.findIndex(s =>
          s.day === pair.day && s.period === pair.periods[0]
        );

        if (pairIndex === -1) return;

        // Hole die YearlyLessons für dieses Fach in dieser Woche
        const subjectLessons = lessons
          .filter(yl => {
            const ylSubjectName = yl.expand?.subject?.name || yl.subject_name ||
                                 subjects.find(s => s.id === yl.subject)?.name;
            return yl.week_number === week &&
                   ylSubjectName === pair.subject &&
                   yl.class_id === pair.class_id;
          })
          .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));

        // Die YearlyLessons an Position pairIndex und pairIndex+1 sind die Doppellektion
        // WICHTIG: Nur spannen, wenn die YearlyLesson auch als Doppellektion markiert ist!
        if (pairIndex < subjectLessons.length - 1) {
          const firstYL = subjectLessons[pairIndex];
          const secondYL = subjectLessons[pairIndex + 1];

          // Check if this is actually marked as a double lesson
          if (firstYL.is_double_lesson && firstYL.second_yearly_lesson_id === secondYL.id) {
            // Markiere als Spanning
            spans.set(firstYL.id, { spanCount: 2, isSecondPart: false, secondLessonId: secondYL.id });
            spans.set(secondYL.id, { spanCount: 0, isSecondPart: true, firstLessonId: firstYL.id });
          }
        }
      });
    }

    return spans;
  }, [lessons, academicWeeks, settings, subjects]);

  const BASE_CELL_WIDTHS = { compact: 72, standard: 82, spacious: 92 };
  const minCellWidth = BASE_CELL_WIDTHS[densityMode] || 82;
  const maxCellWidth = 250; // Erhöht von 160 für bessere Platznutzung

  const effectiveAvailableWidth = availableWidth || 800;

  const totalSlots = uniqueSubjects.reduce((sum, subjectObj) => sum + (subjectObj.lessons_per_week || subjectObj.weekly_lessons || 4), 0) || 1;
  const cellWidth = minCellWidth;

  const subjectBlockWidths = useMemo(() => uniqueSubjects.map(subjectObj => (subjectObj.lessons_per_week || subjectObj.weekly_lessons || 4) * cellWidth), [uniqueSubjects, cellWidth]);
  const totalWidth = weekColumnWidth + subjectBlockWidths.reduce((a, b) => a + b, 0);
  const rowHeight = densityMode === 'compact' ? 48 : densityMode === 'spacious' ? 80 : 68;

  const weeks = useMemo(() => {
    if (yearViewMode === 'calendar') {
      return Array.from({ length: 52 }, (_, i) => ({
        id: `cal-${i + 1}`,
        week: i + 1,
        display: i + 1,
        year: currentYear
      }));
    }

    // Schuljahr-Modus
    const start = schoolYearStartWeek;
    const list = [];

    for (let w = start; w <= 52; w++) {
      list.push({
        id: `school-${currentYear}-${w}`,
        week: w,
        display: w,
        year: currentYear
      });
    }

    const remaining = 52 - list.length;
    for (let w = 1; w <= remaining; w++) {
      list.push({
        id: `school-${currentYear + 1}-${w}`,
        week: w,
        display: w,
        year: currentYear + 1
      });
    }

    return list;
  }, [yearViewMode, schoolYearStartWeek, currentYear]);

  const currentWeek = getCurrentWeek();

  // Horizontal scroll sync
  const handleScroll = useCallback(() => {
    if (subjectHeaderRef.current && containerRef.current) {
      subjectHeaderRef.current.scrollLeft = containerRef.current.scrollLeft;
    }
  }, []);

  // ────── EINZIGEN Scroll-to-current-Week Effect (ersetzt alle anderen!) ──────
  useLayoutEffect(() => {
    if (!containerRef.current || hasScrolledToCurrentWeek.current) return;

    const scrollToCurrentWeek = () => {
      if (!containerRef.current) return;

      const now = new Date();
      const currentWeekNum = getCurrentWeek();           // KW 1–52
      const currentYearActual = now.getFullYear();

      let targetRowIndex = -1;

      if (yearViewMode === 'calendar') {
        // Nur scrollen, wenn das angezeigte Jahr = aktuelles Jahr
        if (currentYear === currentYearActual) {
          targetRowIndex = currentWeekNum - 1;
        }
      } else {
        // ────── SCHULJAHR-Modus ──────
        const startWeek = schoolYearStartWeek; // z. B. 35

        if (currentWeekNum >= startWeek) {
          // Aktuelle Woche liegt im "alten" Jahr (ab KW 35)
          targetRowIndex = currentWeekNum - startWeek;
        } else {
          // Aktuelle Woche liegt im neuen Jahr (KW 1 bis schoolYearStartWeek-1)
          const weeksInOldYear = 52 - startWeek + 1;
          targetRowIndex = weeksInOldYear + (currentWeekNum - 1);
        }
      }

      if (targetRowIndex >= 0 && targetRowIndex < weeks.length) {
        const targetScrollTop = targetRowIndex * rowHeight;

        containerRef.current.scrollTop = targetScrollTop;
        hasScrolledToCurrentWeek.current = true;
      }
    };

    // useLayoutEffect + rAF = garantiert nach Layout, vor Paint
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToCurrentWeek);
    });
  }, [
    yearViewMode,
    weeks,              // ← ändert sich bei Moduswechsel
    rowHeight,
    currentYear,
    schoolYearStartWeek,
    currentWeek         // von getCurrentWeek()
  ]);

  // Bonus: Flag beim Jahrwechsel zurücksetzen (optional, aber sinnvoll)
  useEffect(() => {
    hasScrolledToCurrentWeek.current = false;
  }, [yearViewMode, currentYear, activeClassId]); // auch bei Klassenwechsel zurücksetzen

  // === ALLE HANDLER GANZ OBEN ===
  const handleDeleteLesson = useCallback(async (lessonId) => {
    if (!confirm('Diese Jahreslektion wirklich löschen?')) return;

    try {
      // Optimistic UI
      optimisticUpdateYearlyLessons?.({ id: lessonId }, false, true);

      await YearlyLesson.delete(lessonId);
      toast.success('Lektion gelöscht');

      // Aktualisiere Grid
      refetch?.();
    } catch (err) {
      console.error(err);
      toast.error('Fehler beim Löschen');
      // Rollback falls nötig
      refetch?.();
    }
  }, [refetch, optimisticUpdateYearlyLessons]);

  // Drag-Handler
  const handleDragStart = (e, lesson, slot, isCopy) => {
    // Optional: visuelles Feedback
  };

  const handleDragOver = (e, slot) => {
    e.preventDefault();
    setDragOverSlot(slot);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = async (sourceLessonId, targetSlot, isCopy) => {
    setDragOverSlot(null);

    if (!sourceLessonId || !targetSlot) return;

    const lesson = allYearlyLessons.find(l => l.id === sourceLessonId);
    if (!lesson) return;

    try {
      if (isCopy) {
        const { id, ...data } = lesson;
        await YearlyLesson.create({
          ...data,
          week_number: targetSlot.week_number,
          school_year: targetSlot.school_year,
          lesson_number: targetSlot.lesson_number,
          subject: subjects.find(s => s.name === targetSlot.subject)?.id,
          name: data.name + ' (Kopie)',
          is_copy: true,
        });
        toast.success('Lektion kopiert');
      } else {
        await YearlyLesson.update(lesson.id, {
          week_number: targetSlot.week_number,
          school_year: targetSlot.school_year,
          lesson_number: targetSlot.lesson_number,
          subject: subjects.find(s => s.name === targetSlot.subject)?.id,
        });
        toast.success('Lektion verschoben');
      }
      refetch?.();
    } catch (err) {
      toast.error('Fehler beim Drag & Drop');
    }
  };

  const checkNextSlotAvailable = (lesson, fromSlot) => {
    if (!lesson || !fromSlot) return false;
    const subjectId = subjects.find(s => s.name === fromSlot.subject)?.id;
    if (!subjectId) return false;

    const sameSubjectLessons = lessons
      .filter(l => l.subject === subjectId && l.week_number === fromSlot.week_number && Number(l.school_year) === currentYear)
      .map(l => Number(l.lesson_number));

    const currentNum = fromSlot.lesson_number;
    const maxLessons = subjects.find(s => s.id === subjectId)?.lessons_per_week || 4;

    for (let i = currentNum + 1; i <= maxLessons; i++) {
      if (!sameSubjectLessons.includes(i)) return true;
    }
    return false;
  };

  const checkPrevSlotAvailable = (lesson, fromSlot) => {
    if (!lesson || !fromSlot) return false;
    const subjectId = subjects.find(s => s.name === fromSlot.subject)?.id;
    if (!subjectId) return false;

    const sameSubjectLessons = lessons
      .filter(l => l.subject === subjectId && l.week_number === fromSlot.week_number && Number(l.school_year) === currentYear)
      .map(l => Number(l.lesson_number));

    const currentNum = fromSlot.lesson_number;

    for (let i = currentNum - 1; i >= 1; i--) {
      if (!sameSubjectLessons.includes(i)) return true;
    }
    return false;
  };

  const handleDuplicateNext = async (lesson, fromSlot) => {
    const subjectId = subjects.find(s => s.name === fromSlot.subject)?.id;
    if (!subjectId) {
      toast.error('Fach nicht gefunden');
      return;
    }

    // Alle Lektionen dieses Fachs in dieser Woche
    const sameSubjectLessons = lessons
      .filter(l =>
        l.subject === subjectId &&
        l.week_number === fromSlot.week_number &&
        Number(l.school_year) === currentYear
      )
      .map(l => Number(l.lesson_number))
      .sort((a, b) => a - b);

    const currentNum = fromSlot.lesson_number;
    const maxLessons = subjects.find(s => s.id === subjectId)?.lessons_per_week || 4;

    // Finde die nächste mögliche Stunde (1 bis maxLessons), die noch NICHT belegt ist
    let targetNumber = null;
    for (let i = currentNum + 1; i <= maxLessons; i++) {
      if (!sameSubjectLessons.includes(i)) {
        targetNumber = i;
        break;
      }
    }

    if (!targetNumber) {
      toast('Keine freie Stunde danach in diesem Fach', { icon: 'Info' });
      return;
    }

    try {
      const { id, ...data } = lesson;
      await YearlyLesson.create({
        ...data,
        lesson_number: targetNumber,
        name: data.name + ' (Wdh.)',
        is_copy: true,
      });
      toast.success(`Dupliziert in ${targetNumber}. Stunde`);
      refetch?.();
    } catch (err) {
      console.error(err);
      toast.error('Fehler beim Duplizieren');
    }
  };

  const handleDuplicatePrev = async (lesson, fromSlot) => {
    const subjectId = subjects.find(s => s.name === fromSlot.subject)?.id;
    if (!subjectId) return;

    const sameSubjectLessons = lessons
      .filter(l => l.subject === subjectId && l.week_number === fromSlot.week_number && Number(l.school_year) === currentYear)
      .map(l => Number(l.lesson_number));

    const currentNum = fromSlot.lesson_number;

    let targetNumber = null;
    for (let i = currentNum - 1; i >= 1; i--) {
      if (!sameSubjectLessons.includes(i)) {
        targetNumber = i;
        break;
      }
    }

    if (!targetNumber) {
      toast('Keine freie Stunde davor in diesem Fach', { icon: 'Info' });
      return;
    }

    try {
      const { id, ...data } = lesson;
      await YearlyLesson.create({
        ...data,
        lesson_number: targetNumber,
        name: data.name + ' (Wdh.)',
        is_copy: true,
      });
      toast.success(`Dupliziert in ${targetNumber}. Stunde`);
      refetch?.();
    } catch (err) {
      console.error(err);
      toast.error('Fehler beim Duplizieren');
    }
  };

  const handleContextMenu = useCallback((e, lesson, slot) => {
    e.preventDefault();
    e.stopPropagation();

    // WICHTIG: Overlay sofort schließen!
    onHideHover();   // ← Das ist die Prop aus YearlyOverviewPage → ruft handleHideHover() dort auf

    const cellRect = e.currentTarget.getBoundingClientRect();

    setContextMenu({
      lesson,
      slot,
      cellRect,
    });
  }, [onHideHover]); // ← Dependency hinzufügen!

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const openWeekPicker = (mode, lesson, fromSlot) => {
    setPendingOperation({ mode, lesson, fromSlot }); // ← hier speichern
    setWeekPicker(true); // nur boolean, damit Modal öffnet
  };

  const handleWeekSelected = (week, year) => {
    setSlotPicker({ week, year });
    setWeekPicker(null);
  };

  const handleSlotSelected = async (target) => {
    // weekPicker ist jetzt leer → wir haben die Info in einem separaten State gespeichert
    if (!pendingOperation?.lesson) {
      toast.error('Fehler: Keine Lektion zum Verschieben/Kopieren ausgewählt');
      setSlotPicker(null);
      return;
    }

    const { mode, lesson } = pendingOperation;

    try {
      if (mode === 'move') {
        await YearlyLesson.update(lesson.id, {
          week_number: target.week_number,
          school_year: target.school_year,
          lesson_number: target.lesson_number,
          subject: target.subject,
        });
        toast.success(`Verschoben → ${target.subjectName} – ${target.lessonNumber}. Stunde`);
      } else {
        const { id, ...data } = lesson;
        await YearlyLesson.create({
          ...data,
          week_number: target.week_number,
          school_year: target.school_year,
          lesson_number: target.lesson_number,
          subject: target.subject,
          name: data.name + ' (Kopie)',
          is_copy: true,
        });
        toast.success(`Kopiert → ${target.subjectName} – ${target.lessonNumber}. Stunde`);
      }
      refetch?.();
    } catch (err) {
      console.error(err);
      toast.error('Fehler beim Verschieben/Kopieren');
    } finally {
      // WICHTIG: Alles zurücksetzen!
      setPendingOperation(null);
      setSlotPicker(null);
    }
  };

  // === useEffect mit Shortcuts kommt DANACH ===
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Nur reagieren, wenn kein Input/Textarea fokussiert ist
      if (
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Rechtsklick-Menü muss offen sein, damit Shortcut Sinn macht
      if (!contextMenu?.lesson) {
        // Optional: auch ohne Kontextmenü z. B. Delete erlauben, wenn eine Zelle fokussiert ist
        // → später erweiterbar
        return;
      }

      // ESC – alles schließen
      if (e.key === 'Escape') {
        e.preventDefault();
        closeContextMenu();
        setWeekPicker(null);
        setSlotPicker(null);
        setPendingOperation(null);
        return;
      }

      // Löschen mit Entf / Backspace / ⌫
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteLesson(contextMenu.lesson.id);
        closeContextMenu();
        return;
      }

      // Cmd/Ctrl + D → In nächste freie Stunde duplizieren
      if (cmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateNext(contextMenu.lesson, contextMenu.slot);
        closeContextMenu();

        // Zeige nur beim ersten Mal einen kleinen Tipp
        if (!localStorage.getItem('tip_duplicate_shortcut')) {
          toast('Tipp: ⌘/Strg + D = schnell duplizieren', { 
            icon: 'Rocket', 
            duration: 4000 
          });
          localStorage.setItem('tip_duplicate_shortcut', 'seen');
        }
        return;
      }

      // Cmd/Ctrl + C → Kopieren nach… öffnen
      if (cmdOrCtrl && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        openWeekPicker('copy', contextMenu.lesson, contextMenu.slot);
        return;
      }

      // Cmd/Ctrl + X → Ausschneiden (Verschieben nach…) – Bonus für Power-User
      if (cmdOrCtrl && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        openWeekPicker('move', contextMenu.lesson, contextMenu.slot);
        return;
      }

      // Strg + Pfeil nach oben → nächste freie Stunde
      if (cmdOrCtrl && e.key === 'ArrowUp') {
        e.preventDefault();
        if (checkNextSlotAvailable(contextMenu.lesson, contextMenu.slot)) {
          handleDuplicateNext(contextMenu.lesson, contextMenu.slot);
          closeContextMenu();
        } else {
          toast('Keine freie Stunde danach', { icon: 'Blocked' });
        }
        return;
      }

      // Strg + Pfeil nach unten → vorherige freie Stunde
      if (cmdOrCtrl && e.key === 'ArrowDown') {
        e.preventDefault();
        if (checkPrevSlotAvailable(contextMenu.lesson, contextMenu.slot)) {
          handleDuplicatePrev(contextMenu.lesson, contextMenu.slot);
          closeContextMenu();
        } else {
          toast('Keine freie Stunde davor', { icon: 'Blocked' });
        }
        return;
      }

      // Cmd/Ctrl + V → In aktuelle Woche + nächste freie Stunde einfügen (später erweiterbar)
      // (kann man später mit Clipboard simulieren oder direkt einfügen)
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    contextMenu,
    handleDeleteLesson,
    handleDuplicateNext,
    handleDuplicatePrev,
    checkNextSlotAvailable,
    checkPrevSlotAvailable,
    openWeekPicker,
    closeContextMenu,
  ]);

  const getWeekDateRange = useCallback((weekNumber, year) => {
    const weekNum = typeof weekNumber === 'object' ? weekNumber.week : weekNumber;
    const yearToUse = typeof weekNumber === 'object' && weekNumber.isNextYear ? year + 1 : year;
    const jan1 = new Date(yearToUse, 0, 1);
    const dayOfWeekJan1 = jan1.getDay();
    const daysToFirstThursday = (4 - dayOfWeekJan1 + 7) % 7;
    const firstThursday = new Date(jan1.getFullYear(), jan1.getMonth(), jan1.getDate() + daysToFirstThursday);
    const dayOfWeekFirstThursday = firstThursday.getDay();
    const diffToMondayOfFirstWeek = (dayOfWeekFirstThursday + 6) % 7;
    const mondayOfFirstWeek = new Date(firstThursday.getFullYear(), firstThursday.getMonth(), firstThursday.getDate() - diffToMondayOfFirstWeek);
    const mondayOfWeek = new Date(mondayOfFirstWeek.getFullYear(), mondayOfFirstWeek.getMonth(), mondayOfFirstWeek.getDate() + (weekNum - 1) * 7);
    const fridayOfWeek = new Date(mondayOfWeek.getFullYear(), mondayOfWeek.getMonth(), mondayOfWeek.getDate() + 4);
    const mondayStr = mondayOfWeek.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const fridayStr = fridayOfWeek.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    return { mondayStr, fridayStr };
  }, []);

  const getHolidayForWeek = useCallback((weekNumber) => {
    if (!holidays || holidays.length === 0) return null;
    const weekNum = typeof weekNumber === 'object' ? weekNumber.week : weekNumber;
    // NEU: Jahr aus dem weekNumber-Objekt extrahieren (wichtig für Schuljahr-Modus!)
    const yearToUse = typeof weekNumber === 'object' && weekNumber.year
      ? weekNumber.year
      : currentYear;
    // Verwende yearToUse statt currentYear für korrekte Wochenberechnung
    const jan4 = new Date(yearToUse, 0, 4);
    const daysToMonday = (jan4.getDay() + 6) % 7;
    const mondayOfWeek1 = new Date(jan4.getTime() - daysToMonday * 86400000);
    const weekStart = new Date(mondayOfWeek1);
    weekStart.setDate(mondayOfWeek1.getDate() + (weekNum - 1) * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    for (const holiday of holidays) {
      const holidayStart = new Date(holiday.start_date);
      holidayStart.setHours(0, 0, 0, 0);
      const holidayEnd = new Date(holiday.end_date);
      holidayEnd.setHours(23, 59, 59, 999);
      if (weekStart <= holidayEnd && weekEnd >= holidayStart) {
        return holiday;
      }
    }
    return null;
  }, [holidays, currentYear]);

  const handleCellClick = useCallback((lesson, slot) => {
    onLessonClick(lesson, slot);
  }, [onLessonClick]);

  const renderWeekRow = (week) => {
    const weekNum = typeof week === 'object' ? week.week : week;
    const isCurrentWeek = weekNum === currentWeek && (typeof week === 'object' && week.isNextYear ? currentYear + 1 : currentYear) === new Date().getFullYear();
    const weekDates = getWeekDateRange(week, currentYear);
    const holiday = getHolidayForWeek(week);
    const holidayDisplay = getHolidayDisplay(holiday);

    const subjectCells = uniqueSubjects.map((subjectObj) => {
      const lessonSlotsCount = subjectObj.lessons_per_week || subjectObj.weekly_lessons || 4;
      const subjectColor = subjectObj.color || '#3b82f6';
      const renderedSlots = new Set();
      const cells = [];

      for (let i = 0; i < lessonSlotsCount; i++) {
        const lessonNumber = i + 1;
        if (renderedSlots.has(lessonNumber)) continue;

        // Use subject ID for lookup key - matches lessonsByWeek key structure
        const key = `${weekNum}-${subjectObj.id}-${lessonNumber}`;
        const lesson = lessonsByWeek[key] || null;

        const slot = {
          week_number: weekNum,
          subject: subjectObj.name,           // Store name for display
          subject_id: subjectObj.id,          // Store ID for lookups
          class_id: subjectObj.class_id,      // Store class_id
          lesson_number: lessonNumber,
          school_year: currentYear
        };

        // Use name-based key for selection check - matches handleSelectLesson key format
        const selectionKey = `${weekNum}-${subjectObj.name}-${lessonNumber}`;
        const isSelected = isAssignMode ? selectedSet.has(selectionKey) : false;
        const hasTopic = !!lesson?.topic_id;

        // ================ LEERE SLOTS ================
        if (!lesson) {
          // Check if this empty slot should be spanned (template double lesson)
          const templateDoubleInfo = isSlotPartOfTemplateDouble(weekNum, subjectObj.name, lessonNumber, subjectObj.class_id);

          // Skip if this is the second part of a template double lesson
          if (templateDoubleInfo.isSecond) {
            renderedSlots.add(lessonNumber);
            continue;
          }

          // Determine width (1 or 2 cells for template double)
          const spanCount = templateDoubleInfo.isFirst ? 2 : 1;
          const emptyWidth = spanCount * cellWidth;

          // Mark next slot as rendered if spanning
          if (spanCount > 1) {
            renderedSlots.add(lessonNumber + 1);
            i += 1;
          }

          // Enhanced slot with double lesson info for modal
          const enhancedSlot = {
            ...slot,
            is_double_lesson: templateDoubleInfo.isFirst,
            _isTemplateDouble: templateDoubleInfo.isFirst
          };

          cells.push(
            <div
              key={key}
              className={`
                relative border border-gray-200 dark:border-slate-700 p-0.5
                ${isAssignMode ? 'cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/30' : 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30'}
                ${isSelected ? 'ring-4 ring-green-500 ring-inset bg-green-50 dark:bg-green-900/30' : ''}
                ${dragOverSlot?.week_number === weekNum &&
                  dragOverSlot?.subject === subjectObj.name &&
                  dragOverSlot?.lesson_number === lessonNumber
                    ? 'ring-4 ring-emerald-400 ring-inset bg-emerald-100 dark:bg-emerald-900/40 scale-105 z-10'
                    : ''
                }
              `}
              style={{ width: `${emptyWidth}px`, height: `${rowHeight}px` }}
              onClick={() => isAssignMode ? onSelectLesson(enhancedSlot) : onLessonClick(null, enhancedSlot)}
              onDragOver={(e) => {
                e.preventDefault();
                handleDragOver(e, enhancedSlot);
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const lessonId = e.dataTransfer.getData('lessonId');
                const isCopy = e.dataTransfer.getData('isCopy') === 'true';
                handleDrop(lessonId, enhancedSlot, isCopy);
              }}
            >
              {isAssignMode && (
                <Checkbox
                  checked={isSelected}
                  className="absolute top-2 left-2 z-50 pointer-events-none"
                />
              )}
              <YearLessonCell
                lesson={null}
                onClick={undefined}
                activeTopicId={activeTopicId}
                defaultColor={subjectColor}
                densityMode={densityMode}
                lessonSlot={enhancedSlot}
                lessonData={lesson}
                onContextMenu={handleContextMenu}
              />
            </div>
          );
          continue;
        }

        // ================ BELEGTE THEMEN (Topic-Blöcke) ================
        if (hasTopic) {
          const topic = topicsById.get(lesson.topic_id);
          if (topic) {
            let span = 0;
            const topicLessons = [];

            // Starte mit der aktuellen Lektion
            let j = lessonNumber;
            while (j <= lessonSlotsCount) {
              const checkKey = `${weekNum}-${subjectObj.id}-${j}`;
              const check = j === lessonNumber ? lesson : lessonsByWeek[checkKey];

              if (check && check.topic_id === lesson.topic_id) {
                topicLessons.push(check);

                // Doppellektionen belegen 2 Slots
                if (check.is_double_lesson) {
                  span += 2;
                  j += 2; // Überspringe den nächsten Slot
                } else {
                  span += 1;
                  j += 1;
                }
              } else {
                break;
              }
            }

            // Markiere alle belegten Slots NACH dem Loop
            for (let s = lessonNumber; s < lessonNumber + span; s++) {
              renderedSlots.add(s);
            }

            // Doppelstunden-Fallback bleibt unverändert (der ist separat ok)
            if (span === 1 && lesson.is_double_lesson && lesson.second_yearly_lesson_id) {
              // ...
            }

            if (span > 1) i += span - 1;

            const topicWidth = span * cellWidth;

            cells.push(
              <div
                key={`topic-${lesson.id}`}
                className="yearly-topic-cell p-0 border border-gray-200 dark:border-slate-700"
                style={{ width: `${topicWidth}px`, height: `${rowHeight}px` }}
                onMouseEnter={(e) => onShowHover({ ...lesson, topic_id: topic.id, color: topic.color || subjectColor, mergedLessons: topicLessons }, e)}
                onMouseLeave={onHideHover}
                onDragOver={(e) => {
                  e.preventDefault();
                  handleDragOver(e, slot);
                }}
                onDragLeave={handleDragLeave}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation(); // wichtig!
                  const lessonId = e.dataTransfer.getData('lessonId');
                  const isCopy = e.dataTransfer.getData('isCopy') === 'true';
                  handleDrop(lessonId, slot, isCopy);
                }}
              >
                <div
                  className="h-full w-full cursor-pointer flex items-center justify-center text-center rounded-md relative"
                  style={{
                    background: `linear-gradient(135deg, ${topic.color} 0%, ${adjustColor(topic.color, -20)} 100%)`,
                    border: `1px solid ${topic.color}`,
                    color: 'white'
                  }}
                  onClick={() => handleCellClick({ ...lesson, topic_id: topic.id, mergedLessons: topicLessons }, null)}
                >
                  {/* Prüfungs-Badge wenn Topic Prüfungen enthält */}
                  {topicLessons.some(l => l.is_exam) && (
                    <LessonBadge variant="exam" position="top-right" />
                  )}
                  <div className={`text-xs font-bold px-1 ${densityMode === 'compact' ? 'text-[10px]' : ''}`}>
                    <div className="truncate">{topic.name}</div>
                  </div>
                </div>
              </div>
            );
            continue;
          }
        }

        // ================ DOUBLE-LEKTIONEN ================
        // Check: template-based, unified (fixed mode), OR manual double lesson
        const lessonSpanInfo = spanningInfo.get(lesson.id);
        const hasSecondLessonId = lesson.is_double_lesson && lesson.second_yearly_lesson_id;
        const isUnifiedDouble = lesson.is_double_lesson && !lesson.second_yearly_lesson_id;
        const isTemplateDouble = lessonSpanInfo && !lessonSpanInfo.isSecondPart;

        if (hasSecondLessonId || isUnifiedDouble || isTemplateDouble) {
          let span = 1;
          let secondLessonId = null;

          if (isTemplateDouble) {
            // Template-based double lesson
            span = lessonSpanInfo.spanCount || 1;
            secondLessonId = lessonSpanInfo.secondLessonId;

            // Mark second lesson as rendered
            if (span === 2 && secondLessonId) {
              const secondLesson = yearlyLessonsById.get(secondLessonId);
              if (secondLesson) {
                renderedSlots.add(Number(secondLesson.lesson_number));
                i += 1; // Skip next iteration
              }
            }
          } else if (isUnifiedDouble) {
            // NEW: Unified double (fixed mode) - no second lesson ID
            span = 2;
            secondLessonId = null;
            // Mark next slot as rendered to prevent L3 from showing
            renderedSlots.add(lessonNumber + 1);
            i += 1;
          } else {
            // Traditional manual double lesson (flexible mode)
            const nextKey = `${week}-${subjectObj.id}-${lessonNumber + 1}`;
            const nextLesson = lessonsByWeek[nextKey];
            if (nextLesson && nextLesson.id === lesson.second_yearly_lesson_id) {
              span = 2;
              secondLessonId = nextLesson.id;
              renderedSlots.add(lessonNumber + 1);
              i += 1;
            }
          }

          const doubleWidth = span * cellWidth;

          cells.push(
            <div
              key={key}
              className={`
                relative border border-gray-200 dark:border-slate-700 p-0.5
                ${isAssignMode && !hasTopic ? 'cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/30' : ''}
                ${isSelected ? 'ring-4 ring-green-500 ring-inset bg-green-50 dark:bg-green-900/30' : ''}
                ${dragOverSlot?.week_number === weekNum &&
                  dragOverSlot?.subject === subjectObj.name &&
                  dragOverSlot?.lesson_number === lessonNumber
                    ? 'ring-4 ring-emerald-400 ring-inset bg-emerald-100 dark:bg-emerald-900/40 scale-105 z-10'
                    : ''
                }
              `}
              style={{ width: `${doubleWidth}px`, height: `${rowHeight}px` }}
              onClick={() => isAssignMode && !hasTopic && onSelectLesson(slot)}
              onDragOver={(e) => {
                e.preventDefault();
                handleDragOver(e, slot);
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation(); // wichtig!
                const lessonId = e.dataTransfer.getData('lessonId');
                const isCopy = e.dataTransfer.getData('isCopy') === 'true';
                handleDrop(lessonId, slot, isCopy);
              }}
            >
              {isAssignMode && !hasTopic && (
                <Checkbox checked={isSelected} className="absolute top-2 left-2 z-50 pointer-events-none" />
              )}
              <YearLessonCell
                lesson={{
                  ...lesson,
                  color: subjectColor,
                  subjectName: subjectObj.name,
                  is_double_lesson: true,
                  second_yearly_lesson_id: secondLessonId
                }}
                onClick={isAssignMode && !hasTopic ? undefined : () => handleCellClick(lesson, slot)}
                activeTopicId={activeTopicId}
                defaultColor={subjectColor}
                densityMode={densityMode}
                isDoubleLesson={true}
                // === NEU ===
                lessonSlot={slot}
                lessonData={lesson}
                onContextMenu={handleContextMenu}
              />
            </div>
          );
          continue;
        }

        // ================ NORMALE EINZELNE LEKTIONEN ================
        // NEU: Prüfe auf Auto-Spanning (Fixed Schedule)
        const spanInfo = spanningInfo.get(lesson.id);

        // Überspringe, wenn dies der zweite Teil eines Spans ist
        if (spanInfo?.isSecondPart) {
          renderedSlots.add(lessonNumber);
          continue;
        }

        // Bestimme die Breite (1 oder 2 Zellen)
        const cellSpan = spanInfo?.spanCount || 1;
        const spanWidth = cellSpan * cellWidth;

        // Wenn Spanning, markiere nächsten Slot als gerendert
        if (cellSpan > 1) {
          renderedSlots.add(lessonNumber + 1);
          i += 1;
        }

        cells.push(
          <div
            key={key}
            className={`
              relative border border-gray-200 dark:border-slate-700 p-0.5
              ${isAssignMode && !hasTopic ? 'cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/30' : ''}
              ${isSelected ? 'ring-4 ring-green-500 ring-inset bg-green-50 dark:bg-green-900/30' : ''}
              ${dragOverSlot?.week_number === weekNum &&
                dragOverSlot?.subject === subjectObj.name &&
                dragOverSlot?.lesson_number === lessonNumber
                  ? 'ring-4 ring-emerald-400 ring-inset bg-emerald-100 dark:bg-emerald-900/40 scale-105 z-10'
                  : ''
              }
            `}
            style={{ width: `${spanWidth}px`, height: `${rowHeight}px` }}
            onClick={() => isAssignMode && !hasTopic && onSelectLesson(slot)}
            onDragOver={(e) => {
              e.preventDefault();
              handleDragOver(e, slot);
            }}
            onDragLeave={handleDragLeave}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation(); // wichtig!
              const lessonId = e.dataTransfer.getData('lessonId');
              const isCopy = e.dataTransfer.getData('isCopy') === 'true';
              handleDrop(lessonId, slot, isCopy);
            }}
          >
            {isAssignMode && !hasTopic && (
              <Checkbox
                checked={isSelected}
                className="absolute top-2 left-2 z-50 pointer-events-none"
              />
            )}
            <YearLessonCell
              lesson={{ ...lesson, color: subjectColor, subjectName: subjectObj.name }}
              onClick={isAssignMode && !hasTopic ? undefined : () => handleCellClick(lesson, slot)}
              activeTopicId={activeTopicId}
              defaultColor={subjectColor}
              onMouseEnter={(e) => onShowHover({ ...lesson, color: subjectColor }, e)}
              onMouseLeave={onHideHover}
              allYearlyLessons={allYearlyLessons}
              densityMode={densityMode}
              // === NEU ===
              lessonSlot={slot}
              lessonData={lesson}
              onContextMenu={handleContextMenu}
              // Drag-Handler
              onDragStart={handleDragStart}
              onDragOver={(e) => handleDragOver(e, slot)}
              onDrop={(lessonId, targetSlot, isCopy) => handleDrop(lessonId, targetSlot, isCopy)}
            />
          </div>
        );
      }

      return <div key={subjectObj.id} className="flex">{cells}</div>;
    });

    // Rest der renderWeekRow bleibt unverändert (Wochen-Header, Holiday-Overlay usw.)
    return (
      <div className={`flex flex-nowrap relative ${isCurrentWeek ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`} style={{ height: `${rowHeight}px` }}>
        {holiday && (
          <div
            className="absolute flex flex-col items-center justify-center text-center text-white pointer-events-none"
            style={{
              left: `${weekColumnWidth}px`,
              top: 0,
              width: `${totalWidth - weekColumnWidth}px`,
              height: `${rowHeight}px`,
              background: holidayDisplay.pattern ? `${holidayDisplay.gradient}, ${holidayDisplay.pattern}` : holidayDisplay.gradient,
              zIndex: 15,
              borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
              borderRight: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <div className={densityMode === 'compact' ? 'text-base' : 'text-2xl'}>{holidayDisplay.emoji}</div>
            <span className={`text-sm font-bold leading-tight mt-1 ${densityMode === 'compact' ? 'text-xs' : ''}`}>
              {holiday.name.length > 15 ? `${holiday.name.substring(0, 12)}...` : holiday.name}
            </span>
          </div>
        )}
        <div
          className={`sticky left-0 p-3 text-center font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-r-2 border-b border-gray-400 dark:border-slate-600 z-20 ${isCurrentWeek ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
          style={{
            width: `${weekColumnWidth}px`,
            minWidth: `${weekColumnWidth}px`,
            maxWidth: `${weekColumnWidth}px`,
            height: `${rowHeight}px`,
            zIndex: 30,
          }}
        >
          <div className={`text-sm ${densityMode === 'compact' ? 'text-xs' : ''}`}>
            KW {typeof week === 'object' ? week.display : week}
            {typeof week === 'object' && week.isNextYear && <span className="text-xs opacity-70"> ({currentYear + 1})</span>}
          </div>
          <div className={`text-xs text-gray-500 dark:text-slate-400 ${densityMode === 'compact' ? 'hidden' : ''}`}>
            {weekDates.mondayStr} - {weekDates.fridayStr}
          </div>
        </div>
        {subjectCells}
      </div>
    );
  };

  if (!subjects || subjects.length === 0 || uniqueSubjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-gray-400 dark:border-slate-700">
        Keine Fächer für diese Klasse gefunden. Überprüfen Sie die Datenladung in YearlyOverview oder entities.js.
      </div>
    );
  }

  // ────── SICHERE selectedSet Definition (ab ca. Zeile 440) ──────
  const selectedSet = useMemo(() => {
    // Nur im Assign-Modus relevant – sonst immer leer
    if (!isAssignMode || !selectedLessons) return new Set();
    // Unterstützt beide Formate: string und object { key, is_double_lesson }
    return new Set(selectedLessons.map(item =>
      typeof item === 'string' ? item : item.key
    ));
  }, [isAssignMode, selectedLessons]);

  return (
    <div className="yearly-grid-container bg-white dark:bg-slate-800 rounded-xl shadow-sm h-full flex flex-col relative w-full min-h-0 overflow-hidden"> {/* Container passt sich Parent an */}
      {/* 1. KLASSEN-SELECTION sticky */}
      <ClassSelectorBar
        classes={classes || []}
        activeClassId={activeClassId}
        onSelectClass={onSelectClass}
      />

      {/* 2. Scroll-Container */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-auto relative w-full yearly-table-container"
        onScroll={handleScroll}
      >
        {/* Fächer-Header – sticky + zentriert */}
        <div
          ref={subjectHeaderRef}
          className="z-40 bg-white dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-600 flex flex-nowrap sticky top-0"
          style={{ 
            height: `${rowHeight}px`, 
            minWidth: `${totalWidth}px`, 
            // unverändert
            boxSizing: 'border-box',
          }}
        >
          <div className="sticky left-0 z-50 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-3 font-bold text-slate-800 dark:text-slate-100 text-center border-b-2 border-r-2 border-slate-200 dark:border-slate-600" style={{ width: `${weekColumnWidth}px`, minWidth: `${weekColumnWidth}px`, maxWidth: `${weekColumnWidth}px` }}>Woche</div>
          {subjects.map((sub, i) => {
            const blockWidth = subjectBlockWidths[i] || 100;
            const subjectColor = sub.color || '#3b82f6';

            // Diagonaler Gradient für modernes Design (wie bei Lektionszellen)
            const gradientColor = subjectColor + '50'; // 31% Opazität für sichtbaren Gradient

            return (
              <div
                key={sub.id}
                className={`p-3 font-bold text-center text-slate-800 dark:text-slate-100 border-l border-slate-200 dark:border-slate-600
                  ${i === 0 ? 'border-l-0' : ''}
                  ${i === subjects.length - 1 ? 'border-r-2 border-slate-200 dark:border-slate-600' : ''}`}
                style={{
                  width: `${blockWidth}px`,
                  minWidth: `${blockWidth}px`,
                  maxWidth: `${blockWidth}px`,
                  background: createGradient(gradientColor, -15),
                  borderBottom: `3px solid ${adjustColor(subjectColor, -10)}`,
                  height: `${rowHeight}px`,
                }}
              >
                <div className="flex items-center justify-center">
                  <span className="truncate">{getDisplayName(sub)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Wochen */}
        <div style={{ minWidth: `${totalWidth}px` }}>
          {weeks.map(weekObj => (
            <React.Fragment key={weekObj.id}> {/* STABILER KEY! */}
              {renderWeekRow(weekObj)}
            </React.Fragment>
          ))}
        </div>
      </div>
      {/* === NEU === */}
      {contextMenu && (
        <LessonContextMenu
          isOpen={!!contextMenu}
          onClose={closeContextMenu}
          cellRect={contextMenu.cellRect}          // ← NEU: genaue Zellenposition
          lesson={contextMenu.lesson}
          slot={contextMenu.slot}
          readOnly={readOnly}                      // Team Teaching: Nur-Einsicht-Modus
          onMove={() => openWeekPicker('move', contextMenu.lesson, contextMenu.slot)}
          onCopy={() => openWeekPicker('copy', contextMenu.lesson, contextMenu.slot)}
          onDuplicateNext={() => {
            const available = checkNextSlotAvailable(contextMenu.lesson, contextMenu.slot);
            if (available) {
              handleDuplicateNext(contextMenu.lesson, contextMenu.slot);
            } else {
              toast('Keine freie Stunde danach', { icon: 'Blocked' });
            }
            closeContextMenu();
          }}
          nextSlotAvailable={checkNextSlotAvailable(contextMenu.lesson, contextMenu.slot)}

          onDuplicatePrev={() => {
            const available = checkPrevSlotAvailable(contextMenu.lesson, contextMenu.slot);
            if (available) {
              handleDuplicatePrev(contextMenu.lesson, contextMenu.slot);
            } else {
              toast('Keine freie Stunde davor', { icon: 'Blocked' });
            }
            closeContextMenu();
          }}
          prevSlotAvailable={checkPrevSlotAvailable(contextMenu.lesson, contextMenu.slot)}

          onEdit={() => {
            handleCellClick(contextMenu.lesson, contextMenu.slot);
            closeContextMenu();
          }}
          onDelete={() => {
            handleDeleteLesson(contextMenu.lesson.id);
            closeContextMenu();
          }}
        />
      )}

      {weekPicker && (
        <WeekPickerModal
          isOpen={!!weekPicker}
          onClose={() => setWeekPicker(null)}
          onWeekSelect={handleWeekSelected}
          currentYear={currentYear}
          yearViewMode={yearViewMode}
          schoolYearStartWeek={schoolYearStartWeek}
          currentWeek={getCurrentWeek()}
        />
      )}

      {slotPicker && (
        <SlotPickerModal
          isOpen={!!slotPicker}
          onClose={() => setSlotPicker(null)}
          onSelect={handleSlotSelected}
          week={slotPicker.week}
          year={slotPicker.year}
          subjects={subjects.map(s => ({
            id: s.id,
            name: s.name,
            lessons_per_week: s.lessons_per_week || 4, // ← hier!
          }))}
          occupiedSlots={new Set(
            lessons
              .filter(l => l.week_number === slotPicker.week && Number(l.school_year) === slotPicker.year)
              .map(l => `${l.subject}-${l.lesson_number}`)
          )}
        />
      )}
    </div>
  );
};

YearlyGrid.displayName = 'YearlyGrid';

export default YearlyGrid;