import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Performance } from '@/api/entities';
import { ChevronDown, ChevronRight, Edit, Trash2, Save, X, Plus } from 'lucide-react';

const LeistungenTable = ({ performances = [], students = [], subjects = [], onDataChange, activeClassId, expandedRows, setExpandedRows }) => {
  const [editingGrades, setEditingGrades] = useState({});
  const [editingFachbereiche, setEditingFachbereiche] = useState({});
  const [sortBy, setSortBy] = useState('date');
  const [filterSubject, setFilterSubject] = useState('all');
  const [newFachbereichInputs, setNewFachbereichInputs] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Grouped Performances (ohne side-effects)
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
      const validGrades = group.performances.map(p => p.grade).filter(g => typeof g === 'number');
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

  // Paginierung (ohne side-effects in useMemo)
  const paginatedPerformances = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return groupedPerformances.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [groupedPerformances, currentPage]);

  // Page-Reset in useEffect (hierhin verschoben!)
  useEffect(() => {
    const maxPage = Math.ceil(groupedPerformances.length / ITEMS_PER_PAGE);
    if (currentPage > maxPage && maxPage > 0) {
      setCurrentPage(maxPage);
    } else if (groupedPerformances.length > 0 && currentPage < 1) {
      setCurrentPage(1);
    }
  }, [groupedPerformances, currentPage]);

  const totalPages = Math.ceil(groupedPerformances.length / ITEMS_PER_PAGE);

  const subjectOptions = useMemo(() => {
    if (!Array.isArray(performances)) return ['all'];
    const subjectSet = new Set(performances.map(p => p.subject).filter(Boolean));
    return ['all', ...Array.from(subjectSet)];
  }, [performances]);

  const toggleRow = (key) => {
    setExpandedRows(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(key)) {
        newExpanded.delete(key);
      } else {
        newExpanded.add(key);
      }
      return newExpanded;
    });
  };

  const startEditing = (groupKey) => {
    const group = groupedPerformances.find(g => 
      `${g.assessment_name}-${g.subject}-${g.date}` === groupKey
    );
    
    if (group && Array.isArray(students)) {
      setExpandedRows(prev => {
        const newExpanded = new Set(prev);
        newExpanded.add(groupKey);
        return newExpanded;
      });

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

    if (!group || !Array.isArray(students) || !grades) return;

    try {
      const updatePromises = [];
      const createList = [];

      for (const student of students) {
        if (!student || !student.id) continue;
        
        const gradeValue = grades[student.id];
        if (gradeValue && gradeValue.trim() !== '') {
            const grade = parseFloat(gradeValue);
            if (!isNaN(grade) && grade >= 1 && grade <= 6) {
                const existingPerf = group.performances.find(p => p.student_id === student.id);
                const perfData = {
                    student_id: student.id,
                    class_id: activeClassId,
                    date: group.date,
                    subject: group.subject,
                    assessment_name: group.assessment_name,
                    grade,
                    fachbereiche
                };

                if (existingPerf) {
                    updatePromises.push(Performance.update(existingPerf.id, perfData));
                } else {
                    createList.push(perfData);
                }
            }
        }
      }
      
      if (createList.length > 0) {
        await Performance.bulkCreate(createList);
      }
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }
      
      setEditingGrades({});
      setEditingFachbereiche({});
      setNewFachbereichInputs({});
      // Neu: Speichere den aktuellen Tab vor dem Reload
      localStorage.setItem('performanceTab', 'leistungen');
      // Set save flag to preserve state after reload
      localStorage.setItem('performanceSaveFlag', 'true');
      // Ensure the edited row remains expanded
      setExpandedRows(prev => {
        const newSet = new Set(prev);
        newSet.add(groupKey);
        return newSet;
      });
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error("Error saving grades:", error);
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

  const deleteAssessment = async (assessmentName, date, subject) => {
    if (window.confirm(`Sind Sie sicher, dass Sie die Beurteilung "${assessmentName}" vom ${new Date(date).toLocaleDateString()} löschen möchten?`)) {
      const entriesToDelete = performances.filter(p =>
        p.assessment_name === assessmentName && p.date === date && p.subject === subject
      );

      try {
        // FIX: Sequentially delete to avoid rate limiting
        for (const entry of entriesToDelete) {
          await Performance.delete(entry.id);
          // Add a small delay between requests
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        // Set save flag to preserve state after reload
        localStorage.setItem('performanceSaveFlag', 'true');
        onDataChange();
      } catch (error) {
        console.error("Fehler beim Löschen der Beurteilung:", error);
      }
    }
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

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <label className="text-slate-300 text-sm font-medium">Fach:</label>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-40 bg-slate-700 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Fächer</SelectItem>
              {subjectOptions.slice(1).map(subject => (
                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
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

      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Leistungsbeurteilungen</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-2">
            {paginatedPerformances.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                Keine Leistungsbeurteilungen gefunden
              </div>
            ) : (
              paginatedPerformances.map((group) => {
                const groupKey = `${group.assessment_name}-${group.subject}-${group.date}`;
                const isExpanded = expandedRows.has(groupKey);
                const isEditing = !!editingGrades[groupKey];

                return (
                  <div key={groupKey} className="border-b border-slate-300 dark:border-slate-700 last:border-b-0">
                    <div className="flex items-center justify-between p-4 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(groupKey)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
                          <div>
                            <div className="text-xs text-slate-400">Datum</div>
                            <div className="font-medium text-white">
                              {group.date ? new Date(group.date).toLocaleDateString('de-DE') : 'Unbekannt'}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-xs text-slate-400">Fach</div>
                            <Badge variant="outline" className="text-white border-slate-600 bg-slate-700">
                              {group.subject}
                            </Badge>
                          </div>
                          
                          <div>
                            <div className="text-xs text-slate-400">Prüfungsname</div>
                            <div className="font-medium text-white">{group.assessment_name}</div>
                          </div>
                          
                          <div>
                            <div className="text-xs text-slate-400">Fachbereiche</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(isEditing ? editingFachbereiche[groupKey] : group.fachbereiche || []).map(fachbereich => (
                                <Badge key={fachbereich} variant="secondary" className="text-xs">
                                  {fachbereich}
                                </Badge>
                              ))}
                              {(!group.fachbereiche || group.fachbereiche.length === 0) && !isEditing && (
                                <span className="text-slate-500 text-xs italic">Keine</span>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-xs text-slate-400">Notenschnitt</div>
                            <div className="font-bold text-lg text-white">{group.average ? group.average.toFixed(2) : '-'}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {isEditing ? (
                          <>
                            <Button
                              size="icon"
                              onClick={() => saveGrades(groupKey)}
                              className="bg-green-600 hover:bg-green-700 text-white"
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
                              className="text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteAssessment(group.assessment_name, group.date, group.subject)}
                              className="text-red-500 hover:text-white hover:bg-red-500/50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <div className="bg-slate-100/30 dark:bg-slate-700/30 rounded-lg p-4">
                          {isEditing && (
                            <div className="mb-4">
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
                                <div key={student.id} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded">
                                  <span className="text-slate-300 text-sm">
                                    {student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unnamed'}
                                  </span>
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      min="1"
                                      max="6"
                                      step="0.25"
                                      value={currentGrade}
                                      onChange={(e) => updateGrade(groupKey, student.id, e.target.value)}
                                      className="w-20 bg-slate-700 border-slate-600 text-white"
                                      placeholder="Note"
                                    />
                                  ) : (
                                    <span className={`font-bold text-sm px-2 py-1 rounded ${
                                      perf && typeof perf.grade === 'number'
                                        ? perf.grade >= 4
                                        ? 'text-green-400 bg-green-900/30'
                                        : 'text-red-400 bg-red-900/30'
                                        : 'text-slate-500'
                                    }`}>
                                      {perf && typeof perf.grade === 'number' ? perf.grade : '-'}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-4 text-white">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Zurück
          </Button>
          <span>Seite {currentPage} von {totalPages}</span>
          <Button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Weiter
          </Button>
        </div>
      )}
    </div>
  );
};