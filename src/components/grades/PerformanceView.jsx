import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { usePreferences } from './hooks/usePreferences';
import { useToast } from "@/components/ui/use-toast";
import { Performance, UeberfachlichKompetenz, Subject, Competency, Fachbereich, User } from '@/api/entities';
import CalendarLoader from '../ui/CalendarLoader';
import PerformanceModal from './PerformanceModal';
import UeberfachlichModal from './UeberfachlichModal';
import { BarChart3, Plus } from 'lucide-react';

// Lazy-load Tabs for performance
const DiagramTab = React.lazy(() => import('./DiagramTab/DiagramTab')); // Korrigierter Pfad
const LeistungenTable = React.lazy(() => import('./LeistungenTable'));
const UeberfachlichTable = React.lazy(() => import('./UeberfachlichTable'));

const PerformanceView = ({ students = [], performances = [], activeClassId, classes = [], onDataChange }) => {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState([]);
  const [allCompetencies, setAllCompetencies] = useState([]);
  const [ueberfachlich, setUeberfachlich] = useState([]);
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
          const [subjectsData, competenciesData, fachbereicheData, ueberfachlichData] = await Promise.all([
            Subject.filter({ class_id: activeClassId }),
            Competency.filter({ class_id: activeClassId }),
            Fachbereich.filter({ class_id: activeClassId }),
            UeberfachlichKompetenz.filter({ class_id: activeClassId })
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
      <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-400">
        Bitte wählen Sie eine Klasse aus
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-white/0 dark:bg-slate-900/0">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-xl p-2 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
          <Button
            onClick={() => handleTabChange('diagramme')}
            variant={tab === 'diagramme' ? 'default' : 'ghost'}
            disabled={preferencesLoading}
            className={`${tab === 'diagramme' ? 'bg-green-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'} transition-all duration-200 ${preferencesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Diagramme
          </Button>
          <Button
            onClick={() => handleTabChange('leistungen')}
            variant={tab === 'leistungen' ? 'default' : 'ghost'}
            disabled={preferencesLoading}
            className={`${tab === 'leistungen' ? 'bg-green-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'} transition-all duration-200 ${preferencesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Leistungen
          </Button>
          <Button
            onClick={() => {
              console.log('Button click: switching to ueberfachlich');
              handleTabChange('ueberfachlich');
            }}
            variant={tab === 'ueberfachlich' ? 'default' : 'ghost'}
            disabled={preferencesLoading}
            className={`${tab === 'ueberfachlich' ? 'bg-green-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'} transition-all duration-200 ${preferencesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Überfachlich
          </Button>
        </div>
        {preferencesLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400 mt-2">
            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Lade Präferenzen...</span>
          </div>
        )}
        <div className="flex gap-2">
          {tab === 'leistungen' && (
            <Button onClick={handleCreatePerformance} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2"/>
              Neue Leistungsbeurteilung
            </Button>
          )}
          {tab === 'ueberfachlich' && (
            <Button onClick={handleCreateUeberfachlich} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2"/>
              Neue Kompetenzerfassung
            </Button>
          )}
        </div>
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