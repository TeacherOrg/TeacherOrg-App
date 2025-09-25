import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Star, Plus, FileText } from 'lucide-react';
import { Competency, User } from '@/api/entities';
import { useToast } from "@/components/ui/use-toast";

const InteractiveStarRating = ({ student, rating, onRatingChange, notes, onNotesChange }) => {
  const [showNotes, setShowNotes] = useState(false);
  const stars = [1, 2, 3, 4, 5];
  
  return (
    <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
      <div className="text-sm font-medium text-white mb-2 truncate" title={student.name}>
        {student.name}
      </div>
      <div className="flex justify-center items-center gap-1 mb-2">
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
      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowNotes(!showNotes)}
          className={`text-xs px-2 py-1 h-auto ${notes ? 'text-blue-400' : 'text-slate-400'} hover:text-blue-300`}
        >
          <FileText className="w-3 h-3 mr-1" />
          Notiz {notes ? '✓' : ''}
        </Button>
      </div>
      {showNotes && (
        <div className="mt-2">
          <Textarea
            value={notes || ''}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Notiz zur Bewertung..."
            className="bg-slate-800 border-slate-600 text-white text-xs min-h-[60px] resize-none"
          />
        </div>
      )}
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
  const [notes, setNotes] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCompetencies, setCurrentCompetencies] = useState(allCompetencies);
  const { toast } = useToast();

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
      setNotes({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleAddCompetency = async () => {
    if (!newCompetencyName.trim()) return;
    
    // Prüfe auf doppelte Namen (case-insensitive)
    const existing = currentCompetencies.find(c => 
      c.name.toLowerCase() === newCompetencyName.trim().toLowerCase()
    );
    
    if (existing) {
      toast({
        title: "Hinweis",
        description: "Diese Kompetenz existiert bereits.",
      });
      setSelectedCompetency(existing.name);
      setNewCompetencyName('');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = User.current();
      if (!user || !user.id) {
        toast({
          title: "Fehler",
          description: "Kein Benutzer eingeloggt.",
          variant: "destructive",
        });
        console.error('No user or user.id missing'); // ← NEUER LOG
        return;
      }

      if (!activeClassId) {
        toast({
          title: "Fehler",
          description: "Keine Klasse ausgewählt.",
          variant: "destructive",
        });
        return;
      }

      const createData = {
        name: newCompetencyName.trim(),
        class_id: activeClassId,
        user_id: user.id
      };
      console.log('Creating competency with data:', createData); // ← NEUER LOG (sollte user_id zeigen)

      const newComp = await Competency.create(createData, {
        $cancelKey: `create-competency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });

      if (newComp && newComp.id) {
        const updatedCompetencies = [...currentCompetencies, {
          ...newComp,
          name: newComp.name || newCompetencyName.trim()
        }];
        setCurrentCompetencies(updatedCompetencies);
        
        setSelectedCompetency(newComp.name || newCompetencyName.trim());
        setNewCompetencyName('');
        
        toast({
          title: "Erfolg",
          description: "Kompetenz erfolgreich erstellt.",
        });

        if (onDataChange) {
          onDataChange();
        }

        console.log('Competency created successfully:', newComp);
      } else {
        throw new Error('Ungültige Antwort vom Server');
      }
    } catch (error) {
      console.error("Fehler beim Erstellen der Kompetenz:", error);
      
      let errorMessage = "Fehler beim Erstellen der Kompetenz.";
      
      if (error.status === 400 && error.data?.data) {
        const validationErrors = error.data.data;
        console.log('Validation errors:', validationErrors); // ← NEUER LOG für full error data
        if (validationErrors.user_id) {
          errorMessage = `Fehler mit user_id: ${validationErrors.user_id.code} - ${validationErrors.user_id.message}`;
        } else if (validationErrors.class_id) {
          errorMessage = `Fehler mit class_id: ${validationErrors.class_id.code}`;
        } else if (validationErrors.name) {
          errorMessage = `Fehler mit name: ${validationErrors.name.code}`;
        } else {
          errorMessage = `Validierungsfehler: ${JSON.stringify(validationErrors)}`;
        }
      } else if (error.message?.includes('autocancelled')) {
        errorMessage = "Anfrage wurde abgebrochen. Bitte erneut versuchen.";
      } else if (error.message?.includes('network')) {
        errorMessage = "Netzwerkfehler. Bitte Internetverbindung prüfen.";
      }

      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingChange = (studentId, rating) => {
    setRatings(prev => ({ ...prev, [studentId]: rating }));
  };

  const handleNotesChange = (studentId, noteText) => {
    setNotes(prev => ({ ...prev, [studentId]: noteText }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompetency.trim()) {
      toast({
        title: "Fehler",
        description: 'Bitte wählen oder erstellen Sie eine Kompetenz.',
        variant: "destructive",
      });
      return;
    }
    const studentsWithRatings = Object.entries(ratings);
    if (studentsWithRatings.length === 0) {
      toast({
        title: "Fehler",
        description: 'Bitte bewerten Sie mindestens einen Schüler.',
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave({
        competencyName: selectedCompetency,
        date: date,
        ratings: ratings,
        notes: notes // Notizen mit übergeben
      });
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern der Kompetenzbewertungen:', error);
      toast({
        title: "Fehler",
        description: 'Fehler beim Speichern. Bitte versuchen Sie es erneut.',
        variant: "destructive",
      });
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
        className="max-w-6xl w-full mx-4 my-4 bg-slate-900 border-slate-700 text-white overflow-hidden"  // Fix: overflow-hidden hier, um internes Scrolling zu kontrollieren
        style={{
          maxHeight: '95vh',
          height: '95vh',  // Fix: Fixes Height, damit Modal nicht wächst
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-slate-700">
          <DialogTitle className="text-2xl font-bold">Neue Kompetenzerfassung</DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            Erfassen Sie Bewertungen und Notizen für überfachliche Kompetenzen der Schüler.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6">  
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
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

            <div className="space-y-4">
              <Label className="text-base font-semibold block">
                Bewertungen (1 = Niedrig, 5 = Hoch)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                {columns.map((col, colIndex) => (
                  <div key={colIndex} className="space-y-3">
                    {col.map(student => (
                      <InteractiveStarRating
                        key={student.id}
                        student={student}
                        rating={ratings[student.id] || 0}
                        onRatingChange={(rating) => handleRatingChange(student.id, rating)}
                        notes={notes[student.id] || ''}
                        onNotesChange={(noteText) => handleNotesChange(student.id, noteText)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="flex-shrink-0 p-6 flex justify-end gap-3 border-t border-slate-700 bg-slate-900 sticky bottom-0 z-10"> 
          <Button type="button" variant="outline" onClick={onClose} className="bg-slate-700 hover:bg-slate-600">
            <X className="w-4 h-4 mr-2" /> Abbrechen
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" /> {isSubmitting ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}