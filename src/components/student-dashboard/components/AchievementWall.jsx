import React from 'react';
import { Trophy, Star, Target, Rocket, Award, Sparkles, Sword, ClipboardCheck } from 'lucide-react';

/**
 * Achievement Wall - Showcase of completed goals and milestones
 * Space-themed with constellation-like visualization
 *
 * @param {Array} completedGoals - List of completed goals
 * @param {Array} competencies - List of competencies for labels
 * @param {Object} stats - Statistics from useStudentData
 * @param {number} conqueredCount - Number of conquered weaknesses (improved by ≥0.5)
 * @param {Object} choreStats - Chore statistics { totalChores, completedChores }
 */
export default function AchievementWall({ completedGoals = [], competencies = [], stats = {}, conqueredCount = 0, choreStats = {} }) {
  // Extract chore stats from props or stats object
  const completedChores = choreStats.completedChores ?? stats.completedChores ?? 0;
  const getCompetencyName = (compId) => {
    const comp = competencies.find(c => c.id === compId);
    return comp?.name || 'Unbekannt';
  };

  // Calculate progress for "all competencies" badge
  const competenciesWithGoals = new Set(completedGoals.map(g => g.competency_id).filter(Boolean));

  // Define achievement badges based on milestones
  const badges = [
    {
      id: 'first_goal',
      name: 'Erster Schritt',
      description: 'Erstes Ziel erreicht',
      icon: Target,
      earned: completedGoals.length >= 1,
      color: 'from-blue-500 to-cyan-500',
      progress: completedGoals.length,
      target: 1,
      unlockHint: 'Erreiche dein erstes Ziel!'
    },
    {
      id: 'five_goals',
      name: 'Zielstrebig',
      description: '5 Ziele erreicht',
      icon: Star,
      earned: completedGoals.length >= 5,
      color: 'from-purple-500 to-pink-500',
      progress: completedGoals.length,
      target: 5,
      unlockHint: 'Erreiche 5 Ziele!'
    },
    {
      id: 'ten_goals',
      name: 'Durchstarter',
      description: '10 Ziele erreicht',
      icon: Rocket,
      earned: completedGoals.length >= 10,
      color: 'from-yellow-500 to-orange-500',
      progress: completedGoals.length,
      target: 10,
      unlockHint: 'Erreiche 10 Ziele!'
    },
    {
      id: 'all_competencies',
      name: 'Allrounder',
      description: 'Ziele in allen Kompetenzen',
      icon: Trophy,
      earned: competencies.length > 0 && competencies.every(c =>
        completedGoals.some(g => g.competency_id === c.id)
      ),
      color: 'from-green-500 to-emerald-500',
      progress: competenciesWithGoals.size,
      target: competencies.length || 1,
      unlockHint: `Ziele in ${competencies.length} Kompetenzen erreichen`
    },
    {
      id: 'high_performer',
      name: 'Höhenflug',
      description: 'Durchschnitt über 5.0',
      icon: Award,
      earned: stats.gradeAverage >= 5.0,
      color: 'from-amber-500 to-yellow-400',
      progress: stats.gradeAverage || 0,
      target: 5.0,
      unlockHint: 'Erreiche einen Durchschnitt von 5.0!'
    },
    {
      id: 'eroberer',
      name: 'Eroberer',
      description: 'Eine Schwäche um 0.5+ verbessert',
      icon: Sword,
      earned: conqueredCount >= 1,
      color: 'from-red-500 to-orange-500',
      progress: conqueredCount,
      target: 1,
      unlockHint: 'Verbessere einen Fachbereich um 0.5!'
    },
    {
      id: 'meister_eroberer',
      name: 'Meister-Eroberer',
      description: '3 Schwächen erobert',
      icon: Sword,
      earned: conqueredCount >= 3,
      color: 'from-red-600 to-yellow-500',
      progress: conqueredCount,
      target: 3,
      unlockHint: 'Verbessere 3 Fachbereiche um je 0.5!'
    },
    // Ämtli Badges
    {
      id: 'amtli_starter',
      name: 'Ämtli-Starter',
      description: '5 Ämtlis erledigt',
      icon: ClipboardCheck,
      earned: completedChores >= 5,
      color: 'from-orange-500 to-amber-500',
      progress: completedChores,
      target: 5,
      unlockHint: 'Erledige 5 Ämtlis!'
    },
    {
      id: 'amtli_profi',
      name: 'Ämtli-Profi',
      description: '10 Ämtlis erledigt',
      icon: ClipboardCheck,
      earned: completedChores >= 10,
      color: 'from-orange-600 to-red-500',
      progress: completedChores,
      target: 10,
      unlockHint: 'Erledige 10 Ämtlis!'
    },
    {
      id: 'amtli_meister',
      name: 'Ämtli-Meister',
      description: '20 Ämtlis erledigt',
      icon: Trophy,
      earned: completedChores >= 20,
      color: 'from-yellow-500 to-orange-600',
      progress: completedChores,
      target: 20,
      unlockHint: 'Erledige 20 Ämtlis!'
    }
  ];

  const earnedBadges = badges.filter(b => b.earned);
  const lockedBadges = badges.filter(b => !b.earned);

  return (
    <div className="space-y-8">
      {/* Badges Section */}
      <div>
        <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
          Abzeichen
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {badges.map(badge => {
            const progressPercent = Math.min((badge.progress / badge.target) * 100, 100);

            return (
              <div
                key={badge.id}
                className={`
                  achievement-star relative p-4 rounded-xl text-center transition-all duration-300 group
                  ${badge.earned
                    ? 'bg-gradient-to-br ' + badge.color + ' shadow-lg'
                    : 'bg-slate-800/50 border border-slate-700'
                  }
                `}
              >
                {/* Glow effect for earned */}
                {badge.earned && (
                  <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse" />
                )}

                <badge.icon
                  className={`w-8 h-8 mx-auto mb-2 relative z-10 ${
                    badge.earned ? 'text-white' : 'text-slate-500'
                  }`}
                />
                <p className={`text-xs font-medium relative z-10 ${
                  badge.earned ? 'text-white' : 'text-slate-400'
                }`}>
                  {badge.name}
                </p>

                {/* Progress for locked badges - unter dem Badge-Text */}
                {!badge.earned && (
                  <div className="mt-3 relative z-10">
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    {/* Progress text - zentriert unter dem Balken */}
                    <p className="text-[10px] text-slate-500 mt-1 text-center">
                      {badge.id === 'high_performer'
                        ? `${badge.progress.toFixed(1)} / ${badge.target}`
                        : `${badge.progress} / ${badge.target}`
                      }
                    </p>
                  </div>
                )}

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 rounded-lg text-xs text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 shadow-xl border border-slate-700">
                  <p className="font-medium">{badge.description}</p>
                  {!badge.earned && (
                    <p className="text-purple-400 mt-1">{badge.unlockHint}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed Goals Timeline */}
      <div>
        <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Erreichte Ziele ({completedGoals.length})
        </h4>

        {completedGoals.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Noch keine Ziele erreicht.</p>
            <p className="text-sm mt-1">Setze dir Ziele und arbeite darauf hin!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {completedGoals.map((goal, index) => (
              <div
                key={goal.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-green-500/20 hover:border-green-500/40 transition-colors"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                {/* Star indicator */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Star className="w-4 h-4 text-green-400 fill-green-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{goal.goal_text}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    <span className="text-purple-400">{getCompetencyName(goal.competency_id)}</span>
                    <span>•</span>
                    <span>{new Date(goal.completed_date).toLocaleDateString('de-DE')}</span>
                  </div>
                </div>

                {/* Celebration effect for recent */}
                {index < 3 && (
                  <div className="flex-shrink-0 text-yellow-400 animate-bounce">
                    ✨
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">
            {completedGoals.length}
          </div>
          <div className="text-xs text-slate-400">Ziele erreicht</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {earnedBadges.length}/{badges.length}
          </div>
          <div className="text-xs text-slate-400">Abzeichen</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">
            {new Set(completedGoals.map(g => g.competency_id)).size}
          </div>
          <div className="text-xs text-slate-400">Kompetenzen</div>
        </div>
      </div>
    </div>
  );
}
