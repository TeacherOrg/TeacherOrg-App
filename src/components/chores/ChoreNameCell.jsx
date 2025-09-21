import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Edit, Users, Calendar, Plus } from 'lucide-react';

const StudentChip = ({ student }) => (
  <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs rounded-full border border-blue-200 dark:border-blue-800">
    <span>{student.name}</span>
    <Calendar className="w-3 h-3 opacity-70" />
  </div>
);

const ChoreNameCell = ({ 
  chore, 
  assignments, 
  students, 
  weekDates, 
  onEditChore, 
  onExtendAssignment 
}) => {
  // Finde alle Schüler, die für diese Woche zu diesem Ämtchen zugewiesen sind
  const weeklyAssignedStudents = useMemo(() => {
    const weekDateStrings = weekDates.map(d => d.dateString);
    const weeklyAssignments = assignments.filter(a => 
      a.chore_id === chore.id && 
      weekDateStrings.includes(a.assignment_date)
    );
    
    // Entferne Duplikate (Schüler, die an mehreren Tagen zugewiesen sind)
    const uniqueStudentIds = [...new Set(weeklyAssignments.map(a => a.student_id))];
    return uniqueStudentIds.map(studentId => 
      students.find(s => s.id === studentId)
    ).filter(Boolean);
  }, [assignments, chore.id, students, weekDates]);

  const droppableId = `chore-week-${chore.id}`;
  const isFull = weeklyAssignedStudents.length >= chore.required_students;
  
  const displayName = useMemo(() => {
    if (chore.name && chore.name.trim()) return chore.name.trim();
    return 'Neues Ämtchen';
  }, [chore.name]);

  return (
    <td className="p-3 bg-gradient-to-b from-gray-50/70 to-white dark:from-slate-800/70 dark:to-slate-900 min-w-[420px] max-w-[420px] relative">
      <Droppable droppableId={droppableId} isDropDisabled={isFull}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              rounded-lg p-3 h-full flex flex-col transition-all duration-200
              ${
                snapshot.isDraggingOver 
                  ? 'bg-blue-50/80 dark:bg-blue-900/20 ring-2 ring-blue-300/50 shadow-lg border-2 border-dashed border-blue-300 dark:border-blue-600' 
                  : isFull 
                    ? 'bg-green-50/50 dark:bg-green-900/20 ring-1 ring-green-200/50' 
                    : 'hover:bg-gray-50/50 dark:hover:bg-slate-800/30 border-2 border-dashed border-gray-200/50 dark:border-slate-700/50'
              }
              ${
                isFull ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
              }
            `}
          >
            {/* Header mit Icon und Name */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1">
                {chore.icon && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center shadow-sm border">
                    <span className="text-lg">{chore.icon}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold text-gray-800 dark:text-white text-sm leading-tight break-words max-w-full ${
                    displayName.length > 25 ? 'text-sm leading-tight' : 'text-base'
                  }`}>
                    {displayName}
                  </h4>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onEditChore(chore);
                }}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-200"
              >
                <Edit className="w-3 h-3" />
              </Button>
            </div>

            {/* Wochenzuweisungen */}
            <div className="flex-1 min-h-[80px] flex flex-col justify-center">
              {weeklyAssignedStudents.length > 0 ? (
                <div className="space-y-1">
                  {weeklyAssignedStudents.map((student, index) => (
                    <Draggable 
                      key={`${student.id}-weekly`} 
                      draggableId={`${student.id}-weekly`} 
                      index={index}
                      isDragDisabled={true} // Wochenzuweisungen sind nicht dragbar
                    >
                      {(dragProvided) => (
                        <div 
                          ref={dragProvided.innerRef} 
                          {...dragProvided.draggableProps} 
                          {...dragProvided.dragHandleProps}
                          className="flex items-center justify-between"
                        >
                          <StudentChip student={student} />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onExtendAssignment?.(student, chore.id, 'week');
                            }}
                            className="h-6 w-6 p-0 text-blue-500 hover:text-blue-600"
                            title="Mehrwöchig erweitern"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-gray-400 dark:text-slate-500 py-2">
                  <Calendar className="w-6 h-6 mb-1 opacity-50" />
                  <span className="text-xs">Keine Wochenzuweisung</span>
                  {snapshot.isDraggingOver && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mt-2 text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Hier für ganze Woche zuweisen
                    </motion.div>
                  )}
                </div>
              )}

              {/* Drop Indikator */}
              {!isFull && !snapshot.isDraggingOver && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 rounded-full bg-blue-100/30 dark:bg-blue-900/20 border-2 border-dashed border-blue-300/50 dark:border-blue-600/50 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-blue-400 dark:text-blue-500" />
                  </div>
                </div>
              )}

              {provided.placeholder}
            </div>

            {/* Footer mit Info */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                <Users className="w-3 h-3" />
                <span>
                  {weeklyAssignedStudents.length}/{chore.required_students} für Woche
                </span>
              </div>
              
              {isFull && (
                <div className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 text-xs rounded-full">
                  Voll
                </div>
              )}
            </div>
          </div>
        )}
      </Droppable>
    </td>
  );
};

export default ChoreNameCell;