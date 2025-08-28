import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UeberfachlichKompetenz, Competency } from '@/api/entities'; // Added Competency import
import { Search, ChevronDown, ChevronRight, Edit, Trash2, Star, Clock, Plus, Save, X } from 'lucide-react';
import { format } from "date-fns";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

const StarRating = ({ rating, size = "w-4 h-4", showDecimal = false }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <>
      {stars.map((star) => {
        const isFull = star <= Math.floor(rating);
        const isHalf = star === Math.ceil(rating) && rating % 1 !== 0;
        return (
          <Star
            key={star}
            className={`${size} transition-colors ${isFull ? 'text-yellow-400 fill-yellow-400' : 'text-slate-400'}`}
          >
            {isHalf && (
              <Star
                className={`${size} absolute top-0 left-0 text-yellow-400 fill-yellow-400 transition-colors`}
                style={{ clipPath: 'inset(0 50% 0 0)' }}
              />
            )}
          </Star>
        );
      })}
      {showDecimal && rating > 0 && <span>({rating.toFixed(1)})</span>}
    </>
  );
};

const InteractiveStarRating = ({ rating, onRatingChange, size = "w-5 h-5" }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-3">
      {stars.map((star) => (
        <Star
          key={star}
          className={`${size} cursor-pointer transition-all duration-200 hover:scale-110 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-400 hover:text-yellow-300'}`}
          onClick={() => onRatingChange(star)}
        />
      ))}
    </div>
  );
};

export default function UeberfachlichTable({ students = [], ueberfachlich = [], activeClassId, onDataChange, expandedHistories, setExpandedHistories, expandedCompetencies, setExpandedCompetencies }) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [quickAddState, setQuickAddState] = useState({ key: null, score: 0 });
  const [isLoading, setIsLoading] = useState(false); // New state for loading

  const studentsForClass = useMemo(() => {
    return students.filter(s => s.class_id === activeClassId);
  }, [students, activeClassId]);

  // Derived from the outline, assuming allCompetencies represents master competency definitions
  // and will be used to find a master record to delete.
  // We'll infer a structure with id, name, and class_id based on ueberfachlich data.
  const allCompetencies = useMemo(() => {
    if (!ueberfachlich || ueberfachlich.length === 0) return [];
    const uniqueCompetencies = new Map();
    ueberfachlich.forEach(u => {
      // Filter for competencies related to the active class and ensure unique names
      if (u.class_id === activeClassId && u.competency_name && !uniqueCompetencies.has(u.competency_name)) {
        uniqueCompetencies.set(u.competency_name, {
          id: u.competency_name, // Using competency_name as a dummy ID for this example
          name: u.competency_name,
          class_id: u.class_id
        });
      }
    });
    return Array.from(uniqueCompetencies.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [ueberfachlich, activeClassId]);

  // competencyNames derived from allCompetencies
  const competencyNames = useMemo(() => {
    return allCompetencies.map(c => c.name);
  }, [allCompetencies]);

  const assessmentsMap = useMemo(() => {
    const map = new Map();
    (ueberfachlich || []).forEach(u => {
      const studentMap = map.get(u.student_id) || new Map();
      const assessments = (u.assessments || [])
        .filter(a => a && a.date && typeof a.score === 'number')
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      studentMap.set(u.competency_name, assessments);
      map.set(u.student_id, studentMap);
    });
    return map;
  }, [ueberfachlich]);

  // Converted to useCallback as per outline
  const getAssessments = useCallback((studentId, competencyName) => {
    return assessmentsMap.get(studentId)?.get(competencyName) || [];
  }, [assessmentsMap]);

  // Converted to useCallback as per outline
  const getAverageRating = useCallback((studentId, competencyName) => {
    const assessments = getAssessments(studentId, competencyName);
    if (assessments.length === 0) return 0;
    const validScores = assessments.map(a => a.score).filter(score => typeof score === 'number' && score >= 1 && score <= 5);
    if (validScores.length === 0) return 0;
    const sum = validScores.reduce((total, score) => total + score, 0);
    return sum / validScores.length;
  }, [getAssessments]);

  const filteredStudents = useMemo(() => {
    if (!debouncedSearchTerm) return studentsForClass;
    return studentsForClass.filter(student =>
      student.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [studentsForClass, debouncedSearchTerm]); // Preserved studentsForClass as it's correctly memoized

  const handleDeleteCompetency = async (competencyName) => {
    if (window.confirm(`Sind Sie sicher, dass Sie die Kompetenz "${competencyName}" und alle zugehörigen Bewertungen löschen möchten?`)) {
      setIsLoading(true);
      try {
        // Attempt to delete the master competency record if it exists
        const competencyToDelete = allCompetencies.find(c => c.name === competencyName && c.class_id === activeClassId);
        if (competencyToDelete) {
          // Assuming Competency is a valid model with a delete method
          await Competency.delete(competencyToDelete.id);
        }

        const entriesToDelete = ueberfachlich.filter(u => u.competency_name === competencyName && u.class_id === activeClassId);

        // FIX: Sequentially delete to avoid rate limiting
        for (const entry of entriesToDelete) {
          await UeberfachlichKompetenz.delete(entry.id);
          // Add a small delay between requests to prevent hitting rate limits
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Neu: Speichere den aktuellen Tab vor dem Reload
        localStorage.setItem('performanceTab', 'ueberfachlich');
        // Set save flag to preserve state after reload
        localStorage.setItem('performanceSaveFlag', 'true');
        onDataChange?.();
      } catch (error) {
        console.error("Fehler beim Löschen der Kompetenz:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteAssessment = async (studentId, competencyName, assessmentDate) => {
    if (!window.confirm(`Möchten Sie diese einzelne Bewertung vom ${format(new Date(assessmentDate), 'dd.MM.yyyy')} wirklich löschen?`)) return;
    try {
      const comp = ueberfachlich.find(u => u.student_id === studentId && u.competency_name === competencyName);
      if (!comp) return;

      const updatedAssessments = comp.assessments.filter(a => a.date !== assessmentDate);

      if (updatedAssessments.length === 0) {
        await UeberfachlichKompetenz.delete(comp.id);
      } else {
        await UeberfachlichKompetenz.update(comp.id, { assessments: updatedAssessments });
      }

      // Neu: Speichere den aktuellen Tab vor dem Reload
      localStorage.setItem('performanceTab', 'ueberfachlich');
      // Set save flag to preserve state after reload
      localStorage.setItem('performanceSaveFlag', 'true');
      onDataChange?.();
    } catch (error) {
      console.error("Fehler beim Löschen der Bewertung:", error);
    }
  };

  const handleQuickAdd = async (studentId, competencyName) => {
    if (quickAddState.score === 0) return;
    try {
      const comp = ueberfachlich.find(u => u.student_id === studentId && u.competency_name === competencyName);
      const newAssessment = { date: new Date().toISOString().slice(0, 10), score: quickAddState.score };

      if (comp) {
        const updatedAssessments = [...(comp.assessments || []), newAssessment];
        await UeberfachlichKompetenz.update(comp.id, { assessments: updatedAssessments });
      } else {
        await UeberfachlichKompetenz.create({
          student_id: studentId,
          class_id: activeClassId,
          competency_name: competencyName,
          assessments: [newAssessment]
        });
      }

      setQuickAddState({ key: null, score: 0 });

      // Neu: Erzwingsweise die History zuklappen (nutzt Parent-Setter)
      const historyKey = `${studentId}-${competencyName}`;
      setExpandedHistories(prev => {
        const newSet = new Set(prev);
        newSet.delete(historyKey);
        return newSet;
      });

      // Ensure the competency remains expanded
      setExpandedCompetencies(prev => {
        const newSet = new Set(prev);
        newSet.add(competencyName);
        return newSet;
      });

      // Neu: Speichere den aktuellen Tab vor dem Reload
      localStorage.setItem('performanceTab', 'ueberfachlich');
      // Set save flag to preserve state after reload
      localStorage.setItem('performanceSaveFlag', 'true');
      onDataChange?.();
    } catch (error) {
      console.error("Fehler beim schnellen Hinzufügen der Bewertung:", error);
    }
  };

  const toggleCompetencyExpansion = (competencyName) => {
    setExpandedCompetencies(prev => {
      const newSet = new Set(prev);
      newSet.has(competencyName) ? newSet.delete(competencyName) : newSet.add(competencyName);
      return newSet;
    });
  };

  const toggleHistoryExpansion = (key) => {
    setExpandedHistories(prev => {
      const newSet = new Set(prev);
      newSet.has(key) ? newSet.delete(key) : newSet.add(key);
      return newSet;
    });
  };

  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          placeholder="Schüler suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-black dark:text-white"
          disabled={isLoading}
        />
      </div>
      {isLoading && <Badge className="bg-blue-500 text-white animate-pulse">Aktionen werden ausgeführt...</Badge>}
      {competencyNames.map(competencyName => {
        const isExpanded = expandedCompetencies.has(competencyName);
        return (
          <Card key={competencyName} className="bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-black dark:text-white">
            <CardHeader
              className="flex flex-row items-center justify-between cursor-pointer"
              onClick={() => toggleCompetencyExpansion(competencyName)}
            >
              <div className="flex items-center gap-4">
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                <CardTitle className="text-xl">{competencyName}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-red-500 hover:bg-red-900/20"
                onClick={(e) => { e.stopPropagation(); handleDeleteCompetency(competencyName); }}
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardHeader>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                      {filteredStudents.map(student => {
                        const assessments = getAssessments(student.id, competencyName);
                        const averageRating = getAverageRating(student.id, competencyName);
                        const historyKey = `${student.id}-${competencyName}`;
                        const isHistoryExpanded = expandedHistories.has(historyKey);
                        const isQuickAdding = quickAddState.key === historyKey;
                        return (
                          <div key={student.id} className="bg-slate-100/50 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-300 dark:border-slate-600">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{student.name}</span>
                              {averageRating > 0 ? (
                                <div className="flex items-center gap-2">
                                  <StarRating rating={averageRating} showDecimal={false} />
                                </div>
                              ) : (
                                <Badge variant="secondary">Keine</Badge>
                              )}
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto text-xs text-slate-400"
                                onClick={() => toggleHistoryExpansion(historyKey)}
                                disabled={isQuickAdding || isLoading}
                              >
                                {assessments.length > 0 ? (isHistoryExpanded ? 'Verlauf ausblenden' : `Verlauf anzeigen (${assessments.length} Bewertungen)`) : ''}
                              </Button>
                              {!isQuickAdding ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-6 h-6 text-slate-400 hover:text-white"
                                  onClick={() => {
                                    setQuickAddState({ key: historyKey, score: 0 });
                                    if (!isHistoryExpanded) toggleHistoryExpansion(historyKey);
                                  }}
                                  disabled={isLoading}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-6 h-6 text-slate-400 hover:text-green-500"
                                    onClick={() => handleQuickAdd(student.id, competencyName)}
                                    disabled={isLoading}
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-6 h-6 text-slate-400 hover:text-red-500"
                                    onClick={() => setQuickAddState({ key: null, score: 0 })}
                                    disabled={isLoading}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <AnimatePresence>
                              {(isHistoryExpanded || isQuickAdding) && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                  animate={{ height: 'auto', opacity: 1, marginTop: '8px' }}
                                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="space-y-2 pt-2 border-t border-slate-600">
                                    {isQuickAdding && (
                                      <div className="flex justify-between items-center text-xs p-1 bg-slate-600/50 rounded">
                                        <div className="flex items-center gap-2 text-slate-300">
                                          <Clock className="w-3 h-3" />
                                          <span>{format(new Date(), 'dd.MM.yyyy')}</span>
                                        </div>
                                        <InteractiveStarRating
                                          rating={quickAddState.score}
                                          onRatingChange={(score) => setQuickAddState(prev => ({ ...prev, score }))}
                                          size="w-3 h-3"
                                        />
                                      </div>
                                    )}
                                    {assessments.map((assessment, index) => (
                                      <div key={index} className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-2 text-slate-300">
                                          <Clock className="w-3 h-3" />
                                          <span>{format(new Date(assessment.date), 'dd.MM.yyyy')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <StarRating rating={assessment.score} size="w-3 h-3" />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-6 h-6 text-slate-400 hover:text-red-500"
                                            onClick={() => handleDeleteAssessment(student.id, competencyName, assessment.date)}
                                            disabled={isLoading}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        );
      })}
    </>
  );
}