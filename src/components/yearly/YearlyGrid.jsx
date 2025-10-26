import React, { useState, useEffect, useRef, useMemo, forwardRef } from 'react';
import YearLessonCell from './YearLessonCell';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adjustColor } from '@/utils/colorUtils';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Checkbox } from '@/components/ui/checkbox';
import { useCallback } from 'react';

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
  onSelectLesson
}) => {
  const tableRef = useRef(null);
  const hasScrolledToCurrentWeek = useRef(false);
  const listRef = useRef(null);
  const classHeaderRef = useRef(null);

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

  const yearlyLessonsById = useMemo(() => {
    const map = new Map();
    lessons.forEach(lesson => {
      map.set(lesson.id, lesson);
    });
    return map;
  }, [lessons]);

  const CELL_WIDTHS = {
    compact: 72,
    standard: 82,
    spacious: 92
  };

  const cellWidth = CELL_WIDTHS[densityMode] || CELL_WIDTHS.standard;
  const weekColumnWidth = 120;
  
  const subjectBlockWidths = useMemo(() => {
    return uniqueSubjects.map((subject) => {
      const slots = lessonsPerWeekBySubject[subject] || 4;
      return slots * cellWidth;
    });
  }, [uniqueSubjects, lessonsPerWeekBySubject, cellWidth]);

  const totalWidth = useMemo(() => {
    return weekColumnWidth + subjectBlockWidths.reduce((sum, width) => sum + width, 0);
  }, [weekColumnWidth, subjectBlockWidths]);

  const scrolledWidth = useMemo(() => totalWidth - weekColumnWidth, [totalWidth, weekColumnWidth]);

  const weeks = useMemo(() => Array.from({ length: academicWeeks }, (_, i) => i + 1), [academicWeeks]);

  const rowHeight = useMemo(() => {
    return densityMode === 'compact' ? 48 : densityMode === 'spacious' ? 80 : 68;
  }, [densityMode]);

  const densityClass = useMemo(() => `density-${densityMode}`, [densityMode]);

  const processedLessons = useMemo(() => {
    const lessonMap = new Map();
    lessons.forEach(lesson => {
      const key = `${lesson.week_number}-${lesson.subject}`;
      if (!lessonMap.has(key)) lessonMap.set(key, []);
      lessonMap.get(key).push(lesson);
    });
    return lessonMap;
  }, [lessons]);

  const getCurrentWeek = useCallback(() => {
    const now = new Date();
    const jan4 = new Date(now.getFullYear(), 0, 4);
    const jan4Day = jan4.getDay();
    const daysToMondayOfJan4Week = (jan4Day + 6) % 7;
    const mondayOfWeek1 = new Date();
    mondayOfWeek1.setTime(jan4.getTime() - daysToMondayOfJan4Week * 86400000);
    const diffTime = now.getTime() - mondayOfWeek1.getTime();
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(52, diffWeeks + 1));
  }, []);

  const currentWeek = getCurrentWeek();

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
      if (classHeaderRef.current) {
        setClassHeaderHeight(classHeaderRef.current.getBoundingClientRect().height);
      }
    };

    const observer = new ResizeObserver(updateDimensions);
    if (tableRef.current) observer.observe(tableRef.current);

    updateDimensions(); // Initial call

    return () => observer.disconnect();
  }, [densityMode, uniqueSubjects.length]);

  useEffect(() => {
    if (listRef.current && !hasScrolledToCurrentWeek.current && uniqueSubjects.length > 0 && currentYear === new Date().getFullYear()) {
      setTimeout(() => {
        listRef.current?.scrollToItem(currentWeek, 'center');
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

  const Inner = forwardRef(({ children, style, ...rest }, ref) => {
    const effectiveWidth = Math.min(style.width || totalWidth, totalWidth); // Verwende die kleinere Breite
    return (
      <div
        ref={ref}
        style={{
          ...style,
          width: `${effectiveWidth}px`,
          minWidth: '100%',
          maxWidth: '100%',
          margin: '0 auto' // Zentriert die Tabelle
        }}
        {...rest}
      >
        {children}
      </div>
    );
  });

  const selectedSet = useMemo(() => new Set(selectedLessons.filter(l => typeof l === 'string')), [selectedLessons]);

  const renderRow = ({ index, style }) => {
    if (index === 0) {
      return (
        <div style={{ ...style, top: 0 }} className="flex flex-nowrap sticky z-40">
          <div 
            className="sticky left-0 p-3 font-bold text-slate-800 dark:text-slate-100 text-center bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 z-40 border-b-2 border-r-2 border-slate-200 dark:border-slate-600"
            style={{ 
              width: `${weekColumnWidth}px`, 
              minWidth: `${weekColumnWidth}px`, 
              maxWidth: `${weekColumnWidth}px`,
              height: `${rowHeight}px`,
              left: 0,
              zIndex: 40
            }}
          >
            Woche
          </div>
          <div style={{ display: 'flex', width: `${scrolledWidth}px` }}>
            {uniqueSubjects.map((subject, index) => {
              const blockWidth = subjectBlockWidths[index] || 100;
              const subjectColor = subjectsByName[subject]?.color || '#3b82f6';
              return (
                <div 
                  key={subject}
                  className="p-3 font-bold border-b-2 border-l border-slate-200 dark:border-slate-600 text-center text-slate-800 dark:text-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 z-10"
                  style={{
                    width: `${blockWidth}px`,
                    minWidth: `${blockWidth}px`, 
                    maxWidth: `${blockWidth}px`,
                    borderLeftColor: index === 0 ? 'transparent' : '#e5e7eb',
                    backgroundColor: `color-mix(in srgb, ${subjectColor} 5%, transparent)`,
                    height: `${rowHeight}px`
                  }}
                >
                  <div className="flex items-center justify-center">
                    <span className="truncate">{subject || 'Fallback'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const week = weeks[index - 1];
    const isCurrentWeek = week === currentWeek && currentYear === new Date().getFullYear();
    const weekDates = getWeekDateRange(week, currentYear);
    const holiday = getHolidayForWeek(week);
    const holidayDisplay = getHolidayDisplay(holiday);

    const subjectCells = uniqueSubjects.map((subject, subjectIndex) => {
      const lessonSlotsCount = lessonsPerWeekBySubject[subject] || 4;
      const subjectColor = subjectsByName[subject]?.color || '#3b82f6';
      const renderedSlots = new Set();
      const cells = [];

      for (let i = 0; i < lessonSlotsCount; i++) {
        const lessonNumber = i + 1;

        if (renderedSlots.has(lessonNumber)) continue;

        const lessonKey = `${week}-${subject}-${lessonNumber}`;
        const lesson = lessonsByWeek[lessonKey] || null;
        const slot = { week_number: week, subjectName: subject, subject: subjectsByName[subject].id, lesson_number: lessonNumber, school_year: currentYear };

        if (!lesson) {
          const safeSelected = selectedLessons.filter(l => typeof l === 'string');
          const isSelected = safeSelected.some(l => {
            const [w, sub, num] = l.split('-');
            return Number(w) === week && sub === subject && Number(num) === lessonNumber;
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
              onClick={isAssignMode ? () => onSelectLesson({ week_number: week, subject, lesson_number: lessonNumber }) : undefined}
            >
              <div className="h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900/50">
                {isAssignMode && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelectLesson({ week_number: week, subject, lesson_number: lessonNumber })}
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
        <div key={subjectIndex} className="flex">
          {cells}
        </div>
      );
    });

    return (
      <div style={style} className={`flex flex-nowrap relative ${isCurrentWeek ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
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
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm h-full overflow-hidden ${densityClass}`}>
      <div className="h-full" ref={tableRef} style={{ overflowX: 'hidden', overflowY: 'auto' }}>
        <AutoSizer>
          {({ height, width }) => (
            <>
              <div ref={classHeaderRef} className="class-header" style={{ position: 'sticky', top: 0, zIndex: 50, width: '100%', maxWidth: `${totalWidth}px`, margin: '0 auto', textAlign: 'center' }}>
                <div 
                  className="p-3 font-bold border-b-2 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 z-40"
                  style={{ width: '100%' }}
                >
                  {activeClassName || 'Klasse auswählen'}
                </div>
              </div>
              
              <List
                ref={listRef}
                height={height - classHeaderHeight}
                itemCount={weeks.length + 1}
                itemSize={rowHeight}
                width={width}
                overscanCount={30}
                innerElementType={Inner}
              >
                {renderRow}
              </List>
            </>
          )}
        </AutoSizer>
      </div>
    </div>
  );
});

YearlyGrid.displayName = 'YearlyGrid';

export default YearlyGrid;