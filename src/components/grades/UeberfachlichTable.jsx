import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { UeberfachlichKompetenz, Competency, UserPreferences, User } from '@/api/entities';
import { Search, ChevronDown, ChevronRight, Trash2, Star, Clock, Plus, Save, X, FileText } from 'lucide-react';
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

const InteractiveStarRating = ({ rating, onRatingChange, size = "w-5 h-5", notes, onNotesChange }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-3">
      <EditableNote
        assessment={{ date: new Date().toISOString().slice(0, 10), score: rating, notes }}
        studentId={null}
        competencyId={null}
        onSave={(studentId, competencyId, date, newNoteText) => onNotesChange(newNoteText)}
        isQuickAdd
      />
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

const EditableNote = ({ assessment, studentId, competencyId, onSave, isQuickAdd = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState(assessment.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const hasNote = assessment.notes && assessment.notes.trim();

  const handleSave = async () => {
    if (isQuickAdd) {
      onSave(null, null, assessment.date, noteText);
      setIsEditing(false);
    } else {
      setIsSaving(true);
      try {
        await onSave(studentId, competencyId, assessment.date, noteText);
        setIsEditing(false);
        toast({
          title: "Erfolg",
          description: "Notiz erfolgreich gespeichert",
          variant: "success",
        });
      } catch (error) {
        console.error('Error saving note:', error);
        toast({
          title: "Fehler",
          description: "Fehler beim Speichern der Notiz.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleCancel = () => {
    setNoteText(assessment.notes || '');
    setIsEditing(false);
  };

  return (
    <div className="relative inline-block">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsEditing(true)}
        className={`editable-note-button w-5 h-5 p-0 ${hasNote ? 'text-blue-400' : 'text-slate-400'} hover:text-blue-300`}
        title={hasNote ? 'Notiz bearbeiten' : 'Notiz hinzufügen'}
      >
        <FileText className="w-3 h-3" />
      </Button>
      
      <AnimatePresence>
        {isEditing && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-black/20" 
              onClick={handleCancel}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-2xl min-w-[300px] max-w-[400px]"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-white mb-1">Notiz bearbeiten</h4>
                <p className="text-xs text-slate-400">
                  Bewertung vom {format(new Date(assessment.date), 'dd.MM.yyyy')} 
                  ({assessment.score} Sterne)
                </p>
              </div>
              
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Notiz zur Bewertung..."
                className="bg-slate-700 border-slate-600 text-white text-sm mb-3 min-h-[80px] w-full"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    handleCancel();
                  } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleSave();
                  }
                }}
              />
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3 mr-1" />
                  Abbrechen
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-3 h-3 mr-1" />
                  {isSaving ? 'Speichern...' : 'Speichern'}
                </Button>
              </div>
              
              <div className="text-xs text-slate-500 mt-2 text-center">
                Tipp: Strg+Enter zum Speichern, Esc zum Abbrechen
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
  allCompetencies = [],
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [quickAddState, setQuickAddState] = useState({ key: null, score: 0, notes: '' });
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
      const entriesToDelete = ueberfachlich.filter(u => u.competency_id === competencyId && u.class_id === activeClassId);
      await Promise.all(entriesToDelete.map(async (entry) => {
        if (entry.id) {
          await UeberfachlichKompetenz.delete(entry.id);
        } else {
          console.warn('Invalid entry for deletion:', entry);
        }
      }));

      if (competencyToDelete) {
        await Competency.delete(competencyToDelete.id);
      } else {
        console.warn('Competency not found for deletion:', competencyId);
      }

      const updatedUeberfachlich = await UeberfachlichKompetenz.list({
        filter: `class_id = '${activeClassId}'`,
        perPage: 500,
        expand: 'student_id,class_id,competency_id',
        $cancelKey: `list-ueberfachliche_kompetenz-postdelete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });

      // NEU: Nach dem Löschen - setze Expansion zurück
      setExpandedCompetencies(new Set());

      const preservedStates = {
        expandedUeberfachlichHistories: Array.from(expandedHistories || []),
        expandedUeberfachlichCompetencies: Array.from([]), // Gelöschte Kompetenz wird nicht erweitert
        performanceTab: 'ueberfachlich'
      };

      onDataChange?.(updatedUeberfachlich, preservedStates);

      const user = User.current();
      if (user && activeClassId) {
        const preference = await UserPreferences.findOne({
          user_id: user.id,
          class_id: activeClassId,
        });
        const preferencesData = preference?.preferences || {};
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

      toast({
        title: "Erfolg",
        description: "Kompetenz und Bewertungen gelöscht",
        variant: "success",
      });
    } catch (error) {
      console.error("Fehler beim Löschen der Kompetenz:", error);
      toast({
        title: "Fehler",
        description: `Fehler beim Löschen der Kompetenz: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAssessment = async (studentId, competencyId, assessmentDate) => {
    if (!window.confirm(`Möchten Sie diese einzelne Bewertung vom ${format(new Date(assessmentDate), 'dd.MM.yyyy')} wirklich löschen?`)) return;
    setIsLoading(true);
    try {
      const comp = ueberfachlich.find(u => u.student_id === studentId && u.competency_id === competencyId);
      if (!comp) return;

      const updatedAssessments = comp.assessments.filter(a => a.date !== assessmentDate);

      if (updatedAssessments.length === 0) {
        await UeberfachlichKompetenz.delete(comp.id);
      } else {
        await UeberfachlichKompetenz.update(comp.id, { assessments: updatedAssessments });
      }

      const user = User.current();
      if (user && activeClassId) {
        const preference = await UserPreferences.findOne({
          user_id: user.id,
          class_id: activeClassId,
        });
        const preferencesData = preference?.preferences || {};
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

      // NEU: Behalte aktuelle Expansion-States
      const preservedStates = {
        expandedUeberfachlichHistories: Array.from(expandedHistories || []),
        expandedUeberfachlichCompetencies: Array.from(expandedCompetencies || []),
        performanceTab: 'ueberfachlich'
      };

      onDataChange?.(null, preservedStates);

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
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditNote = async (studentId, competencyId, assessmentDate, newNoteText) => {
    setIsLoading(true);
    try {
      const comp = ueberfachlich.find(u => u.student_id === studentId && u.competency_id === competencyId);
      if (!comp) {
        throw new Error("Competency not found for note update.");
      }

      const updatedAssessments = comp.assessments.map(assessment => {
        if (assessment.date === assessmentDate) {
          return { ...assessment, notes: newNoteText };
        }
        return assessment;
      });

      const updatedComp = await UeberfachlichKompetenz.update(comp.id, { assessments: updatedAssessments });

      setUeberfachlich(prev => {
        const newUeberfachlich = prev.filter(u => !(u.student_id === studentId && u.competency_id === competencyId));
        return [...newUeberfachlich, updatedComp];
      });

      // NEU: Erweitere Kompetenz und History
      const newExpandedCompetencies = new Set(expandedCompetencies);
      newExpandedCompetencies.add(competencyId);
      setExpandedCompetencies(newExpandedCompetencies);

      const newExpandedHistories = new Set(expandedHistories);
      const historyKey = `${studentId}-${competencyId}`;
      newExpandedHistories.add(historyKey);
      setExpandedHistories(newExpandedHistories);

      const user = User.current();
      if (user && activeClassId) {
        const preference = await UserPreferences.findOne({
          user_id: user.id,
          class_id: activeClassId,
        });
        const preferencesData = preference?.preferences || {};
        preferencesData.expandedCompetencies = Array.from(newExpandedCompetencies);
        preferencesData.expandedHistories = Array.from(newExpandedHistories);
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

      // NEU: Speichere preserved states
      const preservedStates = {
        expandedUeberfachlichHistories: Array.from(newExpandedHistories),
        expandedUeberfachlichCompetencies: Array.from(newExpandedCompetencies),
        performanceTab: 'ueberfachlich'
      };

      onDataChange?.(null, preservedStates);

      toast({
        title: "Erfolg",
        description: "Notiz erfolgreich gespeichert",
        variant: "success",
      });
    } catch (error) {
      console.error("Fehler beim Speichern der Notiz:", error);
      toast({
        title: "Fehler",
        description: `Fehler beim Speichern der Notiz: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdd = async (studentId, competencyId) => {
    if (quickAddState.score === 0) return;
    setIsLoading(true);
    try {
      const user = User.current();
      if (!user || !user.id) throw new Error('Kein Benutzer eingeloggt');

      console.log('handleQuickAdd - Start:', { studentId, competencyId, quickAddState });

      const comp = ueberfachlich.find(u => u.student_id === studentId && u.competency_id === competencyId);
      const newAssessment = { 
        date: new Date().toISOString().slice(0, 10), 
        score: quickAddState.score,
        notes: quickAddState.notes || ''
      };

      let updatedComp;
      if (comp) {
        const updatedAssessments = [...(comp.assessments || []), newAssessment];
        updatedComp = await UeberfachlichKompetenz.update(comp.id, { 
          assessments: updatedAssessments,
          user_id: user.id,
          $cancelKey: `update-ueberfachliche_kompetenz-${studentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
      } else {
        updatedComp = await UeberfachlichKompetenz.create({
          student_id: studentId,
          class_id: activeClassId,
          competency_id: competencyId,
          assessments: [newAssessment],
          user_id: user.id
        }, {
          $cancelKey: `create-ueberfachliche_kompetenz-${studentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
      }

      console.log('handleQuickAdd - Updated/Created Competency:', updatedComp);

      setUeberfachlich(prev => {
        const newUeberfachlich = prev.filter(u => !(u.student_id === studentId && u.competency_id === competencyId));
        return [...newUeberfachlich, updatedComp];
      });

      const newExpandedCompetencies = new Set(expandedCompetencies);
      newExpandedCompetencies.add(competencyId);
      setExpandedCompetencies(newExpandedCompetencies);

      const newExpandedHistories = new Set(expandedHistories);
      const historyKey = `${studentId}-${competencyId}`;
      newExpandedHistories.add(historyKey);
      setExpandedHistories(newExpandedHistories);

      console.log('handleQuickAdd - Expansion States:', {
        expandedCompetencies: Array.from(newExpandedCompetencies),
        expandedHistories: Array.from(newExpandedHistories)
      });

      const preference = await UserPreferences.findOne({
        user_id: user.id,
        class_id: activeClassId,
      });
      const preferencesData = preference?.preferences || {};
      preferencesData.expandedCompetencies = Array.from(newExpandedCompetencies);
      preferencesData.expandedHistories = Array.from(newExpandedHistories);
      preferencesData.performanceTab = 'ueberfachlich';

      console.log('handleQuickAdd - Saving Preferences:', preferencesData);

      if (preference) {
        await UserPreferences.update(preference.id, { preferences: preferencesData });
      } else {
        await UserPreferences.create({
          user_id: user.id,
          class_id: activeClassId,
          preferences: preferencesData,
        });
      }

      console.log('handleQuickAdd - Preferences Saved');

      const updatedUeberfachlich = await UeberfachlichKompetenz.list({
        filter: `class_id = '${activeClassId}'`,
        perPage: 500,
        expand: 'student_id,class_id,competency_id',
        $cancelKey: `list-ueberfachliche_kompetenz-quickadd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
      setUeberfachlich(updatedUeberfachlich || []);

      console.log('handleQuickAdd - Updated Ueberfachlich:', updatedUeberfachlich);

      // NEU: Speichere Expansion-States vor onDataChange
      const preservedStates = {
        expandedUeberfachlichHistories: Array.from(newExpandedHistories),
        expandedUeberfachlichCompetencies: Array.from(newExpandedCompetencies),
        performanceTab: 'ueberfachlich'
      };

      setQuickAddState({ key: null, score: 0, notes: '' });

      toast({
        title: "Erfolg",
        description: "Bewertung erfolgreich hinzugefügt",
        variant: "success",
      });

      // NEU: Übergib preservedStates an onDataChange
      onDataChange?.(updatedUeberfachlich, preservedStates);

    } catch (error) {
      console.error('handleQuickAdd - Error:', error);
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
                                    const historyKey = `${student.id}-${competencyId}`;
                                    setQuickAddState({ key: historyKey, score: 0, notes: '' });
                                    toggleHistoryExpansion(historyKey);
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
                                    onClick={() => setQuickAddState({ key: null, score: 0, notes: '' })}
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
                                          notes={quickAddState.notes}
                                          onNotesChange={(newNoteText) => setQuickAddState(prev => ({ ...prev, notes: newNoteText }))}
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
                                          <EditableNote
                                            assessment={assessment}
                                            studentId={student.id}
                                            competencyId={competencyId}
                                            onSave={handleEditNote}
                                          />
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