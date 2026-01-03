import { useState, useCallback } from 'react';
import { StudentSelfAssessment } from '@/api/entities';
import toast from 'react-hot-toast';

/**
 * Hook for managing student self-assessments
 * Provides CRUD operations for self-assessment ratings
 *
 * @param {string} studentId - The student ID
 * @param {Function} onUpdate - Callback after successful update
 * @returns {Object} Self-assessment operations and state
 */
export function useSelfAssessments(studentId, onUpdate) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Create or update a self-assessment for a competency
   * @param {string} competencyId - The competency to rate
   * @param {number} score - Rating from 1-5
   * @param {string} notes - Optional notes/reflection
   */
  const rateSelf = useCallback(async (competencyId, score, notes = '') => {
    if (!studentId || !competencyId) {
      toast.error('Fehlende Daten für die Selbsteinschätzung');
      return { success: false };
    }

    if (score < 1 || score > 5) {
      toast.error('Bewertung muss zwischen 1 und 5 liegen');
      return { success: false };
    }

    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];

      // Create new assessment
      await StudentSelfAssessment.create({
        student_id: studentId,
        competency_id: competencyId,
        self_score: score,
        notes: notes,
        date: today
      });

      toast.success('Selbsteinschätzung gespeichert');

      if (onUpdate) {
        await onUpdate();
      }

      return { success: true };
    } catch (err) {
      console.error('Error saving self-assessment:', err);
      setError(err.message);
      toast.error('Fehler beim Speichern');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [studentId, onUpdate]);

  /**
   * Update an existing self-assessment
   * @param {string} assessmentId - The assessment to update
   * @param {Object} updates - Fields to update {self_score?, notes?}
   */
  const updateAssessment = useCallback(async (assessmentId, updates) => {
    if (!assessmentId) {
      return { success: false };
    }

    setLoading(true);
    setError(null);

    try {
      await StudentSelfAssessment.update(assessmentId, updates);
      toast.success('Aktualisiert');

      if (onUpdate) {
        await onUpdate();
      }

      return { success: true };
    } catch (err) {
      console.error('Error updating self-assessment:', err);
      setError(err.message);
      toast.error('Fehler beim Aktualisieren');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [onUpdate]);

  /**
   * Delete a self-assessment
   * @param {string} assessmentId - The assessment to delete
   */
  const deleteAssessment = useCallback(async (assessmentId) => {
    if (!assessmentId) {
      return { success: false };
    }

    setLoading(true);

    try {
      await StudentSelfAssessment.delete(assessmentId);
      toast.success('Gelöscht');

      if (onUpdate) {
        await onUpdate();
      }

      return { success: true };
    } catch (err) {
      console.error('Error deleting self-assessment:', err);
      toast.error('Fehler beim Löschen');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [onUpdate]);

  /**
   * Get history for a specific competency
   * @param {Array} allAssessments - All self-assessments
   * @param {string} competencyId - The competency to filter
   * @returns {Array} Sorted assessments for this competency
   */
  const getHistoryForCompetency = useCallback((allAssessments, competencyId) => {
    return allAssessments
      .filter(a => a.competency_id === competencyId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, []);

  return {
    loading,
    error,
    rateSelf,
    updateAssessment,
    deleteAssessment,
    getHistoryForCompetency
  };
}

export default useSelfAssessments;
