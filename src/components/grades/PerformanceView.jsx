import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, BarChart, Bar } from 'recharts';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Performance, UeberfachlichKompetenz, Subject, Competency, Fachbereich, UserPreferences, User } from '@/api/entities';
import { Plus, Filter, BarChart3, ChevronDown, ChevronUp, Star, Activity } from 'lucide-react';
import LeistungenTable from './LeistungenTable';
import UeberfachlichTable from './UeberfachlichTable';
import PerformanceModal from './PerformanceModal';
import UeberfachlichModal from './UeberfachlichModal';
import CalendarLoader from '../ui/CalendarLoader';
import pb from '@/api/pb'; // Import PocketBase für Realtime-Subscriptions
import { debounce } from '../../utils/utils';

// Enhanced color palette with more vibrant colors for students
const STUDENT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1998A', '#85CDFD',
  '#FFB84D', '#A8E6CF', '#FFD93D', '#6C5CE7', '#FD79A8', '#00B894',
  '#E17055', '#81ECEC', '#FDCB6E', '#6C5CE7', '#FF7675', '#74B9FF'
];

const getStudentColor = (index) => STUDENT_COLORS[index % STUDENT_COLORS.length];

const PerformanceView = ({ students = [], performances = [], activeClassId, classes = [], onDataChange }) => {
  const { toast } = useToast();
  const [tab, setTab] = useState('diagramme');
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
  const [expandedLeistungenRows, setExpandedLeistungenRows] = useState(new Set());
  const [expandedUeberfachlichHistories, setExpandedUeberfachlichHistories] = useState(new Set());
  const [expandedUeberfachlichCompetencies, setExpandedUeberfachlichCompetencies] = useState(new Set());
  const [ueberfachlich, setUeberfachlich] = useState([]);
  const prevClassIdRef = useRef(activeClassId);
  const prevTabRef = useRef(tab); // Add ref to track previous tab

  
  const handleDataChange = async (updatedUeberfachlich) => {
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
            expand: 'student_id,class_id,competency_id',
            $cancelKey: `list-ueberfachliche_kompetenz-data-change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }),
          Performance.list({
            filter: `class_id = '${activeClassId}'`,
            perPage: 500,
            expand: 'student_id,class_id,subject',
            $cancelKey: `list-performance-data-change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          })
        ]);
        setSubjects(subjectsData || []);
        setAllCompetencies(competenciesData || []);
        setUeberfachlich(ueberfachlichData || []);
        if (onDataChange) onDataChange(performancesData);
      }

      // Reload preferences to ensure expansion states are up-to-date
      const user = User.current();
      if (user && activeClassId) {
        const preference = await UserPreferences.findOne({
          user_id: user.id,
          class_id: activeClassId,
        });
        if (preference?.preferences) {
          setExpandedLeistungenRows(new Set(Array.isArray(preference.preferences.expandedLeistungenRows) ? preference.preferences.expandedLeistungenRows : []));
          setExpandedUeberfachlichHistories(new Set(Array.isArray(preference.preferences.expandedUeberfachlichHistories) ? preference.preferences.expandedUeberfachlichHistories : []));
          setExpandedUeberfachlichCompetencies(new Set(Array.isArray(preference.preferences.expandedUeberfachlichCompetencies) ? preference.preferences.expandedUeberfachlichCompetencies : []));
          // Only set tab if no save flag to prevent overriding recent save
          if (!localStorage.getItem('performanceSaveFlag') && preference.preferences.performanceTab) {
            setTab(preference.preferences.performanceTab);
          }
        }
      }
    } catch (error) {
      console.error('Error in handleDataChange:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Aktualisieren der Daten. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    }
  };

  // NEW: Add handleDeletePerformance function
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
        localStorage.setItem('performanceSaveFlag', 'true');
        if (onDataChange) onDataChange();
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

  // Debugging: Log activeClassId changes
  useEffect(() => {
    console.log('activeClassId changed:', activeClassId);
  }, [activeClassId]);

  // Load preferences from PocketBase
  useEffect(() => {
    const loadPreferences = async () => {
      if (!activeClassId) return;
      const saveFlag = localStorage.getItem('performanceSaveFlag');
      if (saveFlag) return; // Skip loading preferences if saveFlag is present to avoid overwriting local changes
      try {
        const user = User.current();
        if (!user) throw new Error('Kein Benutzer eingeloggt');

        const preference = await UserPreferences.findOne({
          user_id: user.id,
          class_id: activeClassId,
        });

        if (preference && preference.preferences) {
          setExpandedLeistungenRows(new Set(Array.isArray(preference.preferences.expandedLeistungenRows) ? preference.preferences.expandedLeistungenRows : []));
          setExpandedUeberfachlichHistories(new Set(Array.isArray(preference.preferences.expandedUeberfachlichHistories) ? preference.preferences.expandedUeberfachlichHistories : []));
          setExpandedUeberfachlichCompetencies(new Set(Array.isArray(preference.preferences.expandedUeberfachlichCompetencies) ? preference.preferences.expandedUeberfachlichCompetencies : []));
          if (!saveFlag && preference.preferences.performanceTab) {
            setTab(preference.preferences.performanceTab);
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
        // Kein Alert hier, um Loop zu vermeiden
      }
    };

    loadPreferences();
  }, [activeClassId]);

  // Save preferences to PocketBase with debounce
  const savePreferences = useCallback(
    debounce(async () => {
      if (!activeClassId) return;
      try {
        const user = User.current();
        if (!user) throw new Error('Kein Benutzer eingeloggt');

        const preferencesData = {
          expandedLeistungenRows: Array.from(expandedLeistungenRows),
          expandedUeberfachlichHistories: Array.from(expandedUeberfachlichHistories),
          expandedUeberfachlichCompetencies: Array.from(expandedUeberfachlichCompetencies),
          performanceTab: tab,
        };

        const preference = await UserPreferences.findOne({
          user_id: user.id,
          class_id: activeClassId,
        });

        if (preference) {
          await UserPreferences.update(preference.id, {
            preferences: preferencesData,
          });
        } else {
          await UserPreferences.create({
            user_id: user.id,
            class_id: activeClassId,
            preferences: preferencesData,
          });
        }
      } catch (error) {
        console.error('Error saving preferences:', error);
        // Kein Alert hier, um Loop zu vermeiden
      }
    }, 1000), // Debounce mit 1 Sekunde
    [expandedLeistungenRows, expandedUeberfachlichHistories, expandedUeberfachlichCompetencies, activeClassId, tab]
  );

  // Realtime-Sync mit Schutz vor Loops
  useEffect(() => {
    if (!activeClassId) return;
    const user = User.current();
    if (!user) return;

    let lastProcessedRecordId = null;

    const subscription = pb.collection('user_preferences').subscribe('*', async (e) => {
      if (e.record.user_id === user.id && e.record.class_id === activeClassId && e.record.id !== lastProcessedRecordId) {
        try {
          lastProcessedRecordId = e.record.id; // Verhindert erneutes Verarbeiten desselben Records
          const updated = await UserPreferences.findOne({
            user_id: user.id,
            class_id: activeClassId,
          });
          if (updated?.preferences) {
            setExpandedLeistungenRows(new Set(Array.isArray(updated.preferences.expandedLeistungenRows) ? updated.preferences.expandedLeistungenRows : []));
            setExpandedUeberfachlichHistories(new Set(Array.isArray(updated.preferences.expandedUeberfachlichHistories) ? updated.preferences.expandedUeberfachlichHistories : []));
            setExpandedUeberfachlichCompetencies(new Set(Array.isArray(updated.preferences.expandedUeberfachlichCompetencies) ? updated.preferences.expandedUeberfachlichCompetencies : []));
            if (!localStorage.getItem('performanceSaveFlag') && updated.preferences.performanceTab) {
              setTab(updated.preferences.performanceTab);
            }
          }
        } catch (error) {
          console.error('Error in subscription update:', error);
        }
      }
    });

    return () => {
      pb.collection('user_preferences').unsubscribe('*');
    };
  }, [activeClassId]);

  const loadRef = useRef(false); // FIX: Flag gegen Loop

  useEffect(() => {
    const loadClassSpecificData = async () => {
      if (loadRef.current) return;
      loadRef.current = true;
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
        loadRef.current = false;
      }
    };
    loadClassSpecificData();

    const handleOpenUeberfachlichModal = () => {
      setIsUeberfachlichModalOpen(true);
    };

    const handleOpenPerformanceModalForEdit = (event) => {
      const performanceToEdit = (performances || []).find(p => p.id === event.detail.id);
      setEditingPerformance(performanceToEdit);
      setIsPerformanceModalOpen(true);
    };

    window.addEventListener('openUeberfachlichModal', handleOpenUeberfachlichModal);
    window.addEventListener('openPerformanceModalForEdit', handleOpenPerformanceModalForEdit);

    return () => {
      window.removeEventListener('openUeberfachlichModal', handleOpenUeberfachlichModal);
      window.removeEventListener('openPerformanceModalForEdit', handleOpenPerformanceModalForEdit);
    };
  }, [activeClassId, performances]);

  // Load tab state from PocketBase
  useEffect(() => {
    const loadTabState = async () => {
      const saveFlag = localStorage.getItem('performanceSaveFlag');
      if (!activeClassId) {
        setTab('diagramme');
        setExpandedLeistungenRows(new Set());
        setExpandedUeberfachlichHistories(new Set());
        setExpandedUeberfachlichCompetencies(new Set());
        return;
      }

      try {
        const user = User.current();
        if (!user) throw new Error('Kein Benutzer eingeloggt');
        const preference = await UserPreferences.findOne({
          user_id: user.id,
          class_id: activeClassId,
        });
        if (preference?.preferences?.performanceTab && !saveFlag) {
          setTab(preference.preferences.performanceTab);
        }
        localStorage.removeItem('performanceSaveFlag');
      } catch (error) {
        console.error('Error loading tab state:', error);
        if (!saveFlag) {
          setTab('diagramme');
        }
      }
    };

    loadTabState();
  }, [activeClassId]);

  // Collapse on tab change only if tab actually changes
  useEffect(() => {
    if (prevTabRef.current !== tab) {
      setExpandedLeistungenRows(new Set());
      setExpandedUeberfachlichHistories(new Set());
      setExpandedUeberfachlichCompetencies(new Set());
      prevTabRef.current = tab; // Update previous tab
    }
  }, [tab]);

  const studentOptions = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return students.map(s => ({
      value: s.id,
      label: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unnamed Student'
    }));
  }, [students]);

  const subjectOptions = useMemo(() => {
    const performanceSubjects = Array.isArray(performances)
      ? Array.from(new Set((performances || []).map(p => p.subject).filter(Boolean)))
      : [];
    const subjectNames = Array.isArray(subjects)
      ? (subjects || []).map(s => s.name).filter(Boolean)
      : [];
    const allSubjects = Array.from(new Set([...subjectNames, ...performanceSubjects]));
    return ['Alle', ...allSubjects];
  }, [performances, subjects]);

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
      // Do not set performanceSaveFlag here to prevent tab switching
      if (onDataChange) onDataChange();
      setIsPerformanceModalOpen(false);
      setEditingPerformance(null);

      // Persist tab and expanded states
      const preference = await UserPreferences.findOne({
        user_id: user.id,
        class_id: activeClassId,
      });
      const preferencesData = preference?.preferences || {};
      preferencesData.performanceTab = 'leistungen';
      preferencesData.expandedLeistungenRows = Array.from(expandedLeistungenRows);
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
      console.error("Error saving performance:", error);
      alert(`Fehler beim Speichern der Leistung: ${error.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleSaveUeberfachlichBatch = async (batchData) => {
    if (!batchData) return;
    const { competencyId, date, ratings } = batchData;

    setIsUeberfachlichModalOpen(false);

    try {
      const competencies = await Competency.filter({
        filter: `class_id = '${activeClassId}'`,
        perPage: 500,
        expand: 'user_id,class_id',
        $cancelKey: `list-competencie-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
      setAllCompetencies(competencies || []);
      console.log('Loaded competencies after save:', competencies);

      let existingEntries = [];
      try {
        const filterParams = {
          filter: `class_id = '${activeClassId}' && competency_id = '${competencyId}'`,
          perPage: 500,
          expand: 'student_id,class_id,competency_id',
          $cancelKey: `list-ueberfachliche_kompetenz-filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        existingEntries = await UeberfachlichKompetenz.list(filterParams);
        console.log('Existing ueberfachlich entries:', existingEntries);
      } catch (error) {
        console.error('Fehler beim Filtern von ueberfachliche_kompetenzen:', error);
        existingEntries = [];
      }

      const user = User.current();
      if (!user || !user.id) throw new Error('Kein Benutzer eingeloggt');

      const promises = Object.entries(ratings).map(async ([studentId, score], index) => {
        const studentExistingEntry = existingEntries.find(e =>
          e.student_id === studentId && e.competency_id === competencyId
        );

        const newAssessment = { date, score: Number(score) };

        if (studentExistingEntry) {
          const updatedAssessments = [...(studentExistingEntry.assessments || []), newAssessment];
          const updated = await UeberfachlichKompetenz.update(studentExistingEntry.id, { 
            assessments: updatedAssessments,
            user_id: user.id,
            $cancelKey: `update-ueberfachliche_kompetenz-${studentId}-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
          });
          console.log(`Updated ueberfachlich entry for student ${studentId}:`, updated);
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
          console.log(`Created ueberfachlich entry for student ${studentId}:`, created);
          return created;
        }
      });

      const results = await Promise.all(promises);
      console.log('Batch create/update results:', results);

      // FIX: Warte kurz, um sicherzustellen, dass die Datenbank-Transaktion abgeschlossen ist
      await new Promise(resolve => setTimeout(resolve, 500));

      // FIX: Lade ueberfachlich-Daten neu mit breiterem Filter
      const updatedUeberfachlich = await UeberfachlichKompetenz.list({
        filter: `class_id = '${activeClassId}'`,
        perPage: 500,
        expand: 'student_id,class_id,competency_id',
        $cancelKey: `list-ueberfachliche_kompetenz-postsave-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
      console.log('Updated ueberfachlich data:', updatedUeberfachlich);
      setUeberfachlich(updatedUeberfachlich || []);

      toast({
        title: "Erfolg",
        description: "Kompetenz und Bewertungen gespeichert",
        variant: "success",
      });

      localStorage.setItem('performanceSaveFlag', 'true');
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error("Fehler beim Speichern der überfachlichen Kompetenzen:", error);
      toast({
        title: "Fehler",
        description: `Fehler beim Speichern der Kompetenzen: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleStudentSelection = (studentId, checked) => {
    setSelectedStudents(prev =>
      checked
        ? [...prev, studentId]
        : prev.filter(id => id !== studentId)
    );
  };

  const handleSelectAllStudents = (checked) => {
    if (checked) {
      setSelectedStudents(studentOptions.map(s => s.value));
    } else {
      setSelectedStudents([]);
    }
  };

  // Fachbereich data for radar chart
  const fachbereichData = useMemo(() => {
    if (!Array.isArray(performances) || !Array.isArray(students)) return [];

    const fachbereichMap = {};
    const filteredPerfs = (performances || []).filter(p =>
      p && typeof p.subject === 'string' && (selectedSubject === 'Alle' || p.subject === selectedSubject)
    );

    if (filteredPerfs.length === 0) return [];

    filteredPerfs.forEach(perf => {
      if (Array.isArray(perf.fachbereiche)) {
        perf.fachbereiche.forEach(fachbereich => {
          if (!fachbereich || typeof fachbereich !== 'string') return;

          if (!fachbereichMap[fachbereich]) {
            fachbereichMap[fachbereich] = { name: fachbereich };
          }

          if (showClassAverage) {
            const allGrades = filteredPerfs
              .filter(p => Array.isArray(p.fachbereiche) && p.fachbereiche.includes(fachbereich))
              .map(p => p.grade)
              .filter(g => typeof g === 'number' && g > 0);

            if (allGrades.length > 0) {
              const avgGrade = allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length;
              fachbereichMap[fachbereich]['Klassenschnitt'] = parseFloat(avgGrade.toFixed(2));
            } else {
              fachbereichMap[fachbereich]['Klassenschnitt'] = null;
            }
          }

          selectedStudents.forEach((studentId) => {
            const student = students.find(s => s && s.id === studentId);
            if (student) {
              const studentPerfsForFachbereich = filteredPerfs.filter(p =>
                p.student_id === studentId && Array.isArray(p.fachbereiche) && p.fachbereiche.includes(fachbereich)
              );

              if (studentPerfsForFachbereich.length > 0) {
                const grades = studentPerfsForFachbereich
                  .map(p => p.grade)
                  .filter(g => typeof g === 'number' && g > 0);

                if (grades.length > 0) {
                  const avgGrade = grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
                  fachbereichMap[fachbereich][student.name || 'Unnamed'] = parseFloat(avgGrade.toFixed(2));
                } else {
                  fachbereichMap[fachbereich][student.name || 'Unnamed'] = null;
                }
              } else {
                fachbereichMap[fachbereich][student.name || 'Unnamed'] = null;
              }
            }
          });
        });
      }
    });

    return Object.values(fachbereichMap);
  }, [performances, selectedSubject, selectedStudents, students, showClassAverage]);

  // Überfachliche Kompetenzen data for RADAR/BAR Chart
  const ueberfachlichData = useMemo(() => {
    if (!Array.isArray(ueberfachlich) || !Array.isArray(students)) return [];

    const competencyMap = {};
    const validUeberfachlich = (ueberfachlich || []).filter(comp => comp && typeof comp.competency_id === 'string');

    if (validUeberfachlich.length === 0) return [];

    validUeberfachlich.forEach(comp => {
      const competencyName = comp.competency_name_display || comp.competency_id;
      if (!competencyMap[comp.competency_id]) {
        competencyMap[comp.competency_id] = { name: competencyName };
      }

      if (showClassAverage) {
        const allScores = validUeberfachlich
          .filter(u => u.competency_id === comp.competency_id)
          .flatMap(u => Array.isArray(u.assessments) ? u.assessments : [])
          .map(a => a && typeof a.score === 'number' ? a.score : null)
          .filter(s => typeof s === 'number' && s >= 1 && s <= 5);

        if (allScores.length > 0) {
          const avgScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
          competencyMap[comp.competency_id]['Klassenschnitt'] = parseFloat(avgScore.toFixed(2));
        } else {
          competencyMap[comp.competency_id]['Klassenschnitt'] = null;
        }
      }

      selectedStudents.forEach(studentId => {
        const student = students.find(s => s && s.id === studentId);
        if (student) {
          const studentComp = validUeberfachlich.find(u =>
            u.student_id === studentId && u.competency_id === comp.competency_id
          );

          if (studentComp && Array.isArray(studentComp.assessments) && studentComp.assessments.length > 0) {
            const validAssessments = studentComp.assessments.filter(a => a && typeof a.date === 'string' && typeof a.score === 'number');
            if (validAssessments.length > 0) {
              const latestAssessment = validAssessments.reduce((latest, assessment) => {
                return !latest || new Date(assessment.date) > new Date(latest.date) ? assessment : latest;
              }, null);
              competencyMap[comp.competency_id][student.name || 'Unnamed'] = latestAssessment?.score || null;
            } else {
              competencyMap[comp.competency_id][student.name || 'Unnamed'] = null;
            }
          } else {
            competencyMap[comp.competency_id][student.name || 'Unnamed'] = null;
          }
        }
      });
    });

    return Object.values(competencyMap);
  }, [ueberfachlich, selectedStudents, students, showClassAverage]);

  // Überfachliche Kompetenzen Progression data (Line Chart)
  const ueberfachlichProgressionData = useMemo(() => {
    if (!selectedCompetencyForProgression || !Array.isArray(ueberfachlich) || ueberfachlich.length === 0) {
      return [];
    }

    const selectedCompetency = allCompetencies.find(c => c.name === selectedCompetencyForProgression);
    if (!selectedCompetency) return [];

    const filteredUeberfachlich = (ueberfachlich || []).filter(u => u.competency_id === selectedCompetency.id);
    const allAssessments = filteredUeberfachlich.flatMap(u => u.assessments || []).filter(a => a && a.date);
    const uniqueDates = [...new Set(allAssessments.map(a => a.date))].sort((a, b) => new Date(a) - new Date(b));

    if (uniqueDates.length === 0) return [];

    return uniqueDates.map(date => {
      const point = {
        name: new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        date: date,
      };

      if (showClassAverage) {
        const scoresForDate = filteredUeberfachlich
          .flatMap(u => u.assessments || [])
          .filter(a => a.date === date && typeof a.score === 'number' && a.score >= 1 && a.score <= 5)
          .map(a => a.score);

        if (scoresForDate.length > 0) {
          const avgScore = scoresForDate.reduce((sum, score) => sum + score, 0) / scoresForDate.length;
          point['Klassenschnitt'] = parseFloat(avgScore.toFixed(2));
        } else {
          point['Klassenschnitt'] = null;
        }
      }

      selectedStudents.forEach(studentId => {
        const student = students.find(s => s && s.id === studentId);
        if (student) {
          const studentEntry = filteredUeberfachlich.find(u => u.student_id === studentId);
          const assessmentForDate = studentEntry?.assessments?.find(a => a.date === date);
          point[student.name || 'Unnamed'] = (assessmentForDate && typeof assessmentForDate.score === 'number') ? assessmentForDate.score : null;
        }
      });

      return point;
    });
  }, [ueberfachlich, selectedStudents, students, showClassAverage, selectedCompetencyForProgression, allCompetencies]);

  const lineData = useMemo(() => {
    if (!Array.isArray(performances) || !Array.isArray(students)) return [];

    const validPerformances = (performances || []).filter(p =>
      p && typeof p.date === 'string' && typeof p.assessment_name === 'string' && typeof p.grade === 'number'
    );

    const sortedPerformances = validPerformances
      .filter(p => selectedSubject === 'Alle' || p.subject === selectedSubject)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sortedPerformances.length === 0) return [];

    const uniqueAssessments = [...new Map(
      sortedPerformances.map(item => [
        `${item.assessment_name || 'Unknown'}-${item.date || ''}-${item.subject || ''}`,
        item
      ])
    ).values()];

    return uniqueAssessments.map((p, index) => {
      const point = {
        name: p.assessment_name || 'Unknown Assessment',
        date: p.date ? new Date(p.date).toLocaleDateString('de-DE') : '',
        key: `assessment-${index}`
      };

      if (showClassAverage) {
        const sameAssessments = sortedPerformances.filter(perf =>
          perf.assessment_name === p.assessment_name && perf.date === p.date && perf.subject === p.subject
        );
        const validGrades = sameAssessments
          .map(perf => perf.grade)
          .filter(g => typeof g === 'number' && g > 0);

        if (validGrades.length > 0) {
          const avgGrade = validGrades.reduce((sum, perf) => sum + perf, 0) / validGrades.length;
          point['Klassenschnitt'] = parseFloat(avgGrade.toFixed(2));
        } else {
          point['Klassenschnitt'] = null;
        }
      }

      selectedStudents.forEach(studentId => {
        const student = students.find(s => s && s.id === studentId);
        if (student) {
          const studentPerf = sortedPerformances.find(perf =>
            perf.student_id === studentId &&
            perf.assessment_name === p.assessment_name &&
            perf.date === p.date &&
            perf.subject === p.subject
          );
          point[student.name || 'Unnamed'] = studentPerf && typeof studentPerf.grade === 'number' ? studentPerf.grade : null;
        }
      });

      return point;
    });
  }, [performances, selectedSubject, selectedStudents, students, showClassAverage]);

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

  if (isLoading) {
    return <CalendarLoader />;
  }

  return (
    <div className="p-4 sm:p-6 bg-white/0 dark:bg-slate-900/0">
      {/* Tab Navigation */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-xl p-2 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
          <Button
            onClick={() => setTab('diagramme')}
            variant={tab === 'diagramme' ? 'default' : 'ghost'}
            className={tab === 'diagramme' ? 'bg-green-600 text-white' : 'text-slate-300'}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Diagramme
          </Button>
          <Button
            onClick={() => setTab('leistungen')}
            variant={tab === 'leistungen' ? 'default' : 'ghost'}
            className={tab === 'leistungen' ? 'bg-green-600 text-white' : 'text-slate-300'}
          >
            Leistungen
          </Button>
          <Button
            onClick={() => setTab('ueberfachlich')}
            variant={tab === 'ueberfachlich' ? 'default' : 'ghost'}
            className={tab === 'ueberfachlich' ? 'bg-green-600 text-white' : 'text-slate-300'}
          >
            Überfachlich
          </Button>
        </div>

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

      {/* Conditional Content */}
      {!activeClassId ? (
        <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-400">
          Bitte wählen Sie eine Klasse aus
        </div>
      ) : isLoading ? (
        <CalendarLoader />
      ) : tab === 'diagramme' ? (
        <div className="space-y-6">
          {/* Main Diagram View Toggle */}
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

          {/* Filters */}
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
                      <SelectItem key={s} value={s}>{s}</SelectItem>
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

          {/* Charts */}
          {diagramView === 'leistung' ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Leistungsverlauf Chart */}
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

              {/* Fachbereiche Chart */}
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
              {/* Kompetenzverlauf */}
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

              {/* Kompetenzübersicht Chart */}
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
      ) : (
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
      )}

      {/* Modals */}
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

      {/* Enlarged Chart Modal */}
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