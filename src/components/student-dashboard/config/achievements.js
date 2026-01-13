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

// Main categories (2 top-level categories)
export const MAIN_CATEGORIES = {
  FAECHER: 'faecher',
  KOMPETENZEN: 'kompetenzen'
};

export const MAIN_CATEGORY_NAMES = {
  [MAIN_CATEGORIES.FAECHER]: 'Fächer',
  [MAIN_CATEGORIES.KOMPETENZEN]: 'Kompetenzen'
};

export const ACHIEVEMENT_CATEGORIES = {
  GOALS: 'goals',
  CHORES: 'chores',
  IMPROVEMENT: 'improvement',
  GRADES: 'grades',
  CORE_SUBJECTS: 'core_subjects',
  COMPETENCY: 'competency',
  REFLECTION: 'reflection',
  PERFECTION: 'perfection',
  STREAK: 'streak',
  ENGAGEMENT: 'engagement',
  CURRENCY: 'currency'
};

// Category display names (German)
export const CATEGORY_NAMES = {
  [ACHIEVEMENT_CATEGORIES.GOALS]: 'Ziele',
  [ACHIEVEMENT_CATEGORIES.CHORES]: 'Ämtli-Meisterschaft',
  [ACHIEVEMENT_CATEGORIES.IMPROVEMENT]: 'Schwächen-Eroberung',
  [ACHIEVEMENT_CATEGORIES.GRADES]: 'Exzellenz',
  [ACHIEVEMENT_CATEGORIES.CORE_SUBJECTS]: 'Kernfächer',
  [ACHIEVEMENT_CATEGORIES.COMPETENCY]: 'Allround-Entwicklung',
  [ACHIEVEMENT_CATEGORIES.REFLECTION]: 'Selbstreflexion',
  [ACHIEVEMENT_CATEGORIES.PERFECTION]: 'Perfektion',
  [ACHIEVEMENT_CATEGORIES.STREAK]: 'Verbesserungsstreak',
  [ACHIEVEMENT_CATEGORIES.ENGAGEMENT]: 'Engagement',
  [ACHIEVEMENT_CATEGORIES.CURRENCY]: 'Währungsmeister'
};

// Mapping: Sub-category → Main category
export const CATEGORY_TO_MAIN = {
  [ACHIEVEMENT_CATEGORIES.GRADES]: MAIN_CATEGORIES.FAECHER,
  [ACHIEVEMENT_CATEGORIES.PERFECTION]: MAIN_CATEGORIES.FAECHER,
  [ACHIEVEMENT_CATEGORIES.STREAK]: MAIN_CATEGORIES.FAECHER,
  [ACHIEVEMENT_CATEGORIES.IMPROVEMENT]: MAIN_CATEGORIES.FAECHER,
  [ACHIEVEMENT_CATEGORIES.CORE_SUBJECTS]: MAIN_CATEGORIES.FAECHER,

  [ACHIEVEMENT_CATEGORIES.GOALS]: MAIN_CATEGORIES.KOMPETENZEN,
  [ACHIEVEMENT_CATEGORIES.CHORES]: MAIN_CATEGORIES.KOMPETENZEN,
  [ACHIEVEMENT_CATEGORIES.COMPETENCY]: MAIN_CATEGORIES.KOMPETENZEN,
  [ACHIEVEMENT_CATEGORIES.REFLECTION]: MAIN_CATEGORIES.KOMPETENZEN,
  [ACHIEVEMENT_CATEGORIES.ENGAGEMENT]: MAIN_CATEGORIES.KOMPETENZEN,
  [ACHIEVEMENT_CATEGORIES.CURRENCY]: MAIN_CATEGORIES.KOMPETENZEN
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
 * Achievement Progressions (11 progressions with 3-4 tiers each)
 * Each progression represents ONE transforming card that shows different tiers as student progresses
 */
export const achievementProgressions = [
  // ============================================
  // FÄCHER - PERFEKTION (3 tiers)
  // ============================================
  {
    id: 'perfection_progression',
    category: ACHIEVEMENT_CATEGORIES.PERFECTION,
    mainCategory: MAIN_CATEGORIES.FAECHER,
    tiers: [
      {
        tier: ACHIEVEMENT_TIERS.RARE,
        name: 'Glanztag',
        description: 'Erreiche 1 perfekte Note (6.0)',
        descriptionEarned: '1x Note 6.0 erhalten!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 1 perfekten Noten erreicht`;
        },
        icon: 'Star',
        target: 1,
        calculate: (data) => data.perfectGrades || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.EPIC,
        name: 'Sternenstürmer',
        description: 'Erreiche 3 perfekte Noten (jeweils 6.0)',
        descriptionEarned: '3x Note 6.0 erhalten!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 3 perfekten Noten erreicht`;
        },
        icon: 'Sparkles',
        target: 3,
        calculate: (data) => data.perfectGrades || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.LEGENDARY,
        name: 'Perfektionist',
        description: 'Erreiche 5 perfekte Noten (6.0) UND einen Gesamtdurchschnitt von mindestens 5.5',
        descriptionEarned: '5x Note 6.0 erhalten + Durchschnitt 5.5 erreicht!',
        descriptionInProgress: (data) => {
          const perfect = data.studentData?.perfectGrades || 0;
          const avg = data.studentData?.stats?.gradeAverage || 0;
          return `${perfect}/5 perfekte Noten, Durchschnitt: ${avg.toFixed(1)}/5.5`;
        },
        icon: 'Crown',
        target: 1,
        calculate: (data) => {
          const hasPerfect = (data.perfectGrades || 0) >= 5;
          const hasHighAvg = (data.stats?.gradeAverage || 0) >= 5.5;
          return hasPerfect && hasHighAvg ? 1 : 0;
        }
      }
    ]
  },

  // ============================================
  // FÄCHER - EXZELLENZ (4 tiers)
  // ============================================
  {
    id: 'grades_progression',
    category: ACHIEVEMENT_CATEGORIES.GRADES,
    mainCategory: MAIN_CATEGORIES.FAECHER,
    tiers: [
      {
        tier: ACHIEVEMENT_TIERS.COMMON,
        name: 'Lehrling',
        description: 'Erreiche einen Notendurchschnitt über 4.0',
        descriptionEarned: 'Durchschnitt über 4.0 erreicht!',
        descriptionInProgress: (data) => {
          const avg = data.studentData?.stats?.gradeAverage || 0;
          return `Aktueller Durchschnitt: ${avg.toFixed(2)} (Ziel: 4.0)`;
        },
        icon: 'BookOpen',
        target: 4.0,
        calculate: (data) => data.stats?.gradeAverage || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.RARE,
        name: 'Gelehrter',
        description: 'Erreiche einen Notendurchschnitt über 4.5',
        descriptionEarned: 'Durchschnitt über 4.5 erreicht!',
        descriptionInProgress: (data) => {
          const avg = data.studentData?.stats?.gradeAverage || 0;
          return `Aktueller Durchschnitt: ${avg.toFixed(2)} (Ziel: 4.5)`;
        },
        icon: 'Award',
        target: 4.5,
        calculate: (data) => data.stats?.gradeAverage || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.EPIC,
        name: 'Universalgelehrter',
        description: 'Erreiche einen Notendurchschnitt über 5.0',
        descriptionEarned: 'Durchschnitt über 5.0 erreicht - Herausragend!',
        descriptionInProgress: (data) => {
          const avg = data.studentData?.stats?.gradeAverage || 0;
          return `Aktueller Durchschnitt: ${avg.toFixed(2)} (Ziel: 5.0)`;
        },
        icon: 'Star',
        target: 5.0,
        calculate: (data) => data.stats?.gradeAverage || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.LEGENDARY,
        name: 'Universalgenie',
        description: 'Erreiche einen Notendurchschnitt über 5.5',
        descriptionEarned: 'Durchschnitt über 5.5 - Akademische Spitzenleistung!',
        descriptionInProgress: (data) => {
          const avg = data.studentData?.stats?.gradeAverage || 0;
          return `Aktueller Durchschnitt: ${avg.toFixed(2)} (Ziel: 5.5)`;
        },
        icon: 'Sparkles',
        target: 5.5,
        calculate: (data) => data.stats?.gradeAverage || 0
      }
    ]
  },

  // ============================================
  // FÄCHER - KERNFÄCHER (4 tiers)
  // ============================================
  {
    id: 'core_subjects_progression',
    category: ACHIEVEMENT_CATEGORIES.CORE_SUBJECTS,
    mainCategory: MAIN_CATEGORIES.FAECHER,
    tiers: [
      {
        tier: ACHIEVEMENT_TIERS.COMMON,
        name: 'Kernling',
        description: 'Erreiche einen Kernfachschnitt über 4.0',
        descriptionEarned: 'Kernfachschnitt über 4.0 erreicht!',
        descriptionInProgress: (data) => {
          const avg = data.studentData?.coreSubjectAverage || 0;
          return `Aktueller Kernfachschnitt: ${avg.toFixed(2)} (Ziel: 4.0)`;
        },
        icon: 'BookOpen',
        target: 4.0,
        calculate: (data) => data.coreSubjectAverage || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.RARE,
        name: 'Kernjäger',
        description: 'Erreiche einen Kernfachschnitt über 4.5',
        descriptionEarned: 'Kernfachschnitt über 4.5 erreicht!',
        descriptionInProgress: (data) => {
          const avg = data.studentData?.coreSubjectAverage || 0;
          return `Aktueller Kernfachschnitt: ${avg.toFixed(2)} (Ziel: 4.5)`;
        },
        icon: 'Target',
        target: 4.5,
        calculate: (data) => data.coreSubjectAverage || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.EPIC,
        name: 'Kernforscher',
        description: 'Erreiche einen Kernfachschnitt über 5.0',
        descriptionEarned: 'Kernfachschnitt über 5.0 erreicht - Herausragend!',
        descriptionInProgress: (data) => {
          const avg = data.studentData?.coreSubjectAverage || 0;
          return `Aktueller Kernfachschnitt: ${avg.toFixed(2)} (Ziel: 5.0)`;
        },
        icon: 'Microscope',
        target: 5.0,
        calculate: (data) => data.coreSubjectAverage || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.LEGENDARY,
        name: 'Kernknacker',
        description: 'Erreiche einen Kernfachschnitt über 5.5',
        descriptionEarned: 'Kernfachschnitt über 5.5 - Meisterschaft in den Kernfächern!',
        descriptionInProgress: (data) => {
          const avg = data.studentData?.coreSubjectAverage || 0;
          return `Aktueller Kernfachschnitt: ${avg.toFixed(2)} (Ziel: 5.5)`;
        },
        icon: 'Crown',
        target: 5.5,
        calculate: (data) => data.coreSubjectAverage || 0
      }
    ]
  },

  // ============================================
  // FÄCHER - VERBESSERUNGSSTREAK (3 tiers)
  // ============================================
  {
    id: 'streak_progression',
    category: ACHIEVEMENT_CATEGORIES.STREAK,
    mainCategory: MAIN_CATEGORIES.FAECHER,
    tiers: [
      {
        tier: ACHIEVEMENT_TIERS.RARE,
        name: 'Aufwärtsspirale',
        description: 'Erreiche 3 aufeinanderfolgende Notenverbesserungen in einem Fach',
        descriptionEarned: '3 aufeinanderfolgende Verbesserungen erreicht!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 3 aufeinanderfolgenden Verbesserungen`;
        },
        icon: 'TrendingUp',
        target: 3,
        calculate: (data) => data.improvementStreak || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.EPIC,
        name: 'Unaufhaltsam',
        description: 'Verbessere 2 Fächer um jeweils 0.5 Notenpunkte',
        descriptionEarned: '2 Fächer um je 0.5+ verbessert!',
        descriptionInProgress: (data) => {
          const current = data.studentData?.improvedSubjectsCount || 0;
          return `${current} von 2 Fächern um 0.5+ verbessert`;
        },
        icon: 'Zap',
        target: 2,
        calculate: (data) => data.improvedSubjectsCount || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.LEGENDARY,
        name: 'Transformator',
        description: 'Verbessere deinen schwächsten Bereich von unter 4.0 auf mindestens 5.0',
        descriptionEarned: 'Radikale Transformation von <4.0 auf 5.0+ erreicht!',
        descriptionInProgress: (data) => {
          return 'Transformiere deinen schwächsten Bereich (von <4.0 auf 5.0+)';
        },
        icon: 'Rocket',
        target: 1,
        calculate: (data) => data.hasTransformation ? 1 : 0
      }
    ]
  },

  // ============================================
  // FÄCHER - SCHWÄCHEN-EROBERUNG (2 tiers)
  // ============================================
  {
    id: 'improvement_progression',
    category: ACHIEVEMENT_CATEGORIES.IMPROVEMENT,
    mainCategory: MAIN_CATEGORIES.FAECHER,
    tiers: [
      {
        tier: ACHIEVEMENT_TIERS.EPIC,
        name: 'Eroberer',
        description: 'Verbessere einen schwachen Fachbereich um mindestens 0.5 Notenpunkte',
        descriptionEarned: '1 Schwäche um 0.5+ verbessert!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 1 schwachen Bereichen verbessert`;
        },
        icon: 'Sword',
        target: 1,
        calculate: (data) => data.conqueredCount || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.LEGENDARY,
        name: 'Meister-Eroberer',
        description: 'Verbessere 3 schwache Fachbereiche um je 0.5+ Notenpunkte',
        descriptionEarned: '3 Schwächen überwunden - Du überwindest deine Grenzen!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 3 schwachen Bereichen verbessert`;
        },
        icon: 'Crown',
        target: 3,
        calculate: (data) => data.conqueredCount || 0
      }
    ]
  },

  // ============================================
  // KOMPETENZEN - ZIELE (4 tiers)
  // ============================================
  {
    id: 'goals_progression',
    category: ACHIEVEMENT_CATEGORIES.GOALS,
    mainCategory: MAIN_CATEGORIES.KOMPETENZEN,
    tiers: [
      {
        tier: ACHIEVEMENT_TIERS.COMMON,
        name: 'Erster Schritt',
        description: 'Erreiche dein erstes Ziel',
        descriptionEarned: 'Erstes Ziel erreicht - Der Anfang deiner Reise!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 1 Zielen erreicht`;
        },
        icon: 'Target',
        target: 1,
        calculate: (data) => data.completedGoals?.length || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.RARE,
        name: 'Zielstrebig',
        description: 'Erreiche 5 Ziele',
        descriptionEarned: '5 Ziele erreicht - Du gehst fokussiert vorwärts!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 5 Zielen erreicht`;
        },
        icon: 'Star',
        target: 5,
        calculate: (data) => data.completedGoals?.length || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.EPIC,
        name: 'Durchstarter',
        description: 'Erreiche 10 Ziele',
        descriptionEarned: '10 Ziele erreicht - Deine Ziele sind in Reichweite!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 10 Zielen erreicht`;
        },
        icon: 'Rocket',
        target: 10,
        calculate: (data) => data.completedGoals?.length || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.LEGENDARY,
        name: 'Zielmagnet',
        description: 'Erreiche 25 Ziele',
        descriptionEarned: '25 Ziele erreicht - Du ziehst Erfolge an!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 25 Zielen erreicht`;
        },
        icon: 'Trophy',
        target: 25,
        calculate: (data) => data.completedGoals?.length || 0
      }
    ]
  },

  // ============================================
  // KOMPETENZEN - ÄMTLI-MEISTERSCHAFT (4 tiers)
  // ============================================
  {
    id: 'chores_progression',
    category: ACHIEVEMENT_CATEGORIES.CHORES,
    mainCategory: MAIN_CATEGORIES.KOMPETENZEN,
    tiers: [
      {
        tier: ACHIEVEMENT_TIERS.COMMON,
        name: 'Staubsauger-Praktikant',
        description: 'Erledige 5 Ämtlis',
        descriptionEarned: '5 Ämtlis erledigt - Erste Verantwortung übernommen!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 5 Ämtlis erledigt`;
        },
        icon: 'ClipboardCheck',
        target: 5,
        calculate: (data) => data.completedChores || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.RARE,
        name: 'Mopp-Maschine',
        description: 'Erledige 10 Ämtlis',
        descriptionEarned: '10 Ämtlis erledigt - Zuverlässigkeit wird zur Gewohnheit!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 10 Ämtlis erledigt`;
        },
        icon: 'ClipboardCheck',
        target: 10,
        calculate: (data) => data.completedChores || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.EPIC,
        name: 'Ordnungs-Freak',
        description: 'Erledige 20 Ämtlis',
        descriptionEarned: '20 Ämtlis erledigt - Vorbildliche Disziplin!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 20 Ämtlis erledigt`;
        },
        icon: 'Trophy',
        target: 20,
        calculate: (data) => data.completedChores || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.LEGENDARY,
        name: 'Chaos-Vernichter 3000',
        description: 'Erledige 50 Ämtlis',
        descriptionEarned: '50 Ämtlis erledigt - Unerschütterliche Zuverlässigkeit!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 50 Ämtlis erledigt`;
        },
        icon: 'Award',
        target: 50,
        calculate: (data) => data.completedChores || 0
      }
    ]
  },

  // ============================================
  // KOMPETENZEN - ALLROUND-ENTWICKLUNG (3 tiers)
  // ============================================
  {
    id: 'competency_progression',
    category: ACHIEVEMENT_CATEGORIES.COMPETENCY,
    mainCategory: MAIN_CATEGORIES.KOMPETENZEN,
    tiers: [
      {
        tier: ACHIEVEMENT_TIERS.RARE,
        name: 'Allrounder',
        description: 'Erreiche mindestens ein Ziel in jeder Kompetenz',
        descriptionEarned: 'Ziele in allen Kompetenzen erreicht - Ausgewogene Entwicklung!',
        descriptionInProgress: (data) => {
          return 'Setze dir Ziele in allen Kompetenzbereichen';
        },
        icon: 'Trophy',
        target: 1,
        calculate: (data) => {
          if (!data.competencies || data.competencies.length === 0) return 0;
          const competenciesWithGoals = new Set(
            data.completedGoals?.map(g => g.competency_id).filter(Boolean) || []
          );
          return competenciesWithGoals.size >= data.competencies.length ? 1 : 0;
        }
      },
      {
        tier: ACHIEVEMENT_TIERS.EPIC,
        name: 'Renaissance-Schüler',
        description: 'Führe Self-Assessments in allen Kompetenzen durch UND erreiche in jeder mindestens ein Ziel',
        descriptionEarned: 'Self-Assessments + Ziele in allen Kompetenzen - Selbstreflexion meets Aktion!',
        descriptionInProgress: (data) => {
          return 'Kombiniere Selbstreflexion mit Zielerreichung in allen Kompetenzen';
        },
        icon: 'Brain',
        target: 1,
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
        tier: ACHIEVEMENT_TIERS.LEGENDARY,
        name: 'Vollendung',
        description: 'Erreiche in allen Kompetenzen mindestens 4 Sterne (Lehrer-Bewertung) UND mindestens ein Ziel pro Kompetenz',
        descriptionEarned: 'Alle Kompetenzen bei 4+ Sternen + Ziele - Meisterschaft in allen Bereichen!',
        descriptionInProgress: (data) => {
          return 'Strebe Exzellenz in allen Kompetenzbereichen an (4+ Sterne + Ziele)';
        },
        icon: 'Crown',
        target: 1,
        calculate: (data) => {
          if (!data.competencies || data.competencies.length === 0) return 0;
          const competenciesWithGoals = new Set(
            data.completedGoals?.map(g => g.competency_id).filter(Boolean) || []
          );
          const allAbove4Stars = data.competencyData?.every(c => c.teacherScore >= 4) || false;
          const hasAllGoals = competenciesWithGoals.size >= data.competencies.length;
          return allAbove4Stars && hasAllGoals ? 1 : 0;
        }
      }
    ]
  },

  // ============================================
  // KOMPETENZEN - SELBSTREFLEXION (4 tiers)
  // ============================================
  {
    id: 'reflection_progression',
    category: ACHIEVEMENT_CATEGORIES.REFLECTION,
    mainCategory: MAIN_CATEGORIES.KOMPETENZEN,
    tiers: [
      {
        tier: ACHIEVEMENT_TIERS.COMMON,
        name: 'Selbstkenner',
        description: 'Schließe 5 Self-Assessments ab',
        descriptionEarned: '5 Self-Assessments abgeschlossen - Du beginnst dich selbst zu verstehen!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 5 Self-Assessments abgeschlossen`;
        },
        icon: 'Eye',
        target: 5,
        calculate: (data) => data.selfReflectionCount || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.RARE,
        name: 'Reflektierender Geist',
        description: 'Schließe 10 Self-Assessments ab',
        descriptionEarned: '10 Self-Assessments abgeschlossen - Selbstreflexion ist deine Gewohnheit!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 10 Self-Assessments abgeschlossen`;
        },
        icon: 'Eye',
        target: 10,
        calculate: (data) => data.selfReflectionCount || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.EPIC,
        name: 'Meister der Selbstwahrnehmung',
        description: 'Schließe 15 Self-Assessments ab',
        descriptionEarned: '15 Self-Assessments abgeschlossen - Tiefe Selbstkenntnis!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 15 Self-Assessments abgeschlossen`;
        },
        icon: 'Brain',
        target: 15,
        calculate: (data) => data.selfReflectionCount || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.LEGENDARY,
        name: 'Philosophenkönig',
        description: 'Schließe 20 Self-Assessments ab UND erreiche eine Selbsteinschätzungs-Genauigkeit von mindestens 0.5 (Gap zwischen Selbst- und Lehrerbewertung unter 0.5)',
        descriptionEarned: '20 Self-Assessments + Gap < 0.5 - Perfekte Selbsteinschätzung!',
        descriptionInProgress: (data) => {
          const count = data.studentData?.selfReflectionCount || 0;
          const gap = data.studentData?.selfAwarenessGap || 999;
          return `${count}/20 Self-Assessments, Gap: ${gap.toFixed(2)} (Ziel: < 0.5)`;
        },
        icon: 'GraduationCap',
        target: 1,
        calculate: (data) => {
          const hasEnough = (data.selfReflectionCount || 0) >= 20;
          const hasLowGap = (data.selfAwarenessGap || 999) < 0.5;
          return hasEnough && hasLowGap ? 1 : 0;
        }
      }
    ]
  },

  // ============================================
  // KOMPETENZEN - ENGAGEMENT (4 tiers)
  // ============================================
  {
    id: 'engagement_progression',
    category: ACHIEVEMENT_CATEGORIES.ENGAGEMENT,
    mainCategory: MAIN_CATEGORIES.KOMPETENZEN,
    tiers: [
      {
        tier: ACHIEVEMENT_TIERS.COMMON,
        name: 'Aktiver Teilnehmer',
        description: 'Sammle mindestens 10 Aktivitätspunkte (Ziele, Ämtlis, Self-Assessments zusammen)',
        descriptionEarned: '10+ Aktivitäten - Du bist dabei!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 10 Aktivitätspunkten gesammelt`;
        },
        icon: 'Users',
        target: 10,
        calculate: (data) => data.engagementScore || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.RARE,
        name: 'Engagierter Schüler',
        description: 'Sammle mindestens 30 Aktivitätspunkte',
        descriptionEarned: '30+ Aktivitäten - Aktive Teilnahme am Schulleben!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 30 Aktivitätspunkten gesammelt`;
        },
        icon: 'Users',
        target: 30,
        calculate: (data) => data.engagementScore || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.EPIC,
        name: 'Vorbild',
        description: 'Sammle mindestens 60 Aktivitätspunkte UND verdiene mindestens 3 Epic Erfolge',
        descriptionEarned: '60+ Aktivitäten + 3 Epic Erfolge - Beispiel für andere!',
        descriptionInProgress: (data) => {
          const score = data.studentData?.engagementScore || 0;
          const epicCount = data.studentData?.epicAchievementsCount || 0;
          return `${score}/60 Aktivitätspunkte, ${epicCount}/3 Epic Erfolge`;
        },
        icon: 'Award',
        target: 1,
        calculate: (data) => {
          const hasActivities = (data.engagementScore || 0) >= 60;
          const hasEpicBadges = (data.epicAchievementsCount || 0) >= 3;
          return hasActivities && hasEpicBadges ? 1 : 0;
        }
      },
      {
        tier: ACHIEVEMENT_TIERS.LEGENDARY,
        name: 'Schullegende',
        description: 'Sammle mindestens 100 Aktivitätspunkte UND verdiene mindestens 4 Epic Erfolge UND 1 Legendary Erfolg',
        descriptionEarned: '100+ Aktivitäten + 4 Epic + 1 Legendary - Inspirierende Präsenz!',
        descriptionInProgress: (data) => {
          const score = data.studentData?.engagementScore || 0;
          const epicCount = data.studentData?.epicAchievementsCount || 0;
          const legendaryCount = data.studentData?.legendaryAchievementsCount || 0;
          return `${score}/100 Aktivitätspunkte, ${epicCount}/4 Epic, ${legendaryCount}/1 Legendary`;
        },
        icon: 'Crown',
        target: 1,
        calculate: (data) => {
          const hasActivities = (data.engagementScore || 0) >= 100;
          const hasEpicBadges = (data.epicAchievementsCount || 0) >= 4;
          const hasLegendaryBadges = (data.legendaryAchievementsCount || 0) >= 1;
          return hasActivities && hasEpicBadges && hasLegendaryBadges ? 1 : 0;
        }
      }
    ]
  },

  // ============================================
  // KOMPETENZEN - COINS GESAMMELT (4 tiers) - Horter-Reihe
  // ============================================
  {
    id: 'currency_earned_progression',
    category: ACHIEVEMENT_CATEGORIES.CURRENCY,
    mainCategory: MAIN_CATEGORIES.KOMPETENZEN,
    tiers: [
      {
        tier: ACHIEVEMENT_TIERS.COMMON,
        name: 'Sparschwein',
        description: 'Sammle 20 Coins',
        descriptionEarned: '20 Coins gesammelt - Dein Sparschwein füllt sich!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 20 Coins gesammelt`;
        },
        icon: 'PiggyBank',
        target: 20,
        calculate: (data) => data.lifetimeEarned || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.RARE,
        name: 'Goldsucher',
        description: 'Sammle 30 Coins',
        descriptionEarned: '30 Coins gesammelt - Du hast Gold gefunden!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 30 Coins gesammelt`;
        },
        icon: 'Gem',
        target: 30,
        calculate: (data) => data.lifetimeEarned || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.EPIC,
        name: 'Schatzjäger',
        description: 'Sammle 50 Coins',
        descriptionEarned: '50 Coins gesammelt - Dein Schatz wächst!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 50 Coins gesammelt`;
        },
        icon: 'Coins',
        target: 50,
        calculate: (data) => data.lifetimeEarned || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.LEGENDARY,
        name: 'Dagobert',
        description: 'Sammle 80 Coins',
        descriptionEarned: '80 Coins gesammelt - Du schwimmst im Geld wie Dagobert Duck!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 80 Coins gesammelt`;
        },
        icon: 'Crown',
        target: 80,
        calculate: (data) => data.lifetimeEarned || 0
      }
    ]
  },

  // ============================================
  // KOMPETENZEN - COINS AUSGEGEBEN (4 tiers) - Geldautomat-Reihe
  // ============================================
  {
    id: 'currency_spent_progression',
    category: ACHIEVEMENT_CATEGORIES.CURRENCY,
    mainCategory: MAIN_CATEGORIES.KOMPETENZEN,
    tiers: [
      {
        tier: ACHIEVEMENT_TIERS.COMMON,
        name: 'Erstkäufer',
        description: 'Gib 10 Coins aus',
        descriptionEarned: '10 Coins ausgegeben - Dein erster Einkauf!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 10 Coins ausgegeben`;
        },
        icon: 'ShoppingCart',
        target: 10,
        calculate: (data) => data.lifetimeSpent || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.RARE,
        name: 'Stammkunde',
        description: 'Gib 20 Coins aus',
        descriptionEarned: '20 Coins ausgegeben - Du bist ein treuer Kunde!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 20 Coins ausgegeben`;
        },
        icon: 'ShoppingBag',
        target: 20,
        calculate: (data) => data.lifetimeSpent || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.EPIC,
        name: 'Grosseinkäufer',
        description: 'Gib 30 Coins aus',
        descriptionEarned: '30 Coins ausgegeben - Shopping-Profi!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 30 Coins ausgegeben`;
        },
        icon: 'CreditCard',
        target: 30,
        calculate: (data) => data.lifetimeSpent || 0
      },
      {
        tier: ACHIEVEMENT_TIERS.LEGENDARY,
        name: 'Wandelnder Geldautomat',
        description: 'Gib 50 Coins aus',
        descriptionEarned: '50 Coins ausgegeben - Geld kommt und geht bei dir!',
        descriptionInProgress: (data) => {
          const current = data.progress || 0;
          return `${current} von 50 Coins ausgegeben`;
        },
        icon: 'Banknote',
        target: 50,
        calculate: (data) => data.lifetimeSpent || 0
      }
    ]
  }
];

/**
 * Legacy achievement definitions (kept for backward compatibility during migration)
 * Will be removed once all components use achievementProgressions
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
    name: 'Staubsauger-Praktikant',
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
    name: 'Mopp-Maschine',
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
    name: 'Ordnungs-Freak',
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
    name: 'Chaos-Vernichter 3000',
    description: '50 Ämtlis erledigt',
    flavor: 'Unerschütterliche Zuverlässigkeit',
    icon: 'Award',
    target: 50,
    unlocks: null,
    calculate: (data) => data.completedChores || 0
  },

  // ============================================
  // CATEGORY 3: Schwächen-Eroberung - 2 Tiers
  // ============================================
  {
    id: 'improvement_1_epic',
    category: ACHIEVEMENT_CATEGORIES.IMPROVEMENT,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Eroberer',
    description: 'Eine Schwäche um 0.5+ verbessert',
    flavor: 'Du stellst dich der Herausforderung',
    icon: 'Sword',
    target: 1,
    unlocks: 'improvement_2_legendary',
    calculate: (data) => data.conqueredCount || 0
  },
  {
    id: 'improvement_2_legendary',
    category: ACHIEVEMENT_CATEGORIES.IMPROVEMENT,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Meister-Eroberer',
    description: '3 Schwächen erobert',
    flavor: 'Du überwindest deine Grenzen',
    icon: 'Crown',
    target: 3,
    unlocks: null,
    calculate: (data) => data.conqueredCount || 0
  },

  // ============================================
  // CATEGORY 4: Exzellenz (Grades) - 4 Tiers
  // ============================================
  {
    id: 'grades_1_common',
    category: ACHIEVEMENT_CATEGORIES.GRADES,
    tier: ACHIEVEMENT_TIERS.COMMON,
    name: 'Lehrling',
    description: 'Durchschnitt über 4.0',
    flavor: 'Ein guter Start',
    icon: 'BookOpen',
    target: 4.0,
    unlocks: 'grades_2_rare',
    calculate: (data) => data.stats?.gradeAverage || 0
  },
  {
    id: 'grades_2_rare',
    category: ACHIEVEMENT_CATEGORIES.GRADES,
    tier: ACHIEVEMENT_TIERS.RARE,
    name: 'Gelehrter',
    description: 'Durchschnitt über 4.5',
    flavor: 'Solide Leistung',
    icon: 'Award',
    target: 4.5,
    unlocks: 'grades_3_epic',
    calculate: (data) => data.stats?.gradeAverage || 0
  },
  {
    id: 'grades_3_epic',
    category: ACHIEVEMENT_CATEGORIES.GRADES,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Universalgelehrter',
    description: 'Durchschnitt über 5.0',
    flavor: 'Herausragende Noten',
    icon: 'Star',
    target: 5.0,
    unlocks: 'grades_4_legendary',
    calculate: (data) => data.stats?.gradeAverage || 0
  },
  {
    id: 'grades_4_legendary',
    category: ACHIEVEMENT_CATEGORIES.GRADES,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Universalgenie',
    description: 'Durchschnitt über 5.5',
    flavor: 'Akademische Spitzenleistung',
    icon: 'Sparkles',
    target: 5.5,
    unlocks: null,
    calculate: (data) => data.stats?.gradeAverage || 0
  },

  // ============================================
  // CATEGORY 4b: Kernfächer - 4 Tiers
  // ============================================
  {
    id: 'core_subjects_1_common',
    category: ACHIEVEMENT_CATEGORIES.CORE_SUBJECTS,
    tier: ACHIEVEMENT_TIERS.COMMON,
    name: 'Kernling',
    description: 'Kernfachschnitt über 4.0',
    flavor: 'Fokus auf das Wesentliche',
    icon: 'BookOpen',
    target: 4.0,
    unlocks: 'core_subjects_2_rare',
    calculate: (data) => data.coreSubjectAverage || 0
  },
  {
    id: 'core_subjects_2_rare',
    category: ACHIEVEMENT_CATEGORIES.CORE_SUBJECTS,
    tier: ACHIEVEMENT_TIERS.RARE,
    name: 'Kernjäger',
    description: 'Kernfachschnitt über 4.5',
    flavor: 'Stark in den Kernfächern',
    icon: 'Target',
    target: 4.5,
    unlocks: 'core_subjects_3_epic',
    calculate: (data) => data.coreSubjectAverage || 0
  },
  {
    id: 'core_subjects_3_epic',
    category: ACHIEVEMENT_CATEGORIES.CORE_SUBJECTS,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Kernforscher',
    description: 'Kernfachschnitt über 5.0',
    flavor: 'Meisterschaft in den Kernfächern',
    icon: 'Microscope',
    target: 5.0,
    unlocks: 'core_subjects_4_legendary',
    calculate: (data) => data.coreSubjectAverage || 0
  },
  {
    id: 'core_subjects_4_legendary',
    category: ACHIEVEMENT_CATEGORIES.CORE_SUBJECTS,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Kernknacker',
    description: 'Kernfachschnitt über 5.5',
    flavor: 'Spitzenleistung in den Kernfächern',
    icon: 'Crown',
    target: 5.5,
    unlocks: null,
    calculate: (data) => data.coreSubjectAverage || 0
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
  // CATEGORY 6: Selbstreflexion - 4 Tiers
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
    description: '10 Self-Assessments',
    flavor: 'Selbstreflexion ist deine Gewohnheit',
    icon: 'Eye',
    target: 10,
    unlocks: 'reflection_3_epic',
    calculate: (data) => data.selfReflectionCount || 0
  },
  {
    id: 'reflection_3_epic',
    category: ACHIEVEMENT_CATEGORIES.REFLECTION,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Meister der Selbstwahrnehmung',
    description: '15 Self-Assessments',
    flavor: 'Tiefe Selbstkenntnis',
    icon: 'Brain',
    target: 15,
    unlocks: 'reflection_4_legendary',
    calculate: (data) => data.selfReflectionCount || 0
  },
  {
    id: 'reflection_4_legendary',
    category: ACHIEVEMENT_CATEGORIES.REFLECTION,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Philosophenkönig',
    description: '20 Assessments + Gap < 0.5',
    flavor: 'Perfekte Selbsteinschätzung',
    icon: 'GraduationCap',
    target: 1,
    unlocks: null,
    calculate: (data) => {
      const hasEnough = (data.selfReflectionCount || 0) >= 20;
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
    description: '2 Fächer um 0.5 verbessert',
    flavor: 'Kontinuierlicher Fortschritt',
    icon: 'Zap',
    target: 2,
    unlocks: 'streak_3_legendary',
    calculate: (data) => data.improvedSubjectsCount || 0
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
  // CATEGORY 10: Engagement - 4 Tiers
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
    name: 'Vorbild',
    description: '60+ Aktivitäten + 3 Epic Erfolge',
    flavor: 'Beispiel für andere',
    icon: 'Award',
    target: 1,
    unlocks: 'engagement_4_legendary',
    calculate: (data) => {
      const hasActivities = (data.engagementScore || 0) >= 60;
      const hasEpicBadges = (data.epicAchievementsCount || 0) >= 3;
      return hasActivities && hasEpicBadges ? 1 : 0;
    }
  },
  {
    id: 'engagement_4_legendary',
    category: ACHIEVEMENT_CATEGORIES.ENGAGEMENT,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Schullegende',
    description: '100+ Aktivitäten + 4 Epic + 1 Legendary',
    flavor: 'Inspirierende Präsenz',
    icon: 'Crown',
    target: 1,
    unlocks: null,
    calculate: (data) => {
      const hasActivities = (data.engagementScore || 0) >= 100;
      const hasEpicBadges = (data.epicAchievementsCount || 0) >= 4;
      const hasLegendaryBadges = (data.legendaryAchievementsCount || 0) >= 1;
      return hasActivities && hasEpicBadges && hasLegendaryBadges ? 1 : 0;
    }
  },

  // ============================================
  // CATEGORY 11: Währungsmeister - Coins gesammelt - 4 Tiers
  // ============================================
  {
    id: 'currency_earned_1_common',
    category: ACHIEVEMENT_CATEGORIES.CURRENCY,
    tier: ACHIEVEMENT_TIERS.COMMON,
    name: 'Sparschwein',
    description: '20 Coins gesammelt',
    flavor: 'Dein Sparschwein füllt sich',
    icon: 'PiggyBank',
    target: 20,
    unlocks: 'currency_earned_2_rare',
    calculate: (data) => data.lifetimeEarned || 0
  },
  {
    id: 'currency_earned_2_rare',
    category: ACHIEVEMENT_CATEGORIES.CURRENCY,
    tier: ACHIEVEMENT_TIERS.RARE,
    name: 'Goldsucher',
    description: '30 Coins gesammelt',
    flavor: 'Du hast Gold gefunden',
    icon: 'Gem',
    target: 30,
    unlocks: 'currency_earned_3_epic',
    calculate: (data) => data.lifetimeEarned || 0
  },
  {
    id: 'currency_earned_3_epic',
    category: ACHIEVEMENT_CATEGORIES.CURRENCY,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Schatzjäger',
    description: '50 Coins gesammelt',
    flavor: 'Dein Schatz wächst',
    icon: 'Coins',
    target: 50,
    unlocks: 'currency_earned_4_legendary',
    calculate: (data) => data.lifetimeEarned || 0
  },
  {
    id: 'currency_earned_4_legendary',
    category: ACHIEVEMENT_CATEGORIES.CURRENCY,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Dagobert',
    description: '80 Coins gesammelt',
    flavor: 'Du schwimmst im Geld wie Dagobert Duck',
    icon: 'Crown',
    target: 80,
    unlocks: null,
    calculate: (data) => data.lifetimeEarned || 0
  },

  // ============================================
  // CATEGORY 12: Währungsmeister - Coins ausgegeben - 4 Tiers
  // ============================================
  {
    id: 'currency_spent_1_common',
    category: ACHIEVEMENT_CATEGORIES.CURRENCY,
    tier: ACHIEVEMENT_TIERS.COMMON,
    name: 'Erstkäufer',
    description: '10 Coins ausgegeben',
    flavor: 'Dein erster Einkauf',
    icon: 'ShoppingCart',
    target: 10,
    unlocks: 'currency_spent_2_rare',
    calculate: (data) => data.lifetimeSpent || 0
  },
  {
    id: 'currency_spent_2_rare',
    category: ACHIEVEMENT_CATEGORIES.CURRENCY,
    tier: ACHIEVEMENT_TIERS.RARE,
    name: 'Stammkunde',
    description: '20 Coins ausgegeben',
    flavor: 'Du bist ein treuer Kunde',
    icon: 'ShoppingBag',
    target: 20,
    unlocks: 'currency_spent_3_epic',
    calculate: (data) => data.lifetimeSpent || 0
  },
  {
    id: 'currency_spent_3_epic',
    category: ACHIEVEMENT_CATEGORIES.CURRENCY,
    tier: ACHIEVEMENT_TIERS.EPIC,
    name: 'Grosseinkäufer',
    description: '30 Coins ausgegeben',
    flavor: 'Shopping-Profi',
    icon: 'CreditCard',
    target: 30,
    unlocks: 'currency_spent_4_legendary',
    calculate: (data) => data.lifetimeSpent || 0
  },
  {
    id: 'currency_spent_4_legendary',
    category: ACHIEVEMENT_CATEGORIES.CURRENCY,
    tier: ACHIEVEMENT_TIERS.LEGENDARY,
    name: 'Wandelnder Geldautomat',
    description: '50 Coins ausgegeben',
    flavor: 'Geld kommt und geht bei dir',
    icon: 'Banknote',
    target: 50,
    unlocks: null,
    calculate: (data) => data.lifetimeSpent || 0
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
