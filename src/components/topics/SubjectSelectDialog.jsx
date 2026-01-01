import React, { useState } from 'react';
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
import { BookOpen, Check, ArrowRight } from "lucide-react";

export default function SubjectSelectDialog({
  isOpen,
  onClose,
  sharedTopic,
  subjects = [],
  onSubjectSelected,
  onOpenAssignment // Neuer Callback für Assignment-Modal
}) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const handleConfirm = () => {
    if (!selectedSubjectId) return;
    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

    // Wenn onOpenAssignment vorhanden und Lektionen im Topic, öffne Assignment-Modal
    const hasLessons = sharedTopic?.lessons_snapshot?.length > 0;
    if (onOpenAssignment && hasLessons) {
      onOpenAssignment(selectedSubject, sharedTopic);
    } else {
      // Fallback: Direkt übernehmen (ohne Lektionen)
      onSubjectSelected(selectedSubjectId, sharedTopic);
    }
    setSelectedSubjectId('');
    onClose();
  };

  const handleClose = () => {
    setSelectedSubjectId('');
    onClose();
  };

  const topicData = sharedTopic?.topic_snapshot || {};

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <BookOpen className="w-5 h-5 text-green-400" />
            Fach auswaehlen
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Waehlen Sie das Fach, in dem das Thema "{topicData.name || 'Unbenannt'}" erstellt werden soll.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Topic Preview Mini */}
          <div
            className="p-3 rounded-lg border border-slate-600 flex items-center gap-3"
            style={{ backgroundColor: `${topicData.color || '#3b82f6'}15` }}
          >
            <div
              className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: topicData.color || '#3b82f6' }}
            >
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{topicData.name || 'Unbenanntes Thema'}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <div className="text-sm text-slate-400">?</div>
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
                    Keine Faecher verfuegbar
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-slate-400">
            {sharedTopic?.lessons_snapshot?.length > 0
              ? 'Nach der Auswahl koennen Sie die Lektionen Ihren Stundenplan-Slots zuweisen.'
              : 'Nach der Auswahl wird das Thema in Ihrem Account erstellt.'}
          </p>
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
            disabled={!selectedSubjectId}
            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            <Check className="w-4 h-4 mr-2" />
            Bestaetigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
