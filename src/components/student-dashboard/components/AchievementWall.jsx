import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Star, Sparkles, Target, ChevronRight } from 'lucide-react';
import { useAchievements } from '../hooks/useAchievements';
import { MAIN_CATEGORIES, MAIN_CATEGORY_NAMES } from '../config/achievements';
import AchievementCard from './AchievementCard';

/**
 * Achievement Wall - Progression System with 2 Main Categories
 * Displays achievement progressions grouped by main category (Fächer, Kompetenzen)
 * Each progression is ONE transforming card that changes as student progresses
 *
 * @param {Object} studentData - Data from useStudentData hook
 * @param {Array} completedGoals - List of completed goals (for timeline)
 * @param {Array} competencies - List of competencies (for timeline labels)
 */
export default function AchievementWall({ studentData, completedGoals = [], competencies = [] }) {
  const [filterMainCategory, setFilterMainCategory] = useState('all');
  const viewportRef = useRef(null);
  const statsPanelRef = useRef(null);
  const filterTabsRef = useRef(null);

  // Get progressions data (NEW)
  const {
    progressions,
    groupedByMainCategory,
    groupedBySubCategory,
    progressionStats
  } = useAchievements(studentData);

  // Calculate dynamic viewport height based on actual element measurements
  useEffect(() => {
    const calculateHeight = () => {
      if (!viewportRef.current) return;

      // Measure actual heights
      const statsHeight = statsPanelRef.current?.offsetHeight || 0;
      const tabsHeight = filterTabsRef.current?.offsetHeight || 0;

      // Fixed overhead: space-card padding, margins, safety buffer
      const containerPadding = 32; // 2rem top + bottom from space-card
      const additionalMargins = 375; // Actual margins: ~336px + 39px safety buffer
      const safetyMargin = 20; // Extra buffer

      const totalOverhead = statsHeight + tabsHeight + containerPadding + additionalMargins + safetyMargin;
      const availableHeight = Math.max(300, window.innerHeight - totalOverhead);

      // Set CSS variable
      viewportRef.current.style.setProperty('--available-height', `${availableHeight}px`);
    };

    calculateHeight();

    // Observe size changes
    const observer = new ResizeObserver(calculateHeight);
    if (statsPanelRef.current) observer.observe(statsPanelRef.current);
    if (filterTabsRef.current) observer.observe(filterTabsRef.current);

    // Window resize
    window.addEventListener('resize', calculateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', calculateHeight);
    };
  }, [progressions]);

  // Determine which main categories to show based on filter
  const categoriesToShow = filterMainCategory === 'all'
    ? Object.keys(groupedByMainCategory)
    : [filterMainCategory];

  // Helper to get competency name
  const getCompetencyName = (compId) => {
    const comp = competencies.find(c => c.id === compId);
    return comp?.name || 'Unbekannt';
  };

  return (
    <div className="space-y-8">
      {/* Statistics Panel */}
      <div ref={statsPanelRef} className="achievement-stats-panel">
        <div className="achievement-stat">
          <div className="achievement-stat-value">{progressionStats.earnedTiers}</div>
          <div className="achievement-stat-label">Erreichte Erfolge</div>
        </div>
        <div className="achievement-stat">
          <div className="achievement-stat-value">{progressionStats.totalTiers}</div>
          <div className="achievement-stat-label">Gesamt</div>
        </div>
        <div className="achievement-stat">
          <div className="achievement-stat-value">{progressionStats.completionPercent}%</div>
          <div className="achievement-stat-label">Fortschritt</div>
        </div>
        <div className="achievement-stat">
          <div className="achievement-stat-value">{progressionStats.completedProgressions}</div>
          <div className="achievement-stat-label">Gemeistert</div>
        </div>
      </div>

      {/* Filter Tabs - ONLY 2 MAIN CATEGORIES */}
      <div ref={filterTabsRef} className="achievement-filter-tabs">
        <button
          className={`achievement-filter-tab ${filterMainCategory === 'all' ? 'active' : ''}`}
          onClick={() => setFilterMainCategory('all')}
        >
          Alle ({progressionStats.earnedTiers}/{progressionStats.totalTiers})
        </button>
        <button
          className={`achievement-filter-tab ${filterMainCategory === MAIN_CATEGORIES.FAECHER ? 'active' : ''}`}
          onClick={() => setFilterMainCategory(MAIN_CATEGORIES.FAECHER)}
        >
          Fächer ({progressionStats.byMainCategory[MAIN_CATEGORIES.FAECHER].earned}/{progressionStats.byMainCategory[MAIN_CATEGORIES.FAECHER].total})
        </button>
        <button
          className={`achievement-filter-tab ${filterMainCategory === MAIN_CATEGORIES.KOMPETENZEN ? 'active' : ''}`}
          onClick={() => setFilterMainCategory(MAIN_CATEGORIES.KOMPETENZEN)}
        >
          Kompetenzen ({progressionStats.byMainCategory[MAIN_CATEGORIES.KOMPETENZEN].earned}/{progressionStats.byMainCategory[MAIN_CATEGORIES.KOMPETENZEN].total})
        </button>
      </div>

      {/* Achievement Progressions grouped by Main Category → Sub Category */}
      <div ref={viewportRef} className="achievements-viewport">
        <div className="space-y-8">
          {categoriesToShow.map(mainCategory => (
            <div key={mainCategory} className="main-category-section">
              {/* Main Category Title (h2) */}
              <h2 className="main-category-title">
                {MAIN_CATEGORY_NAMES[mainCategory]}
              </h2>

              {/* Subcategories Container - Horizontal Scroll */}
              <div className="subcategories-container">
                {Object.entries(groupedBySubCategory[mainCategory] || {}).map(([subCategory, data]) => (
                  <div key={subCategory} className="subcategory-column">
                    {/* Sub Category Title (h3) */}
                    <h3 className="achievement-category-title">
                      {data.categoryName}
                    </h3>

                    {/* Cards for this subcategory (stacked vertically) */}
                    <div className="subcategory-cards">
                      {data.progressions.map(progression => (
                        <AchievementCard
                          key={progression.id}
                          progression={progression}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement Tips (Optional) */}
      {progressionStats.earnedTiers === 0 && (
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
