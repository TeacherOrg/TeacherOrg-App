// Student Dashboard - Main Export
export { default as StudentDashboard } from './StudentDashboard';
export { SpaceThemeProvider, useSpaceTheme } from './SpaceThemeProvider';

// Components
export { default as SpaceBackground, SpaceCard, Planet, Asteroid, RocketProgress } from './components/SpaceBackground';
export { default as SelfAssessmentStars, StarDisplay } from './components/SelfAssessmentStars';
export { default as ComparisonGauge, ComparisonDots } from './components/ComparisonGauge';
export { default as GoalsList } from './components/GoalsList';
export { default as AchievementWall } from './components/AchievementWall';

// Hooks
export { useStudentData } from './hooks/useStudentData';
export { useSelfAssessments } from './hooks/useSelfAssessments';
export { useCompetencyGoals } from './hooks/useCompetencyGoals';
