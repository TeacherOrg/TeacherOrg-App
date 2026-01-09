import React from 'react';
import * as LucideIcons from 'lucide-react';

/**
 * Achievement Card Component
 * Displays a single achievement badge with tier-specific styling
 *
 * @param {Object} achievement - Achievement data from useAchievements
 * @param {boolean} showNextTierPreview - Whether to show next tier indicator
 */
export default function AchievementCard({ achievement, showNextTierPreview = true }) {
  const {
    name,
    description,
    flavor,
    icon,
    earned,
    progress,
    target,
    progressPercent,
    tier,
    tierConfig,
    nextTier,
    isVisible
  } = achievement;

  // Don't render if not visible (progressive unlocking)
  if (!isVisible) {
    return null;
  }

  // Get icon component from lucide-react
  const IconComponent = LucideIcons[icon] || LucideIcons.Star;

  // Determine icon size based on tier
  const iconSizeClass = `size-${tierConfig.iconSize}`;

  // Build CSS classes
  const cardClasses = [
    'achievement-card',
    `achievement-${tier}`,
    earned ? 'earned' : 'achievement-locked'
  ].join(' ');

  return (
    <div className={cardClasses}>
      {/* Tier Badge (top-right) */}
      <div className={`tier-badge ${tier}`}>
        {tierConfig.displayName}
      </div>

      {/* Icon */}
      <IconComponent
        className={`achievement-icon ${iconSizeClass}`}
      />

      {/* Name */}
      <p className={`text-sm font-bold ${earned ? 'text-white' : 'text-slate-400'}`}>
        {name}
      </p>

      {/* Flavor Text */}
      <p className={`text-xs mt-1 ${earned ? 'text-slate-300' : 'text-slate-500'}`}>
        {flavor}
      </p>

      {/* Progress Bar (if not earned) */}
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
              ? `${progress.toFixed(1)} / ${target.toFixed(1)}`
              : `${Math.floor(progress)} / ${target}`
            }
          </p>
        </div>
      )}

      {/* Next Tier Indicator (if earned and has next tier) */}
      {earned && nextTier && showNextTierPreview && (
        <div className="next-tier-indicator">
          <span className="text-xs">
            Nächstes Ziel <span className="next-tier-arrow">→</span>
            <br />
            <span className="font-semibold">{nextTier.name}</span>
          </span>
        </div>
      )}

      {/* Tooltip */}
      <div className="achievement-tooltip">
        <p className="font-medium">{description}</p>
        {!earned && (
          <p className="unlock-hint">
            {progress > 0
              ? `Noch ${target - Math.floor(progress)} bis zum Erfolg!`
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
