import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Edit, Users, Calendar } from 'lucide-react';

const StudentChip = ({ student, choreId, onExtendAssignment }) => (
  <div
    className="inline-block m-1 px-2 py-1 bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white text-sm rounded-full cursor-pointer hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors text-center"
    onClick={() => onExtendAssignment && onExtendAssignment(student, choreId)}
    title="Klicken für mehrwöchige Zuweisung"
  >
    {student.student_name || student.name || 'Unknown Student'}
  </div>
);

const WeeklyStudentChip = ({ student }) => (
  <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-sm rounded-full border border-blue-200 dark:border-blue-800">
    <span>{student.name}</span>
    <Calendar className="w-3 h-3 opacity-70" />
  </div>
);

const TableCell = ({
  chore,
  dayInfo,
  assignments,
  students,
  onExtendAssignment,
  isFirstCell
}) => {
    const isChoreActiveOnDay = 
        chore.frequency === 'daily' || 
        chore.frequency === 'on-demand' ||
        chore.frequency === 'bi-weekly' ||
        chore.frequency === 'monthly' ||
        (chore.frequency === 'weekly' && chore.days_of_week?.includes(dayInfo.dayKey));

    const cellAssignments = useMemo(() => assignments.filter(a => 
        a.chore_id === chore.id && a.assignment_date === dayInfo.dateString
    ), [assignments, chore.id, dayInfo.dateString]);

    const assignedStudents = useMemo(() => cellAssignments.map(a => {
        const student = students.find(s => s.id === a.student_id);
        return {
            ...student,
            student_name: a.student_name || student?.name || 'Unknown Student'
        };
    }).filter(Boolean), [cellAssignments, students]);

    const droppableId = `chore-${chore.id}-${dayInfo.dayKey}`;

    if (!isChoreActiveOnDay) {
        return (
            <td className={`p-2 bg-gray-100/30 dark:bg-slate-800/30 text-center ${
                !isFirstCell ? 'border-l border-gray-200 dark:border-slate-700' : ''
            }`}>
                <span className="text-gray-500 dark:text-slate-500 text-sm">-</span>
            </td>
        );
    }

    return (
        <td className={`p-1 bg-gray-100 dark:bg-slate-800 min-w-[140px] ${
            !isFirstCell ? 'border-l border-gray-200 dark:border-slate-700' : ''
        }`}>
            <Droppable droppableId={droppableId}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`h-[120px] p-2 rounded transition-colors flex flex-wrap justify-center content-start overflow-hidden ${snapshot.isDraggingOver ? 'bg-green-100/30 dark:bg-green-900/30 ring-2 ring-green-300/50' : ''} ${assignedStudents.length >= (chore.required_students || 1) ? 'bg-green-100/20 dark:bg-green-900/20' : ''}`}
                    >
                        {assignedStudents.map((student, index) => (
                            <Draggable key={`${student.id}-${chore.id}-${dayInfo.dayKey}`} draggableId={student.id} index={index}>
                                {(dragProvided) => (
                                    <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                                        <StudentChip
                                            student={student}
                                            choreId={chore.id}
                                            onExtendAssignment={onExtendAssignment}
                                        />
                                    </div>
                                )}
                            </Draggable>
                        ))}

                        {assignedStudents.length < (chore.required_students || 1) && (
                            <div className="text-gray-500 dark:text-slate-400 text-xs mt-1 w-full text-center">
                                {assignedStudents.length}/{chore.required_students || 1}
                            </div>
                        )}

                        <div style={{ display: 'none' }}>{provided.placeholder}</div>
                    </div>
                )}
            </Droppable>
        </td>
    );
};

const ChoreNameCell = ({ 
  chore, 
  assignments, 
  students, 
  weekDates, 
  onEditChore 
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
  const requiredStudents = chore.required_students || 1;
  const isFull = weeklyAssignedStudents.length >= requiredStudents;
  
  const displayName = useMemo(() => {
    if (chore.name && chore.name.trim()) return chore.name.trim();
    return 'Neues Ämtchen';
  }, [chore.name]);

  return (
    <td className="p-3 bg-gradient-to-b from-gray-50/90 to-white dark:from-slate-800/90 dark:to-slate-900 min-w-[320px] max-w-[320px] relative group">
      <Droppable droppableId={droppableId} isDropDisabled={isFull}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              rounded-lg p-3 h-full flex flex-col transition-all duration-200 group-hover:shadow-md
              ${
                snapshot.isDraggingOver 
                  ? 'bg-blue-50/80 dark:bg-blue-900/20 ring-2 ring-blue-300/50 shadow-lg border-2 border-dashed border-blue-300 dark:border-blue-600' 
                  : isFull 
                    ? 'bg-green-50/50 dark:bg-green-900/20 ring-1 ring-green-200/50' 
                    : 'hover:bg-gray-50/50 dark:hover:bg-slate-800/30'
              }
              ${
                isFull ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
              }
            `}
          >
            {/* Header mit Icon und Name */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div className={`
                  w-10 h-10 rounded-md flex items-center justify-center shadow-sm border
                  ${chore.icon 
                    ? 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 border-blue-200 dark:border-blue-700' 
                    : 'bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600'
                  }
                `}>
                  {chore.icon ? (
                    <span className="text-2xl">{chore.icon}</span>
                  ) : (
                    <Users className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className={`font-bold text-gray-900 dark:text-white text-base leading-tight break-words max-w-full ${
                    displayName.length > 25 ? 'text-sm leading-tight' : ''
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
                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-200"
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>

            {/* Wochenzuweisungen mit Animation */}
            <div className="flex-1 min-h-[80px] max-h-[120px] flex flex-col justify-center overflow-hidden">
              {weeklyAssignedStudents.length > 0 ? (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {weeklyAssignedStudents.map((student, index) => (
                    <motion.div
                      key={`${student.id}-weekly-${chore.id}`}
                      initial={{ opacity: 0, x: -20, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 20, scale: 0.9 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <Draggable
                        draggableId={`${student.id}-weekly-${chore.id}`}
                        index={index}
                      >
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className="flex items-center justify-between"
                          >
                            <WeeklyStudentChip student={student} />
                          </div>
                        )}
                      </Draggable>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-gray-400 dark:text-slate-500 py-3">
                  <Calendar className="w-6 h-6 mb-1 opacity-50" />
                  <span className="text-xs font-medium">Keine Wochenzuweisung</span>
                  {snapshot.isDraggingOver && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1"
                    >
                      <Calendar className="w-3 h-3" />
                      Ganze Woche zuweisen
                    </motion.div>
                  )}
                </div>
              )}

              <div style={{ display: 'none' }}>{provided.placeholder}</div>
            </div>

            {/* Footer mit korrigierter Schülerzählung */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                <Users className="w-4 h-4" />
                <span className="font-medium">
                  {weeklyAssignedStudents.length}/{requiredStudents}
                </span>
              </div>
              
              {isFull && (
                <div className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 text-xs rounded-full font-medium">
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

export default function ChoresWeekTable({ chores, weekDates, assignments, students, onEditChore, onExtendAssignment }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-auto max-h-[calc(100vh-200px)]">
            <table className="w-full table-fixed border-collapse border-spacing-0">
                <thead>
                    <tr className="bg-gray-100 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600 sticky top-0 z-10">
                        <th className="p-4 text-center text-gray-800 dark:text-white font-semibold min-w-[320px] max-w-[320px] bg-gray-100 dark:bg-slate-700">
                            <div className="flex flex-col items-center gap-1">
                                <span>Ämtchen</span>
                                <span className="text-xs text-gray-500 dark:text-slate-300 font-normal">
                                    (Drag hier = ganze Woche)
                                </span>
                            </div>
                        </th>
                        {weekDates.map((dayInfo, index) => (
                            <th key={dayInfo.dayKey} className={`p-4 text-center text-gray-800 dark:text-white font-semibold min-w-[140px] bg-gray-100 dark:bg-slate-700 ${
                                index === 0 ? '' : 'border-l border-gray-200 dark:border-slate-600'
                            }`}>
                                <div className="flex flex-col">
                                    <span className="text-sm">{dayInfo.dayName}</span>
                                    <span className="text-xs text-gray-500 dark:text-slate-300">{dayInfo.date.getDate()}.{dayInfo.date.getMonth() + 1}.</span>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {chores.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-slate-400">
                                Keine Ämtchen für diese Klasse definiert. Klicken Sie auf "Neues Ämtchen", um zu beginnen.
                            </td>
                        </tr>
                    ) : (
                        chores.map((chore, rowIndex) => (
                            <tr key={chore.id} className={rowIndex < chores.length - 1 ? 'border-b border-gray-200 dark:border-slate-700' : ''}>
                                <ChoreNameCell 
                                    chore={chore} 
                                    assignments={assignments}
                                    students={students}
                                    weekDates={weekDates}
                                    onEditChore={onEditChore}
                                />
                                {weekDates.map((dayInfo, index) => (
                                    <TableCell
                                        key={`${chore.id}-${dayInfo.dayKey}`}
                                        chore={chore}
                                        dayInfo={dayInfo}
                                        assignments={assignments}
                                        students={students}
                                        onExtendAssignment={onExtendAssignment}
                                        isFirstCell={index === 0}
                                    />
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}