// src/components/grades/PerformanceView.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, BarChart, Bar, ReferenceArea } from 'recharts';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Performance, UeberfachlichKompetenz, Subject, Competency, Fachbereich, User } from '@/api/entities';
import { Filter, BarChart3, ChevronDown, ChevronUp, Star, Activity, FileText, Plus } from 'lucide-react';
import LeistungenTable from './LeistungenTable';
import UeberfachlichTable from './UeberfachlichTable';
import PerformanceModal from './PerformanceModal';
import UeberfachlichModal from './UeberfachlichModal';
import CalendarLoader from '../ui/CalendarLoader';
import { format } from "date-fns";
import { usePreferences } from './hooks/usePreferences';
import { useChartData } from './hooks/useChartData';
import { CONFIG } from './utils/constants';

const PerformanceView = ({ students = [], performances = [], activeClassId, classes = [], onDataChange }) => {
  const { toast } = useToast();
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('Alle');
  const [selectedCompetencyForProgression, setSelectedCompetencyForProgression] = useState(null);
  const [showClassAverage, setShowClassAverage] = useState(true);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const [editingPerformance, setEditingPerformance] = useState(null);
  const [isUeberfachlichModalOpen, setIsUeberfachlichModalOpen] = useState(false);
  const [enlargedChart, setEnlargedChart] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [allCompetencies, setAllCompetencies] = useState([]);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [diagramView, setDiagramView] = useState('leistung');
  const [isLoading, setIsLoading] = useState(true);
  const [ueberfachlich, setUeberfachlich] = useState([]);

  // Phase 1: Integration von usePreferences
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

  // Phase 1: Integration von useChartData
  const {
    lineData,
    fachbereichData,
    ueberfachlichData,
    ueberfachlichProgressionData,
    getStudentColor
  } = useChartData({
    performances,
    ueberfachlich,
    students,
    selectedSubject,
    selectedCompetencyForProgression,
    selectedStudents,
    showClassAverage,
    diagramView
  });

  // handleTabChange mit Collapse
  const handleTabChange = useCallback((newTab) => {
    console.log('handleTabChange called with:', newTab, 'Current tab:', tab, 'Preferences loading:', preferencesLoading);

    // Fix: Verhindere Tab-Wechsel während Preferences Loading
    if (preferencesLoading) {
      console.log('Tab change blocked - preferences still loading');
      return;
    }

    const validTabs = ['diagramme', 'leistungen', 'ueberfachlich'];
    if (!validTabs.includes(newTab)) {
      console.warn('Invalid tab:', newTab);
      return;
    }

    // Collapse alle Expansion-States beim Tab-Wechsel
    setExpandedLeistungenRows(new Set());
    setExpandedUeberfachlichHistories(new Set());
    setExpandedUeberfachlichCompetencies(new Set());

    setTab(newTab);
    console.log('Tab changed to:', newTab);

    // Fix: Delay savePreferences leicht, um Race-Conditions zu vermeiden
    setTimeout(() => {
      savePreferences();
    }, 100);
  }, [tab, savePreferences, preferencesLoading]);

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

      // Normale Präferenz-Ladung (nicht mehr nötig, da usePreferences das handhabt)
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

  // Safe rendering helper
  const canRenderChart = (data) => {
    if (!Array.isArray(data)) return false;
    if (data.length === 0) return false;
    return data.every(item => item && typeof item === 'object' && item.name);
  };

  // useEffect für Class-Specific Data
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
            if (!hasValidCompetency) {
              console.warn(`Invalid competency_id ${u.competency_id} in ueberfachlich entry:`, u);
            }
            return hasValidCompetency;
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
          setUeberfachlich(validUeberfachlich || []);
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
  }, [activeClassId]);

  const studentOptions = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return students.map(s => ({
      value: s.id,
      label: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unnamed Student'
    }));
  }, [students]);

  const subjectOptions = useMemo(() => {
    if (!Array.isArray(subjects)) return [{ value: 'all', label: 'Alle' }];
    const options = subjects
      .filter(s => s && s.id && s.name && s.class_id === activeClassId)
      .map(s => ({
        value: s.id,
        label: s.name
      }));
    return [{ value: 'all', label: 'Alle' }, ...options];
  }, [subjects, activeClassId]);

  const competencyOptions = useMemo(() => {
    if (!Array.isArray(allCompetencies)) return [];
    return (allCompetencies || []).map(c => c.name).filter(Boolean);
  }, [allCompetencies]);

  const handleCreatePerformance = () => {
    setEditingPerformance(null);
    setIsPerformanceModalOpen(true);
  };

  const handleCreateUeberfachlich = () => setIsUeberfachlichModalOpen(true);

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
      // Speichere aktuelle Präferenzen
      savePreferences();
    } catch (error) {
      console.error("Error saving performance:", error);
      alert(`Fehler beim Speichern der Leistung: ${error.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleSaveUeberfachlichBatch = async (batchData) => {
    if (!batchData) return;
    const { competencyId, date, ratings, notes } = batchData;
    // NEU: Speichere aktuelle Expansion-States VOR dem Speichern
    const currentExpandedCompetencies = new Set(expandedUeberfachlichCompetencies);
    const currentExpandedHistories = new Set(expandedUeberfachlichHistories);
   
    // Erweitere die betroffene Kompetenz
    currentExpandedCompetencies.add(competencyId);
   
    // Erweitere Histories für alle betroffenen Schüler
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
      // NEU: Speichere Expansion-States VOR dem Datenreload
      const expansionStatesToSave = {
        expandedLeistungenRows: Array.from(expandedLeistungenRows),
        expandedUeberfachlichHistories: Array.from(currentExpandedHistories),
        expandedUeberfachlichCompetencies: Array.from(currentExpandedCompetencies),
        performanceTab: 'ueberfachlich' // Bleibt auf ueberfachlich
      };
      const updatedUeberfachlich = await UeberfachlichKompetenz.list({
        filter: `class_id = '${activeClassId}'`,
        perPage: 500,
        expand: 'student_id,class_id,competency_id',
        $cancelKey: `list-ueberfachliche_kompetenz-postsave-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
      setUeberfachlich(updatedUeberfachlich || []);
      // NEU: Stelle Expansion-States explizit wieder her NACH dem Datenreload
      setExpandedUeberfachlichCompetencies(currentExpandedCompetencies);
      setExpandedUeberfachlichHistories(currentExpandedHistories);
      // Tab bleibt auf ueberfachlich
      setTab('ueberfachlich');
      // Speichere Expansion-States
      savePreferences(expansionStatesToSave);
      toast({
        title: "Erfolg",
        description: "Kompetenz und Bewertungen gespeichert",
        variant: "success",
      });
      if (onDataChange) {
        // NEU: Übergib die gespeicherten Expansion-States
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

  useEffect(() => {
    console.log('Auto-select useEffect triggered:', {
      diagramView,
      selectedCompetencyForProgression,
      competencyOptionsLength: competencyOptions.length
    });

    if (diagramView === 'kompetenzen') {
      if (!selectedCompetencyForProgression ||
          !competencyOptions.includes(selectedCompetencyForProgression)) {
        if (competencyOptions.length > 0) {
          console.log('Auto-selecting first competency:', competencyOptions[0]);
          setSelectedCompetencyForProgression(competencyOptions[0]);
        }
      }
    } else if (diagramView === 'leistung') {
      if (selectedCompetencyForProgression) {
        setSelectedCompetencyForProgression(null);
      }
      if (!selectedSubject || selectedSubject === 'Alle') {
        setSelectedSubject('Alle');
      }
    }
  }, [diagramView, competencyOptions]);

  const handleStudentSelection = (studentId, checked) => {
    if (!studentId || typeof studentId !== 'string') {
      console.warn('Invalid studentId in handleStudentSelection:', studentId);
      return;
    }

    setSelectedStudents(prev => {
      const currentSelection = Array.isArray(prev) ? prev : [];
      if (checked) {
        if (!currentSelection.includes(studentId)) {
          return [...currentSelection, studentId];
        }
        return currentSelection;
      } else {
        return currentSelection.filter(id => id !== studentId);
      }
    });
  };

  const handleSelectAllStudents = (checked) => {
    if (!Array.isArray(studentOptions)) {
      console.warn('studentOptions is not an array:', studentOptions);
      return;
    }

    const allStudentIds = studentOptions.map(s => s.value).filter(id => id && typeof id === 'string');

    if (checked) {
      setSelectedStudents(allStudentIds);
    } else {
      setSelectedStudents([]);
    }
  };

  const shouldUseBarChart = fachbereichData.length < 3 && fachbereichData.length > 0;
  const shouldUseUeberfachlichBarChart = ueberfachlichData.length < 3 && ueberfachlichData.length > 0;

  const renderChartContent = (chartType, data, yDomain, showReverse = false) => {
    const isBarChart = chartType === 'bar';
    const isRadarChart = chartType === 'radar';
    const isLineChart = chartType === 'line';

    if (!canRenderChart(data) || data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 p-4">
          <BarChart3 className="w-10 h-10 mb-2" />
          <p className="font-semibold">Keine Daten verfügbar</p>
          <p className="text-sm">Für die aktuelle Auswahl gibt es keine Daten zum Anzeigen.</p>
        </div>
      );
    }

    const yAxisProps = {
      domain: yDomain,
      reversed: showReverse,
      stroke: "hsl(var(--muted-foreground))",
      tick: { fontSize: 12 },
    };
    if (chartType === 'line' && showReverse) {
      yAxisProps.ticks = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
      yAxisProps.reversed = false;
    }
    if (chartType === 'bar' && !showReverse) {
      yAxisProps.ticks = [1, 2, 3, 4, 5];
    }
    if (chartType === 'bar' && showReverse) {
      yAxisProps.ticks = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
      yAxisProps.reversed = false;
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        {isBarChart ? (
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
            />
            <YAxis {...yAxisProps} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--card-foreground))'
              }}
              labelStyle={{ color: 'hsl(var(--card-foreground))' }}
              filterNull={true}
            />
            <Legend />
            {showClassAverage && (
              <Bar
                dataKey="Klassenschnitt"
                fill="#10B981"
                opacity={0.8}
              />
            )}
            {selectedStudents.map((studentId, index) => {
              const student = students.find(s => s && s.id === studentId);
              if (!student || !student.name) return null;
              return (
                <Bar
                  key={`bar-student-${student.id}`}
                  dataKey={student.name}
                  fill={getStudentColor(index)}
                  opacity={0.8}
                />
              );
            })}
          </BarChart>
        ) : isRadarChart ? (
          <RadarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            />
            {showClassAverage && (
              <Radar
                name="Klassenschnitt"
                dataKey="Klassenschnitt"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.2}
                strokeWidth={2}
                connectNulls={false}
              />
            )}
            {selectedStudents.map((studentId, index) => {
              const student = students.find(s => s && s.id === studentId);
              if (!student || !student.name) return null;
              return (
                <Radar
                  key={`radar-student-${student.id}`}
                  name={student.name}
                  dataKey={student.name}
                  stroke={getStudentColor(index)}
                  fill={getStudentColor(index)}
                  fillOpacity={0.1}
                  strokeWidth={2}
                  connectNulls={false}
                />
              );
            })}
            <Legend />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--card-foreground))'
              }}
              labelStyle={{ color: 'hsl(var(--card-foreground))' }}
              filterNull={true}
            />
          </RadarChart>
        ) : (
          <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            {/* Hintergrundbereiche für Leistungsverlauf */}
            {enlargedChart === 'verlauf' || diagramView === 'leistung' ? (
              <>
                <ReferenceArea y1={1} y2={4.5} fill="rgba(255, 99, 71, 0.1)" fillOpacity={0.3} />
                <ReferenceArea y1={4.5} y2={5} fill="rgba(255, 255, 0, 0.1)" fillOpacity={0.3} />
                <ReferenceArea y1={5} y2={6} fill="rgba(0, 128, 0, 0.1)" fillOpacity={0.3} />
              </>
            ) : null}
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis {...yAxisProps} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--card-foreground))'
              }}
              labelStyle={{ color: 'hsl(var(--card-foreground))' }}
              filterNull={true}
            />
            <Legend />
            {showClassAverage && (
              <Line
                type="monotone"
                dataKey="Klassenschnitt"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={false}
              />
            )}
            {selectedStudents.map((studentId, index) => {
              const student = students.find(s => s && s.id === studentId);
              if (!student || !student.name) return null;
              return (
                <Line
                  key={`student-${student.id}`}
                  type="monotone"
                  dataKey={student.name}
                  stroke={getStudentColor(index)}
                  strokeWidth={2}
                  connectNulls={false}
                />
              );
            })}
          </LineChart>
        )}
      </ResponsiveContainer>
    );
  };

  const renderStudentNotes = () => {
    if (selectedStudents.length !== 1) return null;

    const studentId = selectedStudents[0];
    if (!studentId || typeof studentId !== 'string') {
      console.warn('Invalid studentId for notes:', studentId);
      return null;
    }

    const student = students.find(s => s && s.id === studentId);
    if (!student || !student.name) {
      console.warn('Student not found for notes:', studentId);
      return null;
    }

    const studentAssessments = [];
    (ueberfachlich || []).forEach(comp => {
      if (comp && comp.student_id === studentId && Array.isArray(comp.assessments)) {
        comp.assessments.forEach(assessment => {
          if (assessment && assessment.notes && assessment.notes.trim()) {
            studentAssessments.push({
              competency: comp.competency_name_display || 'Unbekannte Kompetenz',
              date: assessment.date,
              score: assessment.score,
              notes: assessment.notes
            });
          }
        });
      }
    });

    studentAssessments.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (studentAssessments.length === 0) return null;

    return (
      <Card className="bg-slate-800 text-white border-slate-700 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            Notizen für {student.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
            {studentAssessments.map((assessment, index) => (
              <div key={index} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-white">
                    {assessment.competency}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= assessment.score
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-slate-500'
                          }`}
                        />
                      ))}
                    </div>
                    <span>{assessment.date ? format(new Date(assessment.date), 'dd.MM.yyyy') : 'Unbekannt'}</span>
                  </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {assessment.notes}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
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

  if (tab === 'loading') {  // Fix: Expliziter Check für 'loading' - zeige Loader, statt else zu fallen
    return <CalendarLoader />;
  }

  return (
    <div className="p-4 sm:p-6 bg-white/0 dark:bg-slate-900/0">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-xl p-2 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
          <Button
            onClick={() => handleTabChange('diagramme')}
            variant={tab === 'diagramme' ? 'default' : 'ghost'}
            disabled={preferencesLoading}  // Fix: Deaktiviere während Loading
            className={`${tab === 'diagramme' ? 'bg-green-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'} transition-all duration-200 ${preferencesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Diagramme
          </Button>
          <Button
            onClick={() => handleTabChange('leistungen')}
            variant={tab === 'leistungen' ? 'default' : 'ghost'}
            disabled={preferencesLoading}  // Fix: Deaktiviere während Loading
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
            disabled={preferencesLoading}  // Fix: Deaktiviere während Loading
            className={`${
              tab === 'ueberfachlich'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
            } transition-all duration-200 ${preferencesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
      {!activeClassId ? (
        <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-400">
          Bitte wählen Sie eine Klasse aus
        </div>
      ) : isLoading ? (
        <CalendarLoader />
      ) : tab === 'diagramme' ? (
        <div className="space-y-6">
          <div className="flex justify-start gap-3 p-2 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 max-w-sm">
            <Button
              variant={diagramView === 'leistung' ? 'default' : 'ghost'}
              className={`w-full ${diagramView === 'leistung' ? 'bg-blue-600' : 'text-slate-300 hover:bg-slate-700'}`}
              onClick={() => setDiagramView('leistung')}
            >
              <Activity className="w-4 h-4 mr-2" />
              Leistung
            </Button>
            <Button
              variant={diagramView === 'kompetenzen' ? 'default' : 'ghost'}
              className={`w-full ${diagramView === 'kompetenzen' ? 'bg-blue-600' : 'text-slate-300 hover:bg-slate-700'}`}
              onClick={() => setDiagramView('kompetenzen')}
            >
              <Star className="w-4 h-4 mr-2" />
              Kompetenzen
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="space-y-2 min-h-[100px] flex flex-col justify-start">
              <Label className="text-slate-300 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                {diagramView === 'leistung' ? 'Fach auswählen' : 'Kompetenz auswählen'}
              </Label>
              {diagramView === 'leistung' ? (
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Fach auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={selectedCompetencyForProgression || 'none'}
                  onValueChange={(value) => setSelectedCompetencyForProgression(value === 'none' ? null : value)}
                  disabled={competencyOptions.length === 0}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Kompetenz auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {competencyOptions.length > 0 ? (
                      competencyOptions.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))
                    ) : (
                      <SelectItem disabled value="none">Keine Kompetenzen gefunden</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2 min-h-[100px] flex flex-col justify-start">
              <Label className="text-slate-300">Schüler und Optionen</Label>
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setStudentDropdownOpen(!studentDropdownOpen)}
                  className="w-full justify-between bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-black dark:text-white"
                >
                  {selectedStudents.length > 0
                    ? `${selectedStudents.length} Schüler ausgewählt`
                    : "Schüler auswählen"
                  }
                  {studentDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                {studentDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    <div className="p-3 space-y-2">
                      <div className="flex items-center space-x-2 p-2 bg-slate-100 dark:bg-slate-600 rounded">
                        <Checkbox
                          id="showAverage"
                          checked={showClassAverage}
                          onCheckedChange={setShowClassAverage}
                        />
                        <Label
                          htmlFor="showAverage"
                          className="text-sm text-slate-200 cursor-pointer font-medium"
                        >
                          Klassenschnitt anzeigen
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-2 bg-slate-100 dark:bg-slate-600 rounded">
                        <Checkbox
                          id="selectAll"
                          checked={selectedStudents.length === studentOptions.length && studentOptions.length > 0}
                          onCheckedChange={handleSelectAllStudents}
                        />
                        <Label
                          htmlFor="selectAll"
                          className="text-sm text-slate-200 cursor-pointer font-medium"
                        >
                          Alle auswählen
                        </Label>
                      </div>
                      <div className="h-px bg-slate-600 my-2"></div>
                      {studentOptions.map(student => (
                        <div key={student.value} className="flex items-center space-x-2 p-1 bg-white dark:bg-slate-700">
                          <Checkbox
                            id={student.value}
                            checked={selectedStudents.includes(student.value)}
                            onCheckedChange={(checked) => handleStudentSelection(student.value, checked)}
                          />
                          <Label
                            htmlFor={student.value}
                            className="text-sm text-slate-300 cursor-pointer"
                          >
                            {student.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {diagramView === 'leistung' ? (
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-slate-800 text-black dark:text-white border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Leistungsverlauf
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEnlargedChart('verlauf')}
                      className="text-slate-400 hover:text-white"
                    >
                      Vergrößern
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ width: '100%', height: 300 }}>
                    {renderChartContent('line', lineData, [1, 6], true)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-slate-800 text-black dark:text-white border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Fachbereiche
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEnlargedChart('fachbereich')}
                      className="text-slate-400 hover:text-white"
                    >
                      Vergrößern
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ width: '100%', height: 300 }}>
                    {renderChartContent(shouldUseBarChart ? 'bar' : 'radar', fachbereichData, [1, 6], true)}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-slate-800 text-black dark:text-white border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Kompetenzverlauf
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEnlargedChart('kompetenzverlauf')}
                      className="text-slate-400 hover:text-white"
                    >
                      Vergrößern
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ width: '100%', height: 300 }}>
                    {renderChartContent('line', ueberfachlichProgressionData, [1, 5], false)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-slate-800 text-black dark:text-white border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Kompetenzübersicht
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEnlargedChart('ueberfachlich')}
                      className="text-slate-400 hover:text-white"
                    >
                      Vergrößern
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ width: '100%', height: 300 }}>
                    {renderChartContent(shouldUseUeberfachlichBarChart ? 'bar' : 'radar', ueberfachlichData, [1, 5], false)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {renderStudentNotes()}
        </div>
      ) : tab === 'leistungen' ? (
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
      ) : tab === 'ueberfachlich' ? (  // Fix: Expliziter Check für 'ueberfachlich'
        <UeberfachlichTable
          students={Array.isArray(students) ? students.filter(s => s && s.id && s.name) : []}
          ueberfachlich={Array.isArray(ueberfachlich) ? ueberfachlich.filter(u => u && u.competency_id && u.student_id) : []}
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
      ) : (
        <CalendarLoader />  // Fallback für invalid tabs
      )}
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
      {enlargedChart && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-white">
                {enlargedChart === 'verlauf' && 'Leistungsverlauf'}
                {enlargedChart === 'fachbereich' && 'Fachbereiche'}
                {enlargedChart === 'ueberfachlich' && 'Kompetenzübersicht'}
                {enlargedChart === 'kompetenzverlauf' && 'Kompetenzverlauf'}
              </h3>
              <Button
                variant="ghost"
                onClick={() => setEnlargedChart(null)}
                className="text-white hover:bg-slate-700 text-xl px-4 py-2"
              >
                ✕
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              {enlargedChart === 'verlauf' && renderChartContent('line', lineData, [1, 6], true)}
              {enlargedChart === 'fachbereich' && renderChartContent(shouldUseBarChart ? 'bar' : 'radar', fachbereichData, [1, 6], true)}
              {enlargedChart === 'ueberfachlich' && renderChartContent(shouldUseUeberfachlichBarChart ? 'bar' : 'radar', ueberfachlichData, [1, 5], false)}
              {enlargedChart === 'kompetenzverlauf' && renderChartContent('line', ueberfachlichProgressionData, [1, 5], false)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceView;