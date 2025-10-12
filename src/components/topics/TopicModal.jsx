import React, { useState, useEffect } from "react";
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
import { X, Trash2, Palette, Plus, Image, BookOpen, Save as SaveIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { SketchPicker } from 'react-color';
import LessonModal from "@/components/yearly/LessonModal";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Fachbereich, Topic, YearlyLesson } from '@/api/entities';
import pb from '@/api/pb';
import { useNavigate } from 'react-router-dom';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981',
  '#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#64748b'
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
    className="w-20 h-20 rounded-lg text-white flex items-center justify-center cursor-pointer hover:opacity-90 flex-shrink-0 text-sm"
    style={{ backgroundColor: color || '#3b82f6' }}
    onClick={onClick}
  >
    {lesson.name}
  </div>
);

export default function TopicModal({ isOpen, onClose, onSave, onDelete, topic, subjectColor, subject, topics = [] }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    goals: "",
    department: "",
  });
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loadedTopic, setLoadedTopic] = useState(topic);
  const [newLessonSlot, setNewLessonSlot] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: fetchedTopics = [], error: topicsError } = useQuery({
    queryKey: ['topics', subject?.id],
    queryFn: async () => {
      console.log('TopicModal: Fetching topics for subjectId =', subject?.id);
      try {
        const topicsData = await Topic.list({ subject: subject?.id });
        console.log('TopicModal: Fetched topics =', topicsData);
        return topicsData;
      } catch (error) {
        console.error('TopicModal: Error fetching topics:', error);
        return [];
      }
    },
    enabled: isOpen && !!subject?.id,
    placeholderData: [],
  });

  const { data: departments = [], error: departmentsError } = useQuery({
    queryKey: ['fachbereiche', subject?.id],
    queryFn: async () => {
      try {
        return await Fachbereich.list({ subject_id: subject?.id });
      } catch (error) {
        console.error('Failed to fetch fachbereiche:', error);
        return [];
      }
    },
    enabled: isOpen && !!subject?.id,
    placeholderData: [],
  });

  const { data: allYearlyLessons = [], error: yearlyLessonsError } = useQuery({
    queryKey: ['yearlyLessons', subject?.id, pb.authStore.model?.id],
    queryFn: async () => {
      try {
        return await YearlyLesson.list({
          user_id: pb.authStore.model?.id,
          class_id: subject?.class_id,
        });
      } catch (error) {
        console.error('Failed to fetch yearly lessons:', error);
        return [];
      }
    },
    enabled: isOpen && !!subject?.id && !!pb.authStore.model?.id,
    placeholderData: [],
  });

  useEffect(() => {
    if (isOpen) {
      if (!topic) {
        const draft = JSON.parse(localStorage.getItem('draftTopic')) || {};
        if (draft.topicId) {
          const fetchDraft = async () => {
            try {
              const fetchedTopic = await Topic.findById(draft.topicId);
              if (fetchedTopic) {
                setLoadedTopic(fetchedTopic);
                setFormData({
                  name: fetchedTopic.name || "",
                  description: fetchedTopic.description || "",
                  color: fetchedTopic.color || subjectColor || "#3b82f6",
                  goals: fetchedTopic.goals || "",
                  department: fetchedTopic.department || "",
                });
                const assigned = await pb.collection('yearly_lessons').getList(1, 50, {
                  filter: `topic_id = '${fetchedTopic.id}'`,
                  expand: 'subject'
                });
                setLessons(assigned.items
                  .map(item => ({
                    id: item.id,
                    name: item.name || `Lektion ${item.lesson_number}`,
                    week_number: item.week_number,
                    lesson_number: Number(item.lesson_number)
                  }))
                  .sort((a, b) => {
                    if (a.week_number !== b.week_number) return a.week_number - b.week_number;
                    return a.lesson_number - b.lesson_number;
                  })
                );
                localStorage.removeItem('draftTopic');
              }
            } catch (error) {
              console.error('Error fetching draft topic:', error);
            }
          };
          fetchDraft();
        } else {
          setLoadedTopic(null);
          setFormData({
            name: draft.name || "",
            description: draft.description || "",
            color: draft.color || subjectColor || "#3b82f6",
            goals: draft.goals || "",
            department: draft.department || "",
          });
          setLessons([]);
        }
      } else {
        setLoadedTopic(topic);
        setFormData({
          name: topic.name || "",
          description: topic.description || "",
          color: topic.color || subjectColor || "#3b82f6",
          goals: topic.goals || "",
          department: topic.department || "",
        });
        const fetchAssigned = async () => {
          try {
            const assigned = await pb.collection('yearly_lessons').getList(1, 50, {
              filter: `topic_id = '${topic.id}'`,
              expand: 'subject'
            });
            setLessons(assigned.items
              .map(item => ({
                id: item.id,
                name: item.name || `Lektion ${item.lesson_number}`,
                week_number: item.week_number,
                lesson_number: Number(item.lesson_number)
              }))
              .sort((a, b) => {
                if (a.week_number !== b.week_number) return a.week_number - b.week_number;
                return a.lesson_number - b.lesson_number;
              })
            );
          } catch (error) {
            console.error('Error fetching assigned lessons:', error);
            setLessons([]);
          }
        };
        fetchAssigned();
      }
    }
  }, [isOpen, topic, subjectColor, subject]);

  const handleAddNewDepartment = async () => {
    if (newDepartmentName.trim() && subject?.id) {
      try {
        const newDept = await Fachbereich.create({ name: newDepartmentName, subject_id: subject.id });
        setFormData({ ...formData, department: newDept.id });
        setNewDepartmentName('');
      } catch (error) {
        console.error('Error creating new department:', error);
        alert('Fehler beim Erstellen des Fachbereichs. Bitte versuchen Sie es erneut.');
      }
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleShare = () => {
    alert('Teilen-Funktion kommend: Dies wird später implementiert, um das Thema mit anderen Lehrpersonen zu teilen.');
  };

  const handleAssignLessons = async () => {
    console.log('AssignLessons: subject=', subject);
    if (!subject?.id || !subject?.name || !subject?.class_id) {
      console.error('Cannot assign lessons: Missing subject data', { id: subject?.id, name: subject?.name, class_id: subject?.class_id });
      alert('Fach oder Klasse nicht verfügbar. Bitte schließen Sie das Modal und versuchen Sie es erneut.');
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
          subject: subject.id,
          class_id: subject.class_id,
          user_id: pb.authStore.model?.id || '',
          school_year: new Date().getFullYear(),
          is_draft: true
        });
        draftTopicId = draft.id;
      } catch (error) {
        console.error('Error creating draft topic:', error);
        alert('Fehler beim Erstellen des Entwurfs. Bitte versuchen Sie es erneut.');
        return;
      }
    }

    localStorage.setItem('draftTopic', JSON.stringify({
      ...formData,
      subjectId: subject.id,
      classId: subject.class_id,
      topicId: draftTopicId
    }));

    console.log('Navigating to yearlyoverview with:', {
      subject: subject.name,
      mode: 'assign',
      topic: draftTopicId
    });
    navigate(`/yearlyoverview?subject=${encodeURIComponent(subject.name)}&mode=assign&topic=${draftTopicId}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      alert('Bitte geben Sie einen Themennamen ein.');
      return;
    }
    if (!subject?.id || !subject?.class_id) {
      console.error('Missing subject or class_id:', { subjectId: subject?.id, classId: subject?.class_id });
      alert('Fach oder Klasse nicht verfügbar. Bitte wählen Sie ein Fach aus.');
      return;
    }
    if (!pb.authStore.model?.id) {
      console.error('No authenticated user found:', pb.authStore.model);
      alert('Kein authentifizierter Benutzer gefunden. Bitte melden Sie sich erneut an.');
      return;
    }

    let payload;
    if (imageFile) {
      payload = new FormData();
      payload.append('name', formData.name);
      payload.append('description', formData.description || '');
      payload.append('color', formData.color || '#3b82f6');
      payload.append('goals', formData.goals || '');
      payload.append('department', formData.department || '');
      payload.append('subject', subject.id);
      payload.append('class_id', subject.class_id);
      payload.append('user_id', pb.authStore.model.id);
      payload.append('school_year', String(new Date().getFullYear()));
      payload.append('is_draft', 'false');
      payload.append('image', imageFile);
    } else {
      payload = {
        name: formData.name,
        description: formData.description || '',
        color: formData.color || '#3b82f6',
        goals: formData.goals || '',
        department: formData.department || '',
        subject: subject.id,
        class_id: subject.class_id,
        user_id: pb.authStore.model.id,
        school_year: new Date().getFullYear(),
        is_draft: false
      };
    }

    console.log('Debug: Saving topic with payload:', payload instanceof FormData ? Array.from(payload.entries()) : payload);

    try {
      let savedTopic;
      if (loadedTopic?.id) {
        savedTopic = await Topic.update(loadedTopic.id, payload);
      } else {
        savedTopic = await Topic.create(payload);
      }
      localStorage.removeItem('draftTopic');
      onSave({ ...formData, id: savedTopic.id });
      onClose();
      console.log('Debug: Saved topic:', savedTopic);
    } catch (error) {
      console.error('Error saving topic:', error);
      if (error.data?.data) {
        console.error('Validation errors:', error.data.data);
      }
      alert('Fehler beim Speichern des Themas: ' + (error.data?.message || 'Unbekannter Fehler'));
    }
  };

  const handleDelete = () => {
    if (loadedTopic && window.confirm("Are you sure you want to delete this topic? This will remove it from all associated lessons.")) {
      onDelete(loadedTopic.id);
    }
  };

  const handleLessonClick = async (minimalLesson) => {
    console.log('TopicModal: Opening LessonModal for lessonId =', minimalLesson.id, 'with autoAssignTopicId =', loadedTopic?.id);
    try {
      const fullLesson = await pb.collection('yearly_lessons').getOne(minimalLesson.id, {
        expand: 'subject,topic_id'
      });
      console.log('TopicModal: Fetched full lesson =', fullLesson);
      setSelectedLesson(fullLesson);
    } catch (error) {
      console.error('Error fetching full lesson:', error);
      setSelectedLesson(minimalLesson);
    }
    setIsLessonModalOpen(true);
  };

  const handleAddNewLesson = () => {
    if (!subject?.id || !subject?.class_id) {
      console.error('Cannot create new lesson: Missing subject or class_id', { subject });
      alert('Fach oder Klasse nicht verfügbar. Bitte wählen Sie ein Fach aus.');
      return;
    }
    console.log('TopicModal: Creating new lesson slot with topic_id =', loadedTopic?.id, 'subjectId =', subject?.id);
    setNewLessonSlot({
      subject: subject.id,
      week_number: getCurrentWeek(),
      lesson_number: 1,
      school_year: new Date().getFullYear(),
      class_id: subject.class_id,
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

  const handleSaveLesson = (updatedLessonData) => {
    setLessons(lessons.map(l => l.id === updatedLessonData.id ? { ...l, ...updatedLessonData } : l));
    setIsLessonModalOpen(false);
  };

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
            {loadedTopic ? "Thema bearbeiten" : "Neues Thema erstellen"}
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-xs md:text-sm mt-1">
            {loadedTopic ? "Bearbeiten Sie die Details des bestehenden Themas." : "Erstellen Sie ein neues Thema für Ihr Fach."}
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
              <TabsList className="grid w-full grid-cols-4 bg-slate-800">
                <TabsTrigger value="general">Allgemein</TabsTrigger>
                <TabsTrigger value="content">Inhalt</TabsTrigger>
                <TabsTrigger value="lessons">Lektionen</TabsTrigger>
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
                  {departments.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="department" className="text-xs md:text-sm font-semibold text-slate-300">Fachbereich (optional)</Label>
                      <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-sm md:text-base py-2 md:py-3">
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
                          className="bg-slate-800 border-slate-600 text-sm md:text-base"
                        />
                        <Button type="button" onClick={handleAddNewDepartment} className="flex items-center gap-2 text-sm md:text-base px-4 py-2">
                          <Plus className="w-4 h-4" /> Hinzufügen
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-semibold flex items-center gap-2 text-slate-300">
                    <Palette className="w-4 h-4" />
                    Farbe
                  </Label>
                  <div className="relative">
                    <Button
                      type="button"
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: formData.color || '#3b82f6' }}
                      onClick={() => setShowColorPicker(!showColorPicker)}
                    />
                    {showColorPicker && (
                      <div className="absolute z-10 mt-2">
                        <SketchPicker
                          color={formData.color || '#3b82f6'}
                          onChangeComplete={(color) => {
                            setFormData({...formData, color: color.hex});
                            setShowColorPicker(false);
                          }}
                        />
                      </div>
                    )}
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
                    className="h-16 md:h-20 bg-slate-800 border-slate-600 text-sm md:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs md:text-sm font-semibold text-slate-300">Beschreibung</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Beschreiben Sie, was dieses Thema umfasst..."
                    className="h-16 md:h-20 bg-slate-800 border-slate-600 text-sm md:text-base"
                  />
                </div>
              </TabsContent>
              <TabsContent value="lessons" className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-semibold text-slate-300">Lektionszellen ({lessons.length})</Label>
                  <div className="max-w-full max-h-40 overflow-x-auto flex gap-4 pb-4">
                    {lessons.map((lesson) => (
                      <LessonCard key={lesson.id} lesson={lesson} onClick={() => handleLessonClick(lesson)} color={subjectColor} />
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddNewLesson}
                      className="w-20 h-20 rounded-lg border-dashed border-2 border-slate-600 text-slate-300 flex items-center justify-center hover:bg-slate-700 flex-shrink-0"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAssignLessons}
                  className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-sm md:text-base px-4 py-2"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Lektionen hinzufügen
                </Button>
              </TabsContent>
              <TabsContent value="media" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="image" className="text-xs md:text-sm font-semibold text-slate-300">Titelbild hinzufügen</Label>
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
                </div>
                <div className="border border-slate-700 bg-slate-800 rounded-lg p-4">
                  <h3 className="text-xs md:text-sm font-semibold text-slate-300 mb-2">Vorschau</h3>
                  <div
                    className="rounded-lg p-4 text-white"
                    style={{ backgroundColor: formData.color || subjectColor || '#3b82f6' }}
                  >
                    <h4 className="font-bold text-sm">{formData.name || 'Thema Titel'}</h4>
                    <p className="text-xs opacity-80">{formData.description || 'Keine Beschreibung'}</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
          <div className="sticky bottom-0 bg-slate-900 pt-6 md:pt-8 mt-6 md:mt-8 border-t border-slate-700">
            <div className="flex justify-end items-center gap-4">
              <Button type="button" variant="outline" onClick={onClose} className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-sm md:text-base px-4 py-2">
                <X className="w-4 h-4 mr-2" />
                Abbrechen
              </Button>
              {loadedTopic && (
                <Button type="button" variant="destructive" onClick={handleDelete} className="flex items-center gap-2 text-sm md:text-base px-4 py-2">
                  <Trash2 className="w-4 h-4" />
                  Löschen
                </Button>
              )}
              <Button 
                type="submit"
                className="text-white shadow-md text-sm md:text-base px-4 py-2"
                style={{ backgroundColor: formData.color || subjectColor || '#3b82f6' }}
                disabled={!formData.name?.trim()}
              >
                <SaveIcon className="w-4 h-4 mr-2" />
                {loadedTopic ? "Aktualisieren" : "Erstellen"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
      {selectedLesson && (
        <LessonModal
          isOpen={isLessonModalOpen}
          onClose={() => setIsLessonModalOpen(false)}
          onSave={handleSaveLesson}
          lesson={selectedLesson}
          topics={fetchedTopics}
          allYearlyLessons={allYearlyLessons}
          currentWeek={selectedLesson?.week_number || newLessonSlot?.week_number || null}
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