import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { usePreferences } from './hooks/usePreferences';
import { useToast } from "@/components/ui/use-toast";
import { Performance, UeberfachlichKompetenz, Subject, Competency, Fachbereich, User, ChoreAssignment } from '@/api/entities';
import CalendarLoader from '../ui/CalendarLoader';
import PerformanceModal from './PerformanceModal';
import UeberfachlichModal from './UeberfachlichModal';
import { BarChart3, Plus, GraduationCap, Users } from 'lucide-react';

// Lazy-load Tabs for performance
const DiagramTab = React.lazy(() => import('./DiagramTab/DiagramTab')); // Korrigierter Pfad
const LeistungenTable = React.lazy(() => import('./LeistungenTable'));
const UeberfachlichTable = React.lazy(() => import('./UeberfachlichTable'));

const PerformanceView = ({ students = [], performances = [], activeClassId, setActiveClassId, classes = [], onDataChange, selectedStudentId }) => {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState([]);
  const [allCompetencies, setAllCompetencies] = useState([]);
  const [ueberfachlich, setUeberfachlich] = useState([]);
  const [choreAssignments, setChoreAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const [isUeberfachlichModalOpen, setIsUeberfachlichModalOpen] = useState(false);
  const [editingPerformance, setEditingPerformance] = useState(null);

  const {
    tab,
    setTab,
    expandedLeistungenRows,
    setExpandedLeistungenRows,
    expandedUeberfachlichHistories,
    setExpandedUeberfachlichHistories,
    expandedUeberfachlichCompetencies,
    setExpandedUeberfachlichCompetencies,
    savePreferences,
    isLoading: preferencesLoading
  } = usePreferences(activeClassId);

  // Zentrale Datenladung
  useEffect(() => {
    const loadClassSpecificData = async () => {
      try {
        if (activeClassId) {
          setIsLoading(true);
          console.log('Loading data for class_id:', activeClassId);
          const [subjectsData, competenciesData, fachbereicheData, ueberfachlichData, choreAssignmentsData] = await Promise.all([
            Subject.filter({ class_id: activeClassId }),
            Competency.filter({ class_id: activeClassId }),
            Fachbereich.filter({ class_id: activeClassId }),
            UeberfachlichKompetenz.filter({ class_id: activeClassId }),
            ChoreAssignment.filter({ class_id: activeClassId }).catch(() => [])
          ]);
          // Validierung der überfachlichen Kompetenzen
          const validUeberfachlich = ueberfachlichData.filter(u => {
            const hasValidCompetency = competenciesData.some(c => c.id === u.competency_id);
            if (!hasValidCompetency && u.competency_id) {
              console.warn(`Invalid competency_id ${u.competency_id} in ueberfachlich entry:`, u);
            }
            return true; // Lockere: Behalte alle, auch invalid – filtern nur bei Bedarf
          });
          setUeberfachlich(validUeberfachlich || []);
          console.log('Loaded data:', {
            subjects: subjectsData,
            competencies: competenciesData,
            fachbereiche: fachbereicheData,
            ueberfachlich: validUeberfachlich
          });
          setSubjects(subjectsData || []);
          setAllCompetencies(competenciesData || []);
          setChoreAssignments(choreAssignmentsData || []);
          if (validUeberfachlich.length > 0) {
            console.log('ueberfachlich details:', validUeberfachlich);
          } else {
            console.warn('No valid ueberfachlich data found for class_id:', activeClassId);
          }
        }
      } catch (error) {
        console.error("Error loading class-specific data:", error);
        toast({
          title: "Fehler",
          description: "Fehler beim Laden der Daten. Bitte versuchen Sie es erneut.",
          variant: "destructive",
        });
        setSubjects([]);
        setAllCompetencies([]);
        setUeberfachlich([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadClassSpecificData();
  }, [activeClassId, toast]);

  // handleTabChange mit Collapse
  const handleTabChange = useCallback((newTab) => {
    console.log('handleTabChange called with:', newTab, 'Current tab:', tab, 'Preferences loading:', preferencesLoading);

    if (preferencesLoading) {
      console.log('Tab change blocked - preferences still loading');
      return;
    }

    const validTabs = ['diagramme', 'leistungen', 'ueberfachlich'];
    if (!validTabs.includes(newTab)) {
      console.warn('Invalid tab:', newTab);
      return;
    }

    setExpandedLeistungenRows(new Set());
    setExpandedUeberfachlichHistories(new Set());
    setExpandedUeberfachlichCompetencies(new Set());

    setTab(newTab);
    console.log('Tab changed to:', newTab);
  }, [preferencesLoading, setExpandedLeistungenRows, setExpandedUeberfachlichHistories, setExpandedUeberfachlichCompetencies, setTab]);

  // handleDataChange
  const handleDataChange = async (updatedUeberfachlich, preservedExpansionStates = null) => {
    try {
      if (updatedUeberfachlich) {
        setUeberfachlich(updatedUeberfachlich);
      } else {
        const [subjectsData, competenciesData, fachbereicheData, ueberfachlichData, performancesData] = await Promise.all([
          Subject.filter({ class_id: activeClassId }),
          Competency.filter({ class_id: activeClassId }),
          Fachbereich.filter({ class_id: activeClassId }),
          UeberfachlichKompetenz.list({
            filter: `class_id = '${activeClassId}'`,
            perPage: 500,
            expand: 'student_id,class_id,competency_id'
          }),
          Performance.list({
            filter: `class_id = '${activeClassId}'`,
            perPage: 500,
            expand: 'student_id,class_id,subject'
          })
        ]);
        setSubjects(subjectsData || []);
        setAllCompetencies(competenciesData || []);
        setUeberfachlich(ueberfachlichData || []);
        if (onDataChange) onDataChange(performancesData);
      }

      if (preservedExpansionStates) {
        console.log('handleDataChange - Restoring preserved expansion states:', preservedExpansionStates);

        setExpandedLeistungenRows(new Set(preservedExpansionStates.expandedLeistungenRows || []));
        setExpandedUeberfachlichHistories(new Set(preservedExpansionStates.expandedUeberfachlichHistories || []));
        setExpandedUeberfachlichCompetencies(new Set(preservedExpansionStates.expandedUeberfachlichCompetencies || []));

        savePreferences(preservedExpansionStates);
        return;
      }
    } catch (error) {
      if (!error.message?.includes('autocancelled')) {
        console.error('Error in handleDataChange:', error);
        toast({
          title: "Fehler",
          description: "Fehler beim Aktualisieren der Daten.",
          variant: "destructive",
        });
      }
    }
  };

  // handleDeletePerformance
  const handleDeletePerformance = async (performanceId) => {
    const group = performances.filter(p => {
      const target = performances.find(p => p.id === performanceId);
      const key = `${target.assessment_name}-${target.subject}-${target.date}`;
      return `${p.assessment_name}-${p.subject}-${p.date}` === key;
    });
    if (!window.confirm(`Möchten Sie ${group.length} Leistungsbeurteilungen für "${group[0].assessment_name}" wirklich löschen?`)) return;
    try {
      const deletePromises = group.map(p => Performance.delete(p.id));
      const results = await Promise.all(deletePromises);
      if (results.every(success => success)) {
        if (onDataChange) onDataChange();
        savePreferences(); // Speichere aktuelle Präferenzen
      } else {
        throw new Error('Ein oder mehrere Löschvorgänge fehlgeschlagen');
      }
    } catch (error) {
      console.error('Fehler beim Löschen der Leistungsbeurteilungen:', error);
      alert('Fehler beim Löschen der Leistungsbeurteilungen. Bitte versuchen Sie es erneut.');
    }
  };

  // handleCreatePerformance
  const handleCreatePerformance = () => {
    setEditingPerformance(null);
    setIsPerformanceModalOpen(true);
  };

  // handleCreateUeberfachlich
  const handleCreateUeberfachlich = () => setIsUeberfachlichModalOpen(true);

  // handleChoreUpdate - Einzelne Ämtli-Korrektur aus dem Modal
  const handleChoreUpdate = useCallback(async (choreId, isCompleted) => {
    try {
      await ChoreAssignment.update(choreId, {
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null
      });

      // Refresh choreAssignments
      const updatedChoreAssignments = await ChoreAssignment.filter({ class_id: activeClassId }).catch(() => []);
      setChoreAssignments(updatedChoreAssignments || []);

      toast({
        title: isCompleted ? "Erledigt" : "Nicht erledigt",
        description: `Ämtli wurde als ${isCompleted ? 'erledigt' : 'nicht erledigt'} markiert.`,
        variant: isCompleted ? "success" : "default",
      });
    } catch (error) {
      console.error('Error updating chore:', error);
      toast({
        title: "Fehler",
        description: "Ämtli konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    }
  }, [activeClassId, toast]);

  // handleSavePerformance
  const handleSavePerformance = async (data, performanceIdToUpdate) => {
    try {
      const user = User.current();
      if (!user) throw new Error('Kein Benutzer eingeloggt');
      if (performanceIdToUpdate) {
        await Performance.update(performanceIdToUpdate, {
          ...data[0],
          class_id: activeClassId,
          user_id: user.id
        });
      } else {
        const performancesWithClassId = Array.isArray(data) ? data.map(p => ({
          ...p,
          class_id: activeClassId,
          user_id: user.id
        })) : [{
          ...data,
          class_id: activeClassId,
          user_id: user.id
        }];
        const results = await Performance.bulkCreate(performancesWithClassId);
        if (results.some(result => result === null)) {
          console.warn('Some performance records failed to create:', results);
          alert('Einige Leistungen konnten nicht gespeichert werden. Bitte überprüfen Sie die Daten und versuchen Sie es erneut.');
        }
      }
      if (onDataChange) onDataChange();
      setIsPerformanceModalOpen(false);
      setEditingPerformance(null);
      savePreferences();
    } catch (error) {
      console.error("Error saving performance:", error);
      alert(`Fehler beim Speichern der Leistung: ${error.message || 'Unbekannter Fehler'}`);
    }
  };

  // handleSaveUeberfachlichBatch
  const handleSaveUeberfachlichBatch = async (batchData) => {
    if (!batchData) return;
    const { competencyId, date, ratings, notes } = batchData;
    const currentExpandedCompetencies = new Set(expandedUeberfachlichCompetencies);
    const currentExpandedHistories = new Set(expandedUeberfachlichHistories);
   
    currentExpandedCompetencies.add(competencyId);
    Object.keys(ratings).forEach(studentId => {
      const historyKey = `${studentId}-${competencyId}`;
      currentExpandedHistories.add(historyKey);
    });
    setIsUeberfachlichModalOpen(false);
    try {
      const user = User.current();
      if (!user || !user.id) throw new Error('Kein Benutzer eingeloggt');
      const competencies = await Competency.filter({
        filter: `class_id = '${activeClassId}'`,
        perPage: 500,
        expand: 'user_id,class_id',
        $cancelKey: `list-competencie-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
      setAllCompetencies(competencies || []);
      let existingEntries = [];
      try {
        const filterParams = {
          filter: `class_id = '${activeClassId}' && competency_id = '${competencyId}'`,
          perPage: 500,
          expand: 'student_id,class_id,competency_id',
          $cancelKey: `list-ueberfachliche_kompetenz-filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        existingEntries = await UeberfachlichKompetenz.list(filterParams);
      } catch (error) {
        console.error('Fehler beim Filtern von ueberfachliche_kompetenzen:', error);
        existingEntries = [];
      }
      const promises = Object.entries(ratings).map(async ([studentId, score], index) => {
        const studentExistingEntry = existingEntries.find(e =>
          e.student_id === studentId && e.competency_id === competencyId
        );
        const newAssessment = {
          date,
          score: Number(score),
          notes: notes[studentId] || ''
        };
        if (studentExistingEntry) {
          const updatedAssessments = [...(studentExistingEntry.assessments || []), newAssessment];
          const updated = await UeberfachlichKompetenz.update(studentExistingEntry.id, {
            assessments: updatedAssessments,
            user_id: user.id,
            $cancelKey: `update-ueberfachliche_kompetenz-${studentId}-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
          });
          return updated;
        } else {
          const created = await UeberfachlichKompetenz.create({
            student_id: studentId,
            class_id: activeClassId,
            competency_id: competencyId,
            assessments: [newAssessment],
            user_id: user.id
          }, {
            $cancelKey: `create-ueberfachliche_kompetenz-${studentId}-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
          });
          return created;
        }
      });
      const results = await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 500));
      const expansionStatesToSave = {
        expandedLeistungenRows: Array.from(expandedLeistungenRows),
        expandedUeberfachlichHistories: Array.from(currentExpandedHistories),
        expandedUeberfachlichCompetencies: Array.from(currentExpandedCompetencies),
        performanceTab: 'ueberfachlich'
      };
      const updatedUeberfachlich = await UeberfachlichKompetenz.list({
        filter: `class_id = '${activeClassId}'`,
        perPage: 500,
        expand: 'student_id,class_id,competency_id',
        $cancelKey: `list-ueberfachliche_kompetenz-postsave-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
      setUeberfachlich(updatedUeberfachlich || []);
      setExpandedUeberfachlichCompetencies(currentExpandedCompetencies);
      setExpandedUeberfachlichHistories(currentExpandedHistories);
      setTab('ueberfachlich');
      savePreferences(expansionStatesToSave);
      toast({
        title: "Erfolg",
        description: "Kompetenz und Bewertungen gespeichert",
        variant: "success",
      });
      if (onDataChange) {
        onDataChange(updatedUeberfachlich, expansionStatesToSave);
      }
      console.log('Saved ueberfachlich with preserved expansion states:', {
        competencyId,
        expandedCompetencies: Array.from(currentExpandedCompetencies),
        expandedHistories: Array.from(currentExpandedHistories)
      });
    } catch (error) {
      console.error("Fehler beim Speichern der überfachlichen Kompetenzen:", error);
      toast({
        title: "Fehler",
        description: `Fehler beim Speichern der Kompetenzen: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  if (isLoading || preferencesLoading) {
    return <CalendarLoader />;
  }

  if (!activeClassId) {
    return (
      <div className="p-4 sm:p-6">
        {/* Header Row: Icon + Title + Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Noten</h1>
          </div>
        </div>

        {/* Class Selector */}
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 min-w-[140px]">
            <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <select
              value=""
              onChange={(e) => setActiveClassId(e.target.value)}
              className="bg-transparent text-sm text-gray-900 dark:text-white font-medium border-none outline-none cursor-pointer"
            >
              <option disabled value="">Klasse auswählen...</option>
              {classes.map(cls => (
                <option key={cls.id} value={String(cls.id)}>{cls.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Keine Klasse ausgewählt</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Bitte wählen Sie eine Klasse aus, um die Leistungsübersicht anzuzeigen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-white/0 dark:bg-slate-900/0">
      {/* Header Row: Icon + Title + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800 rounded-xl flex items-center justify-center shadow-lg">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Noten</h1>
        </div>

        <div className="flex gap-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-xl p-1.5 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
          <Button
            onClick={() => handleTabChange('diagramme')}
            variant={tab === 'diagramme' ? 'default' : 'ghost'}
            disabled={preferencesLoading}
            size="sm"
            className={`${tab === 'diagramme' ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'} transition-all duration-200 ${preferencesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <BarChart3 className="w-4 h-4 mr-1.5" />
            Diagramme
          </Button>
          <Button
            onClick={() => handleTabChange('leistungen')}
            variant={tab === 'leistungen' ? 'default' : 'ghost'}
            disabled={preferencesLoading}
            size="sm"
            className={`${tab === 'leistungen' ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'} transition-all duration-200 ${preferencesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Leistungen
          </Button>
          <Button
            onClick={() => handleTabChange('ueberfachlich')}
            variant={tab === 'ueberfachlich' ? 'default' : 'ghost'}
            disabled={preferencesLoading}
            size="sm"
            className={`${tab === 'ueberfachlich' ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'} transition-all duration-200 ${preferencesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Überfachlich
          </Button>
        </div>
      </div>

      {/* Filter Row: Class + Subject/Options + Create Button */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
        {/* Class Selector */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <select
            value={activeClassId || ''}
            onChange={(e) => setActiveClassId(e.target.value)}
            className="bg-transparent text-sm text-gray-900 dark:text-white font-medium border-none outline-none cursor-pointer"
            disabled={classes.length === 0}
          >
            <option disabled value="">Klasse...</option>
            {classes.map(cls => (
              <option key={cls.id} value={String(cls.id)}>{cls.name}</option>
            ))}
          </select>
        </div>

        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 hidden sm:block" />

        {/* Loading Indicator */}
        {preferencesLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Lade...</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Create Buttons */}
        {tab === 'leistungen' && (
          <Button onClick={handleCreatePerformance} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1.5"/>
            Neue Leistung
          </Button>
        )}
        {tab === 'ueberfachlich' && (
          <Button onClick={handleCreateUeberfachlich} size="sm" className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-1.5"/>
            Neue Kompetenz
          </Button>
        )}
      </div>
      <Suspense fallback={<CalendarLoader />}>
        {tab === 'diagramme' && (
          <DiagramTab
            students={students}
            performances={performances}
            ueberfachlich={ueberfachlich}
            subjects={subjects}
            allCompetencies={allCompetencies}
            activeClassId={activeClassId}
            onDataChange={onDataChange}
            selectedStudentId={selectedStudentId}
            choreAssignments={choreAssignments}
            onChoreUpdate={handleChoreUpdate}
          />
        )}
        {tab === 'leistungen' && (
          <LeistungenTable
            students={students}
            performances={performances}
            subjects={subjects}
            activeClassId={activeClassId}
            onDataChange={onDataChange}
            expandedRows={expandedLeistungenRows}
            setExpandedRows={setExpandedLeistungenRows}
            savePreferences={savePreferences}
            onDelete={handleDeletePerformance}
            onEdit={(performance) => {
              setEditingPerformance(performance);
              setIsPerformanceModalOpen(true);
            }}
          />
        )}
        {tab === 'ueberfachlich' && (
          <UeberfachlichTable
            students={students}
            ueberfachlich={ueberfachlich}
            activeClassId={activeClassId}
            onDataChange={handleDataChange}
            setTab={setTab}
            setUeberfachlich={setUeberfachlich}
            expandedHistories={expandedUeberfachlichHistories}
            setExpandedHistories={setExpandedUeberfachlichHistories}
            expandedCompetencies={expandedUeberfachlichCompetencies}
            setExpandedCompetencies={setExpandedUeberfachlichCompetencies}
            allCompetencies={allCompetencies}
            savePreferences={savePreferences}
          />
        )}
      </Suspense>
      <PerformanceModal
        isOpen={isPerformanceModalOpen}
        onClose={() => {
          setIsPerformanceModalOpen(false);
          setEditingPerformance(null);
        }}
        onSave={handleSavePerformance}
        students={students}
        subjects={subjects}
        activeClassId={activeClassId}
        editingPerformance={editingPerformance}
      />
      <UeberfachlichModal
        isOpen={isUeberfachlichModalOpen}
        onClose={() => setIsUeberfachlichModalOpen(false)}
        onSave={handleSaveUeberfachlichBatch}
        students={students}
        activeClassId={activeClassId}
        allCompetencies={allCompetencies}
        onDataChange={onDataChange}
      />
    </div>
  );
};

export default PerformanceView;