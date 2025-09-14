import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // FIX: DialogDescription hinzufügen
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Star, Plus } from 'lucide-react';
import { Competency, User } from '@/api/entities';
import { useToast } from "@/components/ui/use-toast";

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
  const [selectedCompetencyId, setSelectedCompetencyId] = useState('');
  const [newCompetencyName, setNewCompetencyName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [ratings, setRatings] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCompetencies, setIsLoadingCompetencies] = useState(false);
  const [currentCompetencies, setCurrentCompetencies] = useState([]);
  const { toast } = useToast(); // FIX: Toast hook

  // FIX: Entferne redundanten useEffect
  useEffect(() => {
    const loadCompetenciesIfNeeded = async () => {
      if (isOpen && currentCompetencies.length === 0 && allCompetencies.length === 0 && activeClassId) {
        setIsLoadingCompetencies(true);
        try {
          const competencies = await Competency.filter({ class_id: activeClassId });
          setCurrentCompetencies(competencies || []);
        } catch (error) {
          console.error('Fehler beim Laden der Kompetenzen:', error);
          toast({
            title: "Fehler",
            description: "Fehler beim Laden der Kompetenzen. Bitte versuchen Sie es erneut.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingCompetencies(false);
        }
      } else {
        setCurrentCompetencies(allCompetencies || []);
      }
    };

    loadCompetenciesIfNeeded();
  }, [isOpen, allCompetencies, activeClassId, toast]);

  useEffect(() => {
    if (isOpen) {
      setSelectedCompetencyId('');
      setNewCompetencyName('');
      setDate(new Date().toISOString().slice(0, 10));
      setRatings({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleAddCompetency = async () => {
    if (!newCompetencyName.trim()) {
      alert('Bitte geben Sie einen Kompetenznamen ein.');
      return;
    }
    if (!activeClassId) {
      alert('Keine Klasse ausgewählt.');
      return;
    }
    const user = User.current();
    if (!user || !user.id) {
      alert('Kein Benutzer eingeloggt.');
      return;
    }
    if (user.role !== 'teacher') {
      alert('Nur Lehrer können Kompetenzen erstellen.');
      return;
    }

    const payload = {
      name: newCompetencyName.trim(),
      class_id: activeClassId,
      user_id: user.id,
      description: '',
      level: 0
    };
    console.log('Sending Competency.create payload:', payload);

    const existing = await Competency.filter({
      name: newCompetencyName.trim(),
      class_id: activeClassId
    });
    if (existing.length > 0) {
      alert('Eine Kompetenz mit diesem Namen existiert bereits für diese Klasse.');
      setSelectedCompetencyId(existing[0].id);
      setNewCompetencyName('');
      return;
    }

    try {
      setIsSubmitting(true);
      const newComp = await Competency.create(payload);
      console.log('Competency.create response:', newComp);
      if (!newComp || !newComp.id) {
        throw new Error('Ungültige Antwort vom Server');
      }
      setCurrentCompetencies(prev => [...prev, newComp]);
      setSelectedCompetencyId(newComp.id);
      setNewCompetencyName('');
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error("Fehler beim Erstellen der Kompetenz:", error);
      alert(`Fehler beim Erstellen der Kompetenz: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingChange = (studentId, rating) => {
    setRatings(prev => ({ ...prev, [studentId]: rating }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompetencyId) {
      alert('Bitte wählen oder erstellen Sie eine Kompetenz.');
      return;
    }
    const studentsWithRatings = Object.entries(ratings);
    if (studentsWithRatings.length === 0) {
      alert('Bitte bewerten Sie mindestens einen Schüler.');
      return;
    }
    console.log('Submitting ratings:', {
      competencyId: selectedCompetencyId,
      date,
      ratings
    });
    setIsSubmitting(true);
    try {
      await onSave({
        competencyId: selectedCompetencyId,
        date: date,
        ratings: Object.fromEntries(
          Object.entries(ratings).map(([studentId, score]) => [studentId, Number(score)])
        )
      });
      toast({
        title: "Erfolg",
        description: "Bewertungen erfolgreich gespeichert",
        variant: "success",
      });
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern der Kompetenzbewertungen:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Speichern der Kompetenzen. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStudentColumns = () => {
    const studentsPerColumn = Math.ceil(students.length / 3);
    return [
      students.filter(s => s.class_id === activeClassId).slice(0, studentsPerColumn),
      students.filter(s => s.class_id === activeClassId).slice(studentsPerColumn, studentsPerColumn * 2),
      students.filter(s => s.class_id === activeClassId).slice(studentsPerColumn * 2)
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
        aria-describedby="dialog-description" // FIX: Entferne bedingte Logik
      >
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-slate-700">
          <DialogTitle className="text-2xl font-bold">Neue Kompetenzerfassung</DialogTitle>
          <DialogDescription className="text-sm text-slate-500 mt-2" id="dialog-description">
            Dialog zur Erfassung neuer überfachlicher Kompetenzen für Schüler.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="p-6 flex-shrink-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-base font-semibold mb-2 block">Kompetenz</Label>
                  <div className="flex gap-2 items-center">
                    <Select value={selectedCompetencyId} onValueChange={setSelectedCompetencyId}>
                      <SelectTrigger className="flex-1 bg-slate-800 border-slate-600">
                        <SelectValue placeholder="Bestehende Kompetenz auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingCompetencies ? (
                          <SelectItem value="loading">Lade Kompetenzen...</SelectItem>
                        ) : currentCompetencies.length === 0 ? (
                          <SelectItem disabled value="none">Keine Kompetenzen gefunden (erstellen Sie eine neue)</SelectItem>
                        ) : (
                          currentCompetencies.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Input 
                      value={newCompetencyName}
                      onChange={e => setNewCompetencyName(e.target.value)}
                      placeholder="Oder neue erstellen"
                      className="flex-1 bg-slate-800 border-slate-600"
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCompetency())}
                      disabled={isSubmitting}
                    />
                    <Button 
                      type="button" 
                      size="icon" 
                      onClick={handleAddCompetency} 
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={isSubmitting}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="date" className="text-base font-semibold mb-2 block">Datum</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    required 
                    className="w-full bg-slate-800 border-slate-600" 
                    disabled={isSubmitting}
                  />
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
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                className="bg-slate-700 hover:bg-slate-600"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4 mr-2" /> Abbrechen
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" /> {isSubmitting ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}