import React, { useState } from 'react';
import { Coins, Check, Clock, Loader2 } from 'lucide-react';

// Category icons/colors
const CATEGORY_CONFIG = {
  privilege: {
    color: 'from-purple-600/20 to-purple-800/20',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300'
  },
  activity: {
    color: 'from-blue-600/20 to-blue-800/20',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-300'
  },
  reward: {
    color: 'from-amber-600/20 to-amber-800/20',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300'
  },
  other: {
    color: 'from-slate-600/20 to-slate-800/20',
    border: 'border-slate-500/30',
    badge: 'bg-slate-500/20 text-slate-300'
  }
};

/**
 * StoreItemCard - Individual store item card
 */
export default function StoreItemCard({
  item,
  balance = 0,
  isPending = false,
  purchaseCount = 0,
  onPurchase,
  disabled = false
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const canAfford = balance >= item.cost;
  const categoryConfig = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;

  const handlePurchaseClick = () => {
    if (isPending || !canAfford || disabled) return;
    setIsConfirming(true);
  };

  const handleConfirm = async () => {
    if (isPurchasing) return;
    setIsPurchasing(true);
    try {
      await onPurchase(item.id);
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setIsPurchasing(false);
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    setIsConfirming(false);
  };

  return (
    <div
      className={`
        relative overflow-hidden
        bg-gradient-to-br ${categoryConfig.color}
        border ${categoryConfig.border}
        rounded-xl p-4
        transition-all duration-300
        ${canAfford && !isPending && !disabled ? 'hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/10' : 'opacity-75'}
      `}
    >
      {/* Pending Badge */}
      {isPending && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
          <Clock className="w-3 h-3 text-yellow-400" />
          <span className="text-xs text-yellow-300">Angefragt</span>
        </div>
      )}

      {/* Icon */}
      <div className="text-4xl mb-3">{item.icon || '?'}</div>

      {/* Name & Description */}
      <h4 className="font-semibold text-white text-lg mb-1">{item.name}</h4>
      <p className="text-sm text-slate-400 mb-3 line-clamp-2">{item.description}</p>

      {/* Category Badge */}
      <div className="mb-3">
        <span className={`text-xs px-2 py-1 rounded-full ${categoryConfig.badge}`}>
          {item.category === 'privilege' && 'Privileg'}
          {item.category === 'activity' && 'Aktivität'}
          {item.category === 'reward' && 'Belohnung'}
          {!['privilege', 'activity', 'reward'].includes(item.category) && 'Sonstiges'}
        </span>
      </div>

      {/* Price & Purchase Button */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-1.5">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className={`text-xl font-bold ${canAfford ? 'text-amber-400' : 'text-red-400'}`}>
            {item.cost}
          </span>
        </div>

        {isConfirming ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
              disabled={isPurchasing}
            >
              Abbrechen
            </button>
            <button
              onClick={handleConfirm}
              disabled={isPurchasing}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isPurchasing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Bestätigen
            </button>
          </div>
        ) : (
          <button
            onClick={handlePurchaseClick}
            disabled={isPending || !canAfford || disabled}
            className={`
              px-4 py-1.5 rounded-lg text-sm font-medium transition-all
              ${isPending
                ? 'bg-yellow-600/20 text-yellow-300 cursor-not-allowed'
                : canAfford && !disabled
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {isPending ? 'Wartet...' : canAfford ? 'Kaufen' : 'Zu teuer'}
          </button>
        )}
      </div>

      {/* Purchase count indicator */}
      {purchaseCount > 0 && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
          <Check className="w-3 h-3 text-green-400" />
          <span className="text-xs text-green-300">{purchaseCount}x gekauft</span>
        </div>
      )}
    </div>
  );
}
