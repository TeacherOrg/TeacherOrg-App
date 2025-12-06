import React from "react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import TimeSlot from "./TimeSlot";
import DayHeader, { DAYS } from "./DayHeader";
import LessonCard from "./LessonCard";
import { useDraggable } from "@dnd-kit/core";

const getHolidayDisplay = (holiday) => {
  if (!holiday) return { emoji: '', gradient: '', pattern: '' };
  switch (holiday.type) {
      case 'vacation': 
          if (holiday.name.includes('Sommer')) return { 
            emoji: '☀️', 
            gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fb923c 100%)',
            pattern: 'radial-gradient(circle at 20% 80%, rgba(251, 191, 36, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.3) 0%, transparent 50%)'
          };
          if (holiday.name.includes('Herbst')) return { 
            emoji: '🍂', 
            gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
            pattern: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(249, 115, 22, 0.1) 10px, rgba(249, 115, 22, 0.1) 20px)'
          };
          if (holiday.name.includes('Weihnacht')) return { 
            emoji: '🎄', 
            gradient: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)',
            pattern: 'radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.12) 2px, transparent 2px), radial-gradient(circle at 60% 70%, rgba(255, 255, 255, 0.08) 3px, transparent 3px), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 2px, transparent 2px), radial-gradient(circle at 35% 80%, rgba(255, 255, 255, 0.1) 2px, transparent 2px), radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.1) 2.5px, transparent 2.5px), radial-gradient(circle at 15% 60%, rgba(255, 255, 255, 0.09) 2px, transparent 2px), radial-gradient(circle at 70% 50%, rgba(255, 255, 255, 0.11) 2px, transparent 2px), radial-gradient(circle at 40% 15%, rgba(255, 255, 255, 0.13) 2.5px, transparent 2.5px), radial-gradient(circle at 85% 65%, rgba(255, 255, 255, 0.1) 2px, transparent 2px), radial-gradient(circle at 25% 90%, rgba(255, 255, 255, 0.08) 3px, transparent 3px), radial-gradient(circle at 90% 85%, rgba(255, 255, 255, 0.12) 2px, transparent 2px), radial-gradient(circle at 45% 55%, rgba(255, 255, 255, 0.09) 2.5px, transparent 2.5px)'
          };
          if (holiday.name.includes('Sport')) return { 
            emoji: '⛷️', 
            gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)',
            pattern: 'linear-gradient(45deg, rgba(255, 255, 255, 0.1) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.1) 75%)'
          };
          if (holiday.name.includes('Frühling')) return { 
            emoji: '🌷', 
            gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)',
            pattern: 'radial-gradient(circle at 30% 30%, rgba(167, 139, 250, 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)'
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

const DraggableItem = ({ id, data, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useDraggable({ id, data });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };
  return <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="h-full w-full select-none lesson-card">{children}</div>;
};

const SlotCell = ({ dayIndex, rowNum, holiday, holidayDisplay, isOccupied, lesson, droppableId, onCreateLesson, day, slot, onEditLesson, onShowHover, onHideHover, isLastRow, subjects }) => {
  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  if (!validDays.includes(day.key)) {
    console.error(`Invalid day.key in SlotCell: ${day.key} for slot ${slot.period}`);
    return null; // Oder rendern eines leeren Slots
  }

  const { setNodeRef: dropRef, isOver } = useDroppable({ 
    id: droppableId, 
    disabled: !!lesson || !!holiday || isOccupied 
  });

  // Neu: Render leeren Platzhalter für occupied (vermeidet Layout-Shift/Border-Lücken)
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
        ...(lesson?.is_double_lesson ? {
          gridRow: `${rowNum} / span 2`,
          minHeight: `calc(var(--cell-height, 80px) * 2 - 1px)`,
          borderBottom: 'none',
          overflow: 'hidden',
        } : {}),
        ...(holiday ? {
          background: holidayDisplay.gradient,
          backgroundImage: holidayDisplay.pattern,
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
              subjects={subjects} // Pass subjects prop to LessonCard
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
  ({ lessons, onCreateLesson, onEditLesson, timeSlots, currentWeek, holidays, weekInfo, onShowHover, onHideHover, subjects }, ref) => {
    // Remove useCallback - normal function for latest state
    const getLessonForSlot = (day, period) => {
      return lessons.find(lesson => 
        lesson.day_of_week === day && 
        lesson.period_slot === period &&
        !lesson.double_master_id  // WICHTIG: Slave-Lessons ausblenden!
      );
    };

    // Remove useCallback
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

    // New: Check if the current week has any holidays
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
                isLastRow={isLastRow}
                subjects={subjects} // Pass subjects prop to SlotCell
              />
            );
          })}
        </React.Fragment>
      );
    };

    return (
      <div className="relative bg-transparent rounded-2xl">
        {/* New: Full-week holiday overlay */}
        {hasHolidayInWeek && (
          <div
            className="absolute flex flex-col items-center justify-center text-center text-white pointer-events-none z-10"
            style={{
              background: holidayDisplay.pattern ? `${holidayDisplay.gradient}, ${holidayDisplay.pattern}` : holidayDisplay.gradient,
              top: 'var(--cell-height)',
              left: '120px',
              width: 'calc(100% - 120px)',
              height: 'calc(100% - var(--cell-height))',
            }}
          >
            <div className="text-9xl">{holidayDisplay.emoji}</div>
            <span className="text-sm font-bold leading-tight mt-1">{hasHolidayInWeek.name}</span>
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
        </div>
      </div>
    );
  }
);

export default TimetableGrid;