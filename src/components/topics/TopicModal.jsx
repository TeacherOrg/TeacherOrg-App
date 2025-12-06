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
import { X, Trash2, Palette, Package, Image, BookOpen, Save as SaveIcon, GraduationCap, Search, Plus } from "lucide-react";
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
import { getLehrplanData } from '@/components/curriculum/lehrplanData';
import { deleteTopicWithLessons } from '@/api/topicService';

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

const LessonCard = ({ lesson, onClick, color }) => (
  <div
    className="w-20 h-20 rounded-lg text-white flex items-center justify-center cursor-pointer hover:opacity-90 flex-shrink-0 text-sm font-medium shadow-md relative transition-all duration-200 hover:scale-105"
    style={{ backgroundColor: color || '#3b82f6' }}
    onClick={onClick}
  >
    {lesson.is_half_class && (
      <div className="absolute top-1 right-1 bg-black/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
        1/2
      </div>
    )}
    <div className="text-center">
      <div className="text-xs opacity-80">L{lesson.lesson_number}</div>
      <div className="text-[10px] opacity-70">W{lesson.week_number}</div>
    </div>
  </div>
);

export default function TopicModal({ isOpen, onClose, onSave, onDelete, topic, subjectColor, subject, topics = [], curriculumCompetencies = [] }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    goals: "",
    department: "",
    estimated_lessons: 0,
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
    }
  };

  // --- QUERIES ---
  const { data: fetchedTopics = [], error: topicsError } = useQuery({
    queryKey: ['topics', subject?.id, pb.authStore.model?.id],
    queryFn: async () => {
      console.log('TopicModal: Fetching topics for subject =', subject?.id);
      try {
        const topicsData = await Topic.list({ subject: subject?.id, 'class_id.user_id': pb.authStore.model?.id });
        console.log('TopicModal: Fetched topics =', topicsData);
        return topicsData;
      } catch (error) {
        console.error('TopicModal: Error fetching topics:', error);
        return [];
      }
    },
    enabled: isOpen && !!subject?.id && !!pb.authStore.model?.id,
    placeholderData: [],
  });

  const { data: departmentsData = [], error: departmentsError } = useQuery({
    queryKey: ['fachbereiche', subject?.id],
    queryFn: async () => {
      try {
        // Verwende subject_id (ID) statt subject_name (String)
        return await Fachbereich.list({ subject_id: subject?.id });
      } catch (error) {
        console.error('Failed to fetch fachbereiche:', error);
        return [];
      }
    },
    enabled: isOpen && !!subject?.id,  // Ändere zu id
    placeholderData: [],
  });

  useEffect(() => {
    setDepartments(departmentsData);
  }, [departmentsData]);

  const { data: allYearlyLessons = [], error: yearlyLessonsError } = useQuery({
    queryKey: ['yearlyLessons', subject?.name, pb.authStore.model?.id],
    queryFn: async () => {
      try {
        const filter = { user_id: pb.authStore.model?.id };
        if (subject?.class_id) {
          filter.class_id = subject.class_id;
        }
        return await YearlyLesson.list(filter);
      } catch (error) {
        console.error('Failed to fetch yearly lessons:', error);
        return [];
      }
    },
    enabled: isOpen && !!subject?.name && !!pb.authStore.model?.id,
    placeholderData: [],
  });

  // --- LOAD COMPETENCIES ---
  useEffect(() => {
    if (!isOpen) {
      setLocalCompetencies([]);
      return;
    }

    // Wenn nicht Deutsch → immer leer
    if (subject?.name !== 'Deutsch') {
      setLocalCompetencies([]);
      return;
    }

    // Wenn schon geladen → nichts tun
    if (localCompetencies.length > 0) return;

    // Nur einmal laden
    const loadDeutschCompetencies = async () => {
      setIsLoadingCompetencies(true);
      try {
        let allCompetencies = await CurriculumCompetency.list();
        let deutschCompetencies = allCompetencies.filter(c => c.fach_name === 'Deutsch' || c.subject_name === 'Deutsch');

        if (deutschCompetencies.length === 0) {
          const lehrplan21Data = getLehrplanData();
          await CurriculumCompetency.bulkCreate(lehrplan21Data);
          allCompetencies = await CurriculumCompetency.list();
          deutschCompetencies = allCompetencies.filter(c => c.subject_name === 'Deutsch');
          toast.success('Lehrplan 21 wurde initialisiert!');
        }

        setLocalCompetencies(deutschCompetencies);
      } catch (error) {
        console.error('Error loading competencies:', error);
        toast.error('Fehler beim Laden der Kompetenzen');
        setLocalCompetencies([]);
      } finally {
        setIsLoadingCompetencies(false);
      }
    };

    loadDeutschCompetencies();
  }, [isOpen, subject?.name]);

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
          estimated_lessons: topic.estimated_lessons || 0,
          lehrplan_kompetenz_ids: topic.lehrplan_kompetenz_ids || []
        });
        setSelectedCompetencies(topic.lehrplan_kompetenz_ids || []);
        loadTopicLessons();
      } else {
        setFormData({
          name: "",
          description: "",
          color: subjectColor || "#3b82f6",
          goals: "",
          department: "",
          estimated_lessons: 0,
          lehrplan_kompetenz_ids: []
        });
        setSelectedCompetencies([]);
        setLessons([]);
      }
      
      if (subject) {
        loadDepartments();
      }
      
      setCompetencySearch('');
      setCompetencyCycleFilter('all');

      // NEU: immer neu laden wenn zurückgekehrt (z. B. aus Assign-Modus)
      if (topic?.id || loadedTopic?.id) {
        loadTopicLessons();
      }
    }
  }, [isOpen, topic, loadedTopic?.id, subjectColor, subject]);

  const loadTopicLessons = async () => {
    if (!topic?.id) return;
    
    try {
      const filter = {};
      if (subject?.class_id) {
        filter.class_id = subject.class_id;
      }
      const allLessons = await YearlyLesson.list(filter);
      const topicLessons = allLessons
        .filter(l => l.topic_id === topic.id)
        .map(item => ({
          id: item.id,
          name: item.notes || `Lektion ${item.lesson_number}`,
          week_number: item.week_number,
          lesson_number: Number(item.lesson_number),
          is_half_class: item.is_half_class || false
        }))
        .sort((a, b) => {
          if (a.week_number !== b.week_number) return a.week_number - b.week_number;
          return a.lesson_number - b.lesson_number;
        });
      
      setLessons(topicLessons);
    } catch (error) {
      console.error('Error loading topic lessons:', error);
      setLessons([]);
    }
  };

  const loadDepartments = async () => {
    try {
      const subjectDepartments = await Fachbereich.list({ subject_id: subject?.id });
      setDepartments(subjectDepartments);
    } catch (error) {
      console.error('Error loading departments:', error);
      setDepartments([]);
    }
  };

  // --- HANDLERS ---
  const handleAddNewDepartment = async () => {
    if (newDepartmentName.trim() && subject?.id) {  // Prüfe auf id statt name
      try {
        const newDept = await Fachbereich.create({ 
          name: newDepartmentName, 
          subject_id: subject.id  // ID statt Name
        });
        setDepartments([...departments, newDept]);
        setFormData({ ...formData, department: newDept.name });
        setNewDepartmentName('');
        toast.success('Fachbereich erstellt');
      } catch (error) {
        console.error('Error creating new department:', error);
        toast.error('Fehler beim Erstellen des Fachbereichs');
      }
    }
  };
  const handleAssignLessons = async () => {
    console.log('AssignLessons: subject=', subject);
    if (!subject?.name) {
      console.error('Cannot assign lessons: Missing subject data', { name: subject?.name });
      toast.error('Fach nicht verfügbar');
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
          subject: subject.id,  // Geändert: Verwende ID statt Name
          class_id: subject.class_id,  // Hinzugefügt: Erforderliches Feld
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
      subjectName: subject.name,
      topicId: draftTopicId
    }));

    navigate(`/yearlyoverview?subject=${encodeURIComponent(subject.name)}&mode=assign&topic=${draftTopicId}`);
  };

  const handleAddNewLesson = () => {
    if (!subject?.name) {
      toast.error('Fach nicht verfügbar');
      return;
    }
    setNewLessonSlot({
      subject: subject.name,
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

  const handleSaveLesson = (updatedLessonData) => {
    setLessons(prev => {
      const exists = prev.some(l => l.id === updatedLessonData.id);
      if (exists) {
        return prev.map(l => l.id === updatedLessonData.id ? { ...l, ...updatedLessonData } : l);
      } else {
        return [...prev, updatedLessonData];
      }
    });
    setIsLessonModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error('Bitte geben Sie einen Themennamen ein');
      return;
    }

    const payload = {
      name: formData.name,
      subject: subject?.id || '',  // Geändert: Verwende ID statt Name
      class_id: subject?.class_id,  // Hinzugefügt: Erforderliches Feld
      description: formData.description || '',
      color: formData.color || '#3b82f6',
      goals: formData.goals || '',
      department: formData.department || '',
      estimated_lessons: formData.estimated_lessons || 0,
      lehrplan_kompetenz_ids: selectedCompetencies,
      materials: allMaterials // ← neu
    };

    try {
      let savedTopic;
      if (topic?.id) {
        savedTopic = await Topic.update(topic.id, payload);
        toast.success('Thema aktualisiert');
      } else {
        savedTopic = await Topic.create(payload);
        toast.success('Thema erstellt');
      }
      
      onSave({ ...payload, id: savedTopic.id });
      localStorage.removeItem('draftTopic');
      onClose();
    } catch (error) {
      console.error('Error saving topic:', error);
      toast.error('Fehler beim Speichern des Themas');
    }
  };

  const handleDelete = async () => {
    if (!topic?.id) return;

    const confirm = window.confirm(
      "Möchten Sie dieses Thema wirklich löschen?\n\nAlle zugehörigen Jahreslektionen werden ebenfalls gelöscht!"
    );

    if (confirm) {
      try {
        await deleteTopicWithLessons(topic.id);
        onDelete(topic.id);   // damit die Eltern-Komponente auch updatet
        onClose();
      } catch (err) {
        // toast schon im Service
      }
    }
  };

  // --- GROUPED LESSONS ---
  const lessonsByWeek = lessons.reduce((acc, l) => {
    const wk = Number(l.week_number) || getCurrentWeek();
    if (!acc[wk]) acc[wk] = [];
    acc[wk].push(l);
    return acc;
  }, {});
  const sortedWeekNumbers = Object.keys(lessonsByWeek).map(Number).sort((a, b) => a - b);

  const toggleCompetency = (competencyId) => {
    setSelectedCompetencies(prev => {
      if (prev.includes(competencyId)) {
        return prev.filter(id => id !== competencyId);
      } else {
        return [...prev, competencyId];
      }
    });
  };

  const filteredAndGroupedCompetencies = useMemo(() => {
    let filtered = localCompetencies;

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
  }, [localCompetencies, competencySearch, competencyCycleFilter]);

  const handleNavigateToCurriculum = () => {
    navigate('/topics?tab=curriculum&select=true');
  };

  // Gesamte Materialliste für Speichern & Anzeige
  const allMaterials = [...selectedCommon, ...customMaterials];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] md:max-w-3xl max-h-[90vh] w-full overflow-y-auto bg-slate-900 border-slate-700 text-white p-4 md:p-6">
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
          <DialogDescription className="text-slate-300 text-xs md:text-sm mt-1">
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
              <TabsList className="grid w-full grid-cols-6 bg-slate-800">
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
                    <Label htmlFor="title" className="text-xs md:text-sm font-semibold text-slate-300">Thema Titel</Label>
                    <Input
                      id="title"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="z.B. Quadratische Gleichungen"
                      required
                      className="bg-slate-800 border-slate-600 text-sm md:text-base py-2 md:py-3"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="estimated_lessons" className="text-xs md:text-sm font-semibold text-slate-300">Geschätzte Lektionen</Label>
                    <Input
                      id="estimated_lessons"
                      type="number"
                      min="0"
                      value={formData.estimated_lessons || ""}
                      onChange={(e) => setFormData({...formData, estimated_lessons: parseInt(e.target.value) || 0})}
                      placeholder="z.B. 10"
                      className="bg-slate-800 border-slate-600 text-sm md:text-base py-2 md:py-3"
                    />
                  </div>

                  {departments.length > 0 && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="department" className="text-xs md:text-sm font-semibold text-slate-300">Fachbereich (optional)</Label>
                      <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-sm md:text-base py-2 md:py-3">
                          <SelectValue placeholder="Fachbereich wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newDepartmentName}
                          onChange={(e) => setNewDepartmentName(e.target.value)}
                          placeholder="Neuer Fachbereich..."
                          className="bg-slate-800 border-slate-600 text-sm md:text-base"
                        />
                        <Button type="button" onClick={handleAddNewDepartment} className="flex items-center gap-2 text-sm md:text-base px-4 py-2">
                          + Hinzufügen
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-xs md:text-sm font-semibold flex items-center gap-2 text-slate-300">
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
                            ? 'border-white scale-110 shadow-md' 
                            : 'border-slate-600 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({...formData, color})}
                      />
                    ))}
                    <input
                      type="color"
                      value={formData.color || "#3b82f6"}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-10 h-8 p-0 rounded-md border-2 border-slate-600 cursor-pointer bg-slate-800"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goals" className="text-xs md:text-sm font-semibold text-slate-300">Lernziele</Label>
                  <Textarea
                    id="goals"
                    value={formData.goals || ""}
                    onChange={(e) => setFormData({...formData, goals: e.target.value})}
                    placeholder="Lernziele für das Thema..."
                    className="h-24 md:h-32 bg-slate-800 border-slate-600 text-sm md:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs md:text-sm font-semibold text-slate-300">Beschreibung</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Beschreiben Sie, was dieses Thema umfasst..."
                    className="h-24 md:h-32 bg-slate-800 border-slate-600 text-sm md:text-base"
                  />
                </div>
                {/* ← Vorschau-Block komplett gelöscht */}
              </TabsContent>

              <TabsContent value="competencies" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs md:text-sm font-semibold text-slate-300">
                      Lehrplan 21 Kompetenzen
                    </Label>
                    <Badge variant="outline" className="text-blue-400 border-blue-600">
                      {selectedCompetencies.length} ausgewählt
                    </Badge>
                  </div>
                  
                  {isLoadingCompetencies ? (
                    <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
                      <p className="text-sm text-slate-400">Lade Lehrplankompetenzen...</p>
                    </div>
                  ) : localCompetencies.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
                      <GraduationCap className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                      <p className="text-sm text-slate-400">
                        Noch keine Lehrplankompetenzen verfügbar.
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {subject?.name === 'Deutsch' 
                          ? 'Lehrplankompetenzen werden beim nächsten Öffnen geladen.'
                          : 'Derzeit sind nur Kompetenzen für das Fach "Deutsch" verfügbar.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            value={competencySearch}
                            onChange={(e) => setCompetencySearch(e.target.value)}
                            placeholder="Kompetenzen durchsuchen..."
                            className="pl-10 bg-slate-800 border-slate-600 text-white text-sm"
                          />
                        </div>
                        <Select value={competencyCycleFilter} onValueChange={setCompetencyCycleFilter}>
                          <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-sm">
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

                      <div className="max-h-96 overflow-y-auto pr-2 space-y-3 border border-slate-700 rounded-lg p-3 bg-slate-800/30">
                        {Object.keys(filteredAndGroupedCompetencies).length === 0 ? (
                          <div className="text-center py-8 text-slate-400">
                            <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Keine Kompetenzen gefunden</p>
                          </div>
                        ) : (
                          Object.entries(filteredAndGroupedCompetencies).map(([groupName, comps]) => (
                            <div key={groupName} className="border border-slate-700 rounded-lg overflow-hidden">
                              <div className="bg-slate-800/80 p-3 border-b border-slate-700">
                                <h4 className="text-sm font-semibold text-white">{groupName}</h4>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {comps.filter(c => selectedCompetencies.includes(c.id)).length} / {comps.length} ausgewählt
                                </p>
                              </div>
                              <div className="p-2 space-y-1 bg-slate-800/30">
                                {comps
                                  .sort((a, b) => {
                                    if (a.zyklus !== b.zyklus) return a.zyklus - b.zyklus;
                                    return (a.reihenfolge_index || '').localeCompare(b.reihenfolge_index || '');
                                  })
                                  .map(comp => (
                                    <div
                                      key={comp.id}
                                      className={`flex items-start gap-3 p-2.5 rounded-lg transition-all cursor-pointer ${
                                        selectedCompetencies.includes(comp.id)
                                          ? 'bg-blue-900/30 border border-blue-600/50'
                                          : 'hover:bg-slate-700/50'
                                      }`}
                                      onClick={() => toggleCompetency(comp.id)}
                                    >
                                      <Checkbox
                                        checked={selectedCompetencies.includes(comp.id)}
                                        onCheckedChange={() => toggleCompetency(comp.id)}
                                        className="mt-1"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                          <span className="text-xs font-mono text-blue-400">{comp.kompetenz_id}</span>
                                          <Badge className={`text-xs ${
                                            comp.zyklus === '1' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-600/30' :
                                            comp.zyklus === '2' ? 'bg-orange-900/30 text-orange-400 border-orange-600/30' :
                                            'bg-red-900/30 text-red-400 border-red-600/30'
                                          }`}>
                                            Zyklus {comp.zyklus}
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed">{comp.beschreibung}</p>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                        <p className="text-xs text-blue-300">
                          Tipp: Wählen Sie die Lehrplankompetenzen aus, die Sie mit diesem Thema abdecken möchten. 
                          Der Status wird automatisch in der Lehrplanansicht aktualisiert.
                        </p>
                      </div>
                    </>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleNavigateToCurriculum}
                    className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-sm md:text-base px-4 py-2 flex-1"
                  >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Lehrplan Kompetenzen hinzufügen
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="lessons" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs md:text-sm font-semibold text-slate-300">
                      Zugewiesene Lektionen ({lessons.length})
                    </Label>
                    {formData.estimated_lessons > 0 && (
                      <span className="text-xs text-slate-400">
                        {lessons.length} / {formData.estimated_lessons} zugewiesen
                      </span>
                    )}
                  </div>

                  <div className="space-y-4 max-h-80 overflow-y-auto pr-2 border border-slate-700 rounded-lg p-3 bg-slate-800/50">
                    {sortedWeekNumbers.length === 0 && (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                        <p className="text-xs text-slate-400">
                          Noch keine Lektionen zugewiesen.
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Verwenden Sie die Jahresübersicht, um Lektionen diesem Thema zuzuweisen.
                        </p>
                      </div>
                    )}

                    {sortedWeekNumbers.map((week) => (
                      <div key={week} className="space-y-2">
                        <div className="text-xs md:text-sm font-semibold text-slate-300 sticky top-0 bg-slate-800 py-1">
                          Woche {week}
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                          {lessonsByWeek[week]
                            .slice()
                            .sort((a, b) => (Number(a.lesson_number) || 0) - (Number(b.lesson_number) || 0))
                            .map((lesson) => (
                              <LessonCard 
                                key={lesson.id} 
                                lesson={lesson} 
                                onClick={() => handleLessonClick(lesson)}
                                color={formData.color} 
                              />
                            ))
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAssignLessons}
                    className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-sm md:text-base px-4 py-2 flex-1"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Lektionen in Jahresübersicht zuweisen
                  </Button>
                </div>

                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                  <p className="text-xs text-blue-300">
                    Tipp: Lektionen können direkt in der Jahresübersicht diesem Thema zugewiesen werden, indem Sie das Thema aktivieren und auf die gewünschten Zeitslots klicken.
                  </p>
                </div>
              </TabsContent>

              {/* ─── NEUER MATERIAL-TAB ─── */}
              <TabsContent value="material" className="space-y-6">
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Materialpool für dieses Thema
                  </Label>
                  <p className="text-sm text-slate-400 mt-2">
                    Diese Materialien erscheinen in allen Lektionen dieses Themas als vorausgewählte Optionen beim Anlegen eines Arbeitsschritts.
                  </p>

                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Häufige Materialien</h4>
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
                    <h4 className="font-medium mb-3">Eigene Materialien</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {customMaterials.map((mat, i) => (
                        <Badge key={i} variant="secondary" className="pl-3 pr-2 py-1 flex items-center gap-2">
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
                  <Label htmlFor="image" className="text-xs md:text-sm font-semibold text-slate-300">Titelbild hinzuführen</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="bg-slate-800 border-slate-600 text-sm md:text-base"
                    />
                    <Button type="button" variant="outline" className="flex items-center gap-2 text-sm md:text-base">
                      <Image className="w-4 h-4" /> Hochladen
                    </Button>
                  </div>
                  {imageFile && (
                    <p className="text-xs text-slate-400">
                      Ausgewählt: <span className="font-medium">{imageFile.name}</span>
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>

          <div className="sticky bottom-0 bg-slate-900 pt-6 md:pt-8 mt-6 md:mt-8 border-t border-slate-700">
            <div className="flex justify-between items-center gap-4">
              <div>
                {topic && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleDelete}
                    className="flex items-center gap-2 text-sm md:text-base px-4 py-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Löschen
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-sm md:text-base px-4 py-2"
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
          lesson={selectedLesson}
          topics={fetchedTopics}
          allYearlyLessons={allYearlyLessons}
          currentWeek={selectedLesson?.week_number || newLessonSlot?.week_number || getCurrentWeek()}
          currentYear={new Date().getFullYear()}
          subjectColor={subjectColor}
          newLessonSlot={newLessonSlot}
          autoAssignTopicId={loadedTopic?.id}
          onOpenChange={() => console.log('LessonModal opened from TopicModal with autoAssignTopicId =', loadedTopic?.id)}
        />
      )}
    </Dialog>
  );
}