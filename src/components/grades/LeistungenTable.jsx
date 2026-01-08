import React, { useState, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Performance, User } from '@/api/entities';
import { ChevronDown, ChevronUp, Edit, Trash2, Save, X, Plus } from 'lucide-react';
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
  activeClassId,
  onEdit,
  onDelete,
  onDataChange,
  expandedRows,
  setExpandedRows,
  savePreferences // Neu: von PerformanceView als Prop erhalten
}) => {
  const { toast } = useToast();
  const [sortPreference] = useStudentSortPreference();
  const sortedStudents = useMemo(() => sortStudents(students, sortPreference), [students, sortPreference]);
  const [editingGrades, setEditingGrades] = useState({});
  const [editingFachbereiche, setEditingFachbereiche] = useState({});
  const [newFachbereichInputs, setNewFachbereichInputs] = useState({});
  const [sortBy, setSortBy] = useState('date');
  const [filterSubject, setFilterSubject] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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

  // Pagination
  const paginatedPerformances = useMemo(() => {
    const maxPage = Math.ceil(groupedPerformances.length / ITEMS_PER_PAGE);
    if (currentPage > maxPage && maxPage > 0) {
      setCurrentPage(maxPage);
    } else if (currentPage === 0 && groupedPerformances.length > 0) {
      setCurrentPage(1);
    }

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return groupedPerformances.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [groupedPerformances, currentPage]);

  const totalPages = Math.ceil(groupedPerformances.length / ITEMS_PER_PAGE);

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
      setNewFachbereichInputs({ [groupKey]: '' });
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
      setNewFachbereichInputs({});

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
    const newInputs = { ...newFachbereichInputs };
    delete newEditingGrades[groupKey];
    delete newEditingFachbereiche[groupKey];
    delete newInputs[groupKey];
    setEditingGrades(newEditingGrades);
    setEditingFachbereiche(newEditingFachbereiche);
    setNewFachbereichInputs(newInputs);
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

  const addFachbereich = (groupKey) => {
    const newFachbereich = newFachbereichInputs[groupKey];
    if (newFachbereich && newFachbereich.trim()) {
      const currentFachbereiche = editingFachbereiche[groupKey] || [];
      if (!currentFachbereiche.includes(newFachbereich.trim())) {
        updateFachbereiche(groupKey, [...currentFachbereiche, newFachbereich.trim()]);
        setNewFachbereichInputs(prev => ({ ...prev, [groupKey]: '' }));
      }
    }
  };

  const removeFachbereich = (groupKey, fachbereich) => {
    const currentFachbereiche = editingFachbereiche[groupKey] || [];
    updateFachbereiche(groupKey, currentFachbereiche.filter(f => f !== fachbereich));
  };

  const updateFachbereichInput = (groupKey, value) => {
    setNewFachbereichInputs(prev => ({
      ...prev,
      [groupKey]: value
    }));
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : subjectId;
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
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        <div className="p-4">
          <h3 className="text-black dark:text-white text-lg font-semibold">Leistungsbeurteilungen</h3>
        </div>
        <Table className="bg-white dark:bg-slate-800 rounded-lg">
          <TableHeader>
            <TableRow className="border-slate-200 dark:border-slate-700">
              <TableHead className="text-black dark:text-white"></TableHead>
              <TableHead className="text-black dark:text-white">Datum</TableHead>
              <TableHead className="text-black dark:text-white">Fach</TableHead>
              <TableHead className="text-black dark:text-white">Prüfungsname</TableHead>
              <TableHead className="text-black dark:text-white">Fachbereiche</TableHead>
              <TableHead className="text-black dark:text-white">Gewichtung</TableHead>
              <TableHead className="text-black dark:text-white">Notenschnitt</TableHead>
              <TableHead className="text-black dark:text-white">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPerformances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">
                  Keine Leistungsbeurteilungen gefunden
                </TableCell>
              </TableRow>
            ) : (
              paginatedPerformances.map((group) => {
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
                          {(isEditing ? editingFachbereiche[groupKey] : group.fachbereiche || []).map(fachbereich => (
                            <Badge key={fachbereich} variant="secondary" className="text-xs">
                              {fachbereich}
                            </Badge>
                          ))}
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
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="border-slate-200 dark:border-slate-700">
                        <TableCell colSpan={8}>
                          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4">
                            {isEditing && (
                              <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-600">
                                <h5 className="text-black dark:text-white font-medium mb-2">Fachbereiche bearbeiten</h5>
                                <div className="flex gap-2 mb-2">
                                  <Input
                                    placeholder="Neuer Fachbereich"
                                    value={newFachbereichInputs[groupKey] || ''}
                                    onChange={(e) => updateFachbereichInput(groupKey, e.target.value)}
                                    onKeyPress={(e) => { if (e.key === 'Enter') addFachbereich(groupKey); }}
                                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-black dark:text-white"
                                  />
                                  <Button
                                    onClick={() => addFachbereich(groupKey)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
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
                              </div>
                            )}
                            {/* Gewichtung beim Bearbeiten */}
                            {isEditing && (
                              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                                <Label>Gewichtung</Label>
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
                                  className="w-32 mt-1 bg-white dark:bg-slate-800"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Standard = 1 | Klausur = 3 | Stegreif = 0.5
                                </p>
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
                                        step="0.25"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-4 text-black dark:text-white">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-black dark:text-white"
          >
            Zurück
          </Button>
          <span>Seite {currentPage} von {totalPages}</span>
          <Button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-black dark:text-white"
          >
            Weiter
          </Button>
        </div>
      )}
    </div>
  );
};

export default LeistungenTable;
