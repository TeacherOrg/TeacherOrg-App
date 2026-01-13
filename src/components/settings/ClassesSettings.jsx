import React, { useState } from 'react';
import { Class, Student, Subject, Lesson, YearlyLesson, Performance, UeberfachlichKompetenz, Topic, Fachbereich, AllerleiLesson, Competency, Chore, ChoreAssignment, Group, UserPreferences, LehrplanKompetenz } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Users } from 'lucide-react';
import pb from '@/api/pb';
import { useStudentSortPreference } from '@/hooks/useStudentSortPreference';
import StudentManagementModal from './StudentManagementModal';

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
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [sortPreference, setStudentSortPreference] = useStudentSortPreference();

  // Student Management Modal State
  const [selectedClassForModal, setSelectedClassForModal] = useState(null);

  // Student counts per class (for display)
  const [studentCounts, setStudentCounts] = useState({});

  // Load student counts for all classes
  React.useEffect(() => {
    const loadCounts = async () => {
      const counts = {};
      for (const cls of classes) {
        try {
          const students = await Student.filter({ class_id: cls.id });
          counts[cls.id] = students.length;
        } catch {
          counts[cls.id] = 0;
        }
      }
      setStudentCounts(counts);
    };
    if (classes.length > 0) {
      loadCounts();
    }
  }, [classes]);

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
    const currentUserId = pb.authStore.model.id;
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
        AllerleiLesson.list({ user_id: currentUserId }).catch(() => []),
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

      if (classes.length > 1) {
        const nextClass = classes.find(c => c.id !== classId);
        if (nextClass) {
          setActiveClassId(nextClass.id);
        }
      }
      await refreshData();
    } catch (error) {
      console.error("Error deleting class:", error);
      alert(`Fehler beim Löschen der Klasse: ${error.message}`);
    } finally {
      setIsDeletingClass(false);
    }
  };

  // Refresh student counts when modal closes
  const handleStudentsChange = async () => {
    const counts = {};
    for (const cls of classes) {
      try {
        const students = await Student.filter({ class_id: cls.id });
        counts[cls.id] = students.length;
      } catch {
        counts[cls.id] = 0;
      }
    }
    setStudentCounts(counts);
  };

  return (
    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
      <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Klassenverwaltung</h3>

      {/* Global Student Sort Control */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <Label className="text-base font-semibold text-slate-900 dark:text-white">
              Schülersortierung (Global)
            </Label>
          </div>
          <Select value={sortPreference} onValueChange={setStudentSortPreference}>
            <SelectTrigger className="w-48 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="firstName">Vorname (A-Z)</SelectItem>
              <SelectItem value="lastName">Nachname (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
          Diese Einstellung gilt für alle Schülerlisten in der gesamten App
        </p>
      </div>

      {/* Classes List */}
      <div className="space-y-3">
        {classes.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">
            Keine Klassen verfügbar. Bitte fügen Sie eine neue Klasse hinzu.
          </p>
        ) : (
          classes.map(cls => (
            <div
              key={cls.id}
              className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="font-semibold text-lg truncate">
                  {cls.name || 'Unbekannte Klasse'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedClassForModal(cls)}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/30"
                >
                  <Users className="w-4 h-4 mr-1" />
                  {studentCounts[cls.id] ?? '...'} Schüler verwalten
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 flex-shrink-0"
                onClick={() => handleDeleteClass(cls.id)}
                disabled={isDeletingClass}
                title="Klasse löschen"
              >
                {isDeletingClass ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
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
          onKeyDown={e => e.key === 'Enter' && handleAddClass()}
        />
        <Button onClick={handleAddClass} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Klasse hinzufügen
        </Button>
      </div>

      {/* Student Management Modal */}
      <StudentManagementModal
        isOpen={!!selectedClassForModal}
        onClose={() => setSelectedClassForModal(null)}
        classData={selectedClassForModal}
        onStudentsChange={handleStudentsChange}
      />
    </div>
  );
}