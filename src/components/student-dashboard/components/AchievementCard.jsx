import React from 'react';
import * as LucideIcons from 'lucide-react';

/**
 * Achievement Card Component - TRANSFORMING VERSION
 * Displays a single achievement progression that transforms visually as student progresses
 *
 * ONE card that changes appearance based on currentTier:
 * - Locked (tier not earned): Greyed out, shows requirements
 * - Earned tier 1 (Rare): Blue, "ERREICHT" badge, shows next tier preview
 * - Earned tier 2 (Epic): Purple, stronger glow
 * - Earned tier 3 (Legendary): Orange, maximum glow, "Vollständig Gemeistert"
 *
 * @param {Object} progression - Progression data from useAchievements
 */
export default function AchievementCard({ progression }) {
  if (!progression) {
    return null;
  }

  const {
    currentTier,
    nextTier,
    currentTierIndex,
    earnedTiers,
    totalTiers,
    isComplete
  } = progression;

  const {
    name,
    description,
    descriptionEarned,
    descriptionInProgress,
    icon,
    earned,
    progress,
    target,
    progressPercent,
    tier,
    tierConfig,
    studentData
  } = currentTier;

  // Get icon component from lucide-react
  const IconComponent = LucideIcons[icon] || LucideIcons.Star;

  // Determine icon size based on tier
  const iconSizeClass = `size-${tierConfig.iconSize}`;

  // Build CSS classes
  const cardClasses = [
    'achievement-card',
    'achievement-transforming',
    `achievement-${tier}`,
    earned ? 'earned' : 'achievement-locked'
  ].join(' ');

  // Get the appropriate description
  const getDescription = () => {
    if (earned) {
      return descriptionEarned;
    } else if (typeof descriptionInProgress === 'function') {
      return descriptionInProgress({ progress, target, studentData });
    } else {
      return description;
    }
  };

  return (
    <div className={cardClasses}>
      {/* Icon */}
      <IconComponent
        className={`achievement-icon ${iconSizeClass}`}
        style={{
          color: tierConfig.color,
          filter: earned ? `drop-shadow(0 0 8px ${tierConfig.glowColor})` : 'none'
        }}
      />

      {/* Name */}
      <p className={`text-sm font-bold ${earned ? 'text-white' : 'text-slate-400'}`}>
        {name}
      </p>

      {/* Description - clear and explicit */}
      <p className={`text-xs mt-2 ${earned ? 'text-slate-300' : 'text-slate-500'}`}>
        {getDescription()}
      </p>

      {/* Progress Bar when not earned */}
      {!earned && (
        <div className="mt-3">
          {/* Progress bar */}
          <div className="achievement-progress-bar">
            <div
              className={`achievement-progress-fill ${tier}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Progress text */}
          <p className="text-[10px] text-slate-500 mt-1 text-center">
            {typeof progress === 'number' && progress < 10 && target < 10
              ? `${progress.toFixed(2)} / ${target.toFixed(2)}`
              : `${Math.floor(progress)} / ${target}`
            }
          </p>
        </div>
      )}

      {/* Next Tier Preview when earned AND there's a next tier */}
      {earned && nextTier && (
        <div className="next-tier-preview mt-3">
          <p className="text-[10px] text-purple-400 mb-1">Nächstes Ziel:</p>
          <p className="text-xs font-semibold text-white">
            {nextTier.name}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            {nextTier.description}
          </p>

          {/* Progress bar to next tier */}
          <div className="mt-2">
            <div className="achievement-progress-bar">
              <div
                className={`achievement-progress-fill ${nextTier.tier}`}
                style={{ width: `${nextTier.progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 text-center">
              {typeof nextTier.progress === 'number' && nextTier.progress < 10 && nextTier.target < 10
                ? `${nextTier.progress.toFixed(2)} / ${nextTier.target.toFixed(2)}`
                : `${Math.floor(nextTier.progress)} / ${nextTier.target}`
              }
            </p>
          </div>
        </div>
      )}

      {/* Completion Badge when all tiers earned */}
      {isComplete && (
        <div className="completion-badge mt-3">
          <span className="text-xs font-bold text-orange-400">
            ✨ Vollständig Gemeistert ✨
          </span>
        </div>
      )}

      {/* Tooltip (detailed info on hover) */}
      <div className="achievement-tooltip">
        <p className="font-medium">{description}</p>
        {!earned && (
          <p className="unlock-hint">
            {progress > 0
              ? `Noch ${Math.ceil(target - progress)} bis zum Erfolg!`
              : `Ziel: ${target}`
            }
          </p>
        )}
        {earned && nextTier && (
          <p className="unlock-hint">
            Nächstes Level: {nextTier.name} ({nextTier.target})
          </p>
        )}
      </div>
    </div>
  );
}
