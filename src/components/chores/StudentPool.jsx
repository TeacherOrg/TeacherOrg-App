import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';

const StudentCard = ({ student }) => (
    <div className="p-2 mb-2 bg-gray-200 dark:bg-slate-600 rounded-lg text-gray-800 dark:text-white font-medium text-sm shadow-md cursor-grab flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors">
        <GripVertical className="w-3 h-3 text-gray-400 dark:text-slate-400 flex-shrink-0" />
        <span className="truncate">{student.name}</span>
    </div>
);

export default function StudentPool({ students }) {
    return (
        <div className="bg-white/50 dark:bg-slate-800/50 rounded-2xl w-72 flex-shrink-0 flex flex-col p-4 shadow-inner border border-gray-200/50 dark:border-slate-700/50 max-h-[calc(100vh-200px)]">
            <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-1">Verfügbare Schüler</h3>
            {students.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                    Auf Ämtchen ziehen zum Zuweisen
                </p>
            )}
            <Droppable droppableId="student-pool">
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 rounded-lg transition-colors overflow-y-auto ${snapshot.isDraggingOver ? 'bg-blue-100/30 dark:bg-blue-900/30 ring-2 ring-blue-300/50' : ''}`}
                        style={{ maxHeight: 'calc(100vh - 280px)' }}
                    >
                        {students.length > 0 ? (
                            students.map((student, index) => (
                                <Draggable key={student.id} draggableId={student.id} index={index}>
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                            <StudentCard student={student} />
                                        </div>
                                    )}
                                </Draggable>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center text-gray-400 dark:text-slate-500 py-8">
                                <span className="text-2xl mb-2">✓</span>
                                <span className="text-sm font-medium">Alle zugewiesen</span>
                            </div>
                        )}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
            {students.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700 text-center">
                    <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">{students.length} Schüler</span>
                </div>
            )}
        </div>
    );
}