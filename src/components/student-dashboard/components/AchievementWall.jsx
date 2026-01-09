import React, { useState, useMemo } from 'react';
import { Star, Sparkles, Target, ChevronRight } from 'lucide-react';
import { useAchievements } from '../hooks/useAchievements';
import { ACHIEVEMENT_CATEGORIES, getCategoryName } from '../config/achievements';
import AchievementCard from './AchievementCard';

/**
 * Achievement Wall - 4-Tier Rarity System
 * Displays achievements grouped by category with progressive unlocking
 *
 * @param {Object} studentData - Data from useStudentData hook
 * @param {Array} completedGoals - List of completed goals (for timeline)
 * @param {Array} competencies - List of competencies (for timeline labels)
 */
export default function AchievementWall({ studentData, completedGoals = [], competencies = [] }) {
  const [filterCategory, setFilterCategory] = useState('all');

  // Get achievements data
  const {
    achievements,
    groupedByCategory,
    stats
  } = useAchievements(studentData);

  // Filter achievements by selected category
  const filteredCategories = useMemo(() => {
    if (filterCategory === 'all') {
      return groupedByCategory;
    }

    return {
      [filterCategory]: groupedByCategory[filterCategory]
    };
  }, [groupedByCategory, filterCategory]);

  // Helper to get competency name
  const getCompetencyName = (compId) => {
    const comp = competencies.find(c => c.id === compId);
    return comp?.name || 'Unbekannt';
  };

  // Get available filter categories (only those with achievements)
  const availableCategories = useMemo(() => {
    const categories = Object.keys(groupedByCategory).map(key => ({
      key,
      name: getCategoryName(key),
      count: groupedByCategory[key].achievements.length,
      earned: groupedByCategory[key].achievements.filter(a => a.earned).length
    }));

    return categories;
  }, [groupedByCategory]);

  return (
    <div className="space-y-8">
      {/* Statistics Panel */}
      <div className="achievement-stats-panel">
        <div className="achievement-stat">
          <div className="achievement-stat-value">{stats.earned}</div>
          <div className="achievement-stat-label">Errungen</div>
        </div>
        <div className="achievement-stat">
          <div className="achievement-stat-value">{stats.total}</div>
          <div className="achievement-stat-label">Gesamt</div>
        </div>
        <div className="achievement-stat">
          <div className="achievement-stat-value">{stats.completionPercent}%</div>
          <div className="achievement-stat-label">Fortschritt</div>
        </div>
        <div className="achievement-stat">
          <div className="achievement-stat-value">
            {stats.byTier.legendary?.earned || 0}
          </div>
          <div className="achievement-stat-label">Legendär</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="achievement-filter-tabs">
        <button
          className={`achievement-filter-tab ${filterCategory === 'all' ? 'active' : ''}`}
          onClick={() => setFilterCategory('all')}
        >
          Alle ({stats.earned}/{stats.total})
        </button>
        {availableCategories.map(category => (
          <button
            key={category.key}
            className={`achievement-filter-tab ${filterCategory === category.key ? 'active' : ''}`}
            onClick={() => setFilterCategory(category.key)}
          >
            {category.name} ({category.earned}/{category.count})
          </button>
        ))}
      </div>

      {/* Achievement Categories */}
      <div className="space-y-6">
        {Object.entries(filteredCategories).map(([categoryKey, categoryData]) => (
          <div key={categoryKey} className="achievement-category-section">
            <h3 className="achievement-category-title">
              {categoryData.categoryName}
            </h3>

            {/* Tier Progression */}
            <div className="tier-progression">
              {categoryData.achievements.map((achievement, index) => (
                <React.Fragment key={achievement.id}>
                  <AchievementCard
                    achievement={achievement}
                    showNextTierPreview={true}
                  />

                  {/* Arrow between visible tiers */}
                  {index < categoryData.achievements.length - 1 &&
                   achievement.isVisible &&
                   categoryData.achievements[index + 1].isVisible && (
                    <div className="tier-arrow hidden md:block">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Completed Goals Timeline */}
      <div>
        <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Erreichte Ziele ({completedGoals.length})
        </h4>

        {completedGoals.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Noch keine Ziele erreicht.</p>
            <p className="text-sm mt-1">Setze dir Ziele und arbeite darauf hin!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {completedGoals
              .sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))
              .map((goal, index) => (
                <div
                  key={goal.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-green-500/20 hover:border-green-500/40 transition-colors"
                  style={{
                    animationDelay: `${index * 0.1}s`,
                  }}
                >
                  {/* Star indicator */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Star className="w-4 h-4 text-green-400 fill-green-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{goal.goal_text}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      {goal.competency_id && (
                        <>
                          <span className="text-purple-400">{getCompetencyName(goal.competency_id)}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{new Date(goal.completed_date).toLocaleDateString('de-DE')}</span>
                    </div>
                  </div>

                  {/* Celebration effect for recent */}
                  {index < 3 && (
                    <div className="flex-shrink-0 text-yellow-400 animate-bounce">
                      ✨
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Achievement Tips (Optional) */}
      {stats.earned === 0 && (
        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <h5 className="text-sm font-semibold text-purple-400 mb-2">
            🎯 Wie du Erfolge freischaltest
          </h5>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• Erreiche Ziele, um Goal-Achievements zu verdienen</li>
            <li>• Erledige Ämtlis für die Ämtli-Meisterschaft</li>
            <li>• Verbessere deine Noten für Exzellenz-Erfolge</li>
            <li>• Arbeite an deinen Schwächen für Eroberer-Erfolge</li>
            <li>• Reflektiere regelmäßig für Beständigkeits-Erfolge</li>
          </ul>
        </div>
      )}
    </div>
  );
}
