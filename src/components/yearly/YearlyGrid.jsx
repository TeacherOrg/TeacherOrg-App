import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import YearLessonCell from './YearLessonCell';
import { TableVirtuoso } from 'react-virtuoso';
import { adjustColor } from '@/utils/colorUtils';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ACADEMIC_WEEKS = 52;

const YearlyGrid = React.memo(({ 
  lessons, 
  topics, 
  subjects, 
  academicWeeks, 
  onLessonClick, 
  activeClassId, 
  activeTopicId, 
  currentYear, 
  activeClassName, 
  holidays = [], 
  onShowHover, 
  onHideHover, 
  allYearlyLessons,
  densityMode = 'standard'
}) => {
  const tableRef = useRef(null);
  const hasScrolledToCurrentWeek = useRef(false);
  
  const getCurrentWeek = useCallback(() => {
    const now = new Date();
    const jan4 = new Date(now.getFullYear(), 0, 4);
    const jan4Day = jan4.getDay();
    const daysToMondayOfJan4Week = (jan4Day + 6) % 7;
    const mondayOfWeek1 = new Date(jan4.getFullYear(), jan4.getMonth(), jan4.getDate() - daysToMondayOfJan4Week);
    const diffTime = now.getTime() - mondayOfWeek1.getTime();
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(52, diffWeeks + 1));
  }, []);

  const currentWeek = getCurrentWeek();

  const lessonsByWeek = useMemo(() => {
    const result = lessons.reduce((acc, lesson) => {
      const subjectObj = subjects.find(s => s.id === lesson.subject) || { name: 'Unbekannt', color: '#3b82f6' };
      const key = `${lesson.week_number}-${subjectObj.name}-${Number(lesson.lesson_number)}`;
      acc[key] = { ...lesson, subject: subjectObj.name };
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

  // FIXED: Konsistente Breitenberechnung
  const CELL_WIDTHS = {
    compact: 72,
    standard: 82,
    spacious: 92
  };

  const cellWidth = CELL_WIDTHS[densityMode] || CELL_WIDTHS.standard;
  const weekColumnWidth = 120;
  
  const subjectBlockWidths = useMemo(() => {
    return uniqueSubjects.map(subject => {
      const slots = lessonsPerWeekBySubject[subject] || 4;
      return slots * cellWidth;
    });
  }, [uniqueSubjects, lessonsPerWeekBySubject, cellWidth]);

  const totalWidth = useMemo(() => {
    return weekColumnWidth + subjectBlockWidths.reduce((sum, width) => sum + width, 0);
  }, [weekColumnWidth, subjectBlockWidths]);

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

  useEffect(() => {
    if (tableRef.current && !hasScrolledToCurrentWeek.current && uniqueSubjects.length > 0 && currentYear === new Date().getFullYear()) {
      setTimeout(() => {
        tableRef.current?.scrollToIndex({ index: currentWeek - 1, align: 'center', behavior: 'smooth' });
        hasScrolledToCurrentWeek.current = true;
      }, 500);
    }
  }, [uniqueSubjects.length, currentWeek, currentYear]);

  useEffect(() => {
    hasScrolledToCurrentWeek.current = false;
  }, [activeClassId, densityMode]);

  const handleCellClick = useCallback((lesson, slot) => {
    onLessonClick(lesson, slot);
  }, [onLessonClick]);

  const weeks = useMemo(() => Array.from({ length: academicWeeks }, (_, i) => i + 1), [academicWeeks]);
  
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

  const getHolidayDisplay = useCallback((holiday) => {
    if (!holiday) return { emoji: '', color: '' };
    switch (holiday.type) {
      case 'vacation': 
        if (holiday.name.includes('Sommer')) return { emoji: '☀️', color: 'bg-yellow-800/50 dark:bg-yellow-800/50' };
        if (holiday.name.includes('Herbst')) return { emoji: '🍂', color: 'bg-orange-800/50 dark:bg-orange-800/50' };
        if (holiday.name.includes('Weihnacht')) return { emoji: '🎄', color: 'bg-green-800/50 dark:bg-green-800/50' };
        if (holiday.name.includes('Sport')) return { emoji: '⛷️', color: 'bg-blue-800/50 dark:bg-blue-800/50' };
        if (holiday.name.includes('Frühling')) return { emoji: '🌸', color: 'bg-pink-800/50 dark:bg-pink-800/50' };
        return { emoji: '🏖️', color: 'bg-blue-800/50 dark:bg-blue-800/50' };
      case 'holiday': return { emoji: '🎉', color: 'bg-purple-800/50 dark:bg-purple-800/50' };
      case 'training': return { emoji: '📚', color: 'bg-orange-800/50 dark:bg-orange-800/50' };
      default: return { emoji: '📅', color: 'bg-gray-800/50 dark:bg-gray-800/50' };
    }
  }, []);

  const rowHeight = useMemo(() => {
    return densityMode === 'compact' ? 48 : densityMode === 'spacious' ? 80 : 68;
  }, [densityMode]);

  const densityClass = useMemo(() => `density-${densityMode}`, [densityMode]);

  if (uniqueSubjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-gray-400 dark:border-slate-700">
        Keine Fächer für diese Klasse gefunden. Fügen Sie Fächer in den Einstellungen hinzu.
      </div>
    );
  }

  // FIXED: Render-Funktion für Subject Cells - KORREKTE DOM-STRUKTUR
  const renderSubjectCells = useCallback((week) => {
    const cells = [];
    
    // Week Cell
    const weekDates = getWeekDateRange(week, currentYear);
    const isCurrentWeek = week === currentWeek && currentYear === new Date().getFullYear();
    const holiday = getHolidayForWeek(week);
    const holidayDisplay = getHolidayDisplay(holiday);

    cells.push(
      <td 
        key={`week-${week}`}
        className={`sticky left-0 p-3 text-center font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-r-2 border-b border-gray-400 dark:border-slate-600 z-20 ${isCurrentWeek ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
        style={{ 
          width: `${weekColumnWidth}px`, 
          minWidth: `${weekColumnWidth}px`, 
          maxWidth: `${weekColumnWidth}px`,
          height: `${rowHeight}px`,
          position: 'sticky',
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
      </td>
    );

    // Subject Cells
    uniqueSubjects.forEach((subject, subjectIndex) => {
      const lessonSlotsCount = lessonsPerWeekBySubject[subject] || 4;
      const subjectColor = subjectsByName[subject]?.color || '#3b82f6';
      const blockWidth = subjectBlockWidths[subjectIndex];
      const renderedSlots = new Set();
      const subjectCells = [];

      for (let i = 0; i < lessonSlotsCount; i++) {
        const lessonNumber = i + 1;

        if (renderedSlots.has(lessonNumber)) continue;

        const lessonKey = `${week}-${subject}-${lessonNumber}`;
        const lesson = lessonsByWeek[lessonKey] || null;
        const slot = { week_number: week, subject, lesson_number: lessonNumber, school_year: currentYear };

        // EMPTY CELL
        if (!lesson) {
          subjectCells.push(
            <td
              key={`${subject}-${lessonNumber}`}
              className="p-0.5 border border-gray-200 dark:border-slate-700"
              style={{
                width: `${cellWidth}px`,
                minWidth: `${cellWidth}px`,
                maxWidth: `${cellWidth}px`,
                height: `${rowHeight}px`
              }}
            >
              <YearLessonCell
                lesson={null}
                onClick={() => handleCellClick(null, slot)}
                activeTopicId={activeTopicId}
                defaultColor={subjectColor}
                densityMode={densityMode}
              />
            </td>
          );
          continue;
        }

        // TOPIC BLOCK
        if (lesson.topic_id) {
          const topic = topicsById.get(lesson.topic_id);
          if (topic) {
            let span = 0;
            const topicLessons = [];

            // Count consecutive topic lessons
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

            // Handle double lesson within topic
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

            subjectCells.push(
              <td
                key={`topic-${lesson.id || lessonKey}`}
                colSpan={span}
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
              </td>
            );
            continue;
          }
        }

        // DOUBLE LESSON
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
            subject: subject,
            is_double_lesson: true,
            second_yearly_lesson_id: lesson.second_yearly_lesson_id
          };

          const doubleWidth = span * cellWidth;

          subjectCells.push(
            <td
              key={lessonKey}
              colSpan={span}
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
            </td>
          );
          continue;
        }

        // SINGLE LESSON
        const lessonToPass = { 
          ...lesson, 
          color: subjectColor,
          subject: subject
        };

        subjectCells.push(
          <td
            key={lessonKey}
            className="p-0.5 border border-gray-200 dark:border-slate-700"
            style={{
              width: `${cellWidth}px`,
              minWidth: `${cellWidth}px`,
              maxWidth: `${cellWidth}px`,
              height: `${rowHeight}px`
            }}
          >
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
          </td>
        );
      }

      // Subject Block Container - JETZT DIREKT td mit cells
      cells.push(
        <React.Fragment key={subject}>
          {subjectCells.map(cell => cell)}
        </React.Fragment>
      );
    });

    return cells;
  }, [
    uniqueSubjects, 
    lessonsPerWeekBySubject, 
    subjectsByName, 
    lessonsByWeek, 
    topicsById, 
    subjectBlockWidths, 
    densityMode, 
    rowHeight, 
    activeTopicId, 
    onHideHover, 
    onShowHover, 
    allYearlyLessons, 
    handleCellClick, 
    currentYear, 
    getWeekDateRange, 
    currentWeek, 
    getHolidayForWeek, 
    getHolidayDisplay, 
    weekColumnWidth, 
    cellWidth
  ]);

  const getHeaderRow = useCallback(() => {
    return (
      <tr className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 border-b-2 border-slate-200 dark:border-slate-600">
        {/* Fixed Week Header */}
        <th 
          className="sticky left-0 p-3 font-bold text-slate-800 dark:text-slate-100 border-b-2 border-r-2 border-slate-200 dark:border-slate-600 text-center bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 z-40"
          style={{ 
            width: `${weekColumnWidth}px`, 
            minWidth: `${weekColumnWidth}px`, 
            maxWidth: `${weekColumnWidth}px`,
            position: 'sticky',
            left: 0,
            zIndex: 40
          }}
        >
          Woche
        </th>
        
        {/* Subject Headers - MIT VERTIKALEN TRENNLINIEN */}
        {uniqueSubjects.map((subject, index) => {
          const lessonSlots = lessonsPerWeekBySubject[subject] || 4;
          const blockWidth = subjectBlockWidths[index];
          const subjectColor = subjectsByName[subject]?.color || '#3b82f6';
          
          return (
            <th 
              key={subject}
              className="p-3 font-bold border-b-2 border-l border-slate-200 dark:border-slate-600 text-center text-slate-800 dark:text-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 sticky top-0 z-10 relative"
              colSpan={lessonSlots}
              style={{
                width: `${blockWidth}px`,
                minWidth: `${blockWidth}px`,
                maxWidth: `${blockWidth}px`,
                position: 'sticky',
                top: 0,
                zIndex: 10,
                borderLeftColor: index === 0 ? 'transparent' : 'var(--border-color)',
                backgroundColor: `color-mix(in srgb, ${subjectColor} 5%, transparent)`
              }}
            >
              <div className="flex items-center justify-center">
                <span className="truncate">{subject}</span>
              </div>
            </th>
          );
        })}
      </tr>
    );
  }, [uniqueSubjects, lessonsPerWeekBySubject, subjectBlockWidths, weekColumnWidth, subjectsByName]);

  const getClassHeader = useCallback(() => {
    return (
      <tr className="sticky top-0 z-20 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-b-2 border-slate-200 dark:border-slate-600">
        <th 
          className="sticky left-0 p-3 font-bold text-slate-800 dark:text-slate-100 border-b-2 border-r-2 border-slate-200 dark:border-slate-600 text-center bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 z-50"
          style={{ 
            width: `${weekColumnWidth}px`, 
            minWidth: `${weekColumnWidth}px`, 
            maxWidth: `${weekColumnWidth}px`,
            position: 'sticky',
            left: 0,
            zIndex: 50
          }}
        >
          Klasse
        </th>
        <th 
          className="p-3 font-bold border-b-2 border-slate-200 dark:border-slate-600 text-center text-slate-800 dark:text-slate-100 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 sticky top-0 z-20"
          colSpan={uniqueSubjects.reduce((sum, subject) => sum + (lessonsPerWeekBySubject[subject] || 4), 0)}
          style={{ position: 'sticky', top: 0, zIndex: 20 }}
        >
          <div className="flex items-center justify-center">
            {activeClassName || 'Klasse auswählen'}
          </div>
        </th>
      </tr>
    );
  }, [activeClassName, uniqueSubjects, lessonsPerWeekBySubject, weekColumnWidth]);

  const itemContent = useCallback((index, week) => {
    const isCurrentWeek = week === currentWeek && currentYear === new Date().getFullYear();
    
    return (
      <tr 
        className={`yearly-table-row border-b border-slate-100 dark:border-slate-700 ${isCurrentWeek ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
        style={{ height: `${rowHeight}px` }}
      >
        {renderSubjectCells(week)}
      </tr>
    );
  }, [renderSubjectCells, currentWeek, currentYear, rowHeight]);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm h-full overflow-hidden ${densityClass}`}>
      {/* Subject Navigation Controls - MIT SMOOTHER SCROLLING */}
      {uniqueSubjects.length > 1 && (
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const scrollAmount = Math.max(subjectBlockWidths[0] || 300, 300);
                tableRef.current?.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
              }}
              disabled={!tableRef.current || tableRef.current.scrollLeft <= 0}
              className="transition-all duration-200 hover:scale-105"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {uniqueSubjects.length} Fächer
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const scrollAmount = Math.max(subjectBlockWidths[0] || 300, 300);
                tableRef.current?.scrollBy({ left: scrollAmount, behavior: 'smooth' });
              }}
              className="transition-all duration-200 hover:scale-105"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              tableRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
            }}
            className="h-8 px-3 transition-all duration-200 hover:scale-105"
          >
            Alle
          </Button>
        </div>
      )}

      <div className="h-full overflow-auto">
        <TableVirtuoso
          ref={tableRef}
          data={weeks}
          style={{ height: uniqueSubjects.length > 1 ? 'calc(100% - 64px)' : '100%' }}
          defaultItemHeight={rowHeight}
          overscan={200}
          components={{
            Table: React.forwardRef((props, ref) => (
              <table 
                {...props} 
                className="w-full border-collapse" 
                style={{ 
                  width: `${totalWidth}px`,
                  tableLayout: 'fixed'
                }}
                ref={ref} 
              />
            )),
            TableHead: React.forwardRef((props, ref) => (
              <thead {...props} className="sticky top-0 z-20" ref={ref} />
            )),
            TableBody: React.forwardRef((props, ref) => (
              <tbody {...props} className="bg-white dark:bg-slate-800" ref={ref} />
            )),
          }}
          fixedHeaderContent={() => (
            <>
              {getClassHeader()}
              {getHeaderRow()}
            </>
          )}
          itemContent={itemContent}
        />
      </div>
    </div>
  );
});

YearlyGrid.displayName = 'YearlyGrid';

export default YearlyGrid;