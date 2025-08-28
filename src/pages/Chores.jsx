// src/pages/Chores.jsx (Ämtliplan main component)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Class, Student, Chore, ChoreAssignment } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, Users, ClipboardList, Zap } from 'lucide-react';
import { motion } from "framer-motion";
import { DragDropContext } from "@hello-pangea/dnd";
import CalendarLoader from '../components/ui/CalendarLoader';
import StudentPool from '../components/chores/StudentPool';
import ChoreModal from '../components/chores/ChoreModal';
import ChoresWeekTable from '../components/chores/ChoresWeekTable';
import ExtendAssignmentModal from '../components/chores/ExtendAssignmentModal';

// Helper function to get Monday of current week
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
}

// Helper function to get week dates
function getWeekDates(weekStart) {
    const dates = [];
    const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    for (let i = 0; i < 5; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        dates.push({
            date,
            dayName: dayNames[i],
            dayKey: dayKeys[i],
            dateString: date.toISOString().split('T')[0]
        });
    }
    return dates;
}

export default function Chores() {
    const [isLoading, setIsLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [chores, setChores] = useState([]);
    const [assignments, setAssignments] = useState([]);

    const [activeClassId, setActiveClassId] = useState(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));

    const [isChoreModalOpen, setIsChoreModalOpen] = useState(false);
    const [editingChore, setEditingChore] = useState(null);

    // NEW: State for extend assignment modal
    const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
    const [extendingStudent, setExtendingStudent] = useState(null);
    const [extendingChore, setExtendingChore] = useState(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [classesData, studentsData, choresData, assignmentsData] = await Promise.all([
                Class.list(), Student.list(), Chore.list(), ChoreAssignment.list()
            ]);
            setClasses(classesData || []);
            setStudents(studentsData || []);
            setChores(choresData || []);
            setAssignments(assignmentsData || []);

            if (classesData?.length > 0 && !activeClassId) {
                setActiveClassId(classesData[0].id);  // Automatisch erste Klasse wählen
            } else if (classesData?.length === 0) {
                alert("Keine Klassen vorhanden. Erstellen Sie zuerst eine Klasse in den Einstellungen.");
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [activeClassId]);

    useEffect(() => {
        loadData();
    }, []);

    const studentsInClass = useMemo(() => students.filter(s => s.class_id === activeClassId), [students, activeClassId]);
        const choresInClass = useMemo(() => {
        const filtered = chores.filter(c => c.class_id === activeClassId);
        console.log('Active Class ID:', activeClassId);
        console.log('All Chores:', chores);
        console.log('Filtered Chores in Class:', filtered);
        return filtered;
    }, [chores, activeClassId]);
    const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);
    const weekDateStrings = useMemo(() => weekDates.map(d => d.dateString), [weekDates]);

    const assignmentsForWeek = useMemo(() => {
        return assignments.filter(a => 
            weekDateStrings.includes(a.assignment_date) && 
            a.class_id === activeClassId
        );
    }, [assignments, weekDateStrings, activeClassId]);

    const assignedStudentIds = useMemo(() => new Set(assignmentsForWeek.map(a => a.student_id)), [assignmentsForWeek]);
    const unassignedStudents = useMemo(() => studentsInClass.filter(s => !assignedStudentIds.has(s.id)), [studentsInClass, assignedStudentIds]);

    const handleWeekChange = (direction) => {
        setCurrentWeekStart(prevWeek => {
            const newWeek = new Date(prevWeek);
            newWeek.setDate(newWeek.getDate() + (direction * 7));
            return newWeek;
        });
    };

    const handleDragEnd = async (result) => {
    const { source, destination, draggableId: studentId } = result;
    if (!destination) return;

    const destinationId = destination.droppableId;

    if (destinationId.startsWith('chore-week-')) {
        await handleWeekAssignment(studentId, destinationId);
    } else if (destinationId.startsWith('chore-') && ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].some(day => destinationId.includes(`-${day}`))) {
        await handleSingleDayAssignment(studentId, destinationId);
    } else if (destination.droppableId === 'student-pool' && source.droppableId.startsWith('chore-')) {
        await handleUnassignment(studentId, source.droppableId);
    }
    };

    const handleWeekAssignment = async (studentId, destinationId) => {
    const choreId = destinationId.replace('chore-week-', '');
    const chore = chores.find(c => c.id === choreId);
    if (!chore) return;

    const activeDays = weekDates.filter(dayInfo => 
        chore.frequency === 'daily' || 
        (chore.frequency === 'weekly' && chore.days_of_week?.includes(dayInfo.dayKey)) ||
        chore.frequency === 'on-demand'
    );

    for (const dayInfo of activeDays) {
        const existingAssignmentsForDay = assignmentsForWeek.filter(a => 
        a.chore_id === choreId && a.assignment_date === dayInfo.dateString
        );

        if (existingAssignmentsForDay.some(a => a.student_id === studentId)) {
        alert(`Der Schüler ist am ${dayInfo.dayName} bereits für das Ämtchen "${chore.name}" zugewiesen.`);
        return;
        }

        if (existingAssignmentsForDay.length >= chore.required_students) {
        alert(`Das Ämtchen "${chore.name}" benötigt am ${dayInfo.dayName} nur ${chore.required_students} Schüler.`);
        return;
        }
    }

    const newAssignments = activeDays.map(dayInfo => ({
        student_id: studentId,
        chore_id: choreId,
        class_id: activeClassId,
        assignment_date: dayInfo.dateString,
        status: 'assigned',
    }));

    try {
        if (newAssignments.length > 0) {
        const createdAssignments = await ChoreAssignment.bulkCreate(newAssignments);
        setAssignments(prev => [...prev, ...createdAssignments]);
        }
    } catch (error) {
        console.error("Failed to create week assignments:", error);
        alert("Fehler beim Zuweisen des Ämtchens für die ganze Woche.");
    }
    };

    const handleSingleDayAssignment = async (studentId, destinationId) => {
    const parts = destinationId.split('-');
    const choreId = parts[1];
    const dayKey = parts[2];
    const dayInfo = weekDates.find(d => d.dayKey === dayKey);
    if (!dayInfo) return;

    const chore = chores.find(c => c.id === choreId);
    if (!chore) return;

    const isChoreActiveOnDay = 
        chore.frequency === 'daily' || 
        (chore.frequency === 'weekly' && chore.days_of_week?.includes(dayKey)) ||
        chore.frequency === 'on-demand';

    if (!isChoreActiveOnDay) {
        alert(`Das Ämtchen "${chore.name}" ist am ${dayInfo.dayName} nicht aktiv.`);
        return;
    }

    const existingAssignments = assignmentsForWeek.filter(a => 
        a.chore_id === choreId && a.assignment_date === dayInfo.dateString
    );

    if (existingAssignments.some(a => a.student_id === studentId)) {
        return; // Already assigned
    }

    if (existingAssignments.length >= chore.required_students) {
        alert(`Das Ämtchen "${chore.name}" benötigt nur ${chore.required_students} Schüler.`);
        return;
    }

    const newAssignment = {
        student_id: studentId,
        chore_id: choreId,
        class_id: activeClassId,
        assignment_date: dayInfo.dateString,
        status: 'assigned',
    };

    try {
        const created = await ChoreAssignment.create(newAssignment);
        setAssignments(prev => [...prev, created]);
    } catch (error) {
        console.error("Failed to create assignment:", error);
        alert("Fehler beim Zuweisen des Ämtchens.");
    }
    };

const handleUnassignment = async (studentId, sourceId) => {
  const sourceParts = sourceId.split('-');
  let assignmentsToDelete = [];

  if (sourceParts[1] === 'week') {
    const choreId = sourceParts[2];
    assignmentsToDelete = assignmentsForWeek.filter(a => 
      a.student_id === studentId && a.chore_id === choreId
    );
  } else {
    const choreId = sourceParts[1];
    const dayKey = sourceParts[2];
    const dayInfo = weekDates.find(d => d.dayKey === dayKey);
    if (!dayInfo) return;

    assignmentsToDelete = assignmentsForWeek.filter(a => 
      a.student_id === studentId && 
      a.chore_id === choreId && 
      a.assignment_date === dayInfo.dateString
    );
  }

  if (assignmentsToDelete.length > 0) {
    try {
      await Promise.all(assignmentsToDelete.map(a => ChoreAssignment.delete(a.id)));
      setAssignments(prev => prev.filter(a => !assignmentsToDelete.some(deletedA => deletedA.id === a.id)));
    } catch (error) {
      console.error("Failed to delete assignment:", error);
      alert("Fehler beim Entfernen der Zuweisung.");
    }
  }
};

    const handleRandomAssign = async () => {
        if (!window.confirm("Möchten Sie alle Ämtchen für diese Woche zufällig zuweisen? Bestehende Zuweisungen werden überschrieben.")) {
            return;
        }

        try {
            // First, delete existing assignments for this week for the active class
            const assignmentsToDeleteInClass = assignmentsForWeek.filter(a => a.class_id === activeClassId);
            if (assignmentsToDeleteInClass.length > 0) {
                await Promise.all(assignmentsToDeleteInClass.map(a => ChoreAssignment.delete(a.id)));
            }

            const newAssignments = [];
            
            // For each day of the week
            for (const dayInfo of weekDates) {
                const availableStudents = [...studentsInClass]; // Shallow copy to modify for the day
                
                // Get active chores for this day
                const activeChores = choresInClass.filter(chore => {
                    return chore.frequency === 'daily' || 
                           (chore.frequency === 'weekly' && chore.days_of_week?.includes(dayInfo.dayKey));
                });

                // Assign students to chores
                for (const chore of activeChores) {
                    const studentsNeeded = chore.required_students;
                    
                    for (let i = 0; i < studentsNeeded && availableStudents.length > 0; i++) {
                        const randomIndex = Math.floor(Math.random() * availableStudents.length);
                        const selectedStudent = availableStudents.splice(randomIndex, 1)[0];
                        
                        newAssignments.push({
                            student_id: selectedStudent.id,
                            chore_id: chore.id,
                            class_id: activeClassId,
                            assignment_date: dayInfo.dateString,
                            status: 'assigned'
                        });
                    }
                }
            }

            // Create all new assignments
            if (newAssignments.length > 0) {
                const createdAssignments = await ChoreAssignment.bulkCreate(newAssignments);
                setAssignments(prev => {
                    // Filter out old assignments for the current week and active class, then add new ones
                    const filtered = prev.filter(a => 
                        !(weekDateStrings.includes(a.assignment_date) && a.class_id === activeClassId)
                    );
                    return [...filtered, ...createdAssignments];
                });
            } else {
                // If no new assignments were created (e.g., no active chores), just clear for the week
                setAssignments(prev => prev.filter(a => 
                    !(weekDateStrings.includes(a.assignment_date) && a.class_id === activeClassId)
                ));
            }

        } catch (error) {
            console.error("Error with random assignment:", error);
            alert("Fehler bei der zufälligen Zuweisung. Bitte versuchen Sie es erneut.");
            loadData(); // Reload to get consistent state
        }
    };
    
    const handleSaveChore = async (choreData) => {
        if (!activeClassId) {
            alert("Bitte wählen Sie zuerst eine Klasse aus, um ein Ämtchen hinzuzufügen.");
            return;
        }
        try {
            if (editingChore) {
                await Chore.update(editingChore.id, choreData);
            } else {
                await Chore.create({ ...choreData, class_id: activeClassId });
            }
            loadData();
            setIsChoreModalOpen(false);
            setEditingChore(null);
        } catch (error) {
            console.error("Error saving chore:", error);
            alert("Fehler beim Speichern des Ämtchens.");
        }
    };

    const handleDeleteChore = async (choreId) => {
        if (window.confirm("Möchten Sie dieses Ämtchen wirklich löschen? Alle zugehörigen Zuweisungen werden ebenfalls entfernt.")) {
            try {
                const assignmentsToDelete = assignments.filter(a => a.chore_id === choreId);
                await Promise.all(assignmentsToDelete.map(a => ChoreAssignment.delete(a.id)));
                await Chore.delete(choreId);
                loadData();
                setIsChoreModalOpen(false);
            } catch (error) {
                console.error("Error deleting chore:", error);
                alert("Fehler beim Löschen des Ämtchens.");
            }
        }
    };

    // NEW: Handle extend assignment
    const handleExtendAssignment = useCallback((student, choreId, dayKey) => {
        const chore = chores.find(c => c.id === choreId);
        if (!student || !chore) return;
        
        setExtendingStudent(student);
        setExtendingChore(chore);
        setIsExtendModalOpen(true);
    }, [chores]);

    // NEW: Confirm extend assignment
    const handleConfirmExtend = async (weeksToExtend) => {
        if (!extendingStudent || !extendingChore) return;
        
        try {
            const newAssignments = [];
            
            // Create assignments for the specified number of weeks (starting from the *next* week)
            for (let weekOffset = 1; weekOffset <= weeksToExtend; weekOffset++) {
                const futureWeekStart = new Date(currentWeekStart);
                futureWeekStart.setDate(futureWeekStart.getDate() + (weekOffset * 7));
                const futureWeekDates = getWeekDates(futureWeekStart);
                
                // Get active days for this chore in the future week
                const activeDays = futureWeekDates.filter(dayInfo => {
                    return extendingChore.frequency === 'daily' || 
                           (extendingChore.frequency === 'weekly' && extendingChore.days_of_week?.includes(dayInfo.dayKey)) ||
                           extendingChore.frequency === 'on-demand';
                });
                
                // Create assignments for all active days of this chore in the current future week
                for (const dayInfo of activeDays) {
                    // Check if an assignment for this student, chore, and date already exists
                    const exists = assignments.some(a => 
                        a.student_id === extendingStudent.id &&
                        a.chore_id === extendingChore.id &&
                        a.assignment_date === dayInfo.dateString
                    );

                    // Check if capacity is already reached for this specific day
                    const existingAssignmentsForDay = assignments.filter(a => 
                        a.chore_id === extendingChore.id && 
                        a.assignment_date === dayInfo.dateString
                    );
                    const isCapacityFull = existingAssignmentsForDay.length >= extendingChore.required_students;

                    if (!exists && !isCapacityFull) {
                        newAssignments.push({
                            student_id: extendingStudent.id,
                            chore_id: extendingChore.id,
                            class_id: activeClassId,
                            assignment_date: dayInfo.dateString,
                            status: 'assigned'
                        });
                    }
                }
            }
            
            if (newAssignments.length > 0) {
                const createdAssignments = await ChoreAssignment.bulkCreate(newAssignments);
                setAssignments(prev => [...prev, ...createdAssignments]);
            }
            
            setIsExtendModalOpen(false);
            setExtendingStudent(null);
            setExtendingChore(null);
        } catch (error) {
            console.error("Failed to extend assignment:", error);
            alert("Fehler bei der Erweiterung der Zuweisung.");
        }
    };

    const weekEndDate = new Date(currentWeekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 4); // Friday

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6 flex flex-col transition-colors duration-300">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-200 dark:from-teal-600 to-gray-50 dark:to-cyan-800 rounded-2xl flex items-center justify-center shadow-lg">
                        <ClipboardList className="w-6 h-6 text-gray-800 dark:text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Ämtliplan</h1>
                        <p className="text-gray-500 dark:text-slate-400 text-base font-medium">Ämtchen verwalten und Schülern zuweisen.</p>
                    </div>
                </div>
            </motion.div>

            {/* Controls */}
            <div className="flex flex-wrap gap-4 items-center mb-6">
                <Select value={activeClassId || ''} onValueChange={setActiveClassId} disabled={isLoading || classes.length === 0}>
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 rounded-xl text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-400 w-48">
                        <SelectValue placeholder="Klasse wählen" />
                    </SelectTrigger>
                    <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-2">
                    <Button variant="ghost" size="icon" onClick={() => handleWeekChange(-1)}>
                        <ChevronLeft className="w-4 h-4 text-gray-800 dark:text-white" />
                    </Button>
                    <span className="font-semibold text-gray-800 dark:text-white w-64 text-center">
                        {currentWeekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - {weekEndDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => handleWeekChange(1)}>
                        <ChevronRight className="w-4 h-4 text-gray-800 dark:text-white" />
                    </Button>
                </div>
                
                <Button 
                    onClick={() => { setEditingChore(null); setIsChoreModalOpen(true); }} 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!activeClassId || isLoading || classes.length === 0}  // Neu: disabled, wenn keine Klasse
                >
                    <Plus className="w-4 h-4 mr-2"/>
                    Neues Ämtchen
                </Button>
                
                <Button onClick={handleRandomAssign} variant="outline" className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-800 dark:text-white">
                    <Zap className="w-4 h-4 mr-2" />
                    Zufällig Zuweisen
                </Button>
            </div>

            {isLoading ? <CalendarLoader /> : (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="flex-1 flex gap-6 overflow-hidden">
                        {/* Student Pool - Left Side */}
                        <div className="w-80 flex-shrink-0">
                            <StudentPool students={unassignedStudents} />
                        </div>
                        
                        {/* Chores Week Table - Right Side */}
                        <div className="flex-1 overflow-x-auto">
                            <ChoresWeekTable 
                                chores={choresInClass}
                                weekDates={weekDates}
                                assignments={assignmentsForWeek}
                                students={studentsInClass}
                                onEditChore={(chore) => { setEditingChore(chore); setIsChoreModalOpen(true); }}
                                onExtendAssignment={handleExtendAssignment}
                            />
                        </div>
                    </div>
                </DragDropContext>
            )}

            <ChoreModal
                isOpen={isChoreModalOpen}
                onClose={() => setIsChoreModalOpen(false)}
                onSave={handleSaveChore}
                onDelete={handleDeleteChore}
                chore={editingChore}
            />

            {/* NEW: Extend Assignment Modal */}
            <ExtendAssignmentModal
                isOpen={isExtendModalOpen}
                onClose={() => { setIsExtendModalOpen(false); setExtendingStudent(null); setExtendingChore(null); }}
                onConfirm={handleConfirmExtend}
                student={extendingStudent}
                chore={extendingChore}
                currentWeekStart={currentWeekStart}
            />
        </div>
    );
}