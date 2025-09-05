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
import { Save, X, Trash2, Palette } from "lucide-react";

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981',
    '#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#64748b'
];

export default function TopicModal({ isOpen, onClose, onSave, onDelete, topic, subjectColor }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: topic?.name || "",
        description: topic?.description || "",
        color: topic?.color || subjectColor || "#3b82f6",
      });
    }
  }, [isOpen, topic, subjectColor]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleDelete = () => {
    if (topic && window.confirm("Are you sure you want to delete this topic? This will remove it from all associated lessons.")) {
      onDelete(topic.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md"
              style={{ backgroundColor: formData.color || subjectColor || '#3b82f6' }}
            >
              <Palette className="w-4 h-4 text-white" />
            </div>
            {topic ? "Thema bearbeiten" : "Neues Thema erstellen"}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            {topic ? "Bearbeiten Sie die Details des bestehenden Themas." : "Erstellen Sie ein neues Thema für Ihr Fach."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold text-slate-300">Thema Titel</Label>
            <Input
              id="title"
              value={formData.name || ""}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="z.B. Quadratische Gleichungen, Zweiter Weltkrieg"
              required
              className="bg-slate-800 border-slate-600"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold text-slate-300">Beschreibung</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Beschreiben Sie, was dieses Thema umfasst..."
              className="h-20 bg-slate-800 border-slate-600"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2 text-slate-300">
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

          <div className="flex justify-between items-center gap-3 pt-4 border-t border-slate-700">
            <div>
              {topic && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Löschen
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="bg-slate-700 border-slate-600 hover:bg-slate-600">
                <X className="w-4 h-4 mr-2" />
                Abbrechen
              </Button>
              <Button 
                type="submit"
                className="text-white shadow-md"
                style={{ backgroundColor: formData.color || subjectColor || '#3b82f6' }}
                disabled={!formData.name?.trim()}
              >
                <Save className="w-4 h-4 mr-2" />
                {topic ? "Aktualisieren" : "Erstellen"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}