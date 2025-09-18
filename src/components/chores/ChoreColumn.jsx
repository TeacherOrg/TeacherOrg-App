import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Edit, Users, Calendar } from 'lucide-react';

const StudentCard = ({ student }) => (
    <div className="p-2 mb-2 bg-gray-200 dark:bg-slate-700 rounded-lg text-gray-800 dark:text-white font-medium text-sm shadow-md">
        {student.name}
    </div>
);

export default function ChoreColumn({ chore, assignments, students, onEdit }) {
    const assignedStudents = assignments.map(a => students.find(s => s.id === a.student_id)).filter(Boolean);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl w-72 flex-shrink-0 flex flex-col p-4 shadow-lg border border-gray-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 dark:text-white text-lg">{chore.name}</h3>
                <Button variant="ghost" size="icon" onClick={onEdit} className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white h-8 w-8">
                    <Edit className="w-4 h-4" />
                </Button>
            </div>
            <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm mb-4">
                <Users className="w-4 h-4" />
                <span>{assignedStudents.length} / {chore.required_students} Schüler</span>
            </div>
            <Droppable droppableId={`chore-${chore.id}`}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-green-100/30 dark:bg-green-900/30' : 'bg-gray-100/50 dark:bg-slate-800/50'}`}
                    >
                        {assignedStudents.map((student, index) => (
                            <Draggable key={student.id} draggableId={student.id} index={index}>
                                {(provided) => (
                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                        <StudentCard student={student} />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}