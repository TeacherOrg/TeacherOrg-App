import React, { useState, useEffect, useMemo } from 'react';
import { Performance, Subject, Fachbereich } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, BookOpen, Save, X, Upload, FileText } from 'lucide-react';
import { Badge } from "@/components/ui/badge";


const PerformanceModal = ({ isOpen, onClose, onSave, students = [], subjects = [], activeClassId, editingPerformance }) => {
    const [mode, setMode] = useState('manual');
    const [assessmentName, setAssessmentName] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedFachbereiche, setSelectedFachbereiche] = useState([]);
    const [newFachbereichName, setNewFachbereichName] = useState('');
    const [studentGrades, setStudentGrades] = useState([]);
    const [pasteData, setPasteData] = useState('');
    const [error, setError] = useState('');
    const [allFachbereiche, setAllFachbereiche] = useState([]);
    const [importMode, setImportMode] = useState('nameAndGrade');

    const availableFachbereiche = useMemo(() => {
        if (!selectedSubject) return [];
        return allFachbereiche.filter(fb => fb.subject_name === selectedSubject);
    }, [allFachbereiche, selectedSubject]);

    const fetchFachbereiche = async () => {
        if (activeClassId) {
            try {
                const fbs = await Fachbereich.filter({ class_id: activeClassId });
                setAllFachbereiche(fbs || []);
            } catch (e) {
                console.error("Failed to load fachbereiche", e);
                setAllFachbereiche([]);
            }
        }
    };

    useEffect(() => {
        fetchFachbereiche();
    }, [activeClassId]);
    
    useEffect(() => {
        if (isOpen) {
            // Reset general fields
            setMode('manual');
            setPasteData('');
            setError('');
            setImportMode('nameAndGrade');
            setNewFachbereichName('');

            if (editingPerformance) {
                // Populate state for editing
                setAssessmentName(editingPerformance.assessment_name || '');
                setDate(editingPerformance.date ? editingPerformance.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
                setSelectedSubject(editingPerformance.subject || '');
                setSelectedFachbereiche(editingPerformance.fachbereiche || []);
                const gradesForEdit = students.map(s => {
                    return { student_id: s.id, name: s.name, grade: s.id === editingPerformance.student_id ? editingPerformance.grade : ''};
                });
                setStudentGrades(gradesForEdit);
            } else {
                // Reset state for new entry
                setAssessmentName('');
                setDate(new Date().toISOString().slice(0, 10));
                const firstSubject = subjects.find(s => s.class_id === activeClassId);
                setSelectedSubject(firstSubject ? firstSubject.name : (subjects.length > 0 ? subjects[0].name : ''));
                setSelectedFachbereiche([]);
                setStudentGrades(students.map(s => ({ student_id: s.id, name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim(), grade: '' })));
            }
        }
    }, [isOpen, students, subjects, activeClassId, editingPerformance]);

    const handleAddFachbereich = async () => {
        if (!newFachbereichName.trim() || !selectedSubject) {
            alert("Bitte geben Sie einen Namen für den neuen Fachbereich ein und wählen Sie ein Fach aus.");
            return;
        }
        const existing = allFachbereiche.find(fb => fb.name.toLowerCase() === newFachbereichName.trim().toLowerCase() && fb.subject_name === selectedSubject);
        if (existing) {
            if (!selectedFachbereiche.includes(existing.name)) {
                setSelectedFachbereiche([...selectedFachbereiche, existing.name]);
            }
            setNewFachbereichName('');
            return;
        }
        try {
            const newFb = await Fachbereich.create({ 
                name: newFachbereichName.trim(), 
                class_id: activeClassId,
                subject_name: selectedSubject 
            });
            setAllFachbereiche([...allFachbereiche, newFb]);
            setSelectedFachbereiche([...selectedFachbereiche, newFb.name]);
            setNewFachbereichName('');
        } catch (error) {
            console.error("Fehler beim Erstellen des Fachbereichs:", error);
            setError("Fehler beim Erstellen des Fachbereichs.");
        }
    };

    const handleParsePasteData = () => {
        if (!pasteData) return;
        setError('');
        let newStudentGrades = [...studentGrades];
        
        if (importMode === 'nameAndGrade') {
            const lines = pasteData.trim().split('\n');
            const pastedGrades = lines.map(line => {
                const parts = line.split(/\s+/);
                const grade = parts.pop().replace(',', '.');
                const name = parts.join(' ');
                return { name, grade };
            });

            pastedGrades.forEach(pg => {
                const studentIndex = newStudentGrades.findIndex(sg => (sg.name || '').toLowerCase() === pg.name.toLowerCase());
                if (studentIndex !== -1) {
                    newStudentGrades[studentIndex].grade = pg.grade;
                }
            });

        } else { // gradesOnly mode
            const grades = pasteData.trim().split('\n');
            if (grades.length > newStudentGrades.length) {
                setError(`Sie haben ${grades.length} Noten eingefügt, aber es gibt nur ${newStudentGrades.length} Schüler. Bitte korrigieren Sie die Eingabe.`);
                return;
            }
            grades.forEach((grade, index) => {
                if (newStudentGrades[index]) {
                    newStudentGrades[index].grade = grade.trim().replace(',', '.');
                }
            });
        }
        
        setStudentGrades(newStudentGrades);
        setMode('manual'); // Switch to manual view to see results
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const gradesToSave = studentGrades.filter(sg => sg.grade && sg.grade.toString().trim() !== '');

        if (gradesToSave.length === 0) {
            setError("Bitte geben Sie mindestens eine Note ein.");
            return;
        }

        const performances = gradesToSave.map(sg => ({
            student_id: sg.student_id,
            class_id: activeClassId,
            date,
            subject: selectedSubject,
            assessment_name: assessmentName,
            grade: parseFloat(sg.grade),
            fachbereiche: selectedFachbereiche,
        }));
        
        try {
            // Pass the editingPerformance ID if it exists, so the parent knows what to update
            await onSave(performances, editingPerformance ? editingPerformance.id : null);
            onClose();
        } catch (error) {
            console.error("Fehler beim Speichern der Leistungsbeurteilung:", error);
            setError("Fehler beim Speichern.");
        }
    };
    
    const subjectOptions = [...new Set(subjects.filter(s => s.class_id === activeClassId).map(s => s.name))];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl border-slate-700 bg-slate-900 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                           <BookOpen className="w-5 h-5" />
                        </div>
                        {editingPerformance ? 'Leistungsbeurteilung bearbeiten' : 'Neue Leistungsbeurteilung'}
                    </DialogTitle>
                </DialogHeader>
                {!editingPerformance && (
                    <div className="flex gap-2 mb-4 border-b border-slate-700 pb-4">
                        <Button variant={mode === 'manual' ? 'default' : 'ghost'} onClick={() => setMode('manual')} className={`w-full ${mode === 'manual' ? 'bg-blue-600' : ''}`}>Manuelle Eingabe</Button>
                        <Button variant={mode === 'import' ? 'default' : 'ghost'} onClick={() => setMode('import')} className={`w-full ${mode === 'import' ? 'bg-blue-600' : ''}`}>Noten importieren</Button>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Common Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div>
                            <Label htmlFor="subject">Fach</Label>
                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger id="subject" className="bg-slate-800 border-slate-600">
                                    <SelectValue placeholder="Fach auswählen" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjectOptions.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="assessmentName">Prüfungsname</Label>
                            <Input id="assessmentName" value={assessmentName} onChange={e => setAssessmentName(e.target.value)} required className="bg-slate-800 border-slate-600" />
                        </div>
                        <div>
                            <Label htmlFor="date">Datum</Label>
                            <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="bg-slate-800 border-slate-600" />
                        </div>
                    </div>
                    
                    {/* Fachbereiche */}
                    <div>
                        <Label>Fachbereiche (Optional)</Label>
                        <div className="flex gap-2 items-center mt-1">
                            <Select onValueChange={(value) => !selectedFachbereiche.includes(value) && setSelectedFachbereiche([...selectedFachbereiche, value])}>
                                <SelectTrigger className="flex-1 bg-slate-800 border-slate-600">
                                    <SelectValue placeholder="Bestehenden Fachbereich auswählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableFachbereiche.map(fb => (
                                        <SelectItem key={fb.id} value={fb.name} disabled={selectedFachbereiche.includes(fb.name)}>{fb.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input 
                                value={newFachbereichName}
                                onChange={e => setNewFachbereichName(e.target.value)}
                                placeholder="Oder neuen Fachbereich erstellen"
                                className="flex-1 bg-slate-800 border-slate-600"
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddFachbereich())}
                            />
                            <Button type="button" size="icon" onClick={handleAddFachbereich} className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {selectedFachbereiche.map((fbName) => (
                                <Badge key={fbName} variant="secondary" className="bg-slate-700 text-white flex items-center gap-1.5 py-1 px-2">
                                    {fbName}
                                    <button type="button" onClick={() => setSelectedFachbereiche(selectedFachbereiche.filter(name => name !== fbName))} className="text-slate-400 hover:text-white rounded-full hover:bg-slate-600 p-0.5">
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Grades Input */}
                    {mode === 'manual' && (
                        <div>
                            <Label>Noten</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-1 max-h-[30vh] overflow-y-auto p-2 bg-slate-800/50 rounded-lg">
                                {studentGrades.map((sg, index) => (
                                    <div key={sg.student_id} className="flex items-center justify-between p-2 bg-slate-800 rounded">
                                        <Label htmlFor={`grade-${sg.student_id}`} className="flex-1 truncate text-sm" title={sg.name}>{sg.name}</Label>
                                        <Input
                                            id={`grade-${sg.student_id}`}
                                            type="number"
                                            step="0.1"
                                            min="1"
                                            max="6"
                                            value={sg.grade}
                                            onChange={e => {
                                                const newGrades = [...studentGrades];
                                                newGrades[index].grade = e.target.value;
                                                setStudentGrades(newGrades);
                                            }}
                                            className="w-20 bg-slate-700 border-slate-600"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {mode === 'import' && (
                        <div>
                            <div className="flex gap-4 my-2">
                                <div className="flex items-center gap-2">
                                    <input type="radio" id="modeNameAndGrade" name="importMode" value="nameAndGrade" checked={importMode === 'nameAndGrade'} onChange={() => setImportMode('nameAndGrade')} />
                                    <Label htmlFor="modeNameAndGrade">Name & Note</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="radio" id="modeGradesOnly" name="importMode" value="gradesOnly" checked={importMode === 'gradesOnly'} onChange={() => setImportMode('gradesOnly')} />
                                    <Label htmlFor="modeGradesOnly">Nur Noten (in Schülerreihenfolge)</Label>
                                </div>
                            </div>
                            <Textarea
                                value={pasteData}
                                onChange={e => setPasteData(e.target.value)}
                                placeholder={importMode === 'nameAndGrade' ? "Max Mustermann 5.5\nErika Musterfrau 4.0" : "5.5\n4.0\n..."}
                                className="h-32 bg-slate-800 border-slate-600"
                            />
                            <Button type="button" onClick={handleParsePasteData} className="mt-2 bg-green-600 hover:bg-green-700">Daten verarbeiten & Vorschau</Button>
                            {error && <p className="text-red-500 mt-2">{error}</p>}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                        <Button type="button" variant="outline" onClick={onClose} className="bg-slate-700 hover:bg-slate-600">Abbrechen</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Speichern</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default PerformanceModal;