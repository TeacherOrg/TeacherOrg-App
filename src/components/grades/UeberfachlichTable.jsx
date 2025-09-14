import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UeberfachlichKompetenz, Competency, UserPreferences, User } from '@/api/entities';
import { Search, ChevronDown, ChevronRight, Trash2, Star, Clock, Plus, Save, X } from 'lucide-react';
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

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

export default function UeberfachlichTable({ 
  students = [], 
  ueberfachlich = [], 
  activeClassId, 
  onDataChange, 
  setTab,
  setUeberfachlich,
  expandedHistories, 
  setExpandedHistories, 
  expandedCompetencies, 
  setExpandedCompetencies,
  allCompetencies = [], // Correct prop name
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [quickAddState, setQuickAddState] = useState({ key: null, score: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Debugging-Logs für Props
  useEffect(() => {
    console.log('UeberfachlichTable Props:', {
      students,
      ueberfachlich,
      activeClassId,
      expandedHistories,
      expandedCompetencies,
      allCompetencies,
    });
  }, [students, ueberfachlich, activeClassId, expandedHistories, expandedCompetencies, allCompetencies]);

  const studentsForClass = useMemo(() => {
    return students.filter(s => s.class_id === activeClassId);
  }, [students, activeClassId]);

  // Berechne eindeutige Kompetenzen basierend auf competency_id (Relation-ID)
  const allCompetenciesLocal = useMemo(() => {
    if (!ueberfachlich || !Array.isArray(ueberfachlich)) {
      console.warn('ueberfachlich is not an array or is undefined:', ueberfachlich);
      return [];
    }
    const uniqueCompetencies = new Map();
    ueberfachlich.forEach(u => {
      const competencyName = u.competency_name_display || u.expand?.competency_id?.name || `Kompetenz-ID: ${u.competency_id} (Name fehlt)`;
      if (
        u.class_id === activeClassId &&
        u.competency_id &&
        typeof u.competency_id === 'string'
      ) {
        uniqueCompetencies.set(u.competency_id, {
          id: u.competency_id,
          name: competencyName,
          class_id: u.class_id
        });
      }
    });
    return Array.from(uniqueCompetencies.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [ueberfachlich, activeClassId]);

  // Kombiniere allCompetencies aus Props mit lokalen Kompetenzen
  const allCompetenciesCombined = useMemo(() => {
    if (Array.isArray(allCompetencies) && allCompetencies.length > 0) {
      // Verwende Props, falls verfügbar
      return allCompetencies.filter(c => c.class_id === activeClassId);
    }
    return allCompetenciesLocal;
  }, [allCompetencies, allCompetenciesLocal, activeClassId]);

  const competencyIds = useMemo(() => {
    return allCompetenciesCombined.map(c => c.id);
  }, [allCompetenciesCombined]);

  const assessmentsMap = useMemo(() => {
    const map = new Map();
    if (!ueberfachlich || !Array.isArray(ueberfachlich)) {
      console.warn('ueberfachlich is not an array or is undefined:', ueberfachlich);
      return map;
    }
    ueberfachlich.forEach(u => {
      if (!u.student_id || !u.competency_id || !Array.isArray(u.assessments)) {
        console.warn('Invalid ueberfachlich entry for assessmentsMap:', u);
        return;
      }
      const studentMap = map.get(u.student_id) || new Map();
      const assessments = u.assessments
        .filter(a => a && a.date && typeof a.score === 'number' && a.score >= 1 && a.score <= 5)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      if (assessments.length === 0) {
        console.warn('No valid assessments for entry:', u);
      } else {
        console.log('Valid assessments for entry:', u, assessments);
      }
      studentMap.set(u.competency_id, assessments);
      map.set(u.student_id, studentMap);
    });
    return map;
  }, [ueberfachlich]);

  const getAssessments = useCallback((studentId, competencyId) => {
    return assessmentsMap.get(studentId)?.get(competencyId) || [];
  }, [assessmentsMap]);

  const getAverageRating = useCallback((studentId, competencyId) => {
    const assessments = getAssessments(studentId, competencyId);
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
  }, [studentsForClass, debouncedSearchTerm]);

  const handleDeleteCompetency = async (competencyId) => {
    const competencyToDelete = allCompetenciesCombined.find(c => c.id === competencyId && c.class_id === activeClassId);
    if (!window.confirm(`Sind Sie sicher, dass Sie die Kompetenz "${competencyToDelete?.name || 'Unbekannte Kompetenz'}" und alle zugehörigen Bewertungen löschen möchten?`)) {
      return;
    }
    setIsLoading(true);
    try {
      // Zuerst Entries löschen
      const entriesToDelete = ueberfachlich.filter(u => u.competency_id === competencyId && u.class_id === activeClassId);
      await Promise.all(entriesToDelete.map(async (entry) => {
        if (entry.id) {
          await UeberfachlichKompetenz.delete(entry.id);
        } else {
          console.warn('Invalid entry for deletion:', entry);
        }
      }));

      // Dann Competency löschen
      if (competencyToDelete) {
        await Competency.delete(competencyToDelete.id);
      } else {
        console.warn('Competency not found for deletion:', competencyId);
      }

      // Neu laden der überfachlichen Kompetenzen
      const updatedUeberfachlich = await UeberfachlichKompetenz.list({
        filter: `class_id = '${activeClassId}'`,
        perPage: 500,
        expand: 'student_id,class_id,competency_id',
        $cancelKey: `list-ueberfachliche_kompetenz-postdelete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
      onDataChange?.(updatedUeberfachlich); // Übergib die aktualisierten Daten an die Parent-Komponente

      // Preferences update
      const user = User.current();
      if (user && activeClassId) {
        const preference = await UserPreferences.findOne({
          user_id: user.id,
          class_id: activeClassId,
        });
        const preferencesData = preference?.preferences || {};
        preferencesData.performanceTab = 'ueberfachlich';
        if (preference) {
          await UserPreferences.update(preference.id, { preferences: preferencesData });
        } else {
          await UserPreferences.create({
            user_id: user.id,
            class_id: activeClassId,
            preferences: preferencesData,
          });
        }
      }
      localStorage.setItem('performanceSaveFlag', 'true');
      setExpandedCompetencies(new Set());
      toast({
        title: "Erfolg",
        description: "Kompetenz und Bewertungen gelöscht",
        variant: "success",
      });
    } catch (error) {
      console.error("Fehler beim Löschen der Kompetenz:", error);
      let errorMessage = 'Fehler beim Löschen der Kompetenz.';
      if (error.status === 400 && error.message.includes('required relation reference')) {
        errorMessage = 'Die Bewertungen wurden gelöscht, aber die Kompetenz konnte nicht entfernt werden (noch referenziert). Versuchen Sie es erneut.';
      }
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAssessment = async (studentId, competencyId, assessmentDate) => {
    if (!window.confirm(`Möchten Sie diese einzelne Bewertung vom ${format(new Date(assessmentDate), 'dd.MM.yyyy')} wirklich löschen?`)) return;
    try {
      const comp = ueberfachlich.find(u => u.student_id === studentId && u.competency_id === competencyId);
      if (!comp) return;

      const updatedAssessments = comp.assessments.filter(a => a.date !== assessmentDate);

      if (updatedAssessments.length === 0) {
        await UeberfachlichKompetenz.delete(comp.id, {
          $cancelKey: `delete-ueberfachliche_kompetenz-${studentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
      } else {
        await UeberfachlichKompetenz.update(comp.id, { 
          assessments: updatedAssessments,
          $cancelKey: `update-ueberfachliche_kompetenz-${studentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
      }

      const user = User.current();
      if (user && activeClassId) {
        const preference = await UserPreferences.findOne({
          user_id: user.id,
          class_id: activeClassId,
        });
        const preferencesData = preference?.preferences || {};
        preferencesData.performanceTab = 'ueberfachlich';
        if (preference) {
          await UserPreferences.update(preference.id, { preferences: preferencesData });
        } else {
          await UserPreferences.create({
            user_id: user.id,
            class_id: activeClassId,
            preferences: preferencesData,
          });
        }
      }
      localStorage.setItem('performanceSaveFlag', 'true');
      onDataChange?.();
      toast({
        title: "Erfolg",
        description: "Bewertung erfolgreich gelöscht",
        variant: "success",
      });
    } catch (error) {
      console.error("Fehler beim Löschen der Bewertung:", error);
      toast({
        title: "Fehler",
        description: `Fehler beim Löschen der Bewertung: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleQuickAdd = async (studentId, competencyId) => {
    if (quickAddState.score === 0) return;
    setIsLoading(true);
    try {
      const user = User.current();
      if (!user || !user.id) throw new Error('Kein Benutzer eingeloggt');

      const comp = ueberfachlich.find(u => u.student_id === studentId && u.competency_id === competencyId);
      const newAssessment = { date: new Date().toISOString().slice(0, 10), score: quickAddState.score };

      let updatedComp;
      if (comp) {
        const updatedAssessments = [...(comp.assessments || []), newAssessment];
        updatedComp = await UeberfachlichKompetenz.update(comp.id, { 
          assessments: updatedAssessments,
          user_id: user.id,
          $cancelKey: `update-ueberfachliche_kompetenz-${studentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          expand: 'competency_id'
        });
      } else {
        updatedComp = await UeberfachlichKompetenz.create({
          student_id: studentId,
          class_id: activeClassId,
          competency_id: competencyId,
          assessments: [newAssessment],
          user_id: user.id
        }, {
          $cancelKey: `create-ueberfachliche_kompetenz-${studentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          expand: 'competency_id'
        });
      }

      // Kompetenzname aus allCompetencies oder API-Antwort holen
      const competency = allCompetenciesCombined.find(c => c.id === competencyId);
      updatedComp.competency_name_display = updatedComp.expand?.competency_id?.name || competency?.name || `Kompetenz-ID: ${competencyId} (Name fehlt)`;

      // Lokale Aktualisierung des ueberfachlich-States
      setUeberfachlich(prev => {
        const newUeberfachlich = prev.filter(u => !(u.student_id === studentId && u.competency_id === competencyId));
        return [...newUeberfachlich, updatedComp];
      });

      // Explizit State persistieren und History erweitern
      const newExpandedCompetencies = new Set(expandedCompetencies);
      newExpandedCompetencies.add(competencyId);
      setExpandedCompetencies(newExpandedCompetencies);

      const newExpandedHistories = new Set(expandedHistories);
      const historyKey = `${studentId}-${competencyId}`;
      newExpandedHistories.add(historyKey);
      setExpandedHistories(newExpandedHistories);

      // Preferences speichern, inklusive performanceTab
      const preference = await UserPreferences.findOne({
        user_id: user.id,
        class_id: activeClassId,
      });
      const preferencesData = preference?.preferences || {};
      preferencesData.performanceTab = 'ueberfachlich';
      preferencesData.expandedCompetencies = Array.from(newExpandedCompetencies);
      preferencesData.expandedHistories = Array.from(newExpandedHistories);
      preferencesData.expandedLeistungenRows = Array.from(preferencesData.expandedLeistungenRows || []);
      
      if (preference) {
        await UserPreferences.update(preference.id, { preferences: preferencesData });
      } else {
        await UserPreferences.create({
          user_id: user.id,
          class_id: activeClassId,
          preferences: preferencesData,
        });
      }

      // Clear performanceSaveFlag to ensure preferences are loaded on next render
      localStorage.removeItem('performanceSaveFlag');

      // QuickAdd-Status komplett zurücksetzen
      setQuickAddState({ key: null, score: 0 });
      setTab('ueberfachlich'); // Sicherstellen, dass die Ansicht auf Überfachlich bleibt

      // Force a re-render after a slight delay to ensure UI updates
      setTimeout(() => {
        setExpandedCompetencies(new Set(newExpandedCompetencies));
        setExpandedHistories(new Set(newExpandedHistories));
      }, 0);

      toast({
        title: "Erfolg",
        description: "Bewertung erfolgreich hinzugefügt",
        variant: "success",
      });
    } catch (error) {
      console.error("Fehler beim schnellen Hinzufügen der Bewertung:", error);
      toast({
        title: "Fehler",
        description: `Fehler beim schnellen Hinzufügen der Bewertung: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCompetencyExpansion = (competencyId) => {
    setExpandedCompetencies(prev => {
      const newSet = new Set(prev);
      newSet.has(competencyId) ? newSet.delete(competencyId) : newSet.add(competencyId);
      return newSet;
    });
  };

  const toggleHistoryExpansion = (key) => {
    if (typeof key !== 'string') {
      console.warn('Invalid history key:', key);
      return;
    }
    setExpandedHistories(prev => {
      const newSet = new Set(prev);
      newSet.has(key) ? newSet.delete(key) : newSet.add(key);
      return newSet;
    });
  };

  // Ladeprüfung vor dem Rendern
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (allCompetenciesCombined.length === 0) {
    return (
      <Card className="bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-black dark:text-white">
        <CardContent className="p-6 text-center text-slate-500">
          <Star className="w-8 h-8 mx-auto mb-2" />
          <p>Keine überfachlichen Kompetenzen erfasst. Erstellen Sie eine neue im Modal.</p>
        </CardContent>
      </Card>
    );
  }

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
      {competencyIds.map(competencyId => {
        const competency = allCompetenciesCombined.find(c => c.id === competencyId);
        const isExpanded = expandedCompetencies.has(competencyId);
        return (
          <Card key={competencyId} className="bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-black dark:text-white">
            <CardHeader
              className="flex flex-row items-center justify-between cursor-pointer"
              onClick={() => toggleCompetencyExpansion(competencyId)}
            >
              <div className="flex items-center gap-4">
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                <CardTitle className="text-xl">{competency?.name || 'Unbekannte Kompetenz'}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-red-500 hover:bg-red-900/20"
                onClick={(e) => { e.stopPropagation(); handleDeleteCompetency(competencyId); }}
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
                        const assessments = getAssessments(student.id, competencyId);
                        const averageRating = getAverageRating(student.id, competencyId);
                        const historyKey = `${student.id}-${competencyId}`;
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
                                    onClick={() => handleQuickAdd(student.id, competencyId)}
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
                                            onClick={() => handleDeleteAssessment(student.id, competencyId, assessment.date)}
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