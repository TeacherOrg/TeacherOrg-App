import { useState, useEffect, useCallback, useMemo } from 'react';
import { Class, Student, Chore, ChoreAssignment } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Plus, Zap, AlertTriangle } from 'lucide-react';
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

// Helper function to check if a chore is active on a specific day
function isChoreActiveOnDay(chore, dayKey) {
    const frequency = chore.frequency || 'weekly';
    if (['daily', 'on-demand', 'bi-weekly', 'monthly'].includes(frequency)) {
        return true;
    }
    if (frequency === 'weekly') {
        return !chore.days_of_week?.length || chore.days_of_week.includes(dayKey);
    }
    return false;
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
    const [isRandomAssignDialogOpen, setIsRandomAssignDialogOpen] = useState(false);

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
    const choresInClass = useMemo(() => chores.filter(c => c.class_id === activeClassId), [chores, activeClassId]);
    const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);
    const weekDateStrings = useMemo(() => weekDates.map(d => d.dateString), [weekDates]);

    const assignmentsForWeek = useMemo(() => {
        return assignments.filter(a =>
            weekDateStrings.includes(a.assignment_date) && a.class_id === activeClassId
        );
    }, [assignments, weekDateStrings, activeClassId]);

    const assignedStudentIds = useMemo(() => new Set(assignmentsForWeek.map(a => a.student_id)), [assignmentsForWeek]);

    const unassignedStudents = useMemo(() => {
        return studentsInClass.filter(s => !assignedStudentIds.has(s.id));
    }, [studentsInClass, assignedStudentIds]);

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

        // Bestimme aktive Tage mit Helper-Funktion
        const activeDays = weekDates.filter(dayInfo => isChoreActiveOnDay(chore, dayInfo.dayKey));

        // Validierung
        for (const dayInfo of activeDays) {
            const existingAssignmentsForDay = assignmentsForWeek.filter(a =>
                a.chore_id === choreId && a.assignment_date === dayInfo.dateString
            );

            if (existingAssignmentsForDay.some(a => a.student_id === studentId)) {
                toast.error(`Der Schüler ist am ${dayInfo.dayName} bereits für "${chore.name}" zugewiesen.`);
                return;
            }

            if (existingAssignmentsForDay.length >= (chore.required_students || 1)) {
                toast.error(`"${chore.name}" benötigt am ${dayInfo.dayName} nur ${chore.required_students || 1} Schüler.`);
                return;
            }
        }

        const userId = pb.authStore.model?.id;
        if (!userId) {
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

        if (newAssignments.length === 0) {
            toast.error("Keine Zuweisungen möglich, da keine aktiven Tage vorhanden sind.");
            return;
        }

        try {
            await ChoreAssignment.bulkCreate(newAssignments);
            await loadData();
            toast.success("Ämtchen für die Woche erfolgreich zugewiesen!");
        } catch (error) {
            console.error("Failed to create week assignments:", error);
            toast.error("Fehler beim Zuweisen: " + error.message);
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

        // Prüfe ob Ämtchen an diesem Tag aktiv ist
        if (!isChoreActiveOnDay(chore, dayKey)) {
            toast.error(`"${chore.name}" ist am ${dayInfo.dayName} nicht aktiv.`);
            return;
        }

        const existingAssignments = assignmentsForWeek.filter(a =>
            a.chore_id === choreId && a.assignment_date === dayInfo.dateString
        );

        if (existingAssignments.some(a => a.student_id === studentId)) {
            return; // Already assigned
        }

        if (existingAssignments.length >= (chore.required_students || 1)) {
            toast.error(`"${chore.name}" benötigt nur ${chore.required_students || 1} Schüler.`);
            return;
        }

        const userId = pb.authStore.model?.id;
        if (!userId) {
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

        try {
            await ChoreAssignment.create(newAssignment);
            await loadData();
            toast.success("Ämtchen erfolgreich zugewiesen!");
        } catch (error) {
            console.error("Failed to create assignment:", error);
            toast.error("Fehler beim Zuweisen: " + error.message);
        }
    };

    const handleUnassignment = async (studentId, sourceId) => {
        // Bereinige studentId von Suffixen
        const cleanStudentId = studentId.split('-weekly-')[0];
        const sourceParts = sourceId.split('-');
        let assignmentsToDelete = [];

        if (sourceParts[1] === 'week' || sourceParts[1] === 'weekly') {
            // Wochenzuweisung - alle Zuweisungen für diesen Schüler und Ämtchen löschen
            const choreId = sourceParts[2];
            assignmentsToDelete = assignmentsForWeek.filter(a =>
                a.student_id === cleanStudentId && a.chore_id === choreId
            );
        } else {
            // Einzelner Tag
            const choreId = sourceParts[1];
            const dayKey = sourceParts[2];
            const dayInfo = weekDates.find(d => d.dayKey === dayKey);
            if (!dayInfo) return;

            assignmentsToDelete = assignmentsForWeek.filter(a =>
                a.student_id === cleanStudentId &&
                a.chore_id === choreId &&
                a.assignment_date === dayInfo.dateString
            );
        }

        if (assignmentsToDelete.length > 0) {
            try {
                await Promise.all(assignmentsToDelete.map(a => ChoreAssignment.delete(a.id)));
                await loadData();
                toast.success("Zuweisung erfolgreich entfernt!");
            } catch (error) {
                console.error("Failed to delete assignment:", error);
                toast.error("Fehler beim Entfernen: " + error.message);
            }
        }
    };

    const handleRandomAssign = async () => {
        try {
            // Bestehende Zuweisungen für diese Woche und Klasse löschen
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

            // Pool aller verfügbaren Schüler (jeder Schüler kann nur EIN Ämtchen pro Woche haben)
            const availableStudents = [...studentsInClass];

            // Für jedes Ämtchen in der Klasse
            for (const chore of choresInClass) {
                const studentsNeeded = chore.required_students || 1;

                // Bestimme aktive Tage für dieses Ämtchen
                const activeDays = weekDates.filter(dayInfo => isChoreActiveOnDay(chore, dayInfo.dayKey));

                if (activeDays.length === 0) continue;

                // Wähle zufällig die benötigte Anzahl Schüler für dieses Ämtchen
                for (let i = 0; i < studentsNeeded && availableStudents.length > 0; i++) {
                    const randomIndex = Math.floor(Math.random() * availableStudents.length);
                    const selectedStudent = availableStudents.splice(randomIndex, 1)[0];

                    if (selectedStudent) {
                        // Erstelle Zuweisungen für ALLE aktiven Tage der Woche
                        for (const dayInfo of activeDays) {
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
            }

            if (newAssignments.length > 0) {
                await ChoreAssignment.bulkCreate(newAssignments);
                await loadData();
                toast.success(`Ämtchen erfolgreich zufällig zugewiesen! ${choresInClass.length} Ämtchen an ${studentsInClass.length - availableStudents.length} Schüler verteilt.`);
            } else {
                await loadData();
                toast.success("Bestehende Zuweisungen wurden entfernt - keine neuen Zuweisungen möglich.");
            }
        } catch (error) {
            console.error("Fehler bei der zufälligen Zuweisung:", error);
            toast.error("Fehler bei der zufälligen Zuweisung: " + error.message);
            await loadData(); // Bei Fehler Daten neu laden für Konsistenz
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
            if (editingChore) {
                await Chore.update(editingChore.id, payload);
                toast.success("Ämtchen erfolgreich aktualisiert!");
            } else {
                await Chore.create(payload);
                toast.success("Ämtchen erfolgreich erstellt!");
            }
            await loadData();
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
                await loadData();
                setIsChoreModalOpen(false);
            } catch (error) {
                console.error("Error deleting chore:", error);
                toast.error("Fehler beim Löschen des Ämtchens: " + error.message);
            }
        }
    };

    const handleExtendAssignment = useCallback((student, choreId) => {
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
                await ChoreAssignment.bulkCreate(newAssignments);
                await loadData();
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 flex flex-col transition-colors duration-300">
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
                
                <Button onClick={() => setIsRandomAssignDialogOpen(true)} variant="outline" className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-800 dark:text-white">
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

            <Dialog open={isRandomAssignDialogOpen} onOpenChange={setIsRandomAssignDialogOpen}>
                <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Zufällig Zuweisen
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-slate-400">
                            Möchten Sie alle Ämtchen für diese Woche zufällig zuweisen? Bestehende Zuweisungen werden überschrieben.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsRandomAssignDialogOpen(false)}
                            className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                        >
                            Abbrechen
                        </Button>
                        <Button
                            onClick={() => {
                                setIsRandomAssignDialogOpen(false);
                                handleRandomAssign();
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            Zuweisen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}