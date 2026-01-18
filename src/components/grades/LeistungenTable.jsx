import React, { useState, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Performance, User } from '@/api/entities';
import { ChevronDown, ChevronUp, Edit, Trash2, Save, X, Plus, Eye } from 'lucide-react';
import { useStudentSortPreference } from '@/hooks/useStudentSortPreference';
import { sortStudents } from '@/utils/studentSortUtils';
import { getTextColor } from '@/utils/colorUtils';

// 5-Stufen-Farbsystem für Noten (Schweizer Notensystem 1-6, 6 ist beste)
const getGradeColor = (grade) => {
  if (grade === null || grade === undefined || grade === 0) {
    return { text: 'text-slate-500 dark:text-slate-400', bg: '' };
  }
  if (grade >= 5.0) return { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' };
  if (grade >= 4.5) return { text: 'text-green-500 dark:text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' };
  if (grade >= 4.0) return { text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' };
  if (grade >= 3.5) return { text: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' };
  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' };
};

// Bug 4 Fix: savePreferences als Prop erhalten, keine doppelte Preference-Ladung
const LeistungenTable = ({
  performances = [],
  students = [],
  subjects = [],
  fachbereiche = [],
  activeClassId,
  onEdit,
  onDelete,
  onDataChange,
  expandedRows,
  setExpandedRows,
  savePreferences,
  canEdit = true,
  onCreatePerformance,
  viewOnly = false
}) => {
  const { toast } = useToast();
  const [sortPreference] = useStudentSortPreference();
  const sortedStudents = useMemo(() => sortStudents(students, sortPreference), [students, sortPreference]);
  const [editingGrades, setEditingGrades] = useState({});
  const [editingFachbereiche, setEditingFachbereiche] = useState({});
  const [sortBy, setSortBy] = useState('date');
  const [filterSubject, setFilterSubject] = useState('all');

  // Bug 4 Fix: ENTFERNT - Doppelte loadPreferences und saveExpandedRows
  // Die Daten kommen jetzt via Props aus dem usePreferences Hook

  // Vereinfachte saveExpandedRows - nutzt jetzt den Hook's savePreferences
  const saveExpandedRows = useCallback((rows) => {
    if (savePreferences) {
      savePreferences({
        expandedLeistungenRows: Array.from(rows)
      });
    }
  }, [savePreferences]);

  // Helper: Fachfarbe aus subjects Array holen
  const getSubjectColor = useCallback((subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.color || '#3b82f6'; // Default blau
  }, [subjects]);

  const groupedPerformances = useMemo(() => {
    if (!Array.isArray(performances)) return [];

    const filtered = performances.filter(p =>
      filterSubject === 'all' || p.subject === filterSubject
    );

    const grouped = filtered.reduce((acc, perf) => {
      const key = `${perf.assessment_name || 'Unknown'}-${perf.subject || 'Unknown'}-${perf.date || ''}`;
      if (!acc[key]) {
        acc[key] = {
          assessment_name: perf.assessment_name || 'Unknown Assessment',
          subject: perf.subject || 'Unknown Subject',
          date: perf.date || '',
          fachbereiche: perf.fachbereiche || [],
          performances: [],
          average: 0
        };
      }
      acc[key].performances.push(perf);
      return acc;
    }, {});

    // Calculate averages and sort
    const result = Object.values(grouped).map(group => {
      const validGrades = group.performances.map(p => p.grade).filter(g => typeof g === 'number' && g >= 1 && g <= 6);
      const sum = validGrades.reduce((total, grade) => total + grade, 0);
      group.average = validGrades.length > 0
        ? parseFloat((sum / validGrades.length).toFixed(2))
        : 0;
      return group;
    });

    return result.sort((a, b) => {
      if (sortBy === 'date') return new Date(b.date || 0) - new Date(a.date || 0);
      if (sortBy === 'subject') return (a.subject || '').localeCompare(b.subject || '');
      if (sortBy === 'assessment') return (a.assessment_name || '').localeCompare(b.assessment_name || '');
      if (sortBy === 'average') return b.average - a.average;
      return 0;
    });
  }, [performances, filterSubject, sortBy]);

  const subjectOptions = useMemo(() => {
    if (!Array.isArray(performances)) return ['all'];
    const subjectSet = new Set(performances.map(p => p.subject).filter(Boolean));
    return ['all', ...Array.from(subjectSet)];
  }, [performances]);

  const toggleRow = (key) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
    saveExpandedRows(newExpanded);
  };

  const startEditing = (groupKey) => {
    const group = groupedPerformances.find(g =>
      `${g.assessment_name}-${g.subject}-${g.date}` === groupKey
    );

    if (group && Array.isArray(students)) {
      const newExpanded = new Set(expandedRows);
      newExpanded.add(groupKey);
      setExpandedRows(newExpanded);
      saveExpandedRows(newExpanded);

      const grades = {};
      students.forEach(student => {
        if (student && student.id) {
          const perf = group.performances.find(p => p.student_id === student.id);
          grades[student.id] = perf && typeof perf.grade === 'number' ? perf.grade.toString() : '';
        }
      });
      // Load existing weight
      const currentWeight = group.performances[0]?.weight ?? 1;
      grades.weight = currentWeight;
      setEditingGrades({ [groupKey]: grades });
      setEditingFachbereiche({ [groupKey]: [...(group.fachbereiche || [])] });
    }
  };

  const saveGrades = async (groupKey) => {
    const grades = editingGrades[groupKey];
    const fachbereiche = editingFachbereiche[groupKey] || [];
    const group = groupedPerformances.find(g =>
      `${g.assessment_name}-${g.subject}-${g.date}` === groupKey
    );

    if (!group || !Array.isArray(students) || !grades) {
      toast({
        title: "Fehler",
        description: "Ungültige Daten für die Speicherung.",
        variant: "destructive",
      });
      return;
    }

    try {
      const user = User.current?.();
      if (!user) {
        throw new Error('Kein Benutzer eingeloggt');
      }

      const updateList = [];
      const createList = [];

      for (const student of students) {
        if (!student || !student.id) continue;

        const gradeValue = grades[student.id];
        if (gradeValue && gradeValue.trim() !== '') {
          const grade = parseFloat(gradeValue);
          if (isNaN(grade) || grade < 0 || grade > 6) {
            toast({
              title: "Fehler",
              description: `Ungültige Note für ${student.name}: ${gradeValue}. Noten müssen zwischen 0 und 6 liegen.`,
              variant: "destructive",
            });
            return;
          }

          const existingPerf = group.performances.find(p => p.student_id === student.id);
          const perfData = {
            student_id: student.id,
            class_id: activeClassId,
            date: group.date,
            subject: group.subject,
            assessment_name: group.assessment_name,
            grade,
            weight: editingGrades[groupKey]?.weight ?? 1,
            fachbereiche,
            user_id: user.id
          };

          if (existingPerf) {
            updateList.push({ id: existingPerf.id, data: perfData });
          } else {
            createList.push(perfData);
          }
        }
      }

      if (updateList.length > 0) {
        await Promise.all(
          updateList.map(({ id, data }) =>
            Performance.update(id, data, {
              $cancelKey: `update-performance-${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            })
          )
        );
      }

      if (createList.length > 0) {
        await Performance.bulkCreate(createList, {
          $cancelKey: `bulk-create-performance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
      }

      const newExpanded = new Set(expandedRows);
      newExpanded.add(groupKey);
      setExpandedRows(newExpanded);
      saveExpandedRows(newExpanded);

      setEditingGrades({});
      setEditingFachbereiche({});

      setTimeout(() => {
        setExpandedRows(new Set(newExpanded));
      }, 0);

      if (onDataChange) onDataChange();

      toast({
        title: "Erfolg",
        description: "Noten erfolgreich gespeichert.",
        variant: "success",
      });
    } catch (error) {
      console.error("Error saving grades:", error);
      toast({
        title: "Fehler",
        description: `Fehler beim Speichern der Noten: ${error.message || 'Unbekannter Fehler'}`,
        variant: "destructive",
      });
    }
  };

  const cancelEditing = (groupKey) => {
    const newEditingGrades = { ...editingGrades };
    const newEditingFachbereiche = { ...editingFachbereiche };
    delete newEditingGrades[groupKey];
    delete newEditingFachbereiche[groupKey];
    setEditingGrades(newEditingGrades);
    setEditingFachbereiche(newEditingFachbereiche);
  };

  const updateGrade = (groupKey, studentId, value) => {
    setEditingGrades(prev => ({
      ...prev,
      [groupKey]: {
        ...prev[groupKey],
        [studentId]: value
      }
    }));
  };

  const updateFachbereiche = (groupKey, newFachbereiche) => {
    setEditingFachbereiche(prev => ({
      ...prev,
      [groupKey]: newFachbereiche
    }));
  };

  const addFachbereich = (groupKey, fachbereichName) => {
    if (fachbereichName && fachbereichName.trim()) {
      const currentFachbereiche = editingFachbereiche[groupKey] || [];
      if (!currentFachbereiche.includes(fachbereichName.trim())) {
        updateFachbereiche(groupKey, [...currentFachbereiche, fachbereichName.trim()]);
      }
    }
  };

  const removeFachbereich = (groupKey, fachbereich) => {
    const currentFachbereiche = editingFachbereiche[groupKey] || [];
    updateFachbereiche(groupKey, currentFachbereiche.filter(f => f !== fachbereich));
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : subjectId;
  };

  // Hilfsfunktion: Prüft ob Fachbereich ein LP21-Fachbereich ist
  const isLp21Fachbereich = (fbName, subjectId) => {
    return fachbereiche.some(fb => fb.subject_id === subjectId && fb.name === fbName);
  };

  return (
    <div className="space-y-6">
      {/* Filter and Sort Controls */}
      <div className="flex gap-4 items-center p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Fach:</label>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-40 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Fächer</SelectItem>
              {subjectOptions.slice(1).map(subject => (
                <SelectItem key={subject} value={subject}>{getSubjectName(subject)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Sortieren:</label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Datum</SelectItem>
              <SelectItem value="subject">Fach</SelectItem>
              <SelectItem value="assessment">Prüfungsname</SelectItem>
              <SelectItem value="average">Notenschnitt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        {viewOnly && (
          <div className="flex items-center gap-1.5 text-sm text-blue-400">
            <Eye className="w-4 h-4" />
            <span>Nur Einsicht</span>
          </div>
        )}
        {onCreatePerformance && (
          <Button
            onClick={onCreatePerformance}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!canEdit}
            title={!canEdit ? 'Keine Bearbeitungsrechte für diese Klasse' : ''}
          >
            <Plus className="w-4 h-4 mr-1.5"/>
            Neue Leistung
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col">
        <div className="p-4 flex-shrink-0">
          <h3 className="text-black dark:text-white text-lg font-semibold">Leistungsbeurteilungen</h3>
        </div>
        <div className="max-h-[calc(100vh-440px)] overflow-y-auto">
          <Table className="bg-white dark:bg-slate-800 rounded-lg">
            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-slate-800">
              <TableRow className="border-slate-200 dark:border-slate-700">
                <TableHead className="text-black dark:text-white bg-white dark:bg-slate-800"></TableHead>
                <TableHead className="text-black dark:text-white bg-white dark:bg-slate-800">Datum</TableHead>
                <TableHead className="text-black dark:text-white bg-white dark:bg-slate-800">Fach</TableHead>
                <TableHead className="text-black dark:text-white bg-white dark:bg-slate-800">Prüfungsname</TableHead>
                <TableHead className="text-black dark:text-white bg-white dark:bg-slate-800">Fachbereiche</TableHead>
                <TableHead className="text-black dark:text-white bg-white dark:bg-slate-800">Gewichtung</TableHead>
                <TableHead className="text-black dark:text-white bg-white dark:bg-slate-800">Notenschnitt</TableHead>
                <TableHead className="text-black dark:text-white bg-white dark:bg-slate-800">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedPerformances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">
                  Keine Leistungsbeurteilungen gefunden
                </TableCell>
              </TableRow>
            ) : (
              groupedPerformances.map((group) => {
                const groupKey = `${group.assessment_name}-${group.subject}-${group.date}`;
                const isExpanded = expandedRows.has(groupKey);
                const isEditing = !!editingGrades[groupKey];
                const subjectColor = getSubjectColor(group.subject);
                const avgColors = getGradeColor(group.average);

                return (
                  <React.Fragment key={groupKey}>
                    <TableRow className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleRow(groupKey)}
                          className="text-slate-400 hover:text-black dark:hover:text-white"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="text-black dark:text-white">{group.date ? new Date(group.date).toLocaleDateString('de-DE') : 'Unbekannt'}</TableCell>
                      <TableCell>
                        {/* Fach-Badge mit Fachfarbe */}
                        <Badge
                          variant="outline"
                          className="border-none font-medium"
                          style={{
                            backgroundColor: subjectColor,
                            color: getTextColor(subjectColor)
                          }}
                        >
                          {getSubjectName(group.subject)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-black dark:text-white">{group.assessment_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(isEditing ? editingFachbereiche[groupKey] : group.fachbereiche || []).map(fachbereich => {
                            const isLp21 = isLp21Fachbereich(fachbereich, group.subject);
                            return (
                              <Badge
                                key={fachbereich}
                                variant="secondary"
                                className={`text-xs ${!isLp21 ? 'bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200' : ''}`}
                                title={!isLp21 ? 'Kein LP21-Fachbereich' : ''}
                              >
                                {fachbereich}
                              </Badge>
                            );
                          })}
                          {(!group.fachbereiche || group.fachbereiche.length === 0) && !isEditing && (
                            <span className="text-slate-500 dark:text-slate-400 text-xs italic">Keine</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-black dark:text-white">{group.performances[0]?.weight ?? 1}</TableCell>
                      {/* Notenschnitt mit 5-Stufen-Farbsystem */}
                      <TableCell>
                        <span className={`font-bold text-lg px-2 py-1 rounded ${avgColors.text} ${avgColors.bg}`}>
                          {group.average ? group.average.toFixed(2) : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <>
                            <Button
                              size="icon"
                              onClick={() => saveGrades(groupKey)}
                              className="bg-green-600 hover:bg-green-700 text-white mr-2"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => cancelEditing(groupKey)}
                              className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-black dark:text-white"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {canEdit && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => startEditing(groupKey)}
                                  className="text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 mr-2"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onDelete && onDelete(group.performances[0].id)}
                                  className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="border-slate-200 dark:border-slate-700">
                        <TableCell colSpan={8}>
                          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4">
                            {isEditing && (
                              <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-600">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                                  {/* Fachbereich Dropdown */}
                                  <div>
                                    <Label className="text-black dark:text-white">Fachbereich hinzufügen</Label>
                                    <Select onValueChange={(value) => addFachbereich(groupKey, value)}>
                                      <SelectTrigger className="mt-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                                        <SelectValue placeholder="Fachbereich auswählen..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {fachbereiche
                                          .filter(fb => fb.subject_id === group.subject)
                                          .filter(fb => !(editingFachbereiche[groupKey] || []).includes(fb.name))
                                          .map(fb => (
                                            <SelectItem key={fb.id} value={fb.name}>{fb.name}</SelectItem>
                                          ))
                                        }
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {/* Gewichtung */}
                                  <div>
                                    <Label className="text-black dark:text-white">Gewichtung</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="10"
                                      placeholder="1"
                                      value={editingGrades[groupKey]?.weight ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                          setEditingGrades(prev => ({
                                            ...prev,
                                            [groupKey]: { ...prev[groupKey], weight: null }
                                          }));
                                        } else {
                                          const num = parseFloat(val);
                                          if (!isNaN(num) && num >= 0 && num <= 10) {
                                            setEditingGrades(prev => ({
                                              ...prev,
                                              [groupKey]: { ...prev[groupKey], weight: num }
                                            }));
                                          }
                                        }
                                      }}
                                      className="mt-1 bg-white dark:bg-slate-800"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      1 = Standard | 3 = Klausur | 0.5 = Stegreif
                                    </p>
                                  </div>
                                </div>
                                {/* Ausgewählte Fachbereiche als Badges */}
                                {(editingFachbereiche[groupKey] || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {(editingFachbereiche[groupKey] || []).map(fachbereich => (
                                      <Badge key={fachbereich} variant="secondary" className="text-xs">
                                        {fachbereich}
                                        <button
                                          onClick={() => removeFachbereich(groupKey, fachbereich)}
                                          className="ml-1.5 hover:text-red-400"
                                        >
                                          &times;
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            <h4 className="text-black dark:text-white font-medium mb-3">Schülernoten</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {sortedStudents.map(student => {
                                if (!student || !student.id) return null;

                                const perf = group.performances.find(p => p.student_id === student.id);
                                const currentGrade = isEditing
                                  ? editingGrades[groupKey]?.[student.id] || ''
                                  : (perf && typeof perf.grade === 'number' ? perf.grade.toString() : '');

                                // 5-Stufen-Farbsystem für einzelne Noten
                                const gradeColors = perf && typeof perf.grade === 'number'
                                  ? getGradeColor(perf.grade)
                                  : getGradeColor(null);

                                return (
                                  <div key={student.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded">
                                    <span className="text-slate-700 dark:text-slate-300 text-sm">
                                      {student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unnamed'}
                                    </span>
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        min="0"
                                        max="6"
                                        step="0.01"
                                        value={currentGrade}
                                        onChange={(e) => updateGrade(groupKey, student.id, e.target.value)}
                                        className="w-20 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-black dark:text-white"
                                        placeholder="Note"
                                      />
                                    ) : (
                                      <span
                                        className={`font-bold text-sm px-2 py-1 rounded ${gradeColors.text} ${gradeColors.bg}`}
                                        title={perf && perf.grade === 0 ? 'Nicht teilgenommen' : ''}
                                      >
                                        {perf && typeof perf.grade === 'number' ? perf.grade : '-'}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default LeistungenTable;
