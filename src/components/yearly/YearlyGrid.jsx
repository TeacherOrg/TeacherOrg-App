import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import YearLessonCell from './YearLessonCell';
import { TableVirtuoso } from 'react-virtuoso';
import { adjustColor } from '@/utils/colorUtils';

const ACADEMIC_WEEKS = 52;

const YearlyGrid = React.memo(({ lessons, topics, subjects, academicWeeks, onLessonClick, activeClassId, activeTopicId, currentYear, activeClassName, holidays = [], onShowHover, onHideHover }) => {
  const tableRef = useRef(null);
  const virtuosoRef = useRef(null);
  const hasScrolledToCurrentWeek = useRef(false);
  
  // Add current week calculation
  const getCurrentWeek = useCallback(() => {
    const now = new Date();
    // ISO week definition: week 1 is the first week with at least 4 days in January
    // This is equivalent to the week containing Jan 4th.
    const jan4 = new Date(now.getFullYear(), 0, 4);
    const jan4Day = jan4.getDay(); // 0 (Sunday) to 6 (Saturday)

    // Calculate the Monday of the week containing Jan 4th.
    // (jan4Day + 6) % 7 calculates days to subtract to get to the previous Monday.
    const daysToMondayOfJan4Week = (jan4Day + 6) % 7; 
    const mondayOfWeek1 = new Date(jan4.getFullYear(), 0, jan4.getDate() - daysToMondayOfJan4Week);
    
    // Calculate the difference in milliseconds between now and the Monday of week 1
    const diffTime = now.getTime() - mondayOfWeek1.getTime();
    // Convert milliseconds to weeks (7 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    
    // ISO week numbers are 1-52 or 1-53. Ensure it's at least 1. Max 52 is a safe assumption for display.
    return Math.max(1, Math.min(52, diffWeeks + 1));
  }, []);

  const currentWeek = getCurrentWeek();

  const lessonsByWeek = useMemo(() => {
    return lessons.reduce((acc, lesson) => {
      const key = `${lesson.week_number}-${lesson.subject}-${Number(lesson.lesson_number)}`;
      acc[key] = lesson;
      return acc;
    }, {});
  }, [lessons]);

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

  // New: Map lessons by their unique ID for quick lookup of second part of double lessons
  const yearlyLessonsById = useMemo(() => {
    const map = new Map();
    lessons.forEach(lesson => {
      map.set(lesson.id, lesson);
    });
    return map;
  }, [lessons]);

  // Helper function to get week date range (Monday to Friday)
  const getWeekDateRange = useCallback((weekNumber, year) => {
    // This function calculates the dates for a given ISO week number and year.
    // It finds the first day of the year, then adjusts to the first Thursday of the year
    // to determine the ISO week 1. Then it calculates the Monday of the requested week.
    
    // Create a date object for January 1st of the given year
    const jan1 = new Date(year, 0, 1);
    // Get the day of the week for Jan 1st (0 for Sunday, 1 for Monday, ..., 6 for Saturday)
    const dayOfWeekJan1 = jan1.getDay();
    // Calculate the number of days to add to Jan 1st to get to the first Thursday of the year.
    // ISO week 1 is the first week with at least 4 days in the new year.
    // This means it's the week containing the first Thursday of the year.
    // If Jan 1st is a Monday (1), Tuesday (2), Wednesday (3), or Thursday (4), then the first Thursday
    // is in the same week or a few days later.
    // If Jan 1st is Friday (5), Saturday (6), or Sunday (0), then the first Thursday
    // is in the previous year's last week, and ISO week 1 starts the following Monday.
    const daysToFirstThursday = (4 - dayOfWeekJan1 + 7) % 7;
    const firstThursday = new Date(jan1.getFullYear(), jan1.getMonth(), jan1.getDate() + daysToFirstThursday);

    // Get the day of the week for the first Thursday (this should always be 4, a Thursday)
    const dayOfWeekFirstThursday = firstThursday.getDay();
    // Calculate the date of the Monday of the week containing the first Thursday.
    // If dayOfWeekFirstThursday is 0 (Sunday), diff is 6. If 1 (Monday), diff is 0. If 4 (Thursday), diff is 3.
    const diffToMondayOfFirstWeek = (dayOfWeekFirstThursday + 6) % 7; // This gives 0 for Monday, 1 for Tuesday etc.
    const mondayOfFirstWeek = new Date(firstThursday.getFullYear(), firstThursday.getMonth(), firstThursday.getDate() - diffToMondayOfFirstWeek);

    // Calculate the Monday of the requested week number
    const mondayOfWeek = new Date(mondayOfFirstWeek.getFullYear(), mondayOfFirstWeek.getMonth(), mondayOfFirstWeek.getDate() + (weekNumber - 1) * 7);
    
    // Calculate the Friday of the requested week number
    const fridayOfWeek = new Date(mondayOfWeek.getFullYear(), mondayOfWeek.getMonth(), mondayOfWeek.getDate() + 4);
    
    const mondayStr = mondayOfWeek.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const fridayStr = fridayOfWeek.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    
    return { mondayStr, fridayStr };
  }, []);

  // Only auto-scroll once when component mounts or when subjects change
  useEffect(() => {
    if (virtuosoRef.current && !hasScrolledToCurrentWeek.current && uniqueSubjects.length > 0 && currentYear === new Date().getFullYear()) {
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({ index: currentWeek - 1, align: 'center', behavior: 'smooth' });
        hasScrolledToCurrentWeek.current = true;
      }, 300);
    }
  }, [uniqueSubjects.length, currentWeek, currentYear]);

  // Reset scroll flag when switching classes
  useEffect(() => {
    hasScrolledToCurrentWeek.current = false;
  }, [activeClassId]);

  const handleCellClick = useCallback((lesson, slot) => {
    onLessonClick(lesson, slot);
  }, [onLessonClick]);

  const weeks = useMemo(() => Array.from({ length: academicWeeks }, (_, i) => i + 1), [academicWeeks]);
  
  const getHolidayForWeek = useCallback((weekNumber) => {
    if (!holidays || holidays.length === 0) return null;
    
    // A more robust date calculation would be needed for multi-year views,
    // but for a single year this is sufficient.
    const janFirst = new Date(currentYear, 0, 1);
    const firstDayOfYear = janFirst.getDay(); // 0 for Sunday, 1 for Monday, etc.

    // Calculate the date of the first Monday of the year (or Jan 1st if it's a Monday)
    const firstMonday = new Date(janFirst);
    if (firstDayOfYear !== 1) { // If Jan 1st is not a Monday
        const daysUntilNextMonday = (8 - firstDayOfYear) % 7; // Number of days to add to get to the next Monday
        firstMonday.setDate(janFirst.getDate() + daysUntilNextMonday);
    }
    
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
    weekStart.setHours(0, 0, 0, 0); // Normalize to start of day

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999); // Normalize to end of day

    for (const holiday of holidays) {
        const holidayStart = new Date(holiday.start_date);
        holidayStart.setHours(0, 0, 0, 0);
        const holidayEnd = new Date(holiday.end_date);
        holidayEnd.setHours(23, 59, 59, 999);
        
        // Check for overlap between the week and the holiday period
        // (weekStart <= holidayEnd) && (weekEnd >= holidayStart)
        if (weekStart <= holidayEnd && weekEnd >= holidayStart) {
            return holiday;
        }
    }
    return null;
  }, [holidays, currentYear]);

  const getHolidayDisplay = (holiday) => {
    if (!holiday) return { emoji: '', color: '' };
    switch (holiday.type) {
        case 'vacation': 
            if (holiday.name.includes('Sommer')) return { emoji: '☀️', color: 'bg-yellow-800/50 dark:bg-yellow-800/50' };  // Adjust for visibility
            if (holiday.name.includes('Herbst')) return { emoji: '🍂', color: 'bg-orange-800/50 dark:bg-orange-800/50' };
            if (holiday.name.includes('Weihnacht')) return { emoji: '🎄', color: 'bg-green-800/50 dark:bg-green-800/50' };
            if (holiday.name.includes('Sport')) return { emoji: '⛷️', color: 'bg-blue-800/50 dark:bg-blue-800/50' };
            if (holiday.name.includes('Frühling')) return { emoji: '🌸', color: 'bg-pink-800/50 dark:bg-pink-800/50' };
            return { emoji: '🏖️', color: 'bg-blue-800/50 dark:bg-blue-800/50' };
        case 'holiday': return { emoji: '🎉', color: 'bg-purple-800/50 dark:bg-purple-800/50' };
        case 'training': return { emoji: '📚', color: 'bg-orange-800/50 dark:bg-orange-800/50' };
        default: return { emoji: '📅', color: 'bg-gray-800/50 dark:bg-gray-800/50' };
    }
  };

  if (uniqueSubjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-gray-400 dark:border-slate-700">
        Keine Fächer für diese Klasse gefunden. Fügen Sie Fächer in den Einstellungen hinzu.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm h-full overflow-hidden">
      <TableVirtuoso
        ref={virtuosoRef}
        data={weeks}
        style={{ height: '100%' }}
        defaultItemHeight={68} // Adjusted for p-1 padding (64 + 4)
        overscan={200} // Added to buffer more rows and reduce flickering
        components={{
          Table: React.forwardRef((props, ref) => <table {...props} className="border-collapse table-fixed w-full" ref={ref} />),
          TableHead: React.forwardRef((props, ref) => <thead {...props} className="sticky top-0 bg-white dark:bg-slate-800 z-20" ref={ref} />),
          TableBody: React.forwardRef((props, ref) => <tbody {...props} className="bg-white dark:bg-slate-800" ref={ref} />),
          TableRow: ({ item: week, ...props }) => {
            const isCurrentWeek = week === currentWeek && currentYear === new Date().getFullYear();
            return (
              <tr 
                {...props} 
                className={`${isCurrentWeek ? 'bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500' : ''}`} // Removed opacity for solid bg
                style={{ willChange: 'transform' }} // Added for smoother rendering
              />
            );
          },
        }}
        fixedHeaderContent={() => (
          <>
            {/* Class Header Row */}
            <tr>
              <th className="sticky left-0 p-3 font-bold text-gray-800 dark:text-white border-b border-r-2 border-gray-400 dark:border-slate-600 text-center bg-white dark:bg-slate-800 z-30 w-[120px]">
                Klasse
              </th>
              <th 
                className="p-3 font-bold border-b border-gray-400 dark:border-slate-600 text-center text-gray-800 dark:text-white bg-white dark:bg-slate-800"
                colSpan={uniqueSubjects.reduce((sum, subject) => sum + (lessonsPerWeekBySubject[subject] || 4), 0)}
              >
                {activeClassName || 'Klasse auswählen'}
              </th>
            </tr>
            {/* Subject Header Row */}
            <tr>
              <th className="sticky left-0 p-3 font-bold text-gray-800 dark:text-white border-b-2 border-r-2 border-gray-400 dark:border-slate-600 text-center bg-white dark:bg-slate-800 z-30 w-[120px]">
                Woche
              </th>
              {uniqueSubjects.map((subject, index) => {
                const isLastSubject = index === uniqueSubjects.length - 1;
                return (
                  <th 
                    key={subject} 
                    className={`p-3 font-bold border-b-2 border-gray-400 dark:border-slate-600 text-center text-gray-800 dark:text-white bg-white dark:bg-slate-800 ${!isLastSubject ? 'border-r border-gray-400 dark:border-slate-600' : ''}`} 
                    colSpan={lessonsPerWeekBySubject[subject]}
                  >
                    {subject}
                  </th>
                );
              })}
            </tr>
          </>
        )}
        itemContent={(index, week) => {
          const weekDates = getWeekDateRange(week, currentYear);
          const isCurrentWeek = week === currentWeek && currentYear === new Date().getFullYear();
          const holiday = getHolidayForWeek(week);
          const holidayDisplay = getHolidayDisplay(holiday);

          console.log('Rendering week:', week, 'subjects:', uniqueSubjects.length, 'lessons:', lessons.length);  // Debug-Log hinzufügen

          return (
            <>
              <td 
                className={`sticky left-0 p-3 text-center font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-r-2 border-b border-gray-400 dark:border-slate-600 z-20 w-[120px] ${isCurrentWeek ? 'bg-blue-100 dark:bg-blue-900' : ''}`} // Removed opacity for solid bg
              >
                <div className="text-sm">KW {week}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">{weekDates.mondayStr} - {weekDates.fridayStr}</div>
                {holiday && (
                  <div className={`text-xs px-2 py-1 rounded mt-1 ${holidayDisplay.color}`}>
                    {holidayDisplay.emoji} {holiday.name}
                  </div>
                )}
              </td>
              {uniqueSubjects.map(subject => {
                const lessonSlotsCount = lessonsPerWeekBySubject[subject] || 4;
                const subjectColor = subjectsByName[subject]?.color || '#3b82f6';
                
                const renderedSlots = new Set(); 
                
                const cells = [];
                for (let i = 0; i < lessonSlotsCount; i++) {
                  const lessonNumber = i + 1;

                  if (renderedSlots.has(lessonNumber)) {
                    continue;
                  }

                  const lessonKey = `${week}-${subject}-${lessonNumber}`;
                  const lesson = lessonsByWeek[lessonKey];
                  const slot = { week_number: week, subject, lesson_number: lessonNumber, school_year: currentYear };
                  
                  if (!lesson) {
                    cells.push(
                      <div key={lessonKey} className="h-16 p-0.5"> 
                        <YearLessonCell
                          lesson={null}
                          onClick={() => handleCellClick(null, slot)}
                          activeTopicId={activeTopicId}
                          defaultColor={subjectColor}
                          onMouseEnter={(e) => onShowHover(null, e)}
                          onMouseLeave={onHideHover}
                        />
                      </div>
                    );
                    continue;
                  }

                  // PRIORITY 1: Handle TOPIC BLOCKS
                  if (lesson.topic_id) {
                    const topic = topicsById.get(lesson.topic_id);
                    if (topic) {
                      let span = 0;
                      const topicLessons = [];
                      
                      let j = lessonNumber;
                      while (j <= lessonSlotsCount) {
                        const checkKey = `${week}-${subject}-${j}`;
                        const checkLesson = lessonsByWeek[checkKey];
                        
                        if (checkLesson && checkLesson.topic_id === lesson.topic_id) {
                          topicLessons.push(checkLesson);
                          span += 1;
                          renderedSlots.add(j);
                          j++;
                        } else {
                          break;
                        }
                      }
                      
                      let isDoubleInTopic = false;
                      if (lesson.is_double_lesson && lesson.second_yearly_lesson_id) {
                        const nextNumber = lessonNumber + 1;
                        const nextKey = `${week}-${subject}-${nextNumber}`;
                        const nextLesson = lessonsByWeek[nextKey];
                        
                        if (nextLesson && nextLesson.topic_id === lesson.topic_id) {
                          isDoubleInTopic = true;
                          span += 1; // Erhöhe span für double in topic
                          i += 1; // Skip next
                          renderedSlots.add(nextNumber);
                          topicLessons.push(nextLesson);
                        } else {
                          console.warn(`Double lesson ${lesson.id} in topic block without matching second topic_id`);
                        }
                      } else {
                        i += span - 1;
                      }

                      cells.push(
                        <div
                          key={`topic-block-${lessonNumber}`}
                          className="h-16"
                          style={{ gridColumn: `span ${span}` }}
                          onMouseEnter={(e) => onShowHover({
                            ...lesson,
                            topic_id: topic.id,
                            color: topic.color || subjectColor || '#3b82f6',  // Neu: Setze root-color aus topic oder subject
                            mergedLessons: topicLessons.map(l => ({
                              ...l,
                              topic: topicsById.get(l.topic_id),
                              color: topicsById.get(l.topic_id)?.color || subjectColor || '#3b82f6',
                              subject: subject
                            }))
                          }, e)}
                          onMouseLeave={onHideHover}
                        >
                          <div
                            onClick={() => handleCellClick({
                              ...lesson,
                              topic_id: topic.id,
                              mergedLessons: topicLessons.map(l => ({
                                ...l,
                                topic: topicsById.get(l.topic_id),
                                color: topicsById.get(l.topic_id)?.color,
                                subject: subject,
                                notes: l.notes
                              }))
                            }, null)}
                            className="h-full w-full border rounded-md cursor-pointer transition-all duration-200 flex items-center justify-center text-center p-2"
                            style={{
                              background: `linear-gradient(135deg, ${topic.color} 0%, ${adjustColor(topic.color, -20)} 100%)`,
                              borderColor: topic.color,
                              color: 'white'
                            }}
                          >
                            <div className="text-xs font-bold leading-tight">
                              <div>{topic.title}</div>
                            </div>
                          </div>
                        </div>
                      );
                      continue;
                    }
                  }

                  // PRIORITY 2: Handle DOUBLE LESSONS (without topics)
                  if (lesson.is_double_lesson && lesson.second_yearly_lesson_id) {
                    const nextNumber = lessonNumber + 1;
                    const nextKey = `${week}-${subject}-${nextNumber}`;
                    const nextLesson = lessonsByWeek[nextKey];
                    
                    let span = 1;
                    if (nextLesson) {
                      span = 2;
                      i += 1; // Skip next slot
                      renderedSlots.add(nextNumber);
                    }

                    const mergedLesson = { ...lesson };
                    if (nextLesson) {
                      mergedLesson.steps = [...(lesson.steps || []), ...(nextLesson.steps || [])];
                      if (nextLesson.notes && lesson.notes !== nextLesson.notes) {
                        mergedLesson.notes = `${lesson.notes || `Lektion ${lesson.lesson_number}`}${lesson.notes && nextLesson.notes ? ' + ' : ''}${nextLesson.notes || `Lektion ${nextLesson.lesson_number}`}`;
                      }
                    }

                    const lessonToPass = { ...mergedLesson, topic: null, color: subjectColor, subject: subject };

                    cells.push(
                      <div
                        key={lessonKey}
                        className="h-16"
                        style={{ gridColumn: `span ${span}` }}
                        onMouseEnter={(e) => onShowHover(lessonToPass, e)}
                        onMouseLeave={onHideHover}
                      >
                        <YearLessonCell
                          lesson={lessonToPass}
                          onClick={() => handleCellClick(lessonToPass, slot)}
                          activeTopicId={activeTopicId}
                          defaultColor={subjectColor}
                          isDoubleLesson={true}
                        />
                      </div>
                    );
                    continue;
                  }
                
                  // PRIORITY 3: Handle SINGLE LESSONS (without topics or doubles)
                  const lessonToPass = { 
                    ...lesson, 
                    topic: null,
                    color: subjectsByName[subject]?.color || '#3b82f6',
                    subject: subject,
                  };

                  cells.push(
                    <div key={lessonKey} className="h-16">
                      <YearLessonCell
                        lesson={lessonToPass}
                        onClick={() => handleCellClick(lessonToPass, slot)}
                        activeTopicId={activeTopicId}
                        defaultColor={subjectColor}
                        onMouseEnter={(e) => onShowHover(lessonToPass, e)}
                        onMouseLeave={onHideHover}
                      />
                    </div>
                  );
                }

                return (
                  <td key={subject} className="p-0 border-r border-b border-gray-400 dark:border-slate-600" colSpan={lessonSlotsCount}>
                    <div className="grid h-16 bg-white dark:bg-slate-800" style={{gridTemplateColumns: `repeat(${lessonSlotsCount}, minmax(0, 1fr))`}}>
                      {cells}
                    </div>
                  </td>
                );
              })}
            </>
          );
        }}
      />
    </div>
  );
});

YearlyGrid.displayName = 'YearlyGrid';

export default YearlyGrid;