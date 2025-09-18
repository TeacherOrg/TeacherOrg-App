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
import toast from 'react-hot-toast';
import pb from '@/api/pb';

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

    const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
    const [extendingStudent, setExtendingStudent] = useState(null);
    const [extendingChore, setExtendingChore] = useState(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [classesData, studentsData, choresData, assignmentsData] = await Promise.all([
                Class.list(), Student.list(), Chore.list(), ChoreAssignment.list()
            ]);
            console.log('Loaded assignments data:', JSON.stringify(assignmentsData, null, 2));
            setClasses(classesData || []);
            setStudents(studentsData || []);
            setChores(choresData || []);
            setAssignments(assignmentsData || []);

            if (classesData?.length > 0 && !activeClassId) {
                setActiveClassId(classesData[0].id);
            } else if (classesData?.length === 0) {
                toast.error("Keine Klassen vorhanden. Erstellen Sie zuerst eine Klasse in den Einstellungen.");
            }
        } catch (error) {
            console.error("Error loading data:", error);
            toast.error("Fehler beim Laden der Daten.");
        } finally {
            setIsLoading(false);
        }
    }, [activeClassId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const studentsInClass = useMemo(() => students.filter(s => s.class_id === activeClassId), [students, activeClassId]);
    const choresInClass = useMemo(() => {
        const filtered = chores.filter(c => c.class_id === activeClassId);
        console.log('Active Class ID:', activeClassId);
        console.log('All Chores:', chores);
        console.log('Filtered Chores in Class:', filtered);
        return filtered;
    }, [chores, activeClassId]);
    const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);
    const weekDateStrings = useMemo(() => {
        const dates = weekDates.map(d => d.dateString);
        console.log('Week date strings:', dates);
        return dates;
    }, [weekDates]);

    const assignmentsForWeek = useMemo(() => {
        console.log('Debug: Filtering assignments for week');
        console.log('Week date strings:', weekDateStrings);
        console.log('Raw assignments:', assignments.map(a => ({
            id: a.id,
            assignment_date: a.assignment_date,
            class_id: a.class_id,
            student_id: a.student_id,
            chore_id: a.chore_id
        })));
        
        const filteredAssignments = assignments.filter(a => {
            const isDateMatch = weekDateStrings.includes(a.assignment_date);
            const isClassMatch = a.class_id === activeClassId;
            console.log(`Assignment ${a.id}: dateMatch=${isDateMatch} (${a.assignment_date}), classMatch=${isClassMatch} (${a.class_id} vs ${activeClassId})`);
            return isDateMatch && isClassMatch;
        });
        
        console.log('Assignments for week:', JSON.stringify(filteredAssignments, null, 2));
        return filteredAssignments;
    }, [assignments, weekDateStrings, activeClassId]);

    const assignedStudentIds = useMemo(() => new Set(assignmentsForWeek.map(a => a.student_id)), [assignmentsForWeek]);

    const unassignedStudents = useMemo(() => {
        const unassigned = studentsInClass.filter(s => !assignedStudentIds.has(s.id));
        console.log('Unassigned students:', JSON.stringify(unassigned, null, 2));
        return unassigned;
    }, [studentsInClass, assignedStudentIds]);

    const handleWeekChange = (direction) => {
        setCurrentWeekStart(prevWeek => {
            const newWeek = new Date(prevWeek);
            newWeek.setDate(newWeek.getDate() + (direction * 7));
            return newWeek;
        });
    };

    const handleDragEnd = async (result) => {
        console.log('Drag result:', result);
        const { source, destination, draggableId: studentId } = result;
        if (!destination) {
            console.log('No destination, drag cancelled');
            return;
        }

        const destinationId = destination.droppableId;
        console.log('Destination ID:', destinationId);

        if (destinationId.startsWith('chore-week-')) {
            await handleWeekAssignment(studentId, destinationId);
        } else if (destinationId.startsWith('chore-') && ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].some(day => destinationId.includes(`-${day}`))) {
            await handleSingleDayAssignment(studentId, destinationId);
        } else if (destination.droppableId === 'student-pool' && source.droppableId.startsWith('chore-')) {
            await handleUnassignment(studentId, source.droppableId);
        } else {
            console.log('Invalid destination ID:', destinationId);
        }
    };

    const handleWeekAssignment = async (studentId, destinationId) => {
        const choreId = destinationId.replace('chore-week-', '');
        console.log('handleWeekAssignment - studentId:', studentId, 'choreId:', choreId);
        const chore = chores.find(c => c.id === choreId);
        console.log('Chore found (full object):', JSON.stringify(chore, null, 2));
        if (!chore) {
            console.log('No chore found for ID:', choreId);
            return;
        }

        let activeDays = [];
        const frequency = chore.frequency || 'weekly';
        const daysOfWeek = Array.isArray(chore.days_of_week) ? chore.days_of_week : [];
        if (frequency === 'daily' || frequency === 'on-demand' || frequency === 'bi-weekly' || frequency === 'monthly') {
            activeDays = weekDates;
        } else if (frequency === 'weekly') {
            activeDays = daysOfWeek.length === 0 ? weekDates : weekDates.filter(dayInfo => daysOfWeek.includes(dayInfo.dayKey));
        }
        console.log('Chore frequency:', frequency);
        console.log('Chore days_of_week:', daysOfWeek);
        console.log('Active days:', activeDays);

        for (const dayInfo of activeDays) {
            const existingAssignmentsForDay = assignmentsForWeek.filter(a => 
                a.chore_id === choreId && a.assignment_date === dayInfo.dateString
            );
            console.log(`Existing assignments for ${dayInfo.dayName}:`, existingAssignmentsForDay);

            if (existingAssignmentsForDay.some(a => a.student_id === studentId)) {
                console.log(`Student ${studentId} already assigned on ${dayInfo.dayName}`);
                toast.error(`Der Schüler ist am ${dayInfo.dayName} bereits für das Ämtchen "${chore.name}" zugewiesen.`);
                return;
            }

            if (existingAssignmentsForDay.length >= chore.required_students) {
                console.log(`Chore ${chore.name} requires only ${chore.required_students} students on ${dayInfo.dayName}`);
                toast.error(`Das Ämtchen "${chore.name}" benötigt am ${dayInfo.dayName} nur ${chore.required_students} Schüler.`);
                return;
            }
        }

        const userId = pb.authStore.model?.id;
        console.log('User ID:', userId);
        if (!userId) {
            console.log('No authenticated user found');
            toast.error("Kein authentifizierter Benutzer gefunden.");
            return;
        }

        const newAssignments = activeDays.map(dayInfo => ({
            student_id: studentId,
            chore_id: choreId,
            class_id: activeClassId,
            assignment_date: dayInfo.dateString,
            status: 'open',
            user_id: userId
        }));
        console.log('New assignments to create:', newAssignments);

        try {
            if (newAssignments.length > 0) {
                const createdAssignments = await ChoreAssignment.bulkCreate(newAssignments);
                console.log('Created assignments:', createdAssignments);
                await loadData(); // Reload all data to ensure UI consistency
                console.log('Reloaded data after assignment creation');
                toast.success("Ämtchen für die Woche erfolgreich zugewiesen!");
            } else {
                console.log('No assignments to create');
                toast.error(`Keine Zuweisungen möglich, da keine aktiven Tage vorhanden sind. (Frequenz: ${frequency}, Tage: ${JSON.stringify(daysOfWeek)})`);
            }
        } catch (error) {
            console.error("Failed to create week assignments:", error);
            toast.error("Fehler beim Zuweisen des Ämtchens für die ganze Woche: " + error.message);
        }
    };

    const handleSingleDayAssignment = async (studentId, destinationId) => {
        const parts = destinationId.split('-');
        const choreId = parts[1];
        const dayKey = parts[2];
        console.log('handleSingleDayAssignment - studentId:', studentId, 'choreId:', choreId, 'dayKey:', dayKey);
        const dayInfo = weekDates.find(d => d.dayKey === dayKey);
        console.log('Day info:', dayInfo);
        if (!dayInfo) {
            console.log('No day info found for dayKey:', dayKey);
            return;
        }

        const chore = chores.find(c => c.id === choreId);
        console.log('Chore found:', chore);
        if (!chore) {
            console.log('No chore found for ID:', choreId);
            return;
        }

        const isChoreActiveOnDay = 
            chore.frequency === 'daily' || 
            chore.frequency === 'on-demand' ||
            chore.frequency === 'bi-weekly' ||
            chore.frequency === 'monthly' ||
            (chore.frequency === 'weekly' && (!chore.days_of_week?.length || chore.days_of_week.includes(dayKey)));
        console.log('Is chore active on day:', isChoreActiveOnDay);

        if (!isChoreActiveOnDay) {
            console.log(`Chore ${chore.name} is not active on ${dayInfo.dayName}`);
            toast.error(`Das Ämtchen "${chore.name}" ist am ${dayInfo.dayName} nicht aktiv.`);
            return;
        }

        const existingAssignments = assignmentsForWeek.filter(a => 
            a.chore_id === choreId && a.assignment_date === dayInfo.dateString
        );
        console.log('Existing assignments:', existingAssignments);

        if (existingAssignments.some(a => a.student_id === studentId)) {
            console.log(`Student ${studentId} already assigned for ${dayInfo.dateString}`);
            return; // Already assigned
        }

        if (existingAssignments.length >= chore.required_students) {
            console.log(`Chore ${chore.name} requires only ${chore.required_students} students`);
            toast.error(`Das Ämtchen "${chore.name}" benötigt nur ${chore.required_students} Schüler.`);
            return;
        }

        const userId = pb.authStore.model?.id;
        console.log('User ID:', userId);
        if (!userId) {
            console.log('No authenticated user found');
            toast.error("Kein authentifizierter Benutzer gefunden.");
            return;
        }

        const newAssignment = {
            student_id: studentId,
            chore_id: choreId,
            class_id: activeClassId,
            assignment_date: dayInfo.dateString,
            status: 'open',
            user_id: userId
        };
        console.log('New assignment to create:', newAssignment);

        try {
            const created = await ChoreAssignment.create(newAssignment);
            console.log('Created assignment:', created);
            await loadData(); // Reload data to ensure UI consistency
            console.log('Reloaded data after single assignment creation');
            toast.success("Ämtchen erfolgreich zugewiesen!");
        } catch (error) {
            console.error("Failed to create assignment:", error);
            toast.error("Fehler beim Zuweisen des Ämtchens: " + error.message);
        }
    };

    const handleUnassignment = async (studentId, sourceId) => {
        console.log('handleUnassignment - studentId:', studentId, 'sourceId:', sourceId);
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
            if (!dayInfo) {
                console.log('No day info found for dayKey:', dayKey);
                return;
            }

            assignmentsToDelete = assignmentsForWeek.filter(a => 
                a.student_id === studentId && 
                a.chore_id === choreId && 
                a.assignment_date === dayInfo.dateString
            );
        }
        console.log('Assignments to delete:', assignmentsToDelete);

        if (assignmentsToDelete.length > 0) {
            try {
                await Promise.all(assignmentsToDelete.map(a => ChoreAssignment.delete(a.id)));
                console.log('Deleted assignments:', assignmentsToDelete);
                await loadData(); // Reload data to ensure UI consistency
                console.log('Reloaded data after unassignment');
                toast.success("Zuweisung erfolgreich entfernt!");
            } catch (error) {
                console.error("Failed to delete assignment:", error);
                toast.error("Fehler beim Entfernen der Zuweisung: " + error.message);
            }
        }
    };

    const handleRandomAssign = async () => {
        if (!window.confirm("Möchten Sie alle Ämtchen für diese Woche zufällig zuweisen? Bestehende Zuweisungen werden überschrieben.")) {
            return;
        }

        try {
            const assignmentsToDeleteInClass = assignmentsForWeek.filter(a => a.class_id === activeClassId);
            if (assignmentsToDeleteInClass.length > 0) {
                await Promise.all(assignmentsToDeleteInClass.map(a => ChoreAssignment.delete(a.id)));
            }

            const newAssignments = [];
            const userId = pb.authStore.model?.id;
            if (!userId) {
                toast.error("Kein authentifizierter Benutzer gefunden.");
                return;
            }
            
            for (const dayInfo of weekDates) {
                const availableStudents = [...studentsInClass];
                
                const activeChores = choresInClass.filter(chore => {
                    return chore.frequency === 'daily' || 
                           chore.frequency === 'on-demand' ||
                           chore.frequency === 'bi-weekly' ||
                           chore.frequency === 'monthly' ||
                           (chore.frequency === 'weekly' && (!chore.days_of_week?.length || chore.days_of_week.includes(dayInfo.dayKey)));
                });

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
                            status: 'open',
                            user_id: userId
                        });
                    }
                }
            }

            if (newAssignments.length > 0) {
                const createdAssignments = await ChoreAssignment.bulkCreate(newAssignments);
                await loadData(); // Reload data to ensure UI consistency
                console.log('Reloaded data after random assignment');
                toast.success("Ämtchen wurden erfolgreich zufällig zugewiesen!");
            } else {
                await loadData(); // Reload data to ensure UI consistency
                console.log('Reloaded data after clearing assignments');
                toast.success("Bestehende Zuweisungen wurden entfernt.");
            }
        } catch (error) {
            console.error("Error with random assignment:", error);
            toast.error("Fehler bei der zufälligen Zuweisung: " + error.message);
        }
    };
    
    const handleSaveChore = async (choreData) => {
        if (!activeClassId) {
            toast.error("Bitte wählen Sie zuerst eine Klasse aus, um ein Ämtchen hinzuzufügen.");
            return;
        }
        try {
            const userId = pb.authStore.model?.id;
            if (!userId) {
                toast.error("Kein authentifizierter Benutzer gefunden.");
                return;
            }
            const payload = { 
                ...choreData, 
                class_id: activeClassId, 
                user_id: userId 
            };
            console.log('Saving chore payload:', JSON.stringify(payload, null, 2));
            if (editingChore) {
                await Chore.update(editingChore.id, payload);
                toast.success("Ämtchen erfolgreich aktualisiert!");
            } else {
                await Chore.create(payload);
                toast.success("Ämtchen erfolgreich erstellt!");
            }
            await loadData(); // Reload data to ensure UI consistency
            console.log('Reloaded data after saving chore');
            setIsChoreModalOpen(false);
            setEditingChore(null);
        } catch (error) {
            console.error("Error saving chore:", error);
            toast.error("Fehler beim Speichern des Ämtchens: " + error.message);
        }
    };

    const handleDeleteChore = async (choreId) => {
        if (window.confirm("Möchten Sie dieses Ämtchen wirklich löschen? Alle zugehörigen Zuweisungen werden ebenfalls entfernt.")) {
            try {
                const assignmentsToDelete = assignments.filter(a => a.chore_id === choreId);
                await Promise.all(assignmentsToDelete.map(a => ChoreAssignment.delete(a.id)));
                await Chore.delete(choreId);
                toast.success("Ämtchen erfolgreich gelöscht!");
                await loadData(); // Reload data to ensure UI consistency
                console.log('Reloaded data after deleting chore');
                setIsChoreModalOpen(false);
            } catch (error) {
                console.error("Error deleting chore:", error);
                toast.error("Fehler beim Löschen des Ämtchens: " + error.message);
            }
        }
    };

    const handleExtendAssignment = useCallback((student, choreId, dayKey) => {
        const chore = chores.find(c => c.id === choreId);
        if (!student || !chore) return;
        
        setExtendingStudent(student);
        setExtendingChore(chore);
        setIsExtendModalOpen(true);
    }, [chores]);

    const handleConfirmExtend = async (weeksToExtend) => {
        if (!extendingStudent || !extendingChore) return;
        
        try {
            const newAssignments = [];
            const userId = pb.authStore.model?.id;
            if (!userId) {
                toast.error("Kein authentifizierter Benutzer gefunden.");
                return;
            }
            
            for (let weekOffset = 1; weekOffset <= weeksToExtend; weekOffset++) {
                const futureWeekStart = new Date(currentWeekStart);
                futureWeekStart.setDate(futureWeekStart.getDate() + (weekOffset * 7));
                const futureWeekDates = getWeekDates(futureWeekStart);
                
                const activeDays = futureWeekDates.filter(dayInfo => {
                    return extendingChore.frequency === 'daily' || 
                           extendingChore.frequency === 'on-demand' ||
                           extendingChore.frequency === 'bi-weekly' ||
                           extendingChore.frequency === 'monthly' ||
                           (extendingChore.frequency === 'weekly' && (!extendingChore.days_of_week?.length || extendingChore.days_of_week.includes(dayInfo.dayKey)));
                });
                
                for (const dayInfo of activeDays) {
                    const exists = assignments.some(a => 
                        a.student_id === extendingStudent.id &&
                        a.chore_id === extendingChore.id &&
                        a.assignment_date === dayInfo.dateString
                    );

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
                            status: 'open',
                            user_id: userId
                        });
                    }
                }
            }
            
            if (newAssignments.length > 0) {
                const createdAssignments = await ChoreAssignment.bulkCreate(newAssignments);
                await loadData(); // Reload data to ensure UI consistency
                console.log('Reloaded data after extending assignment');
                toast.success(`Zuweisung für ${weeksToExtend} Woche${weeksToExtend !== 1 ? 'n' : ''} erfolgreich erstellt!`);
            } else {
                toast.error("Keine neuen Zuweisungen möglich, da Kapazität erreicht oder Zuweisungen existieren.");
            }
            
            setIsExtendModalOpen(false);
            setExtendingStudent(null);
            setExtendingChore(null);
        } catch (error) {
            console.error("Failed to extend assignment:", error);
            toast.error("Fehler bei der Erweiterung der Zuweisung: " + error.message);
        }
    };

    const weekEndDate = new Date(currentWeekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 4);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6 flex flex-col transition-colors duration-300">
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
                    disabled={!activeClassId || isLoading || classes.length === 0}
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
                    <div className="flex-1 flex gap-6">
                        <div className="w-80 flex-shrink-0">
                            <StudentPool students={unassignedStudents} />
                        </div>
                        <div className="flex-1 min-w-[800px]">
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
