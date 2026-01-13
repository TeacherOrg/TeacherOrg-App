import React from 'react';
import { Coins } from 'lucide-react';

/**
 * CurrencyDisplay - Shows the student's currency balance
 * Styled as a space-themed badge/chip
 */
export default function CurrencyDisplay({ balance = 0, compact = false, className = '' }) {
  return (
    <div
      className={`
        flex items-center gap-2
        ${compact ? 'px-2 py-1' : 'px-3 py-2'}
        bg-gradient-to-r from-amber-600/20 to-yellow-600/20
        border border-amber-500/30
        rounded-lg
        backdrop-blur-sm
        ${className}
      `}
    >
      <div className="relative">
        <Coins className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-amber-400`} />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
      </div>
      <div className={compact ? '' : 'text-center'}>
        <div className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-amber-400`}>
          {balance}
        </div>
        {!compact && (
          <div className="text-xs text-amber-300/70">Punkte</div>
        )}
      </div>
    </div>
  );
}
