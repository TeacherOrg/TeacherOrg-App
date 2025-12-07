export const CONFIG = {
  GRADES: { MIN: 1, MAX: 6, STEP: 0.25 },
  CHARTS: { HEIGHT: 300, ENLARGE_MAX_WIDTH: '95vw' },
  PAGINATION: { ITEMS_PER_PAGE: 10 },
  DEBOUNCE: { SAVE_DELAY: 500, SEARCH_DELAY: 300 },
  COMPETENCIES: { MIN_SCORE: 1, MAX_SCORE: 5 }
};

export const STUDENT_COLORS = [
  '#16A34A', // 1. Schüler: kräftiges Grün → perfekt!
  '#EA580C', '#0D9488', '#8B5CF6', '#EC4899', '#14B8A6',
  '#F59E0B', '#6366F1', '#EF4444', '#06B6D4', '#FBBF24',
  '#A78BFA', '#10B981', '#F97316', '#3B82F6'
];

export const CLASS_AVG_COLOR = '#2563EB'; // Etwas dunkleres Blau (blue-600) – noch klarer vom Grün getrennt

export const getStudentColor = (index) => STUDENT_COLORS[index % STUDENT_COLORS.length];