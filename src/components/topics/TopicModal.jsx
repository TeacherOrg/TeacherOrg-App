import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Trash2, Palette, Package, Image, BookOpen, Save as SaveIcon, GraduationCap, Search, Plus, Share2 } from "lucide-react";
import ShareTopicDialog from './ShareTopicDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { SketchPicker } from 'react-color';
import LessonModal from "@/components/yearly/LessonModal";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Fachbereich, Topic, YearlyLesson } from '@/api/entities';
import pb from '@/api/pb';
import { useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { LehrplanKompetenz as CurriculumCompetency } from '@/api/entities';
import { deleteTopicWithLessons } from '@/api/topicService';
import { useSubjectResolver } from './hooks';
import { emitTourEvent, TOUR_EVENTS } from '@/components/onboarding/tours/tourEvents';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981',
  '#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#64748b'
];

const COMMON_MATERIALS = [
  "Dossier",
  "Arbeitsheft",
  "Schreibheft",
  "Buch",
  "Zirkel",
  "Geodreieck",
  "Taschenrechner",
  "Lineal",
  "IPad",
  "Laptop",
  "Heft",
  "Stift",
  "Farben",
  "Schere"
  // hier kannst du jederzeit weitere ergänzen
];

const getCurrentWeek = () => {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const daysToMonday = (jan4.getDay() + 6) % 7;
  const mondayOfWeek1 = new Date(jan4.getTime() - daysToMonday * 86400000);
  const diffTime = now.getTime() - mondayOfWeek1.getTime();
  return Math.max(1, Math.min(52, Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1));
};

const LessonCard = ({ lesson, onClick, color, isDouble = false }) => (
  <div
    className={`${isDouble ? 'w-44' : 'w-20'} h-20 rounded-lg text-white flex items-center justify-center cursor-pointer hover:opacity-90 flex-shrink-0 text-sm font-medium shadow-md relative transition-all duration-200 hover:scale-105`}
    style={{ backgroundColor: color || '#3b82f6' }}
    onClick={onClick}
  >
    {lesson.is_half_class && (
      <div className="absolute top-1 right-1 bg-black/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
        1/2
      </div>
    )}
    {isDouble && (
      <div className="absolute top-1 left-1 bg-black/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
        2x
      </div>
    )}
    <div className="text-center">
      <div className="text-xs opacity-80">L{lesson.lesson_number}{isDouble ? `-${lesson.lesson_number + 1}` : ''}</div>
      <div className="text-[10px] opacity-70">W{lesson.week_number}</div>
    </div>
  </div>
);

export default function TopicModal({ isOpen, onClose, onSave, onDelete, topic, subjectColor, subject, subjects = [], topics = [], curriculumCompetencies = [] }) {
  // Subject-Auflösung mit Fallback-Strategien
  const { effectiveSubject, isValid: isSubjectValid } = useSubjectResolver(subject, topic, subjects);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    goals: "",
    department: "",
    lehrplan_kompetenz_ids: []
  });
  const [lessons, setLessons] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [selectedCompetencies, setSelectedCompetencies] = useState([]);
  const [competencySearch, setCompetencySearch] = useState('');
  const [competencyCycleFilter, setCompetencyCycleFilter] = useState('all');
  const [localCompetencies, setLocalCompetencies] = useState([]);
  const [isLoadingCompetencies, setIsLoadingCompetencies] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [loadedTopic, setLoadedTopic] = useState(topic);
  const [newLessonSlot, setNewLessonSlot] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Neue States für den Material-Tab
  const [selectedCommon, setSelectedCommon] = useState([]);
  const [customMaterials, setCustomMaterials] = useState([]);
  const [newMaterialName, setNewMaterialName] = useState("");

  // State für Teilen-Dialog
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
    }
  };

  // --- QUERIES ---
  const { data: fetchedTopics = [], error: topicsError } = useQuery({
    queryKey: ['topics', effectiveSubject?.id, pb.authStore.model?.id],
    queryFn: async () => {
      console.log('TopicModal: Fetching topics for subject =', effectiveSubject?.id);
      try {
        const topicsData = await Topic.list({ subject: effectiveSubject?.id, 'class_id.user_id': pb.authStore.model?.id });
        console.log('TopicModal: Fetched topics =', topicsData);
        return topicsData;
      } catch (error) {
        console.error('TopicModal: Error fetching topics:', error);
        return [];
      }
    },
    enabled: isOpen && !!effectiveSubject?.id && !!pb.authStore.model?.id,
    placeholderData: [],
  });

  const { data: departmentsData = [], error: departmentsError } = useQuery({
    queryKey: ['fachbereiche', effectiveSubject?.id],
    queryFn: async () => {
      try {
        // Verwende subject_id (ID) statt subject_name (String)
        return await Fachbereich.list({ subject_id: effectiveSubject?.id });
      } catch (error) {
        console.error('Failed to fetch fachbereiche:', error);
        return [];
      }
    },
    enabled: isOpen && !!effectiveSubject?.id,
    placeholderData: [],
  });

  useEffect(() => {
    setDepartments(departmentsData);
  }, [departmentsData]);

  const { data: allYearlyLessons = [] } = useQuery({
    queryKey: ['yearlyLessons', effectiveSubject?.class_id, pb.authStore.model?.id],
    queryFn: async () => {
      try {
        const filter = { user_id: pb.authStore.model?.id };
        if (effectiveSubject?.class_id) {
          filter.class_id = effectiveSubject.class_id;
        }
        return await YearlyLesson.list(filter);
      } catch (error) {
        console.error('Failed to fetch yearly lessons:', error);
        return [];
      }
    },
    enabled: isOpen && !!effectiveSubject?.class_id && !!pb.authStore.model?.id,
    staleTime: 0, // Immer frische Daten holen
    refetchOnMount: 'always', // Immer neu laden wenn Modal öffnet
  });

  // --- LOAD COMPETENCIES ---
  useEffect(() => {
    if (!isOpen) {
      setLocalCompetencies([]);
      return;
    }

    // Wenn kein Fach ausgewählt → leere Liste
    if (!effectiveSubject?.name) {
      setLocalCompetencies([]);
      return;
    }

    // ALLE Kompetenzen laden (fächerübergreifend verfügbar)
    const loadSubjectCompetencies = async () => {
      setIsLoadingCompetencies(true);
      try {
        const allCompetencies = await CurriculumCompetency.list();

        // Alle Kompetenzen verfügbar machen (Filterung erfolgt über UI)
        setLocalCompetencies(allCompetencies);
      } catch (error) {
        console.error('Error loading competencies:', error);
        toast.error('Fehler beim Laden der Kompetenzen');
        setLocalCompetencies([]);
      } finally {
        setIsLoadingCompetencies(false);
      }
    };

    loadSubjectCompetencies();
  }, [isOpen, effectiveSubject?.name]);

  // Emit tour event when modal opens
  useEffect(() => {
    if (isOpen) {
      emitTourEvent(TOUR_EVENTS.TOPIC_MODAL_OPENED);
    }
  }, [isOpen]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    if (isOpen) {
      if (topic) {
        setFormData({
          name: topic.name || "",
          description: topic.description || "",
          color: topic.color || subjectColor || "#3b82f6",
          goals: topic.goals || "",
          department: topic.department || "",
          lehrplan_kompetenz_ids: topic.lehrplan_kompetenz_ids || []
        });
        setSelectedCompetencies(topic.lehrplan_kompetenz_ids || []);

        // Materialien laden und aufteilen in common und custom
        if (topic.materials && Array.isArray(topic.materials)) {
          const commonMats = topic.materials.filter(m => COMMON_MATERIALS.includes(m));
          const customMats = topic.materials.filter(m => !COMMON_MATERIALS.includes(m));
          setSelectedCommon(commonMats);
          setCustomMaterials(customMats);
        } else {
          setSelectedCommon([]);
          setCustomMaterials([]);
        }
        // Lektionen werden jetzt automatisch über useEffect mit allYearlyLessons geladen
      } else {
        setFormData({
          name: "",
          description: "",
          color: subjectColor || "#3b82f6",
          goals: "",
          department: "",
          lehrplan_kompetenz_ids: []
        });
        setSelectedCompetencies([]);
        setLessons([]);
        setSelectedCommon([]);
        setCustomMaterials([]);
      }

      if (effectiveSubject) {
        loadDepartments();
      }

      setCompetencySearch('');
      setCompetencyCycleFilter('all');
    }
  }, [isOpen, topic, subjectColor, effectiveSubject]);

  // Berechne die Lektionen aus dem Query-Cache (abgeleiteter State)
  const computedLessons = useMemo(() => {
    if (!topic?.id || !allYearlyLessons?.length) {
      return [];
    }

    return allYearlyLessons
      .filter(l => l.topic_id === topic.id)
      .map(item => ({
        id: item.id,
        name: item.notes || `Lektion ${item.lesson_number}`,
        week_number: item.week_number,
        lesson_number: Number(item.lesson_number),
        is_half_class: item.is_half_class || false,
        is_exam: item.is_exam || false,
        is_double_lesson: item.is_double_lesson || false,
        second_yearly_lesson_id: item.second_yearly_lesson_id || null
      }))
      .sort((a, b) => {
        if (a.week_number !== b.week_number) return a.week_number - b.week_number;
        return a.lesson_number - b.lesson_number;
      });
  }, [topic?.id, allYearlyLessons]);

  // Kombiniere berechnete Lektionen mit manuell hinzugefügten
  const displayLessons = computedLessons.length > 0 ? computedLessons : lessons;

  // Berechne Gesamtanzahl der Unterrichtsstunden (Doppellektionen = 2)
  const totalLessonCount = useMemo(() => {
    return displayLessons.reduce((sum, lesson) => {
      return sum + (lesson.is_double_lesson ? 2 : 1);
    }, 0);
  }, [displayLessons]);

  const loadDepartments = async () => {
    try {
      const subjectDepartments = await Fachbereich.list({ subject_id: effectiveSubject?.id });
      setDepartments(subjectDepartments);
    } catch (error) {
      console.error('Error loading departments:', error);
      setDepartments([]);
    }
  };

  // --- HANDLERS ---
  const handleAddNewDepartment = async () => {
    if (newDepartmentName.trim() && effectiveSubject?.id) {
      try {
        const newDept = await Fachbereich.create({
          name: newDepartmentName,
          subject_id: effectiveSubject.id,
          class_id: effectiveSubject.class_id,
          user_id: pb.authStore.model?.id
        });
        setDepartments([...departments, newDept]);
        setFormData({ ...formData, department: newDept.id });
        setNewDepartmentName('');
        toast.success('Fachbereich erstellt');
      } catch (error) {
        console.error('Error creating new department:', error);
        toast.error('Fehler beim Erstellen des Fachbereichs');
      }
    }
  };

  const handleAssignLessons = async () => {
    console.log('AssignLessons: effectiveSubject=', effectiveSubject, 'isSubjectValid=', isSubjectValid, 'loadedTopic=', loadedTopic);

    if (!effectiveSubject?.id || !effectiveSubject?.name) {
      console.error('Cannot assign lessons: Missing subject data', {
        effectiveSubject,
        topicId: loadedTopic?.id,
        topicSubject: loadedTopic?.subject
      });
      toast.error('Fach nicht verfügbar - bitte Seite neu laden');
      return;
    }

    let draftTopicId = loadedTopic?.id;
    if (!loadedTopic) {
      try {
        const draft = await Topic.create({
          name: formData.name || 'Draft Topic',
          description: formData.description,
          color: formData.color,
          goals: formData.goals,
          department: formData.department || '',
          subject: effectiveSubject.id,
          class_id: effectiveSubject.class_id,
          user_id: pb.authStore.model?.id || '',
          school_year: new Date().getFullYear()
        });
        draftTopicId = draft.id;
        setLoadedTopic(draft);
      } catch (error) {
        console.error('Error creating draft topic:', error);
        toast.error('Fehler beim Erstellen des Draft-Themas');
        return;
      }
    }

    localStorage.setItem('draftTopic', JSON.stringify({
      ...formData,
      subjectName: effectiveSubject.name,
      topicId: draftTopicId
    }));

    navigate(`/yearlyoverview?subject=${encodeURIComponent(effectiveSubject.name)}&mode=assign&topic=${draftTopicId}`);
  };

  // Handler für Kompetenz-Zuweisung im Lehrplan
  const handleAssignCompetencies = async () => {
    console.log('[handleAssignCompetencies] Starting...', {
      loadedTopicId: loadedTopic?.id,
      topicId: topic?.id,
      formDataName: formData.name,
      effectiveSubject: effectiveSubject
    });

    let topicId = loadedTopic?.id || topic?.id;

    // Falls noch kein Topic existiert, Draft erstellen
    if (!topicId && formData.name) {
      if (!effectiveSubject?.id) {
        toast.error('Fach nicht verfügbar - bitte Seite neu laden');
        return;
      }

      try {
        const draft = await Topic.create({
          name: formData.name || 'Draft Topic',
          description: formData.description,
          color: formData.color,
          goals: formData.goals,
          department: formData.department || '',
          subject: effectiveSubject.id,
          class_id: effectiveSubject.class_id,
          user_id: pb.authStore.model?.id || '',
          school_year: new Date().getFullYear(),
          lehrplan_kompetenz_ids: selectedCompetencies
        });
        topicId = draft.id;
        setLoadedTopic(draft);
      } catch (error) {
        console.error('Error creating draft topic:', error);
        toast.error('Fehler beim Erstellen des Draft-Themas');
        return;
      }
    }

    // Aktuelle Auswahl speichern
    const pendingData = {
      topicId,
      currentCompetencies: selectedCompetencies,
      subjectName: effectiveSubject?.name
    };
    console.log('[handleAssignCompetencies] Saving to localStorage:', pendingData);
    localStorage.setItem('pendingCompetencyAssign', JSON.stringify(pendingData));

    const navigateTo = `/Topics?tab=curriculum&select=true&topic=${topicId}`;
    console.log('[handleAssignCompetencies] Navigating to:', navigateTo);
    onClose();
    navigate(navigateTo);
  };

  const handleAddNewLesson = () => {
    if (!effectiveSubject?.name) {
      toast.error('Fach nicht verfügbar');
      return;
    }
    setNewLessonSlot({
      subject: effectiveSubject.name,
      week_number: getCurrentWeek(),
      lesson_number: 1,
      school_year: new Date().getFullYear(),
      name: 'Neue Lektion',
      notes: '',
      is_double_lesson: false,
      is_exam: false,
      is_half_class: false,
      steps: [],
      topic_id: loadedTopic?.id || ''
    });
    setSelectedLesson(null);
    setIsLessonModalOpen(true);
  };

  const handleLessonClick = async (minimalLesson) => {
    try {
      const fullLesson = await pb.collection('yearly_lessons').getOne(minimalLesson.id, {
        expand: 'subject,topic_id'
      });
      setSelectedLesson(fullLesson);
    } catch (error) {
      console.error('Error fetching full lesson:', error);
      setSelectedLesson(minimalLesson);
    }
    setIsLessonModalOpen(true);
  };

  const handleSaveLesson = async (updatedLessonData) => {
    try {
      // Speichere in der Datenbank
      if (updatedLessonData.id && selectedLesson) {
        const updatePayload = {
          name: updatedLessonData.name,
          notes: updatedLessonData.notes || '',
          steps: updatedLessonData.steps || [],
          topic_id: updatedLessonData.topic_id === 'no_topic' ? null : updatedLessonData.topic_id,
          is_exam: updatedLessonData.is_exam || false,
          is_double_lesson: updatedLessonData.is_double_lesson || false,
          is_half_class: updatedLessonData.is_half_class || false,
          // Aus Original-Lektion übernehmen (erforderliche Felder):
          subject: selectedLesson.subject,
          class_id: selectedLesson.class_id,
          user_id: selectedLesson.user_id || pb.authStore.model?.id,
          week_number: selectedLesson.week_number,
          lesson_number: selectedLesson.lesson_number,
          school_year: selectedLesson.school_year,
        };
        await YearlyLesson.update(updatedLessonData.id, updatePayload);
        toast.success('Lektion gespeichert');
      }

      // Lokalen State aktualisieren
      setLessons(prev => {
        const exists = prev.some(l => l.id === updatedLessonData.id);
        if (exists) {
          return prev.map(l => l.id === updatedLessonData.id ? { ...l, ...updatedLessonData } : l);
        } else {
          return [...prev, updatedLessonData];
        }
      });

      // React Query Cache invalidieren
      queryClient.invalidateQueries({ queryKey: ['yearlyLessons'] });
      queryClient.invalidateQueries({ queryKey: ['allYearlyLessons'] });
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast.error('Fehler beim Speichern der Lektion');
      setIsLessonModalOpen(false);
    }
    // Modal wird NICHT hier geschlossen - das macht der onClose callback vom LessonModal
    // So funktioniert "Speichern & nächste" korrekt
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      toast.error('Bitte geben Sie einen Themennamen ein');
      return;
    }

    const payload = {
      id: topic?.id, // ← WICHTIG: ID mitschicken, wenn vorhanden!
      name: formData.name,
      subject: effectiveSubject?.id || '',  // Verwendet effectiveSubject
      class_id: effectiveSubject?.class_id,  // Verwendet effectiveSubject
      description: formData.description || '',
      color: formData.color || '#3b82f6',
      goals: formData.goals || '',
      department: formData.department || '',
      lehrplan_kompetenz_ids: selectedCompetencies,
      materials: allMaterials // ← neu
    };

    console.log('TopicModal sending payload:', payload);

    onSave(payload);

    // Emit tour event when topic is created/updated
    emitTourEvent(TOUR_EVENTS.TOPIC_CREATED, { topicId: payload.id || 'new' });

    localStorage.removeItem('draftTopic');
    onClose();
  };

  const handleDelete = async () => {
    if (!topic?.id) return;

    const confirm = window.confirm(
      "Möchten Sie dieses Thema wirklich löschen?\n\nAlle zugehörigen Jahreslektionen werden ebenfalls gelöscht!"
    );

    if (confirm) {
      // Nur onDelete aufrufen - die Eltern-Komponente (TopicsView)
      // führt die eigentliche Löschung durch
      onDelete(topic.id);
      onClose();
    }
  };

  // Handler für das Löschen einer Lektion aus dem LessonModal
  const handleDeleteLesson = async (lessonId) => {
    try {
      await YearlyLesson.delete(lessonId);
      toast.success('Lektion gelöscht');
      setIsLessonModalOpen(false);
      // React Query Cache invalidieren
      queryClient.invalidateQueries({ queryKey: ['yearlyLessons'] });
      queryClient.invalidateQueries({ queryKey: ['allYearlyLessons'] });
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast.error('Fehler beim Löschen der Lektion');
    }
  };

  // --- GROUPED LESSONS ---
  const lessonsByWeek = displayLessons.reduce((acc, l) => {
    const wk = Number(l.week_number) || getCurrentWeek();
    if (!acc[wk]) acc[wk] = [];
    acc[wk].push(l);
    return acc;
  }, {});
  const sortedWeekNumbers = Object.keys(lessonsByWeek).map(Number).sort((a, b) => a - b);

  // Nur zugewiesene Kompetenzen anzeigen (IDs in selectedCompetencies)
  const assignedCompetencies = useMemo(() => {
    return localCompetencies.filter(c => selectedCompetencies.includes(c.id));
  }, [localCompetencies, selectedCompetencies]);

  // Gruppierung der zugewiesenen Kompetenzen für Anzeige
  const filteredAndGroupedCompetencies = useMemo(() => {
    let filtered = assignedCompetencies;

    if (competencySearch.trim()) {
      const searchLower = competencySearch.toLowerCase();
      filtered = filtered.filter(c =>
        c.beschreibung?.toLowerCase().includes(searchLower) ||
        c.kompetenz_id?.toLowerCase().includes(searchLower) ||
        c.hauptbereich?.toLowerCase().includes(searchLower) ||
        c.unterbereich?.toLowerCase().includes(searchLower)
      );
    }

    if (competencyCycleFilter !== 'all') {
      filtered = filtered.filter(c => String(c.zyklus) === competencyCycleFilter);
    }

    const grouped = {};
    filtered.forEach(comp => {
      const key = `${comp.hauptbereich} - ${comp.unterbereich}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(comp);
    });

    return grouped;
  }, [assignedCompetencies, competencySearch, competencyCycleFilter]);


  // Gesamte Materialliste für Speichern & Anzeige
  const allMaterials = [...selectedCommon, ...customMaterials];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] md:max-w-3xl max-h-[90vh] w-full overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white p-4 md:p-6">
        <DialogHeader className="mb-2 md:mb-4">
          <DialogTitle className="flex items-center gap-3 text-lg md:text-xl">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md"
              style={{ backgroundColor: formData.color || subjectColor || '#3b82f6' }}
            >
              <Palette className="w-4 h-4 text-white" />
            </div>
            {topic ? "Thema bearbeiten" : "Neues Thema erstellen"}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-300 text-xs md:text-sm mt-1">
            {topic ? "Bearbeiten Sie die Details des bestehenden Themas." : "Erstellen Sie ein neues Thema für Ihr Fach."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-6 bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="general">Allgemein</TabsTrigger>
                <TabsTrigger value="content">Inhalt</TabsTrigger>
                <TabsTrigger value="competencies" className="relative">
                  Kompetenzen
                  {selectedCompetencies.length > 0 && (
                    <Badge className="ml-2 bg-blue-600 text-white text-xs px-1.5 py-0.5">
                      {selectedCompetencies.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="lessons">Lektionen</TabsTrigger>
                <TabsTrigger value="material">
                  <Package className="w-4 h-4 mr-2" />
                  Material
                  {allMaterials.length > 0 && (
                    <Badge className="ml-2 text-xs px-1.5 py-0.5">{allMaterials.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="media">Medien</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">Thema Titel</Label>
                    <Input
                      id="title"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="z.B. Quadratische Gleichungen"
                      required
                      className="topic-name-input bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-sm md:text-base py-2 md:py-3"
                    />
                  </div>
                  
                  {departments.length > 0 && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="department" className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">Fachbereich (optional)</Label>
                      <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                        <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-sm md:text-base py-2 md:py-3">
                          <SelectValue placeholder="Fachbereich wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newDepartmentName}
                          onChange={(e) => setNewDepartmentName(e.target.value)}
                          placeholder="Neuer Fachbereich..."
                          className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-sm md:text-base"
                        />
                        <Button type="button" onClick={handleAddNewDepartment} className="flex items-center gap-2 text-sm md:text-base px-4 py-2">
                          + Hinzufügen
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-xs md:text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Palette className="w-4 h-4" />
                    Farbe
                  </Label>
                  
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                          formData.color === color
                            ? 'border-slate-900 dark:border-white scale-110 shadow-md'
                            : 'border-slate-300 dark:border-slate-600 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({...formData, color})}
                      />
                    ))}
                    <input
                      type="color"
                      value={formData.color || "#3b82f6"}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-10 h-8 p-0 rounded-md border-2 border-slate-300 dark:border-slate-600 cursor-pointer bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goals" className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">Lernziele</Label>
                  <Textarea
                    id="goals"
                    value={formData.goals || ""}
                    onChange={(e) => setFormData({...formData, goals: e.target.value})}
                    placeholder="Lernziele für das Thema..."
                    className="h-24 md:h-32 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-sm md:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">Beschreibung</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Beschreiben Sie, was dieses Thema umfasst..."
                    className="h-24 md:h-32 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-sm md:text-base"
                  />
                </div>
                {/* ← Vorschau-Block komplett gelöscht */}
              </TabsContent>

              <TabsContent value="competencies" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Zugewiesene Lehrplan-Kompetenzen
                    </Label>
                    <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-500 dark:border-blue-600">
                      {selectedCompetencies.length} zugewiesen
                    </Badge>
                  </div>

                  {isLoadingCompetencies ? (
                    <div className="text-center py-12 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Lade Lehrplankompetenzen...</p>
                    </div>
                  ) : assignedCompetencies.length === 0 ? (
                    <div className="text-center py-12 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <GraduationCap className="w-12 h-12 mx-auto mb-3 text-slate-400 dark:text-slate-500" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Noch keine Lehrplankompetenzen zugewiesen.
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Fügen Sie Kompetenzen über die Lehrplanansicht hinzu.
                      </p>
                      {/* Button für Kompetenz-Zuweisung */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAssignCompetencies}
                        className="mt-4 border-green-600 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-800 dark:hover:text-green-200"
                      >
                        <GraduationCap className="w-4 h-4 mr-2" />
                        Kompetenzen zuweisen
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Filter nur anzeigen wenn Kompetenzen vorhanden */}
                      {assignedCompetencies.length > 3 && (
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              value={competencySearch}
                              onChange={(e) => setCompetencySearch(e.target.value)}
                              placeholder="Kompetenzen durchsuchen..."
                              className="pl-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm"
                            />
                          </div>
                          <Select value={competencyCycleFilter} onValueChange={setCompetencyCycleFilter}>
                            <SelectTrigger className="w-32 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-sm">
                              <SelectValue placeholder="Zyklus" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Alle Zyklen</SelectItem>
                              <SelectItem value="1">Zyklus 1</SelectItem>
                              <SelectItem value="2">Zyklus 2</SelectItem>
                              <SelectItem value="3">Zyklus 3</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="max-h-96 overflow-y-auto pr-2 space-y-3 border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/30">
                        {Object.keys(filteredAndGroupedCompetencies).length === 0 ? (
                          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Keine Kompetenzen gefunden</p>
                          </div>
                        ) : (
                          Object.entries(filteredAndGroupedCompetencies).map(([groupName, comps]) => (
                            <div key={groupName} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                              <div className="bg-slate-100 dark:bg-slate-800/80 p-3 border-b border-slate-200 dark:border-slate-700">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{groupName}</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                  {comps.length} Kompetenz(en)
                                </p>
                              </div>
                              <div className="p-2 space-y-1 bg-white dark:bg-slate-800/30">
                                {comps
                                  .sort((a, b) => {
                                    if (a.zyklus !== b.zyklus) return a.zyklus - b.zyklus;
                                    return (a.reihenfolge_index || '').localeCompare(b.reihenfolge_index || '');
                                  })
                                  .map(comp => (
                                    <div
                                      key={comp.id}
                                      className="flex items-start gap-3 p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-600/30"
                                    >
                                      <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                          <span className="text-xs font-mono text-blue-600 dark:text-blue-400">{comp.kompetenz_id}</span>
                                          <Badge className={`text-xs ${
                                            comp.zyklus === '1' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-600/30' :
                                            comp.zyklus === '2' ? 'bg-orange-900/30 text-orange-400 border-orange-600/30' :
                                            'bg-red-900/30 text-red-400 border-red-600/30'
                                          }`}>
                                            Zyklus {comp.zyklus}
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{comp.beschreibung}</p>
                                      </div>
                                      {/* Lösch-Button */}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedCompetencies(prev => prev.filter(id => id !== comp.id));
                                        }}
                                        className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/30 flex-shrink-0"
                                        title="Kompetenz entfernen"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-3">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Diese Kompetenzen sind diesem Thema zugewiesen. Der Status wird automatisch in der Lehrplanansicht aktualisiert.
                        </p>
                      </div>

                      {/* Button für Kompetenz-Zuweisung im Lehrplan */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAssignCompetencies}
                        className="w-full border-green-600 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-800 dark:hover:text-green-200"
                      >
                        <GraduationCap className="w-4 h-4 mr-2" />
                        Kompetenzen bearbeiten
                      </Button>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="lessons" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Zugewiesene Lektionen ({totalLessonCount})
                    </Label>
                  </div>

                  <div className="space-y-4 max-h-80 overflow-y-auto pr-2 border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50">
                    {sortedWeekNumbers.length === 0 && (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-400 dark:text-slate-500" />
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Noch keine Lektionen zugewiesen.
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Verwenden Sie die Jahresübersicht, um Lektionen diesem Thema zuzuweisen.
                        </p>
                      </div>
                    )}

                    {sortedWeekNumbers.map((week) => {
                      const weekLessons = lessonsByWeek[week]
                        .slice()
                        .sort((a, b) => (Number(a.lesson_number) || 0) - (Number(b.lesson_number) || 0));

                      // Pre-calculate which lessons are second parts of double lessons
                      const secondLessonIds = new Set(
                        weekLessons
                          .filter(l => l.is_double_lesson && l.second_yearly_lesson_id)
                          .map(l => l.second_yearly_lesson_id)
                      );

                      return (
                        <div key={week} className="space-y-2">
                          <div className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 sticky top-0 bg-white dark:bg-slate-800 py-1">
                            Woche {week}
                          </div>
                          <div className="flex items-center gap-2 overflow-x-auto pb-2">
                            {weekLessons
                              .filter(lesson => !secondLessonIds.has(lesson.id))
                              .map((lesson, index) => {
                                // Check if this is a double lesson (either unified or linked)
                                const isDouble = lesson.is_double_lesson;

                                return (
                                  <LessonCard
                                    key={lesson.id || `lesson-${week}-${lesson.lesson_number}-${index}`}
                                    lesson={lesson}
                                    onClick={() => handleLessonClick(lesson)}
                                    color={formData.color}
                                    isDouble={isDouble}
                                  />
                                );
                              })
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAssignLessons}
                    className="bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm md:text-base px-4 py-2 flex-1"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Lektionen in Jahresübersicht zuweisen
                  </Button>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Tipp: Lektionen können direkt in der Jahresübersicht diesem Thema zugewiesen werden, indem Sie das Thema aktivieren und auf die gewünschten Zeitslots klicken.
                  </p>
                </div>
              </TabsContent>

              {/* ─── NEUER MATERIAL-TAB ─── */}
              <TabsContent value="material" className="space-y-6">
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Package className="w-5 h-5" />
                    Materialpool für dieses Thema
                  </Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                    Diese Materialien erscheinen in allen Lektionen dieses Themas als vorausgewählte Optionen beim Anlegen eines Arbeitsschritts.
                  </p>

                  <div className="mt-6">
                    <h4 className="font-medium mb-3 text-slate-900 dark:text-white">Häufige Materialien</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {COMMON_MATERIALS.map((mat) => (
                        <div key={mat} className="flex items-center space-x-2">
                          <Checkbox
                            id={`common-${mat}`}
                            checked={selectedCommon.includes(mat)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCommon(prev => [...prev, mat]);
                              } else {
                                setSelectedCommon(prev => prev.filter(m => m !== mat));
                              }
                            }}
                          />
                          <label htmlFor={`common-${mat}`} className="text-sm">
                            {mat}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8">
                    <h4 className="font-medium mb-3 text-slate-900 dark:text-white">Eigene Materialien</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {customMaterials.map((mat, i) => (
                        <Badge key={i} variant="secondary" className="pl-3 pr-2 py-1 flex items-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white">
                          {mat}
                          <X
                            className="w-3 h-3 cursor-pointer hover:text-red-400"
                            onClick={() => setCustomMaterials(prev => prev.filter((_, idx) => idx !== i))}
                          />
                        </Badge>
                      ))}
                      {customMaterials.length === 0 && (
                        <p className="text-sm text-slate-500">Noch keine eigenen Materialien</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={newMaterialName}
                        onChange={e => setNewMaterialName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addCustom()}
                        placeholder="z.B. Lego Steine, Whiteboard-Marker..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          const trimmed = newMaterialName.trim();
                          if (trimmed && !allMaterials.includes(trimmed)) {
                            setCustomMaterials(prev => [...prev, trimmed]);
                            setNewMaterialName("");
                          } else if (allMaterials.includes(trimmed)) {
                            toast.info("Dieses Material existiert bereits");
                          }
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Hinzufügen
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="image" className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">Titelbild hinzuführen</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-sm md:text-base"
                    />
                    <Button type="button" variant="outline" className="flex items-center gap-2 text-sm md:text-base">
                      <Image className="w-4 h-4" /> Hochladen
                    </Button>
                  </div>
                  {imageFile && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Ausgewählt: <span className="font-medium">{imageFile.name}</span>
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>

          <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-6 md:pt-8 mt-6 md:mt-8 border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center gap-4">
              <div className="flex gap-2">
                {topic && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsShareDialogOpen(true)}
                      className="flex items-center gap-2 text-sm md:text-base px-4 py-2 border-blue-600 text-blue-400 hover:bg-blue-900/30"
                    >
                      <Share2 className="w-4 h-4" />
                      Teilen
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      className="flex items-center gap-2 text-sm md:text-base px-4 py-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Löschen
                    </Button>
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm md:text-base px-4 py-2"
                >
                  <X className="w-4 h-4 mr-2" />
                  Abbrechen
                </Button>
                <Button 
                  type="submit"
                  className="text-white shadow-md text-sm md:text-base px-4 py-2"
                  style={{ backgroundColor: formData.color || subjectColor || '#3b82f6' }}
                  disabled={!formData.name?.trim()}
                >
                  <SaveIcon className="w-4 h-4 mr-2" />
                  {topic ? "Aktualisieren" : "Erstellen"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
      {isLessonModalOpen && (
        <LessonModal
          isOpen={isLessonModalOpen}
          onClose={() => setIsLessonModalOpen(false)}
          onSave={handleSaveLesson}
          onDelete={handleDeleteLesson}
          lesson={selectedLesson}
          topics={fetchedTopics}
          allYearlyLessons={allYearlyLessons}
          currentWeek={selectedLesson?.week_number || newLessonSlot?.week_number || getCurrentWeek()}
          currentYear={new Date().getFullYear()}
          subjectColor={subjectColor}
          newLessonSlot={newLessonSlot}
          autoAssignTopicId={loadedTopic?.id}
          onOpenChange={() => console.log('LessonModal opened from TopicModal with autoAssignTopicId =', loadedTopic?.id)}
          onSaveAndNext={async (nextLessonNumber) => {
            const currentWeek = selectedLesson?.week_number || newLessonSlot?.week_number || getCurrentWeek();
            const currentSubjectId = selectedLesson?.subject || effectiveSubject?.id;

            if (!currentWeek || !currentSubjectId) {
              console.warn('Keine gültige Woche oder Fach-ID für nächste Lektion');
              return;
            }

            // Finde die nächste Lektion in derselben Woche
            const nextLesson = allYearlyLessons.find(
              l =>
                l.week_number === currentWeek &&
                l.subject === currentSubjectId &&
                Number(l.lesson_number) === nextLessonNumber
            );

            if (nextLesson) {
              // Lade die vollständige Lektion
              try {
                const fullLesson = await pb.collection('yearly_lessons').getOne(nextLesson.id, {
                  expand: 'topic'
                });
                setSelectedLesson(fullLesson);
                setNewLessonSlot(null);
              } catch (error) {
                console.error('Fehler beim Laden der nächsten Lektion:', error);
                setSelectedLesson(nextLesson);
                setNewLessonSlot(null);
              }
              return;
            }

            // Prüfe, ob in der aktuellen Woche noch Platz ist
            const subjectLessonsInWeek = allYearlyLessons.filter(
              l => l.week_number === currentWeek && l.subject === currentSubjectId
            );
            const maxLessonNumber = subjectLessonsInWeek.length > 0
              ? Math.max(...subjectLessonsInWeek.map(l => Number(l.lesson_number)))
              : 0;

            let targetWeek = currentWeek;
            let targetLessonNumber = nextLessonNumber;

            if (nextLessonNumber > maxLessonNumber + 1) {
              // Keine weitere Lektion in dieser Woche → nächste Woche
              targetWeek = currentWeek + 1;
              if (targetWeek > 52) {
                console.warn('Keine weitere Woche verfügbar');
                setIsLessonModalOpen(false);
                return;
              }
              targetLessonNumber = 1;
            }

            // Erstelle neue Lektion
            try {
              const newLessonData = {
                subject: currentSubjectId,
                week_number: targetWeek,
                lesson_number: targetLessonNumber,
                school_year: new Date().getFullYear(),
                class_id: selectedLesson?.class_id || null,
                name: `Lektion ${targetLessonNumber}`,
                description: '',
                user_id: pb.authStore.model.id,
                topic_id: loadedTopic?.id || null,
                steps: [],
                notes: '',
                is_double_lesson: false,
                is_exam: false,
                is_half_class: false,
                second_yearly_lesson_id: null,
                allerlei_subjects: []
              };

              const createdLesson = await YearlyLesson.create(newLessonData);
              queryClient.invalidateQueries({ queryKey: ['allYearlyLessons'] });
              setSelectedLesson(createdLesson);
              setNewLessonSlot(null);
            } catch (error) {
              console.error('Fehler beim Erstellen der nächsten Lektion:', error);
              toast.error('Fehler beim Erstellen der nächsten Lektion');
            }
          }}
        />
      )}
      <ShareTopicDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        topic={loadedTopic || topic}
        yearlyLessons={allYearlyLessons}
      />
    </Dialog>
  );
}