import React from "react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import TimeSlot from "./TimeSlot";
import DayHeader, { DAYS } from "./DayHeader";
import LessonCard from "./LessonCard";
import { useDraggable } from "@dnd-kit/core"

const getHolidayDisplay = (holiday) => {
  if (!holiday) return { emoji: '', color: '' };
  switch (holiday.type) {
      case 'vacation': 
          if (holiday.name.includes('Sommer')) return { emoji: '☀️', color: 'bg-yellow-800/60' };
          if (holiday.name.includes('Herbst')) return { emoji: '🍂', color: 'bg-orange-800/60' };
          if (holiday.name.includes('Weihnacht')) return { emoji: '🎄', color: 'bg-green-800/60' };
          if (holiday.name.includes('Sport')) return { emoji: '⛷️', color: 'bg-blue-800/60' };
          if (holiday.name.includes('Frühling')) return { emoji: '🌸', color: 'bg-pink-800/60' };
          return { emoji: '🏖️', color: 'bg-cyan-800/60' };
      case 'holiday': return { emoji: '🎉', color: 'bg-purple-800/60' };
      case 'training': return { emoji: '📚', color: 'bg-indigo-800/60' };
      default: return { emoji: '📅', color: 'bg-gray-800/60' };
  }
};

const DraggableItem = ({ id, data, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useDraggable({ id, data });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };
  return <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="h-full w-full select-none lesson-card">{children}</div>;
};

const SlotCell = ({ dayIndex, rowNum, holiday, holidayDisplay, isOccupied, lesson, droppableId, onCreateLesson, day, slot, onEditLesson, onShowHover, onHideHover, isLastRow }) => {  // Neu: isLastRow als Prop hinzufügen
  const { setNodeRef: dropRef, isOver } = useDroppable({ 
    id: droppableId, 
    disabled: !!lesson || !!holiday || isOccupied 
  });

  if (isOccupied) {
    return (
      <div
        className="relative border-r border-slate-700 bg-transparent"
        style={{
          gridRow: rowNum,
          gridColumn: dayIndex + 2,
        }}
      >
        {/* Leere Platzhalter-Zelle, kein Inhalt */}
      </div>
    );
  }

  return (
    <div
      className={`relative border-r ${dayIndex < DAYS.length - 1 ? 'border-r-slate-300 dark:border-r-slate-700' : 'border-r-transparent'} border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 group ${holiday ? holidayDisplay.color : ''} text-left min-w-0 overflow-hidden ${isLastRow ? 'border-b-0' : 'border-b'}`}  // Neu: Conditional border-b
      style={{
        gridRow: rowNum,
        gridColumn: dayIndex + 2,
        minHeight: 'var(--cell-height, 80px)',
        ...(lesson?.is_double_lesson ? {
          gridRow: `${rowNum} / span 2`,
          minHeight: `calc(var(--cell-height, 80px) * 2 - 1px)`,  
          borderBottom: 'none',  
          overflow: 'hidden',  
        } : {})
      }}
    >
      <div
        ref={dropRef}
        className={`h-full w-full transition-colors duration-200 ${
          isOver && !holiday ? "bg-blue-900/30" : ""
        }`}
      >
        {lesson ? (
          <DraggableItem id={lesson.id} data={{ type: 'lesson', lesson }}>
            <LessonCard
              lesson={lesson}
              isDragging={false}
              onEdit={onEditLesson}
              onMouseEnter={(e) => onShowHover(lesson, e)}
              onMouseLeave={onHideHover}
              onMouseMove={() => {}}
            />
          </DraggableItem>
        ) : holiday ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1 text-white pointer-events-none">
            <div className="text-xl">{holidayDisplay.emoji}</div>
            <span className="text-xs font-bold leading-tight mt-1">{holiday.name}</span>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};

const TimetableGrid = React.forwardRef(
  ({ lessons, onCreateLesson, onEditLesson, timeSlots, currentWeek, holidays, weekInfo, onShowHover, onHideHover }, ref) => {
    // Remove useCallback - normal function for latest state
    const getLessonForSlot = (day, period) => {
      console.log(`Checking slot ${day}-${period} with current lessons length: ${lessons.length}`);
      return lessons.find(lesson => lesson.day_of_week === day && lesson.period_slot === period);
    };

    // Remove useCallback
    const isSlotOccupiedByDoubleLesson = (day, period) => {
      if (period === 1) return false;
      const previousPeriodLesson = getLessonForSlot(day, period - 1);
      return previousPeriodLesson?.is_double_lesson;
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
      gridTemplateColumns: `120px repeat(5, var(--cell-width, 120px))`,  // Neu: Verwende var(--cell-width) für manuelle Einstellung
      gridTemplateRows: `auto repeat(${timeSlots?.length || 8}, min-content)`,
      width: 'fit-content',  // Neu: fit-content statt 100%, damit Breite an Cells anpasst
      gap: '0px',
      borderSpacing: '0px',
    }), [timeSlots?.length]);

    const headerCellStyle = useMemo(() => ({}), []);
      
    const timeSlotCellStyle = useMemo(() => ({
      width: '120px',
    }), []);

    const lessonCellStyle = useMemo(() => ({
      height: 'var(--cell-height, 80px)'
    }), []);

    const renderTimeSlotRow = (slot, slotIndex) => {
      const rowNum = slotIndex + 2; // Header is row 1, slots start at row 2
      const isLastRow = slotIndex === timeSlots.length - 1;  // Neu: Check ob letzte Row
      console.log('Rendering row for period:', slot.period, 'with lessons:', lessons.map(l => l.period_slot));
      return (
        <React.Fragment key={slot.period}>
          <div 
            className={`sticky left-0 bg-white dark:bg-slate-800 z-10 border-r border-slate-300 dark:border-slate-700 flex items-center justify-center min-w-0 overflow-hidden text-gray-800 dark:text-slate-200 font-medium ${isLastRow ? 'border-b-0' : 'border-b'}`}  // Änderung: text-gray-800 für dunklere Schrift im Light Mode
            style={{ ...timeSlotCellStyle, gridRow: rowNum, gridColumn: 1 }}
          >
            <TimeSlot period={slot.period} start={slot.start} end={slot.end} />
          </div>
        
          {DAYS.map((day, dayIndex) => {
            const droppableId = `${day.key}-${slot.period}`;

            const dateForCell = getDateForDay(day.key);
            const holiday = getHolidayForDate(dateForCell);
            const holidayDisplay = holiday ? getHolidayDisplay(holiday) : null;

            const isOccupied = isSlotOccupiedByDoubleLesson(day.key, slot.period);

            const lesson = getLessonForSlot(day.key, slot.period);  

            return (
            <SlotCell
              key={droppableId}
              dayIndex={dayIndex}
              rowNum={rowNum}
              holiday={holiday}
              holidayDisplay={holidayDisplay}
              isOccupied={isOccupied}
              lesson={lesson}
              droppableId={droppableId}
              onCreateLesson={onCreateLesson}
              day={day}
              slot={slot}
              onEditLesson={onEditLesson}
              onShowHover={onShowHover}
              onHideHover={onHideHover}
              isLastRow={isLastRow}  // Neu: Übergebe die Prop
            />
          );
          })}
        </React.Fragment>
      );
    };

    // Hier ist der return mit ref und key – er muss genau so platziert werden, wie im Original (am Ende der Funktion)
    return (
      <div ref={ref} className="grid gap-0 bg-white dark:bg-slate-800 rounded-2xl" style={gridStyle} key={lessons.length}>
        {/* Header Row */}
        <div 
          className="p-3 text-center border-r border-b border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-20"
          style={{ ...timeSlotCellStyle, gridRow: 1, gridColumn: 1 }}
        >
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center justify-center h-full">Zeit</div>
        </div>
        
        {DAYS.map((day, dayIndex) => (
          <div 
            key={day.key} 
            className={`bg-white dark:bg-slate-800 sticky top-0 z-10 border-b border-r ${dayIndex < DAYS.length - 1 ? 'border-r-slate-300 dark:border-r-slate-700' : 'border-r-transparent'} border-slate-300 dark:border-slate-700 text-center min-w-0 overflow-hidden text-black dark:text-white font-semibold`}  // Hinzugefügt: text-black dark:text-white font-semibold für bessere Sichtbarkeit
            style={{ ...headerCellStyle, gridRow: 1, gridColumn: dayIndex + 2 }}
          >
            <DayHeader day={day.key} currentWeek={currentWeek} />
          </div>
        ))}
        
        {(timeSlots || []).map((slot, slotIndex) => renderTimeSlotRow(slot, slotIndex))}
      </div>
    );
  }
);

export default TimetableGrid;