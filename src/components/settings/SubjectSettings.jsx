import React, { useState, useMemo } from 'react';
import { Subject, Lesson, YearlyLesson, Topic, Performance, Fachbereich, Setting } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit, Check, GripVertical, Star } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';
import pb from '@/api/pb';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
    const [newSubject, setNewSubject] = useState({ name: '', color: '#3b82f6', lessons_per_week: 4, emoji: '', is_core_subject: false });
    const [editingSubjectId, setEditingSubjectId] = useState(null);
    const [editingSubjectData, setEditingSubjectData] = useState(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [editingShowColorPicker, setEditingShowColorPicker] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [editingShowEmojiPicker, setEditingShowEmojiPicker] = useState(false);

    const currentUserId = pb.authStore.model?.id;

    // Zählung der Kernfächer für Validierung (max. 3)
    const coreSubjectCount = useMemo(() => {
        return subjects.filter(s => s.class_id === activeClassId && s.is_core_subject).length;
    }, [subjects, activeClassId]);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Mindestens 8px Bewegung zum Aktivieren
            },
        })
    );

    // Sortierte Fächer für die aktive Klasse
    const sortedSubjectsForClass = useMemo(() => {
        return subjects
            .filter(s => s.class_id === activeClassId)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }, [subjects, activeClassId]);

    // Drag End Handler
    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const oldIndex = sortedSubjectsForClass.findIndex(s => s.id === active.id);
        const newIndex = sortedSubjectsForClass.findIndex(s => s.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const reorderedSubjects = arrayMove(sortedSubjectsForClass, oldIndex, newIndex);

        // sort_order für alle Fächer aktualisieren
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

    const handleAddSubject = async () => {
        if (!newSubject.name.trim() || !activeClassId || !currentUserId) {
            toast.error('Name und Klasse sind erforderlich.');
            return;
        }

        try {
            await Subject.create({ 
                ...newSubject, 
                class_id: activeClassId,
                user_id: currentUserId   // ← WICHTIG: Immer setzen!
            });
            setNewSubject({ name: '', color: '#3b82f6', lessons_per_week: 4, emoji: '', is_core_subject: false });
            setShowColorPicker(false);
            setShowEmojiPicker(false);
            await refreshData();
            toast.success('Fach erfolgreich hinzugefügt.');
        } catch (error) {
            console.error('Error adding subject:', error);
            toast.error('Fehler beim Hinzufügen des Fachs.');
        }
    };

    // Lokale Änderungen im Edit-Modus (kein DB-Aufruf)
    const handleLocalUpdate = (field, value) => {
        setEditingSubjectData(prev => ({ ...prev, [field]: value }));
    };

    // Speichert alle Änderungen in die DB (wird beim Check-Button aufgerufen)
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

    const handleDeleteSubject = async (id) => {
        if (!window.confirm("Sind Sie sicher? Dies löscht alle Lektionen, Noten und Fachbereiche dieses Fachs. Themen werden archiviert und können später wiederverwendet werden. Fortfahren?")) {
            return;
        }

        try {
            // 1. Alle abhängigen Records finden
            const [yearlyLessons, lessons, topics, performances, fachbereiche] = await Promise.all([
                YearlyLesson.list({ subject: id }),
                Lesson.list({ subject: id }),
                Topic.list({ subject: id }),
                Performance.list({ subject: id }),
                Fachbereich.list({ subject_id: id }),
            ]);

            // 2. Topics archivieren MIT Snapshot (BEVOR YearlyLessons gelöscht werden!)
            // Das ermöglicht spätere Wiederverwendung der Lektionen bei Neuzuweisung
            for (const topic of topics) {
                try {
                    // Finde alle YearlyLessons für dieses Topic
                    const topicYearlyLessons = yearlyLessons.filter(yl => yl.topic_id === topic.id);

                    // Erstelle Snapshot der Lektionen (wie beim Sharing)
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

                    // NEU: Erstelle Topic-Snapshot (wie bei shared_topics)
                    // Sichert materials und lehrplan_kompetenz_ids explizit
                    const topicSnapshot = {
                        name: topic.name || topic.title || 'Unbenanntes Thema',
                        description: topic.description || '',
                        color: topic.color || '#3b82f6',
                        goals: topic.goals || '',
                        materials: topic.materials || [],
                        lehrplan_kompetenz_ids: topic.lehrplan_kompetenz_ids || []
                    };

                    // Topic archivieren mit BEIDEN Snapshots
                    // competency_status_overrides wird gelöscht da die manuellen Status nicht mehr relevant sind
                    await Topic.update(topic.id, {
                        subject: null,
                        lessons_snapshot: lessonsSnapshot.length > 0 ? lessonsSnapshot : null,
                        topic_snapshot: topicSnapshot,
                        competency_status_overrides: null  // Bereinige manuelle Kompetenz-Status
                    });
                    console.log(`Topic "${topic.name}" archiviert mit ${lessonsSnapshot.length} Lektionen und Topic-Snapshot`);
                } catch (archiveError) {
                    console.warn('Topic archiving failed:', topic.id, archiveError);
                    // Fallback: Topic löschen wenn Archivieren nicht möglich
                    try {
                        await Topic.delete(topic.id);
                    } catch (deleteError) {
                        console.error('Error deleting topic:', deleteError);
                    }
                }
            }

            // 3. Lessons löschen
            await Promise.all(lessons.map(l => Lesson.delete(l.id)));

            // 4. YearlyLessons, Performances und Fachbereiche löschen
            await Promise.all([
                ...yearlyLessons.map(yl => YearlyLesson.delete(yl.id)),
                ...performances.map(p => Performance.delete(p.id)),
                ...fachbereiche.map(f => Fachbereich.delete(f.id)),
            ]);

            // 5. fixedScheduleTemplate bereinigen - Slots für dieses Fach entfernen
            const subjectToDelete = subjects.find(s => s.id === id);
            if (subjectToDelete) {
                try {
                    const settingsList = await Setting.list({ user_id: pb.authStore.model?.id });
                    if (settingsList.length > 0) {
                        const currentSettings = settingsList[0];
                        const template = currentSettings.fixedScheduleTemplate || {};

                        // Entferne alle Slots für dieses Fach aus dem Template
                        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
                        const cleanedTemplate = {};

                        for (const day of days) {
                            if (template[day]) {
                                // Filtere Slots, die NICHT zu diesem Fach gehören
                                cleanedTemplate[day] = template[day].filter(slot =>
                                    slot.subject !== subjectToDelete.name
                                );
                            }
                        }

                        // Speichere das bereinigte Template
                        await Setting.update(currentSettings.id, {
                            fixedScheduleTemplate: cleanedTemplate
                        });
                    }
                } catch (templateError) {
                    console.warn('Failed to clean fixedScheduleTemplate:', templateError);
                }
            }

            // 6. Fach selbst löschen
            await Subject.delete(id);

            await refreshData();
            window.dispatchEvent(new CustomEvent('subject-deleted'));
            toast.success('Fach und Stundenplan-Einträge gelöscht. Themen wurden archiviert.');
        } catch (error) {
            console.error('Error deleting subject:', error);
            toast.error('Fehler beim Löschen: ' + error.message);
        }
    };

    const activeClassName = classes.find(c => c.id === activeClassId)?.name || '';

    return (
        <div className="space-y-6">
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
            
            <div className="p-4 border border-slate-300 dark:border-slate-700 rounded-lg space-y-4 bg-white dark:bg-slate-800">
                <h3 className="font-semibold text-black dark:text-white">Neues Fach hinzufügen</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-300">Fachname</Label>
                            <Input
                                value={newSubject.name}
                                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                placeholder="z.B. Mathematik"
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
                                        Kein Emoji
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
                    <Button onClick={handleAddSubject} disabled={!activeClassId || !newSubject.name.trim()} className="w-full bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2"/>
                        Hinzufügen
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="font-semibold text-black dark:text-white">Bestehende Fächer für "{activeClassName}"</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ziehe die Fächer per Drag & Drop, um die Reihenfolge zu ändern</p>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={sortedSubjectsForClass.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700">
                            <div className="divide-y divide-slate-300 dark:divide-slate-700">
                                {sortedSubjectsForClass.map(subject => (
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
                                                                        Kein Emoji
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
                                                        <span className="text-xl mr-2">{subject.emoji || '📚'}</span>
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
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
};

export default SubjectSettings;