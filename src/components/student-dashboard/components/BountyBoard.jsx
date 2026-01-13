import React from 'react';
import { Scroll, Coins, Flame, Zap, Trophy, Sparkles, Crown } from 'lucide-react';
import { SpaceCard } from './SpaceBackground';

// Difficulty configuration - 4 Stufen System (wie Achievements)
const DIFFICULTY_CONFIG = {
  easy: {
    label: 'Einfach',
    color: 'text-green-300',
    bgColor: 'bg-green-500/30',
    borderColor: 'border-green-400/60',
    cardBg: 'from-green-700/60 to-slate-900/95',
    glowColor: 'bg-green-400/30',
    icon: Zap
  },
  medium: {
    label: 'Mittel',
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/30',
    borderColor: 'border-blue-400/60',
    cardBg: 'from-blue-700/60 to-slate-900/95',
    glowColor: 'bg-blue-400/30',
    icon: Flame
  },
  hard: {
    label: 'Schwer',
    color: 'text-purple-300',
    bgColor: 'bg-purple-500/30',
    borderColor: 'border-purple-400/60',
    cardBg: 'from-purple-700/60 to-slate-900/95',
    glowColor: 'bg-purple-400/30',
    icon: Trophy
  },
  legendary: {
    label: 'Legendär',
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/30',
    borderColor: 'border-orange-400/60',
    cardBg: 'from-orange-700/60 to-slate-900/95',
    glowColor: 'bg-orange-400/30',
    icon: Crown
  }
};

/**
 * BountyBoard - Displays active bounties for students
 * Shows in the Overview tab
 */
export default function BountyBoard({ bountyData }) {
  const { activeBounties = [], totalCompletedBounties = 0 } = bountyData || {};

  if (activeBounties.length === 0) {
    return null; // Don't render if no bounties
  }

  return (
    <SpaceCard className="border-amber-500/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Scroll className="w-5 h-5 text-amber-400" />
          Bounty Board
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
        </h3>
        {totalCompletedBounties > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
            <Trophy className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-300">{totalCompletedBounties} erledigt</span>
          </div>
        )}
      </div>

      {/* Bounties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeBounties.map(bounty => {
          const difficulty = DIFFICULTY_CONFIG[bounty.difficulty] || DIFFICULTY_CONFIG.medium;
          const DifficultyIcon = difficulty.icon;

          return (
            <div
              key={bounty.id}
              className={`
                relative overflow-hidden
                bg-gradient-to-br ${difficulty.cardBg}
                border ${difficulty.borderColor}
                rounded-xl p-4
                hover:shadow-lg hover:shadow-amber-500/10
                transition-all duration-300
              `}
            >
              {/* Difficulty Badge - nur Icon */}
              <div className={`absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full ${difficulty.bgColor}`} title={difficulty.label}>
                <DifficultyIcon className={`w-4 h-4 ${difficulty.color}`} />
              </div>

              {/* Title */}
              <h4 className="font-semibold text-white text-lg mb-2 pr-20">
                {bounty.title}
              </h4>

              {/* Description */}
              <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                {bounty.description}
              </p>

              {/* Due Date (if set) */}
              {bounty.due_date && (
                <p className="text-xs text-slate-500 mb-3">
                  Bis: {new Date(bounty.due_date).toLocaleDateString('de-DE', {
                    day: 'numeric',
                    month: 'short'
                  })}
                </p>
              )}

              {/* Reward */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                <span className="text-xs text-slate-500">Belohnung</span>
                <div className="flex items-center gap-1.5">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span className="text-xl font-bold text-amber-400">
                    +{bounty.reward}
                  </span>
                </div>
              </div>

              {/* Decorative glow */}
              <div className={`absolute -bottom-8 -right-8 w-24 h-24 ${difficulty.glowColor} rounded-full blur-2xl`} />
            </div>
          );
        })}
      </div>

      {/* Info text */}
      <p className="text-xs text-slate-500 text-center mt-4">
        Erledige Bounties und verdiene Punkte! Dein Lehrer bestätigt, wenn du ein Bounty abgeschlossen hast.
      </p>
    </SpaceCard>
  );
}
