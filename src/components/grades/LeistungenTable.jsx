import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Performance, UserPreferences, User } from '@/api/entities';
import { ChevronDown, ChevronUp, Edit, Trash2, Save, X, Plus } from 'lucide-react';
import { debounce } from '../../utils/utils';

const LeistungenTable = ({ performances = [], students = [], subjects = [], activeClassId, onEdit, onDelete, onDataChange, expandedRows, setExpandedRows }) => {
  const { toast } = useToast();
  const [editingGrades, setEditingGrades] = useState({});
  const [editingFachbereiche, setEditingFachbereiche] = useState({});
  const [newFachbereichInputs, setNewFachbereichInputs] = useState({});
  const [sortBy, setSortBy] = useState('date');
  const [filterSubject, setFilterSubject] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!activeClassId) return;
      try {
        const user = User.current?.();
        if (!user) {
          console.warn('No user found for preferences');
          return;
        }
        const preference = await UserPreferences.findOne({
          user_id: user.id,
          class_id: activeClassId,
        });
        if (preference?.preferences?.expandedLeistungenRows) {
          setExpandedRows(new Set(preference.preferences.expandedLeistungenRows));
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
        toast({
          title: "Fehler",
          description: "Fehler beim Laden der Benutzerpräferenzen.",
          variant: "destructive",
        });
      }
    };
    loadPreferences();
  }, [activeClassId, setExpandedRows, toast]);

  const saveExpandedRows = useCallback(
    debounce(async (rows) => {
      if (!activeClassId) return;
      try {
        const user = User.current?.();
        if (!user) {
          console.warn('No user found for saving preferences');
          return;
        }
        const preference = await UserPreferences.findOne({
          user_id: user.id,
          class_id: activeClassId,
        });
        const preferencesData = preference?.preferences || {};
        preferencesData.expandedLeistungenRows = Array.from(rows);
        preferencesData.performanceTab = 'leistungen'; // Ensure tab remains on Leistungen
        if (preference) {
          await UserPreferences.update(preference.id, { preferences: preferencesData });
        } else {
          await UserPreferences.create({
            user_id: user.id,
            class_id: activeClassId,
            preferences: preferencesData,
          });
        }
      } catch (error) {
        console.error('Error saving preferences:', error);
        toast({
          title: "Fehler",
          description: "Fehler beim Speichern der Benutzerpräferenzen.",
          variant: "destructive",
        });
      }
    }, 1000),
    [activeClassId, toast]
  );

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
      saveExpandedRows(newExpanded); // Speichere Präferenzen

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
      <div className="flex gap-4 items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <div className="flex items-center gap-2">
          <label className="text-slate-300 text-sm font-medium">Fach:</label>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-40 bg-slate-700 border-slate-600">
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
          <label className="text-slate-300 text-sm font-medium">Sortieren:</label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 bg-slate-700 border-slate-600">
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
      <div className="bg-slate-800 border-slate-700 rounded-lg">
        <div className="p-4">
          <h3 className="text-white text-lg font-semibold">Leistungsbeurteilungen</h3>
        </div>
        <Table className="bg-slate-800 rounded-lg">
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead className="w-12"></TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Fach</TableHead>
              <TableHead>Prüfungsname</TableHead>
              <TableHead>Fachbereiche</TableHead>
              <TableHead>Notenschnitt</TableHead>
              <TableHead>Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPerformances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                  Keine Leistungsbeurteilungen gefunden
                </TableCell>
              </TableRow>
            ) : (
              paginatedPerformances.map((group) => {
                const groupKey = `${group.assessment_name}-${group.subject}-${group.date}`;
                const isExpanded = expandedRows.has(groupKey);
                const isEditing = !!editingGrades[groupKey];

                return (
                  <React.Fragment key={groupKey}>
                    <TableRow className="border-slate-700 hover:bg-slate-700/50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleRow(groupKey)}
                          className="text-slate-400 hover:text-white"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                      <TableCell>{group.date ? new Date(group.date).toLocaleDateString('de-DE') : 'Unbekannt'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-white border-slate-600 bg-slate-700">
                          {getSubjectName(group.subject)}
                        </Badge>
                      </TableCell>
                      <TableCell>{group.assessment_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(isEditing ? editingFachbereiche[groupKey] : group.fachbereiche || []).map(fachbereich => (
                            <Badge key={fachbereich} variant="secondary" className="text-xs">
                              {fachbereich}
                            </Badge>
                          ))}
                          {(!group.fachbereiche || group.fachbereiche.length === 0) && !isEditing && (
                            <span className="text-slate-500 text-xs italic">Keine</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-lg text-white">{group.average ? group.average.toFixed(2) : '-'}</TableCell>
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
                              className="border-slate-600 bg-slate-700 hover:bg-slate-600 text-white"
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
                              className="text-slate-400 hover:text-white hover:bg-slate-700 mr-2"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete && onDelete(group.performances[0].id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="border-slate-700">
                        <TableCell colSpan={7}>
                          <div className="bg-slate-700/30 rounded-lg p-4">
                            {isEditing && (
                              <div className="mb-4 pb-4 border-b border-slate-600">
                                <h5 className="text-white font-medium mb-2">Fachbereiche bearbeiten</h5>
                                <div className="flex gap-2 mb-2">
                                  <Input
                                    placeholder="Neuer Fachbereich"
                                    value={newFachbereichInputs[groupKey] || ''}
                                    onChange={(e) => updateFachbereichInput(groupKey, e.target.value)}
                                    onKeyPress={(e) => { if (e.key === 'Enter') addFachbereich(groupKey); }}
                                    className="bg-slate-800 border-slate-600 text-white"
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
                            <h4 className="text-white font-medium mb-3">Schülernoten</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {(Array.isArray(students) ? students : []).map(student => {
                                if (!student || !student.id) return null;

                                const perf = group.performances.find(p => p.student_id === student.id);
                                const currentGrade = isEditing 
                                  ? editingGrades[groupKey]?.[student.id] || ''
                                  : (perf && typeof perf.grade === 'number' ? perf.grade.toString() : '');

                                return (
                                  <div key={student.id} className="flex items-center justify-between p-2 bg-slate-800 rounded">
                                    <span className="text-slate-300 text-sm">
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
                                        className="w-20 bg-slate-700 border-slate-600 text-white"
                                        placeholder="Note"
                                      />
                                    ) : (
                                      <span className={`font-bold text-sm px-2 py-1 rounded ${
                                        perf && typeof perf.grade === 'number' && perf.grade !== 0
                                          ? perf.grade <= 4 
                                            ? 'text-red-400 bg-red-900/30' 
                                            : 'text-green-400 bg-green-900/30'
                                          : 'text-slate-500'
                                      }`} title={perf && perf.grade === 0 ? 'Nicht teilgenommen' : ''}>
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
        <div className="flex justify-center items-center gap-4 mt-4 text-white">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="bg-slate-700 hover:bg-slate-600"
          >
            Zurück
          </Button>
          <span>Seite {currentPage} von {totalPages}</span>
          <Button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="bg-slate-700 hover:bg-slate-600"
          >
            Weiter
          </Button>
        </div>
      )}
    </div>
  );
};

export default LeistungenTable;
