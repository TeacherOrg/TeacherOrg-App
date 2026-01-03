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
    return (
      <div className="flex items-center gap-4">
        {/* Teacher */}
        <div className="flex items-center gap-1">
          <GraduationCap className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-slate-300">
            {teacherScore ? `${teacherScore}/5` : '-'}
          </span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-600" />

        {/* Self */}
        <div className="flex items-center gap-1">
          <User className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-slate-300">
            {selfScore ? `${selfScore}/5` : '-'}
          </span>
        </div>

        {/* Gap indicator */}
        {gap !== null && (
          <span className={`text-xs ${getGapColor(gap)}`}>
            {getGapText(gap)}
          </span>
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
