import { useState, useEffect, useCallback } from 'react';
import { Bounty, BountyCompletion, CompetencyGoal } from '@/api/entities';
import pb from '@/api/pb';

/**
 * Hook for viewing bounties (Student view)
 * @param {string} studentId - The student's ID
 * @param {string} classId - The student's class ID
 */
export function useBounties(studentId, classId) {
  const [activeBounties, setActiveBounties] = useState([]);
  const [completedBounties, setCompletedBounties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBounties = useCallback(async () => {
    try {
      // Load all active bounties
      const allBounties = await Bounty.list({ is_active: true });

      // Filter bounties for this class (or bounties without class restriction)
      const relevantBounties = allBounties.filter(bounty => {
        if (!bounty.class_ids || bounty.class_ids.length === 0) return true;
        return bounty.class_ids.includes(classId);
      });

      // Load student's completions
      if (studentId) {
        const completions = await BountyCompletion.list({ student_id: studentId });
        const completedBountyIds = new Set(completions.map(c => c.bounty_id));

        // Separate active vs completed
        const active = relevantBounties.filter(b => !completedBountyIds.has(b.id));
        const completed = completions.map(completion => {
          const bounty = allBounties.find(b => b.id === completion.bounty_id);
          return {
            ...completion,
            bounty
          };
        });

        setActiveBounties(active);
        setCompletedBounties(completed);
      } else {
        setActiveBounties(relevantBounties);
      }
    } catch (error) {
      console.error('Error loading bounties:', error);
    } finally {
      setIsLoading(false);
    }
  }, [studentId, classId]);

  useEffect(() => {
    loadBounties();
  }, [loadBounties]);

  // Sort bounties by difficulty and reward
  const sortedActiveBounties = [...activeBounties].sort((a, b) => {
    const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
    const diffA = difficultyOrder[a.difficulty] || 2;
    const diffB = difficultyOrder[b.difficulty] || 2;
    if (diffA !== diffB) return diffA - diffB;
    return (b.reward || 0) - (a.reward || 0);
  });

  return {
    activeBounties: sortedActiveBounties,
    completedBounties,
    totalActiveBounties: activeBounties.length,
    totalCompletedBounties: completedBounties.length,
    isLoading,
    refresh: loadBounties
  };
}

/**
 * Hook for managing bounties (Teacher view)
 */
export function useBountyManager() {
  const [bounties, setBounties] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const allBounties = await Bounty.list();
      // Sort by active first, then by created date
      const sortedBounties = allBounties.sort((a, b) => {
        if (a.is_active !== b.is_active) return b.is_active ? 1 : -1;
        return new Date(b.created) - new Date(a.created);
      });
      setBounties(sortedBounties);

      const allCompletions = await BountyCompletion.list();
      setCompletions(allCompletions);
    } catch (error) {
      console.error('Error loading bounty data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Create a new bounty
   */
  const createBounty = useCallback(async (bountyData) => {
    try {
      const newBounty = await Bounty.create({
        ...bountyData,
        is_active: bountyData.is_active !== false,
        class_ids: bountyData.class_ids || [],
        created_at: new Date().toISOString()
      });
      setBounties(prev => [newBounty, ...prev]);
      return newBounty;
    } catch (error) {
      console.error('Error creating bounty:', error);
      throw error;
    }
  }, []);

  /**
   * Update a bounty
   */
  const updateBounty = useCallback(async (bountyId, updates) => {
    try {
      const updated = await Bounty.update(bountyId, updates);
      setBounties(prev => prev.map(b => b.id === bountyId ? updated : b));
      return updated;
    } catch (error) {
      console.error('Error updating bounty:', error);
      throw error;
    }
  }, []);

  /**
   * Delete a bounty
   */
  const deleteBounty = useCallback(async (bountyId) => {
    try {
      await Bounty.delete(bountyId);
      setBounties(prev => prev.filter(b => b.id !== bountyId));
    } catch (error) {
      console.error('Error deleting bounty:', error);
      throw error;
    }
  }, []);

  /**
   * Toggle bounty active status
   */
  const toggleBountyActive = useCallback(async (bountyId) => {
    const bounty = bounties.find(b => b.id === bountyId);
    if (!bounty) return;
    return updateBounty(bountyId, { is_active: !bounty.is_active });
  }, [bounties, updateBounty]);

  /**
   * Complete a bounty for selected students
   * @param {string} bountyId - The bounty ID
   * @param {Array<string>} studentIds - Array of student IDs who completed the bounty
   * @param {Function} awardCurrencyFn - Function to award currency: (studentId, amount, type, refId, desc) => Promise
   */
  const completeBountyForStudents = useCallback(async (bountyId, studentIds, awardCurrencyFn) => {
    const bounty = bounties.find(b => b.id === bountyId);
    if (!bounty) throw new Error('Bounty not found');

    const results = [];

    for (const studentId of studentIds) {
      try {
        // Check if already completed
        const existingCompletion = completions.find(
          c => c.bounty_id === bountyId && c.student_id === studentId
        );
        if (existingCompletion) {
          console.warn(`Student ${studentId} already completed bounty ${bountyId}`);
          continue;
        }

        // Create completion record
        const completion = await BountyCompletion.create({
          bounty_id: bountyId,
          student_id: studentId,
          completed_at: new Date().toISOString(),
          reward_given: bounty.reward,
          approved_by: pb.authStore.model?.id
        });

        // Award currency
        if (awardCurrencyFn && bounty.reward > 0) {
          await awardCurrencyFn(
            studentId,
            bounty.reward,
            'bounty',
            bountyId,
            `Bounty erledigt: ${bounty.title}`
          );
        }

        // Create a goal entry for the student's Ziele tab
        await CompetencyGoal.create({
          student_id: studentId,
          title: bounty.title,
          description: bounty.description || `Bounty: ${bounty.title}`,
          is_completed: true,
          is_bounty: true,
          bounty_id: bountyId,
          completed_at: new Date().toISOString(),
          completed_by: pb.authStore.model?.id,
          created_by: pb.authStore.model?.id
        });

        results.push({ studentId, success: true, completion });
        setCompletions(prev => [...prev, completion]);
      } catch (error) {
        console.error(`Error completing bounty for student ${studentId}:`, error);
        results.push({ studentId, success: false, error });
      }
    }

    return results;
  }, [bounties, completions]);

  /**
   * Get completions for a specific bounty
   */
  const getBountyCompletions = useCallback((bountyId) => {
    return completions.filter(c => c.bounty_id === bountyId);
  }, [completions]);

  /**
   * Get completion count for a bounty
   */
  const getCompletionCount = useCallback((bountyId) => {
    return completions.filter(c => c.bounty_id === bountyId).length;
  }, [completions]);

  // Separate active and archived bounties
  const activeBounties = bounties.filter(b => b.is_active);
  const archivedBounties = bounties.filter(b => !b.is_active);

  return {
    bounties,
    activeBounties,
    archivedBounties,
    completions,
    isLoading,
    createBounty,
    updateBounty,
    deleteBounty,
    toggleBountyActive,
    completeBountyForStudents,
    getBountyCompletions,
    getCompletionCount,
    refresh: loadData
  };
}

export default useBounties;
