import { useMemo, useEffect, useRef } from 'react';
import {
  achievementDefinitions,
  achievementProgressions,
  ACHIEVEMENT_TIERS,
  ACHIEVEMENT_CATEGORIES,
  MAIN_CATEGORIES,
  MAIN_CATEGORY_NAMES,
  CATEGORY_TO_MAIN,
  getTierConfig,
  getCategoryName,
  getAchievementById
} from '../config/achievements';

/**
 * Calculate the state of a single achievement progression
 * Determines current tier, next tier, and completion status
 */
function calculateProgressionState(progression, studentData) {
  // Calculate progress for all tiers in this progression
  const results = progression.tiers.map(tier => {
    const progress = tier.calculate(studentData);
    const earned = progress >= tier.target;
    const progressPercent = Math.min((progress / tier.target) * 100, 100);

    return {
      ...tier,
      progress,
      earned,
      progressPercent,
      tierConfig: getTierConfig(tier.tier),
      studentData // Pass studentData for descriptionInProgress functions
    };
  });

  // Find highest earned tier (iterate from end to start)
  let currentTierIndex = -1;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i].earned) {
      currentTierIndex = i;
      break;
    }
  }

  // If no tier earned, show first tier (lowest)
  if (currentTierIndex === -1) {
    currentTierIndex = 0;
  }

  // Next tier is the one after current (if exists)
  const nextTierIndex = currentTierIndex < results.length - 1 ? currentTierIndex + 1 : null;

  return {
    id: progression.id,
    category: progression.category,
    mainCategory: progression.mainCategory,
    categoryName: getCategoryName(progression.category),
    mainCategoryName: MAIN_CATEGORY_NAMES[progression.mainCategory],

    // Current state
    currentTierIndex,
    currentTier: results[currentTierIndex],

    // Next tier info
    nextTier: nextTierIndex !== null ? results[nextTierIndex] : null,

    // All tiers
    allTiers: results,

    // Summary stats
    highestEarnedTier: currentTierIndex >= 0 && results[currentTierIndex].earned
      ? results[currentTierIndex].tier
      : null,
    totalTiers: results.length,
    earnedTiers: results.filter(r => r.earned).length,
    isComplete: currentTierIndex === results.length - 1 && results[currentTierIndex].earned
  };
}

/**
 * Hook for managing achievement calculations and state
 * @param {Object} studentData - Data from useStudentData hook
 * @param {Object} options - Optional configuration
 * @param {Function} options.onAchievementEarned - Callback when a new achievement is earned (achievement, tier, studentId)
 * @param {string} options.studentId - The student's ID for callback
 * @returns {Object} Achievement data and groupings (both legacy and new progressions)
 */
export function useAchievements(studentData, options = {}) {
  const { onAchievementEarned, studentId } = options;

  // Track previously earned achievement IDs to detect new unlocks
  const prevEarnedRef = useRef(new Set());
  const initializedRef = useRef(false);
  // NEW: Calculate all achievement progressions
  // Two-phase calculation to handle Engagement achievements that depend on Epic/Legendary counts
  const progressions = useMemo(() => {
    if (!studentData) {
      return achievementProgressions.map(progression =>
        calculateProgressionState(progression, {})
      );
    }

    // Phase 1: Calculate all progressions (Engagement will get incomplete counts)
    const phase1 = achievementProgressions.map(progression =>
      calculateProgressionState(progression, studentData)
    );

    // Phase 2: Count earned Epic/Legendary tiers (excluding Engagement to avoid circular dep)
    let epicCount = 0;
    let legendaryCount = 0;

    phase1.forEach(prog => {
      if (prog.category !== ACHIEVEMENT_CATEGORIES.ENGAGEMENT) {
        prog.allTiers.forEach(tier => {
          if (tier.earned) {
            if (tier.tier === ACHIEVEMENT_TIERS.EPIC) epicCount++;
            if (tier.tier === ACHIEVEMENT_TIERS.LEGENDARY) legendaryCount++;
          }
        });
      }
    });

    // Phase 3: Re-calculate Engagement progression with the correct counts
    return phase1.map(prog => {
      if (prog.category === ACHIEVEMENT_CATEGORIES.ENGAGEMENT) {
        const enrichedData = {
          ...studentData,
          epicAchievementsCount: epicCount,
          legendaryAchievementsCount: legendaryCount
        };
        return calculateProgressionState(
          achievementProgressions.find(p => p.id === prog.id),
          enrichedData
        );
      }
      return prog;
    });
  }, [studentData]);

  // NEW: Group progressions by main category
  const groupedByMainCategory = useMemo(() => {
    const grouped = {
      [MAIN_CATEGORIES.FAECHER]: [],
      [MAIN_CATEGORIES.KOMPETENZEN]: []
    };

    progressions.forEach(prog => {
      if (grouped[prog.mainCategory]) {
        grouped[prog.mainCategory].push(prog);
      }
    });

    return grouped;
  }, [progressions]);

  // NEW: Group progressions by subcategory within main category
  const groupedBySubCategory = useMemo(() => {
    const result = {};

    progressions.forEach(prog => {
      // Ensure main category exists
      if (!result[prog.mainCategory]) {
        result[prog.mainCategory] = {};
      }

      // Ensure subcategory exists
      if (!result[prog.mainCategory][prog.category]) {
        result[prog.mainCategory][prog.category] = {
          categoryName: prog.categoryName,
          progressions: []
        };
      }

      result[prog.mainCategory][prog.category].progressions.push(prog);
    });

    return result;
  }, [progressions]);

  // NEW: Statistics for progressions
  const progressionStats = useMemo(() => {
    const totalTiers = progressions.reduce((sum, p) => sum + p.totalTiers, 0);
    const earnedTiers = progressions.reduce((sum, p) => sum + p.earnedTiers, 0);
    const completedProgressions = progressions.filter(p => p.isComplete).length;

    const byMainCategory = {
      [MAIN_CATEGORIES.FAECHER]: {
        total: groupedByMainCategory[MAIN_CATEGORIES.FAECHER].length,
        earned: groupedByMainCategory[MAIN_CATEGORIES.FAECHER].filter(p => p.earnedTiers > 0).length,
        completed: groupedByMainCategory[MAIN_CATEGORIES.FAECHER].filter(p => p.isComplete).length
      },
      [MAIN_CATEGORIES.KOMPETENZEN]: {
        total: groupedByMainCategory[MAIN_CATEGORIES.KOMPETENZEN].length,
        earned: groupedByMainCategory[MAIN_CATEGORIES.KOMPETENZEN].filter(p => p.earnedTiers > 0).length,
        completed: groupedByMainCategory[MAIN_CATEGORIES.KOMPETENZEN].filter(p => p.isComplete).length
      }
    };

    return {
      totalProgressions: progressions.length,
      completedProgressions,
      totalTiers,
      earnedTiers,
      byMainCategory,
      completionPercent: totalTiers > 0 ? Math.round((earnedTiers / totalTiers) * 100) : 0
    };
  }, [progressions, groupedByMainCategory]);

  // LEGACY: Calculate achievement progress for all achievements (kept for backward compatibility)
  // Two-phase calculation to handle Engagement achievements that depend on Epic/Legendary counts
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

    // Phase 1: Calculate all achievements (Engagement will get incomplete counts)
    const phase1 = achievementDefinitions.map(achievement => {
      const progress = achievement.calculate(studentData);
      const earned = progress >= achievement.target;
      const progressPercent = Math.min((progress / achievement.target) * 100, 100);
      const nextTier = achievement.unlocks ? getAchievementById(achievement.unlocks) : null;

      return {
        ...achievement,
        progress,
        earned,
        progressPercent,
        nextTier,
        tierConfig: getTierConfig(achievement.tier),
        categoryName: getCategoryName(achievement.category),
        isVisible: false
      };
    });

    // Phase 2: Count Epic/Legendary achievements (excluding Engagement to avoid circular dep)
    const epicCount = phase1.filter(a =>
      a.tier === ACHIEVEMENT_TIERS.EPIC &&
      a.earned &&
      a.category !== ACHIEVEMENT_CATEGORIES.ENGAGEMENT
    ).length;

    const legendaryCount = phase1.filter(a =>
      a.tier === ACHIEVEMENT_TIERS.LEGENDARY &&
      a.earned &&
      a.category !== ACHIEVEMENT_CATEGORIES.ENGAGEMENT
    ).length;

    // Phase 3: Re-calculate Engagement achievements with the correct counts
    return phase1.map(achievement => {
      if (achievement.category === ACHIEVEMENT_CATEGORIES.ENGAGEMENT) {
        const enrichedData = {
          ...studentData,
          epicAchievementsCount: epicCount,
          legendaryAchievementsCount: legendaryCount
        };
        const progress = achievement.calculate(enrichedData);
        const earned = progress >= achievement.target;
        const progressPercent = Math.min((progress / achievement.target) * 100, 100);

        return {
          ...achievement,
          progress,
          earned,
          progressPercent
        };
      }
      return achievement;
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

  // Effect to detect and report newly earned achievements
  useEffect(() => {
    if (!onAchievementEarned || !studentId) return;

    const currentEarned = achievementsWithVisibility.filter(a => a.earned);

    // On first run, just initialize the set without calling callbacks
    if (!initializedRef.current) {
      currentEarned.forEach(a => prevEarnedRef.current.add(a.id));
      initializedRef.current = true;
      return;
    }

    // Find newly earned achievements (not in previous set)
    const newlyEarned = currentEarned.filter(a => !prevEarnedRef.current.has(a.id));

    // Call callback for each newly earned achievement
    newlyEarned.forEach(achievement => {
      onAchievementEarned(achievement, achievement.tier, studentId);
      prevEarnedRef.current.add(achievement.id);
    });
  }, [achievementsWithVisibility, onAchievementEarned, studentId]);

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

  // NEW: Count earned Epic achievements (excluding Engagement to avoid circular dependency)
  const epicAchievementsCount = useMemo(() => {
    return achievementsWithVisibility.filter(a =>
      a.tier === ACHIEVEMENT_TIERS.EPIC &&
      a.earned &&
      a.category !== ACHIEVEMENT_CATEGORIES.ENGAGEMENT
    ).length;
  }, [achievementsWithVisibility]);

  // NEW: Count earned Legendary achievements (excluding Engagement to avoid circular dependency)
  const legendaryAchievementsCount = useMemo(() => {
    return achievementsWithVisibility.filter(a =>
      a.tier === ACHIEVEMENT_TIERS.LEGENDARY &&
      a.earned &&
      a.category !== ACHIEVEMENT_CATEGORIES.ENGAGEMENT
    ).length;
  }, [achievementsWithVisibility]);

  return {
    // ===== NEW PROGRESSION-BASED DATA =====
    // All progressions with calculated data
    progressions,

    // Grouped by main category (Fächer, Kompetenzen)
    groupedByMainCategory,

    // Grouped by subcategory within main category
    groupedBySubCategory,

    // Progression statistics
    progressionStats,

    // ===== LEGACY ACHIEVEMENT DATA (backward compatibility) =====
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
    visibleCount: stats.visible,

    // Epic and Legendary counts for Engagement achievement
    epicAchievementsCount,
    legendaryAchievementsCount
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
