import React, { useState } from 'react';
import { Check, Plus, Trash2, User, GraduationCap, Edit2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Goals list component with add/edit/complete functionality
 *
 * @param {Array} goals - List of goals
 * @param {Array} competencies - List of competencies for labels
 * @param {Object} goalOps - Goal operations from useCompetencyGoals
 * @param {boolean} isStudent - Whether current user is a student
 * @param {boolean} showAddButton - Show the add goal button
 */
export default function GoalsList({
  goals = [],
  competencies = [],
  goalOps,
  isStudent = true,
  showAddButton = true
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');
  const [selectedCompetency, setSelectedCompetency] = useState('');
  const [editingGoal, setEditingGoal] = useState(null);
  const [editText, setEditText] = useState('');

  const getCompetencyName = (compId) => {
    if (!compId) return 'Allgemein';
    const comp = competencies.find(c => c.id === compId);
    return comp?.name || 'Unbekannt';
  };

  const handleAddGoal = async () => {
    if (!newGoalText.trim()) return;

    // selectedCompetency kann leer sein für allgemeine Ziele
    const compId = selectedCompetency === '__general__' ? null : selectedCompetency;
    const result = await goalOps.createGoal(compId, newGoalText);
    if (result.success) {
      setNewGoalText('');
      setSelectedCompetency('');
      setShowAddForm(false);
    }
  };

  const handleEditSave = async (goalId) => {
    if (!editText.trim()) return;

    const result = await goalOps.updateGoalText(goalId, editText);
    if (result.success) {
      setEditingGoal(null);
      setEditText('');
    }
  };

  const canDelete = (goal) => {
    // Teachers can delete anything, students only their own
    if (!isStudent) return true;
    return goal.creator_role === 'student';
  };

  if (goals.length === 0 && !showAddButton) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>Keine Ziele vorhanden</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Goals list */}
      {goals.map(goal => (
        <div
          key={goal.id}
          className={`goal-item flex items-start gap-3 ${goal.is_completed ? 'completed' : ''}`}
        >
          {/* Checkbox */}
          <button
            onClick={() => goalOps.toggleGoalComplete(goal)}
            className={`
              mt-1 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center
              transition-all duration-300
              ${goal.is_completed
                ? 'bg-green-500 border-green-500 goal-check'
                : 'border-slate-500 hover:border-purple-400'
              }
            `}
          >
            {goal.is_completed && <Check className="w-3 h-3 text-white" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {editingGoal === goal.id ? (
              <div className="flex gap-2">
                <Input
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="h-8 text-sm bg-slate-800 border-slate-600"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => handleEditSave(goal.id)}
                  className="h-8 bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingGoal(null)}
                  className="h-8"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <>
                <p className={`text-sm ${goal.is_completed ? 'text-slate-400 line-through' : 'text-white'}`}>
                  {goal.goal_text}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {/* Competency label */}
                  <span className={`text-xs ${goal.competency_id ? 'text-purple-400' : 'text-emerald-400'}`}>
                    {getCompetencyName(goal.competency_id)}
                  </span>

                  {/* Creator indicator - als Badge */}
                  <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
                    goal.creator_role === 'teacher'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-slate-600/40 text-slate-400'
                  }`}>
                    {goal.creator_role === 'teacher' ? (
                      <><GraduationCap className="w-3 h-3" /> Lehrerziel</>
                    ) : (
                      <><User className="w-3 h-3" /> Mein Ziel</>
                    )}
                  </span>

                  {/* Completion date */}
                  {goal.is_completed && goal.completed_date && (
                    <span className="text-xs text-green-400">
                      {new Date(goal.completed_date).toLocaleDateString('de-DE')}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          {!goal.is_completed && editingGoal !== goal.id && (
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => {
                  setEditingGoal(goal.id);
                  setEditText(goal.goal_text);
                }}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Bearbeiten"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              {canDelete(goal) && (
                <button
                  onClick={() => goalOps.deleteGoal(goal)}
                  className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                  title="Löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add Goal Form */}
      {showAddButton && (
        <>
          {showAddForm ? (
            <div className="goal-item space-y-3">
              <select
                value={selectedCompetency}
                onChange={e => setSelectedCompetency(e.target.value)}
                className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-white text-sm"
              >
                <option value="">Kategorie auswählen...</option>
                <option value="__general__">🎯 Allgemeines Ziel</option>
                {competencies.map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>

              <Input
                value={newGoalText}
                onChange={e => setNewGoalText(e.target.value)}
                placeholder="Dein Ziel..."
                className="bg-slate-800 border-slate-600"
                maxLength={500}
              />

              <div className="flex gap-2">
                <Button
                  onClick={handleAddGoal}
                  disabled={!newGoalText.trim() || goalOps.loading}
                  className="bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  {goalOps.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><Plus className="w-4 h-4 mr-1" /> Ziel erstellen</>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewGoalText('');
                    setSelectedCompetency('');
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full p-3 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-purple-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Neues Ziel hinzufügen
            </button>
          )}
        </>
      )}
    </div>
  );
}
