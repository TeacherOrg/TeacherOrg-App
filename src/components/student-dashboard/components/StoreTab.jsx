import React, { useState } from 'react';
import { ShoppingBag, Coins, History, Package, Loader2, Clock, Check, X } from 'lucide-react';
import { SpaceCard } from './SpaceBackground';
import StoreItemCard from './StoreItemCard';
import CurrencyDisplay from './CurrencyDisplay';
import { toast } from 'sonner';

// Category display names
const CATEGORY_NAMES = {
  privilege: 'Privilegien',
  activity: 'Aktivitäten',
  reward: 'Belohnungen'
};

/**
 * StoreTab - Store view for students to browse and purchase items
 */
export default function StoreTab({ studentId, currencyData, storeData }) {
  const [activeView, setActiveView] = useState('store'); // 'store' | 'history'
  const [selectedCategory, setSelectedCategory] = useState('all');

  const {
    balance = 0,
    lifetimeEarned = 0,
    lifetimeSpent = 0
  } = currencyData || {};

  const {
    items = [],
    itemsByCategory = {},
    purchases = [],
    pendingPurchases = [],
    hasPendingPurchase,
    getPurchaseHistory,
    requestPurchase,
    refresh,
    isLoading
  } = storeData || {};

  // Handle purchase request
  const handlePurchase = async (itemId) => {
    try {
      await requestPurchase(itemId);
      toast.success('Kaufanfrage gesendet! Warte auf Genehmigung.');
    } catch (error) {
      toast.error('Fehler beim Kaufen. Bitte versuche es erneut.');
      throw error;
    }
  };

  // Get filtered items
  const getFilteredItems = () => {
    if (selectedCategory === 'all') return items;
    return itemsByCategory[selectedCategory] || [];
  };

  // Get categories that have items
  const availableCategories = Object.keys(itemsByCategory).filter(
    cat => itemsByCategory[cat]?.length > 0
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-600 to-yellow-600 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Store</h2>
            <p className="text-sm text-slate-400">Tausche deine Punkte gegen Belohnungen</p>
          </div>
        </div>

        {/* Currency Balance */}
        <CurrencyDisplay balance={balance} />
      </div>

      {/* View Toggle & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* View Toggle */}
        <div className="flex bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setActiveView('store')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'store'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            Store
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'history'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Verlauf
            {pendingPurchases.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded-full">
                {pendingPurchases.length}
              </span>
            )}
          </button>
        </div>

        {/* Category Filter (only in store view) */}
        {activeView === 'store' && availableCategories.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              Alle
            </button>
            {availableCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                {CATEGORY_NAMES[cat] || cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Store View */}
      {activeView === 'store' && (
        <>
          {/* Pending Purchases Alert */}
          {pendingPurchases.length > 0 && (
            <SpaceCard className="border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-yellow-300 font-medium">
                    {pendingPurchases.length} Anfrage{pendingPurchases.length > 1 ? 'n' : ''} wartet auf Genehmigung
                  </p>
                  <p className="text-sm text-yellow-400/70">
                    Dein Lehrer wird deine Anfragen bald bearbeiten.
                  </p>
                </div>
              </div>
            </SpaceCard>
          )}

          {/* Items Grid */}
          {getFilteredItems().length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredItems().map(item => (
                <StoreItemCard
                  key={item.id}
                  item={item}
                  balance={balance}
                  isPending={hasPendingPurchase?.(item.id)}
                  purchaseCount={getPurchaseHistory?.(item.id)?.length || 0}
                  onPurchase={handlePurchase}
                />
              ))}
            </div>
          ) : (
            <SpaceCard>
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Noch keine Items im Store</p>
                <p className="text-sm text-slate-500">Dein Lehrer wird bald Items hinzufügen.</p>
              </div>
            </SpaceCard>
          )}
        </>
      )}

      {/* History View */}
      {activeView === 'history' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <SpaceCard className="text-center">
              <Coins className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-400">{lifetimeEarned}</p>
              <p className="text-xs text-slate-400">Verdient</p>
            </SpaceCard>
            <SpaceCard className="text-center">
              <ShoppingBag className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-400">{lifetimeSpent}</p>
              <p className="text-xs text-slate-400">Ausgegeben</p>
            </SpaceCard>
            <SpaceCard className="text-center">
              <Coins className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-400">{balance}</p>
              <p className="text-xs text-slate-400">Aktuell</p>
            </SpaceCard>
          </div>

          {/* Purchase History */}
          <SpaceCard>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              Kaufverlauf
            </h3>

            {purchases.length > 0 ? (
              <div className="space-y-3">
                {purchases
                  .sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at))
                  .map(purchase => {
                    const statusConfig = {
                      pending: {
                        icon: Clock,
                        color: 'text-yellow-400',
                        bg: 'bg-yellow-500/10',
                        label: 'Wartet'
                      },
                      approved: {
                        icon: Check,
                        color: 'text-green-400',
                        bg: 'bg-green-500/10',
                        label: 'Genehmigt'
                      },
                      rejected: {
                        icon: X,
                        color: 'text-red-400',
                        bg: 'bg-red-500/10',
                        label: 'Abgelehnt'
                      }
                    };
                    const config = statusConfig[purchase.status] || statusConfig.pending;
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={purchase.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${config.bg}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{purchase.item_icon || '?'}</span>
                          <div>
                            <p className="font-medium text-white">{purchase.item_name}</p>
                            <p className="text-xs text-slate-400">
                              {new Date(purchase.requested_at).toLocaleDateString('de-DE', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Coins className="w-4 h-4 text-amber-400" />
                            <span className="font-medium text-amber-400">{purchase.cost}</span>
                          </div>
                          <div className={`flex items-center gap-1 ${config.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            <span className="text-sm">{config.label}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-6">
                <History className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400">Noch keine Käufe</p>
              </div>
            )}
          </SpaceCard>
        </div>
      )}
    </div>
  );
}
