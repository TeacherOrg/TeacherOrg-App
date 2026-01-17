import { useState, useCallback } from 'react';
import { CompetencyGoal } from '@/api/entities';
import pb from '@/api/pb';
import toast from 'react-hot-toast';

/**
 * Hook for managing competency goals
 * Both students and teachers can create goals
 * Both can mark goals as completed
 *
 * @param {string} studentId - The student ID
 * @param {Function} onUpdate - Callback after successful update
 * @param {Object} options - Optional configuration
 * @param {Function} options.onGoalCompleted - Callback when goal is completed (for currency award)
 * @returns {Object} Goal operations and state
 */
export function useCompetencyGoals(studentId, onUpdate, options = {}) {
  const { onGoalCompleted } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentUser = pb.authStore.model;
  const isStudent = currentUser?.role === 'student';
  const creatorRole = isStudent ? 'student' : 'teacher';

  /**
   * Create a new goal (optionally linked to a competency)
   * @param {string|null} competencyId - The competency this goal is for (null for independent goals)
   * @param {string} goalText - The goal description
   * @param {number} coinReward - Coin reward for completing (default: 2)
   */
  const createGoal = useCallback(async (competencyId, goalText, coinReward = 2) => {
    if (!studentId || !goalText?.trim()) {
      toast.error('Bitte Zieltext eingeben');
      return { success: false };
    }

    if (goalText.length > 500) {
      toast.error('Ziel zu lang (max. 500 Zeichen)');
      return { success: false };
    }

    setLoading(true);
    setError(null);

    try {
      await CompetencyGoal.create({
        student_id: studentId,
        competency_id: competencyId || null, // Kann null sein für unabhängige Ziele
        goal_text: goalText.trim(),
        created_by: currentUser.id,
        creator_role: creatorRole,
        is_completed: false,
        completed_date: null,
        completed_by: null,
        coin_reward: coinReward
      });

      toast.success('Ziel erstellt');

      if (onUpdate) {
        await onUpdate();
      }

      return { success: true };
    } catch (err) {
      console.error('Error creating goal:', err);
      setError(err.message);
      toast.error('Fehler beim Erstellen');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [studentId, currentUser?.id, creatorRole, onUpdate]);

  /**
   * Toggle goal completion status
   * @param {Object} goal - The goal to toggle
   */
  const toggleGoalComplete = useCallback(async (goal) => {
    if (!goal?.id) {
      return { success: false };
    }

    setLoading(true);
    setError(null);

    try {
      const newCompleted = !goal.is_completed;
      const today = new Date().toISOString().split('T')[0];

      await CompetencyGoal.update(goal.id, {
        is_completed: newCompleted,
        completed_date: newCompleted ? today : null,
        completed_by: newCompleted ? currentUser.id : null
      });

      if (newCompleted) {
        toast.success('Ziel erreicht!');

        // Award currency for goal completion (if callback provided)
        // Only award if this is a newly completed goal (not a bounty goal which handles its own currency)
        if (onGoalCompleted && !goal.is_bounty) {
          try {
            await onGoalCompleted(goal.id, goal.goal_text, goal.coin_reward);
          } catch (currencyError) {
            console.error('Error awarding currency:', currencyError);
            // Don't fail the goal completion if currency fails
          }
        }
      } else {
        toast.success('Als offen markiert');
      }

      if (onUpdate) {
        await onUpdate();
      }

      return { success: true };
    } catch (err) {
      console.error('Error toggling goal:', err);
      setError(err.message);
      toast.error('Fehler beim Aktualisieren');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, onUpdate]);

  /**
   * Update goal text
   * @param {string} goalId - The goal to update
   * @param {string} newText - New goal text
   */
  const updateGoalText = useCallback(async (goalId, newText) => {
    if (!goalId || !newText?.trim()) {
      return { success: false };
    }

    setLoading(true);

    try {
      await CompetencyGoal.update(goalId, {
        goal_text: newText.trim()
      });

      toast.success('Ziel aktualisiert');

      if (onUpdate) {
        await onUpdate();
      }

      return { success: true };
    } catch (err) {
      console.error('Error updating goal:', err);
      toast.error('Fehler beim Aktualisieren');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [onUpdate]);

  /**
   * Delete a goal
   * Students can only delete their own goals
   * Teachers can delete any goal
   * @param {Object} goal - The goal to delete
   */
  const deleteGoal = useCallback(async (goal) => {
    if (!goal?.id) {
      return { success: false };
    }

    // Permission check for students
    if (isStudent && goal.creator_role !== 'student') {
      toast.error('Du kannst nur deine eigenen Ziele löschen');
      return { success: false };
    }

    setLoading(true);

    try {
      await CompetencyGoal.delete(goal.id);
      toast.success('Ziel gelöscht');

      if (onUpdate) {
        await onUpdate();
      }

      return { success: true };
    } catch (err) {
      console.error('Error deleting goal:', err);
      toast.error('Fehler beim Löschen');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [isStudent, onUpdate]);

  /**
   * Get goals grouped by competency
   * @param {Array} goals - All goals
   * @returns {Object} Goals grouped by competency_id
   */
  const getGoalsByCompetency = useCallback((goals) => {
    return goals.reduce((acc, goal) => {
      if (!acc[goal.competency_id]) {
        acc[goal.competency_id] = [];
      }
      acc[goal.competency_id].push(goal);
      return acc;
    }, {});
  }, []);

  /**
   * Get completed goals sorted by completion date
   * @param {Array} goals - All goals
   * @returns {Array} Completed goals sorted newest first
   */
  const getCompletedGoals = useCallback((goals) => {
    return goals
      .filter(g => g.is_completed)
      .sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date));
  }, []);

  /**
   * Get active (not completed and not rejected) goals
   * @param {Array} goals - All goals
   * @returns {Array} Active goals
   */
  const getActiveGoals = useCallback((goals) => {
    return goals.filter(g => !g.is_completed && !g.is_rejected);
  }, []);

  /**
   * Get rejected goals
   * @param {Array} goals - All goals
   * @returns {Array} Rejected goals
   */
  const getRejectedGoals = useCallback((goals) => {
    return goals.filter(g => g.is_rejected && !g.is_completed);
  }, []);

  /**
   * Reactivate a rejected goal (remove rejection)
   * @param {Object} goal - The goal to reactivate
   */
  const reactivateGoal = useCallback(async (goal) => {
    if (!goal?.id) {
      return { success: false };
    }

    setLoading(true);
    setError(null);

    try {
      await CompetencyGoal.update(goal.id, {
        is_rejected: false,
        rejected_date: null,
        rejected_by: null
      });

      toast.success('Ziel reaktiviert');

      if (onUpdate) {
        await onUpdate();
      }

      return { success: true };
    } catch (err) {
      console.error('Error reactivating goal:', err);
      setError(err.message);
      toast.error('Fehler beim Reaktivieren');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [onUpdate]);

  return {
    loading,
    error,
    isStudent,
    creatorRole,
    createGoal,
    toggleGoalComplete,
    updateGoalText,
    deleteGoal,
    reactivateGoal,
    getGoalsByCompetency,
    getCompletedGoals,
    getActiveGoals,
    getRejectedGoals
  };
}

export default useCompetencyGoals;
