import React, { useState } from 'react';
import { Check, Plus, Trash2, User, GraduationCap, Edit2, X, Loader2, RotateCcw, XCircle, Coins } from 'lucide-react';
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
  const [coinReward, setCoinReward] = useState(2);
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
    // Students use default coins (2), teachers can set custom
    const coins = isStudent ? 2 : coinReward;
    const result = await goalOps.createGoal(compId, newGoalText, coins);
    if (result.success) {
      setNewGoalText('');
      setSelectedCompetency('');
      setCoinReward(2);
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

  // Filter active and rejected goals
  const activeGoals = goals.filter(g => !g.is_rejected);
  const rejectedGoals = goals.filter(g => g.is_rejected && !g.is_completed);

  if (activeGoals.length === 0 && rejectedGoals.length === 0 && !showAddButton) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>Keine Ziele vorhanden</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Active Goals list */}
      {activeGoals.map(goal => (
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

                  {/* Coin reward */}
                  <span className="text-xs px-1.5 py-0.5 rounded flex items-center gap-1 bg-amber-500/20 text-amber-400">
                    <Coins className="w-3 h-3" />
                    {goal.coin_reward ?? 2}
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

              {/* Coin reward input - only for teachers */}
              {!isStudent && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-400 flex items-center gap-1">
                    <Coins className="w-4 h-4 text-amber-400" />
                    Belohnung:
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={coinReward}
                    onChange={e => setCoinReward(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 h-8 bg-slate-800 border-slate-600 text-center"
                  />
                  <span className="text-xs text-slate-500">Coins</span>
                </div>
              )}

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

      {/* Rejected Goals Section */}
      {rejectedGoals.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-700">
          <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-orange-400" />
            Abgelehnte Ziele ({rejectedGoals.length})
          </h4>
          <div className="space-y-2">
            {rejectedGoals.map(goal => (
              <div
                key={goal.id}
                className="goal-item flex items-start gap-3 opacity-60 bg-orange-900/10 border border-orange-500/20"
              >
                {/* Rejected icon */}
                <div className="mt-1 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center bg-orange-500/20 text-orange-400">
                  <X className="w-3 h-3" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-400">{goal.goal_text}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Abgelehnt
                    </span>
                    {goal.rejected_date && (
                      <span className="text-xs text-slate-500">
                        {new Date(goal.rejected_date).toLocaleDateString('de-DE')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reactivate Button */}
                {isStudent && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => goalOps.reactivateGoal(goal)}
                    className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/20"
                    title="Ziel reaktivieren"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reaktivieren
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
