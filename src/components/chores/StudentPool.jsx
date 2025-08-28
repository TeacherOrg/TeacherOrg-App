// src/components/chores/StudentPool.jsx
import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';

const StudentCard = ({ student }) => (
    <div className="p-2 mb-2 bg-gray-200 dark:bg-slate-600 rounded-lg text-gray-800 dark:text-white font-medium text-sm shadow-md cursor-grab">
        {student.name}
    </div>
);

export default function StudentPool({ students }) {
    return (
        <div className="bg-white/50 dark:bg-slate-800/50 rounded-2xl w-72 flex-shrink-0 flex flex-col p-4 shadow-inner border border-gray-200/50 dark:border-slate-700/50">
            <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-4">Verfügbare Schüler ({students.length})</h3>
            <Droppable droppableId="student-pool">
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 rounded-lg transition-colors overflow-y-auto ${snapshot.isDraggingOver ? 'bg-blue-100/20 dark:bg-blue-900/20' : ''}`}
                    >
                        {students.map((student, index) => (
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