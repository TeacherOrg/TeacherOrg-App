import { useState, useEffect, useCallback } from 'react';
import { AchievementReward } from '@/api/entities';
import pb from '@/api/pb';
import { toast } from 'sonner';

// Default rewards by tier
const DEFAULT_REWARDS = {
  common: 10,
  rare: 20,
  epic: 30,
  legendary: 45
};

/**
 * Hook for managing achievement coin rewards
 * Allows teachers to customize how many coins students get for each achievement
 */
export function useAchievementRewards() {
  const user = pb.authStore.model;
  const [rewards, setRewards] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load saved rewards from database
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const loadRewards = async () => {
      try {
        const data = await AchievementReward.filter({ user_id: user.id });
        const rewardsMap = data.reduce((acc, r) => {
          acc[r.achievement_id] = r.coins;
          return acc;
        }, {});
        setRewards(rewardsMap);
      } catch (error) {
        console.error('Failed to load achievement rewards:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRewards();
  }, [user?.id]);

  /**
   * Get reward for an achievement (custom or default)
   * @param {string} achievementId - The achievement ID
   * @param {string} tier - The achievement tier (common, rare, epic, legendary)
   * @returns {number} The coin reward
   */
  const getReward = useCallback((achievementId, tier) => {
    if (rewards[achievementId] !== undefined) {
      return rewards[achievementId];
    }
    return DEFAULT_REWARDS[tier] || 1;
  }, [rewards]);

  /**
   * Update reward for an achievement
   * @param {string} achievementId - The achievement ID
   * @param {number} coins - The new coin reward
   */
  const updateReward = async (achievementId, coins) => {
    if (!user?.id) return;

    try {
      // Check if entry exists
      const existing = await AchievementReward.filter({
        user_id: user.id,
        achievement_id: achievementId
      });

      if (existing.length > 0) {
        await AchievementReward.update(existing[0].id, { coins });
      } else {
        await AchievementReward.create({
          achievement_id: achievementId,
          coins,
          user_id: user.id
        });
      }

      setRewards(prev => ({ ...prev, [achievementId]: coins }));
      toast.success('Belohnung aktualisiert');
    } catch (error) {
      console.error('Failed to update achievement reward:', error);
      toast.error('Fehler beim Speichern');
      throw error;
    }
  };

  /**
   * Reset reward to default for an achievement
   * @param {string} achievementId - The achievement ID
   * @param {string} tier - The achievement tier
   */
  const resetReward = async (achievementId, tier) => {
    if (!user?.id) return;

    try {
      const existing = await AchievementReward.filter({
        user_id: user.id,
        achievement_id: achievementId
      });

      if (existing.length > 0) {
        await AchievementReward.delete(existing[0].id);
      }

      setRewards(prev => {
        const newRewards = { ...prev };
        delete newRewards[achievementId];
        return newRewards;
      });
      toast.success('Auf Standard zurückgesetzt');
    } catch (error) {
      console.error('Failed to reset achievement reward:', error);
      toast.error('Fehler beim Zurücksetzen');
      throw error;
    }
  };

  return {
    rewards,
    getReward,
    updateReward,
    resetReward,
    isLoading,
    DEFAULT_REWARDS
  };
}
