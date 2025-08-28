// src/components/chores/ChoresWeekTable.jsx
import React, { useMemo } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Edit, Users, Calendar } from 'lucide-react';

const StudentChip = ({ student, choreId, dayKey, onExtendAssignment }) => (
    <div 
        className="inline-block m-1 px-2 py-1 bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white text-xs rounded-full cursor-pointer hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
        onClick={() => onExtendAssignment && onExtendAssignment(student, choreId, dayKey)}
        title="Klicken für mehrwöchige Zuweisung"
    >
        {student.firstName || student.name}
    </div>
);

const TableCell = ({ chore, dayInfo, assignments, students, onEditChore, onExtendAssignment }) => {
    const isChoreActiveOnDay = 
        chore.frequency === 'daily' || 
        (chore.frequency === 'weekly' && chore.days_of_week?.includes(dayInfo.dayKey)) ||
        chore.frequency === 'on-demand';

    const cellAssignments = useMemo(() => assignments.filter(a => 
        a.chore_id === chore.id && a.assignment_date === dayInfo.dateString
    ), [assignments, chore.id, dayInfo.dateString]);

    const assignedStudents = useMemo(() => cellAssignments.map(a => 
        students.find(s => s.id === a.student_id)
    ).filter(Boolean), [cellAssignments, students]);

    const droppableId = `chore-${chore.id}-${dayInfo.dayKey}`;

    if (!isChoreActiveOnDay) {
        return (
            <td className="p-2 bg-gray-100/30 dark:bg-slate-800/30 border border-gray-200 dark:border-slate-700 text-center">
                <span className="text-gray-500 dark:text-slate-500 text-sm">-</span>
            </td>
        );
    }

    return (
        <td className="p-1 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 min-w-[120px]">
            <Droppable droppableId={droppableId}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[60px] p-2 rounded transition-colors ${snapshot.isDraggingOver ? 'bg-green-100/30 dark:bg-green-900/30' : ''} ${assignedStudents.length >= chore.required_students ? 'bg-green-100/20 dark:bg-green-900/20' : ''}`}
                    >
                        {assignedStudents.map((student, index) => (
                            <Draggable key={`${student.id}-${chore.id}-${dayInfo.dayKey}`} draggableId={student.id} index={index}>
                                {(dragProvided) => (
                                    <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                                        <StudentChip 
                                            student={student} 
                                            choreId={chore.id} 
                                            dayKey={dayInfo.dayKey}
                                            onExtendAssignment={onExtendAssignment}
                                        />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        
                        {assignedStudents.length < chore.required_students && (
                            <div className="text-gray-500 dark:text-slate-400 text-xs mt-1">
                                {assignedStudents.length}/{chore.required_students}
                            </div>
                        )}
                        
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </td>
    );
};

const ChoreNameCell = ({ chore, onEditChore, onWeekAssignment }) => (
    <td className="p-4 bg-gray-100 dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 min-w-[200px]">
        <Droppable droppableId={`chore-week-${chore.id}`}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex items-center justify-between transition-colors rounded p-2 ${
                        snapshot.isDraggingOver ? 'bg-blue-100/20 dark:bg-blue-900/20 border border-blue-400/50' : ''
                    }`}
                >
                    <div className="flex-1">
                        <div className="font-semibold text-gray-800 dark:text-white text-sm flex items-center gap-3">
                            {chore.icon && <span className="text-xl">{chore.icon}</span>}
                            <span>{chore.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs mt-1">
                            <Users className="w-3 h-3" />
                            <span>{chore.required_students} Schüler</span>
                            <span>•</span>
                            <span className="capitalize">{chore.frequency}</span>
                        </div>
                        {chore.description && (
                            <div className="text-gray-500 dark:text-slate-400 text-xs mt-1">{chore.description}</div>
                        )}
                        {snapshot.isDraggingOver && (
                            <div className="text-blue-600 dark:text-blue-400 text-xs mt-2 font-semibold">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Ganze Woche zuweisen
                            </div>
                        )}
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onEditChore(chore)}
                        className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white h-8 w-8 flex-shrink-0"
                    >
                        <Edit className="w-3 h-3" />
                    </Button>
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    </td>
);

export default function ChoresWeekTable({ chores, weekDates, assignments, students, onEditChore, onExtendAssignment }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-slate-700">
                            <th className="p-4 text-center text-gray-800 dark:text-white font-semibold border-r border-gray-200 dark:border-slate-600 min-w-[200px]">
                                <div className="flex flex-col items-center gap-1">
                                    <span>Ämtchen</span>
                                    <span className="text-xs text-gray-500 dark:text-slate-300 font-normal">
                                        (Drag hier = ganze Woche)
                                    </span>
                                </div>
                            </th>
                            {weekDates.map(dayInfo => (
                                <th key={dayInfo.dayKey} className="p-4 text-center text-gray-800 dark:text-white font-semibold border-r border-gray-200 dark:border-slate-600 min-w-[120px]">
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
                            chores.map(chore => (
                                <tr key={chore.id} className="border-b border-gray-200 dark:border-slate-700">
                                    <ChoreNameCell 
                                        chore={chore} 
                                        onEditChore={onEditChore}
                                    />
                                    {weekDates.map(dayInfo => (
                                        <TableCell 
                                            key={`${chore.id}-${dayInfo.dayKey}`}
                                            chore={chore}
                                            dayInfo={dayInfo}
                                            assignments={assignments}
                                            students={students}
                                            onEditChore={onEditChore}
                                            onExtendAssignment={onExtendAssignment}
                                        />
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}