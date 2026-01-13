import React, { useState } from 'react';
import { Scroll, ShoppingBag, CheckCircle, Coins, Star } from 'lucide-react';
import BountyManager from './BountyManager';
import StoreManager from './StoreManager';
import PurchaseApprovals from './PurchaseApprovals';
import CurrencyOverview from './CurrencyOverview';
import AchievementRewards from './AchievementRewards';
import { useBountyManager } from '@/components/student-dashboard/hooks/useBounties';
import { useStoreManager } from '@/components/student-dashboard/hooks/useStore';
import { useAllStudentsCurrency } from '@/components/student-dashboard/hooks/useCurrency';

/**
 * BountiesStoreTab - Main teacher interface for managing bounties, store, and currency
 * Displayed as a tab in the StudentsOverview page
 */
export default function BountiesStoreTab({ students = [], activeClassId }) {
  const [activeSubTab, setActiveSubTab] = useState('bounties');

  // Load all data
  const bountyManager = useBountyManager();
  const storeManager = useStoreManager();
  const currencyOverview = useAllStudentsCurrency(activeClassId);

  const subTabs = [
    {
      id: 'bounties',
      label: 'Bounties',
      icon: Scroll,
      badge: bountyManager.activeBounties?.length || 0
    },
    {
      id: 'store',
      label: 'Store',
      icon: ShoppingBag,
      badge: storeManager.items?.length || 0
    },
    {
      id: 'approvals',
      label: 'Käufe',
      icon: CheckCircle,
      badge: storeManager.pendingPurchases?.length || 0,
      badgeColor: storeManager.pendingPurchases?.length > 0 ? 'bg-yellow-500' : 'bg-slate-500'
    },
    {
      id: 'achievements',
      label: 'Erfolge',
      icon: Star
    },
    {
      id: 'currency',
      label: 'Währung',
      icon: Coins
    }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sub-Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-4 mb-4 flex-shrink-0">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${isActive
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`
                  ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full
                  ${tab.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300')}
                  ${tab.badgeColor === 'bg-yellow-500' ? 'text-black' : ''}
                `}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Content - Scrollable */}
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
        {activeSubTab === 'bounties' && (
          <BountyManager
            bountyManager={bountyManager}
            students={students}
            activeClassId={activeClassId}
          />
        )}

        {activeSubTab === 'store' && (
          <StoreManager storeManager={storeManager} />
        )}

        {activeSubTab === 'approvals' && (
          <PurchaseApprovals
            storeManager={storeManager}
            students={students}
          />
        )}

        {activeSubTab === 'achievements' && (
          <AchievementRewards />
        )}

        {activeSubTab === 'currency' && (
          <CurrencyOverview
            currencyData={currencyOverview.currencyData}
            students={students}
            isLoading={currencyOverview.isLoading}
          />
        )}
      </div>
    </div>
  );
}
