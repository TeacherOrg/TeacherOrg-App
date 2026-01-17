// In src/components/grades/PerformanceModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, BookOpen, Save, X, Upload, FileText } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Performance, Fachbereich, User } from '@/api/entities';
import { useStudentSortPreference } from '@/hooks/useStudentSortPreference';
import { sortStudents } from '@/utils/studentSortUtils';

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
  const [importMode, setImportMode] = useState('gradesOnly');
  const [weight, setWeight] = useState(1); // ← State mit Default = 1
  const [sortPreference] = useStudentSortPreference();

  const sortedStudents = useMemo(() =>
    sortStudents(students, sortPreference),
    [students, sortPreference]
  );

  const availableFachbereiche = useMemo(() => {
    if (!selectedSubject) return [];
    return allFachbereiche.filter(fb => fb.subject_id === selectedSubject);
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
      setMode('manual');
      setPasteData('');
      setError('');
      setImportMode('gradesOnly');
      setNewFachbereichName('');
      setWeight(1); // ← Reset weight on open

      if (editingPerformance) {
        setAssessmentName(editingPerformance.assessment_name || '');
        setDate(editingPerformance.date ? editingPerformance.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
        setSelectedSubject(editingPerformance.subject || '');
        setSelectedFachbereiche(editingPerformance.fachbereiche || []);
        setWeight(editingPerformance?.weight ?? 1); // ← Load weight if editing, default to 1
        const gradesForEdit = sortedStudents.map(s => ({
          student_id: s.id,
          name: s.name,
          grade: s.id === editingPerformance.student_id ? editingPerformance.grade : ''
        }));
        setStudentGrades(gradesForEdit);
      } else {
        setAssessmentName('');
        setDate(new Date().toISOString().slice(0, 10));
        const firstSubject = (subjects || []).find(s => s.class_id === activeClassId);
        setSelectedSubject(firstSubject ? firstSubject.id : '');
        setSelectedFachbereiche([]);
        setStudentGrades(sortedStudents.map(s => ({
          student_id: s.id,
          name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
          grade: ''
        })));
      }
    }
  }, [isOpen, students, subjects, activeClassId, editingPerformance, sortedStudents]);

  const handleAddFachbereich = async () => {
    if (!newFachbereichName.trim() || !selectedSubject || !activeClassId) {
      setError("Bitte geben Sie einen Namen für den neuen Fachbereich ein und wählen Sie ein Fach und eine Klasse aus.");
      return;
    }
    const user = User.current();
    if (!user) {
      setError("Kein Benutzer eingeloggt.");
      return;
    }
    const subject = subjects.find(s => s.id === selectedSubject);
    if (!subject) {
      setError("Ungültiges Fach ausgewählt. Bitte wählen Sie ein gültiges Fach.");
      return;
    }
    const existing = allFachbereiche.find(fb => fb.name.toLowerCase() === newFachbereichName.trim().toLowerCase() && fb.subject_id === selectedSubject);
    if (existing) {
      if (!selectedFachbereiche.includes(existing.name)) {
        setSelectedFachbereiche([...selectedFachbereiche, existing.name]);
      }
      setNewFachbereichName('');
      setError('');
      return;
    }
    try {
      console.log('Fachbereich create data:', {
        name: newFachbereichName.trim(),
        class_id: activeClassId,
        subject_id: selectedSubject,
        user_id: user.id,
        description: ''
      });
      const newFb = await Fachbereich.create({
        name: newFachbereichName.trim(),
        class_id: activeClassId,
        subject_id: selectedSubject,
        user_id: user.id,
        description: ''
      });
      setAllFachbereiche([...allFachbereiche, newFb]);
      setSelectedFachbereiche([...selectedFachbereiche, newFb.name]);
      setNewFachbereichName('');
      setError('');
    } catch (error) {
      console.error("Fehler beim Erstellen des Fachbereichs:", error);
      setError(`Fehler beim Erstellen des Fachbereichs: ${error.message || 'Unbekannter Fehler'}`);
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
    } else {
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
    setMode('manual');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = User.current();
    if (!user) {
      setError("Kein Benutzer eingeloggt.");
      return;
    }
    if (!selectedSubject) {
      setError("Bitte wählen Sie ein Fach aus.");
      return;
    }
    const gradesToSave = studentGrades.filter(sg => sg.grade && sg.grade.toString().trim() !== '');

    if (gradesToSave.length === 0) {
      setError("Bitte geben Sie mindestens eine Note ein.");
      return;
    }

    const effectiveWeight = weight ?? 1;  // nur wenn null → 1, sonst exakter Wert
    const performances = gradesToSave.map(sg => {
      const grade = parseFloat(sg.grade);
      if (isNaN(grade) || grade < 0 || grade > 6) {
        throw new Error(`Ungültige Note für ${sg.name}: ${sg.grade}. Noten müssen zwischen 0 und 6 liegen.`);
      }
      return {
        student_id: sg.student_id,
        class_id: activeClassId,
        date,
        subject: selectedSubject,
        assessment_name: assessmentName,
        grade,
        weight: effectiveWeight, // ← Include weight
        fachbereiche: selectedFachbereiche,
        user_id: user.id
      };
    });

    try {
      await onSave(performances, editingPerformance ? editingPerformance.id : null);
      onClose();
    } catch (error) {
      console.error("Fehler beim Speichern der Leistungsbeurteilung:", error);
      setError(`Fehler beim Speichern: ${error.message || 'Unbekannter Fehler'}`);
    }
  };

  const subjectOptions = [...new Set(subjects.filter(s => s.class_id === activeClassId).map(s => s.id))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[95vh] overflow-hidden flex flex-col border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-0">
        <DialogHeader className="flex-shrink-0 p-6 border-b border-slate-200 dark:border-slate-700">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            {editingPerformance ? 'Leistungsbeurteilung bearbeiten' : 'Neue Leistungsbeurteilung'}
          </DialogTitle>
          <DialogDescription>
            {editingPerformance ? 'Bearbeiten Sie die Details der Leistungsbeurteilung.' : 'Erstellen Sie eine neue Leistungsbeurteilung für die ausgewählte Klasse.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {!editingPerformance && (
            <div className="flex gap-2 px-6 pt-4 pb-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <Button variant={mode === 'manual' ? 'default' : 'ghost'} onClick={() => setMode('manual')} className={`w-full ${mode === 'manual' ? 'bg-blue-600' : ''}`}>Manuelle Eingabe</Button>
              <Button variant={mode === 'import' ? 'default' : 'ghost'} onClick={() => setMode('import')} className={`w-full ${mode === 'import' ? 'bg-blue-600' : ''}`}>Noten importieren</Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="subject">Fach</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger id="subject" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                    <SelectValue placeholder="Fach auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.filter(s => s.class_id === activeClassId).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="assessmentName">Prüfungsname</Label>
                <Input id="assessmentName" value={assessmentName} onChange={e => setAssessmentName(e.target.value)} required className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
              </div>
              <div>
                <Label htmlFor="date">Datum</Label>
                <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
              </div>
            </div>
            <div>
              <Label>Fachbereiche (Optional)</Label>
              <div className="flex gap-2 items-center mt-1">
                <Select onValueChange={(value) => !selectedFachbereiche.includes(value) && setSelectedFachbereiche([...selectedFachbereiche, value])}>
                  <SelectTrigger className="flex-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
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
                  className="flex-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddFachbereich())}
                />
                <Button type="button" size="icon" onClick={handleAddFachbereich} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedFachbereiche.map((fbName) => (
                  <Badge key={fbName} variant="secondary" className="bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white flex items-center gap-1.5 py-1 px-2">
                    {fbName}
                    <button type="button" onClick={() => setSelectedFachbereiche(selectedFachbereiche.filter(name => name !== fbName))} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Gewichtung</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="10"
                placeholder="1"
                value={weight === null ? '' : weight}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setWeight(null);
                  } else {
                    const num = parseFloat(val);
                    if (!isNaN(num) && num >= 0 && num <= 10) {
                      setWeight(num);
                    }
                    // sonst ignorieren
                  }
                }}
                className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
              />
              <p className="text-xs text-muted-foreground">
                Standard = 1 | Klausur = 3 | Stegreif = 0.5 | mündlich = 1
              </p>
            </div>
            {mode === 'import' && (
              <div>
                <div className="flex gap-4 my-2">
                  <div className="flex items-center gap-2">
                    <input type="radio" id="modeGradesOnly" name="importMode" value="gradesOnly" checked={importMode === 'gradesOnly'} onChange={() => setImportMode('gradesOnly')} />
                    <Label htmlFor="modeGradesOnly">Nur Noten (in Schülerreihenfolge)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="radio" id="modeNameAndGrade" name="importMode" value="nameAndGrade" checked={importMode === 'nameAndGrade'} onChange={() => setImportMode('nameAndGrade')} />
                    <Label htmlFor="modeNameAndGrade">Name & Note</Label>
                  </div>
                </div>
                <Textarea
                  value={pasteData}
                  onChange={e => setPasteData(e.target.value)}
                  placeholder={importMode === 'nameAndGrade' ? "Max Mustermann 5.5\nErika Musterfrau 4.0" : "5.5\n4.0\n..."}
                  className="h-32 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                />
                <Button type="button" onClick={handleParsePasteData} className="mt-2 bg-green-600 hover:bg-green-700">Daten verarbeiten & Vorschau</Button>
                {error && <p className="text-red-500 mt-2">{error}</p>}
              </div>
            )}
            <div>
              <Label>Noten</Label>
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                {studentGrades.map((sg, index) => (
                  <div key={sg.student_id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-transparent">
                    <Label htmlFor={`grade-${sg.student_id}`} className="flex-1 truncate text-sm" title={sg.name}>{sg.name}</Label>
                    <Input
                      id={`grade-${sg.student_id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="6"
                      value={sg.grade}
                      onChange={e => {
                        const newGrades = [...studentGrades];
                        newGrades[index].grade = e.target.value;
                        setStudentGrades(newGrades);
                      }}
                      className="w-20 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border-slate-300 dark:border-slate-600">Abbrechen</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Speichern</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PerformanceModal;