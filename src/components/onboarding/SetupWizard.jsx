import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  BookOpen,
  Clock,
  Check,
  Plus,
  Trash2,
  Sparkles,
  SkipForward,
  FileText,
  UserPlus,
  Edit3,
} from 'lucide-react';
import { Class, Subject, Student, Setting } from '@/api/entities';
import pb from '@/api/pb';
import toast from 'react-hot-toast';
import TemplateEditorModal from '@/components/settings/TemplateEditorModal';

// Preset colors for subjects
const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981',
  '#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#64748b'
];

// Preset emojis for subjects
const PRESET_EMOJIS = [
  '📚', '🧮', '🔬', '⚗️', '🌍', '🎨', '🎶', '🏀', '💻', '📝',
  '🗣️', '⚙️', '🌱', '📖', '🧬', '🔭', '⚖️', '🖌️', '🎭', '🌐',
];

const WIZARD_STEPS = [
  { id: 'welcome', title: 'Willkommen', icon: Sparkles, skippable: false },
  { id: 'class', title: 'Klasse', icon: Users, skippable: true },
  { id: 'subjects', title: 'Fächer', icon: BookOpen, skippable: true },
  { id: 'students', title: 'Schüler', icon: UserPlus, skippable: true },
  { id: 'schedule-type', title: 'Stundenplan', icon: Calendar, skippable: true },
  { id: 'time-grid', title: 'Zeitraster', icon: Clock, skippable: true },
  { id: 'complete', title: 'Fertig', icon: Check, skippable: false },
];

export function SetupWizard({ isOpen, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [className, setClassName] = useState('');
  const [createdClassId, setCreatedClassId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState({ name: '', color: '#3b82f6', emoji: '📚', lessons_per_week: 4 });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({ first_name: '', last_name: '' });
  const [studentList, setStudentList] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [scheduleType, setScheduleType] = useState('flexible');
  const [fixedScheduleTemplate, setFixedScheduleTemplate] = useState({});
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [timeSettings, setTimeSettings] = useState({
    startTime: '08:00',
    lessonsPerDay: 8,
    lessonDuration: 45,
    shortBreak: 5,
    morningBreakAfter: 2,
    morningBreakDuration: 20,
    lunchBreakAfter: 4,
    lunchBreakDuration: 40,
    afternoonBreakAfter: 6,
    afternoonBreakDuration: 15,
    schoolYearStartWeek: 35,
  });

  const currentStepData = WIZARD_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  // Can proceed to next step?
  const canProceed = () => {
    switch (currentStepData.id) {
      case 'welcome':
        return true;
      case 'class':
        return createdClassId !== null;
      case 'subjects':
        return subjects.length > 0;
      case 'students':
        return true; // Optional step
      case 'schedule-type':
        return true;
      case 'time-grid':
        return true;
      case 'complete':
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (isLastStep) {
      await handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    if (!isLastStep && currentStepData.skippable) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async (startTour = false) => {
    setIsLoading(true);
    try {
      const currentUserId = pb.authStore.model?.id;
      if (currentUserId) {
        const existingSettings = await Setting.list({ user_id: currentUserId });

        const settingsData = {
          user_id: currentUserId,
          scheduleType: scheduleType,
          startTime: timeSettings.startTime,
          lessonsPerDay: timeSettings.lessonsPerDay,
          lessonDuration: timeSettings.lessonDuration,
          shortBreak: timeSettings.shortBreak,
          morningBreakAfter: timeSettings.morningBreakAfter,
          morningBreakDuration: timeSettings.morningBreakDuration,
          lunchBreakAfter: timeSettings.lunchBreakAfter,
          lunchBreakDuration: timeSettings.lunchBreakDuration,
          afternoonBreakAfter: timeSettings.afternoonBreakAfter,
          afternoonBreakDuration: timeSettings.afternoonBreakDuration,
          schoolYearStartWeek: timeSettings.schoolYearStartWeek,
          cellWidth: 120,
          cellHeight: 80,
          fixedScheduleTemplate: scheduleType === 'fixed' ? fixedScheduleTemplate : {},
        };

        if (existingSettings.length > 0) {
          await Setting.update(existingSettings[0].id, settingsData);
        } else {
          await Setting.create(settingsData);
        }
      }

      toast.success('Einrichtung abgeschlossen!');
      onComplete(startTour);
    } catch (error) {
      console.error('Error completing setup:', error);
      toast.error('Fehler beim Speichern der Einstellungen.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create class
  const handleCreateClass = async () => {
    if (!className.trim()) return;

    setIsLoading(true);
    try {
      const currentUserId = pb.authStore.model?.id;
      const currentYear = new Date().getFullYear();

      const newClass = await Class.create({
        name: className.trim(),
        user_id: currentUserId,
        teacher_id: currentUserId,
        school_year: currentYear,
      });

      setCreatedClassId(newClass.id);
      toast.success(`Klasse "${className}" erstellt!`);
    } catch (error) {
      console.error('Error creating class:', error);
      toast.error('Fehler beim Erstellen der Klasse.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add subject
  const handleAddSubject = async () => {
    if (!newSubject.name.trim() || !createdClassId) return;

    setIsLoading(true);
    try {
      const currentUserId = pb.authStore.model?.id;

      const created = await Subject.create({
        name: newSubject.name.trim(),
        color: newSubject.color,
        emoji: newSubject.emoji,
        lessons_per_week: newSubject.lessons_per_week,
        class_id: createdClassId,
        user_id: currentUserId,
      });

      setSubjects(prev => [...prev, { ...created, name: newSubject.name, color: newSubject.color, emoji: newSubject.emoji }]);
      setNewSubject({ name: '', color: PRESET_COLORS[subjects.length % PRESET_COLORS.length], emoji: '📚', lessons_per_week: 4 });
      toast.success(`Fach "${newSubject.name}" hinzugefügt!`);
    } catch (error) {
      console.error('Error adding subject:', error);
      toast.error('Fehler beim Hinzufügen des Fachs.');
    } finally {
      setIsLoading(false);
    }
  };

  // Remove subject
  const handleRemoveSubject = async (subjectId) => {
    try {
      await Subject.delete(subjectId);
      setSubjects(prev => prev.filter(s => s.id !== subjectId));
    } catch (error) {
      console.error('Error removing subject:', error);
    }
  };

  // Add single student
  const handleAddStudent = async () => {
    if (!createdClassId || !newStudent.first_name.trim() || !newStudent.last_name.trim()) return;

    setIsLoading(true);
    try {
      const fullName = `${newStudent.first_name.trim()} ${newStudent.last_name.trim()}`;
      const currentUserId = pb.authStore.model?.id;
      const generatedEmail = `${fullName.replace(/\s+/g, '.').toLowerCase()}@school.example.com`;

      const created = await Student.create({
        name: fullName,
        class_id: createdClassId,
        user_id: currentUserId,
        email: generatedEmail,
      });

      setStudents(prev => [...prev, { ...created, name: fullName }]);
      setNewStudent({ first_name: '', last_name: '' });
      toast.success(`Schüler "${fullName}" hinzugefügt!`);
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('Fehler beim Hinzufügen des Schülers.');
    } finally {
      setIsLoading(false);
    }
  };

  // Import students from list
  const handlePasteStudents = async () => {
    if (!createdClassId || !studentList.trim()) return;

    setIsLoading(true);
    try {
      const lines = studentList.split('\n').filter(line => line.trim());
      const currentUserId = pb.authStore.model?.id;
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

          const created = await Student.create({
            name: name,
            class_id: createdClassId,
            user_id: currentUserId,
            email,
          });

          newStudents.push({ ...created, name });
          await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
        }
      }

      setStudents(prev => [...prev, ...newStudents]);
      setStudentList('');
      setShowImportDialog(false);
      toast.success(`${newStudents.length} Schüler erfolgreich hinzugefügt!`);
    } catch (error) {
      console.error('Error importing students:', error);
      toast.error('Fehler beim Importieren der Schüler.');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete student
  const handleDeleteStudent = async (studentId) => {
    try {
      await Student.delete(studentId);
      setStudents(prev => prev.filter(s => s.id !== studentId));
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStepData.id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6 py-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Sparkles className="w-20 h-20 text-blue-500 mx-auto" />
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Willkommen bei TeacherOrg!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-3 max-w-md mx-auto">
                In wenigen Schritten richten wir Ihre Unterrichtsplanung ein.
                Jeder Schritt kann übersprungen und später in den Einstellungen nachgeholt werden.
              </p>
            </motion.div>
          </div>
        );

      case 'class':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Users className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Erstellen Sie Ihre erste Klasse
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                Geben Sie den Namen Ihrer Klasse ein (z.B. "5a" oder "Klasse 3b")
              </p>
            </div>

            {!createdClassId ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Klassenname</Label>
                  <Input
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="z.B. 5a, Klasse 3b..."
                    className="mt-2 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateClass()}
                  />
                </div>
                <Button
                  onClick={handleCreateClass}
                  disabled={!className.trim() || isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Klasse erstellen
                </Button>
              </div>
            ) : (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800 text-center"
              >
                <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-green-700 dark:text-green-400 font-medium">
                  Klasse "{className}" wurde erstellt!
                </p>
                <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                  Sie können jetzt fortfahren und Fächer hinzufügen.
                </p>
              </motion.div>
            )}
          </div>
        );

      case 'subjects':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <BookOpen className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Fügen Sie Ihre Fächer hinzu
              </h2>
            </div>

            {/* Added subjects */}
            {subjects.length > 0 && (
              <div className="space-y-2 max-h-24 overflow-y-auto">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                      <span className="text-sm">{subject.emoji}</span>
                      <span className="font-medium text-sm text-slate-900 dark:text-white">{subject.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleRemoveSubject(subject.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add subject form */}
            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-slate-700 dark:text-slate-300 text-xs">Fachname</Label>
                  <Input
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    placeholder="z.B. Mathematik"
                    className="mt-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 dark:text-slate-300 text-xs">Lektionen/Woche</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={newSubject.lessons_per_week}
                    onChange={(e) => setNewSubject({ ...newSubject, lessons_per_week: Number(e.target.value) })}
                    className="mt-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Color picker */}
              <div>
                <Label className="text-slate-700 dark:text-slate-300 text-xs">Farbe</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${
                        newSubject.color === color ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewSubject({ ...newSubject, color })}
                    />
                  ))}
                </div>
              </div>

              {/* Emoji picker */}
              <div className="flex items-center gap-2">
                <Label className="text-slate-700 dark:text-slate-300 text-xs">Emoji:</Label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-8 h-8 rounded border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 flex items-center justify-center text-lg"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    {newSubject.emoji}
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute z-50 bottom-full mb-1 p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg grid grid-cols-5 gap-1">
                      {PRESET_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="w-7 h-7 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-lg"
                          onClick={() => { setNewSubject({ ...newSubject, emoji }); setShowEmojiPicker(false); }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={handleAddSubject} disabled={!newSubject.name.trim() || isLoading} className="w-full bg-green-600 hover:bg-green-700 h-8 text-sm">
                <Plus className="w-3 h-3 mr-1" /> Fach hinzufügen
              </Button>
            </div>
          </div>
        );

      case 'students':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <UserPlus className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Schüler hinzufügen
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                Optional - Sie können dies auch später in den Einstellungen tun.
              </p>
            </div>

            {/* Students list */}
            {students.length > 0 && (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">
                    <span>{student.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDeleteStudent(student.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add single student */}
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={newStudent.first_name}
                  onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
                  placeholder="Vorname"
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 h-8 text-sm"
                />
                <Input
                  value={newStudent.last_name}
                  onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
                  placeholder="Nachname"
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 h-8 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddStudent} disabled={!newStudent.first_name.trim() || !newStudent.last_name.trim() || isLoading} className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-sm">
                  <Plus className="w-3 h-3 mr-1" /> Hinzufügen
                </Button>
                <Button variant="outline" onClick={() => setShowImportDialog(true)} className="h-8 text-sm">
                  <FileText className="w-3 h-3 mr-1" /> Liste importieren
                </Button>
              </div>
            </div>

            {/* Import Dialog */}
            {showImportDialog && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 w-80 max-w-[90vw]">
                  <h4 className="text-lg font-semibold mb-3">Schülerliste importieren</h4>
                  <Textarea
                    value={studentList}
                    onChange={(e) => setStudentList(e.target.value)}
                    placeholder="Max Mustermann&#10;Anna Schmidt&#10;..."
                    className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 h-24"
                  />
                  <p className="text-xs text-slate-500 mt-1">Ein Name pro Zeile</p>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" onClick={() => { setShowImportDialog(false); setStudentList(''); }} className="flex-1">
                      Abbrechen
                    </Button>
                    <Button onClick={handlePasteStudents} disabled={!studentList.trim() || isLoading} className="flex-1 bg-green-600 hover:bg-green-700">
                      Importieren
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 text-center">
              {students.length} Schüler hinzugefügt
            </p>
          </div>
        );

      case 'schedule-type':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Calendar className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Stundenplan-Typ wählen
              </h2>
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setScheduleType('flexible')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  scheduleType === 'flexible' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    scheduleType === 'flexible' ? 'border-blue-500 bg-blue-500' : 'border-slate-400'
                  }`}>
                    {scheduleType === 'flexible' && <Check className="w-2 h-2 text-white" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Flexibler Stundenplan</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Jede Woche individuell planen</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScheduleType('fixed')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  scheduleType === 'fixed' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    scheduleType === 'fixed' ? 'border-blue-500 bg-blue-500' : 'border-slate-400'
                  }`}>
                    {scheduleType === 'fixed' && <Check className="w-2 h-2 text-white" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Fester Stundenplan</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Vorlage wird jede Woche angewendet</p>
                  </div>
                </div>
              </button>
            </div>

            {scheduleType === 'fixed' && createdClassId && subjects.length > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Stundenplan-Vorlage</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Erstellen Sie Ihre wöchentliche Stundenplan-Vorlage
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTemplateEditorOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Vorlage bearbeiten
                  </Button>
                </div>
                {Object.keys(fixedScheduleTemplate).length > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Vorlage wurde erstellt
                  </p>
                )}
              </div>
            )}

            {scheduleType === 'fixed' && (!createdClassId || subjects.length === 0) && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                Erstellen Sie zuerst eine Klasse und Fächer, um die Vorlage zu bearbeiten.
              </p>
            )}
          </div>
        );

      case 'time-grid':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Clock className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Zeitraster einrichten
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 dark:text-slate-300 text-xs">Startzeit</Label>
                <Input
                  type="time"
                  value={timeSettings.startTime}
                  onChange={(e) => setTimeSettings({ ...timeSettings, startTime: e.target.value })}
                  className="mt-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-slate-700 dark:text-slate-300 text-xs">Lektionen/Tag</Label>
                <Input
                  type="number"
                  min="4"
                  max="12"
                  value={timeSettings.lessonsPerDay}
                  onChange={(e) => setTimeSettings({ ...timeSettings, lessonsPerDay: Number(e.target.value) })}
                  className="mt-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-slate-700 dark:text-slate-300 text-xs">Lektionsdauer (Min)</Label>
                <Input
                  type="number"
                  min="30"
                  max="90"
                  value={timeSettings.lessonDuration}
                  onChange={(e) => setTimeSettings({ ...timeSettings, lessonDuration: Number(e.target.value) })}
                  className="mt-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-slate-700 dark:text-slate-300 text-xs">Kurzpause (Min)</Label>
                <Input
                  type="number"
                  min="0"
                  max="15"
                  value={timeSettings.shortBreak}
                  onChange={(e) => setTimeSettings({ ...timeSettings, shortBreak: Number(e.target.value) })}
                  className="mt-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 h-8 text-sm"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div>
                <Label className="text-slate-700 dark:text-slate-300 text-xs">Startwoche Schuljahr (KW)</Label>
                <Input
                  type="number"
                  min="1"
                  max="52"
                  value={timeSettings.schoolYearStartWeek}
                  onChange={(e) => setTimeSettings({ ...timeSettings, schoolYearStartWeek: Number(e.target.value) })}
                  className="mt-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 h-8 text-sm w-20"
                />
                <p className="text-xs text-slate-500 mt-1">Woche, ab der das Schuljahr beginnt</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2">
              <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300">Grosse Pausen</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-slate-600 dark:text-slate-400 text-xs">Morgenpause nach Lektion</Label>
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    value={timeSettings.morningBreakAfter}
                    onChange={(e) => setTimeSettings({ ...timeSettings, morningBreakAfter: Number(e.target.value) })}
                    className="mt-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-slate-600 dark:text-slate-400 text-xs">Dauer (Min)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="30"
                    value={timeSettings.morningBreakDuration}
                    onChange={(e) => setTimeSettings({ ...timeSettings, morningBreakDuration: Number(e.target.value) })}
                    className="mt-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-slate-600 dark:text-slate-400 text-xs">Mittagspause nach Lektion</Label>
                  <Input
                    type="number"
                    min="1"
                    max="8"
                    value={timeSettings.lunchBreakAfter}
                    onChange={(e) => setTimeSettings({ ...timeSettings, lunchBreakAfter: Number(e.target.value) })}
                    className="mt-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-slate-600 dark:text-slate-400 text-xs">Dauer (Min)</Label>
                  <Input
                    type="number"
                    min="20"
                    max="90"
                    value={timeSettings.lunchBreakDuration}
                    onChange={(e) => setTimeSettings({ ...timeSettings, lunchBreakDuration: Number(e.target.value) })}
                    className="mt-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-slate-600 dark:text-slate-400 text-xs">Nachmittagspause nach Lektion</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={timeSettings.afternoonBreakAfter}
                    onChange={(e) => setTimeSettings({ ...timeSettings, afternoonBreakAfter: Number(e.target.value) })}
                    className="mt-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-slate-600 dark:text-slate-400 text-xs">Dauer (Min)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="60"
                    value={timeSettings.afternoonBreakDuration}
                    onChange={(e) => setTimeSettings({ ...timeSettings, afternoonBreakDuration: Number(e.target.value) })}
                    className="mt-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 h-7 text-xs"
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Diese Einstellungen können später angepasst werden.
            </p>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-4 py-6">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, type: 'spring' }}
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-green-500" />
              </div>
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">🎉 Gratuliere!</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm">
                Deine Klasse ist bereit!
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-left max-w-xs mx-auto"
            >
              <h3 className="font-medium text-sm text-slate-900 dark:text-white mb-1">Zusammenfassung:</h3>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                <li>✓ Klasse: {className || '-'}</li>
                <li>✓ {subjects.length} Fächer</li>
                <li>✓ {students.length} Schüler</li>
                <li>✓ Stundenplan: {scheduleType === 'flexible' ? 'Flexibel' : 'Fest'}</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="pt-2 space-y-2"
            >
              <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                Möchtest du eine interaktive Tour machen?
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-xs px-4">
                Wir führen dich durch die wichtigsten Funktionen und du erstellst dabei dein erstes Thema und deine ersten Lektionen.
              </p>
            </motion.div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-0" hideCloseButton aria-describedby={undefined}>
        <VisuallyHidden.Root>
          <DialogTitle>Setup-Wizard</DialogTitle>
        </VisuallyHidden.Root>
        {/* Progress header */}
        <div className="p-4 pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-3">
            {WIZARD_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.id} className={`flex items-center ${index < WIZARD_STEPS.length - 1 ? 'flex-1' : ''}`}>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                      isActive ? 'bg-blue-500 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  </div>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 rounded ${isCompleted ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-center">
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Schritt {currentStep + 1} von {WIZARD_STEPS.length}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 min-h-[320px] max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 pt-3 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={isFirstStep || isLoading}
            className="text-slate-600 dark:text-slate-400"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Zurück
          </Button>

          <div className="flex gap-2">
            {currentStepData.skippable && !isLastStep && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isLoading}
                className="text-slate-500"
              >
                <SkipForward className="w-4 h-4 mr-1" />
                Überspringen
              </Button>
            )}

            {isLastStep ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleComplete(false)}
                  disabled={!canProceed() || isLoading}
                  className="flex-1"
                >
                  Nein, später
                </Button>
                <Button
                  onClick={() => handleComplete(true)}
                  disabled={!canProceed() || isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? 'Lädt...' : (
                    <>
                      Ja, Tour starten
                      <Sparkles className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Weiter
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Template Editor Modal - außerhalb des Dialogs für korrektes Drag & Drop */}
    <TemplateEditorModal
      isOpen={isTemplateEditorOpen}
      onClose={() => setIsTemplateEditorOpen(false)}
      initialTemplate={fixedScheduleTemplate}
      onSave={setFixedScheduleTemplate}
      classes={createdClassId ? [{ id: createdClassId, name: className }] : []}
      subjects={subjects}
      lessonsPerDay={timeSettings.lessonsPerDay}
    />
  </>
  );
}

export default SetupWizard;
