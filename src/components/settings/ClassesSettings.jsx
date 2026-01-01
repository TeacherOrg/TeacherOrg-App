import React, { useState, useRef } from 'react';
import { Class, Student, Subject, Lesson, YearlyLesson, Performance, UeberfachlichKompetenz, Topic, Fachbereich, AllerleiLesson, Competency, Chore, ChoreAssignment, Group, UserPreferences, LehrplanKompetenz } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ChevronDown, ChevronUp, FileText, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import pb from '@/api/pb';

// Utility functions for cascading deletes with rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const deleteWithRetry = async (deleteFunction, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await deleteFunction();
      return;
    } catch (error) {
      if (error.message?.includes('429') && attempt < maxRetries - 1) {
        await delay(2000 * (attempt + 1)); // Exponential backoff
        continue;
      }
      if (error.message?.includes('404')) {
        // Item already deleted, ignore
        return;
      }
      throw error;
    }
  }
};

export default function ClassesSettings({ classes, refreshData, setActiveClassId }) {
  const [newClassName, setNewClassName] = useState('');
  const [activeClassId, setLocalActiveClassId] = useState(classes.length > 0 ? classes[0].id : null);
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({ first_name: '', last_name: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [studentList, setStudentList] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState(new Set());
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  React.useEffect(() => {
    if (activeClassId) {
      loadStudents();
    } else {
      setStudents([]);
    }
  }, [activeClassId]);

  const loadStudents = async () => {
    if (!activeClassId) return;
    try {
      const studentsData = await Student.filter({ class_id: activeClassId });
      setStudents(studentsData);
    } catch (error) {
      console.error("Error loading students:", error);
      if (error.data) console.error("Error Data:", error.data);
      setStudents([]);
    }
  };

  const handleAddClass = async () => {
    if (!newClassName.trim()) return;
    try {
      const currentUserId = pb.authStore.model.id;
      const currentYear = new Date().getFullYear();
      const payload = { 
        name: newClassName.trim(),
        user_id: currentUserId,
        teacher_id: currentUserId,
        school_year: currentYear
      };
      console.log("Sending Payload to PB:", payload);
      console.log("Auth valid?", pb.authStore.isValid, "User ID:", currentUserId);

      const newClass = await Class.create(payload);
      setNewClassName('');
      await refreshData();
      setActiveClassId(newClass.id);
      setLocalActiveClassId(newClass.id);
    } catch (error) {
      console.error("Full Error Object:", error);
      if (error.name) console.error("Error Type:", error.name);
      if (error.message) console.error("Error Message:", error.message);
      if (error.stack) console.error("Stack Trace:", error.stack);
      if (error.data) console.error("PB Data:", error.data);
      if (error.status) console.error("Status:", error.status);
      alert(`Fehler beim Erstellen: ${error.message || 'Unbekannt'}`);
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm("Sind Sie sicher? Dies löscht die Klasse und alle zugehörigen Schüler, Fächer, Lektionen und Leistungsdaten. Themen werden archiviert und können später wiederverwendet werden.")) return;

    setIsDeletingClass(true);
    try {
      // Alle abhängigen Daten laden
      const [
        studentsInClass,
        subjectsInClass,
        lessonsInClass,
        yearlyLessonsByClass,
        performancesInClass,
        ueberfachlichInClass,
        topicsInClass,
        allerleiInClass,
        competenciesInClass,
        choresInClass,
        choreAssignmentsInClass,
        groupsInClass,
        userPrefsInClass,
        groupSetsInClass
      ] = await Promise.all([
        Student.filter({ class_id: classId }),
        Subject.filter({ class_id: classId }),
        Lesson.list(),
        YearlyLesson.filter({ class_id: classId }).catch(() => []), // Direkt nach class_id filtern!
        Performance.filter({ class_id: classId }),
        UeberfachlichKompetenz.filter({ class_id: classId }),
        Topic.filter({ class_id: classId }),
        // AllerleiLesson hat kein class_id - lade alle für user_id und filtere client-seitig
        AllerleiLesson.list({ user_id: userId }).catch(() => []),
        Competency.filter({ class_id: classId }).catch(() => []),
        Chore.filter({ class_id: classId }).catch(() => []),
        ChoreAssignment.filter({ class_id: classId }).catch(() => []),
        Group.filter({ class_id: classId }).catch(() => []),
        UserPreferences.filter({ class_id: classId }).catch(() => []),
        // group_sets ist nicht in entities.js, daher raw PB call
        pb.collection('group_sets').getFullList({ filter: `class_id = "${classId}"` }).catch(() => [])
      ]);

      // AllerleiLessons client-seitig filtern (haben kein class_id direkt)
      // Filtere basierend auf YearlyLessons der Klasse
      const yearlyLessonIds = new Set(yearlyLessonsByClass.map(yl => yl.id));
      const filteredAllerleiInClass = allerleiInClass.filter(allerlei => {
        // Prüfe ob primary_yearly_lesson_id oder einer der added_yearly_lesson_ids zur Klasse gehört
        if (yearlyLessonIds.has(allerlei.primary_yearly_lesson_id)) return true;
        if (Array.isArray(allerlei.added_yearly_lesson_ids)) {
          return allerlei.added_yearly_lesson_ids.some(id => yearlyLessonIds.has(id));
        }
        return false;
      });

      console.log('Found records to delete:', {
        students: studentsInClass.length,
        subjects: subjectsInClass.length,
        yearlyLessons: yearlyLessonsByClass.length,
        performances: performancesInClass.length,
        topics: topicsInClass.length,
        allerlei: filteredAllerleiInClass.length,
        competencies: competenciesInClass.length,
        chores: choresInClass.length,
        choreAssignments: choreAssignmentsInClass.length,
        groups: groupsInClass.length,
        userPrefs: userPrefsInClass.length,
        groupSets: groupSetsInClass.length
      });

      // 1. Topics ZUERST archivieren MIT Snapshot (BEVOR YearlyLessons gelöscht werden!)
      // Das ermöglicht spätere Wiederverwendung der Lektionen bei Neuzuweisung
      console.log('Archiving topics with snapshots:', topicsInClass.length);
      for (const topic of topicsInClass) {
        try {
          // Finde alle YearlyLessons für dieses Topic
          const topicYearlyLessons = yearlyLessonsByClass.filter(yl => yl.topic_id === topic.id);

          // Erstelle Snapshot der Lektionen (wie beim Sharing)
          const lessonsSnapshot = topicYearlyLessons
            .sort((a, b) => (a.week_number - b.week_number) || (a.lesson_number - b.lesson_number))
            .map(lesson => ({
              name: lesson.name || '',
              notes: lesson.notes || '',
              steps: lesson.steps || [],
              is_exam: lesson.is_exam || false,
              is_double_lesson: lesson.is_double_lesson || false,
              original_week: lesson.week_number,
              original_lesson_number: lesson.lesson_number
            }));

          // Erstelle Topic-Snapshot (wie bei shared_topics)
          const topicSnapshot = {
            name: topic.name || topic.title || 'Unbenanntes Thema',
            description: topic.description || '',
            color: topic.color || '#3b82f6',
            goals: topic.goals || '',
            materials: topic.materials || [],
            lehrplan_kompetenz_ids: topic.lehrplan_kompetenz_ids || []
          };

          // Topic archivieren mit Snapshot (subject UND class_id leeren)
          // competency_status_overrides wird gelöscht da die manuellen Status nicht mehr relevant sind
          await Topic.update(topic.id, {
            subject: null,
            class_id: null,
            lessons_snapshot: lessonsSnapshot.length > 0 ? lessonsSnapshot : null,
            topic_snapshot: topicSnapshot,
            competency_status_overrides: null  // Bereinige manuelle Kompetenz-Status
          });
          console.log(`Topic "${topic.name}" archiviert mit ${lessonsSnapshot.length} Lektionen und Topic-Snapshot`);
          await delay(50);
        } catch (archiveError) {
          console.warn('Topic archiving failed:', topic.id, archiveError);
          // Fallback: Topic löschen wenn Archivieren nicht möglich
          try {
            await deleteWithRetry(() => Topic.delete(topic.id));
            await delay(50);
          } catch (deleteError) {
            console.error('Error deleting topic:', deleteError);
          }
        }
      }

      const allDeletions = [];

      // 2. Performance löschen
      for (const performance of performancesInClass) {
        allDeletions.push(() => deleteWithRetry(() => Performance.delete(performance.id)));
      }

      // 3. UeberfachlichKompetenz löschen
      for (const ueberfachlich of ueberfachlichInClass) {
        allDeletions.push(() => deleteWithRetry(() => UeberfachlichKompetenz.delete(ueberfachlich.id)));
      }

      // 4. Lessons löschen (nach Fächernamen)
      const subjectNames = subjectsInClass.map(s => s.name);
      const subjectIds = subjectsInClass.map(s => s.id);
      const relatedLessons = lessonsInClass.filter(l => subjectNames.includes(l.subject) || subjectIds.includes(l.subject));
      for (const lesson of relatedLessons) {
        allDeletions.push(() => deleteWithRetry(() => Lesson.delete(lesson.id)));
      }

      // 5. YearlyLessons LÖSCHEN (Snapshots wurden bereits in Topics gespeichert)
      console.log('Deleting yearly lessons:', yearlyLessonsByClass.length);
      for (const yearlyLesson of yearlyLessonsByClass) {
        allDeletions.push(() => deleteWithRetry(() => YearlyLesson.delete(yearlyLesson.id)));
      }

      // Alle Löschungen ausführen
      for (const deletion of allDeletions) {
        await deletion();
        await delay(100);
      }

      // 5. Zusätzliche Entities löschen (AllerleiLesson, Competencies, Chores, Groups, UserPrefs)
      console.log('Deleting additional entities...');

      // AllerleiLessons löschen (gefilterte Liste verwenden)
      for (const allerlei of filteredAllerleiInClass) {
        try {
          await deleteWithRetry(() => AllerleiLesson.delete(allerlei.id));
          await delay(50);
        } catch (error) {
          console.warn('Error deleting AllerleiLesson:', allerlei.id, error);
        }
      }

      // ChoreAssignments zuerst (referenzieren Chores)
      for (const assignment of choreAssignmentsInClass) {
        try {
          await deleteWithRetry(() => ChoreAssignment.delete(assignment.id));
          await delay(50);
        } catch (error) {
          console.warn('Error deleting ChoreAssignment:', assignment.id, error);
        }
      }

      // Chores löschen
      for (const chore of choresInClass) {
        try {
          await deleteWithRetry(() => Chore.delete(chore.id));
          await delay(50);
        } catch (error) {
          console.warn('Error deleting Chore:', chore.id, error);
        }
      }

      // Competencies löschen
      for (const competency of competenciesInClass) {
        try {
          await deleteWithRetry(() => Competency.delete(competency.id));
          await delay(50);
        } catch (error) {
          console.warn('Error deleting Competency:', competency.id, error);
        }
      }

      // GroupSets löschen (vor Groups, da group_sets auf groups referenzieren könnte)
      for (const groupSet of groupSetsInClass) {
        try {
          await pb.collection('group_sets').delete(groupSet.id);
          await delay(50);
        } catch (error) {
          console.warn('Error deleting GroupSet:', groupSet.id, error);
        }
      }

      // Groups löschen
      for (const group of groupsInClass) {
        try {
          await deleteWithRetry(() => Group.delete(group.id));
          await delay(50);
        } catch (error) {
          console.warn('Error deleting Group:', group.id, error);
        }
      }

      // UserPreferences löschen
      for (const pref of userPrefsInClass) {
        try {
          await deleteWithRetry(() => UserPreferences.delete(pref.id));
          await delay(50);
        } catch (error) {
          console.warn('Error deleting UserPreference:', pref.id, error);
        }
      }

      // Topics wurden bereits am Anfang mit Snapshots archiviert (Schritt 1)

      // 6. Fachbereiche löschen (referenzieren Subjects)
      for (const subject of subjectsInClass) {
        try {
          const fachbereiche = await Fachbereich.list({ subject_id: subject.id });
          for (const fb of fachbereiche) {
            await deleteWithRetry(() => Fachbereich.delete(fb.id));
            await delay(50);
          }
        } catch (error) {
          console.warn('Error deleting Fachbereiche for subject:', subject.id, error);
        }
      }

      // 8. Subjects löschen
      console.log('Deleting subjects:', subjectsInClass.length);
      for (const subject of subjectsInClass) {
        try {
          await deleteWithRetry(() => Subject.delete(subject.id));
          await delay(100);
        } catch (error) {
          console.error('Failed to delete subject:', subject.id, error);
        }
      }

      // 9. Students löschen
      console.log('Deleting students:', studentsInClass.length);
      for (const student of studentsInClass) {
        try {
          await deleteWithRetry(() => Student.delete(student.id));
          await delay(100);
        } catch (error) {
          console.error('Failed to delete student:', student.id, error);
        }
      }

      // 10. Verifizieren dass keine Referenzen mehr existieren
      // Note: AllerleiLesson hat kein class_id - wird nicht verifiziert (wurde bereits client-seitig gefiltert und gelöscht)
      const [
        remainingSubjects,
        remainingStudents,
        remainingTopics,
        remainingYearlyLessons,
        remainingGroups,
        remainingChores,
        remainingGroupSets
      ] = await Promise.all([
        Subject.filter({ class_id: classId }).catch(() => []),
        Student.filter({ class_id: classId }).catch(() => []),
        Topic.filter({ class_id: classId }).catch(() => []),
        YearlyLesson.filter({ class_id: classId }).catch(() => []),
        Group.filter({ class_id: classId }).catch(() => []),
        Chore.filter({ class_id: classId }).catch(() => []),
        pb.collection('group_sets').getFullList({ filter: `class_id = "${classId}"` }).catch(() => [])
      ]);

      const totalRemaining = remainingSubjects.length + remainingStudents.length + remainingTopics.length +
                             remainingYearlyLessons.length + remainingGroups.length +
                             remainingChores.length + remainingGroupSets.length;

      if (totalRemaining > 0) {
        console.error('Still have references to class:', {
          subjects: remainingSubjects.length,
          students: remainingStudents.length,
          topics: remainingTopics.length,
          yearlyLessons: remainingYearlyLessons.length,
          groups: remainingGroups.length,
          chores: remainingChores.length,
          groupSets: remainingGroupSets.length
        });
        throw new Error(`Kann Klasse nicht löschen: Es existieren noch Referenzen (${totalRemaining} Datensätze). Siehe Console für Details.`);
      }

      // 11. Bereinige class_status_overrides in Lehrplan-Kompetenzen
      console.log('Cleaning up class_status_overrides in LehrplanKompetenz...');
      try {
        const allLehrplanKompetenzen = await LehrplanKompetenz.list();
        for (const kompetenz of allLehrplanKompetenzen) {
          if (kompetenz.class_status_overrides?.[classId]) {
            const updatedOverrides = { ...kompetenz.class_status_overrides };
            delete updatedOverrides[classId];
            await LehrplanKompetenz.update(kompetenz.id, {
              class_status_overrides: Object.keys(updatedOverrides).length > 0 ? updatedOverrides : null
            });
            await delay(30);
          }
        }
        console.log('class_status_overrides cleanup complete');
      } catch (cleanupError) {
        console.warn('Error cleaning up class_status_overrides:', cleanupError);
      }

      // 12. Class löschen
      console.log('Deleting class:', classId);
      await deleteWithRetry(() => Class.delete(classId));

      if (activeClassId === classId) {
        const nextClass = classes.length > 1 ? classes.find(c => c.id !== classId)?.id : null;
        setActiveClassId(nextClass);
        setLocalActiveClassId(nextClass);
      }
      await refreshData();
    } catch (error) {
      console.error("Error deleting class:", error);
      alert(`Fehler beim Löschen der Klasse: ${error.message}`);
    } finally {
      setIsDeletingClass(false);
    }
  };

  const handleAddStudent = async () => {
    if (!activeClassId || !newStudent.first_name.trim() || !newStudent.last_name.trim()) return;
    try {
      const fullName = `${newStudent.first_name.trim()} ${newStudent.last_name.trim()}`;
      const currentUserId = pb.authStore.model.id;
      const generatedEmail = `${fullName.replace(/\s+/g, '.').toLowerCase()}@school.example.com`;
      const payload = {
        name: fullName,
        class_id: activeClassId,
        user_id: currentUserId,
        email: generatedEmail
      };
      console.log("Student Payload:", payload);

      await Student.create(payload, { $cancelKey: `student-create-${Date.now()}` });
      setNewStudent({ first_name: '', last_name: '' });
      await loadStudents();
    } catch (error) {
      console.error("Full Error adding student:", error);
      if (error.data) console.error("Error Data:", error.data);
      alert(`Fehler beim Hinzufügen des Schülers: ${error.message || 'Unbekannt'}`);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    try {
      setStudents(prev => prev.filter(s => s.id !== studentId));
      
      (async () => {
        try {
          const [performances, ueberfachlich] = await Promise.all([
            Performance.filter({ student_id: studentId }),
            UeberfachlichKompetenz.filter({ student_id: studentId })
          ]);

          for (const performance of performances) {
            await deleteWithRetry(() => Performance.delete(performance.id));
            await delay(50);
          }

          for (const ueber of ueberfachlich) {
            await deleteWithRetry(() => UeberfachlichKompetenz.delete(ueber.id));
            await delay(50);
          }

          await deleteWithRetry(() => Student.delete(studentId));
        } catch (error) {
          console.error("Background deletion failed:", error);
          await loadStudents();
        }
      })();
    } catch (error) {
      console.error("Error deleting student:", error);
      await loadStudents();
    }
  };

  const handlePasteStudents = async () => {
    if (!activeClassId || !studentList.trim()) return;
    
    try {
      const lines = studentList.split('\n').filter(line => line.trim());
      const currentUserId = pb.authStore.model.id;
      const newStudents = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          const parts = trimmed.split(/[,\t\s]+/);
          let name = trimmed;
          
          if (parts.length === 2) {
            name = `${parts[0]} ${parts[1]}`;
          }
          
          const email = `${name.replace(/\s+/g, '.').toLowerCase()}@school.example.com`;
          newStudents.push({
            name: name,
            class_id: activeClassId,
            user_id: currentUserId,
            email
          });
        }
      }
      
      if (newStudents.length > 0) {
        for (const student of newStudents) {
          await Student.create(student, { $cancelKey: `student-import-${Date.now()}` });
          await delay(200);
        }
        await loadStudents();
        setStudentList('');
        setShowImportDialog(false);
        alert(`${newStudents.length} Schüler erfolgreich hinzugefügt!`);
      }
    } catch (error) {
      console.error("Full Error adding students from list:", error);
      if (error.data) console.error("Error Data:", error.data);
      alert(`Fehler beim Hinzufügen: ${error.message || 'Unbekannt'}`);
    }
  };

  const toggleClassExpansion = (classId) => {
    setExpandedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
      <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Klassenverwaltung</h3>
      
      {/* Classes arranged vertically */}
      <div className="space-y-4">
        {classes.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">Keine Klassen verfügbar. Bitte fügen Sie eine neue Klasse hinzu.</p>
        ) : (
            classes.map(cls => (
            <div key={cls.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg">{cls.name || 'Unbekannte Klasse'}</span>
                    <Collapsible>
                    <CollapsibleTrigger asChild>
                        <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                            setActiveClassId(cls.id);
                            setLocalActiveClassId(cls.id);
                            toggleClassExpansion(cls.id);
                        }}
                        className="text-slate-600 dark:text-slate-400"
                        >
                        {expandedClasses.has(cls.id) ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                        <span className="ml-1 text-sm">
                            {students.filter(s => s.class_id === cls.id).length} Schüler
                        </span>
                        </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-3">
                      {activeClassId === cls.id && (
                        <div className="space-y-3 pl-4 border-l-2 border-slate-300 dark:border-slate-600">
                          {/* Students list */}
                          <div className="max-h-32 overflow-y-auto">
                            {students.length > 0 ? (
                              <div className="grid grid-cols-2 gap-2">
                                {students.map(student => (
                                  <div key={student.id} className="flex justify-between items-center p-2 bg-white dark:bg-slate-700 rounded text-sm">
                                    <span>{student.name}</span>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30" 
                                      onClick={() => handleDeleteStudent(student.id)}
                                    >
                                      <Trash2 className="w-3 h-3"/>
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-500 dark:text-slate-400 text-sm">Keine Schüler in dieser Klasse</p>
                            )}
                          </div>
                          
                          {/* Add student form */}
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Input 
                                value={newStudent.first_name} 
                                onChange={e => setNewStudent({...newStudent, first_name: e.target.value})} 
                                placeholder="Vorname"
                                className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-sm"
                              />
                              <Input 
                                value={newStudent.last_name} 
                                onChange={e => setNewStudent({...newStudent, last_name: e.target.value})} 
                                placeholder="Nachname"
                                className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-sm"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                onClick={handleAddStudent} 
                                className="bg-green-600 hover:bg-green-700 text-sm"
                                size="sm"
                                disabled={!newStudent.first_name.trim() || !newStudent.last_name.trim()}
                              >
                                <Plus className="w-4 h-4 mr-1"/>
                                Hinzufügen
                              </Button>
                              <Button 
                                onClick={() => setShowImportDialog(true)}
                                variant="outline" 
                                className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                                size="sm"
                              >
                                <FileText className="w-4 h-4 mr-1"/>
                                Liste importieren
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30" 
                    onClick={() => handleDeleteClass(cls.id)}
                    disabled={isDeletingClass}
                >
                    {isDeletingClass ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                    <Trash2 className="w-4 h-4"/>
                    )}
                </Button>
                </div>
            </div>
            ))
        )}
        </div>
      
      {/* Add new class */}
      <div className="mt-6 flex gap-2">
        <Input 
          value={newClassName} 
          onChange={e => setNewClassName(e.target.value)} 
          placeholder="Neue Klasse..." 
          className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
        />
        <Button onClick={handleAddClass} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2"/>
          Klasse hinzufügen
        </Button>
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-96 max-w-[90vw]">
            <h4 className="text-lg font-semibold mb-4">Schülerliste importieren</h4>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Namen einfügen (einen pro Zeile):</Label>
                <Textarea 
                  value={studentList}
                  onChange={e => setStudentList(e.target.value)}
                  placeholder="Max Mustermann&#10;Anna Schmidt&#10;..."
                  className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 h-32 mt-2"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowImportDialog(false);
                    setStudentList('');
                  }}
                >
                  Abbrechen
                </Button>
                <Button 
                  onClick={handlePasteStudents}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!studentList.trim()}
                >
                  Importieren
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}