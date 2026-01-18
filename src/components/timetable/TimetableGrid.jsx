import React from "react";
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import TimeSlot from "./TimeSlot";
import DayHeader, { DAYS } from "./DayHeader";
import LessonCard from "./LessonCard";
import { motion } from "framer-motion";
import { createMixedSubjectGradient } from '@/utils/colorUtils';
import HolidayDecorations from './HolidayDecorations';

const getHolidayDisplay = (holiday) => {
  if (!holiday) return { emoji: '', gradient: '', pattern: '' };
  switch (holiday.type) {
      case 'vacation': 
          if (holiday.name.includes('Sommer')) return {
            emoji: '☀️',
            gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fb923c 100%)',
            pattern: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 20%), repeating-conic-gradient(from 0deg at 50% 50%, rgba(255, 255, 255, 0.15) 0deg 15deg, transparent 15deg 30deg)'
          };
          if (holiday.name.includes('Herbst')) return {
            emoji: '🍂',
            gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
            pattern: 'radial-gradient(ellipse 8px 12px at 15% 20%, rgba(139, 69, 19, 0.25) 0%, transparent 100%), radial-gradient(ellipse 10px 14px at 45% 35%, rgba(139, 69, 19, 0.2) 0%, transparent 100%), radial-gradient(ellipse 7px 11px at 75% 15%, rgba(139, 69, 19, 0.22) 0%, transparent 100%), radial-gradient(ellipse 9px 13px at 25% 65%, rgba(139, 69, 19, 0.18) 0%, transparent 100%), radial-gradient(ellipse 8px 12px at 60% 75%, rgba(139, 69, 19, 0.23) 0%, transparent 100%), radial-gradient(ellipse 6px 10px at 85% 55%, rgba(139, 69, 19, 0.2) 0%, transparent 100%), radial-gradient(ellipse 11px 15px at 35% 85%, rgba(139, 69, 19, 0.15) 0%, transparent 100%), radial-gradient(ellipse 7px 11px at 90% 90%, rgba(139, 69, 19, 0.25) 0%, transparent 100%)'
          };
          if (holiday.name.includes('Weihnacht')) return { 
            emoji: '🎄', 
            gradient: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)',
            pattern: 'radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.12) 2px, transparent 2px), radial-gradient(circle at 60% 70%, rgba(255, 255, 255, 0.08) 3px, transparent 3px), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 2px, transparent 2px), radial-gradient(circle at 35% 80%, rgba(255, 255, 255, 0.1) 2px, transparent 2px), radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.1) 2.5px, transparent 2.5px), radial-gradient(circle at 15% 60%, rgba(255, 255, 255, 0.09) 2px, transparent 2px), radial-gradient(circle at 70% 50%, rgba(255, 255, 255, 0.11) 2px, transparent 2px), radial-gradient(circle at 40% 15%, rgba(255, 255, 255, 0.13) 2.5px, transparent 2.5px), radial-gradient(circle at 85% 65%, rgba(255, 255, 255, 0.1) 2px, transparent 2px), radial-gradient(circle at 25% 90%, rgba(255, 255, 255, 0.08) 3px, transparent 3px), radial-gradient(circle at 90% 85%, rgba(255, 255, 255, 0.12) 2px, transparent 2px), radial-gradient(circle at 45% 55%, rgba(255, 255, 255, 0.09) 2.5px, transparent 2.5px)'
          };
          if (holiday.name.includes('Sport')) return {
            emoji: '⛷️',
            gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)',
            pattern: 'radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.12) 2px, transparent 2px), radial-gradient(circle at 60% 70%, rgba(255, 255, 255, 0.08) 3px, transparent 3px), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 2px, transparent 2px), radial-gradient(circle at 35% 80%, rgba(255, 255, 255, 0.1) 2px, transparent 2px), radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.1) 2.5px, transparent 2.5px), radial-gradient(circle at 15% 60%, rgba(255, 255, 255, 0.09) 2px, transparent 2px), radial-gradient(circle at 70% 50%, rgba(255, 255, 255, 0.11) 2px, transparent 2px), linear-gradient(150deg, transparent 65%, rgba(255, 255, 255, 0.08) 65%, rgba(255, 255, 255, 0.08) 75%, transparent 75%), linear-gradient(30deg, transparent 70%, rgba(255, 255, 255, 0.06) 70%, rgba(255, 255, 255, 0.06) 85%, transparent 85%)'
          };
          if (holiday.name.includes('Frühling')) return {
            emoji: '🌸',
            gradient: 'linear-gradient(135deg, #f9a8d4 0%, #f472b6 50%, #ec4899 100%)',
            pattern: 'radial-gradient(circle at 10% 15%, rgba(255, 255, 255, 0.2) 3px, transparent 3px), radial-gradient(circle at 25% 35%, rgba(255, 255, 255, 0.15) 4px, transparent 4px), radial-gradient(circle at 45% 10%, rgba(255, 255, 255, 0.18) 3px, transparent 3px), radial-gradient(circle at 65% 45%, rgba(255, 255, 255, 0.2) 5px, transparent 5px), radial-gradient(circle at 85% 25%, rgba(255, 255, 255, 0.12) 3px, transparent 3px), radial-gradient(circle at 15% 70%, rgba(255, 255, 255, 0.16) 4px, transparent 4px), radial-gradient(circle at 35% 85%, rgba(255, 255, 255, 0.14) 3px, transparent 3px), radial-gradient(circle at 55% 65%, rgba(255, 255, 255, 0.2) 4px, transparent 4px), radial-gradient(circle at 75% 80%, rgba(255, 255, 255, 0.18) 5px, transparent 5px), radial-gradient(circle at 90% 60%, rgba(255, 255, 255, 0.15) 3px, transparent 3px)'
          };
          return { 
            emoji: '🏖️', 
            gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
            pattern: 'repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0px, transparent 2px, transparent 10px)'
          };
      case 'holiday': return { 
        emoji: '🎉', 
        gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #7e22ce 100%)',
        pattern: 'radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.3) 0%, transparent 70%)'
      };
      case 'training': return { 
        emoji: '📚', 
        gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
        pattern: 'repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(99, 102, 241, 0.15) 15px, rgba(99, 102, 241, 0.15) 30px)'
      };
      default: return { 
        emoji: '📅', 
        gradient: 'linear-gradient(135deg, #64748b 0%, #475569 50%, #334155 100%)',
        pattern: ''
      };
  }
};

// Touch-Detection für plattform-spezifisches Verhalten
const isTouchDevice = typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// Draggable Wrapper für Lektionskarten - Ctrl+Drag für dnd-kit, Click öffnet Modal
const DraggableLessonCard = ({ lesson, onClick, children }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lesson.id,
    data: { type: 'existing-lesson', lesson },
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'pointer',
  };

  const handlePointerDown = (e) => {
    // Alt-Key: Event durchlassen für Merge/Allerlei (Parent handleGridPointerDown)
    if (e.altKey) {
      return; // Kein dnd-kit, Event bubbled zum Parent
    }

    // Ctrl/Cmd: dnd-kit Drag aktivieren
    if (e.ctrlKey || e.metaKey) {
      listeners?.onPointerDown?.(e);
      return;
    }

    // Kein Modifier: Nichts tun, onClick wird später ausgelöst
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="h-full w-full"
      {...attributes}
      onPointerDown={handlePointerDown}
      onClick={() => onClick?.()}
    >
      {children}
    </div>
  );
};

const TimetableGrid = React.forwardRef(
  ({ lessons, onCreateLesson, onEditLesson, timeSlots, currentWeek, holidays, weekInfo, onShowHover, onHideHover, subjects, mergePreview, isSelectingMerge, readOnly = false }, ref) => {
    const [isAltPressed, setIsAltPressed] = useState(false);

    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.altKey) setIsAltPressed(true);
        // Visuelles Feedback: Cursor ändern wenn Ctrl gedrückt (nur Desktop)
        if (e.ctrlKey && !isTouchDevice) {
          document.body.classList.add('ctrl-pressed');
        }
      };
      const handleKeyUp = (e) => {
        setIsAltPressed(false);
        // Ctrl losgelassen → Cursor zurücksetzen
        if (!e.ctrlKey) {
          document.body.classList.remove('ctrl-pressed');
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        document.body.classList.remove('ctrl-pressed');
      };
    }, []);

    const getLessonForSlot = (day, period) => {
      return lessons.find(lesson => 
        lesson.day_of_week === day && 
        lesson.period_slot === period &&
        !lesson.double_master_id  // WICHTIG: Slave-Lessons ausblenden!
      );
    };

    const isSlotOccupiedByDoubleLesson = (day, period) => {
      if (period === 1) return false;
      const previousLesson = lessons.find(l => 
        l.day_of_week === day && 
        l.period_slot === period - 1 &&
        l.is_double_lesson && 
        !l.double_master_id  // Nur echte Master-Lessons können blockieren
      );
      return !!previousLesson;
    };

    const getDateForDay = useMemo(() => (dayKey) => {
      const dayIndex = DAYS.findIndex(d => d.key === dayKey);
      if (dayIndex === -1 || !weekInfo) return null;
      
      const monday = new Date(weekInfo.start);
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + dayIndex);
      return targetDate;
    }, [weekInfo]);

    const getHolidayForDate = useMemo(() => (date) => {
      if (!date || !holidays) return null;

      for (const holiday of holidays) {
        const startDate = new Date(holiday.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(holiday.end_date);
        endDate.setHours(23, 59, 59, 999);

        if (date >= startDate && date <= endDate) {
          return holiday;
        }
      }
      return null;
    }, [holidays]);

    const gridStyle = useMemo(() => ({
      display: 'grid',
      gridTemplateColumns: `120px repeat(5, var(--cell-width, 120px))`,
      gridTemplateRows: `auto repeat(${timeSlots?.length || 8}, var(--cell-height, 80px))`,
      maxWidth: `calc(120px + 5 * var(--cell-width, 120px))`, // Constrain total width
      gap: '0px',
      borderSpacing: '0px',
      minHeight: 0,
      '--num-slots': timeSlots?.length || 8,
    }), [timeSlots?.length]);

    const headerCellStyle = useMemo(() => ({}), []);
      
    const timeSlotCellStyle = useMemo(() => ({
      width: '120px',
    }), []);

    const lessonCellStyle = useMemo(() => ({
      height: 'var(--cell-height, 80px)'
    }), []);

    const hasHolidayInWeek = useMemo(() => {
      if (!weekInfo || !holidays) return null;
      const monday = new Date(weekInfo.start);
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4); // Assuming 5-day week
      for (const holiday of holidays) {
        const startDate = new Date(holiday.start_date);
        const endDate = new Date(holiday.end_date);
        if (monday <= endDate && friday >= startDate) {
          return holiday;
        }
      }
      return null;
    }, [weekInfo, holidays]);

    const holidayDisplay = hasHolidayInWeek ? getHolidayDisplay(hasHolidayInWeek) : null;

    const renderTimeSlotRow = (slot, slotIndex) => {
      const rowNum = slotIndex + 2;
      const isLastRow = slotIndex === timeSlots.length - 1;
      return (
        <React.Fragment key={slot.period}>
          <div 
            className={`sticky left-0 bg-white dark:bg-slate-800 z-10 border-r border-slate-300 dark:border-slate-700 flex items-center justify-center min-w-0 overflow-hidden text-gray-800 dark:text-slate-200 font-medium ${isLastRow ? 'border-b-0' : 'border-b'}`}
            style={{ ...timeSlotCellStyle, gridRow: rowNum, gridColumn: 1 }}
          >
            <TimeSlot period={slot.period} start={slot.start} end={slot.end} />
          </div>
          {DAYS.map((day, dayIndex) => {
            const droppableId = `${day.key}-${slot.period}`;
            const dateForCell = getDateForDay(day.key);
            const holiday = getHolidayForDate(dateForCell);

            // NEU: Prüfen, ob dieser Slot von einer höheren Lektion überdeckt wird
            const coveringLesson = lessons.find(l =>
              l.day_of_week === day.key &&
              l.period_slot < slot.period &&
              l.period_slot + (l.period_span || (l.is_double_lesson ? 2 : 1)) - 1 >= slot.period
            );

            // Wenn der Slot überdeckt ist → nichts rendern
            if (coveringLesson) {
              return null; // Don't render covered slots at all - allows CSS Grid spanning to work
            }

            const lesson = getLessonForSlot(day.key, slot.period);
            return (
              <SlotCell
                key={droppableId}
                dayIndex={dayIndex}
                rowNum={rowNum}
                holiday={holiday}
                isOccupied={false} // Da wir überdeckte Zellen nicht rendern, ist isOccupied hier immer false
                lesson={lesson}
                droppableId={droppableId}
                onCreateLesson={readOnly ? null : onCreateLesson}
                day={day}
                slot={slot}
                onEditLesson={readOnly ? null : onEditLesson}
                onShowHover={onShowHover}
                onHideHover={onHideHover}
                isLastRow={isLastRow}
                subjects={subjects}
                isAltPressed={isAltPressed}
                readOnly={readOnly}
              />
            );
          })}
        </React.Fragment>
      );
    };

    const SlotCell = ({ dayIndex, rowNum, holiday, isOccupied, lesson, droppableId, onCreateLesson, day, slot, onEditLesson, onShowHover, onHideHover, isLastRow, subjects, isAltPressed, readOnly = false }) => {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      if (!validDays.includes(day.key)) {
        console.error(`Invalid day.key in SlotCell: ${day.key} for slot ${slot.period}`);
        return null; // Oder rendern eines leeren Slots
      }

      const { setNodeRef: dropRef, isOver } = useDroppable({
        id: droppableId,
        disabled: readOnly || !!lesson || !!holiday || isOccupied
      });

      if (isOccupied) {
        return (
          <div
            className={`relative border-r border-b border-slate-300 dark:border-slate-700 bg-transparent pointer-events-none ${
              dayIndex < DAYS.length - 1 ? 'border-r-slate-300 dark:border-r-slate-700' : 'border-r-transparent'
            } ${isLastRow ? 'border-b-0' : ''}`}
            style={{
              gridRow: rowNum,
              gridColumn: dayIndex + 2,
              minHeight: 'var(--cell-height, 80px)',
              height: 0,  // Flach, aber Borders sichtbar
            }}
          />
        );
      }

      return (
        <div
          className={`relative border-r ${dayIndex < DAYS.length - 1 ? 'border-r-slate-300 dark:border-r-slate-700' : 'border-r-transparent'} border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 group text-left min-w-0 overflow-hidden ${isLastRow || lesson?.is_double_lesson ? 'border-b-0' : 'border-b'}`}
          style={{
            gridRow: rowNum,
            gridColumn: dayIndex + 2,
            minHeight: 'var(--cell-height, 80px)',
            ...(lesson ? (() => {
              // Use || instead of ?? to treat 0 as falsy (fallback to calculated default)
              const span = lesson?.period_span || (lesson?.is_double_lesson ? 2 : 1);
              return span > 1 ? {
                gridRow: `${rowNum} / span ${span}`,
                minHeight: `calc(var(--cell-height, 80px) * ${span} - 1px)`, // -1px wegen Border
                borderBottom: 'none',
                overflow: 'hidden',
              } : {};
            })() : {}),
          }}
          data-day={day.key}
          data-period={slot.period}
        >
          <div
            ref={dropRef}
            className={`h-full w-full transition-colors duration-200 ${
              isOver && !holiday ? "bg-blue-900/30" : ""
            } ${isAltPressed ? 'cursor-alias' : ''}`}
            // HTML5 Drop-Handler für existierende Lektionen (Ctrl+Drag)
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes('lessonid') || e.dataTransfer.types.includes('text/plain')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }
            }}
            onDrop={(e) => {
              const lessonId = e.dataTransfer.getData('lessonId');
              const type = e.dataTransfer.getData('type');
              if (type === 'existing-lesson' && lessonId && onEditLesson) {
                e.preventDefault();
                e.stopPropagation();
                // TODO: onMoveLesson implementieren - vorerst nur log
                console.log('Move lesson:', lessonId, 'to', day.key, slot.period);
              }
            }}
          >
            {lesson ? (() => {
              const isPartOfMerge = isSelectingMerge && mergePreview?.lessons.some(l => l.id === lesson.id);

              // Farben der im Merge enthaltenen Fächer sammeln
              const mergeColors = mergePreview?.lessons
                .map(l => subjects.find(s => s.name === l.subject_name)?.color)
                .filter(Boolean);

              const mixedGradient = mergeColors && mergeColors.length > 0
                ? createMixedSubjectGradient(mergeColors)
                : null;

              return (
                <div
                  className="h-full w-full relative"
                  onPointerEnter={(e) => onShowHover(lesson, e)}
                  onPointerLeave={onHideHover}
                >
                  {/* Draggable Wrapper für Ctrl+Drag */}
                  <DraggableLessonCard lesson={lesson} onClick={() => onEditLesson?.(lesson.id)}>
                    <LessonCard
                      lesson={lesson}
                      isDragging={false}
                      subjects={subjects}
                      isAltPressed={isAltPressed}
                    />
                  </DraggableLessonCard>

                  {/* Während Merge: Original-Lektion komplett ausblenden */}
                  {isPartOfMerge && (
                    <div 
                      className="absolute inset-0 rounded-lg pointer-events-none bg-white transition-opacity duration-300"
                      style={{ opacity: isSelectingMerge ? 1 : 0 }}
                    />
                  )}
                </div>
              );
            })() : (
              !readOnly && onCreateLesson && (
                <div className="absolute inset-0">
                  <div className="absolute inset-1 rounded-lg border-2 border-transparent border-dashed opacity-0 group-hover:opacity-100 group-hover:border-blue-400 group-hover:bg-blue-900/20 transition-all duration-200" />
                  <Button
                    variant="ghost"
                    className="w-full h-full text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center relative hover:bg-transparent"
                    onClick={() => onCreateLesson(day.key, slot.period)}
                  >
                    <Plus className="w-5 h-5 z-10" />
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="relative bg-transparent rounded-2xl">
        {/* Full-week holiday overlay - covers entire grid */}
        {hasHolidayInWeek && (
          <div
            className="absolute flex flex-col items-center justify-center text-center text-white pointer-events-none"
            style={{
              background: holidayDisplay.gradient,
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 50,
              borderRadius: '1rem',
            }}
          >
            {/* Animierte Dekorationen basierend auf Ferientyp */}
            <HolidayDecorations type={hasHolidayInWeek.type} holidayName={hasHolidayInWeek.name} />

            {/* Emoji und Text */}
            <div className="relative z-10">
              <div className="text-9xl opacity-90 drop-shadow-lg">{holidayDisplay.emoji}</div>
              <span className="text-2xl font-bold leading-tight mt-4 drop-shadow-md">{hasHolidayInWeek.name}</span>
            </div>
          </div>
        )}
        <div ref={ref} className="timetable-grid-container grid gap-0 bg-transparent rounded-2xl" style={gridStyle} key={lessons.length}>
          {/* Header Row */}
          <div 
            className="p-3 text-center border-r border-b border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-20"
            style={{ ...timeSlotCellStyle, gridRow: 1, gridColumn: 1 }}
          >
            <div className="text-text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center justify-center h-full">Zeit</div>
          </div>
          
          {DAYS.map((day, dayIndex) => (
            <div 
              key={day.key} 
              className={`bg-white dark:bg-slate-800 sticky top-0 z-10 border-b border-r ${dayIndex < DAYS.length - 1 ? 'border-r-slate-300 dark:border-r-slate-700' : 'border-r-transparent'} border-slate-300 dark:border-slate-700 text-center min-w-0 overflow-hidden text-black dark:text-white font-semibold`}
              style={{ ...headerCellStyle, gridRow: 1, gridColumn: dayIndex + 2 }}
            >
              <DayHeader day={day.key} currentWeek={currentWeek} />
            </div>
          ))}
          
          {(timeSlots || []).map((slot, slotIndex) => renderTimeSlotRow(slot, slotIndex))}
          
          {/* NEU: Direkter Merge-Preview als echtes Grid-Element */}
          {mergePreview && mergePreview.lessons.length >= 2 && (() => {
            // Berechne totalSpan basierend auf period_span der einzelnen Lektionen (Doppellektionen zählen als 2)
            const totalSpan = mergePreview.lessons.reduce((sum, l) =>
              sum + (l.period_span || (l.is_double_lesson ? 2 : 1)), 0);

            return (
              <motion.div
                layout
                layoutId="merge-preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="rounded-2xl shadow-2xl overflow-hidden col-span-1 pointer-events-none"
                style={{
                  gridColumn: DAYS.findIndex(d => d.key === mergePreview.day) + 2,
                  gridRow: `${mergePreview.startPeriod + 1} / span ${totalSpan}`,
                  background: createMixedSubjectGradient(
                    mergePreview.lessons
                      .map(l => subjects.find(s => s.name === l.subject_name)?.color)
                      .filter(Boolean)
                      .concat(['#94a3b8'])
                  ),
                  zIndex: 50,
                }}
              >
                <div className="h-full w-full flex flex-col items-center justify-center text-white p-3">
                  <div className="text-3xl font-bold drop-shadow-2xl tracking-tight">
                    Allerlei
                  </div>
                  <div className="text-lg mt-1 opacity-90 drop-shadow-lg">
                    {totalSpan} Stunden
                  </div>
                  <div className="text-sm mt-2 px-4 text-center leading-relaxed opacity-80 truncate max-w-full drop-shadow-md">
                    {[...new Set(mergePreview.lessons.map(l => l.subject_name))].filter(Boolean).join(' + ')}
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </div>
      </div>
    );
  }
);

export default TimetableGrid;