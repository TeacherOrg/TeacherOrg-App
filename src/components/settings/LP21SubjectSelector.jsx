import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, ChevronDown, ChevronUp, Star } from 'lucide-react';
import {
  LEHRPLAN_ZYKLEN,
  PREDEFINED_SUBJECTS,
  FACHBEREICHE_KATEGORIEN,
  getSubjectsForZyklus,
  getDefaultLessonsPerWeek,
  groupSubjectsByFachbereich
} from '@/constants/lehrplan21Subjects';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981',
  '#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#64748b'
];

/**
 * LP21SubjectSelector - Komponente zur Auswahl von Lehrplan 21 Fächern
 *
 * Props:
 * - selectedZyklus: string - Der gewählte Zyklus ('zyklus_1', 'zyklus_2', 'zyklus_3')
 * - onZyklusChange: (zyklusId: string) => void - Callback bei Zyklus-Änderung
 * - selectedSubjects: Array - Array von ausgewählten Fächern mit Anpassungen
 * - onSubjectsChange: (subjects: Array) => void - Callback bei Änderung der Fächer
 * - existingSubjectIds: Array - IDs bereits erstellter Fächer (optional, für Settings)
 * - showZyklusSelector: boolean - Ob der Zyklus-Selector angezeigt werden soll (default: true)
 * - compact: boolean - Kompakte Ansicht für SetupWizard (default: false)
 */
const LP21SubjectSelector = ({
  selectedZyklus = 'zyklus_2',
  onZyklusChange,
  selectedSubjects = [],
  onSubjectsChange,
  existingSubjectIds = [],
  showZyklusSelector = true,
  compact = false
}) => {
  const [expandedFachbereiche, setExpandedFachbereiche] = useState({});
  const [editingSubject, setEditingSubject] = useState(null);

  // Fächer für den gewählten Zyklus
  const availableSubjects = useMemo(() => {
    return getSubjectsForZyklus(selectedZyklus);
  }, [selectedZyklus]);

  // Gruppiert nach Fachbereich
  const groupedSubjects = useMemo(() => {
    return groupSubjectsByFachbereich(availableSubjects);
  }, [availableSubjects]);

  // Prüft ob ein Fach ausgewählt ist
  const isSubjectSelected = (lp21Id) => {
    return selectedSubjects.some(s => s.lp21_id === lp21Id);
  };

  // Gibt die angepassten Werte für ein ausgewähltes Fach zurück
  const getSelectedSubjectData = (lp21Id) => {
    return selectedSubjects.find(s => s.lp21_id === lp21Id);
  };

  // Toggle Fach-Auswahl
  const toggleSubject = (subject) => {
    if (isSubjectSelected(subject.lp21_id)) {
      // Entfernen
      onSubjectsChange(selectedSubjects.filter(s => s.lp21_id !== subject.lp21_id));
    } else {
      // Hinzufügen mit Standardwerten
      onSubjectsChange([
        ...selectedSubjects,
        {
          lp21_id: subject.lp21_id,
          name: subject.name,
          color: subject.defaultColor,
          emoji: subject.emoji,
          lessons_per_week: getDefaultLessonsPerWeek(subject.lp21_id, selectedZyklus),
          is_core_subject: subject.is_core_subject || false
        }
      ]);
    }
  };

  // Update eines Fach-Attributs
  const updateSubjectAttribute = (lp21Id, attribute, value) => {
    onSubjectsChange(
      selectedSubjects.map(s =>
        s.lp21_id === lp21Id ? { ...s, [attribute]: value } : s
      )
    );
  };

  // Toggle Fachbereich-Expansion
  const toggleFachbereich = (fachbereichId) => {
    setExpandedFachbereiche(prev => ({
      ...prev,
      [fachbereichId]: !prev[fachbereichId]
    }));
  };

  // Alle Fächer eines Fachbereichs auswählen/abwählen
  const toggleAllInFachbereich = (fachbereichSubjects) => {
    const allSelected = fachbereichSubjects.every(s => isSubjectSelected(s.lp21_id));

    if (allSelected) {
      // Alle abwählen
      const lp21IdsToRemove = fachbereichSubjects.map(s => s.lp21_id);
      onSubjectsChange(selectedSubjects.filter(s => !lp21IdsToRemove.includes(s.lp21_id)));
    } else {
      // Alle auswählen
      const newSubjects = [...selectedSubjects];
      for (const subject of fachbereichSubjects) {
        if (!isSubjectSelected(subject.lp21_id)) {
          newSubjects.push({
            lp21_id: subject.lp21_id,
            name: subject.name,
            color: subject.defaultColor,
            emoji: subject.emoji,
            lessons_per_week: getDefaultLessonsPerWeek(subject.lp21_id, selectedZyklus),
            is_core_subject: subject.is_core_subject || false
          });
        }
      }
      onSubjectsChange(newSubjects);
    }
  };

  return (
    <div className="space-y-4">
      {/* Zyklus-Selector */}
      {showZyklusSelector && (
        <div className="space-y-2">
          <Label className="text-slate-700 dark:text-slate-300">Zyklus auswählen</Label>
          <div className="flex gap-2">
            {Object.values(LEHRPLAN_ZYKLEN).map((zyklus) => (
              <button
                key={zyklus.id}
                type="button"
                onClick={() => onZyklusChange?.(zyklus.id)}
                className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                  selectedZyklus === zyklus.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold">{zyklus.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{zyklus.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fächer nach Fachbereich */}
      <div className="space-y-3">
        {groupedSubjects.map((group) => {
          const isExpanded = expandedFachbereiche[group.id] !== false; // Default: expanded
          const allSelected = group.subjects.every(s => isSubjectSelected(s.lp21_id));
          const someSelected = group.subjects.some(s => isSubjectSelected(s.lp21_id));

          return (
            <div
              key={group.id}
              className="border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden"
            >
              {/* Fachbereich Header */}
              <div
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 cursor-pointer"
                onClick={() => toggleFachbereich(group.id)}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAllInFachbereich(group.subjects);
                    }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      allSelected
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : someSelected
                          ? 'bg-blue-200 border-blue-500'
                          : 'border-slate-400 dark:border-slate-500'
                    }`}
                  >
                    {allSelected && <Check className="w-3 h-3" />}
                  </button>
                  <span className="font-semibold text-slate-900 dark:text-white">{group.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({group.subjects.filter(s => isSubjectSelected(s.lp21_id)).length}/{group.subjects.length})
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>

              {/* Fächer Liste */}
              {isExpanded && (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {group.subjects.map((subject) => {
                    const isSelected = isSubjectSelected(subject.lp21_id);
                    const subjectData = getSelectedSubjectData(subject.lp21_id);
                    const isEditing = editingSubject === subject.lp21_id;

                    return (
                      <div
                        key={subject.lp21_id}
                        className={`p-3 transition-colors ${
                          isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Checkbox */}
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSubject(subject)}
                          />

                          {/* Fach Info */}
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: subjectData?.color || subject.defaultColor }}
                          />
                          <span className="text-xl">{subjectData?.emoji || subject.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900 dark:text-white truncate">
                                {subject.name}
                              </span>
                              {subject.fullName && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:inline">
                                  ({subject.fullName})
                                </span>
                              )}
                              {(subjectData?.is_core_subject || subject.is_core_subject) && isSelected && (
                                <span className="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded flex items-center gap-0.5">
                                  <Star className="w-3 h-3" />
                                  Kernfach
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Lektionen/Woche */}
                          {isSelected && !compact && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                value={subjectData?.lessons_per_week || 4}
                                onChange={(e) => updateSubjectAttribute(subject.lp21_id, 'lessons_per_week', Number(e.target.value))}
                                className="w-16 h-8 text-center bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                              />
                              <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">L/W</span>
                            </div>
                          )}

                          {/* Edit Button */}
                          {isSelected && !compact && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingSubject(isEditing ? null : subject.lp21_id)}
                              className="h-8 px-2"
                            >
                              {isEditing ? 'Fertig' : 'Anpassen'}
                            </Button>
                          )}
                        </div>

                        {/* Expanded Edit Section */}
                        {isSelected && isEditing && (
                          <div className="mt-3 ml-8 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-3">
                            {/* Farbe */}
                            <div>
                              <Label className="text-xs text-slate-600 dark:text-slate-400">Farbe</Label>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {PRESET_COLORS.map((color) => (
                                  <button
                                    key={color}
                                    type="button"
                                    className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                                      subjectData?.color === color
                                        ? 'border-black dark:border-white scale-110'
                                        : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => updateSubjectAttribute(subject.lp21_id, 'color', color)}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Kernfach Toggle */}
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`core-${subject.lp21_id}`}
                                checked={subjectData?.is_core_subject || false}
                                onCheckedChange={(checked) => updateSubjectAttribute(subject.lp21_id, 'is_core_subject', checked)}
                              />
                              <Label htmlFor={`core-${subject.lp21_id}`} className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1 cursor-pointer">
                                <Star className="w-4 h-4 text-amber-500" />
                                Als Kernfach markieren
                              </Label>
                            </div>
                          </div>
                        )}

                        {/* Compact mode: show lessons inline */}
                        {isSelected && compact && (
                          <div className="flex items-center gap-2 mt-2 ml-8">
                            <Label className="text-xs text-slate-500">Lektionen/Woche:</Label>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={subjectData?.lessons_per_week || 4}
                              onChange={(e) => updateSubjectAttribute(subject.lp21_id, 'lessons_per_week', Number(e.target.value))}
                              className="w-14 h-7 text-center text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            Ausgewählte Fächer:
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {selectedSubjects.length} von {availableSubjects.length}
          </span>
        </div>
        {selectedSubjects.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedSubjects.map((s) => (
              <span
                key={s.lp21_id}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
                style={{ backgroundColor: s.color + '20', color: s.color }}
              >
                <span>{s.emoji}</span>
                <span>{s.name}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LP21SubjectSelector;
