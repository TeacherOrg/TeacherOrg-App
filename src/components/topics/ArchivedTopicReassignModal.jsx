import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Check, ArrowRight, FolderInput, FileText, Loader2 } from "lucide-react";
import { Topic, YearlyLesson } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function ArchivedTopicReassignModal({
  isOpen,
  onClose,
  topic,
  subjects = [],
  onReassigned,
  onOpenAssignment // Neuer Callback für Assignment-Modal
}) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [archivedLessons, setArchivedLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const navigate = useNavigate();

  // Lade archivierte Lektionen für dieses Topic
  useEffect(() => {
    if (topic?.id && isOpen) {
      loadArchivedLessons();
    }
  }, [topic?.id, isOpen]);

  const loadArchivedLessons = async () => {
    setIsLoadingLessons(true);
    try {
      // Priorität 1: Verwende lessons_snapshot aus dem Topic (neue Methode)
      if (topic.lessons_snapshot && Array.isArray(topic.lessons_snapshot) && topic.lessons_snapshot.length > 0) {
        console.log('Using lessons_snapshot from topic:', topic.lessons_snapshot.length);
        setArchivedLessons(topic.lessons_snapshot);
        setIsLoadingLessons(false);
        return;
      }

      // Fallback für alte Daten: Lade YearlyLessons die zu diesem Topic gehören und archiviert sind
      const allLessons = await YearlyLesson.list();
      const topicLessons = allLessons.filter(l =>
        l.topic_id === topic.id &&
        (!l.subject || l.subject === '')
      );
      console.log('Loaded archived YearlyLessons from DB:', topicLessons.length);
      setArchivedLessons(topicLessons);
    } catch (error) {
      console.error('Error loading archived lessons:', error);
      setArchivedLessons([]);
    } finally {
      setIsLoadingLessons(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedSubjectId || !topic) return;
    setIsLoading(true);

    try {
      const subject = subjects.find(s => s.id === selectedSubjectId);
      if (!subject) {
        toast.error('Fach nicht gefunden');
        return;
      }

      // Topic mit neuem Fach und Klasse aktualisieren
      // Stelle materials und lehrplan_kompetenz_ids aus topic_snapshot wieder her
      const snapshot = topic.topic_snapshot || {};
      const updateData = {
        subject: selectedSubjectId,
        class_id: subject.class_id,
        lessons_snapshot: null,
        topic_snapshot: null  // Snapshot nach Wiederherstellung löschen
      };

      // Wenn topic_snapshot vorhanden, materials und lehrplan_kompetenz_ids wiederherstellen
      if (snapshot.materials && Array.isArray(snapshot.materials)) {
        updateData.materials = snapshot.materials;
        console.log('Restoring materials from snapshot:', snapshot.materials.length);
      }
      if (snapshot.lehrplan_kompetenz_ids && Array.isArray(snapshot.lehrplan_kompetenz_ids)) {
        updateData.lehrplan_kompetenz_ids = snapshot.lehrplan_kompetenz_ids;
        console.log('Restoring lehrplan_kompetenz_ids from snapshot:', snapshot.lehrplan_kompetenz_ids.length);
      }

      await Topic.update(topic.id, updateData);

      // Wenn archivierte Lektionen vorhanden sind
      if (archivedLessons.length > 0) {
        // Wenn onOpenAssignment vorhanden, öffne Assignment-Modal
        if (onOpenAssignment) {
          // Konvertiere archivedLessons zu lessons_snapshot Format
          const lessonsSnapshot = archivedLessons.map(l => ({
            name: l.name || '',
            notes: l.notes || '',
            steps: l.steps || [],
            is_exam: l.is_exam || false,
            is_double_lesson: l.is_double_lesson || false
          }));

          handleClose();
          onOpenAssignment(subject, topic, lessonsSnapshot);
          return;
        }

        // Fallback: Zur YearlyOverview navigieren (alte Methode)
        const isFromSnapshot = topic.lessons_snapshot && topic.lessons_snapshot.length > 0;
        localStorage.setItem('pendingArchivedLessons', JSON.stringify({
          topicId: topic.id,
          fromSnapshot: isFromSnapshot,
          lessons: archivedLessons.map(l => ({
            id: l.id || null,
            name: l.name || '',
            notes: l.notes || '',
            steps: l.steps || [],
            is_exam: l.is_exam || false,
            is_double_lesson: l.is_double_lesson || false,
            original_week: l.original_week,
            original_lesson_number: l.original_lesson_number
          }))
        }));

        toast.success('Thema zugewiesen. Platziere jetzt die Lektionen.');
        handleClose();
        navigate(`/YearlyOverview?subject=${encodeURIComponent(subject.name)}&mode=reassign&topic=${topic.id}`);
      } else {
        // Keine Lektionen - nur Topic aktualisieren
        toast.success('Thema erfolgreich zugewiesen.');
        handleClose();
        onReassigned?.();
      }
    } catch (error) {
      console.error('Error reassigning topic:', error);
      toast.error('Fehler beim Zuweisen des Themas: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedSubjectId('');
    setArchivedLessons([]);
    onClose();
  };

  if (!topic) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <FolderInput className="w-5 h-5 text-blue-400" />
            Thema neu zuweisen
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Waehle ein Fach fuer das archivierte Thema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Topic Preview */}
          <div
            className="p-3 rounded-lg border border-slate-600 flex items-center gap-3"
            style={{ backgroundColor: `${topic.color || '#3b82f6'}15` }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: topic.color || '#3b82f6' }}
            >
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white">{topic.name || 'Unbenanntes Thema'}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <FileText className="w-3 h-3" />
                {isLoadingLessons ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Lade...
                  </span>
                ) : (
                  `${archivedLessons.length} archivierte Lektion${archivedLessons.length !== 1 ? 'en' : ''}`
                )}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500" />
          </div>

          {/* Subject Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="subject-select" className="text-slate-300">
              Zielfach
            </Label>
            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Fach auswaehlen..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {subjects.map((subject) => (
                  <SelectItem
                    key={subject.id}
                    value={subject.id}
                    className="text-white hover:bg-slate-700 focus:bg-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: subject.color || '#3b82f6' }}
                      />
                      {subject.name}
                    </div>
                  </SelectItem>
                ))}
                {subjects.length === 0 && (
                  <div className="p-2 text-sm text-slate-400 text-center">
                    Keine Faecher verfuegbar. Erstelle zuerst ein Fach.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {archivedLessons.length > 0 && (
            <p className="text-sm text-slate-400">
              {onOpenAssignment
                ? `Nach der Auswahl kannst du die ${archivedLessons.length} archivierten Lektionen deinen Stundenplan-Slots zuweisen.`
                : `Nach der Auswahl wirst du zur Jahresuebersicht weitergeleitet, um die ${archivedLessons.length} archivierten Lektionen zu platzieren.`}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSubjectId || isLoading || subjects.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Speichere...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Zuweisen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
