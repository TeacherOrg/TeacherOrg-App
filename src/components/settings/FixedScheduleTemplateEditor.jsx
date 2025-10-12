import React, { useState, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from 'lucide-react';

const DAYS = [
    { key: 'monday', label: 'Montag' },
    { key: 'tuesday', label: 'Dienstag' },
    { key: 'wednesday', label: 'Mittwoch' },
    { key: 'thursday', label: 'Donnerstag' },
    { key: 'friday', label: 'Freitag' },
];

export default function FixedScheduleTemplateEditor({ initialTemplate, onSave, classes, subjects, lessonsPerDay }) {
    const [template, setTemplate] = useState(initialTemplate || {});
    const [selectedClassId, setSelectedClassId] = useState(classes.length > 0 ? classes[0].id : '');

    useEffect(() => {
        setTemplate(initialTemplate || {});
    }, [initialTemplate]);

    useEffect(() => {
        onSave(template);
    }, [template, onSave]);

    const handleDragEnd = (result) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;

        // Handle dropping into the trash
        if (destination.droppableId === 'trash') {
            // If dragging from grid cell
            if (source.droppableId.includes('-')) {
                const [day, periodStr] = source.droppableId.split('-');
                const period = parseInt(periodStr, 10);
                
                setTemplate(prev => {
                    const newTemplate = { ...prev };
                    if (newTemplate[day]) {
                        newTemplate[day] = newTemplate[day].filter(item => item.period !== period);
                    }
                    return newTemplate;
                });
            }
            return;
        }

        // Handle dragging from the subject pool to the grid
        if (source.droppableId === 'subject-pool' && destination.droppableId.includes('-')) {
            const [day, periodStr] = destination.droppableId.split('-');
            const period = parseInt(periodStr, 10);
            const [subjectName, classId] = draggableId.split('_');

            setTemplate(prev => {
                const newTemplate = { ...prev };
                if (!newTemplate[day]) newTemplate[day] = [];
                
                // Remove any existing assignment in that slot
                newTemplate[day] = newTemplate[day].filter(item => item.period !== period);

                newTemplate[day].push({ period, subject: subjectName, class_id: classId });
                return newTemplate;
            });
        }

        // Handle moving assignments between grid cells
        if (source.droppableId.includes('-') && destination.droppableId.includes('-') && source.droppableId !== destination.droppableId) {
            const [sourceDay, sourcePeriodStr] = source.droppableId.split('-');
            const sourcePeriod = parseInt(sourcePeriodStr, 10);
            const [destDay, destPeriodStr] = destination.droppableId.split('-');
            const destPeriod = parseInt(destPeriodStr, 10);

            setTemplate(prev => {
                const newTemplate = { ...prev };
                
                // Find the assignment to move
                const sourceAssignment = newTemplate[sourceDay]?.find(item => item.period === sourcePeriod);
                if (!sourceAssignment) return prev;

                // Remove from source
                if (newTemplate[sourceDay]) {
                    newTemplate[sourceDay] = newTemplate[sourceDay].filter(item => item.period !== sourcePeriod);
                }

                // Add to destination (remove any existing assignment first)
                if (!newTemplate[destDay]) newTemplate[destDay] = [];
                newTemplate[destDay] = newTemplate[destDay].filter(item => item.period !== destPeriod);
                newTemplate[destDay].push({ period: destPeriod, subject: sourceAssignment.subject, class_id: sourceAssignment.class_id });

                return newTemplate;
            });
        }
    };
    
    const subjectsForClass = useMemo(() => {
        if (!selectedClassId) return [];
        return subjects.filter(s => s.class_id === selectedClassId);
    }, [selectedClassId, subjects]);

    const placedCounts = useMemo(() => {
        if (!selectedClassId) return {};
        const counts = {};
        subjectsForClass.forEach(s => {
            const key = `${s.name}_${s.class_id}`;
            counts[key] = 0;
        });

        Object.values(template).flat().forEach(assignment => {
            if (assignment.class_id === selectedClassId) {
                const key = `${assignment.subject}_${assignment.class_id}`;
                if (counts[key] !== undefined) {
                    counts[key]++;
                }
            }
        });
        return counts;
    }, [template, selectedClassId, subjectsForClass]);


    const timeSlots = Array.from({ length: lessonsPerDay }, (_, i) => i + 1);

    const getAssignment = (day, period) => {
        return template[day]?.find(item => item.period === period);
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-6">
                <div className="flex-grow">
                    <div className="grid grid-cols-6 gap-px bg-slate-700 border border-slate-700 rounded-lg overflow-hidden">
                        <div className="bg-slate-800 p-2 text-center font-semibold text-sm">Zeit</div>
                        {DAYS.map(day => (
                            <div key={day.key} className="bg-slate-800 p-2 text-center font-semibold text-sm">{day.label}</div>
                        ))}

                        {timeSlots.map(slot => (
                            <React.Fragment key={slot}>
                                <div className="bg-slate-800 p-2 text-center font-semibold text-sm flex items-center justify-center">{slot}. Stunde</div>
                                {DAYS.map(day => {
                                    const assignment = getAssignment(day.key, slot);
                                    const subjectInfo = assignment ? subjects.find(s => s.name === assignment.subject && s.class_id === assignment.class_id) : null;
                                    const droppableId = `${day.key}-${slot}`;
                                    
                                    return (
                                        <Droppable key={droppableId} droppableId={droppableId}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    className={`p-1 h-16 flex items-center justify-center text-center text-xs transition-colors ${
                                                        snapshot.isDraggingOver ? 'bg-blue-900/50' : 'bg-slate-800'
                                                    }`}
                                                >
                                                    {assignment ? (
                                                        <Draggable draggableId={`assignment-${droppableId}`} index={0}>
                                                          {(dragProvided, dragSnapshot) => (
                                                            <div
                                                                ref={dragProvided.innerRef}
                                                                {...dragProvided.draggableProps}
                                                                {...dragProvided.dragHandleProps}
                                                                className={`w-full h-full p-2 rounded-md text-white font-semibold shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform ${
                                                                    dragSnapshot.isDragging ? 'scale-105 rotate-2' : ''
                                                                }`}
                                                                style={{ 
                                                                    backgroundColor: subjectInfo?.color || '#374151',
                                                                    ...dragProvided.draggableProps.style 
                                                                }}
                                                            >
                                                                {assignment.subject}
                                                            </div>
                                                          )}
                                                        </Draggable>
                                                    ) : (
                                                        <div className="w-full h-full border-2 border-dashed border-slate-700 rounded-md flex items-center justify-center text-slate-500">
                                                            <span className="text-xs opacity-50">Fach hier ablegen</span>
                                                        </div>
                                                    )}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Right Panel - Subject Pool and Trash */}
                <div className="w-72 space-y-4">
                    {/* Class Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Klasse auswählen</label>
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                <SelectValue placeholder="Klasse auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map(cls => (
                                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Subject Pool */}
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                        <h3 className="text-sm font-semibold text-white mb-3">Fächer-Pool</h3>
                        <Droppable droppableId="subject-pool">
                            {(provided, snapshot) => (
                                <div 
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="space-y-2 h-96 overflow-y-auto"
                                >
                                    {subjectsForClass.map((subject, index) => {
                                        const key = `${subject.name}_${subject.class_id}`;
                                        const placedCount = placedCounts[key] || 0;
                                        const maxCount = subject.lessons_per_week || 4;
                                        const isMaxReached = placedCount >= maxCount;

                                        return (
                                            <Draggable
                                                key={key}
                                                draggableId={key}
                                                index={index}
                                                isDragDisabled={isMaxReached}
                                            >
                                                {(dragProvided, dragSnapshot) => (
                                                    <div
                                                        ref={dragProvided.innerRef}
                                                        {...dragProvided.draggableProps}
                                                        {...dragProvided.dragHandleProps}
                                                        className={`p-3 rounded-lg text-white text-sm font-medium shadow-md transition-all ${
                                                            dragSnapshot.isDragging ? 'scale-105 rotate-3' : ''
                                                        } ${
                                                            isMaxReached 
                                                                ? 'opacity-50 cursor-not-allowed bg-slate-700' 
                                                                : 'cursor-grab active:cursor-grabbing hover:scale-105'
                                                        }`}
                                                        style={{
                                                            backgroundColor: isMaxReached ? '#374151' : subject.color || '#374151',
                                                            ...dragProvided.draggableProps.style
                                                        }}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span>{subject.name}</span>
                                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                                isMaxReached 
                                                                    ? 'bg-red-900/50 text-red-300' 
                                                                    : 'bg-white/20 text-white'
                                                            }`}>
                                                                {placedCount}/{maxCount}
                                                            </span>
                                                        </div>
                                                        {isMaxReached && (
                                                            <div className="text-xs text-red-300 mt-1">
                                                                Limit erreicht
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </Draggable>
                                        );
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>

                    {/* Trash Area */}
                    <Droppable droppableId="trash">
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`bg-slate-800 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                                    snapshot.isDraggingOver 
                                        ? 'border-red-400 bg-red-900/20' 
                                        : 'border-slate-600'
                                }`}
                            >
                                <Trash2 className={`w-6 h-6 mx-auto mb-2 transition-colors ${
                                    snapshot.isDraggingOver ? 'text-red-400' : 'text-slate-400'
                                }`} />
                                <p className={`text-sm transition-colors ${
                                    snapshot.isDraggingOver ? 'text-red-400' : 'text-slate-400'
                                }`}>
                                    Hier ablegen zum Entfernen
                                </p>
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>
            </div>
        </DragDropContext>
    );
}