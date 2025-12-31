import React, { useState, useEffect } from 'react';
import { Subject, Topic, YearlyLesson, Lesson, LehrplanKompetenz as CurriculumCompetency, SharedTopic } from "@/api/entities";
import { deleteTopicWithLessons } from '@/api/topicService';
import TopicCard from '../components/topics/TopicCard';
import AddTopicCard from '../components/topics/AddTopicCard';
import TopicModal from '../components/topics/TopicModal';
import ReceivedTopicModal from '../components/topics/ReceivedTopicModal';
import SubjectSelectDialog from '../components/topics/SubjectSelectDialog';
import CurriculumImport from '../components/curriculum/CurriculumImport';
import CurriculumTree from '../components/curriculum/CurriculumTree';
import { motion } from 'framer-motion';
import { BookOpen, Loader2, GraduationCap } from 'lucide-react';
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

  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  // Store-Synchronisation für useCompetencyStatus Hook
  const { setTopics, setAllYearlyLessons, setAllLessons } = useLessonStore();

  useEffect(() => {
    loadData();
    checkPendingShares();
  }, []);

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

      setCurriculumCompetencies(competenciesData || []);

      if (competenciesData.length === 0 && subjectsData.some(s => s.name === 'Deutsch')) {
        await initializeLehrplan21();
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

  const initializeLehrplan21 = async () => {
    const lehrplan21Data = getLehrplanData('Deutsch');
  
    try {
      await CurriculumCompetency.bulkCreate(lehrplan21Data);
      toast.success('Lehrplan 21 für Deutsch geladen!');
    } catch (error) {
      console.error('Error initializing Lehrplan 21:', error);
      toast.error('Fehler beim Initialisieren des Lehrplans 21');
    }
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
      department: topicData.department || '',
      lehrplan_kompetenz_ids: topicData.lehrplan_kompetenz_ids || [],
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
            Lehrplan 21 ({curriculumCompetencies.length})
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
                      <TopicCard
                        key={topic.id}
                        topic={topic}
                        onClick={() => {
                          setSelectedTopic(topic);
                          setIsModalOpen(true);
                        }}
                      />
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
        </TabsContent>

        <TabsContent value="curriculum" className="space-y-6">
          {subjects.length === 0 ? (
            <div className="text-center py-20 bg-white/60 dark:bg-slate-800/60 rounded-2xl shadow-lg">
              <GraduationCap className="w-16 h-16 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Keine Fächer vorhanden
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Erstellen Sie zuerst Fächer in den Einstellungen
              </p>
            </div>
          ) : (
            <>
              {subjects.map(subject => {
                // Fix: Optional Chaining für undefined data – verwende curriculumCompetencies statt competenciesWithAssignments
                const subjectCompetencies = curriculumCompetencies.filter(c => c.fach_name === subject.name);  // ← Ändern zu fach_name
                console.log('subjectCompetencies for', subject.name, subjectCompetencies);

                if (subjectCompetencies.length === 0) return null;

                return (
                  <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
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
                        {subject.name} - Lehrplan 21 (Aargau)
                      </h2>
                    </div>

                    {/* CurriculumTree mit View-Daten - im Selection-Modus wenn showCompetencySelection aktiv */}
                    <CurriculumTree
                      competencies={subjectCompetencies}
                      onTopicsUpdate={handleTopicsUpdate}
                      isSelectable={showCompetencySelection}
                      selectedCompetencyIds={selectedCompetencyIds}
                      onSelectCompetency={handleCompetencySelect}
                      assignTopicId={assignTopicId}
                      onAssignComplete={handleCompetencyAssignComplete}
                    />
                  </motion.div>
                );
              })}
            </>
          )}
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
          />
        </>
      )}
    </div>
  );
};

export default TopicsView;