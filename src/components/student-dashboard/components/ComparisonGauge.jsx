import React from 'react';
import { Star, User, GraduationCap } from 'lucide-react';

/**
 * Visual comparison between teacher and self assessment
 * Shows both ratings side by side with gap indicator
 *
 * @param {number} teacherScore - Teacher's rating (1-5) or null
 * @param {number} selfScore - Student's self-rating (1-5) or null
 * @param {boolean} compact - Use compact layout
 */
export default function ComparisonGauge({ teacherScore, selfScore, compact = false }) {
  const getGapColor = (gap) => {
    if (gap === null || gap === undefined) return 'text-slate-400';
    if (gap === 0) return 'text-green-400';
    if (gap === 1) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getGapText = (gap) => {
    if (gap === null || gap === undefined) return '';
    if (gap === 0) return 'Übereinstimmung!';
    if (gap === 1) return 'Fast gleich';
    return 'Unterschied';
  };

  const gap = teacherScore && selfScore ? Math.abs(teacherScore - selfScore) : null;

  if (compact) {
    // RPG-Style horizontale Balken
    return (
      <div className="space-y-2 w-full">
        {/* Lehrer-Balken */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 w-16 flex-shrink-0">
            <GraduationCap className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-slate-400">LP</span>
          </div>
          <div className="flex-1 h-2.5 bg-slate-700/80 rounded-full overflow-hidden border border-slate-600">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: teacherScore ? `${(teacherScore / 5) * 100}%` : '0%',
                background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%)',
                boxShadow: teacherScore ? '0 0 8px rgba(59, 130, 246, 0.6)' : 'none'
              }}
            />
          </div>
          <span className="text-xs font-bold text-blue-400 w-6 text-right">
            {teacherScore || '-'}
          </span>
        </div>

        {/* Selbst-Balken */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 w-16 flex-shrink-0">
            <User className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-slate-400">Ich</span>
          </div>
          <div className="flex-1 h-2.5 bg-slate-700/80 rounded-full overflow-hidden border border-slate-600">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: selfScore ? `${(selfScore / 5) * 100}%` : '0%',
                background: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%)',
                boxShadow: selfScore ? '0 0 8px rgba(139, 92, 246, 0.6)' : 'none'
              }}
            />
          </div>
          <span className="text-xs font-bold text-purple-400 w-6 text-right">
            {selfScore || '-'}
          </span>
        </div>

        {/* Gap indicator - nur wenn beide Werte vorhanden */}
        {gap !== null && (
          <div className={`flex items-center justify-center gap-1 text-xs ${getGapColor(gap)} mt-1`}>
            {gap === 0 && <span className="animate-pulse">✨</span>}
            <span>{getGapText(gap)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="comparison-gauge p-4 rounded-lg bg-slate-800/50">
      <div className="grid grid-cols-2 gap-6">
        {/* Teacher Rating */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-slate-300">Lehrer</span>
          </div>
          <div className="gauge-bar bg-slate-700 h-3 rounded-full overflow-hidden">
            <div
              className="gauge-fill teacher h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: teacherScore ? `${(teacherScore / 5) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-500">1</span>
            <span className="text-sm font-bold text-blue-400">
              {teacherScore || '-'}
            </span>
            <span className="text-xs text-slate-500">5</span>
          </div>
        </div>

        {/* Self Rating */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-slate-300">Selbst</span>
          </div>
          <div className="gauge-bar bg-slate-700 h-3 rounded-full overflow-hidden">
            <div
              className="gauge-fill self h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: selfScore ? `${(selfScore / 5) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-500">1</span>
            <span className="text-sm font-bold text-purple-400">
              {selfScore || '-'}
            </span>
            <span className="text-xs text-slate-500">5</span>
          </div>
        </div>
      </div>

      {/* Gap Analysis */}
      {gap !== null && (
        <div className={`mt-4 pt-3 border-t border-slate-700 text-center`}>
          <span className={`text-sm font-medium ${getGapColor(gap)}`}>
            {gap === 0 && '✨ '}
            {getGapText(gap)}
            {gap > 0 && ` (${gap} ${gap === 1 ? 'Stern' : 'Sterne'})`}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Mini version for lists
 */
export function ComparisonDots({ teacherScore, selfScore }) {
  return (
    <div className="flex items-center gap-2">
      {/* Teacher dot */}
      <div
        className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-500/30"
        title={`Lehrer: ${teacherScore || '-'}`}
        style={{ opacity: teacherScore ? 1 : 0.3 }}
      />

      {/* Self dot */}
      <div
        className="w-3 h-3 rounded-full bg-purple-500 ring-2 ring-purple-500/30"
        title={`Selbst: ${selfScore || '-'}`}
        style={{ opacity: selfScore ? 1 : 0.3 }}
      />
    </div>
  );
}
