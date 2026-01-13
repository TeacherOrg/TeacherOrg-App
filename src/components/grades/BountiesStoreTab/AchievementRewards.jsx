import React, { useState, useMemo } from 'react';
import { Star, ChevronDown, ChevronRight, Coins, Loader2, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  achievementDefinitions,
  CATEGORY_NAMES,
  TIER_CONFIG
} from '@/components/student-dashboard/config/achievements';
import { useAchievementRewards } from './hooks/useAchievementRewards';

/**
 * AchievementRewards - Manage coin rewards for achievements
 * Allows teachers to customize coin rewards per achievement tier
 */
export default function AchievementRewards() {
  const { rewards, getReward, updateReward, resetReward, isLoading, DEFAULT_REWARDS } = useAchievementRewards();
  const [expandedCategories, setExpandedCategories] = useState({});
  const [editingAchievement, setEditingAchievement] = useState(null);
  const [editValue, setEditValue] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Group achievements by category
  const groupedAchievements = useMemo(() => {
    return achievementDefinitions.reduce((acc, ach) => {
      const cat = ach.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(ach);
      return acc;
    }, {});
  }, []);

  const handleOpenEdit = (achievement) => {
    setEditingAchievement(achievement);
    setEditValue(getReward(achievement.id, achievement.tier));
  };

  const handleSave = async () => {
    if (!editingAchievement) return;

    setIsSaving(true);
    try {
      await updateReward(editingAchievement.id, editValue);
      setEditingAchievement(null);
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!editingAchievement) return;

    setIsSaving(true);
    try {
      await resetReward(editingAchievement.id, editingAchievement.tier);
      setEditingAchievement(null);
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Check if a reward has been customized
  const isCustomized = (achievementId) => {
    return rewards[achievementId] !== undefined;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mb-6">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-500" />
          Erfolge & Coin-Belohnungen
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Passe an, wie viele Coins deine Schüler für jeden Erfolg erhalten.
        </p>
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span>Common: {DEFAULT_REWARDS.common} Coin</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Rare: {DEFAULT_REWARDS.rare} Coins</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <span>Epic: {DEFAULT_REWARDS.epic} Coins</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Legendary: {DEFAULT_REWARDS.legendary} Coins</span>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
        {Object.entries(groupedAchievements).map(([category, achievements]) => (
          <Card key={category} className="overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <span className="font-medium flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                {CATEGORY_NAMES[category] || category}
                <span className="text-sm text-slate-500 font-normal">
                  ({achievements.length})
                </span>
              </span>
              {expandedCategories[category] ? (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {expandedCategories[category] && (
              <CardContent className="pt-0 pb-3 space-y-1">
                {achievements.map(ach => {
                  const tierConfig = TIER_CONFIG[ach.tier];
                  const coins = getReward(ach.id, ach.tier);
                  const customized = isCustomized(ach.id);

                  return (
                    <div
                      key={ach.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{ach.name}</span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{
                                backgroundColor: tierConfig.color + '20',
                                color: tierConfig.color
                              }}
                            >
                              {tierConfig.displayName}
                            </span>
                            {customized && (
                              <span className="text-xs text-purple-500 font-medium">
                                (angepasst)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate max-w-[250px]">
                            {ach.description}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenEdit(ach)}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-full
                          transition-colors shrink-0 ml-2
                          ${customized
                            ? 'bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                            : 'bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                          }
                        `}
                      >
                        <Coins className={`w-4 h-4 ${customized ? 'text-purple-600' : 'text-amber-600'}`} />
                        <span className={`font-medium ${customized ? 'text-purple-700 dark:text-purple-400' : 'text-amber-700 dark:text-amber-400'}`}>
                          {coins}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      {editingAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">{editingAchievement.name}</h3>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: TIER_CONFIG[editingAchievement.tier].color + '20',
                    color: TIER_CONFIG[editingAchievement.tier].color
                  }}
                >
                  {TIER_CONFIG[editingAchievement.tier].displayName}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-4">{editingAchievement.description}</p>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Coin-Belohnung</label>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditValue(Math.max(0, editValue - 1))}
                    disabled={isSaving}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={editValue}
                    onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                    className="w-20 text-center"
                    disabled={isSaving}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditValue(Math.min(20, editValue + 1))}
                    disabled={isSaving}
                  >
                    +
                  </Button>
                  <Coins className="w-5 h-5 text-amber-500 ml-1" />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Standard: {DEFAULT_REWARDS[editingAchievement.tier]} Coins
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Speichern'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isSaving || !isCustomized(editingAchievement.id)}
                  className="flex items-center gap-1"
                >
                  <RotateCcw className="w-4 h-4" />
                  Standard
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setEditingAchievement(null)}
                  disabled={isSaving}
                >
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
