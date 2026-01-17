import React, { useState, useMemo, useEffect } from 'react';
import { Target, Check, X, Trash2, Plus, Loader2, History, User, GraduationCap, Coins } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClassGoals } from './hooks/useClassGoals';
import { useStudentSortPreference } from '@/hooks/useStudentSortPreference';
import { sortStudents } from '@/utils/studentSortUtils';

/**
 * GoalsOverview - View and manage student goals (Teacher view)
 */
export default function GoalsOverview({ students = [], awardCurrencyFn }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [coinReward, setCoinReward] = useState(2);
  const [isCreating, setIsCreating] = useState(false);
  const [sortPreference] = useStudentSortPreference();

  // Escape key handler for modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showCreateModal && !isCreating) {
        setShowCreateModal(false);
        setSelectedStudents([]);
        setNewGoalText('');
        setCoinReward(2);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showCreateModal, isCreating]);

  const {
    loading,
    getActiveGoals,
    getHistoryGoals,
    getStudentName,
    markGoalCompleted,
    rejectGoal,
    deleteGoal,
    createGoalForStudent
  } = useClassGoals(students, awardCurrencyFn);

  const activeGoals = getActiveGoals();
  const historyGoals = getHistoryGoals(20);

  // Sort students for dropdown
  const sortedStudents = useMemo(() =>
    sortStudents(students, sortPreference),
    [students, sortPreference]
  );

  // Sort active goals by student name
  const sortedActiveGoals = useMemo(() => {
    return [...activeGoals].sort((a, b) => {
      const nameA = getStudentName(a.student_id);
      const nameB = getStudentName(b.student_id);
      return nameA.localeCompare(nameB, 'de');
    });
  }, [activeGoals, getStudentName]);

  // Student selection helpers
  const toggleStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAll = () => setSelectedStudents(sortedStudents.map(s => s.id));
  const selectNone = () => setSelectedStudents([]);

  const handleCreateGoal = async () => {
    if (selectedStudents.length === 0 || !newGoalText.trim()) return;

    setIsCreating(true);
    let successCount = 0;

    for (const studentId of selectedStudents) {
      const result = await createGoalForStudent(studentId, newGoalText, coinReward);
      if (result.success) successCount++;
    }

    setIsCreating(false);

    if (successCount > 0) {
      setShowCreateModal(false);
      setSelectedStudents([]);
      setNewGoalText('');
      setCoinReward(2);
    }
  };

  const handleComplete = async (goal) => {
    await markGoalCompleted(goal);
  };

  const handleReject = async (goal) => {
    await rejectGoal(goal);
  };

  const handleDelete = async (goal) => {
    if (window.confirm('Ziel wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      await deleteGoal(goal);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Goal Button */}
      <Button
        onClick={() => setShowCreateModal(true)}
        className="w-full sm:w-auto"
      >
        <Plus className="w-4 h-4 mr-2" />
        Neues Ziel erstellen
      </Button>

      {/* Active Goals */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-500" />
          Aktive Ziele ({activeGoals.length})
        </h3>

        {activeGoals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              Keine aktiven Ziele
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[45vh] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <th className="text-left p-3 font-medium">Schüler</th>
                      <th className="text-left p-3 font-medium">Ziel</th>
                      <th className="text-center p-3 font-medium w-20">Coins</th>
                      <th className="text-center p-3 font-medium w-24">Erstellt von</th>
                      <th className="text-right p-3 font-medium w-36">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {sortedActiveGoals.map(goal => (
                      <tr key={goal.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3">
                          <div className="font-medium">{getStudentName(goal.student_id)}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm text-slate-700 dark:text-slate-300">
                            {goal.goal_text}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                            <Coins className="w-4 h-4" />
                            {goal.coin_reward ?? 2}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {goal.creator_role === 'student' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              <User className="w-3 h-3" />
                              Schüler
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              <GraduationCap className="w-3 h-3" />
                              Lehrer
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                              onClick={() => handleComplete(goal)}
                              title="Als erledigt markieren"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                              onClick={() => handleReject(goal)}
                              title="Ablehnen"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => handleDelete(goal)}
                              title="Löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* History */}
      {historyGoals.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-600">
            <History className="w-5 h-5" />
            Verlauf (letzte 20)
          </h3>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y dark:divide-slate-700 max-h-[35vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {historyGoals.map(goal => {
                  const isCompleted = goal.is_completed;
                  const StatusIcon = isCompleted ? Check : X;
                  const date = goal.completed_date || goal.rejected_date;

                  return (
                    <div key={goal.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{getStudentName(goal.student_id)}</span>
                          <span className="text-slate-500"> - </span>
                          <span className="text-slate-600 dark:text-slate-400 truncate">
                            {goal.goal_text?.substring(0, 50)}{goal.goal_text?.length > 50 ? '...' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm text-slate-500">
                          {date && new Date(date).toLocaleDateString('de-DE', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                        <div className={`
                          flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                          ${isCompleted
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          }
                        `}>
                          <StatusIcon className="w-3 h-3" />
                          {isCompleted ? 'Erledigt' : 'Abgelehnt'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Neues Ziel erstellen
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Schüler ({selectedStudents.length} ausgewählt)</label>
                    <div className="flex gap-2 text-xs">
                      <button onClick={selectAll} className="text-purple-600 hover:underline">
                        Alle
                      </button>
                      <span className="text-slate-400">|</span>
                      <button onClick={selectNone} className="text-purple-600 hover:underline">
                        Keine
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[40vh] overflow-y-auto space-y-1 border rounded-lg p-2 dark:border-slate-700">
                    {sortedStudents.map(student => {
                      const isSelected = selectedStudents.includes(student.id);
                      return (
                        <button
                          key={student.id}
                          onClick={() => toggleStudent(student.id)}
                          className={`
                            w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left
                            ${isSelected
                              ? 'bg-purple-100 dark:bg-purple-900/30'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                            }
                          `}
                        >
                          <div className={`
                            w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                            ${isSelected
                              ? 'bg-purple-600 border-purple-600'
                              : 'border-slate-300 dark:border-slate-600'
                            }
                          `}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="font-medium">{student.name}</span>
                        </button>
                      );
                    })}
                    {sortedStudents.length === 0 && (
                      <p className="text-center text-slate-500 py-4">
                        Keine Schüler in dieser Klasse
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Ziel</label>
                  <Input
                    value={newGoalText}
                    onChange={(e) => setNewGoalText(e.target.value)}
                    placeholder="z.B. Hausaufgaben pünktlich abgeben"
                    maxLength={500}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {newGoalText.length}/500 Zeichen
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 flex items-center gap-1">
                    <Coins className="w-4 h-4 text-amber-500" />
                    Belohnung (Coins)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={coinReward}
                    onChange={(e) => setCoinReward(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Coins bei Erreichen des Ziels
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleCreateGoal}
                    disabled={selectedStudents.length === 0 || !newGoalText.trim() || isCreating}
                    className="flex-1"
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {selectedStudents.length > 1 ? `${selectedStudents.length} Ziele erstellen` : 'Erstellen'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedStudents([]);
                      setNewGoalText('');
                      setCoinReward(2);
                    }}
                    disabled={isCreating}
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
