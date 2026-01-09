import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentWeek, getCurrentWeekYear } from '@/utils/timetableUtils';

/**
 * Hook zur Initialisierung nach erfolgreichem Login.
 * - Invalidiert React Query Caches für frisches Datenladen
 */
export const usePostLoginInit = (user) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    console.log('Post-Login Initialisierung: Invalidiere Caches für', user.id);

    // Aktuelle Woche und Jahr für Stundenplandaten ermitteln
    const currentYear = getCurrentWeekYear();
    const currentWeek = getCurrentWeek();

    // Stundenplan-Daten Query invalidieren
    queryClient.invalidateQueries({
      queryKey: ['timetableData', user.id, currentYear, currentWeek],
    });

    // Hier können in Zukunft weitere Initialisierungen hinzugefügt werden

  }, [user?.id, queryClient]);
};
