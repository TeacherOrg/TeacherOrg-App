import { useState, useEffect } from 'react';

const STORAGE_KEY = 'yearViewMode';
const VALID_MODES = ['calendar', 'school'];
const DEFAULT_MODE = 'calendar';

/**
 * Custom hook for managing year view mode with localStorage persistence.
 * Handles the toggle between 'calendar' and 'school' year views.
 *
 * @returns {[string, Function]} Tuple of [yearViewMode, setYearViewMode]
 */
export const useYearViewMode = () => {
  const [yearViewMode, setYearViewMode] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (VALID_MODES.includes(saved)) {
        return saved;
      }
    }
    return DEFAULT_MODE;
  });

  // Persist to localStorage when mode changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, yearViewMode);
  }, [yearViewMode]);

  return [yearViewMode, setYearViewMode];
};

export default useYearViewMode;
