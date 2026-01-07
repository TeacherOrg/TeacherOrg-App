import React, { useState } from 'react';
import { Rocket, Target, Calendar, Trophy, Star, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import SpaceBackground, { SpaceCard, Planet, Asteroid, RocketProgress } from './components/SpaceBackground';
import { SpaceThemeProvider } from './SpaceThemeProvider';
import { useStudentData } from './hooks/useStudentData';
import { useSelfAssessments } from './hooks/useSelfAssessments';
import { useCompetencyGoals } from './hooks/useCompetencyGoals';
import SelfAssessmentStars from './components/SelfAssessmentStars';
import ComparisonGauge from './components/ComparisonGauge';
import GoalsList from './components/GoalsList';
import AchievementWall from './components/AchievementWall';

/**
 * Main Student Dashboard Component
 * Gamified space-themed view of student performance and competencies
 *
 * @param {string} studentId - Optional student ID (for teachers viewing a student)
 */
export default function StudentDashboard({ studentId = null }) {
  const [activeTab, setActiveTab] = useState('overview');

  // Load all student data
  const {
    student,
    classInfo,
    gradeAverage,
    strengths,
    weaknesses,
    conqueredCount,
    competencyData,
    stats,
    goals,
    loading,
    error,
    isStudent,
    refresh
  } = useStudentData(studentId);

  // Self-assessment operations
  const selfAssessmentOps = useSelfAssessments(student?.id, refresh);

  // Goal operations
  const goalOps = useCompetencyGoals(student?.id, refresh);

  if (loading) {
    return (
      <SpaceThemeProvider>
        <SpaceBackground className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
            <p className="text-slate-400">Lade Dashboard...</p>
          </div>
        </SpaceBackground>
      </SpaceThemeProvider>
    );
  }

  if (error) {
    return (
      <SpaceThemeProvider>
        <SpaceBackground className="flex items-center justify-center min-h-screen">
          <SpaceCard className="max-w-md text-center">
            <div className="text-red-400 text-lg mb-2">Fehler</div>
            <p className="text-slate-300">{error}</p>
          </SpaceCard>
        </SpaceBackground>
      </SpaceThemeProvider>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Übersicht', icon: Rocket },
    { id: 'competencies', label: 'Kompetenzen', icon: Target },
    { id: 'goals', label: 'Ziele', icon: Trophy },
    { id: 'achievements', label: 'Erfolge', icon: Star },
  ];

  return (
    <SpaceThemeProvider>
      <SpaceBackground>
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Rocket className="w-8 h-8 text-purple-400" />
                  {isStudent ? 'Mein Dashboard' : `Dashboard: ${student?.name}`}
                </h1>
                <p className="text-slate-400 mt-1">
                  {classInfo?.name || 'Klasse'} • Schuljahr {new Date().getFullYear()}
                </p>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {gradeAverage?.toFixed(1) || '-'}
                  </div>
                  <div className="text-xs text-slate-400">Durchschnitt</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {stats.completedGoals}
                  </div>
                  <div className="text-xs text-slate-400">Ziele erreicht</div>
                </div>
              </div>
            </div>
          </header>

          {/* Tabs Navigation */}
          <nav className="space-tabs mb-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`space-tab flex items-center gap-2 ${activeTab === tab.id ? 'active' : ''}`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Tab Content */}
          <main>
            {activeTab === 'overview' && (
              <OverviewTab
                gradeAverage={gradeAverage}
                strengths={strengths}
                weaknesses={weaknesses}
                stats={stats}
              />
            )}

            {activeTab === 'competencies' && (
              <CompetenciesTab
                competencyData={competencyData}
                selfAssessmentOps={selfAssessmentOps}
                selfAssessments={competencyData.flatMap(c => c.selfHistory || [])}
                goalOps={goalOps}
                isStudent={isStudent}
              />
            )}

            {activeTab === 'goals' && (
              <GoalsTab
                competencyData={competencyData}
                goals={goals}
                goalOps={goalOps}
                isStudent={isStudent}
              />
            )}

            {activeTab === 'achievements' && (
              <AchievementsTab
                goals={goals}
                stats={stats}
                competencyData={competencyData}
                conqueredCount={conqueredCount}
              />
            )}
          </main>
        </div>
      </SpaceBackground>
    </SpaceThemeProvider>
  );
}

// === Tab Components ===

function OverviewTab({ gradeAverage, strengths, weaknesses, stats }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Rocket Progress */}
      <SpaceCard className="lg:row-span-2">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Mein Fortschritt
        </h3>
        <RocketProgress
          progress={gradeAverage || 0}
          maxProgress={6}
        />
      </SpaceCard>

      {/* Strengths */}
      <SpaceCard>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" />
          Meine Stärken
        </h3>
        <div className="flex justify-around items-end gap-4 py-4">
          {strengths.length > 0 ? (
            strengths.map((s, i) => (
              <div key={s.name} className="text-center">
                <Planet
                  size={60 - i * 10}
                  color={i === 0 ? 'gold' : i === 1 ? 'silver' : 'bronze'}
                  rank={i + 1}
                >
                  <span className="text-xs">{s.average.toFixed(1)}</span>
                </Planet>
                <p className="mt-2 text-sm text-slate-300 truncate max-w-[80px]" title={s.name}>
                  {s.name}
                </p>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-sm">Noch keine Daten</p>
          )}
        </div>
      </SpaceCard>

      {/* Weaknesses */}
      <SpaceCard>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-red-400" />
          Zu erobern
        </h3>
        <div className="flex justify-around items-center gap-4 py-4">
          {weaknesses.length > 0 ? (
            weaknesses.map((w, i) => (
              <div key={w.name} className="text-center">
                <Asteroid
                  size={50}
                  color={w.color}
                  conquered={w.conquered}
                  improvement={w.improvement}
                >
                  <span className="text-xs">{w.average.toFixed(1)}</span>
                </Asteroid>
                <p className="mt-2 text-sm text-slate-300 truncate max-w-[80px]" title={w.name}>
                  {w.name}
                </p>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-sm">Keine Schwächen identifiziert</p>
          )}
        </div>
      </SpaceCard>

      {/* Stats Summary */}
      <SpaceCard className="lg:col-span-2">
        <h3 className="text-lg font-semibold text-white mb-4">Statistiken</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatItem label="Bewertungen" value={stats.totalPerformances} color="blue" />
          <StatItem label="Kompetenzen" value={`${stats.assessedCompetencies}/${stats.totalCompetencies}`} color="purple" />
          <StatItem label="Aktive Ziele" value={stats.activeGoals} color="yellow" />
          <StatItem label="Erreichte Ziele" value={stats.completedGoals} color="green" />
          <StatItem label="Ämtlis erledigt" value={`${stats.completedChores || 0}/${stats.totalChores || 0}`} color="orange" />
        </div>
      </SpaceCard>
    </div>
  );
}

function StatItem({ label, value, color }) {
  const colors = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
  };

  return (
    <div className="text-center p-3 bg-slate-800/50 rounded-lg">
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function CompetenciesTab({ competencyData, selfAssessmentOps, goalOps, isStudent, selfAssessments = [] }) {
  const [selectedCompetency, setSelectedCompetency] = useState(null);

  // Helper to format next rating date
  const formatNextRatingDate = (date) => {
    if (!date) return '';
    return `Ab ${date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'short' })}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {competencyData.length === 0 ? (
        <SpaceCard className="md:col-span-2">
          <p className="text-slate-400 text-center py-8">
            Noch keine Kompetenzen definiert.
          </p>
        </SpaceCard>
      ) : (
        competencyData.map(comp => {
          const canRate = selfAssessmentOps.canRateThisWeek(selfAssessments, comp.id);
          const nextRatingDate = selfAssessmentOps.getNextRatingDate(selfAssessments, comp.id);

          return (
            <SpaceCard
              key={comp.id}
              className={selectedCompetency === comp.id ? 'border-purple-500' : ''}
              onClick={() => setSelectedCompetency(selectedCompetency === comp.id ? null : comp.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-white">{comp.name}</h4>

                  {/* Comparison Gauge */}
                  <div className="mt-3">
                    <ComparisonGauge
                      teacherScore={comp.teacherScore}
                      selfScore={comp.selfScore}
                      compact
                    />
                  </div>
                </div>

                {/* Self Assessment */}
                {isStudent && (
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-1">Meine Einschätzung</p>
                    <SelfAssessmentStars
                      currentRating={comp.selfScore}
                      onRate={(score) => selfAssessmentOps.rateSelf(comp.id, score)}
                      loading={selfAssessmentOps.loading}
                      disabled={!canRate}
                      disabledMessage={formatNextRatingDate(nextRatingDate)}
                    />
                  </div>
                )}
            </div>

            {/* Expanded details */}
            {selectedCompetency === comp.id && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-slate-300 mb-2">Lehrer-Bewertung</h5>
                    <p className="text-slate-400 text-sm">
                      {comp.teacherScore ? (
                        <>
                          {comp.teacherScore} / 5 Sterne
                          <span className="text-xs ml-2">({comp.teacherDate})</span>
                        </>
                      ) : (
                        'Noch nicht bewertet'
                      )}
                    </p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-slate-300 mb-2">Ziele</h5>
                    <p className="text-slate-400 text-sm">
                      {comp.completedGoals} / {comp.totalGoals} erreicht
                    </p>
                  </div>
                </div>
              </div>
            )}
          </SpaceCard>
          );
        })
      )}
    </div>
  );
}

function GoalsTab({ competencyData, goals, goalOps, isStudent }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SpaceCard>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-yellow-400" />
          Aktive Ziele
        </h3>
        <GoalsList
          goals={goalOps.getActiveGoals(goals)}
          competencies={competencyData}
          goalOps={goalOps}
          isStudent={isStudent}
          showAddButton
        />
      </SpaceCard>

      <SpaceCard>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-green-400" />
          Erledigte Ziele
        </h3>
        <GoalsList
          goals={goalOps.getCompletedGoals(goals)}
          competencies={competencyData}
          goalOps={goalOps}
          isStudent={isStudent}
          showAddButton={false}
        />
      </SpaceCard>
    </div>
  );
}

function AchievementsTab({ goals, stats, competencyData, conqueredCount }) {
  return (
    <div>
      <SpaceCard>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Erfolge
        </h3>
        <AchievementWall
          completedGoals={goals.filter(g => g.is_completed)}
          competencies={competencyData}
          stats={stats}
          conqueredCount={conqueredCount}
        />
      </SpaceCard>
    </div>
  );
}
