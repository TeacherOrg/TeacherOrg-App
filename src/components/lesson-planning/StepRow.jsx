// src/components/lesson-planning/StepRow.jsx
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import MaterialQuickAdd from './MaterialQuickAdd';

const WORK_FORMS = [
  { value: 'frontal', label: '🗣️ Frontal' },
  { value: 'single', label: '👤 Einzelarbeit' },
  { value: 'partner', label: '👥 Partnerarbeit' },
  { value: 'group', label: '👨‍👩‍👧‍👦 Gruppenarbeit' },
  { value: 'plenum', label: '🏛️ Plenum' },
  { value: 'discussion', label: '💬 Diskussion' },
  { value: 'experiment', label: '🧪 Experiment' },
];

const StepRow = ({
  step,
  onUpdate,
  onRemove,
  topicMaterials = [],
  topicColor,
  isLast = false,
  isUnifiedDouble = false,
  lessonDuration = 45,
}) => {
  const [isMaterialFocused, setIsMaterialFocused] = useState(false);

  const showQuickAdd = topicMaterials.length > 0 && (isLast || isMaterialFocused);

  // Calculate max time based on lesson duration and double lesson mode
  const maxTime = isUnifiedDouble ? (lessonDuration * 2) : lessonDuration;

  return (
    <div className="grid grid-cols-[60px_140px_1fr_1fr_auto] gap-2 items-start">
      {/* Zeit */}
      <Input
        type="number"
        value={step.time || ''}
        onChange={(e) => onUpdate('time', e.target.value ? Number(e.target.value) : null)}
        placeholder="Zeit"
        className="text-center bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
        min="0"
        max={maxTime}
      />

      {/* Arbeitsform */}
      <Select value={step.workForm || ''} onValueChange={(val) => onUpdate('workForm', val)}>
        <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
          <SelectValue placeholder="Form" />
        </SelectTrigger>
        <SelectContent>
          {WORK_FORMS.map((form) => (
            <SelectItem key={form.value} value={form.value}>
              {form.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Aktivität */}
      <Input
        value={step.activity || ''}
        onChange={(e) => onUpdate('activity', e.target.value)}
        placeholder="Aktivität / Was wird gemacht"
        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
      />

      {/* Material + QuickAdd */}
      <div className="space-y-1">
        <Input
          value={step.material || ''}
          onChange={(e) => onUpdate('material', e.target.value)}
          onFocus={() => setIsMaterialFocused(true)}
          onBlur={() => setIsMaterialFocused(false)}
          placeholder="Material"
          className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
        />

        {/* QuickAdd mit sanfter Transition */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            showQuickAdd ? 'opacity-100 mt-2 max-h-40' : 'opacity-0 mt-0 max-h-0'
          }`}
        >
          {showQuickAdd && (
            <MaterialQuickAdd
              step={step}
              onUpdate={onUpdate}
              topicMaterials={topicMaterials}
              topicColor={topicColor}
            />
          )}
        </div>
      </div>

      {/* Löschen */}
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
};

export default StepRow;