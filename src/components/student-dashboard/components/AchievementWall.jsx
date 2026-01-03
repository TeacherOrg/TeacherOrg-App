import React from 'react';
import { Trophy, Star, Target, Rocket, Award, Sparkles } from 'lucide-react';

/**
 * Achievement Wall - Showcase of completed goals and milestones
 * Space-themed with constellation-like visualization
 *
 * @param {Array} completedGoals - List of completed goals
 * @param {Array} competencies - List of competencies for labels
 * @param {Object} stats - Statistics from useStudentData
 */
export default function AchievementWall({ completedGoals = [], competencies = [], stats = {} }) {
  const getCompetencyName = (compId) => {
    const comp = competencies.find(c => c.id === compId);
    return comp?.name || 'Unbekannt';
  };

  // Define achievement badges based on milestones
  const badges = [
    {
      id: 'first_goal',
      name: 'Erster Schritt',
      description: 'Erstes Ziel erreicht',
      icon: Target,
      earned: completedGoals.length >= 1,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'five_goals',
      name: 'Zielstrebig',
      description: '5 Ziele erreicht',
      icon: Star,
      earned: completedGoals.length >= 5,
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'ten_goals',
      name: 'Durchstarter',
      description: '10 Ziele erreicht',
      icon: Rocket,
      earned: completedGoals.length >= 10,
      color: 'from-yellow-500 to-orange-500'
    },
    {
      id: 'all_competencies',
      name: 'Allrounder',
      description: 'Ziele in allen Kompetenzen',
      icon: Trophy,
      earned: competencies.length > 0 && competencies.every(c =>
        completedGoals.some(g => g.competency_id === c.id)
      ),
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'high_performer',
      name: 'Höhenflug',
      description: 'Durchschnitt über 5.0',
      icon: Award,
      earned: stats.gradeAverage >= 5.0,
      color: 'from-amber-500 to-yellow-400'
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
          {badges.map(badge => (
            <div
              key={badge.id}
              className={`
                achievement-star relative p-4 rounded-xl text-center transition-all duration-300
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

              {/* Lock overlay */}
              {!badge.earned && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-2xl opacity-30">🔒</div>
                </div>
              )}

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 rounded text-xs text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                {badge.description}
              </div>
            </div>
          ))}
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
