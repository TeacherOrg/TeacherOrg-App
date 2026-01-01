import React, { useState, useEffect, useMemo } from 'react';
import { Subject, Topic, YearlyLesson, Lesson, LehrplanKompetenz as CurriculumCompetency, SharedTopic } from "@/api/entities";
import { deleteTopicWithLessons } from '@/api/topicService';
import { syncYearlyLessonToWeekly } from '@/hooks/useYearlyLessonSync';
import TopicCard from '../components/topics/TopicCard';
import AddTopicCard from '../components/topics/AddTopicCard';
import TopicModal from '../components/topics/TopicModal';
import ReceivedTopicModal from '../components/topics/ReceivedTopicModal';
import SubjectSelectDialog from '../components/topics/SubjectSelectDialog';
import SharedLessonAssignmentModal from '../components/topics/SharedLessonAssignmentModal';
import ArchivedTopicsNotification from '../components/topics/ArchivedTopicsNotification';
import ArchivedTopicReassignModal from '../components/topics/ArchivedTopicReassignModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import CurriculumImport from '../components/curriculum/CurriculumImport';
import CurriculumTree from '../components/curriculum/CurriculumTree';
import { motion } from 'framer-motion';
import { BookOpen, Loader2, GraduationCap, Archive, ChevronDown, ChevronUp, FolderInput, Copy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLehrplanData } from '../components/curriculum/lehrplanData';
import pb from '@/api/pb';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLessonStore } from '@/store';

const getCurrentWeek = () => {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const daysToMonday = (jan4.getDay() + 6) % 7;
  const mondayOfWeek1 = new Date(jan4.getTime() - daysToMonday * 86400000);
  const diffTime = now.getTime() - mondayOfWeek1.getTime();
  return Math.max(1, Math.min(52, Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1));
};

const getSubjectId = (topicOrSubject) => {
  if (typeof topicOrSubject === 'string') return topicOrSubject;
  if (topicOrSubject?.id) return topicOrSubject.id;
  if (typeof topicOrSubject?.subject === 'string') return topicOrSubject.subject;
  if (topicOrSubject?.subject?.id) return topicOrSubject.subject.id;
  return null;
};

// Liste aller unterstützten Fächer im Lehrplan 21
// WICHTIG: Namen müssen mit fach_name in lehrplanData.js übereinstimmen
const SUPPORTED_LEHRPLAN_SUBJECTS = [
  'Deutsch', 'Mathematik', 'NMG',
  'Bewegung und Sport', 'Musik', 'Bildnerisches Gestalten',
  'Textiles und Technisches Gestalten', 'Englisch', 'Französisch',
  'Medien und Informatik', 'Berufliche Orientierung', 'Politische Bildung'
];

const TopicsView = () => {
  const [subjects, setSubjects] = useState([]);
  const [allTopics, setAllTopics] = useState([]);
  const [curriculumCompetencies, setCurriculumCompetencies] = useState([]);
  const [addModalOpenBySubject, setAddModalOpenBySubject] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('topics');
  const [selectedTopic, setSelectedTopic] = useState(null);  // Neu: Für Bearbeiten eines Topics
  const [isModalOpen, setIsModalOpen] = useState(false);  // Neu: Für Modal-Öffnung
  const [showCompetencySelection, setShowCompetencySelection] = useState(false);  // Neu: Für konditionale Anzeige
  const [assignTopicId, setAssignTopicId] = useState(null);  // Für Kompetenz-Zuweisung
  const [selectedCompetencyIds, setSelectedCompetencyIds] = useState([]);  // Ausgewählte Kompetenzen

  // States für geteilte Themen
  const [pendingSharedTopics, setPendingSharedTopics] = useState([]);
  const [currentSharedTopic, setCurrentSharedTopic] = useState(null);
  const [isReceivedModalOpen, setIsReceivedModalOpen] = useState(false);
  const [isSubjectSelectOpen, setIsSubjectSelectOpen] = useState(false);

  // States für Lektions-Zuweisung Modal (geteilte Themen)
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentSubject, setAssignmentSubject] = useState(null);
  const [assignmentSharedTopic, setAssignmentSharedTopic] = useState(null);
  const [timetableSettings, setTimetableSettings] = useState(null);

  // States für archivierte Themen Assignment
  const [archivedAssignmentTopic, setArchivedAssignmentTopic] = useState(null);
  const [archivedAssignmentLessons, setArchivedAssignmentLessons] = useState([]);

  // States für archivierte Themen
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);
  const [showArchiveNotification, setShowArchiveNotification] = useState(false);
  const [selectedArchivedTopic, setSelectedArchivedTopic] = useState(null);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);

  // States für Duplizieren
  const [duplicateSourceTopic, setDuplicateSourceTopic] = useState(null);
  const [isDuplicateSelectOpen, setIsDuplicateSelectOpen] = useState(false);

  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  // Store-Synchronisation für useCompetencyStatus Hook
  const { setTopics, setAllYearlyLessons, setAllLessons, allYearlyLessons: storeYearlyLessons } = useLessonStore();

  useEffect(() => {
    loadData();
    checkPendingShares();
  }, []);

  // Aktualisiere Daten wenn ein Fach gelöscht wurde
  useEffect(() => {
    const handleSubjectDeleted = () => {
      loadData();
    };
    window.addEventListener('subject-deleted', handleSubjectDeleted);
    return () => window.removeEventListener('subject-deleted', handleSubjectDeleted);
  }, []);

  // Archivierte Topics berechnen (Topics ohne subject)
  const archivedTopics = useMemo(() => {
    return allTopics.filter(t => {
      const subjectId = typeof t.subject === 'object' ? t.subject?.id : t.subject;
      return !subjectId || subjectId.trim() === '';
    });
  }, [allTopics]);

  // Prüfe auf archivierte Topics und zeige Notification
  useEffect(() => {
    if (archivedTopics.length > 0 && !isLoading) {
      const dismissed = sessionStorage.getItem('archiveNotificationDismissed');
      if (!dismissed) {
        setShowArchiveNotification(true);
      }
    }
  }, [archivedTopics, isLoading]);

  // Prüfe auf ausstehende geteilte Themen
  const checkPendingShares = async () => {
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;

      const pending = await SharedTopic.list({
        filter: `recipient_id = '${userId}' && status = 'pending'`
      });

      if (pending && pending.length > 0) {
        setPendingSharedTopics(pending);
        setCurrentSharedTopic(pending[0]);
        setIsReceivedModalOpen(true);
      }
    } catch (error) {
      console.error('Error checking pending shares:', error);
    }
  };

  // Handler für Annahme eines geteilten Themas
  const handleAcceptShare = async (subjectId, sharedTopic) => {
    try {
      const topicData = sharedTopic.topic_snapshot;
      const subject = subjects.find(s => s.id === subjectId);

      if (!subject) {
        toast.error('Fach nicht gefunden');
        return;
      }

      // Neues Topic im Empfänger-Account erstellen
      const newTopic = await Topic.create({
        name: topicData.name,
        description: topicData.description || '',
        color: topicData.color || '#3b82f6',
        goals: topicData.goals || '',
        materials: topicData.materials || [],
        lehrplan_kompetenz_ids: topicData.lehrplan_kompetenz_ids || [], // 1:1 vom Sender übernehmen
        estimated_lessons: topicData.estimated_lessons || 0,
        department: null, // Empfaenger waehlt selbst
        subject: subjectId,
        class_id: subject.class_id,
        user_id: pb.authStore.model.id,
        school_year: new Date().getFullYear()
      });

      // Status des geteilten Themas aktualisieren
      await SharedTopic.update(sharedTopic.id, {
        status: 'accepted',
        responded_at: new Date().toISOString()
      });

      // Lektionen für spätere Platzierung im localStorage speichern
      const lessonsSnapshot = sharedTopic.lessons_snapshot || [];
      if (lessonsSnapshot.length > 0) {
        localStorage.setItem('pendingSharedLessons', JSON.stringify({
          topicId: newTopic.id,
          lessons: lessonsSnapshot
        }));
      }

      toast.success('Thema uebernommen! Platzieren Sie die Lektionen in der Jahresuebersicht.');

      // Topics-Liste aktualisieren
      setAllTopics(prev => [...prev, newTopic]);
      setTopics(prev => [...prev, newTopic]);

      // Zum nächsten pending share wechseln oder schließen
      const remaining = pendingSharedTopics.filter(s => s.id !== sharedTopic.id);
      setPendingSharedTopics(remaining);

      if (remaining.length > 0) {
        setCurrentSharedTopic(remaining[0]);
      } else {
        setIsReceivedModalOpen(false);
        setIsSubjectSelectOpen(false);
        setCurrentSharedTopic(null);
      }

      // Zur Jahresübersicht navigieren wenn Lektionen vorhanden
      if (lessonsSnapshot.length > 0) {
        navigate(`/YearlyOverview?subject=${encodeURIComponent(subject.name)}&mode=assign&topic=${newTopic.id}`);
      }
    } catch (error) {
      console.error('Error accepting share:', error);
      toast.error('Fehler beim Uebernehmen des Themas');
    }
  };

  // Handler für Ablehnung eines geteilten Themas
  const handleRejectShare = async (sharedTopic) => {
    try {
      await SharedTopic.update(sharedTopic.id, {
        status: 'rejected',
        responded_at: new Date().toISOString()
      });

      const remaining = pendingSharedTopics.filter(s => s.id !== sharedTopic.id);
      setPendingSharedTopics(remaining);

      if (remaining.length > 0) {
        setCurrentSharedTopic(remaining[0]);
      } else {
        setIsReceivedModalOpen(false);
        setCurrentSharedTopic(null);
      }

      toast.success('Thema abgelehnt');
    } catch (error) {
      console.error('Error rejecting share:', error);
      toast.error('Fehler beim Ablehnen');
    }
  };

  // Handler um Assignment Modal zu öffnen
  const handleOpenAssignment = async (selectedSubject, sharedTopic) => {
    try {
      // Lade Settings für den fixen Stundenplan
      const { Setting } = await import('@/api/entities');
      const settingsList = await Setting.list();
      const userSettings = settingsList.find(s => s.user_id === pb.authStore.model?.id);

      // Bei flexiblem Stundenplan: Original-Navigation verwenden
      if (!userSettings?.fixedScheduleTemplate || userSettings?.scheduleType !== 'fixed') {
        // Fallback: Zur YearlyOverview navigieren (alte Methode)
        const lessonsSnapshot = sharedTopic.lessons_snapshot || [];
        if (lessonsSnapshot.length > 0) {
          localStorage.setItem('pendingSharedLessons', JSON.stringify({
            topicId: 'pending',  // Wird beim Akzeptieren gesetzt
            lessons: lessonsSnapshot
          }));
        }
        // Übernehme Topic direkt (ohne Modal)
        handleAcceptShare(selectedSubject.id, sharedTopic);
        return;
      }

      setTimetableSettings(userSettings || null);
      setAssignmentSubject(selectedSubject);
      setAssignmentSharedTopic(sharedTopic);
      setIsAssignmentModalOpen(true);
    } catch (error) {
      console.error('Error loading settings:', error);
      // Fallback: Öffne Modal ohne Settings
      setTimetableSettings(null);
      setAssignmentSubject(selectedSubject);
      setAssignmentSharedTopic(sharedTopic);
      setIsAssignmentModalOpen(true);
    }
  };

  // Handler für abgeschlossene Lektions-Zuweisung
  const handleAssignmentComplete = async ({ sharedTopic, selectedSubject, assignments, unassignedLessons, warnings }) => {
    try {
      const topicData = sharedTopic.topic_snapshot;

      // 1. Neues Topic erstellen
      const newTopic = await Topic.create({
        name: topicData.name,
        description: topicData.description || '',
        color: topicData.color || '#3b82f6',
        goals: topicData.goals || '',
        materials: topicData.materials || [],
        lehrplan_kompetenz_ids: topicData.lehrplan_kompetenz_ids || [],
        estimated_lessons: topicData.estimated_lessons || 0,
        department: null, // Empfaenger waehlt selbst
        subject: selectedSubject.id,
        class_id: selectedSubject.class_id,
        user_id: pb.authStore.model.id,
        school_year: new Date().getFullYear()
      });

      // 2. YearlyLessons für zugewiesene Lektionen erstellen
      const createdLessons = [];
      for (const assignment of assignments) {
        const lesson = assignment.lesson;
        const yearlyLesson = await YearlyLesson.create({
          week_number: assignment.week,
          lesson_number: assignment.slot,
          subject: selectedSubject.id,
          class_id: selectedSubject.class_id,
          user_id: pb.authStore.model.id,
          school_year: new Date().getFullYear(),
          topic_id: newTopic.id,
          name: lesson.name || lesson.notes || `Lektion ${assignment.slot}`,
          notes: lesson.notes || '',
          steps: lesson.steps || [],
          is_exam: lesson.is_exam || false,
          is_double_lesson: assignment.isDouble
        });

        createdLessons.push(yearlyLesson);

        // Wenn Doppellektion, zweite YearlyLesson erstellen und verlinken
        if (assignment.isDouble) {
          const secondLesson = await YearlyLesson.create({
            week_number: assignment.week,
            lesson_number: assignment.slot + 1,
            subject: selectedSubject.id,
            class_id: selectedSubject.class_id,
            user_id: pb.authStore.model.id,
            school_year: new Date().getFullYear(),
            topic_id: newTopic.id,
            name: lesson.name || lesson.notes || `Lektion ${assignment.slot + 1}`,
            notes: lesson.notes || '',
            steps: lesson.steps || [],
            is_exam: lesson.is_exam || false,
            is_double_lesson: true
          });

          // Verlinke nur erste Lektion zur zweiten (unidirektional)
          await YearlyLesson.update(yearlyLesson.id, {
            second_yearly_lesson_id: secondLesson.id
          });

          createdLessons.push(secondLesson);
        }
      }

      // 2b. Sync YearlyLessons zu Wochenstunden (nur bei fixem Stundenplan)
      if (timetableSettings?.scheduleType === 'fixed') {
        for (const yearlyLesson of createdLessons) {
          try {
            await syncYearlyLessonToWeekly(yearlyLesson, timetableSettings, subjects, createdLessons);
          } catch (syncError) {
            console.warn('Sync to weekly failed for lesson:', yearlyLesson.id, syncError);
          }
        }
      }

      // 3. SharedTopic Status aktualisieren
      await SharedTopic.update(sharedTopic.id, {
        status: 'accepted',
        responded_at: new Date().toISOString()
      });

      // 4. UI aktualisieren
      setAllTopics(prev => [...prev, newTopic]);
      setTopics(prev => [...prev, newTopic]);

      // Nicht zugewiesene Lektionen im localStorage speichern falls vorhanden
      if (unassignedLessons.length > 0) {
        localStorage.setItem('pendingSharedLessons', JSON.stringify({
          topicId: newTopic.id,
          lessons: unassignedLessons.map(u => u.lesson)
        }));
        toast.info(`${unassignedLessons.length} Lektion(en) wurden nicht zugewiesen und koennen spaeter platziert werden.`);
      }

      toast.success(`Thema uebernommen! ${createdLessons.length} Lektion(en) erstellt.`);

      // Modal schließen und zum nächsten pending share wechseln
      setIsAssignmentModalOpen(false);
      setAssignmentSubject(null);
      setAssignmentSharedTopic(null);

      const remaining = pendingSharedTopics.filter(s => s.id !== sharedTopic.id);
      setPendingSharedTopics(remaining);

      if (remaining.length > 0) {
        setCurrentSharedTopic(remaining[0]);
        setIsReceivedModalOpen(true);
      } else {
        setCurrentSharedTopic(null);
      }

      // Queries invalidieren
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['yearlyLessons'] });
      queryClient.invalidateQueries({ queryKey: ['allYearlyLessons'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });

    } catch (error) {
      console.error('Error completing assignment:', error);
      toast.error('Fehler beim Erstellen der Lektionen');
    }
  };

  // Handler um Assignment Modal für archivierte Themen zu öffnen
  const handleOpenArchivedAssignment = async (selectedSubject, topic, lessonsSnapshot) => {
    try {
      // Lade Settings für den fixen Stundenplan
      const { Setting } = await import('@/api/entities');
      const settingsList = await Setting.list();
      const userSettings = settingsList.find(s => s.user_id === pb.authStore.model?.id);

      // Bei flexiblem Stundenplan: Original-Navigation zur YearlyOverview
      if (!userSettings?.fixedScheduleTemplate || userSettings?.scheduleType !== 'fixed') {
        localStorage.setItem('pendingArchivedLessons', JSON.stringify({
          topicId: topic.id,
          fromSnapshot: true,
          lessons: lessonsSnapshot.map(l => ({
            id: null,
            name: l.name || '',
            notes: l.notes || '',
            steps: l.steps || [],
            is_exam: l.is_exam || false,
            is_double_lesson: l.is_double_lesson || false
          }))
        }));
        toast.success('Thema zugewiesen. Platziere jetzt die Lektionen.');
        setIsReassignDialogOpen(false);
        navigate(`/YearlyOverview?subject=${encodeURIComponent(selectedSubject.name)}&mode=reassign&topic=${topic.id}`);
        return;
      }

      setTimetableSettings(userSettings || null);
      setAssignmentSubject(selectedSubject);
      setArchivedAssignmentTopic(topic);
      setArchivedAssignmentLessons(lessonsSnapshot);

      // Erstelle ein "Fake" sharedTopic Objekt für das Modal
      setAssignmentSharedTopic({
        topic_snapshot: {
          name: topic.name,
          description: topic.description,
          color: topic.color,
          goals: topic.goals,
          materials: topic.materials,
          lehrplan_kompetenz_ids: topic.lehrplan_kompetenz_ids
        },
        lessons_snapshot: lessonsSnapshot
      });

      setIsAssignmentModalOpen(true);
      setIsReassignDialogOpen(false);
    } catch (error) {
      console.error('Error loading settings for archived assignment:', error);
      setTimetableSettings(null);
      setAssignmentSubject(selectedSubject);
      setArchivedAssignmentTopic(topic);
      setArchivedAssignmentLessons(lessonsSnapshot);
      setAssignmentSharedTopic({
        topic_snapshot: { name: topic.name, color: topic.color },
        lessons_snapshot: lessonsSnapshot
      });
      setIsAssignmentModalOpen(true);
      setIsReassignDialogOpen(false);
    }
  };

  // Handler für abgeschlossene archivierte Themen Zuweisung
  const handleArchivedAssignmentComplete = async ({ sharedTopic, selectedSubject, assignments, unassignedLessons }) => {
    try {
      // Topic ist bereits aktualisiert (wurde in ArchivedTopicReassignModal gemacht)
      // Wir müssen nur die YearlyLessons erstellen

      const topicId = archivedAssignmentTopic?.id;
      if (!topicId) {
        toast.error('Topic ID nicht gefunden');
        return;
      }

      // YearlyLessons für zugewiesene Lektionen erstellen
      const createdLessons = [];
      for (const assignment of assignments) {
        const lesson = assignment.lesson;
        const yearlyLesson = await YearlyLesson.create({
          week_number: assignment.week,
          lesson_number: assignment.slot,
          subject: selectedSubject.id,
          class_id: selectedSubject.class_id,
          user_id: pb.authStore.model.id,
          school_year: new Date().getFullYear(),
          topic_id: topicId,
          name: lesson.name || lesson.notes || `Lektion ${assignment.slot}`,
          notes: lesson.notes || '',
          steps: lesson.steps || [],
          is_exam: lesson.is_exam || false,
          is_double_lesson: assignment.isDouble
        });

        createdLessons.push(yearlyLesson);

        // Wenn Doppellektion, zweite YearlyLesson erstellen und verlinken
        if (assignment.isDouble) {
          const secondLesson = await YearlyLesson.create({
            week_number: assignment.week,
            lesson_number: assignment.slot + 1,
            subject: selectedSubject.id,
            class_id: selectedSubject.class_id,
            user_id: pb.authStore.model.id,
            school_year: new Date().getFullYear(),
            topic_id: topicId,
            name: lesson.name || lesson.notes || `Lektion ${assignment.slot + 1}`,
            notes: lesson.notes || '',
            steps: lesson.steps || [],
            is_exam: lesson.is_exam || false,
            is_double_lesson: true
          });

          // Verlinke nur erste Lektion zur zweiten (unidirektional)
          await YearlyLesson.update(yearlyLesson.id, {
            second_yearly_lesson_id: secondLesson.id
          });

          createdLessons.push(secondLesson);
        }
      }

      // Sync YearlyLessons zu Wochenstunden (nur bei fixem Stundenplan)
      if (timetableSettings?.scheduleType === 'fixed') {
        for (const yearlyLesson of createdLessons) {
          try {
            await syncYearlyLessonToWeekly(yearlyLesson, timetableSettings, subjects, createdLessons);
          } catch (syncError) {
            console.warn('Sync to weekly failed for lesson:', yearlyLesson.id, syncError);
          }
        }
      }

      // Nicht zugewiesene Lektionen im localStorage speichern falls vorhanden
      if (unassignedLessons.length > 0) {
        localStorage.setItem('pendingArchivedLessons', JSON.stringify({
          topicId: topicId,
          lessons: unassignedLessons.map(u => u.lesson)
        }));
        toast.info(`${unassignedLessons.length} Lektion(en) wurden nicht zugewiesen und koennen spaeter platziert werden.`);
      }

      toast.success(`Thema wiederhergestellt! ${createdLessons.length} Lektion(en) erstellt.`);

      // Modal schließen und States zurücksetzen
      setIsAssignmentModalOpen(false);
      setAssignmentSubject(null);
      setAssignmentSharedTopic(null);
      setArchivedAssignmentTopic(null);
      setArchivedAssignmentLessons([]);

      // Daten neu laden
      loadData();

      // Queries invalidieren
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['yearlyLessons'] });
      queryClient.invalidateQueries({ queryKey: ['allYearlyLessons'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });

    } catch (error) {
      console.error('Error completing archived assignment:', error);
      toast.error('Fehler beim Erstellen der Lektionen');
    }
  };

  // Handler: Topic archivieren (Rechtsklick-Menü)
  const handleArchiveTopic = async (topic) => {
    try {
      // Lade YearlyLessons für dieses Topic
      const allYearlyLessonsData = await YearlyLesson.list();
      const topicLessons = allYearlyLessonsData
        .filter(yl => yl.topic_id === topic.id)
        // Sortiere nach week_number, dann lesson_number für korrekte Reihenfolge
        .sort((a, b) => {
          if (a.week_number !== b.week_number) return a.week_number - b.week_number;
          return a.lesson_number - b.lesson_number;
        });

      // Erstelle lessons_snapshot
      const lessonsSnapshot = topicLessons.map(l => ({
        name: l.notes || l.name || '',
        notes: l.notes || '',
        steps: l.steps || [],
        is_exam: l.is_exam || false,
        is_double_lesson: l.is_double_lesson || false,
        original_week: l.week_number,
        original_lesson_number: l.lesson_number
      }));

      // Erstelle topic_snapshot (für materials und lehrplan_kompetenz_ids)
      const topicSnapshot = {
        materials: topic.materials || [],
        lehrplan_kompetenz_ids: topic.lehrplan_kompetenz_ids || []
      };

      // Topic aktualisieren: subject auf null setzen = archivieren
      await Topic.update(topic.id, {
        subject: null,
        lessons_snapshot: lessonsSnapshot.length > 0 ? lessonsSnapshot : null,
        topic_snapshot: topicSnapshot
      });

      // YearlyLessons löschen (werden im Snapshot gespeichert)
      for (const lesson of topicLessons) {
        await YearlyLesson.delete(lesson.id);
      }

      toast.success(`Thema "${topic.name}" archiviert`);

      // UI aktualisieren
      loadData();

      // Queries invalidieren
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['yearlyLessons'] });
      queryClient.invalidateQueries({ queryKey: ['allYearlyLessons'] });

    } catch (error) {
      console.error('Error archiving topic:', error);
      toast.error('Fehler beim Archivieren des Themas');
    }
  };

  // Handler: Topic duplizieren starten (Rechtsklick-Menü)
  const handleDuplicateTopic = async (topic) => {
    try {
      // Lade YearlyLessons für dieses Topic
      const allYearlyLessonsData = await YearlyLesson.list();
      const topicLessons = allYearlyLessonsData
        .filter(yl => yl.topic_id === topic.id)
        // Sortiere nach week_number, dann lesson_number für korrekte Reihenfolge
        .sort((a, b) => {
          if (a.week_number !== b.week_number) return a.week_number - b.week_number;
          return a.lesson_number - b.lesson_number;
        });

      // Erstelle lessons_snapshot
      const lessonsSnapshot = topicLessons.map(l => ({
        name: l.notes || l.name || '',
        notes: l.notes || '',
        steps: l.steps || [],
        is_exam: l.is_exam || false,
        is_double_lesson: l.is_double_lesson || false
      }));

      // Topic mit _lessonsSnapshot Property speichern
      setDuplicateSourceTopic({
        ...topic,
        _lessonsSnapshot: lessonsSnapshot
      });

      // SubjectSelectDialog öffnen
      setIsDuplicateSelectOpen(true);

    } catch (error) {
      console.error('Error preparing topic duplication:', error);
      toast.error('Fehler beim Vorbereiten der Duplizierung');
    }
  };

  // Handler: Fach für Duplizierung ausgewählt (ohne Lektionen)
  const handleDuplicateSubjectSelected = async (subjectId, sharedTopic) => {
    try {
      const subject = subjects.find(s => s.id === subjectId);
      if (!subject || !duplicateSourceTopic) return;

      const topicData = sharedTopic?.topic_snapshot || duplicateSourceTopic;

      // Neues Topic erstellen (Kopie)
      const newTopic = await Topic.create({
        name: topicData.name + ' (Kopie)',
        description: topicData.description || '',
        color: topicData.color || '#3b82f6',
        goals: topicData.goals || '',
        materials: topicData.materials || [],
        lehrplan_kompetenz_ids: topicData.lehrplan_kompetenz_ids || [],
        subject: subjectId,
        class_id: subject.class_id,
        user_id: pb.authStore.model.id,
        school_year: new Date().getFullYear()
      });

      toast.success(`Thema "${newTopic.name}" erstellt`);

      // UI aktualisieren
      setAllTopics(prev => [...prev, newTopic]);
      setTopics(prev => [...prev, newTopic]);

      // States zurücksetzen
      setIsDuplicateSelectOpen(false);
      setDuplicateSourceTopic(null);

      // Queries invalidieren
      queryClient.invalidateQueries({ queryKey: ['topics'] });

    } catch (error) {
      console.error('Error duplicating topic:', error);
      toast.error('Fehler beim Duplizieren des Themas');
    }
  };

  // Handler: Duplizierung mit Lektionen abschliessen
  const handleDuplicateAssignmentComplete = async ({ sharedTopic, selectedSubject, assignments, unassignedLessons }) => {
    try {
      const topicData = sharedTopic.topic_snapshot;

      // 1. Neues Topic erstellen (Kopie)
      const newTopic = await Topic.create({
        name: topicData.name,
        description: topicData.description || '',
        color: topicData.color || '#3b82f6',
        goals: topicData.goals || '',
        materials: topicData.materials || [],
        lehrplan_kompetenz_ids: topicData.lehrplan_kompetenz_ids || [],
        estimated_lessons: topicData.estimated_lessons || 0,
        department: null, // Empfaenger waehlt selbst
        subject: selectedSubject.id,
        class_id: selectedSubject.class_id,
        user_id: pb.authStore.model.id,
        school_year: new Date().getFullYear()
      });

      // 2. YearlyLessons für zugewiesene Lektionen erstellen
      const createdLessons = [];
      for (const assignment of assignments) {
        const lesson = assignment.lesson;
        const yearlyLesson = await YearlyLesson.create({
          week_number: assignment.week,
          lesson_number: assignment.slot,
          subject: selectedSubject.id,
          class_id: selectedSubject.class_id,
          user_id: pb.authStore.model.id,
          school_year: new Date().getFullYear(),
          topic_id: newTopic.id,
          name: lesson.name || lesson.notes || `Lektion ${assignment.slot}`,
          notes: lesson.notes || '',
          steps: lesson.steps || [],
          is_exam: lesson.is_exam || false,
          is_double_lesson: assignment.isDouble
        });

        createdLessons.push(yearlyLesson);

        // Wenn Doppellektion, zweite YearlyLesson erstellen und verlinken
        if (assignment.isDouble) {
          const secondLesson = await YearlyLesson.create({
            week_number: assignment.week,
            lesson_number: assignment.slot + 1,
            subject: selectedSubject.id,
            class_id: selectedSubject.class_id,
            user_id: pb.authStore.model.id,
            school_year: new Date().getFullYear(),
            topic_id: newTopic.id,
            name: lesson.name || lesson.notes || `Lektion ${assignment.slot + 1}`,
            notes: lesson.notes || '',
            steps: lesson.steps || [],
            is_exam: lesson.is_exam || false,
            is_double_lesson: true
          });

          // Verlinke nur erste Lektion zur zweiten (unidirektional)
          await YearlyLesson.update(yearlyLesson.id, {
            second_yearly_lesson_id: secondLesson.id
          });

          createdLessons.push(secondLesson);
        }
      }

      // 2b. Sync YearlyLessons zu Wochenstunden (nur bei fixem Stundenplan)
      if (timetableSettings?.scheduleType === 'fixed') {
        for (const yearlyLesson of createdLessons) {
          try {
            await syncYearlyLessonToWeekly(yearlyLesson, timetableSettings, subjects, createdLessons);
          } catch (syncError) {
            console.warn('Sync to weekly failed for lesson:', yearlyLesson.id, syncError);
          }
        }
      }

      // 3. UI aktualisieren
      setAllTopics(prev => [...prev, newTopic]);
      setTopics(prev => [...prev, newTopic]);

      if (unassignedLessons.length > 0) {
        toast.info(`${unassignedLessons.length} Lektion(en) wurden nicht zugewiesen.`);
      }

      toast.success(`Thema dupliziert! ${createdLessons.length} Lektion(en) erstellt.`);

      // Modal schließen und States zurücksetzen
      setIsAssignmentModalOpen(false);
      setAssignmentSubject(null);
      setAssignmentSharedTopic(null);
      setDuplicateSourceTopic(null);

      // Queries invalidieren
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['yearlyLessons'] });
      queryClient.invalidateQueries({ queryKey: ['allYearlyLessons'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });

    } catch (error) {
      console.error('Error completing duplicate assignment:', error);
      toast.error('Fehler beim Duplizieren des Themas');
    }
  };

  // Handler: Assignment Modal für Duplizierung öffnen (mit Lektionen)
  const handleDuplicateOpenAssignment = async (selectedSubject, sharedTopic) => {
    try {
      // Lade Settings für den fixen Stundenplan
      const { Setting } = await import('@/api/entities');
      const settingsList = await Setting.list();
      const userSettings = settingsList.find(s => s.user_id === pb.authStore.model?.id);

      // Bei flexiblem Stundenplan: Direkt duplizieren ohne Assignment-Modal
      if (!userSettings?.fixedScheduleTemplate || userSettings?.scheduleType !== 'fixed') {
        // Erstelle Topic ohne Lektionen (User muss manuell zuweisen)
        const newTopic = await Topic.create({
          name: (duplicateSourceTopic?.name || '') + ' (Kopie)',
          description: duplicateSourceTopic?.description || '',
          color: duplicateSourceTopic?.color || '#3b82f6',
          goals: duplicateSourceTopic?.goals || '',
          materials: duplicateSourceTopic?.materials || [],
          lehrplan_kompetenz_ids: duplicateSourceTopic?.lehrplan_kompetenz_ids || [],
          subject: selectedSubject.id,
          class_id: selectedSubject.class_id,
          user_id: pb.authStore.model.id,
          school_year: new Date().getFullYear()
        });

        // Speichere Lektionen für spätere Zuweisung
        const lessonsSnapshot = duplicateSourceTopic?._lessonsSnapshot || [];
        if (lessonsSnapshot.length > 0) {
          localStorage.setItem('pendingDuplicatedLessons', JSON.stringify({
            topicId: newTopic.id,
            lessons: lessonsSnapshot
          }));
          toast.success(`Thema "${newTopic.name}" erstellt. Platziere jetzt die ${lessonsSnapshot.length} Lektionen.`);
          navigate(`/YearlyOverview?subject=${encodeURIComponent(selectedSubject.name)}&mode=assign&topic=${newTopic.id}`);
        } else {
          toast.success(`Thema "${newTopic.name}" erstellt.`);
        }

        // UI aktualisieren und States zurücksetzen
        setAllTopics(prev => [...prev, newTopic]);
        setTopics(prev => [...prev, newTopic]);
        setIsDuplicateSelectOpen(false);
        setDuplicateSourceTopic(null);
        queryClient.invalidateQueries({ queryKey: ['topics'] });
        return;
      }

      setTimetableSettings(userSettings || null);
      setAssignmentSubject(selectedSubject);

      // Erstelle sharedTopic-Format für das Modal
      setAssignmentSharedTopic({
        topic_snapshot: {
          name: (duplicateSourceTopic?.name || '') + ' (Kopie)',
          description: duplicateSourceTopic?.description || '',
          color: duplicateSourceTopic?.color || '#3b82f6',
          goals: duplicateSourceTopic?.goals || '',
          materials: duplicateSourceTopic?.materials || [],
          lehrplan_kompetenz_ids: duplicateSourceTopic?.lehrplan_kompetenz_ids || []
        },
        lessons_snapshot: duplicateSourceTopic?._lessonsSnapshot || []
      });

      // Duplicate-Dialog schließen, Assignment-Modal öffnen
      setIsDuplicateSelectOpen(false);
      setIsAssignmentModalOpen(true);

    } catch (error) {
      console.error('Error opening duplicate assignment:', error);
      toast.error('Fehler beim Öffnen des Zuweisungs-Modals');
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const selectMode = searchParams.get('select') === 'true';
    const topicIdParam = searchParams.get('topic');

    if (selectMode) {
      setShowCompetencySelection(true);
      setActiveTab('curriculum');
      if (topicIdParam) {
        setAssignTopicId(topicIdParam);
        // Lade vorhandene Kompetenzen aus localStorage falls vorhanden
        const pending = localStorage.getItem('pendingCompetencyAssign');
        if (pending) {
          try {
            const data = JSON.parse(pending);
            if (data.currentCompetencies) {
              setSelectedCompetencyIds(data.currentCompetencies);
            }
          } catch (e) {
            console.error('Error parsing pendingCompetencyAssign:', e);
          }
        }
      }
    } else {
      // Reset wenn nicht im select-Modus
      setShowCompetencySelection(false);
      setAssignTopicId(null);
    }

    // Handle direct tab navigation
    if (searchParams.get('tab') === 'curriculum') {
      setActiveTab('curriculum');
    }
  }, [location]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subjectsData, topicsData, competenciesData, yearlyLessonsData, lessonsData] = await Promise.all([
        Subject.list(), // lädt alle Fächer (dank custom filter in entities.js)
        Topic.list(),   // <-- KEIN FILTER mehr – lädt ALLE Topics (alte + neue)
        CurriculumCompetency.list(),
        YearlyLesson.list(), // Für automatischen Kompetenz-Status
        Lesson.list()        // Für Wochenprüfung im Kompetenz-Status
      ]);
      setSubjects(subjectsData || []);
      setAllTopics(topicsData || []);
      setTopics(topicsData || []);  // Store-Sync für useCompetencyStatus

      // Store-Sync für automatischen Kompetenz-Status (YearlyLessons und Lessons)
      setAllYearlyLessons(yearlyLessonsData || []);
      setAllLessons(lessonsData || []);

      // Debug-Logging für Lehrplan-Kompetenzen
      console.log('[TopicsView] Loaded competencies:', competenciesData?.length || 0);
      if (competenciesData?.length > 0) {
        const fachNames = [...new Set(competenciesData.map(c => c.fach_name))];
        console.log('[TopicsView] Competencies by fach_name:', fachNames);
      }

      setCurriculumCompetencies(competenciesData || []);

      // Initialisiere/Vervollständige den GESAMTEN Lehrplan 21 (alle 12 Fächer, unabhängig von User-Fächern)
      // Prüft IMMER auf fehlende einzelne Kompetenzen (nicht nur fehlende Fächer)
      const initialized = await initializeFullLehrplan21(competenciesData);
      if (initialized > 0) {
        const updatedCompetencies = await CurriculumCompetency.list();
        setCurriculumCompetencies(updatedCompetencies || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialisiert den GESAMTEN Lehrplan 21 (alle 12 Fächer)
  // Prüft auch auf fehlende Kompetenzen und lädt diese nach
  const initializeFullLehrplan21 = async (existingCompetencies) => {
    let initialized = 0;
    let totalAdded = 0;

    for (const subjectName of SUPPORTED_LEHRPLAN_SUBJECTS) {
      const lehrplanData = getLehrplanData(subjectName);
      if (lehrplanData.length === 0) continue;

      // Hole existierende Kompetenz-IDs für dieses Fach
      const existingForSubject = existingCompetencies.filter(c => c.fach_name === subjectName);
      const existingIds = new Set(existingForSubject.map(c => c.kompetenz_id));

      // Finde fehlende Kompetenzen (die in lehrplanData sind, aber nicht in der DB)
      // Setze Fallback für leere beschreibung, da PocketBase dies erfordert
      const missingCompetencies = lehrplanData
        .filter(c => !existingIds.has(c.kompetenz_id))
        .map(c => ({
          ...c,
          beschreibung: c.beschreibung || '-'
        }));

      if (missingCompetencies.length > 0) {
        try {
          await CurriculumCompetency.bulkCreate(missingCompetencies);
          console.log(`[TopicsView] Lehrplan für ${subjectName}: ${missingCompetencies.length} fehlende Kompetenzen nachgeladen (${existingForSubject.length} existierten bereits)`);
          initialized++;
          totalAdded += missingCompetencies.length;
        } catch (error) {
          console.error(`Error initializing Lehrplan for ${subjectName}:`, error);
        }
      }
    }
    if (initialized > 0) {
      toast.success(`${totalAdded} Lehrplan-Kompetenzen für ${initialized} Fach/Fächer nachgeladen!`);
    }
    return initialized;
  };

  const handleAddTopic = (subjectId) => {
    setAddModalOpenBySubject(prev => ({ ...prev, [subjectId]: true }));
  };

  const handleCloseAddModal = (subjectId) => {
    setAddModalOpenBySubject(prev => ({ ...prev, [subjectId]: false }));
  };

  const handleSaveTopic = async (topicData, subjectId) => {  // subjectId kommt als Parameter (aus onSave)
    const subjectDetail = subjects.find(s => s.id === subjectId);  // ← IMMER FRISCH aus state!

    if (!subjectDetail) {
      toast.error('Fach nicht gefunden – bitte Seite neu laden');
      return;
    }

    const payload = {
      name: topicData.name || topicData.title,
      title: topicData.name || topicData.title,  // Kompatibilität
      subject: subjectDetail.id,          // ← garantiert aktuell
      class_id: subjectDetail.class_id,  // ← sicherstellen
      description: topicData.description || '',
      color: topicData.color || '#3b82f6',
      estimated_lessons: topicData.estimated_lessons || 0,
      goals: topicData.goals || '',
      department: topicData.department || null,
      lehrplan_kompetenz_ids: topicData.lehrplan_kompetenz_ids || [],
      materials: topicData.materials || [],
      school_year: new Date().getFullYear()
    };

    console.log('SAVE PAYLOAD:', payload);
    console.log('TOPIC ID:', topicData.id);

    try {
      let savedTopic;
      if (topicData.id) {
        savedTopic = await Topic.update(topicData.id, payload);
        toast.success('Thema aktualisiert');
      } else {
        savedTopic = await Topic.create(payload);
        toast.success('Thema erstellt');
      }

      // DIREKT im lokalen State updaten → sofort sichtbar!
      setAllTopics(prevTopics => {
        const exists = prevTopics.find(t => t.id === savedTopic.id);
        let updatedTopics;
        if (exists) {
          // Update bestehendes Thema
          updatedTopics = prevTopics.map(t => t.id === savedTopic.id ? savedTopic : t);
        } else {
          // Neues Thema hinzufügen
          updatedTopics = [...prevTopics, savedTopic];
        }
        // Store-Sync für useCompetencyStatus
        setTopics(updatedTopics);
        return updatedTopics;
      });

      // Optional: Modal schließen (beim Erstellen)
      if (!topicData.id) {
        handleCloseAddModal(subjectId);
      }

      // Optional: Falls du irgendwo React Query verwendest (z. B. in TopicModal), dann auch invalidieren
      queryClient.invalidateQueries({ queryKey: ['topics'] });

      return savedTopic;
    } catch (error) {
      console.error('Error saving topic:', error);
      toast.error('Fehler beim Speichern des Themas');
    }
  };

  const handleDeleteTopic = async (topicId) => {
    // Optimistic UI Update
    setAllTopics(prev => prev.filter(t => t.id !== topicId));

    try {
      // Verwende deleteTopicWithLessons um Topic und zugehörige Lektionen zu löschen
      await deleteTopicWithLessons(topicId);
      toast.success('Thema und alle Lektionen gelöscht');
      // Invalidiere Queries
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['yearlyLessons'] });
      queryClient.invalidateQueries({ queryKey: ['allYearlyLessons'] });
    } catch (error) {
      toast.error('Löschen fehlgeschlagen – wird wieder angezeigt');
      // Zurückrollen durch Neuladen
      loadData();
    }
  };

  // Callback für CurriculumTree - wird aufgerufen wenn Kompetenz-Status geändert wird
  const handleTopicsUpdate = async () => {
    try {
      // Lade ALLE relevanten Daten neu für konsistenten Status
      const [freshTopics, freshCompetencies, freshYearlyLessons, freshLessons] = await Promise.all([
        Topic.list(),
        CurriculumCompetency.list(),
        YearlyLesson.list(),
        Lesson.list()
      ]);
      setAllTopics(freshTopics || []);
      setTopics(freshTopics || []);  // Store-Sync für useCompetencyStatus
      setCurriculumCompetencies(freshCompetencies || []);  // Aktualisiert auch direkte Overrides
      setAllYearlyLessons(freshYearlyLessons || []);  // Für automatischen Status
      setAllLessons(freshLessons || []);  // Für Wochenprüfung
      // Query-Cache invalidieren
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['curriculum-competencies'] });
      queryClient.invalidateQueries({ queryKey: ['allYearlyLessons'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
    }
  };

  // Handler für Kompetenz-Auswahl im CurriculumTree
  const handleCompetencySelect = (competencyId) => {
    setSelectedCompetencyIds(prev => {
      if (prev.includes(competencyId)) {
        return prev.filter(id => id !== competencyId);
      }
      return [...prev, competencyId];
    });
  };

  // Handler für Kompetenz-Zuweisung abschliessen
  const handleCompetencyAssignComplete = async (competencyIds) => {
    console.log('[handleCompetencyAssignComplete] Called with:', { assignTopicId, competencyIds });

    if (!assignTopicId) {
      console.warn('[handleCompetencyAssignComplete] No assignTopicId set');
      return;
    }

    try {
      // Topic mit neuen Kompetenzen aktualisieren
      const updatedTopic = await Topic.update(assignTopicId, {
        lehrplan_kompetenz_ids: competencyIds
      });
      console.log('[handleCompetencyAssignComplete] Topic updated:', updatedTopic);
      toast.success('Kompetenzen zugewiesen');

      // Zurück zum TopicModal navigieren
      setShowCompetencySelection(false);
      localStorage.removeItem('pendingCompetencyAssign');

      // Topics aktualisieren und das aktualisierte Topic verwenden
      const freshTopics = await Topic.list();
      console.log('[handleCompetencyAssignComplete] Loaded fresh topics:',
        freshTopics.filter(t => t.lehrplan_kompetenz_ids?.length > 0).map(t => ({
          name: t.name,
          id: t.id,
          kompetenzIds: t.lehrplan_kompetenz_ids
        }))
      );
      setAllTopics(freshTopics || []);
      setTopics(freshTopics || []);

      // Topic Modal öffnen mit dem aktualisierten Topic
      const freshTopic = freshTopics.find(t => t.id === assignTopicId);
      console.log('[handleCompetencyAssignComplete] Fresh topic:', freshTopic);
      if (freshTopic) {
        setSelectedTopic(freshTopic);
        setIsModalOpen(true);
      }

      // URL Parameter entfernen
      navigate('/Topics', { replace: true });
      setAssignTopicId(null);
      setSelectedCompetencyIds([]);
    } catch (error) {
      console.error('[handleCompetencyAssignComplete] Fehler:', error);
      toast.error('Fehler beim Zuweisen der Kompetenzen');
    }
  };

  const currentWeek = getCurrentWeek();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 h-screen overflow-y-auto transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              Themenansicht
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mt-1">
              Verwalten Sie Ihre Unterrichtsthemen und Lehrplankompetenzen
            </p>
          </div>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md mb-6">
          <TabsTrigger value="topics" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Meine Themen
          </TabsTrigger>
          <TabsTrigger value="curriculum" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Lehrplan 21
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="space-y-8">
          {subjects.length === 0 ? (
            <div className="text-center py-20 bg-white/60 dark:bg-slate-800/60 rounded-2xl shadow-lg">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Keine Fächer vorhanden
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Erstellen Sie zuerst Fächer in den Einstellungen
              </p>
            </div>
          ) : (
            [...subjects].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((subject, index) => {
              const isAddModalOpen = addModalOpenBySubject[subject.id] || false;

              // ROBUSTER FILTER mit trim + fallback
              const subjectTopics = allTopics
                .filter(t => {
                  const topicSubjectId = typeof t.subject === 'object' && t.subject?.id 
                    ? t.subject.id.trim() 
                    : (t.subject || '').trim();
                  return topicSubjectId === subject.id.trim();
                })
                .sort((a, b) => new Date(a.created) - new Date(b.created));

              return (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md"
                      style={{ backgroundColor: subject.color || '#3b82f6' }}
                    >
                      <span className="text-white font-bold text-lg">
                        {subject.name.charAt(0)}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                      {subject.name}
                    </h2>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      ({subjectTopics.length} Themen)
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 pb-4">
                    {subjectTopics.map((topic) => (
                      <ContextMenu key={topic.id}>
                        <ContextMenuTrigger asChild>
                          <div>
                            <TopicCard
                              topic={topic}
                              onClick={() => {
                                setSelectedTopic(topic);
                                setIsModalOpen(true);
                              }}
                            />
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="bg-slate-900 border-slate-700">
                          <ContextMenuItem
                            onClick={() => handleDuplicateTopic(topic)}
                            className="text-white hover:bg-slate-800 cursor-pointer"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplizieren
                          </ContextMenuItem>
                          <ContextMenuSeparator className="bg-slate-700" />
                          <ContextMenuItem
                            onClick={() => handleArchiveTopic(topic)}
                            className="text-orange-400 hover:bg-slate-800 cursor-pointer"
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Archivieren
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                    <AddTopicCard onClick={() => handleAddTopic(subject.id)} />
                  </div>

                  <TopicModal
                    isOpen={isAddModalOpen}
                    onClose={() => handleCloseAddModal(subject.id)}
                    onSave={(topicData) => handleSaveTopic(topicData, subject.id)}
                    topic={null}
                    subjectColor={subject.color}
                    subject={subject}
                    subjects={subjects}
                    topics={allTopics}
                    curriculumCompetencies={curriculumCompetencies.filter(c => c.fach_name === subject.name)}
                  />
                </motion.div>
              );
            })
          )}

          {/* Archiv-Bereich für nicht zugewiesene Topics */}
          {archivedTopics.length > 0 && (
            <motion.div
              id="archive-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 border-t border-slate-300 dark:border-slate-700 pt-6"
            >
              <Collapsible open={isArchiveExpanded} onOpenChange={setIsArchiveExpanded}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-3 rounded-lg transition-colors">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md bg-orange-500">
                      <Archive className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-600 dark:text-slate-400">
                      Archiv
                    </h2>
                    <span className="bg-orange-500 text-white text-sm px-2 py-0.5 rounded-full">
                      {archivedTopics.length}
                    </span>
                    <div className="flex-1" />
                    {isArchiveExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 pl-3">
                    Diese Themen sind keinem Fach zugewiesen. Rechtsklick zum Zuweisen.
                  </p>
                  <div className="flex flex-wrap gap-4 pt-2 pb-4">
                    {archivedTopics.map((topic) => (
                      <ContextMenu key={topic.id}>
                        <ContextMenuTrigger asChild>
                          <div>
                            <TopicCard
                              topic={topic}
                              onClick={() => {
                                setSelectedArchivedTopic(topic);
                                setIsReassignDialogOpen(true);
                              }}
                            />
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="bg-slate-900 border-slate-700">
                          <ContextMenuItem
                            onClick={() => {
                              setSelectedArchivedTopic(topic);
                              setIsReassignDialogOpen(true);
                            }}
                            className="text-white hover:bg-slate-800 cursor-pointer"
                          >
                            <FolderInput className="w-4 h-4 mr-2" />
                            Neuem Fach zuweisen
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="curriculum" className="space-y-6">
          {/* CurriculumTree mit ALLEN Kompetenzen - Filterung erfolgt in der Komponente */}
          <CurriculumTree
            competencies={curriculumCompetencies}
            onTopicsUpdate={handleTopicsUpdate}
            isSelectable={showCompetencySelection}
            selectedCompetencyIds={selectedCompetencyIds}
            onSelectCompetency={handleCompetencySelect}
            assignTopicId={assignTopicId}
            onAssignComplete={handleCompetencyAssignComplete}
            userSubjects={subjects}  // Für "Meine Fächer" Filter
          />
        </TabsContent>
      </Tabs>

      {selectedTopic && (
        <TopicModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={(topicData) => handleSaveTopic(topicData, selectedTopic.subject?.id || selectedTopic.subject || selectedTopic.subject_id)}
          onDelete={handleDeleteTopic}
          topic={selectedTopic}
          subjectColor={subjects.find(s => s.id === getSubjectId(selectedTopic))?.color}
          subject={subjects.find(s => s.id === getSubjectId(selectedTopic))}
          subjects={subjects}
          topics={allTopics}
          curriculumCompetencies={curriculumCompetencies.filter(c => c.fach_name === subjects.find(s => s.id === getSubjectId(selectedTopic))?.name)}
        />
      )}

      {/* Modals für geteilte Themen */}
      {currentSharedTopic && (
        <>
          <ReceivedTopicModal
            isOpen={isReceivedModalOpen}
            onClose={() => setIsReceivedModalOpen(false)}
            sharedTopic={currentSharedTopic}
            onAccept={() => {
              setIsReceivedModalOpen(false);
              setIsSubjectSelectOpen(true);
            }}
            onReject={() => handleRejectShare(currentSharedTopic)}
          />
          <SubjectSelectDialog
            isOpen={isSubjectSelectOpen}
            onClose={() => setIsSubjectSelectOpen(false)}
            sharedTopic={currentSharedTopic}
            subjects={subjects}
            onSubjectSelected={handleAcceptShare}
            onOpenAssignment={handleOpenAssignment}
          />
        </>
      )}

      {/* SubjectSelectDialog für Duplizieren */}
      {duplicateSourceTopic && (
        <SubjectSelectDialog
          isOpen={isDuplicateSelectOpen}
          onClose={() => {
            setIsDuplicateSelectOpen(false);
            setDuplicateSourceTopic(null);
          }}
          sharedTopic={{
            topic_snapshot: duplicateSourceTopic,
            lessons_snapshot: duplicateSourceTopic._lessonsSnapshot || []
          }}
          subjects={subjects}
          onSubjectSelected={handleDuplicateSubjectSelected}
          onOpenAssignment={handleDuplicateOpenAssignment}
        />
      )}

      {/* Lektions-Zuweisung Modal (für geteilte, archivierte UND duplizierte Themen) */}
      {assignmentSharedTopic && (
        <SharedLessonAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => {
            setIsAssignmentModalOpen(false);
            setAssignmentSubject(null);
            setAssignmentSharedTopic(null);
            setArchivedAssignmentTopic(null);
            setArchivedAssignmentLessons([]);
            setDuplicateSourceTopic(null);
          }}
          sharedTopic={assignmentSharedTopic}
          selectedSubject={assignmentSubject}
          subjects={subjects}
          settings={timetableSettings}
          allYearlyLessons={storeYearlyLessons}
          onComplete={archivedAssignmentTopic ? handleArchivedAssignmentComplete : (duplicateSourceTopic ? handleDuplicateAssignmentComplete : handleAssignmentComplete)}
        />
      )}

      {/* Archiv Notification */}
      <ArchivedTopicsNotification
        isOpen={showArchiveNotification}
        onClose={() => setShowArchiveNotification(false)}
        archivedCount={archivedTopics.length}
        onReassign={() => {
          setIsArchiveExpanded(true);
          // Scroll to archive section
          setTimeout(() => {
            document.getElementById('archive-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
      />

      {/* Archiviertes Topic neu zuweisen */}
      <ArchivedTopicReassignModal
        isOpen={isReassignDialogOpen}
        onClose={() => {
          setIsReassignDialogOpen(false);
          setSelectedArchivedTopic(null);
        }}
        topic={selectedArchivedTopic}
        subjects={subjects}
        onReassigned={() => {
          loadData();
        }}
        onOpenAssignment={handleOpenArchivedAssignment}
      />
    </div>
  );
};

export default TopicsView;