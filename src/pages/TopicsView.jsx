import React, { useState, useEffect } from 'react';
import { Subject, Topic, YearlyLesson, LehrplanKompetenz as CurriculumCompetency } from "@/api/entities";
import TopicCard from '../components/topics/TopicCard';
import AddTopicCard from '../components/topics/AddTopicCard';
import TopicModal from '../components/topics/TopicModal';
import CurriculumImport from '../components/curriculum/CurriculumImport';
import CurriculumTree from '../components/curriculum/CurriculumTree';
import { motion } from 'framer-motion';
import { BookOpen, Loader2, GraduationCap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLehrplanData } from '../components/curriculum/lehrplanData';
import pb from '@/api/pb';
import { useLocation } from 'react-router-dom';

const getCurrentWeek = () => {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const daysToMonday = (jan4.getDay() + 6) % 7;
  const mondayOfWeek1 = new Date(jan4.getTime() - daysToMonday * 86400000);
  const diffTime = now.getTime() - mondayOfWeek1.getTime();
  return Math.max(1, Math.min(52, Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1));
};

const TopicsView = () => {
  const [subjects, setSubjects] = useState([]);
  const [allTopics, setAllTopics] = useState([]);
  const [allYearlyLessons, setAllYearlyLessons] = useState([]);
  const [curriculumCompetencies, setCurriculumCompetencies] = useState([]);
  const [addModalOpenBySubject, setAddModalOpenBySubject] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('topics');
  const [selectedTopic, setSelectedTopic] = useState(null);  // Neu: Für Bearbeiten eines Topics
  const [isModalOpen, setIsModalOpen] = useState(false);  // Neu: Für Modal-Öffnung
  const [showCompetencySelection, setShowCompetencySelection] = useState(false);  // Neu: Für konditionale Anzeige
  const queryClient = useQueryClient();
  const location = useLocation();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('select') === 'true') {
      setShowCompetencySelection(true);
      setActiveTab('curriculum');
    }
  }, [location]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subjectsData, topicsData, yearlyLessonsData, competenciesData] = await Promise.all([
        Subject.list(), // lädt alle Fächer (dank custom filter in entities.js)
        Topic.list(),   // <-- KEIN FILTER mehr – lädt ALLE Topics (alte + neue)
        YearlyLesson.list(),
        CurriculumCompetency.list()
      ]);
      setSubjects(subjectsData || []);
      console.log('Loaded curriculumCompetencies:', competenciesData?.length, competenciesData?.map(c => c.fach_name));  // ← Ändern zu fach_name      
      setAllTopics(topicsData || []);
      
      setAllYearlyLessons(yearlyLessonsData || []);
      setCurriculumCompetencies(competenciesData || []);
      console.log('Loaded curriculumCompetencies:', competenciesData?.length, competenciesData?.map(c => c.fach_name));  // Debug: Überprüfe geladene Kompetenzen
      
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
      lehrplan_kompetenz_ids: topicData.lehrplan_kompetenz_ids || []
    };

    try {
      let savedTopic;
      if (topicData.id) {
        savedTopic = await Topic.update(topicData.id, payload);
        toast.success('Thema aktualisiert');
      } else {
        savedTopic = await Topic.create(payload);
        toast.success('Thema erstellt');
      }
      handleCloseAddModal(subjectId);
      // Entfernt: await loadData();
      // Stattdessen: Cache direkt updaten
      queryClient.setQueryData(['topics'], (old = []) => {
        const exists = old.find(t => t.id === savedTopic.id);
        if (exists) {
          return old.map(t => t.id === savedTopic.id ? savedTopic : t);
        }
        return [...old, savedTopic];
      });
      return savedTopic;
    } catch (error) {
      console.error('Error saving topic:', error);
      toast.error('Fehler beim Speichern des Themas');
    }
  };

  const handleDeleteTopic = async (topicId) => {
    // 1. Optimistic Update – Thema sofort aus UI entfernen
    queryClient.setQueryData(['topics'], (oldTopics = []) => 
      oldTopics.filter(t => t.id !== topicId)
    );

    // Optional: auch aus allTopics im lokalen State entfernen (falls du das noch irgendwo nutzt)
    setAllTopics(prev => prev.filter(t => t.id !== topicId));

    try {
      // 2. Jetzt wirklich löschen (inkl. Cascade über deinen Service!)
      await Topic.delete(topicId);

      toast.success('Thema und alle Lektionen gelöscht');
    } catch (error) {
      // Falls was schiefgeht → zurückrollen
      toast.error('Löschen fehlgeschlagen – wird wieder angezeigt');
      
      // Cache wiederherstellen
      queryClient.invalidateQueries(['topics']);
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
    <div className="p-6 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 min-h-screen transition-colors duration-300">
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
            subjects.map((subject, index) => {
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

                  <div className="flex overflow-x-auto gap-4 pb-4">
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

                    {/* Neu: Auswahl-Liste für Kompetenzen – konditional */}
                    {showCompetencySelection && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Kompetenzen auswählen</h3>
                        {subjectCompetencies.map(comp => (
                          <div key={comp.id} className="flex items-center gap-2 p-2 border rounded">
                            <Checkbox 
                              checked={selectedCompetencies.includes(comp.id)}
                              onCheckedChange={() => toggleCompetency(comp.id)}
                            />
                            <div>
                              <p>{comp.beschreibung} (Zyklus {comp.zyklus})</p>
                              {/* Entferne assigned_count und assigned_topics, da Daten nicht verfügbar */}
                            </div>
                          </div>
                        ))}
                        <Button onClick={() => handleSaveSelectedCompetencies(subject.name)}>
                          Auswahl speichern
                        </Button>
                      </div>
                    )}

                    {/* Bestehende Tree mit View-Daten erweitert – verwende subjectCompetencies */}
                    <CurriculumTree
                      competencies={subjectCompetencies}  // Verwende gefilterte curriculumCompetencies
                      yearlyLessons={allYearlyLessons}
                      topics={allTopics}
                      currentWeek={currentWeek}
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
          onSave={(topicData) => handleSaveTopic(topicData, selectedTopic.subject)}
          onDelete={handleDeleteTopic}
          topic={selectedTopic}
          subjectColor={subjects.find(s => s.id === selectedTopic.subject)?.color}
          subject={subjects.find(s => s.id === selectedTopic.subject)}
          topics={allTopics}
          curriculumCompetencies={curriculumCompetencies.filter(c => c.fach_name === subjects.find(s => s.id === selectedTopic.subject)?.name)}
        />
      )}
    </div>
  );
};

export default TopicsView;