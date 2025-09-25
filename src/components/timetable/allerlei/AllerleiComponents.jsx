import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch"; // Neu importieren für Toggle
import { Trash2, PlusCircle } from "lucide-react";

const WORK_FORMS = [
  { value: 'Single', label: '👤 Single' },
  { value: 'Partner', label: '👥 Partner' },
  { value: 'Group', label: '👨‍👩‍👧‍👦 Group' },
  { value: 'Plenum', label: '🏛️ Plenum' }
];

export const AllerleiStepRow = ({ step, onUpdate, onRemove, maxTime }) => (
  <div className="grid grid-cols-[60px_140px_1fr_1fr_auto] gap-2 items-center">
    <Input
      type="number"
      value={step.time || ''}
      onChange={e => onUpdate('time', e.target.value ? Number(e.target.value) : null)}
      placeholder="Zeit"
      className="text-center bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
      min="0"
      max={maxTime}
    />
    <Select value={step.workForm || ''} onValueChange={val => onUpdate('workForm', val)}>
      <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
        <SelectValue placeholder="Form" />
      </SelectTrigger>
      <SelectContent>
        {WORK_FORMS.map(({ value, label }) => (
          <SelectItem key={value} value={value}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Input
      value={step.activity || ''}
      onChange={e => onUpdate('activity', e.target.value)}
      placeholder="Aktivität / Was wird gemacht"
      className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
    />
    <Input
      value={step.material || ''}
      onChange={e => onUpdate('material', e.target.value)}
      placeholder="Material"
      className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
    />
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={onRemove} 
      className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  </div>
);

export const AllerleiSubjectSelector = ({
  index,
  subject,
  availableSubjects,
  onUpdateSubject,
  onRemoveSubject,
  selectedLesson,
  onSelectLesson,
  availableLessons,
  steps,
  onUpdateStep,
  onRemoveStep,
  onAddStep,
  allLessons, // Neu: Prop hinzufügen
  currentWeek // Neu: Prop hinzufügen
}) => (
  <div className="space-y-2 border rounded-lg p-3 bg-slate-50/50 dark:bg-slate-800/50">
    <div className="flex gap-2 items-center">
      <Select value={subject || ''} onValueChange={value => onUpdateSubject(index, value)}>
        <SelectTrigger className="flex-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
          <SelectValue placeholder="Fach auswählen" />
        </SelectTrigger>
        <SelectContent>
          {availableSubjects.map(s => (
            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button 
        type="button" 
        variant="ghost" 
        size="icon" 
        onClick={() => onRemoveSubject(index)} 
        className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
    
    {subject && (
      <div className="ml-4 space-y-2">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Lektion auswählen</Label>
          <Select value={selectedLesson || ''} onValueChange={value => onSelectLesson(index, value)}>
            <SelectTrigger className="bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
              <SelectValue placeholder="Lektion zum Hinzufügen auswählen" />
            </SelectTrigger>
            <SelectContent>
              {availableLessons.length > 0 ? (
                availableLessons.map(yl => {
                  const isScheduled = allLessons.some(l =>
                    l.yearly_lesson_id === yl.id && l.week_number === currentWeek && !l.is_hidden
                  );
                  return (
                    <SelectItem key={yl.id} value={yl.id}>
                      {yl.name || `Lektion ${yl.lesson_number}`}
                      {yl.notes ? ` - ${yl.notes}` : ''}
                      {isScheduled ? ' (bereits geplant)' : ''}
                    </SelectItem>
                  );
                })
              ) : (
                <SelectItem disabled value="none">Keine verfügbaren Lektionen</SelectItem>
              )}
            </SelectContent>
          </Select>
          {availableLessons.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Alle Lektionen für {subject} sind bereits geplant oder in einer anderen Allerleilektion enthalten.
            </p>
          )}
        </div>
        
        {selectedLesson && steps?.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-900 dark:text-white">Schritte für {subject}</Label>
            <div className="space-y-3 p-4 border rounded-lg bg-white/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
              {steps.map(step => (
                <AllerleiStepRow
                  key={step.id}
                  step={step}
                  onUpdate={(field, value) => onUpdateStep(index, step.id, field, value)}
                  onRemove={() => onRemoveStep(index, step.id)}
                  maxTime={45}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => onAddStep(index)}
                className="w-full mt-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                <span className="text-slate-900 dark:text-white">Schritt hinzufügen</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);

export const AllerleiToggleSection = ({ isAllerlei, onToggle, className = "" }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <Switch
      id="allerlei"
      checked={isAllerlei}
      onCheckedChange={onToggle}
    />
    <Label htmlFor="allerlei" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">
      Allerleilektion
    </Label>
  </div>
);