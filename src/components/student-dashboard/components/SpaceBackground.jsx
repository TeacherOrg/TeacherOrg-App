import React, { useMemo } from 'react';

/**
 * Animated space background with multiple star layers
 * Pure CSS animations for performance
 */
export default function SpaceBackground({ children, className = '' }) {
  // Generate random shooting stars positions
  const shootingStars = useMemo(() => {
    return Array.from({ length: 3 }, (_, i) => ({
      id: i,
      top: Math.random() * 50 + '%',
      left: Math.random() * 100 + '%',
      delay: Math.random() * 10 + 's',
      duration: (Math.random() * 2 + 1) + 's',
    }));
  }, []);

  return (
    <div className={`space-theme relative min-h-screen ${className}`}>
      {/* Starfield layers */}
      <div className="starfield">
        <div className="starfield-layer starfield-far" />
        <div className="starfield-layer starfield-mid" />
        <div className="starfield-layer starfield-near" />
      </div>

      {/* Nebula gradient overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(124, 58, 237, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(236, 72, 153, 0.05) 0%, transparent 70%)
          `,
        }}
      />

      {/* Shooting stars (occasional) */}
      {shootingStars.map((star) => (
        <div
          key={star.id}
          className="fixed w-1 h-1 bg-white rounded-full pointer-events-none z-10"
          style={{
            top: star.top,
            left: star.left,
            animation: `shooting-star ${star.duration} ${star.delay} ease-out infinite`,
            opacity: 0,
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Shooting star animation */}
      <style>{`
        @keyframes shooting-star {
          0% {
            opacity: 0;
            transform: translateX(0) translateY(0);
          }
          10% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateX(200px) translateY(200px);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Compact space card component with glow effect
 */
export function SpaceCard({ children, className = '', glowing = false, onClick }) {
  return (
    <div
      className={`
        space-card
        ${glowing ? 'animate-glow border-purple-500' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/**
 * Planet visualization for strengths
 */
export function Planet({ size = 80, color = 'gold', rank = 1, children, className = '' }) {
  const gradients = {
    gold: 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600',
    silver: 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500',
    bronze: 'bg-gradient-to-br from-orange-400 via-orange-600 to-orange-800',
  };

  const ringColors = {
    gold: 'border-yellow-300',
    silver: 'border-slate-300',
    bronze: 'border-orange-400',
  };

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Glow effect */}
      <div
        className="planet-glow absolute inset-[-15%] rounded-full"
        style={{
          background: `radial-gradient(circle, ${
            color === 'gold' ? 'rgba(251, 191, 36, 0.3)' :
            color === 'silver' ? 'rgba(148, 163, 184, 0.3)' :
            'rgba(234, 88, 12, 0.3)'
          }, transparent 70%)`,
        }}
      />

      {/* Planet body */}
      <div
        className={`planet w-full h-full ${gradients[color]} shadow-lg`}
        style={{
          animationDelay: `${rank * 0.5}s`,
        }}
      >
        {/* Surface details */}
        <div
          className="absolute inset-0 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle at 30% 30%, white 0%, transparent 50%)',
          }}
        />

        {/* Content */}
        <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
          {children}
        </div>
      </div>

      {/* Ring (for gold planet) */}
      {color === 'gold' && (
        <div
          className={`planet-ring ${ringColors[color]} absolute`}
          style={{
            width: size * 1.4,
            height: size * 0.4,
            left: -size * 0.2,
            top: size * 0.3,
          }}
        />
      )}
    </div>
  );
}

/**
 * Asteroid visualization for weaknesses
 * @param {number} size - Size in pixels
 * @param {string} color - Hex color for the asteroid (Fachbereich color)
 * @param {boolean} conquered - Whether this weakness has been conquered (improved by ≥0.5)
 * @param {number} improvement - The improvement value (for display)
 */
export function Asteroid({ size = 60, children, className = '', color = '#64748b', conquered = false, improvement = 0 }) {
  // Unregelmäßige Asteroidenform
  const irregularShape = '30% 70% 70% 30% / 30% 30% 70% 70%';

  // Goldene Farbe für eroberte Asteroiden
  const goldColor = '#fbbf24';

  return (
    <div
      className={`asteroid relative ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* Outer nebula/veil glow - most dominant */}
      <div
        className="absolute animate-pulse"
        style={{
          inset: '-40%',
          borderRadius: '50%',
          background: conquered
            ? `radial-gradient(circle, ${goldColor}60 0%, ${goldColor}30 30%, ${goldColor}15 50%, transparent 70%)`
            : `radial-gradient(circle, ${color}50 0%, ${color}30 30%, ${color}15 50%, transparent 70%)`,
          filter: 'blur(8px)',
        }}
      />

      {/* Middle glow layer */}
      <div
        className="absolute"
        style={{
          inset: '-25%',
          borderRadius: irregularShape,
          background: conquered
            ? `radial-gradient(circle, ${goldColor}50 0%, ${goldColor}30 40%, transparent 70%)`
            : `radial-gradient(circle, ${color}40 0%, ${color}25 40%, transparent 70%)`,
          filter: 'blur(4px)',
        }}
      />

      {/* Core asteroid body - unregelmäßige Form */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: irregularShape,
          background: `radial-gradient(circle at 35% 35%, ${color}90, ${color}70 50%, ${color}50 100%)`,
          boxShadow: conquered
            ? `0 0 20px ${goldColor}80, 0 0 40px ${goldColor}60, inset 0 0 15px ${color}30`
            : `0 0 20px ${color}60, 0 0 40px ${color}40, inset 0 0 15px ${color}30`,
        }}
      />

      {/* Golden conquest ring for conquered asteroids */}
      {conquered && (
        <div
          className="absolute animate-spin-slow"
          style={{
            inset: '-15%',
            borderRadius: '50%',
            border: `2px solid ${goldColor}`,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            animation: 'spin 4s linear infinite',
          }}
        />
      )}

      {/* Surface texture */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          borderRadius: irregularShape,
          background: `
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.25) 0%, transparent 35%),
            radial-gradient(circle at 65% 65%, rgba(0,0,0,0.35) 0%, transparent 45%)
          `,
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm drop-shadow-lg z-10">
        {children}
      </div>

      {/* Indicator - victory flag for conquered, target for not conquered */}
      {conquered ? (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-xs z-20 shadow-lg">
          ✓
        </div>
      ) : (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs animate-pulse z-20">
          !
        </div>
      )}

      {/* Improvement indicator */}
      {improvement !== 0 && (
        <div
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold z-20 ${
            improvement > 0
              ? 'bg-green-500/90 text-white'
              : 'bg-red-500/90 text-white'
          }`}
        >
          {improvement > 0 ? '+' : ''}{improvement}
        </div>
      )}
    </div>
  );
}

/**
 * Rocket progress indicator
 */
export function RocketProgress({ progress = 0, maxProgress = 6 }) {
  const progressPercent = Math.min((progress / maxProgress) * 100, 100);

  return (
    <div className="rocket-container">
      {/* Progress track area - nimmt den gesamten verfügbaren Platz */}
      <div className="absolute inset-x-0 bottom-0 top-0 flex justify-center">
        {/* Track container mit Padding für Label-Platz */}
        <div className="relative w-2 my-8">
          {/* Background track */}
          <div className="absolute inset-0 bg-slate-700 rounded-full" />

          {/* Progress fill */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-600 to-blue-500 rounded-full transition-all duration-1000"
            style={{ height: `${progressPercent}%` }}
          />

          {/* Milestones - vollständiger Bereich 1-6 */}
          {[1, 2, 3, 4, 5, 6].map((milestone) => (
            <div
              key={milestone}
              className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 ${
                progress >= milestone
                  ? 'bg-yellow-400 border-yellow-300'
                  : 'bg-slate-600 border-slate-500'
              }`}
              style={{ bottom: `${(milestone / maxProgress) * 100}%` }}
            >
              <span className="absolute -left-6 text-xs text-slate-400 whitespace-nowrap">
                {milestone}
              </span>
            </div>
          ))}

          {/* Rocket - zentriert auf dem Track */}
          <div
            className="rocket absolute left-1/2 transition-all duration-1000"
            style={{
              bottom: `${progressPercent}%`,
              transform: 'translateX(-50%) translateY(50%)'
            }}
          >
            {/* Rocket body */}
            <div className="relative">
              <svg width="40" height="60" viewBox="0 0 40 60">
                {/* Body */}
                <path
                  d="M20 0 C10 10 5 30 5 45 L5 55 L15 50 L20 55 L25 50 L35 55 L35 45 C35 30 30 10 20 0"
                  fill="url(#rocketBody)"
                />
                {/* Window */}
                <circle cx="20" cy="25" r="6" fill="#60a5fa" />
                <circle cx="20" cy="25" r="4" fill="#93c5fd" />
                {/* Fins */}
                <path d="M5 45 L0 55 L5 50 Z" fill="#7c3aed" />
                <path d="M35 45 L40 55 L35 50 Z" fill="#7c3aed" />

                <defs>
                  <linearGradient id="rocketBody" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#e2e8f0" />
                    <stop offset="50%" stopColor="#f1f5f9" />
                    <stop offset="100%" stopColor="#94a3b8" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Flame */}
              <div
                className="rocket-flame absolute left-1/2 -translate-x-1/2 -bottom-4 w-4 h-8 rounded-b-full"
                style={{
                  background: 'linear-gradient(180deg, #fbbf24 0%, #f97316 50%, #dc2626 100%)',
                }}
              />

              {/* Wert neben der Rakete */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap">
                <span className="text-2xl font-bold text-white">{progress.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
