import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Star, Plus } from 'lucide-react';
import { Competency } from '@/api/entities';

const InteractiveStarRating = ({ student, rating, onRatingChange }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="bg-slate-700/50 rounded-lg p-3 text-center border border-slate-600">
      <div className="text-sm font-medium text-white mb-2 truncate" title={student.name}>
        {student.name}
      </div>
      <div className="flex justify-center items-center gap-1">
        {stars.map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 cursor-pointer transition-all duration-200 hover:scale-110 ${
              star <= rating 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-slate-400 hover:text-yellow-300'
            }`}
            onClick={() => onRatingChange(star)}
          />
        ))}
      </div>
    </div>
  );
};

export default function UeberfachlichModal({ 
  isOpen, 
  onClose, 
  onSave, 
  students = [], 
  activeClassId,
  allCompetencies = [],
  onDataChange
}) {
  const [selectedCompetency, setSelectedCompetency] = useState('');
  const [newCompetencyName, setNewCompetencyName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [ratings, setRatings] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCompetencies, setCurrentCompetencies] = useState(allCompetencies);

  useEffect(() => {
      setCurrentCompetencies(allCompetencies);
  }, [allCompetencies]);

  const studentsForClass = students.filter(s => s.class_id === activeClassId);

  useEffect(() => {
    if (isOpen) {
      setSelectedCompetency('');
      setNewCompetencyName('');
      setDate(new Date().toISOString().slice(0, 10));
      setRatings({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleAddCompetency = async () => {
      if (!newCompetencyName.trim()) return;
      const existing = currentCompetencies.find(c => c.name.toLowerCase() === newCompetencyName.trim().toLowerCase());
      if (existing) {
          setSelectedCompetency(existing.name);
          setNewCompetencyName('');
          return;
      }
      try {
          const newComp = await Competency.create({ name: newCompetencyName.trim(), class_id: activeClassId });
          setCurrentCompetencies([...currentCompetencies, newComp]);
          setSelectedCompetency(newComp.name);
          setNewCompetencyName('');
          if (onDataChange) onDataChange();
      } catch (error) {
          console.error("Fehler beim Erstellen der Kompetenz:", error);
      }
  };

  const handleRatingChange = (studentId, rating) => {
    setRatings(prev => ({ ...prev, [studentId]: rating }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompetency.trim()) {
      alert('Bitte wählen oder erstellen Sie eine Kompetenz.');
      return;
    }
    const studentsWithRatings = Object.entries(ratings);
    if (studentsWithRatings.length === 0) {
      alert('Bitte bewerten Sie mindestens einen Schüler.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave({
        competencyName: selectedCompetency,
        date: date,
        ratings: ratings
      });
      // onDataChange is now called in the parent component after onSave completes
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern der Kompetenzbewertungen:', error);
      alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStudentColumns = () => {
    const studentsPerColumn = Math.ceil(studentsForClass.length / 3);
    return [
      studentsForClass.slice(0, studentsPerColumn),
      studentsForClass.slice(studentsPerColumn, studentsPerColumn * 2),
      studentsForClass.slice(studentsPerColumn * 2)
    ];
  };

  const columns = getStudentColumns();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-6xl w-full mx-4 my-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-black dark:text-white"
        style={{
          maxHeight: '95vh',
          height: 'auto'
        }}
      >
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-slate-700">
          <DialogTitle className="text-2xl font-bold">Neue Kompetenzerfassung</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="p-6 flex-shrink-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label className="text-base font-semibold mb-2 block">Kompetenz</Label>
                      <div className="flex gap-2 items-center">
                          <Select value={selectedCompetency} onValueChange={setSelectedCompetency}>
                              <SelectTrigger className="flex-1 bg-slate-800 border-slate-600">
                                  <SelectValue placeholder="Bestehende Kompetenz auswählen..." />
                              </SelectTrigger>
                              <SelectContent>
                                  {currentCompetencies.map(c => (
                                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                          <Input 
                              value={newCompetencyName}
                              onChange={e => setNewCompetencyName(e.target.value)}
                              placeholder="Oder neue erstellen"
                              className="flex-1 bg-slate-800 border-slate-600"
                              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCompetency())}
                          />
                          <Button type="button" size="icon" onClick={handleAddCompetency} className="bg-blue-600 hover:bg-blue-700">
                              <Plus className="w-4 h-4" />
                          </Button>
                      </div>
                  </div>
                  <div>
                      <Label htmlFor="date" className="text-base font-semibold mb-2 block">Datum</Label>
                      <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-slate-800 border-slate-600" />
                  </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <Label className="text-base font-semibold mb-4 block">
                Bewertungen (1 = Niedrig, 5 = Hoch)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {columns.map((col, colIndex) => (
                  <div key={colIndex} className="space-y-3">
                    {col.map(student => (
                      <InteractiveStarRating
                        key={student.id}
                        student={student}
                        rating={ratings[student.id] || 0}
                        onRatingChange={(rating) => handleRatingChange(student.id, rating)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 flex-shrink-0 flex justify-end gap-3 border-t border-slate-700">
              <Button type="button" variant="outline" onClick={onClose} className="bg-slate-700 hover:bg-slate-600">
                <X className="w-4 h-4 mr-2" /> Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" /> {isSubmitting ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}