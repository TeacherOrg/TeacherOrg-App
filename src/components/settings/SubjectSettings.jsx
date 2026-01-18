import React, { useState, useMemo } from 'react';
import { Subject, Lesson, YearlyLesson, Topic, Performance, Fachbereich, Setting } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit, Check, GripVertical, Star, BookOpen, ChevronDown, ChevronUp, X, RefreshCw, Database } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import pb from '@/api/pb';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LP21SubjectSelector from './LP21SubjectSelector';
import { getFachbereicheForSubject, PREDEFINED_SUBJECTS, LEHRPLAN_ZYKLEN } from '@/constants/lehrplan21Subjects';

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981',
    '#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#64748b'
];

const PRESET_EMOJIS = [
    '📚', '🧮', '🔬', '⚗️', '🌍', '🎨', '🎶', '🏀', '💻', '📝',
    '🗣️', '⚙️', '🌱', '📖', '🧬', '🔭', '⚖️', '🖌️', '🎭', '🌐',
    '💰', '🙏', '📊', '🗺️', '📜', '⚽', '🖥️', '🎤', '🔧', '🧪'
];

// Sortierbare Fach-Zeile Komponente
const SortableSubjectItem = ({ subject, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: subject.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 'auto'
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2">
            <button
                {...attributes}
                {...listeners}
                className="p-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
                <GripVertical className="w-5 h-5" />
            </button>
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
};

const SubjectSettings = ({ subjects, classes, activeClassId, setActiveClassId, refreshData }) => {
    // LP21 Dialog State
    const [showLP21Dialog, setShowLP21Dialog] = useState(false);
    const [selectedZyklus, setSelectedZyklus] = useState('zyklus_2');
    const [selectedLP21Subjects, setSelectedLP21Subjects] = useState([]);
    const [isAddingLP21Subjects, setIsAddingLP21Subjects] = useState(false);

    // Custom Subject State
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [newSubject, setNewSubject] = useState({ name: '', color: '#3b82f6', lessons_per_week: 4, emoji: '', is_core_subject: false });
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Editing State
    const [editingSubjectId, setEditingSubjectId] = useState(null);
    const [editingSubjectData, setEditingSubjectData] = useState(null);
    const [editingShowColorPicker, setEditingShowColorPicker] = useState(false);
    const [editingShowEmojiPicker, setEditingShowEmojiPicker] = useState(false);

    // Cleanup State
    const [isCleaningUp, setIsCleaningUp] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

    const currentUserId = pb.authStore.model?.id;

    // Zählung der Kernfächer für Validierung (max. 3)
    const coreSubjectCount = useMemo(() => {
        return subjects.filter(s => s.class_id === activeClassId && s.is_core_subject).length;
    }, [subjects, activeClassId]);

    // Bereits verwendete LP21-IDs für diese Klasse
    const existingLp21Ids = useMemo(() => {
        return subjects
            .filter(s => s.class_id === activeClassId && s.lp21_id)
            .map(s => s.lp21_id);
    }, [subjects, activeClassId]);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Sortierte Fächer für die aktive Klasse
    const sortedSubjectsForClass = useMemo(() => {
        return subjects
            .filter(s => s.class_id === activeClassId)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }, [subjects, activeClassId]);

    // LP21 Fächer und benutzerdefinierte Fächer trennen
    const lp21Subjects = useMemo(() => {
        return sortedSubjectsForClass.filter(s => s.lp21_id);
    }, [sortedSubjectsForClass]);

    const customSubjects = useMemo(() => {
        return sortedSubjectsForClass.filter(s => !s.lp21_id);
    }, [sortedSubjectsForClass]);

    // Zyklus aus den vorhandenen LP21-Fächern ermitteln
    const detectedZyklus = useMemo(() => {
        if (lp21Subjects.length === 0) return null;

        // Sammle alle Zyklen der vorhandenen LP21-Fächer
        const zyklenSet = new Set();
        for (const subject of lp21Subjects) {
            const predefined = PREDEFINED_SUBJECTS.find(p => p.lp21_id === subject.lp21_id);
            if (predefined) {
                predefined.zyklen.forEach(z => zyklenSet.add(z));
            }
        }

        // Finde den wahrscheinlichsten Zyklus (der bei allen Fächern vorkommt)
        const zyklenArray = Array.from(zyklenSet);
        if (zyklenArray.length === 1) {
            return LEHRPLAN_ZYKLEN[zyklenArray[0].toUpperCase()];
        }

        // Prüfe ob alle Fächer einen gemeinsamen Zyklus haben
        for (const zyklusId of ['zyklus_1', 'zyklus_2', 'zyklus_3']) {
            const allHaveZyklus = lp21Subjects.every(s => {
                const predefined = PREDEFINED_SUBJECTS.find(p => p.lp21_id === s.lp21_id);
                return predefined?.zyklen.includes(zyklusId);
            });
            if (allHaveZyklus) {
                return LEHRPLAN_ZYKLEN[zyklusId.toUpperCase()];
            }
        }

        return null; // Gemischt oder nicht ermittelbar
    }, [lp21Subjects]);

    // Drag End Handler
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = sortedSubjectsForClass.findIndex(s => s.id === active.id);
        const newIndex = sortedSubjectsForClass.findIndex(s => s.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reorderedSubjects = arrayMove(sortedSubjectsForClass, oldIndex, newIndex);
        const updates = reorderedSubjects.map((subject, index) => ({
            id: subject.id,
            sort_order: index
        }));

        try {
            await Subject.updateSortOrder(updates);
            toast.success('Reihenfolge gespeichert');
            await refreshData();
        } catch (error) {
            console.error('Error updating sort order:', error);
            toast.error('Fehler beim Speichern der Reihenfolge');
        }
    };

    // LP21 Fächer hinzufügen
    const handleAddLP21Subjects = async () => {
        if (selectedLP21Subjects.length === 0) {
            toast.error('Bitte wählen Sie mindestens ein Fach aus.');
            return;
        }

        setIsAddingLP21Subjects(true);
        try {
            const currentSortOrder = sortedSubjectsForClass.length;
            let addedCount = 0;

            for (let i = 0; i < selectedLP21Subjects.length; i++) {
                const subjectData = selectedLP21Subjects[i];

                // Prüfe ob bereits vorhanden
                if (existingLp21Ids.includes(subjectData.lp21_id)) {
                    continue;
                }

                // Fach erstellen
                const newSubject = await Subject.create({
                    name: subjectData.name,
                    color: subjectData.color,
                    emoji: subjectData.emoji,
                    lessons_per_week: subjectData.lessons_per_week,
                    is_core_subject: subjectData.is_core_subject || false,
                    lp21_id: subjectData.lp21_id,
                    class_id: activeClassId,
                    user_id: currentUserId,
                    sort_order: currentSortOrder + i
                });

                // LP21-Fachbereiche automatisch erstellen
                const lp21Fachbereiche = getFachbereicheForSubject(subjectData.lp21_id);
                for (let j = 0; j < lp21Fachbereiche.length; j++) {
                    const fb = lp21Fachbereiche[j];
                    await Fachbereich.create({
                        name: fb.name,
                        subject_id: newSubject.id,
                        class_id: activeClassId,
                        user_id: currentUserId,
                        lp21_id: fb.id,
                        sort_order: j
                    });
                }

                addedCount++;
            }

            setShowLP21Dialog(false);
            setSelectedLP21Subjects([]);
            await refreshData();
            toast.success(`${addedCount} Fächer mit Fachbereichen hinzugefügt`);
        } catch (error) {
            console.error('Error adding LP21 subjects:', error);
            toast.error('Fehler beim Hinzufügen der Fächer');
        } finally {
            setIsAddingLP21Subjects(false);
        }
    };

    // Benutzerdefiniertes Fach hinzufügen
    const handleAddCustomSubject = async () => {
        if (!newSubject.name.trim() || !activeClassId || !currentUserId) {
            toast.error('Name und Klasse sind erforderlich.');
            return;
        }

        try {
            await Subject.create({
                ...newSubject,
                class_id: activeClassId,
                user_id: currentUserId,
                sort_order: sortedSubjectsForClass.length
            });
            setNewSubject({ name: '', color: '#3b82f6', lessons_per_week: 4, emoji: '', is_core_subject: false });
            setShowColorPicker(false);
            setShowEmojiPicker(false);
            setShowCustomForm(false);
            await refreshData();
            toast.success('Fach erfolgreich hinzugefügt.');
        } catch (error) {
            console.error('Error adding subject:', error);
            toast.error('Fehler beim Hinzufügen des Fachs.');
        }
    };

    // Lokale Änderungen im Edit-Modus
    const handleLocalUpdate = (field, value) => {
        setEditingSubjectData(prev => ({ ...prev, [field]: value }));
    };

    // Fach aktualisieren
    const handleUpdateSubject = async (id, data) => {
        try {
            await Subject.update(id, data);
            await refreshData();
            toast.success('Fach aktualisiert.');
        } catch (error) {
            console.error('Error updating subject:', error);
            toast.error('Fehler beim Aktualisieren.');
        }
    };

    // Fach löschen
    const handleDeleteSubject = async (id) => {
        if (!window.confirm("Sind Sie sicher? Dies löscht alle Lektionen, Noten und Fachbereiche dieses Fachs. Themen werden archiviert und können später wiederverwendet werden. Fortfahren?")) {
            return;
        }

        try {
            const [yearlyLessons, lessons, topics, performances, fachbereiche] = await Promise.all([
                YearlyLesson.list({ subject: id }),
                Lesson.list({ subject: id }),
                Topic.list({ subject: id }),
                Performance.list({ subject: id }),
                Fachbereich.list({ subject_id: id }),
            ]);

            // Topics archivieren
            for (const topic of topics) {
                try {
                    const topicYearlyLessons = yearlyLessons.filter(yl => yl.topic_id === topic.id);
                    const lessonsSnapshot = topicYearlyLessons
                        .sort((a, b) => (a.week_number - b.week_number) || (a.lesson_number - b.lesson_number))
                        .map(lesson => ({
                            name: lesson.name || '',
                            notes: lesson.notes || '',
                            steps: lesson.steps || [],
                            is_exam: lesson.is_exam || false,
                            is_double_lesson: lesson.is_double_lesson || false,
                            original_week: lesson.week_number,
                            original_lesson_number: lesson.lesson_number
                        }));

                    const topicSnapshot = {
                        name: topic.name || topic.title || 'Unbenanntes Thema',
                        description: topic.description || '',
                        color: topic.color || '#3b82f6',
                        goals: topic.goals || '',
                        materials: topic.materials || [],
                        lehrplan_kompetenz_ids: topic.lehrplan_kompetenz_ids || []
                    };

                    await Topic.update(topic.id, {
                        subject: null,
                        lessons_snapshot: lessonsSnapshot.length > 0 ? lessonsSnapshot : null,
                        topic_snapshot: topicSnapshot,
                        competency_status_overrides: null
                    });
                } catch (archiveError) {
                    console.warn('Topic archiving failed:', topic.id, archiveError);
                    try { await Topic.delete(topic.id); } catch {}
                }
            }

            await Promise.all(lessons.map(l => Lesson.delete(l.id)));
            await Promise.all([
                ...yearlyLessons.map(yl => YearlyLesson.delete(yl.id)),
                ...performances.map(p => Performance.delete(p.id)),
                ...fachbereiche.map(f => Fachbereich.delete(f.id)),
            ]);

            // fixedScheduleTemplate bereinigen
            const subjectToDelete = subjects.find(s => s.id === id);
            if (subjectToDelete) {
                try {
                    const settingsList = await Setting.list({ user_id: pb.authStore.model?.id });
                    if (settingsList.length > 0) {
                        const currentSettings = settingsList[0];
                        const template = currentSettings.fixedScheduleTemplate || {};
                        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
                        const cleanedTemplate = {};

                        for (const day of days) {
                            if (template[day]) {
                                cleanedTemplate[day] = template[day].filter(slot =>
                                    slot.subject !== subjectToDelete.name
                                );
                            }
                        }

                        await Setting.update(currentSettings.id, {
                            fixedScheduleTemplate: cleanedTemplate
                        });
                    }
                } catch (templateError) {
                    console.warn('Failed to clean fixedScheduleTemplate:', templateError);
                }
            }

            await Subject.delete(id);
            await refreshData();
            window.dispatchEvent(new CustomEvent('subject-deleted'));
            toast.success('Fach und Stundenplan-Einträge gelöscht. Themen wurden archiviert.');
        } catch (error) {
            console.error('Error deleting subject:', error);
            toast.error('Fehler beim Löschen: ' + error.message);
        }
    };

    // Bereinigung: Alle custom Fachbereiche durch LP21-Standard ersetzen + Duplikate entfernen
    const handleCleanupFachbereiche = async () => {
        if (!window.confirm(
            "ACHTUNG: Diese Aktion wird:\n" +
            "• Alle benutzerdefinierten Fachbereiche löschen\n" +
            "• Doppelte Fachbereiche zusammenführen\n" +
            "• Leistungen auf LP21-Fachbereiche aktualisieren\n\n" +
            "Fortfahren?"
        )) {
            return;
        }

        setIsCleaningUp(true);
        try {
            let deletedCount = 0;
            let createdCount = 0;
            let updatedPerformances = 0;
            let mergedDuplicates = 0;

            // Sammle alle alten Namen → LP21-Namen Mappings für Performance-Updates
            const nameReplacements = new Map(); // oldName → newName

            // Für jedes LP21-Fach in der aktuellen Klasse
            for (const subject of lp21Subjects) {
                if (!subject.lp21_id) continue;

                // Hole alle Fachbereiche für dieses Fach
                const subjectFachbereiche = await Fachbereich.list({ subject_id: subject.id });
                const lp21Fachbereiche = getFachbereicheForSubject(subject.lp21_id);

                // 1. Finde Duplikate (mehrere Fachbereiche mit derselben lp21_id)
                const fbByLp21Id = new Map();
                for (const fb of subjectFachbereiche) {
                    if (fb.lp21_id) {
                        if (!fbByLp21Id.has(fb.lp21_id)) {
                            fbByLp21Id.set(fb.lp21_id, []);
                        }
                        fbByLp21Id.get(fb.lp21_id).push(fb);
                    }
                }

                // 2. Für jede lp21_id: Behalte nur einen, lösche Duplikate
                for (const [lp21Id, duplicates] of fbByLp21Id.entries()) {
                    if (duplicates.length > 1) {
                        // Finde den kanonischen LP21-Namen
                        const lp21Fb = lp21Fachbereiche.find(f => f.id === lp21Id);
                        const canonicalName = lp21Fb?.name || duplicates[0].name;

                        // Behalte den mit dem korrekten Namen, oder den ersten
                        const keepFb = duplicates.find(fb => fb.name === canonicalName) || duplicates[0];

                        // Lösche die anderen und speichere Namens-Mappings
                        for (const fb of duplicates) {
                            if (fb.id !== keepFb.id) {
                                // Speichere Mapping für Performance-Updates
                                if (fb.name !== canonicalName) {
                                    nameReplacements.set(fb.name, canonicalName);
                                }
                                await Fachbereich.delete(fb.id);
                                mergedDuplicates++;
                            }
                        }

                        // Stelle sicher, dass der beibehaltene den korrekten Namen hat
                        if (keepFb.name !== canonicalName) {
                            nameReplacements.set(keepFb.name, canonicalName);
                            await Fachbereich.update(keepFb.id, { name: canonicalName });
                        }
                    }
                }

                // 3. Lösche alle custom Fachbereiche (ohne lp21_id)
                for (const fb of subjectFachbereiche) {
                    if (!fb.lp21_id) {
                        // Suche einen passenden LP21-Fachbereich basierend auf Namen
                        const matchingLp21Fb = lp21Fachbereiche.find(lp21fb =>
                            fb.name.toLowerCase().includes(lp21fb.name.toLowerCase()) ||
                            lp21fb.name.toLowerCase().includes(fb.name.toLowerCase())
                        );

                        if (matchingLp21Fb) {
                            nameReplacements.set(fb.name, matchingLp21Fb.name);
                        }

                        // Lösche den custom Fachbereich
                        await Fachbereich.delete(fb.id);
                        deletedCount++;
                    }
                }

                // 4. Erstelle fehlende LP21-Fachbereiche
                const remainingFbs = await Fachbereich.list({ subject_id: subject.id });
                const existingLp21Ids = remainingFbs.filter(f => f.lp21_id).map(f => f.lp21_id);

                for (let j = 0; j < lp21Fachbereiche.length; j++) {
                    const lp21Fb = lp21Fachbereiche[j];
                    if (!existingLp21Ids.includes(lp21Fb.id)) {
                        await Fachbereich.create({
                            name: lp21Fb.name,
                            subject_id: subject.id,
                            class_id: activeClassId,
                            user_id: currentUserId,
                            lp21_id: lp21Fb.id,
                            sort_order: j
                        });
                        createdCount++;
                    }
                }
            }

            // 5. Aktualisiere Performance-Fachbereich-Namen
            if (nameReplacements.size > 0) {
                const performances = await Performance.list({ class_id: activeClassId });
                for (const perf of performances) {
                    if (perf.fachbereiche && Array.isArray(perf.fachbereiche)) {
                        let updated = false;
                        const newFachbereiche = perf.fachbereiche.map(fbName => {
                            if (nameReplacements.has(fbName)) {
                                updated = true;
                                return nameReplacements.get(fbName);
                            }
                            return fbName;
                        });

                        // Entferne Duplikate aus dem Array
                        const uniqueFachbereiche = [...new Set(newFachbereiche)];

                        if (updated || uniqueFachbereiche.length !== newFachbereiche.length) {
                            await Performance.update(perf.id, { fachbereiche: uniqueFachbereiche });
                            updatedPerformances++;
                        }
                    }
                }
            }

            await refreshData();
            toast.success(
                `Bereinigung abgeschlossen!\n` +
                `${deletedCount} custom Fachbereiche gelöscht\n` +
                `${mergedDuplicates} Duplikate zusammengeführt\n` +
                `${createdCount} LP21-Fachbereiche erstellt\n` +
                `${updatedPerformances} Leistungen aktualisiert`
            );
        } catch (error) {
            console.error('Error during cleanup:', error);
            toast.error('Fehler bei der Bereinigung: ' + error.message);
        } finally {
            setIsCleaningUp(false);
        }
    };

    // Migration: class_id für Lessons und Subjects setzen (einmalig nötig nach Update)
    const handleMigrateClassIds = async () => {
        if (!window.confirm(
            "Diese Migration weist allen Lektionen und Fächern eine Klassen-ID zu.\n\n" +
            "Dies ist einmalig nötig, damit Schüler den Stundenplan sehen können.\n\n" +
            "Fortfahren?"
        )) {
            return;
        }

        setIsMigrating(true);
        try {
            let lessonsUpdated = 0;
            let lessonsSkipped = 0;

            // 1. Lade alle Lessons des Users
            const lessons = await pb.collection('lessons').getFullList({
                filter: `user_id = '${currentUserId}'`,
            });

            // 2. Lade alle Subjects für class_id Mapping
            const allSubjects = await pb.collection('subjects').getFullList({
                filter: `user_id = '${currentUserId}'`,
            });

            const subjectClassMap = {};
            allSubjects.forEach(s => {
                if (s.class_id) {
                    subjectClassMap[s.id] = s.class_id;
                }
            });

            // 3. Update Lessons ohne class_id
            const lessonsWithoutClassId = lessons.filter(l => !l.class_id);

            for (const lesson of lessonsWithoutClassId) {
                const classId = subjectClassMap[lesson.subject];
                if (!classId) {
                    lessonsSkipped++;
                    continue;
                }

                await pb.collection('lessons').update(lesson.id, { class_id: classId });
                lessonsUpdated++;
            }

            await refreshData();
            toast.success(
                `Migration abgeschlossen!\n` +
                `${lessonsUpdated} Lektionen aktualisiert\n` +
                `${lessonsSkipped} übersprungen (kein Fach zugewiesen)`
            );
        } catch (error) {
            console.error('Error during migration:', error);
            toast.error('Fehler bei der Migration: ' + error.message);
        } finally {
            setIsMigrating(false);
        }
    };

    const activeClassName = classes.find(c => c.id === activeClassId)?.name || '';

    return (
        <div className="space-y-6">
            {/* Klasse auswählen */}
            <div>
                <Label className="text-lg font-semibold text-black dark:text-white">Klasse auswählen</Label>
                <select
                    value={activeClassId || ''}
                    onChange={(e) => setActiveClassId(e.target.value)}
                    className="w-full mt-2 p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-black dark:text-white"
                >
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* Fächer hinzufügen Buttons */}
            <div className="space-y-3">
                <Button
                    onClick={() => setShowLP21Dialog(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={!activeClassId}
                >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Lehrplan 21 Fächer hinzufügen
                </Button>

                {/* Benutzerdefiniertes Fach (eingeklappt) */}
                <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowCustomForm(!showCustomForm)}
                        className="w-full p-3 flex items-center justify-between text-left bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Benutzerdefiniertes Fach hinzufügen
                        </span>
                        {showCustomForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showCustomForm && (
                        <div className="p-4 space-y-4 bg-white dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-600 dark:text-slate-300">Fachname</Label>
                                    <Input
                                        value={newSubject.name}
                                        onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                        placeholder="z.B. Projektarbeit"
                                        className="bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-black dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-600 dark:text-slate-300">Lektionen/Woche</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={newSubject.lessons_per_week}
                                        onChange={(e) => setNewSubject({ ...newSubject, lessons_per_week: Number(e.target.value) })}
                                        className="bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-black dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600 dark:text-slate-300">Farbe wählen</Label>
                                <div className="flex flex-wrap gap-2 items-center">
                                    {PRESET_COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                                                newSubject.color === color ? 'border-black dark:border-white scale-110 shadow-lg' : 'border-slate-300 dark:border-slate-500'
                                            }`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => { setNewSubject({ ...newSubject, color }); setShowColorPicker(false); }}
                                        />
                                    ))}
                                    <button
                                        type="button"
                                        className="w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-500 bg-gradient-to-br from-red-500 via-green-500 to-blue-500 hover:scale-110 transition-all flex items-center justify-center"
                                        onClick={() => setShowColorPicker(!showColorPicker)}
                                    >
                                        <span className="text-black dark:text-white text-xs font-bold">...</span>
                                    </button>
                                    {showColorPicker && (
                                        <Input
                                            type="color"
                                            value={newSubject.color}
                                            onChange={(e) => setNewSubject({ ...newSubject, color: e.target.value })}
                                            className="w-14 h-10 p-1 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600 dark:text-slate-300">Emoji auswählen (optional)</Label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        className="w-10 h-10 rounded-lg border-2 border-slate-300 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center text-2xl"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    >
                                        {newSubject.emoji || '📚'}
                                    </button>
                                    {showEmojiPicker && (
                                        <div className="absolute z-10 mt-2 p-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-y-auto grid grid-cols-5 gap-2">
                                            {PRESET_EMOJIS.map(emoji => (
                                                <button
                                                    key={emoji}
                                                    type="button"
                                                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center text-2xl ${
                                                        newSubject.emoji === emoji ? 'border-black dark:border-white scale-110 shadow-lg' : 'border-slate-300 dark:border-slate-500'
                                                    }`}
                                                    onClick={() => {
                                                        setNewSubject({ ...newSubject, emoji });
                                                        setShowEmojiPicker(false);
                                                    }}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center text-sm ${
                                                    newSubject.emoji === '' ? 'border-black dark:border-white scale-110 shadow-lg' : 'border-slate-300 dark:border-slate-500'
                                                }`}
                                                onClick={() => {
                                                    setNewSubject({ ...newSubject, emoji: '' });
                                                    setShowEmojiPicker(false);
                                                }}
                                            >
                                                ∅
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="new-is-core"
                                    checked={newSubject.is_core_subject || false}
                                    disabled={coreSubjectCount >= 3 && !newSubject.is_core_subject}
                                    onCheckedChange={(checked) => setNewSubject({ ...newSubject, is_core_subject: checked })}
                                />
                                <Label htmlFor="new-is-core" className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                    <Star className="w-4 h-4 text-amber-500" />
                                    Kernfach {coreSubjectCount >= 3 && !newSubject.is_core_subject && <span className="text-xs text-slate-400">(Max. 3 erreicht)</span>}
                                </Label>
                            </div>
                            <Button onClick={handleAddCustomSubject} disabled={!activeClassId || !newSubject.name.trim()} className="w-full bg-green-600 hover:bg-green-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Hinzufügen
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Bestehende Fächer */}
            <div className="space-y-4">
                {/* LP21 Fächer Sektion */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-black dark:text-white">
                            Lehrplan 21 Fächer für "{activeClassName}"
                            {detectedZyklus && (
                                <span className="ml-2 text-sm font-normal text-blue-600 dark:text-blue-400">
                                    — {detectedZyklus.name}
                                </span>
                            )}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            {lp21Subjects.length} Fächer
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Ziehe die Fächer per Drag & Drop, um die Reihenfolge zu ändern</p>
                        <div className="flex gap-2">
                            {lp21Subjects.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCleanupFachbereiche}
                                    disabled={isCleaningUp}
                                    className="text-xs h-7 px-2 text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-900/20"
                                    title="Ersetzt alle benutzerdefinierten Fachbereiche durch LP21-Standard-Fachbereiche"
                                >
                                    <RefreshCw className={`w-3 h-3 mr-1 ${isCleaningUp ? 'animate-spin' : ''}`} />
                                    {isCleaningUp ? 'Bereinige...' : 'Fachbereiche bereinigen'}
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleMigrateClassIds}
                                disabled={isMigrating}
                                className="text-xs h-7 px-2 text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/20"
                                title="Weist allen Lektionen eine Klassen-ID zu (für Schüler-Stundenplan)"
                            >
                                <Database className={`w-3 h-3 mr-1 ${isMigrating ? 'animate-pulse' : ''}`} />
                                {isMigrating ? 'Migriere...' : 'Daten migrieren'}
                            </Button>
                        </div>
                    </div>
                </div>

                {sortedSubjectsForClass.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                        <BookOpen className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">Noch keine Fächer vorhanden</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Klicken Sie auf "Lehrplan 21 Fächer hinzufügen"</p>
                    </div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={sortedSubjectsForClass.map(s => s.id)} strategy={verticalListSortingStrategy}>
                            {/* LP21 Fächer */}
                            {lp21Subjects.length > 0 && (
                                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 mb-4">
                                    <div className="divide-y divide-slate-300 dark:divide-slate-700">
                                        {lp21Subjects.map(subject => (
                                        <SortableSubjectItem key={subject.id} subject={subject}>
                                            <div className="p-3">
                                                {editingSubjectId === subject.id ? (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <Input
                                                                value={editingSubjectData?.name || ''}
                                                                onChange={(e) => handleLocalUpdate('name', e.target.value)}
                                                                className="bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-black dark:text-white"
                                                            />
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                value={editingSubjectData?.lessons_per_week || 4}
                                                                onChange={(e) => handleLocalUpdate('lessons_per_week', Number(e.target.value))}
                                                                className="bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-black dark:text-white"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-slate-600 dark:text-slate-300">Farbe wählen</Label>
                                                            <div className="flex flex-wrap gap-2 items-center">
                                                                {PRESET_COLORS.map(color => (
                                                                    <button
                                                                        key={color}
                                                                        type="button"
                                                                        className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                                                                            editingSubjectData?.color === color ? 'border-black dark:border-white scale-110' : 'border-slate-300 dark:border-slate-500'
                                                                        }`}
                                                                        style={{ backgroundColor: color }}
                                                                        onClick={() => { handleLocalUpdate('color', color); setEditingShowColorPicker(false); }}
                                                                    />
                                                                ))}
                                                                <button
                                                                    type="button"
                                                                    className="w-7 h-7 rounded-full border-2 border-slate-300 dark:border-slate-500 bg-gradient-to-br from-red-500 via-green-500 to-blue-500 hover:scale-110 transition-all flex items-center justify-center"
                                                                    onClick={() => setEditingShowColorPicker(!editingShowColorPicker)}
                                                                >
                                                                    <span className="text-black dark:text-white text-xs font-bold">...</span>
                                                                </button>
                                                                {editingShowColorPicker && (
                                                                    <Input
                                                                        type="color"
                                                                        value={editingSubjectData?.color || '#3b82f6'}
                                                                        onChange={(e) => handleLocalUpdate('color', e.target.value)}
                                                                        className="w-14 h-10 p-1 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-slate-600 dark:text-slate-300">Emoji auswählen (optional)</Label>
                                                            <div className="relative">
                                                                <button
                                                                    type="button"
                                                                    className="w-10 h-10 rounded-lg border-2 border-slate-300 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center text-2xl"
                                                                    onClick={() => setEditingShowEmojiPicker(!editingShowEmojiPicker)}
                                                                >
                                                                    {editingSubjectData?.emoji || '📚'}
                                                                </button>
                                                                {editingShowEmojiPicker && (
                                                                    <div className="absolute z-10 mt-2 p-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-y-auto grid grid-cols-5 gap-2">
                                                                        {PRESET_EMOJIS.map(emoji => (
                                                                            <button
                                                                                key={emoji}
                                                                                type="button"
                                                                                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center text-2xl ${
                                                                                    editingSubjectData?.emoji === emoji ? 'border-black dark:border-white scale-110 shadow-lg' : 'border-slate-300 dark:border-slate-500'
                                                                                }`}
                                                                                onClick={() => {
                                                                                    handleLocalUpdate('emoji', emoji);
                                                                                    setEditingShowEmojiPicker(false);
                                                                                }}
                                                                            >
                                                                                {emoji}
                                                                            </button>
                                                                        ))}
                                                                        <button
                                                                            type="button"
                                                                            className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center text-sm ${
                                                                                editingSubjectData?.emoji === '' ? 'border-black dark:border-white scale-110 shadow-lg' : 'border-slate-300 dark:border-slate-500'
                                                                            }`}
                                                                            onClick={() => {
                                                                                handleLocalUpdate('emoji', '');
                                                                                setEditingShowEmojiPicker(false);
                                                                            }}
                                                                        >
                                                                            ∅
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`edit-is-core-${subject.id}`}
                                                                checked={editingSubjectData?.is_core_subject || false}
                                                                disabled={coreSubjectCount >= 3 && !editingSubjectData?.is_core_subject}
                                                                onCheckedChange={(checked) => handleLocalUpdate('is_core_subject', checked)}
                                                            />
                                                            <Label htmlFor={`edit-is-core-${subject.id}`} className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                                                <Star className="w-4 h-4 text-amber-500" />
                                                                Kernfach {coreSubjectCount >= 3 && !editingSubjectData?.is_core_subject && <span className="text-xs text-slate-400">(Max. 3)</span>}
                                                            </Label>
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setEditingSubjectId(null);
                                                                    setEditingSubjectData(null);
                                                                    setEditingShowColorPicker(false);
                                                                    setEditingShowEmojiPicker(false);
                                                                }}
                                                            >
                                                                Abbrechen
                                                            </Button>
                                                            <Button size="sm" onClick={async () => {
                                                                if (editingSubjectId && editingSubjectData) {
                                                                    await handleUpdateSubject(editingSubjectId, editingSubjectData);
                                                                }
                                                                setEditingSubjectId(null);
                                                                setEditingSubjectData(null);
                                                                setEditingShowColorPicker(false);
                                                                setEditingShowEmojiPicker(false);
                                                            }} className="bg-green-600 hover:bg-green-700">
                                                                <Check className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: subject.color }}></div>
                                                            <span className="font-medium text-black dark:text-white">{subject.name}</span>
                                                            <span className="text-sm text-slate-600 dark:text-slate-400">({subject.lessons_per_week} L/W)</span>
                                                            <span className="text-xl">{subject.emoji || '📚'}</span>
                                                            {subject.lp21_id && (
                                                                <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                                                    LP21
                                                                </span>
                                                            )}
                                                            {subject.is_core_subject && (
                                                                <span className="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded font-medium flex items-center gap-1">
                                                                    <Star className="w-3 h-3" />
                                                                    Kernfach
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => {
                                                                setEditingSubjectId(subject.id);
                                                                setEditingSubjectData({
                                                                    name: subject.name,
                                                                    color: subject.color,
                                                                    emoji: subject.emoji || '',
                                                                    lessons_per_week: subject.lessons_per_week,
                                                                    is_core_subject: subject.is_core_subject || false
                                                                });
                                                                setEditingShowColorPicker(false);
                                                                setEditingShowEmojiPicker(false);
                                                            }}>
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500" onClick={() => handleDeleteSubject(subject.id)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </SortableSubjectItem>
                                    ))}
                                    </div>
                                </div>
                            )}

                            {/* Benutzerdefinierte Fächer */}
                            {customSubjects.length > 0 && (
                                <>
                                    <div className="flex items-center justify-between mt-4 mb-2">
                                        <h4 className="font-medium text-slate-700 dark:text-slate-300">
                                            Benutzerdefinierte Fächer
                                        </h4>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {customSubjects.length} Fächer
                                        </span>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700">
                                        <div className="divide-y divide-slate-300 dark:divide-slate-700">
                                            {customSubjects.map(subject => (
                                                <SortableSubjectItem key={subject.id} subject={subject}>
                                                    <div className="p-3">
                                                        {editingSubjectId === subject.id ? (
                                                            <div className="space-y-3">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <Input
                                                                        value={editingSubjectData?.name || ''}
                                                                        onChange={(e) => handleLocalUpdate('name', e.target.value)}
                                                                        className="bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-black dark:text-white"
                                                                    />
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        value={editingSubjectData?.lessons_per_week || 4}
                                                                        onChange={(e) => handleLocalUpdate('lessons_per_week', Number(e.target.value))}
                                                                        className="bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-black dark:text-white"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-slate-600 dark:text-slate-300">Farbe wählen</Label>
                                                                    <div className="flex flex-wrap gap-2 items-center">
                                                                        {PRESET_COLORS.map(color => (
                                                                            <button
                                                                                key={color}
                                                                                type="button"
                                                                                className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                                                                                    editingSubjectData?.color === color ? 'border-black dark:border-white scale-110' : 'border-slate-300 dark:border-slate-500'
                                                                                }`}
                                                                                style={{ backgroundColor: color }}
                                                                                onClick={() => { handleLocalUpdate('color', color); setEditingShowColorPicker(false); }}
                                                                            />
                                                                        ))}
                                                                        <button
                                                                            type="button"
                                                                            className="w-7 h-7 rounded-full border-2 border-slate-300 dark:border-slate-500 bg-gradient-to-br from-red-500 via-green-500 to-blue-500 hover:scale-110 transition-all flex items-center justify-center"
                                                                            onClick={() => setEditingShowColorPicker(!editingShowColorPicker)}
                                                                        >
                                                                            <span className="text-black dark:text-white text-xs font-bold">...</span>
                                                                        </button>
                                                                        {editingShowColorPicker && (
                                                                            <Input
                                                                                type="color"
                                                                                value={editingSubjectData?.color || '#3b82f6'}
                                                                                onChange={(e) => handleLocalUpdate('color', e.target.value)}
                                                                                className="w-14 h-10 p-1 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-slate-600 dark:text-slate-300">Emoji auswählen (optional)</Label>
                                                                    <div className="relative">
                                                                        <button
                                                                            type="button"
                                                                            className="w-10 h-10 rounded-lg border-2 border-slate-300 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center text-2xl"
                                                                            onClick={() => setEditingShowEmojiPicker(!editingShowEmojiPicker)}
                                                                        >
                                                                            {editingSubjectData?.emoji || '📚'}
                                                                        </button>
                                                                        {editingShowEmojiPicker && (
                                                                            <div className="absolute z-10 mt-2 p-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-y-auto grid grid-cols-5 gap-2">
                                                                                {PRESET_EMOJIS.map(emoji => (
                                                                                    <button
                                                                                        key={emoji}
                                                                                        type="button"
                                                                                        className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center text-2xl ${
                                                                                            editingSubjectData?.emoji === emoji ? 'border-black dark:border-white scale-110 shadow-lg' : 'border-slate-300 dark:border-slate-500'
                                                                                        }`}
                                                                                        onClick={() => {
                                                                                            handleLocalUpdate('emoji', emoji);
                                                                                            setEditingShowEmojiPicker(false);
                                                                                        }}
                                                                                    >
                                                                                        {emoji}
                                                                                    </button>
                                                                                ))}
                                                                                <button
                                                                                    type="button"
                                                                                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center text-sm ${
                                                                                        editingSubjectData?.emoji === '' ? 'border-black dark:border-white scale-110 shadow-lg' : 'border-slate-300 dark:border-slate-500'
                                                                                    }`}
                                                                                    onClick={() => {
                                                                                        handleLocalUpdate('emoji', '');
                                                                                        setEditingShowEmojiPicker(false);
                                                                                    }}
                                                                                >
                                                                                    ∅
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <Checkbox
                                                                        id={`edit-is-core-${subject.id}`}
                                                                        checked={editingSubjectData?.is_core_subject || false}
                                                                        disabled={coreSubjectCount >= 3 && !editingSubjectData?.is_core_subject}
                                                                        onCheckedChange={(checked) => handleLocalUpdate('is_core_subject', checked)}
                                                                    />
                                                                    <Label htmlFor={`edit-is-core-${subject.id}`} className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                                                        <Star className="w-4 h-4 text-amber-500" />
                                                                        Kernfach {coreSubjectCount >= 3 && !editingSubjectData?.is_core_subject && <span className="text-xs text-slate-400">(Max. 3)</span>}
                                                                    </Label>
                                                                </div>
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => {
                                                                            setEditingSubjectId(null);
                                                                            setEditingSubjectData(null);
                                                                            setEditingShowColorPicker(false);
                                                                            setEditingShowEmojiPicker(false);
                                                                        }}
                                                                    >
                                                                        Abbrechen
                                                                    </Button>
                                                                    <Button size="sm" onClick={async () => {
                                                                        if (editingSubjectId && editingSubjectData) {
                                                                            await handleUpdateSubject(editingSubjectId, editingSubjectData);
                                                                        }
                                                                        setEditingSubjectId(null);
                                                                        setEditingSubjectData(null);
                                                                        setEditingShowColorPicker(false);
                                                                        setEditingShowEmojiPicker(false);
                                                                    }} className="bg-green-600 hover:bg-green-700">
                                                                        <Check className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: subject.color }}></div>
                                                                    <span className="font-medium text-black dark:text-white">{subject.name}</span>
                                                                    <span className="text-sm text-slate-600 dark:text-slate-400">({subject.lessons_per_week} L/W)</span>
                                                                    <span className="text-xl">{subject.emoji || '📚'}</span>
                                                                    {subject.is_core_subject && (
                                                                        <span className="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded font-medium flex items-center gap-1">
                                                                            <Star className="w-3 h-3" />
                                                                            Kernfach
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => {
                                                                        setEditingSubjectId(subject.id);
                                                                        setEditingSubjectData({
                                                                            name: subject.name,
                                                                            color: subject.color,
                                                                            emoji: subject.emoji || '',
                                                                            lessons_per_week: subject.lessons_per_week,
                                                                            is_core_subject: subject.is_core_subject || false
                                                                        });
                                                                        setEditingShowColorPicker(false);
                                                                        setEditingShowEmojiPicker(false);
                                                                    }}>
                                                                        <Edit className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500" onClick={() => handleDeleteSubject(subject.id)}>
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </SortableSubjectItem>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* LP21 Subject Selector Dialog */}
            <Dialog open={showLP21Dialog} onOpenChange={setShowLP21Dialog}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 z-[1010]" overlayClassName="z-[1010]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                            Lehrplan 21 Fächer hinzufügen
                        </DialogTitle>
                    </DialogHeader>

                    <LP21SubjectSelector
                        selectedZyklus={selectedZyklus}
                        onZyklusChange={setSelectedZyklus}
                        selectedSubjects={selectedLP21Subjects}
                        onSubjectsChange={setSelectedLP21Subjects}
                        existingSubjectIds={existingLp21Ids}
                        showZyklusSelector={true}
                        compact={false}
                    />

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button variant="outline" onClick={() => setShowLP21Dialog(false)}>
                            Abbrechen
                        </Button>
                        <Button
                            onClick={handleAddLP21Subjects}
                            disabled={selectedLP21Subjects.length === 0 || isAddingLP21Subjects}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isAddingLP21Subjects ? 'Wird hinzugefügt...' : `${selectedLP21Subjects.length} Fächer hinzufügen`}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SubjectSettings;
