import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Plus, Book, GraduationCap, Settings } from "lucide-react";

export default function QuickActionsOverlay({
  isOpen,
  onClose,
  activeClassId,
  activeSubjectName,
  activeTopicId,
  classes,
  subjects,
  topics,
  onSelectClass,
  onSelectSubject,
  onSelectTopic,
  onAddTopic
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md quick-actions-panel">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Schnellzugriff
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Class Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Klasse
            </label>
            <Select value={activeClassId || ''} onValueChange={onSelectClass}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Klasse auswählen" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block flex items-center gap-2">
              <Book className="w-4 h-4" />
              Fach
            </label>
            <Select value={activeSubjectName || ''} onValueChange={onSelectSubject} disabled={!activeClassId}>
              <SelectTrigger className="w-full" disabled={!activeClassId}>
                <SelectValue placeholder="Fach auswählen" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Topic Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block flex items-center gap-2">
              <span className="w-4 h-4">🎨</span>
              Thema
            </label>
            <Select value={activeTopicId || 'all'} onValueChange={onSelectTopic}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Thema auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Lektionen</SelectItem>
                {topics.map(topic => (
                  <SelectItem key={topic.id} value={topic.id}>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: topic.color}}></div>
                      {topic.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Actions */}
          {activeSubjectName && (
            <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
              <Button 
                className="w-full justify-start" 
                onClick={onAddTopic}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Neues Thema erstellen
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}