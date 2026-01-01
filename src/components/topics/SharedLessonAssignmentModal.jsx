import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Check,
  GripVertical,
  X
} from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { getDoubleSlotsForSubject } from '@/utils/fixedScheduleGenerator';
import { useLessonStore } from '@/store';
import { toast } from 'sonner';

// Draggable Lesson Card im Pool
function DraggableLessonCard({ lesson, index, isAssigned, assignment }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lesson-${index}`,
    data: { lesson, index }
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        relative p-3 rounded-lg border cursor-grab active:cursor-grabbing
        transition-all duration-200
        ${isAssigned
          ? 'bg-green-900/30 border-green-600'
          : 'bg-slate-800 border-slate-600 hover:border-slate-500'}
      `}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <span className="text-slate-400 text-sm font-mono w-6">{index + 1}.</span>
        <span className="text-white font-medium flex-1 truncate">
          {lesson.name || lesson.notes || `Lektion ${index + 1}`}
        </span>
        {lesson.is_double_lesson && (
          <span className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded font-bold">
            2x
          </span>
        )}
        {isAssigned && (
          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
        )}
      </div>
      {isAssigned && assignment && (
        <div className="mt-1 text-xs text-green-400 pl-6">
          KW {assignment.week}, Slot {assignment.slot}
          {assignment.isDouble && `-${assignment.slot + 1}`}
        </div>
      )}
    </div>
  );
}

// Droppable Slot Cell
function DroppableSlotCell({
  week,
  slot,
  isDouble,
  isOccupied,
  assignedLesson,
  onRemoveAssignment
}) {
  const slotId = isDouble ? `${week}-${slot}-${slot + 1}` : `${week}-${slot}`;
  const { isOver, setNodeRef } = useDroppable({
    id: slotId,
    data: { week, slot, isDouble }
  });

  const handleClick = () => {
    if (assignedLesson && onRemoveAssignment) {
      onRemoveAssignment(assignedLesson.index);
    }
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={`
        min-h-[40px] p-1 rounded border text-center text-xs
        transition-all duration-200
        ${isOccupied && !assignedLesson
          ? 'bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed'
          : assignedLesson
            ? 'bg-blue-900/50 border-blue-500 cursor-pointer hover:bg-blue-900/70'
            : isOver
              ? 'bg-green-900/50 border-green-400 border-2'
              : 'bg-slate-800 border-slate-600 hover:border-slate-400 cursor-pointer'
        }
      `}
    >
      {assignedLesson ? (
        <div className="flex items-center justify-center gap-1">
          <span className="text-white truncate">
            {assignedLesson.lesson.name?.slice(0, 8) || `L${assignedLesson.index + 1}`}
          </span>
          <X className="w-3 h-3 text-slate-400 hover:text-red-400" />
        </div>
      ) : isOccupied ? (
        <span>belegt</span>
      ) : isDouble ? (
        <span className="text-purple-400 font-bold">2x</span>
      ) : (
        <span className="text-slate-500">-</span>
      )}
    </div>
  );
}

export default function SharedLessonAssignmentModal({
  isOpen,
  onClose,
  sharedTopic,
  selectedSubject,
  subjects,
  settings,
  allYearlyLessons,
  onComplete
}) {
  const [assignments, setAssignments] = useState(new Map());
  const [weekOffset, setWeekOffset] = useState(0);
  const [warnings, setWarnings] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);

  const weeksToShow = 10;
  const currentWeek = useMemo(() => {
    const now = new Date();
    const jan4 = new Date(now.getFullYear(), 0, 4);
    const daysToMonday = (jan4.getDay() + 6) % 7;
    const mondayOfWeek1 = new Date(jan4.getTime() - daysToMonday * 86400000);
    const diffTime = now.getTime() - mondayOfWeek1.getTime();
    return Math.max(1, Math.min(52, Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  // Shared lessons from topic
  const sharedLessons = useMemo(() => {
    return sharedTopic?.lessons_snapshot || [];
  }, [sharedTopic]);

  // Count double lessons for slot calculation
  const lessonSlots = useMemo(() => {
    const slots = [];
    sharedLessons.forEach((lesson, idx) => {
      if (lesson.is_double_lesson) {
        slots.push({ type: 'double', indices: [idx] });
      } else {
        slots.push({ type: 'single', indices: [idx] });
      }
    });
    return slots;
  }, [sharedLessons]);

  // Calculate total slots needed (counting double as 2)
  const totalSlotsNeeded = useMemo(() => {
    return sharedLessons.reduce((sum, l) => sum + (l.is_double_lesson ? 2 : 1), 0);
  }, [sharedLessons]);

  // Get double slots for the selected subject from template
  const subjectDoubleSlots = useMemo(() => {
    if (!settings?.fixedScheduleTemplate || !selectedSubject) return new Set();
    return getDoubleSlotsForSubject(
      settings.fixedScheduleTemplate,
      selectedSubject.name,
      selectedSubject.class_id
    );
  }, [settings, selectedSubject]);

  // Get weekly slots for this subject - based on lessons_per_week (like YearlyGrid)
  const weeklySlots = useMemo(() => {
    if (!selectedSubject) return [];

    // Anzahl Slots aus Fach-Einstellung (wie YearlyGrid)
    const slotsPerWeek = selectedSubject.lessons_per_week || selectedSubject.weekly_lessons || 4;
    const slots = [];

    // Sammle alle Doppelslot-Startpositionen aus dem Template (falls vorhanden)
    const doubleSlotStarts = new Set();
    if (settings?.fixedScheduleTemplate && subjectDoubleSlots.size > 0) {
      // subjectDoubleSlots enthaelt "day-period" Keys fuer Doppelstunden
      // Wir zaehlen wie viele Doppelstunden es gibt und an welchen Positionen
      let slotIndex = 1;
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      days.forEach(day => {
        const daySlots = (settings.fixedScheduleTemplate[day] || [])
          .filter(s => s.subject === selectedSubject.name && s.class_id === selectedSubject.class_id)
          .sort((a, b) => a.period - b.period);

        daySlots.forEach(s => {
          const key = `${day}-${s.period}`;
          const prevKey = `${day}-${s.period - 1}`;
          // Ueberspringe zweiten Teil einer Doppelstunde
          if (subjectDoubleSlots.has(prevKey)) return;

          if (subjectDoubleSlots.has(key)) {
            doubleSlotStarts.add(slotIndex);
          }
          slotIndex++;
        });
      });
    }

    // Generiere Slots von 1 bis slotsPerWeek
    for (let i = 1; i <= slotsPerWeek; i++) {
      const isDouble = doubleSlotStarts.has(i);

      slots.push({
        period: i,
        isDouble
      });
    }

    return slots;
  }, [selectedSubject, settings, subjectDoubleSlots]);

  // Get occupied slots (already assigned yearly lessons)
  // Bei Doppellektionen auch den Folgeslot als belegt markieren
  const occupiedSlots = useMemo(() => {
    if (!allYearlyLessons || !selectedSubject) return new Set();
    const occupied = new Set();

    allYearlyLessons
      .filter(yl => yl.subject === selectedSubject.id)
      .forEach(yl => {
        occupied.add(`${yl.week_number}-${yl.lesson_number}`);
        // Wenn dies eine Doppellektion ist, auch naechsten Slot blockieren
        if (yl.is_double_lesson) {
          occupied.add(`${yl.week_number}-${Number(yl.lesson_number) + 1}`);
        }
      });

    return occupied;
  }, [allYearlyLessons, selectedSubject]);

  // Visible weeks
  const visibleWeeks = useMemo(() => {
    const start = Math.max(1, currentWeek + weekOffset);
    const weeks = [];
    for (let i = 0; i < weeksToShow && start + i <= 52; i++) {
      weeks.push(start + i);
    }
    return weeks;
  }, [currentWeek, weekOffset]);

  // Validate and generate warnings
  useEffect(() => {
    const newWarnings = [];

    assignments.forEach((assignment, lessonIndex) => {
      const lesson = sharedLessons[lessonIndex];
      if (lesson?.is_double_lesson && !assignment.isDouble) {
        newWarnings.push({
          type: 'double_to_single',
          lessonIndex,
          message: `Lektion ${lessonIndex + 1} ist eine Doppellektion, wurde aber einem Einzelslot zugewiesen`
        });
      }
    });

    // Check order
    const assignedIndices = Array.from(assignments.keys()).sort((a, b) => a - b);
    const assignmentOrder = assignedIndices.map(i => {
      const a = assignments.get(i);
      return a.week * 100 + a.slot;
    });

    for (let i = 1; i < assignmentOrder.length; i++) {
      if (assignmentOrder[i] < assignmentOrder[i - 1]) {
        newWarnings.push({
          type: 'order_changed',
          message: 'Die Reihenfolge der Lektionen wurde geaendert'
        });
        break;
      }
    }

    setWarnings(newWarnings);
  }, [assignments, sharedLessons]);

  // Handle drag end
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveLesson(null);

    if (!over) return;

    const lessonIndex = active.data.current.index;
    const lesson = active.data.current.lesson;
    const { week, slot, isDouble } = over.data.current;

    // Check if slot is occupied
    const slotKey = `${week}-${slot}`;
    if (occupiedSlots.has(slotKey)) {
      toast.error('Dieser Slot ist bereits belegt');
      return;
    }

    // Bei Doppellektionen auch Folgeslot pruefen
    if (lesson.is_double_lesson) {
      const nextSlotKey = `${week}-${slot + 1}`;
      if (occupiedSlots.has(nextSlotKey)) {
        toast.error('Der Folgeslot fuer die Doppellektion ist bereits belegt');
        return;
      }
      // Pruefe auch ob Folgeslot bereits einer anderen Lektion zugewiesen wurde
      let nextSlotAssigned = false;
      assignments.forEach((assignment) => {
        if (assignment.week === week && assignment.slot === slot + 1) {
          nextSlotAssigned = true;
        }
      });
      if (nextSlotAssigned) {
        toast.error('Der Folgeslot ist bereits einer anderen Lektion zugewiesen');
        return;
      }
    }

    // Check if double lesson fits in double slot
    if (lesson.is_double_lesson && !isDouble) {
      // Allow but warn
      toast.warning('Doppellektion wird einem Einzelslot zugewiesen');
    }

    setAssignments(prev => {
      const newMap = new Map(prev);
      newMap.set(lessonIndex, {
        week,
        slot,
        // Doppellektion: immer is_double_lesson der Lektion verwenden
        isDouble: lesson.is_double_lesson
      });
      return newMap;
    });
  }, [occupiedSlots, assignments]);

  const handleDragStart = (event) => {
    setActiveLesson(event.active.data.current);
  };

  const handleRemoveAssignment = (lessonIndex) => {
    setAssignments(prev => {
      const newMap = new Map(prev);
      newMap.delete(lessonIndex);
      return newMap;
    });
  };

  const handleComplete = async () => {
    if (assignments.size === 0) {
      toast.error('Bitte weisen Sie mindestens eine Lektion zu');
      return;
    }

    // Build assignment data for parent
    const assignmentData = [];
    assignments.forEach((assignment, lessonIndex) => {
      assignmentData.push({
        lessonIndex,
        lesson: sharedLessons[lessonIndex],
        week: assignment.week,
        slot: assignment.slot,
        isDouble: assignment.isDouble
      });
    });

    // Get unassigned lessons
    const unassignedLessons = sharedLessons
      .map((l, i) => ({ lesson: l, index: i }))
      .filter(({ index }) => !assignments.has(index));

    await onComplete({
      sharedTopic,
      selectedSubject,
      assignments: assignmentData,
      unassignedLessons,
      warnings
    });
  };

  const topicData = sharedTopic?.topic_snapshot || {};

  // Get slot number for display (1, 2, 3-4, 5, etc.)
  const getSlotDisplay = (slotInfo) => {
    if (slotInfo.isDouble) {
      return `${slotInfo.period}-${slotInfo.period + 1}`;
    }
    return slotInfo.period.toString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] bg-slate-900 border-slate-700 text-white overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-xl">
            <BookOpen className="w-6 h-6 text-blue-400" />
            Lektionen zuweisen - "{topicData.name || 'Thema'}"
          </DialogTitle>
        </DialogHeader>

        {/* Warnings Banner */}
        {warnings.length > 0 && (
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-200">
              {warnings.map((w, i) => (
                <div key={i}>{w.message}</div>
              ))}
            </div>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToWindowEdges]}
        >
          <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
            {/* Left Panel - Pool */}
            <div className="w-1/3 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-300">Empfangene Lektionen</h3>
                <span className="text-sm text-slate-400">
                  {assignments.size}/{sharedLessons.length} zugewiesen
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {sharedLessons.map((lesson, index) => (
                  <DraggableLessonCard
                    key={index}
                    lesson={lesson}
                    index={index}
                    isAssigned={assignments.has(index)}
                    assignment={assignments.get(index)}
                  />
                ))}
                {sharedLessons.length === 0 && (
                  <p className="text-slate-500 text-center py-4">Keine Lektionen vorhanden</p>
                )}
              </div>
            </div>

            {/* Right Panel - Schedule Grid */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-300">
                  Ihre Slots ({selectedSubject?.name || 'Fach'})
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setWeekOffset(prev => Math.max(1 - currentWeek, prev - weeksToShow))}
                    disabled={visibleWeeks[0] <= 1}
                    className="border-slate-600 text-slate-300"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-slate-400">
                    KW {visibleWeeks[0]}-{visibleWeeks[visibleWeeks.length - 1]}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setWeekOffset(prev => Math.min(52 - currentWeek - weeksToShow + 1, prev + weeksToShow))}
                    disabled={visibleWeeks[visibleWeeks.length - 1] >= 52}
                    className="border-slate-600 text-slate-300"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {weeklySlots.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>Kein Fach ausgewaehlt oder keine Slots verfuegbar.</p>
                    <p className="text-sm mt-2">Bitte waehlen Sie ein Fach mit definierten Wochenstunden.</p>
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-slate-400 text-sm">
                        <th className="p-2 text-left border-b border-slate-700">KW</th>
                        {weeklySlots.map((slot, i) => (
                          <th key={i} className="p-2 text-center border-b border-slate-700">
                            <div className="flex flex-col items-center">
                              <span>{getSlotDisplay(slot)}</span>
                              {slot.isDouble && (
                                <span className="text-purple-400 text-xs">2x</span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleWeeks.map(week => (
                        <tr key={week} className="border-b border-slate-800">
                          <td className="p-2 text-slate-400 font-mono text-sm">{week}</td>
                          {weeklySlots.map((slotInfo, slotIdx) => {
                            const slotKey = `${week}-${slotInfo.period}`;
                            const isOccupied = occupiedSlots.has(slotKey);

                            // Pruefe ob dieser Slot ein Folgeslot einer Doppellektion ist
                            let isSecondPartOfDouble = false;
                            assignments.forEach((assignment) => {
                              if (assignment.week === week &&
                                  assignment.isDouble &&
                                  assignment.slot + 1 === slotInfo.period) {
                                isSecondPartOfDouble = true;
                              }
                            });

                            // Find if any lesson is assigned to this slot
                            let assignedLesson = null;
                            assignments.forEach((assignment, lessonIndex) => {
                              if (assignment.week === week && assignment.slot === slotInfo.period) {
                                assignedLesson = {
                                  lesson: sharedLessons[lessonIndex],
                                  index: lessonIndex
                                };
                              }
                            });

                            return (
                              <td key={slotIdx} className="p-1">
                                {isSecondPartOfDouble ? (
                                  <div className="min-h-[40px] p-1 rounded border text-center text-xs bg-purple-900/30 border-purple-500 text-purple-300 flex items-center justify-center">
                                    <span>2. Teil</span>
                                  </div>
                                ) : (
                                  <DroppableSlotCell
                                    week={week}
                                    slot={slotInfo.period}
                                    isDouble={slotInfo.isDouble}
                                    isOccupied={isOccupied}
                                    assignedLesson={assignedLesson}
                                    onRemoveAssignment={handleRemoveAssignment}
                                  />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Legend */}
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-purple-600"></div> = Doppelslot
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-slate-700"></div> = belegt
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-900/50 border border-blue-500"></div> = zugewiesen
                </span>
              </div>
            </div>
          </div>

          {/* DragOverlay mit Portal zum body - vermeidet Dialog Transform-Offset */}
          {createPortal(
            <DragOverlay>
              {activeLesson && (
                <div className="p-3 rounded-lg bg-slate-800 border-2 border-blue-500 shadow-xl z-[9999]">
                  <span className="text-white font-medium">
                    {activeLesson.lesson.name || `Lektion ${activeLesson.index + 1}`}
                  </span>
                  {activeLesson.lesson.is_double_lesson && (
                    <span className="ml-2 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                      2x
                    </span>
                  )}
                </div>
              )}
            </DragOverlay>,
            document.body
          )}
        </DndContext>

        <DialogFooter className="gap-2 pt-4 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleComplete}
            disabled={assignments.size === 0}
            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            <Check className="w-4 h-4 mr-2" />
            Bestaetigen ({assignments.size}/{sharedLessons.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
