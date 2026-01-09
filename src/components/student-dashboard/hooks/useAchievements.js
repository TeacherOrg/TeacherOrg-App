import { useMemo } from 'react';
import {
  achievementDefinitions,
  ACHIEVEMENT_TIERS,
  ACHIEVEMENT_CATEGORIES,
  getTierConfig,
  getCategoryName,
  getAchievementById
} from '../config/achievements';

/**
 * Hook for managing achievement calculations and state
 * @param {Object} studentData - Data from useStudentData hook
 * @returns {Object} Achievement data and groupings
 */
export function useAchievements(studentData) {
  // Calculate achievement progress for all achievements
  const achievements = useMemo(() => {
    if (!studentData) {
      return achievementDefinitions.map(achievement => ({
        ...achievement,
        progress: 0,
        earned: false,
        progressPercent: 0,
        nextTier: achievement.unlocks ? getAchievementById(achievement.unlocks) : null,
        tierConfig: getTierConfig(achievement.tier),
        categoryName: getCategoryName(achievement.category),
        isVisible: false
      }));
    }

    return achievementDefinitions.map(achievement => {
      // Calculate progress using the achievement's calculate function
      const progress = achievement.calculate(studentData);
      const earned = progress >= achievement.target;
      const progressPercent = Math.min((progress / achievement.target) * 100, 100);

      // Get next tier info
      const nextTier = achievement.unlocks ? getAchievementById(achievement.unlocks) : null;

      return {
        ...achievement,
        progress,
        earned,
        progressPercent,
        nextTier,
        tierConfig: getTierConfig(achievement.tier),
        categoryName: getCategoryName(achievement.category),
        isVisible: false // Will be set in visibility calculation
      };
    });
  }, [studentData]);

  // Calculate visibility based on progressive unlocking
  const achievementsWithVisibility = useMemo(() => {
    // Group by category to find previous tiers
    const byCategory = {};
    achievements.forEach(achievement => {
      if (!byCategory[achievement.category]) {
        byCategory[achievement.category] = [];
      }
      byCategory[achievement.category].push(achievement);
    });

    // Sort each category by tier order
    const tierOrder = [
      ACHIEVEMENT_TIERS.COMMON,
      ACHIEVEMENT_TIERS.RARE,
      ACHIEVEMENT_TIERS.EPIC,
      ACHIEVEMENT_TIERS.LEGENDARY
    ];

    Object.keys(byCategory).forEach(category => {
      byCategory[category].sort((a, b) => {
        return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
      });
    });

    // Set visibility: show if earned, or if previous tier is earned, or if it's the first tier
    return achievements.map(achievement => {
      const categoryAchievements = byCategory[achievement.category];
      const currentIndex = categoryAchievements.findIndex(a => a.id === achievement.id);

      let isVisible = false;

      if (currentIndex === 0) {
        // First tier (usually Common) is always visible
        isVisible = true;
      } else if (achievement.earned) {
        // Earned achievements are always visible
        isVisible = true;
      } else {
        // Check if previous tier is earned
        const previousTier = categoryAchievements[currentIndex - 1];
        if (previousTier && previousTier.earned) {
          isVisible = true;
        }
      }

      return {
        ...achievement,
        isVisible
      };
    });
  }, [achievements]);

  // Group achievements by category
  const groupedByCategory = useMemo(() => {
    const grouped = {};

    achievementsWithVisibility.forEach(achievement => {
      if (!grouped[achievement.category]) {
        grouped[achievement.category] = {
          categoryName: achievement.categoryName,
          achievements: []
        };
      }
      grouped[achievement.category].achievements.push(achievement);
    });

    // Sort achievements within each category by tier
    const tierOrder = [
      ACHIEVEMENT_TIERS.COMMON,
      ACHIEVEMENT_TIERS.RARE,
      ACHIEVEMENT_TIERS.EPIC,
      ACHIEVEMENT_TIERS.LEGENDARY
    ];

    Object.keys(grouped).forEach(category => {
      grouped[category].achievements.sort((a, b) => {
        return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
      });
    });

    return grouped;
  }, [achievementsWithVisibility]);

  // Group achievements by tier
  const groupedByTier = useMemo(() => {
    const grouped = {
      [ACHIEVEMENT_TIERS.COMMON]: [],
      [ACHIEVEMENT_TIERS.RARE]: [],
      [ACHIEVEMENT_TIERS.EPIC]: [],
      [ACHIEVEMENT_TIERS.LEGENDARY]: []
    };

    achievementsWithVisibility.forEach(achievement => {
      if (grouped[achievement.tier]) {
        grouped[achievement.tier].push(achievement);
      }
    });

    return grouped;
  }, [achievementsWithVisibility]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = achievementsWithVisibility.length;
    const earned = achievementsWithVisibility.filter(a => a.earned).length;
    const visible = achievementsWithVisibility.filter(a => a.isVisible).length;

    // Count by tier
    const byTier = {
      [ACHIEVEMENT_TIERS.COMMON]: {
        total: achievementsWithVisibility.filter(a => a.tier === ACHIEVEMENT_TIERS.COMMON).length,
        earned: achievementsWithVisibility.filter(a => a.tier === ACHIEVEMENT_TIERS.COMMON && a.earned).length
      },
      [ACHIEVEMENT_TIERS.RARE]: {
        total: achievementsWithVisibility.filter(a => a.tier === ACHIEVEMENT_TIERS.RARE).length,
        earned: achievementsWithVisibility.filter(a => a.tier === ACHIEVEMENT_TIERS.RARE && a.earned).length
      },
      [ACHIEVEMENT_TIERS.EPIC]: {
        total: achievementsWithVisibility.filter(a => a.tier === ACHIEVEMENT_TIERS.EPIC).length,
        earned: achievementsWithVisibility.filter(a => a.tier === ACHIEVEMENT_TIERS.EPIC && a.earned).length
      },
      [ACHIEVEMENT_TIERS.LEGENDARY]: {
        total: achievementsWithVisibility.filter(a => a.tier === ACHIEVEMENT_TIERS.LEGENDARY).length,
        earned: achievementsWithVisibility.filter(a => a.tier === ACHIEVEMENT_TIERS.LEGENDARY && a.earned).length
      }
    };

    // Count by category
    const byCategory = {};
    Object.keys(ACHIEVEMENT_CATEGORIES).forEach(key => {
      const category = ACHIEVEMENT_CATEGORIES[key];
      const categoryAchievements = achievementsWithVisibility.filter(a => a.category === category);
      byCategory[category] = {
        total: categoryAchievements.length,
        earned: categoryAchievements.filter(a => a.earned).length,
        visible: categoryAchievements.filter(a => a.isVisible).length
      };
    });

    return {
      total,
      earned,
      visible,
      byTier,
      byCategory,
      completionPercent: total > 0 ? Math.round((earned / total) * 100) : 0
    };
  }, [achievementsWithVisibility]);

  // Get recently earned achievements (for potential notifications)
  const recentlyEarned = useMemo(() => {
    // This would require timestamps, which we don't have yet
    // For now, just return earned achievements
    return achievementsWithVisibility.filter(a => a.earned).slice(0, 5);
  }, [achievementsWithVisibility]);

  // Get achievements in progress (visible, not earned, with > 0 progress)
  const inProgress = useMemo(() => {
    return achievementsWithVisibility
      .filter(a => a.isVisible && !a.earned && a.progress > 0)
      .sort((a, b) => b.progressPercent - a.progressPercent)
      .slice(0, 5);
  }, [achievementsWithVisibility]);

  return {
    // All achievements with calculated data
    achievements: achievementsWithVisibility,

    // Grouped by category
    groupedByCategory,

    // Grouped by tier
    groupedByTier,

    // Statistics
    stats,

    // Convenience lists
    recentlyEarned,
    inProgress,

    // Simple counts
    totalCount: stats.total,
    earnedCount: stats.earned,
    visibleCount: stats.visible
  };
}

/**
 * Hook to get achievements filtered by category
 * @param {Object} studentData - Data from useStudentData
 * @param {string} category - Category to filter by
 * @returns {Array} Filtered achievements
 */
export function useAchievementsByCategory(studentData, category) {
  const { achievements } = useAchievements(studentData);

  return useMemo(() => {
    if (!category || category === 'all') {
      return achievements;
    }
    return achievements.filter(a => a.category === category);
  }, [achievements, category]);
}

/**
 * Hook to get achievements filtered by tier
 * @param {Object} studentData - Data from useStudentData
 * @param {string} tier - Tier to filter by
 * @returns {Array} Filtered achievements
 */
export function useAchievementsByTier(studentData, tier) {
  const { achievements } = useAchievements(studentData);

  return useMemo(() => {
    if (!tier || tier === 'all') {
      return achievements;
    }
    return achievements.filter(a => a.tier === tier);
  }, [achievements, tier]);
}
