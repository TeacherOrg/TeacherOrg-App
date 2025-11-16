import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import YearLessonCell from './YearLessonCell';
import { adjustColor } from '@/utils/colorUtils';
import { Checkbox } from '@/components/ui/checkbox';
import ClassSelectorBar from './ClassSelectorBar';

const ACADEMIC_WEEKS = 52;

const getHolidayDisplay = (holiday) => {
  if (!holiday) return { emoji: '', color: '', gradient: '' };
  switch (holiday.type) {
    case 'vacation':
      if (holiday.name.includes('Sommer')) return { emoji: '☀️', color: 'bg-yellow-800/50 dark:bg-yellow-800/50', gradient: 'linear-gradient(135deg, rgba(234, 179, 8, 0.7), rgba(202, 138, 4, 0.5))' };
      if (holiday.name.includes('Herbst')) return { emoji: '🍂', color: 'bg-orange-800/50 dark:bg-orange-800/50', gradient: 'linear-gradient(135deg, rgba(249, 115, 22, 0.7), rgba(194, 65, 12, 0.5))' };
      if (holiday.name.includes('Weihnacht')) return { emoji: '🎄', color: 'bg-green-800/50 dark:bg-green-800/50', gradient: 'linear-gradient(135deg, rgba(22, 163, 74, 0.7), rgba(20, 83, 45, 0.5))' };
      if (holiday.name.includes('Sport')) return { emoji: '⛷️', color: 'bg-blue-800/50 dark:bg-blue-800/50', gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.7), rgba(29, 78, 216, 0.5))' };
      if (holiday.name.includes('Frühling')) return { emoji: '🌸', color: 'bg-pink-800/50 dark:bg-pink-800/50', gradient: 'linear-gradient(135deg, rgba(219, 39, 119, 0.7), rgba(157, 23, 77, 0.5))' };
      return { emoji: '🏖️', color: 'bg-blue-800/50 dark:bg-blue-800/50', gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.7), rgba(8, 145, 178, 0.5))' };
    case 'holiday': return { emoji: '🎉', color: 'bg-purple-800/50 dark:bg-purple-800/50', gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.7), rgba(126, 34, 206, 0.5))' };
    case 'training': return { emoji: '📚', color: 'bg-orange-800/50 dark:bg-orange-800/50', gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.7), rgba(67, 56, 202, 0.5))' };
    default: return { emoji: '📅', color: 'bg-gray-800/50 dark:bg-gray-800/50', gradient: 'linear-gradient(135deg, rgba(107, 114, 128, 0.7), rgba(75, 85, 99, 0.5))' };
  }
};

const getCurrentWeek = () => {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const daysToMonday = (jan4.getDay() + 6) % 7;
  const mondayOfWeek1 = new Date(jan4.getTime() - daysToMonday * 86400000);
  const diffTime = now.getTime() - mondayOfWeek1.getTime();
  return Math.max(1, Math.min(52, Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1));
};

const YearlyGrid = React.memo(({
  lessons,
  topics,
  subjects,
  academicWeeks = ACADEMIC_WEEKS,
  onLessonClick,
  activeClassId,
  activeTopicId,
  currentYear,
  activeClassName,
  holidays = [],
  onShowHover,
  onHideHover,
  allYearlyLessons,
  densityMode = 'standard',
  isAssignMode = false,
  selectedLessons = [],
  onSelectLesson,
  classes,
  onSelectClass
}) => {
  const containerRef = useRef(null);
  const subjectHeaderRef = useRef(null);
  const hasScrolledToCurrentWeek = useRef(false);

  const weekColumnWidth = 120;
  const horizontalPadding = 48;

  const [availableWidth, setAvailableWidth] = useState(0);

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
    const result = lessons.reduce((acc, lesson) => {
      const subjectObj = subjects.find(s => s.id === lesson.subject) || { name: 'Unbekannt', color: '#3b82f6' };
      const key = `${lesson.week_number}-${subjectObj.name}-${Number(lesson.lesson_number)}`;
      acc[key] = { ...lesson, subjectName: subjectObj.name };
      return acc;
    }, {});
    return result;
  }, [lessons, subjects]);

  const topicsById = useMemo(() => {
    if (!topics) return new Map();
    return new Map(topics.map(t => [t.id, t]));
  }, [topics]);

  const subjectsByName = useMemo(() => {
    return subjects.reduce((acc, subject) => {
      acc[subject.name] = subject;
      return acc;
    }, {});
  }, [subjects]);

  const uniqueSubjects = useMemo(() => [...new Set(subjects.map(s => s.name))], [subjects]);
  
  const lessonsPerWeekBySubject = useMemo(() => {
    return subjects.reduce((acc, sub) => {
      acc[sub.name] = sub.lessons_per_week || 4;
      return acc;
    }, {});
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

  const BASE_CELL_WIDTHS = { compact: 72, standard: 82, spacious: 92 };
  const minCellWidth = BASE_CELL_WIDTHS[densityMode] || 82;
  const maxCellWidth = 160;

  const effectiveAvailableWidth = availableWidth || 800;

  const totalSlots = uniqueSubjects.reduce((sum, subject) => sum + (lessonsPerWeekBySubject[subject] || 4), 0) || 1;
  const cellWidth = Math.min(maxCellWidth, Math.max(minCellWidth, effectiveAvailableWidth / totalSlots));

  const subjectBlockWidths = useMemo(() => uniqueSubjects.map(s => (lessonsPerWeekBySubject[s] || 4) * cellWidth), [uniqueSubjects, lessonsPerWeekBySubject, cellWidth]);
  const totalWidth = weekColumnWidth + subjectBlockWidths.reduce((a, b) => a + b, 0);
  const rowHeight = densityMode === 'compact' ? 48 : densityMode === 'spacious' ? 80 : 68;

  const weeks = useMemo(() => Array.from({ length: academicWeeks }, (_, i) => i + 1), [academicWeeks]);

  const currentWeek = getCurrentWeek();

  // Horizontal scroll sync
  const handleScroll = useCallback(() => {
    if (subjectHeaderRef.current && containerRef.current) {
      subjectHeaderRef.current.scrollLeft = containerRef.current.scrollLeft;
    }
  }, []);

  // Scroll to current week
  useEffect(() => {
    if (containerRef.current && !hasScrolledToCurrentWeek.current && currentYear === new Date().getFullYear()) {
      setTimeout(() => {
        const target = (currentWeek - 1) * rowHeight;
        containerRef.current.scrollTop = target;
        hasScrolledToCurrentWeek.current = true;
      }, 300);
    }
  }, [currentWeek, rowHeight, currentYear, uniqueSubjects.length]);

  const getWeekDateRange = useCallback((weekNumber, year) => {
    const jan1 = new Date(year, 0, 1);
    const dayOfWeekJan1 = jan1.getDay();
    const daysToFirstThursday = (4 - dayOfWeekJan1 + 7) % 7;
    const firstThursday = new Date(jan1.getFullYear(), jan1.getMonth(), jan1.getDate() + daysToFirstThursday);
    const dayOfWeekFirstThursday = firstThursday.getDay();
    const diffToMondayOfFirstWeek = (dayOfWeekFirstThursday + 6) % 7;
    const mondayOfFirstWeek = new Date(firstThursday.getFullYear(), firstThursday.getMonth(), firstThursday.getDate() - diffToMondayOfFirstWeek);
    const mondayOfWeek = new Date(mondayOfFirstWeek.getFullYear(), mondayOfFirstWeek.getMonth(), mondayOfFirstWeek.getDate() + (weekNumber - 1) * 7);
    const fridayOfWeek = new Date(mondayOfWeek.getFullYear(), mondayOfWeek.getMonth(), mondayOfWeek.getDate() + 4);
    const mondayStr = mondayOfWeek.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const fridayStr = fridayOfWeek.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    return { mondayStr, fridayStr };
  }, []);

  const getHolidayForWeek = useCallback((weekNumber) => {
    if (!holidays || holidays.length === 0) return null;
    const janFirst = new Date(currentYear, 0, 1);
    const firstDayOfYear = janFirst.getDay();
    const firstMonday = new Date(janFirst);
    if (firstDayOfYear !== 1) {
      const daysUntilNextMonday = (8 - firstDayOfYear) % 7;
      firstMonday.setDate(janFirst.getDate() + daysUntilNextMonday);
    }
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
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

  const [classHeaderHeight, setClassHeaderHeight] = useState(50);
  const [subjectHeaderHeight, setSubjectHeaderHeight] = useState(rowHeight);

  useEffect(() => {
    setSubjectHeaderHeight(rowHeight);
  }, [rowHeight]);

  useEffect(() => {
    const updateDimensions = () => {
      if (subjectHeaderRef.current) {
        setClassHeaderHeight(subjectHeaderRef.current.getBoundingClientRect().height);
      }
    };

    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);

    updateDimensions(); // Initial call

    return () => observer.disconnect();
  }, [densityMode, uniqueSubjects.length]);

  useEffect(() => {
    if (containerRef.current && !hasScrolledToCurrentWeek.current && uniqueSubjects.length > 0 && currentYear === new Date().getFullYear()) {
      setTimeout(() => {
        const target = (currentWeek - 1) * rowHeight;
        containerRef.current.scrollTop = target;
        hasScrolledToCurrentWeek.current = true;
      }, 500);
    }
  }, [uniqueSubjects.length, currentWeek, currentYear]);

  useEffect(() => {
    hasScrolledToCurrentWeek.current = false;
  }, [activeClassId, densityMode]);

  if (!subjects || subjects.length === 0 || uniqueSubjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-gray-400 dark:border-slate-700">
        Keine Fächer für diese Klasse gefunden. Überprüfen Sie die Datenladung in YearlyOverview oder entities.js.
      </div>
    );
  }

  const selectedSet = useMemo(() => new Set(selectedLessons.filter(l => typeof l === 'string')), [selectedLessons]);

  const renderWeekRow = (week) => {
    const isCurrentWeek = week === currentWeek && currentYear === new Date().getFullYear();
    const weekDates = getWeekDateRange(week, currentYear);
    const holiday = getHolidayForWeek(week);
    const holidayDisplay = getHolidayDisplay(holiday);

    const subjectCells = uniqueSubjects.map((subject) => {
      const lessonSlotsCount = lessonsPerWeekBySubject[subject] || 4;
      const subjectColor = subjectsByName[subject]?.color || '#3b82f6';
      const subjectId = subjectsByName[subject]?.id;
      const renderedSlots = new Set();
      const cells = [];

      for (let i = 0; i < lessonSlotsCount; i++) {
        const lessonNumber = i + 1;

        if (renderedSlots.has(lessonNumber)) continue;

        const lessonKey = `${week}-${subject}-${lessonNumber}`;
        const lesson = lessonsByWeek[lessonKey] || null;
        const slot = { week_number: week, subjectName: subject, subject: subjectsByName[subject].id, lesson_number: lessonNumber, school_year: currentYear };

        if (!lesson) {
          const isSelected = selectedLessons.some(l => {
            const [w, subId, num] = l.split('-');
            return Number(w) === week && subId === subjectId && Number(num) === lessonNumber;
          });
          cells.push(
            <div
              key={`${subject}-${lessonNumber}`}
              className={`p-0.5 border border-gray-200 dark:border-slate-700 ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
              style={{
                width: `${cellWidth}px`,
                minWidth: `${cellWidth}px`,
                maxWidth: `${cellWidth}px`,
                height: `${rowHeight}px`
              }}
              onClick={isAssignMode ? () => onSelectLesson({ week_number: week, subject: subjectId, lesson_number: lessonNumber }) : undefined}
            >
              <div className="h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900/50">
                {isAssignMode && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelectLesson({ week_number: week, subject: subjectId, lesson_number: lessonNumber })}
                    className="absolute top-2 left-2 z-50"
                  />
                )}
                <YearLessonCell
                  lesson={null}
                  onClick={() => handleCellClick(null, slot)}
                  activeTopicId={activeTopicId}
                  defaultColor={subjectColor}
                  densityMode={densityMode}
                />
              </div>
            </div>
          );
          continue;
        }

        if (lesson.topic_id) {
          const topic = topicsById.get(lesson.topic_id);
          if (topic) {
            let span = 0;
            const topicLessons = [];

            let j = lessonNumber;
            while (j <= lessonSlotsCount) {
              const checkKey = `${week}-${subject}-${j}`;
              const checkLesson = lessonsByWeek[checkKey] || null;
              
              if (checkLesson && checkLesson.topic_id === lesson.topic_id) {
                topicLessons.push(checkLesson);
                span += 1;
                renderedSlots.add(j);
                j++;
              } else {
                break;
              }
            }

            if (span === 1 && lesson.is_double_lesson && lesson.second_yearly_lesson_id) {
              const nextNumber = lessonNumber + 1;
              const nextKey = `${week}-${subject}-${nextNumber}`;
              const nextLesson = lessonsByWeek[nextKey] || null;
              
              if (nextLesson && nextLesson.topic_id === lesson.topic_id) {
                span += 1;
                renderedSlots.add(nextNumber);
                topicLessons.push(nextLesson);
              }
            }

            if (span > 1) {
              i += span - 1;
            }

            const topicWidth = span * cellWidth;

            cells.push(
              <div
                key={`topic-${lesson.id || lessonKey}`}
                className="p-0 border border-gray-200 dark:border-slate-700"
                style={{
                  width: `${topicWidth}px`,
                  minWidth: `${topicWidth}px`,
                  maxWidth: `${topicWidth}px`,
                  height: `${rowHeight}px`
                }}
                onMouseEnter={(e) => onShowHover({
                  ...lesson,
                  topic_id: topic.id,
                  color: topic.color || subjectColor,
                  mergedLessons: topicLessons
                }, e)}
                onMouseLeave={onHideHover}
              >
                <div
                  className="h-full w-full cursor-pointer flex items-center justify-center text-center rounded-md"
                  style={{
                    background: `linear-gradient(135deg, ${topic.color} 0%, ${adjustColor(topic.color, -20)} 100%)`,
                    border: `1px solid ${topic.color}`,
                    color: 'white'
                  }}
                  onClick={() => handleCellClick({
                    ...lesson,
                    topic_id: topic.id,
                    mergedLessons: topicLessons
                  }, null)}
                >
                  <div className={`text-xs font-bold px-1 ${densityMode === 'compact' ? 'text-[10px]' : ''}`}>
                    <div className="truncate">{topic.name}</div>
                  </div>
                </div>
              </div>
            );
            continue;
          }
        }

        if (lesson.is_double_lesson && lesson.second_yearly_lesson_id) {
          const nextNumber = lessonNumber + 1;
          const nextKey = `${week}-${subject}-${nextNumber}`;
          const nextLesson = lessonsByWeek[nextKey] || null;
          
          let span = 1;
          if (nextLesson && nextLesson.id === lesson.second_yearly_lesson_id) {
            span = 2;
            i += 1;
            renderedSlots.add(nextNumber);
          }

          const lessonToPass = { 
            ...lesson, 
            color: subjectColor,
            subjectName: subject,
            is_double_lesson: true,
            second_yearly_lesson_id: lesson.second_yearly_lesson_id
          };

          const doubleWidth = span * cellWidth;

          cells.push(
            <div
              key={lessonKey}
              className="p-0.5 border border-gray-200 dark:border-slate-700"
              style={{
                width: `${doubleWidth}px`,
                minWidth: `${doubleWidth}px`,
                maxWidth: `${doubleWidth}px`,
                height: `${rowHeight}px`
              }}
            >
              <YearLessonCell
                lesson={lessonToPass}
                onClick={() => handleCellClick(lessonToPass, slot)}
                activeTopicId={activeTopicId}
                defaultColor={subjectColor}
                densityMode={densityMode}
                isDoubleLesson={true}
              />
            </div>
          );
          continue;
        }

        const lessonToPass = { 
          ...lesson, 
          color: subjectColor,
          subjectName: subject
        };

        cells.push(
          <div
            key={lessonKey}
            className="p-0.5 border border-gray-200 dark:border-slate-700"
            style={{
              width: `${cellWidth}px`,
              minWidth: `${cellWidth}px`,
              maxWidth: `${cellWidth}px`,
              height: `${rowHeight}px`
            }}
          >
            {isAssignMode && !lesson.topic_id && (
              <Checkbox
                checked={selectedLessons.includes(lesson.id)}
                onCheckedChange={() => onLessonClick(lesson, slot)}
                className="absolute top-2 left-2 z-50"
              />
            )}
            <YearLessonCell
              lesson={lessonToPass}
              onClick={() => handleCellClick(lessonToPass, slot)}
              activeTopicId={activeTopicId}
              defaultColor={subjectColor}
              onMouseEnter={(e) => onShowHover(lessonToPass, e)}
              onMouseLeave={onHideHover}
              allYearlyLessons={allYearlyLessons}
              densityMode={densityMode}
            />
          </div>
        );
      }

      return (
        <div key={subject} className="flex">
          {cells}
        </div>
      );
    });

    return (
      <div className={`flex flex-nowrap relative ${isCurrentWeek ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`} style={{ height: `${rowHeight}px` }}>
        {holiday && (
          <div
            className="absolute flex flex-col items-center justify-center text-center text-white pointer-events-none"
            style={{
              width: `${totalWidth}px`,
              height: `${rowHeight}px`,
              background: holidayDisplay.gradient,
              zIndex: 15,
              borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
              borderRight: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <div className="text-2xl">{holidayDisplay.emoji}</div>
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
            left: 0,
            zIndex: 30
          }}
        >
          <div className={`text-sm ${densityMode === 'compact' ? 'text-xs' : ''}`}>
            KW {week}
          </div>
          <div className={`text-xs text-gray-500 dark:text-slate-400 ${densityMode === 'compact' ? 'hidden' : ''}`}>
            {weekDates.mondayStr} - {weekDates.fridayStr}
          </div>
          {holiday && (
            <div className={`text-xs px-1 py-0.5 rounded mt-1 ${holidayDisplay.color} ${densityMode === 'compact' ? 'text-[10px] px-1 py-0.5' : ''}`}>
              {holidayDisplay.emoji} {holiday.name.length > 15 ? `${holiday.name.substring(0, 12)}...` : holiday.name}
            </div>
          )}
        </div>
        {subjectCells}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm h-full flex flex-col">
      {/* 1. KLASSEN-SELECTION sticky */}
      <ClassSelectorBar
        classes={classes || []}
        activeClassId={activeClassId}
        onSelectClass={onSelectClass}
      />

      {/* 2. Scroll-Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto scrollbar-gutter-stable"
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

            // Hex + Alpha → #3b82f620 = ca. 12–15 % Deckkraft (perfekt sichtbar, aber nicht zu stark)
            const tintColor = subjectColor + '22'; // 22 hex = ~13% opacity

            return (
              <div
                key={sub.id}
                className={`p-3 font-bold text-center text-slate-800 dark:text-slate-100 border-b-2 border-l border-slate-200 dark:border-slate-600
                  ${i === 0 ? 'border-l-0' : ''} 
                  ${i === subjects.length - 1 ? 'border-r-2 border-slate-200 dark:border-slate-600' : ''}`}
                style={{
                  width: `${blockWidth}px`,
                  minWidth: `${blockWidth}px`,
                  maxWidth: `${blockWidth}px`,
                  backgroundColor: tintColor,   // ← das ist der neue Teil
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
        <div className="mx-auto" style={{ minWidth: `${totalWidth}px` }}>
          {weeks.map(week => (
            <React.Fragment key={week}>
              {renderWeekRow(week)}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
});

YearlyGrid.displayName = 'YearlyGrid';

export default YearlyGrid;