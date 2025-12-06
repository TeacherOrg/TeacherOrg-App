import React, { useState, useMemo, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Filter, ChevronUp, ChevronDown } from 'lucide-react';

const FiltersSection = ({
  diagramView,
  selectedSubject,
  setSelectedSubject,
  selectedCompetencyForProgression,
  setSelectedCompetencyForProgression,
  selectedStudents,
  setSelectedStudents,
  showClassAverage,
  setShowClassAverage,
  subjects,
  competencyOptions,
  students
}) => {
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);

  const studentOptions = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return students.map(s => ({
      value: s.id,
      label: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unnamed Student'
    }));
  }, [students]);

  const subjectOptions = useMemo(() => {
    if (!Array.isArray(subjects)) return [{ value: 'all', label: 'Alle' }];
    const options = subjects
      .filter(s => s && s.id && s.name)
      .map(s => ({
        value: s.id,
        label: s.name
      }));
    return [{ value: 'all', label: 'Alle' }, ...options];
  }, [subjects]);

  const handleStudentSelection = useCallback((studentId, checked) => {
    if (!studentId || typeof studentId !== 'string') return;
    setSelectedStudents(prev => {
      const current = Array.isArray(prev) ? [...prev] : [];
      return checked ? [...current, studentId] : current.filter(id => id !== studentId);
    });
  }, [setSelectedStudents]);

  const handleSelectAllStudents = useCallback((checked) => {
    const allIds = studentOptions.map(s => s.value).filter(id => typeof id === 'string');
    setSelectedStudents(checked ? allIds : []);
  }, [studentOptions, setSelectedStudents]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="space-y-2 min-h-[100px] flex flex-col justify-start">
        <Label className="text-slate-300 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          {diagramView === 'leistung' ? 'Fach auswählen' : 'Kompetenz auswählen'}
        </Label>
        {diagramView === 'leistung' ? (
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Fach auswählen" />
            </SelectTrigger>
            <SelectContent>
              {subjectOptions.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={selectedCompetencyForProgression || 'none'}
            onValueChange={(value) => setSelectedCompetencyForProgression(value === 'none' ? null : value)}
            disabled={competencyOptions.length === 0}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Kompetenz auswählen" />
            </SelectTrigger>
            <SelectContent>
              {competencyOptions.length > 0 ? (
                competencyOptions.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))
              ) : (
                <SelectItem disabled value="none">Keine Kompetenzen gefunden - bitte erstellen Sie welche im Modal</SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="space-y-2 min-h-[100px] flex flex-col justify-start">
        <Label className="text-slate-300">Schüler und Optionen</Label>
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setStudentDropdownOpen(!studentDropdownOpen)}
            className="w-full justify-between bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-black dark:text-white"
          >
            {selectedStudents.length > 0 ? `${selectedStudents.length} Schüler ausgewählt` : "Schüler auswählen"}
            {studentDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          {studentDropdownOpen && (
            <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              <div className="p-3 space-y-2">
                <div className="flex items-center space-x-2 p-2 bg-slate-100 dark:bg-slate-600 rounded">
                  <Checkbox id="showAverage" checked={showClassAverage} onCheckedChange={setShowClassAverage} />
                  <Label htmlFor="showAverage" className="text-sm text-slate-200 cursor-pointer font-medium">
                    Klassenschnitt anzeigen
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-slate-100 dark:bg-slate-600 rounded">
                  <Checkbox
                    id="selectAll"
                    checked={selectedStudents.length === studentOptions.length && studentOptions.length > 0}
                    onCheckedChange={handleSelectAllStudents}
                  />
                  <Label htmlFor="selectAll" className="text-sm text-slate-200 cursor-pointer font-medium">
                    Alle auswählen
                  </Label>
                </div>
                <div className="h-px bg-slate-600 my-2"></div>
                {studentOptions.map(student => (
                  <div key={student.value} className="flex items-center space-x-2 p-1 bg-white dark:bg-slate-700">
                    <Checkbox
                      id={student.value}
                      checked={selectedStudents.includes(student.value)}
                      onCheckedChange={(checked) => handleStudentSelection(student.value, checked)}
                    />
                    <Label htmlFor={student.value} className="text-sm text-slate-300 cursor-pointer">
                      {student.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(FiltersSection);