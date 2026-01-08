import { useState, useEffect, useCallback } from 'react';
import pb from '@/api/pb';

const VALID_OPTIONS = ['firstName', 'lastName'];
const DEFAULT_OPTION = 'firstName';

/**
 * Custom hook for managing student sort preference with PocketBase persistence.
 * Syncs between devices via PocketBase users collection.
 *
 * @returns {[string, Function, boolean]} Tuple of [sortPreference, setSortPreference, isLoading]
 */
export const useStudentSortPreference = () => {
  const [sortPreference, setSortPreferenceState] = useState(DEFAULT_OPTION);
  const [isLoading, setIsLoading] = useState(true);

  // Load from PocketBase on mount
  useEffect(() => {
    const user = pb.authStore.model;
    if (user) {
      const saved = user.student_sort_preference;
      if (VALID_OPTIONS.includes(saved)) {
        setSortPreferenceState(saved);
      }
    }
    setIsLoading(false);
  }, []);

  // Save to PocketBase
  const setSortPreference = useCallback(async (value) => {
    if (!VALID_OPTIONS.includes(value)) return;

    setSortPreferenceState(value);

    const user = pb.authStore.model;
    if (user) {
      try {
        await pb.collection('users').update(user.id, {
          student_sort_preference: value
        });
      } catch (error) {
        console.error('Failed to save sort preference:', error);
      }
    }
  }, []);

  return [sortPreference, setSortPreference, isLoading];
};

export default useStudentSortPreference;
