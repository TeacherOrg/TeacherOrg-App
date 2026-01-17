import { useState, useCallback, useEffect } from 'react';
import { CompetencyGoal } from '@/api/entities';
import pb from '@/api/pb';
import { toast } from 'sonner';

/**
 * Hook for managing goals across all students in a class (Teacher view)
 * @param {Array} students - Array of student objects for the class
 * @param {Function} awardCurrencyFn - Function to award currency to a student
 * @returns {Object} Goal operations and state
 */
export function useClassGoals(students = [], awardCurrencyFn) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentUser = pb.authStore.model;
  const studentIds = students.map(s => s.id);

  /**
   * Fetch all goals for the class students
   */
  const fetchGoals = useCallback(async () => {
    if (!studentIds.length) {
      setGoals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build filter for all student IDs
      const filterParts = studentIds.map(id => `student_id="${id}"`);
      const filter = `(${filterParts.join(' || ')})`;

      const allGoals = await CompetencyGoal.list({
        filter,
        sort: '-created'
      });

      setGoals(allGoals);
    } catch (err) {
      console.error('Error fetching class goals:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studentIds.join(',')]);

  // Load goals on mount and when students change
  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  /**
   * Get active goals (not completed and not rejected)
   */
  const getActiveGoals = useCallback(() => {
    return goals.filter(g => !g.is_completed && !g.is_rejected);
  }, [goals]);

  /**
   * Get history (completed or rejected goals)
   */
  const getHistoryGoals = useCallback((limit = 20) => {
    return goals
      .filter(g => g.is_completed || g.is_rejected)
      .sort((a, b) => {
        const dateA = new Date(a.completed_date || a.rejected_date || a.created);
        const dateB = new Date(b.completed_date || b.rejected_date || b.created);
        return dateB - dateA;
      })
      .slice(0, limit);
  }, [goals]);

  /**
   * Get student name by ID
   */
  const getStudentName = useCallback((studentId) => {
    const student = students.find(s => s.id === studentId);
    return student?.name || 'Unbekannt';
  }, [students]);

  /**
   * Mark a goal as completed and award currency
   */
  const markGoalCompleted = useCallback(async (goal) => {
    if (!goal?.id) return { success: false };

    try {
      const today = new Date().toISOString().split('T')[0];

      await CompetencyGoal.update(goal.id, {
        is_completed: true,
        completed_date: today,
        completed_by: currentUser.id
      });

      // Award currency (use goal's coin_reward or default 2)
      const coinAmount = goal.coin_reward ?? 2;
      if (awardCurrencyFn && !goal.is_bounty && coinAmount > 0) {
        try {
          await awardCurrencyFn(
            goal.student_id,
            coinAmount,
            'goal',
            goal.id,
            `Ziel erreicht: ${goal.goal_text?.substring(0, 50) || 'Ziel'}`
          );
        } catch (currencyError) {
          console.error('Error awarding currency:', currencyError);
        }
      }

      toast.success('Ziel als erledigt markiert');
      await fetchGoals();
      return { success: true };
    } catch (err) {
      console.error('Error completing goal:', err);
      toast.error('Fehler beim Aktualisieren');
      return { success: false, error: err.message };
    }
  }, [currentUser?.id, awardCurrencyFn, fetchGoals]);

  /**
   * Reject a goal
   */
  const rejectGoal = useCallback(async (goal) => {
    if (!goal?.id) return { success: false };

    try {
      const today = new Date().toISOString().split('T')[0];

      await CompetencyGoal.update(goal.id, {
        is_rejected: true,
        rejected_date: today,
        rejected_by: currentUser.id
      });

      toast.success('Ziel abgelehnt');
      await fetchGoals();
      return { success: true };
    } catch (err) {
      console.error('Error rejecting goal:', err);
      toast.error('Fehler beim Ablehnen');
      return { success: false, error: err.message };
    }
  }, [currentUser?.id, fetchGoals]);

  /**
   * Delete a goal
   */
  const deleteGoal = useCallback(async (goal) => {
    if (!goal?.id) return { success: false };

    try {
      await CompetencyGoal.delete(goal.id);
      toast.success('Ziel gelöscht');
      await fetchGoals();
      return { success: true };
    } catch (err) {
      console.error('Error deleting goal:', err);
      toast.error('Fehler beim Löschen');
      return { success: false, error: err.message };
    }
  }, [fetchGoals]);

  /**
   * Create a new goal for a student (teacher-created)
   * @param {string} studentId - Student ID
   * @param {string} goalText - Goal text
   * @param {number} coinReward - Coin reward for completing (default: 2)
   */
  const createGoalForStudent = useCallback(async (studentId, goalText, coinReward = 2) => {
    if (!studentId || !goalText?.trim()) {
      toast.error('Bitte Schüler und Zieltext angeben');
      return { success: false };
    }

    if (goalText.length > 500) {
      toast.error('Ziel zu lang (max. 500 Zeichen)');
      return { success: false };
    }

    try {
      await CompetencyGoal.create({
        student_id: studentId,
        competency_id: null,
        goal_text: goalText.trim(),
        created_by: currentUser.id,
        creator_role: 'teacher',
        is_completed: false,
        completed_date: null,
        completed_by: null,
        is_rejected: false,
        rejected_date: null,
        rejected_by: null,
        coin_reward: coinReward
      });

      toast.success('Ziel erstellt');
      await fetchGoals();
      return { success: true };
    } catch (err) {
      console.error('Error creating goal:', err);
      toast.error('Fehler beim Erstellen');
      return { success: false, error: err.message };
    }
  }, [currentUser?.id, fetchGoals]);

  return {
    goals,
    loading,
    error,
    fetchGoals,
    getActiveGoals,
    getHistoryGoals,
    getStudentName,
    markGoalCompleted,
    rejectGoal,
    deleteGoal,
    createGoalForStudent
  };
}

export default useClassGoals;
