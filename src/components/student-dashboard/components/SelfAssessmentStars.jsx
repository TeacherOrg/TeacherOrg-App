import React, { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';

/**
 * Interactive star rating component for self-assessment
 * Space-themed with glow effects
 *
 * @param {number} currentRating - Current rating (1-5) or null
 * @param {Function} onRate - Callback when rating changes
 * @param {boolean} loading - Loading state
 * @param {boolean} readOnly - If true, stars are not clickable
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 */
export default function SelfAssessmentStars({
  currentRating = null,
  onRate,
  loading = false,
  readOnly = false,
  size = 'md'
}) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const gaps = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-2'
  };

  const handleClick = (rating) => {
    if (readOnly || loading) return;
    onRate?.(rating);
  };

  const handleMouseEnter = (rating) => {
    if (readOnly || loading) return;
    setHoverRating(rating);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const displayRating = hoverRating || currentRating || 0;

  if (loading) {
    return (
      <div className={`flex items-center ${gaps[size]}`}>
        <Loader2 className={`${sizes[size]} animate-spin text-purple-400`} />
        <span className="text-xs text-slate-400 ml-2">Speichern...</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center ${gaps[size]}`}
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayRating;
        const isHovered = hoverRating > 0 && star <= hoverRating;

        return (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            disabled={readOnly || loading}
            className={`
              space-star transition-all duration-200
              ${readOnly ? 'cursor-default' : 'cursor-pointer'}
              ${isFilled ? 'filled' : 'empty'}
              ${isHovered ? 'scale-110' : ''}
            `}
            style={{
              color: isFilled ? '#fbbf24' : '#475569',
              filter: isFilled ? 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.6))' : 'none',
              transform: isHovered ? 'scale(1.2)' : 'scale(1)',
            }}
          >
            <Star
              className={sizes[size]}
              fill={isFilled ? 'currentColor' : 'none'}
              strokeWidth={isFilled ? 0 : 2}
            />
          </button>
        );
      })}

      {/* Rating text */}
      {currentRating && (
        <span className="text-xs text-slate-400 ml-2">
          {currentRating}/5
        </span>
      )}
    </div>
  );
}

/**
 * Display-only star rating (no interaction)
 */
export function StarDisplay({ rating, size = 'sm', label }) {
  return (
    <div className="flex items-center gap-1">
      {label && <span className="text-xs text-slate-400 mr-1">{label}:</span>}
      <SelfAssessmentStars currentRating={rating} readOnly size={size} />
    </div>
  );
}
