/**
 * Achievement System Configuration
 * 4-Tier Rarity System: Common (Green) → Rare (Blue) → Epic (Purple) → Legendary (Orange)
 */

export const ACHIEVEMENT_TIERS = {
  COMMON: 'common',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary'
};

export const ACHIEVEMENT_CATEGORIES = {
  GOALS: 'goals',
  CHORES: 'chores',
  IMPROVEMENT: 'improvement',
  GRADES: 'grades',
  COMPETENCY: 'competency',
  CONSISTENCY: 'consistency',
  REFLECTION: 'reflection',
  PERFECTION: 'perfection',
  STREAK: 'streak',
  BREADTH: 'breadth',
  ENGAGEMENT: 'engagement'
};

// Category display names (German)
export const CATEGORY_NAMES = {
  [ACHIEVEMENT_CATEGORIES.GOALS]: 'Ziele',
  [ACHIEVEMENT_CATEGORIES.CHORES]: 'Ämtli-Meisterschaft',
  [ACHIEVEMENT_CATEGORIES.IMPROVEMENT]: 'Schwächen-Eroberung',
  [ACHIEVEMENT_CATEGORIES.GRADES]: 'Exzellenz',
  [ACHIEVEMENT_CATEGORIES.COMPETENCY]: 'Allround-Entwicklung',
  [ACHIEVEMENT_CATEGORIES.CONSISTENCY]: 'Beständigkeit',
  [ACHIEVEMENT_CATEGORIES.REFLECTION]: 'Selbstreflexion',
  [ACHIEVEMENT_CATEGORIES.PERFECTION]: 'Perfektion',
  [ACHIEVEMENT_CATEGORIES.STREAK]: 'Verbesserungsstreak',
  [ACHIEVEMENT_CATEGORIES.BREADTH]: 'Breite des Wissens',
  [ACHIEVEMENT_CATEGORIES.ENGAGEMENT]: 'Engagement'
};

// Tier display configuration
export const TIER_CONFIG = {
  [ACHIEVEMENT_TIERS.COMMON]: {
    displayName: 'Common',
    color: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.4)',
    gradientFrom: 'from-green-500',
    gradientTo: 'to-emerald-500',
    iconSize: 8
  },
  [ACHIEVEMENT_TIERS.RARE]: {
    displayName: 'Rare',
    color: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.5)',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-cyan-500',
    iconSize: 9
  },
  [ACHIEVEMENT_TIERS.EPIC]: {
    displayName: 'Epic',
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-pink-500',
    iconSize: 10
  },
  [ACHIEVEMENT_TIERS.LEGENDARY]: {
    displayName: 'Legendary',
    color: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.7)',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-red-500',
    iconSize: 12
  }
};

/**
 * All achievement definitions
 * Total: 39 achievements across 11 categories
 */
export const achievementDefinitions = [
  // ============================================
  // CATEGORY 1: Ziele (Goals) - 4 Tiers
  // ============================================
  {
    id: 'goals_1_common',
    category: ACHIEVEMENT_CATEGORIES.GOALS,
    tier: ACHIEVEMENT_TIERS.COMMON,
    name: 'Erster Schritt',
    description: 'Erstes Ziel erreicht',
    flavor: 'Deine erste Zielerreichung',
    icon: 'Target',
    target: 1,
    unlocks: 'goals_2_rare',
    calculate: (data) => data.completedGoals?.length || 0
  },
  {
    id: 'goals_2_rare',
    category: ACHIEVEMENT_CATEGORIES.GOALS,
    tier: ACHIEVEMENT_TIERS.RARE,
    name: 'Zielstrebig',
    description: '5 Ziele erreicht',
    flavor: 'Du gehst fokussiert vorwärts',
    icon: 'Star',
    target: 5,
    unlocks: 'goals_3_epic',
    calculate: (data) => data.completedGoals?.length || 0
  },
  {
    id: 'goals_3_epic',
    category: ACHIEVEMENT_CATEGORIES.GOALS,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Durchstarter',
    description: '10 Ziele erreicht',
    flavor: 'Deine Ziele sind in Reichweite',
    icon: 'Rocket',
    target: 10,
    unlocks: 'goals_4_legendary',
    calculate: (data) => data.completedGoals?.length || 0
  },
  {
    id: 'goals_4_legendary',
    category: ACHIEVEMENT_CATEGORIES.GOALS,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Zielmagnet',
    description: '25 Ziele erreicht',
    flavor: 'Du ziehst Erfolge an',
    icon: 'Trophy',
    target: 25,
    unlocks: null,
    calculate: (data) => data.completedGoals?.length || 0
  },

  // ============================================
  // CATEGORY 2: Ämtli-Meisterschaft - 4 Tiers
  // ============================================
  {
    id: 'chores_1_common',
    category: ACHIEVEMENT_CATEGORIES.CHORES,
    tier: ACHIEVEMENT_TIERS.COMMON,
    name: 'Ämtli-Starter',
    description: '5 Ämtlis erledigt',
    flavor: 'Erste Verantwortung übernommen',
    icon: 'ClipboardCheck',
    target: 5,
    unlocks: 'chores_2_rare',
    calculate: (data) => data.completedChores || 0
  },
  {
    id: 'chores_2_rare',
    category: ACHIEVEMENT_CATEGORIES.CHORES,
    tier: ACHIEVEMENT_TIERS.RARE,
    name: 'Ämtli-Profi',
    description: '10 Ämtlis erledigt',
    flavor: 'Zuverlässigkeit wird zur Gewohnheit',
    icon: 'ClipboardCheck',
    target: 10,
    unlocks: 'chores_3_epic',
    calculate: (data) => data.completedChores || 0
  },
  {
    id: 'chores_3_epic',
    category: ACHIEVEMENT_CATEGORIES.CHORES,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Ämtli-Meister',
    description: '20 Ämtlis erledigt',
    flavor: 'Vorbildliche Disziplin',
    icon: 'Trophy',
    target: 20,
    unlocks: 'chores_4_legendary',
    calculate: (data) => data.completedChores || 0
  },
  {
    id: 'chores_4_legendary',
    category: ACHIEVEMENT_CATEGORIES.CHORES,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Ämtli-Champion',
    description: '50 Ämtlis erledigt',
    flavor: 'Unerschütterliche Zuverlässigkeit',
    icon: 'Award',
    target: 50,
    unlocks: null,
    calculate: (data) => data.completedChores || 0
  },

  // ============================================
  // CATEGORY 3: Schwächen-Eroberung - 4 Tiers
  // ============================================
  {
    id: 'improvement_1_common',
    category: ACHIEVEMENT_CATEGORIES.IMPROVEMENT,
    tier: ACHIEVEMENT_TIERS.COMMON,
    name: 'Eroberer',
    description: 'Eine Schwäche um 0.5+ verbessert',
    flavor: 'Du stellst dich der Herausforderung',
    icon: 'Sword',
    target: 1,
    unlocks: 'improvement_2_rare',
    calculate: (data) => data.conqueredCount || 0
  },
  {
    id: 'improvement_2_rare',
    category: ACHIEVEMENT_CATEGORIES.IMPROVEMENT,
    tier: ACHIEVEMENT_TIERS.RARE,
    name: 'Meister-Eroberer',
    description: '3 Schwächen erobert',
    flavor: 'Ausdauer zahlt sich aus',
    icon: 'Sword',
    target: 3,
    unlocks: 'improvement_3_epic',
    calculate: (data) => data.conqueredCount || 0
  },
  {
    id: 'improvement_3_epic',
    category: ACHIEVEMENT_CATEGORIES.IMPROVEMENT,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Siegreicher',
    description: '5 Schwächen erobert',
    flavor: 'Du überwindest deine Grenzen',
    icon: 'Zap',
    target: 5,
    unlocks: 'improvement_4_legendary',
    calculate: (data) => data.conqueredCount || 0
  },
  {
    id: 'improvement_4_legendary',
    category: ACHIEVEMENT_CATEGORIES.IMPROVEMENT,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Unbesiegbar',
    description: '8 Schwächen erobert',
    flavor: 'Nichts hält dich auf',
    icon: 'Crown',
    target: 8,
    unlocks: null,
    calculate: (data) => data.conqueredCount || 0
  },

  // ============================================
  // CATEGORY 4: Exzellenz (Grades) - 3 Tiers
  // ============================================
  {
    id: 'grades_1_rare',
    category: ACHIEVEMENT_CATEGORIES.GRADES,
    tier: ACHIEVEMENT_TIERS.RARE,
    name: 'Höhenflug',
    description: 'Durchschnitt über 5.0',
    flavor: 'Solide Leistung',
    icon: 'Award',
    target: 5.0,
    unlocks: 'grades_2_epic',
    calculate: (data) => data.stats?.gradeAverage || 0
  },
  {
    id: 'grades_2_epic',
    category: ACHIEVEMENT_CATEGORIES.GRADES,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Sternenhimmel',
    description: 'Durchschnitt über 5.5',
    flavor: 'Herausragende Noten',
    icon: 'Star',
    target: 5.5,
    unlocks: 'grades_3_legendary',
    calculate: (data) => data.stats?.gradeAverage || 0
  },
  {
    id: 'grades_3_legendary',
    category: ACHIEVEMENT_CATEGORIES.GRADES,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Überflieger',
    description: 'Durchschnitt über 5.8',
    flavor: 'Akademische Spitzenleistung',
    icon: 'Sparkles',
    target: 5.8,
    unlocks: null,
    calculate: (data) => data.stats?.gradeAverage || 0
  },

  // ============================================
  // CATEGORY 5: Allround-Entwicklung - 3 Tiers
  // ============================================
  {
    id: 'competency_1_rare',
    category: ACHIEVEMENT_CATEGORIES.COMPETENCY,
    tier: ACHIEVEMENT_TIERS.RARE,
    name: 'Allrounder',
    description: 'Ziele in allen Kompetenzen',
    flavor: 'Ausgewogene Entwicklung',
    icon: 'Trophy',
    target: 1,
    unlocks: 'competency_2_epic',
    calculate: (data) => {
      if (!data.competencies || data.competencies.length === 0) return 0;
      const competenciesWithGoals = new Set(
        data.completedGoals?.map(g => g.competency_id).filter(Boolean) || []
      );
      return competenciesWithGoals.size >= data.competencies.length ? 1 : 0;
    }
  },
  {
    id: 'competency_2_epic',
    category: ACHIEVEMENT_CATEGORIES.COMPETENCY,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Renaissance-Schüler',
    description: 'Self-Assessments in allen + Ziele in allen',
    flavor: 'Selbstreflexion meets Aktion',
    icon: 'Brain',
    target: 1,
    unlocks: 'competency_3_legendary',
    calculate: (data) => {
      if (!data.competencies || data.competencies.length === 0) return 0;

      const competenciesWithGoals = new Set(
        data.completedGoals?.map(g => g.competency_id).filter(Boolean) || []
      );
      const competenciesWithAssessments = new Set(
        data.selfAssessments?.map(a => a.competency_id).filter(Boolean) || []
      );

      const hasAllGoals = competenciesWithGoals.size >= data.competencies.length;
      const hasAllAssessments = competenciesWithAssessments.size >= data.competencies.length;

      return hasAllGoals && hasAllAssessments ? 1 : 0;
    }
  },
  {
    id: 'competency_3_legendary',
    category: ACHIEVEMENT_CATEGORIES.COMPETENCY,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Vollendung',
    description: 'Alle Kompetenzen bei 4+ Sternen + Ziele',
    flavor: 'Meisterschaft in allen Bereichen',
    icon: 'Crown',
    target: 1,
    unlocks: null,
    calculate: (data) => {
      if (!data.competencies || data.competencies.length === 0) return 0;

      const competenciesWithGoals = new Set(
        data.completedGoals?.map(g => g.competency_id).filter(Boolean) || []
      );

      const allAbove4Stars = data.competencyData?.every(c => c.teacherScore >= 4) || false;
      const hasAllGoals = competenciesWithGoals.size >= data.competencies.length;

      return allAbove4Stars && hasAllGoals ? 1 : 0;
    }
  },

  // ============================================
  // CATEGORY 6: Beständigkeit - 4 Tiers
  // ============================================
  {
    id: 'consistency_1_common',
    category: ACHIEVEMENT_CATEGORIES.CONSISTENCY,
    tier: ACHIEVEMENT_TIERS.COMMON,
    name: 'Wöchentlicher Held',
    description: '3 Wochen in Folge Self-Assessment',
    flavor: 'Kontinuität ist deine Stärke',
    icon: 'Calendar',
    target: 3,
    unlocks: 'consistency_2_rare',
    calculate: (data) => data.consistencyStreak || 0
  },
  {
    id: 'consistency_2_rare',
    category: ACHIEVEMENT_CATEGORIES.CONSISTENCY,
    tier: ACHIEVEMENT_TIERS.RARE,
    name: 'Monatlicher Champion',
    description: '4 Wochen in Folge',
    flavor: 'Disziplin wird zur Routine',
    icon: 'Calendar',
    target: 4,
    unlocks: 'consistency_3_epic',
    calculate: (data) => data.consistencyStreak || 0
  },
  {
    id: 'consistency_3_epic',
    category: ACHIEVEMENT_CATEGORIES.CONSISTENCY,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Quartalskönig',
    description: '8 Wochen in 12-Wochen-Periode',
    flavor: 'Beständigkeit über Monate',
    icon: 'CalendarCheck',
    target: 8,
    unlocks: 'consistency_4_legendary',
    calculate: (data) => data.consistencyStreak || 0
  },
  {
    id: 'consistency_4_legendary',
    category: ACHIEVEMENT_CATEGORIES.CONSISTENCY,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Jahreslegende',
    description: '30 Wochen im Schuljahr',
    flavor: 'Unerschütterliche Kontinuität',
    icon: 'Medal',
    target: 30,
    unlocks: null,
    calculate: (data) => data.consistencyStreak || 0
  },

  // ============================================
  // CATEGORY 7: Selbstreflexion - 4 Tiers
  // ============================================
  {
    id: 'reflection_1_common',
    category: ACHIEVEMENT_CATEGORIES.REFLECTION,
    tier: ACHIEVEMENT_TIERS.COMMON,
    name: 'Selbstkenner',
    description: '5 Self-Assessments abgeschlossen',
    flavor: 'Du beginnst dich selbst zu verstehen',
    icon: 'Eye',
    target: 5,
    unlocks: 'reflection_2_rare',
    calculate: (data) => data.selfReflectionCount || 0
  },
  {
    id: 'reflection_2_rare',
    category: ACHIEVEMENT_CATEGORIES.REFLECTION,
    tier: ACHIEVEMENT_TIERS.RARE,
    name: 'Reflektierender Geist',
    description: '15 Self-Assessments',
    flavor: 'Selbstreflexion ist deine Gewohnheit',
    icon: 'Eye',
    target: 15,
    unlocks: 'reflection_3_epic',
    calculate: (data) => data.selfReflectionCount || 0
  },
  {
    id: 'reflection_3_epic',
    category: ACHIEVEMENT_CATEGORIES.REFLECTION,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Meister der Selbstwahrnehmung',
    description: '30 Self-Assessments',
    flavor: 'Tiefe Selbstkenntnis',
    icon: 'Brain',
    target: 30,
    unlocks: 'reflection_4_legendary',
    calculate: (data) => data.selfReflectionCount || 0
  },
  {
    id: 'reflection_4_legendary',
    category: ACHIEVEMENT_CATEGORIES.REFLECTION,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Philosophenkönig',
    description: '50 Assessments + Gap < 0.5',
    flavor: 'Perfekte Selbsteinschätzung',
    icon: 'GraduationCap',
    target: 1,
    unlocks: null,
    calculate: (data) => {
      const hasEnough = (data.selfReflectionCount || 0) >= 50;
      const hasLowGap = (data.selfAwarenessGap || 999) < 0.5;
      return hasEnough && hasLowGap ? 1 : 0;
    }
  },

  // ============================================
  // CATEGORY 8: Perfektion - 3 Tiers
  // ============================================
  {
    id: 'perfection_1_rare',
    category: ACHIEVEMENT_CATEGORIES.PERFECTION,
    tier: ACHIEVEMENT_TIERS.RARE,
    name: 'Glanztag',
    description: '1 Note von 6.0',
    flavor: 'Ein perfekter Moment',
    icon: 'Star',
    target: 1,
    unlocks: 'perfection_2_epic',
    calculate: (data) => data.perfectGrades || 0
  },
  {
    id: 'perfection_2_epic',
    category: ACHIEVEMENT_CATEGORIES.PERFECTION,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Sternenstürmer',
    description: '3 Noten von 6.0',
    flavor: 'Perfektion wird zur Gewohnheit',
    icon: 'Sparkles',
    target: 3,
    unlocks: 'perfection_3_legendary',
    calculate: (data) => data.perfectGrades || 0
  },
  {
    id: 'perfection_3_legendary',
    category: ACHIEVEMENT_CATEGORIES.PERFECTION,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Perfektionist',
    description: '5x 6.0 + Durchschnitt 5.5+',
    flavor: 'Konsistente Exzellenz',
    icon: 'Crown',
    target: 1,
    unlocks: null,
    calculate: (data) => {
      const hasPerfect = (data.perfectGrades || 0) >= 5;
      const hasHighAvg = (data.stats?.gradeAverage || 0) >= 5.5;
      return hasPerfect && hasHighAvg ? 1 : 0;
    }
  },

  // ============================================
  // CATEGORY 9: Verbesserungsstreak - 3 Tiers
  // ============================================
  {
    id: 'streak_1_rare',
    category: ACHIEVEMENT_CATEGORIES.STREAK,
    tier: ACHIEVEMENT_TIERS.RARE,
    name: 'Aufwärtsspirale',
    description: '3 aufeinanderfolgende Verbesserungen',
    flavor: 'Du bist auf dem richtigen Weg',
    icon: 'TrendingUp',
    target: 3,
    unlocks: 'streak_2_epic',
    calculate: (data) => data.improvementStreak || 0
  },
  {
    id: 'streak_2_epic',
    category: ACHIEVEMENT_CATEGORIES.STREAK,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Unaufhaltsam',
    description: '2 Fachbereiche je 3 Verbesserungen',
    flavor: 'Kontinuierlicher Fortschritt',
    icon: 'Zap',
    target: 1,
    unlocks: 'streak_3_legendary',
    calculate: (data) => data.hasMultipleImprovementStreaks ? 1 : 0
  },
  {
    id: 'streak_3_legendary',
    category: ACHIEVEMENT_CATEGORIES.STREAK,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Transformator',
    description: 'Schwächsten Bereich von <4.0 auf 5.0+',
    flavor: 'Radikale Transformation',
    icon: 'Rocket',
    target: 1,
    unlocks: null,
    calculate: (data) => data.hasTransformation ? 1 : 0
  },

  // ============================================
  // CATEGORY 10: Breite des Wissens - 3 Tiers
  // ============================================
  {
    id: 'breadth_1_rare',
    category: ACHIEVEMENT_CATEGORIES.BREADTH,
    tier: ACHIEVEMENT_TIERS.RARE,
    name: 'Entdecker',
    description: 'Noten in 5+ Fächern',
    flavor: 'Vielseitiges Interesse',
    icon: 'Compass',
    target: 5,
    unlocks: 'breadth_2_epic',
    calculate: (data) => data.subjectCount || 0
  },
  {
    id: 'breadth_2_epic',
    category: ACHIEVEMENT_CATEGORIES.BREADTH,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Universalgelehrter',
    description: '8+ Fächer mit 4.5+ Durchschnitt',
    flavor: 'Breites Wissen auf hohem Niveau',
    icon: 'BookOpen',
    target: 1,
    unlocks: 'breadth_3_legendary',
    calculate: (data) => data.hasHighBreadth ? 1 : 0
  },
  {
    id: 'breadth_3_legendary',
    category: ACHIEVEMENT_CATEGORIES.BREADTH,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Polymath',
    description: '10+ Fächer alle mit 5.0+',
    flavor: 'Universelle Meisterschaft',
    icon: 'Brain',
    target: 1,
    unlocks: null,
    calculate: (data) => data.hasExcellentBreadth ? 1 : 0
  },

  // ============================================
  // CATEGORY 11: Engagement - 4 Tiers
  // ============================================
  {
    id: 'engagement_1_common',
    category: ACHIEVEMENT_CATEGORIES.ENGAGEMENT,
    tier: ACHIEVEMENT_TIERS.COMMON,
    name: 'Aktiver Teilnehmer',
    description: '10+ Aktivitäten gesamt',
    flavor: 'Du bist dabei',
    icon: 'Users',
    target: 10,
    unlocks: 'engagement_2_rare',
    calculate: (data) => data.engagementScore || 0
  },
  {
    id: 'engagement_2_rare',
    category: ACHIEVEMENT_CATEGORIES.ENGAGEMENT,
    tier: ACHIEVEMENT_TIERS.RARE,
    name: 'Engagierter Schüler',
    description: '30+ Aktivitäten',
    flavor: 'Aktive Teilnahme am Schulleben',
    icon: 'Users',
    target: 30,
    unlocks: 'engagement_3_epic',
    calculate: (data) => data.engagementScore || 0
  },
  {
    id: 'engagement_3_epic',
    category: ACHIEVEMENT_CATEGORIES.ENGAGEMENT,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Vorbildlich',
    description: '60+ Aktivitäten + 1 Badge je Kategorie',
    flavor: 'Beispiel für andere',
    icon: 'Award',
    target: 1,
    unlocks: 'engagement_4_legendary',
    calculate: (data) => {
      const hasActivities = (data.engagementScore || 0) >= 60;
      const hasDiverseBadges = data.hasDiverseBadges || false;
      return hasActivities && hasDiverseBadges ? 1 : 0;
    }
  },
  {
    id: 'engagement_4_legendary',
    category: ACHIEVEMENT_CATEGORIES.ENGAGEMENT,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Legende der Schule',
    description: '100+ Aktivitäten + 10 Badges',
    flavor: 'Inspirierende Präsenz',
    icon: 'Crown',
    target: 1,
    unlocks: null,
    calculate: (data) => {
      const hasActivities = (data.engagementScore || 0) >= 100;
      const hasManyBadges = (data.earnedBadgesCount || 0) >= 10;
      return hasActivities && hasManyBadges ? 1 : 0;
    }
  }
];

/**
 * Helper function to get tier configuration
 */
export function getTierConfig(tier) {
  return TIER_CONFIG[tier] || TIER_CONFIG[ACHIEVEMENT_TIERS.COMMON];
}

/**
 * Helper function to get category name
 */
export function getCategoryName(category) {
  return CATEGORY_NAMES[category] || category;
}

/**
 * Helper function to find achievement by ID
 */
export function getAchievementById(id) {
  return achievementDefinitions.find(a => a.id === id);
}
