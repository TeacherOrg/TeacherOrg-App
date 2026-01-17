// src/hooks/useAllYearlyLessons.js
import { useQuery, useQueryClient } from '@tanstack/react-query';
import pb from '@/api/pb';
import { useLessonStore } from '@/store';
import { useCallback, useEffect } from 'react';

export default function useAllYearlyLessons(currentYear) {
  const queryClient = useQueryClient();
  const { setAllYearlyLessons } = useLessonStore();
  const userId = pb.authStore.model?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['allYearlyLessons', userId, currentYear],
    queryFn: async () => {
      if (!userId) return [];

      // 1. Hole geteilte Klassen-IDs via Team Teaching (NUR nicht-versteckte)
      // WICHTIG: owner_id != userId um Self-Team-Teaching-Records auszuschließen
      const teamTeachings = await pb.collection('team_teachings').getFullList({
        filter: `invited_user_id = '${userId}' && status = 'accepted' && owner_id != '${userId}'`,
        $autoCancel: false
      }).catch(() => []);
      // Nur nicht-versteckte Klassen für Daten-Loading
      const sharedClassIds = teamTeachings
        .filter(tt => !tt.is_hidden)
        .map(tt => tt.class_id);

      // 2. Baue Filter für eigene + geteilte Klassen
      let filter = `user_id = '${userId}'`;
      if (sharedClassIds.length > 0) {
        const classFilters = sharedClassIds.map(id => `class_id = '${id}'`).join(' || ');
        filter = `(${filter}) || (${classFilters})`;
      }

      console.log('[useAllYearlyLessons] Filter:', filter, 'Shared classes:', sharedClassIds);

      const records = await pb.collection('yearly_lessons').getFullList({
        filter,
        expand: 'topic,subject',
      });

      return records.map(l => ({ ...l, lesson_number: Number(l.lesson_number) }));
    },
    staleTime: 1000 * 60 * 5, // 5 Minuten - verhindert automatisches Refetch und ermöglicht optimistic updates
    gcTime: 1000 * 60 * 10,
  });

  // WICHTIG: Synchronisiere den globalen Store mit den frischen Daten!
  useEffect(() => {
    if (data) {
      setAllYearlyLessons(data);
    }
  }, [data, setAllYearlyLessons]);

  const refetchAllYearlyLessons = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['allYearlyLessons', userId, currentYear] });
  }, [queryClient, userId, currentYear]);

  // Optimistische Update-Funktion für React Query Cache
  const optimisticUpdate = useCallback((updatedLesson, isNew = false, isDelete = false) => {
    if (!updatedLesson) {
      console.error('Error: updatedLesson is null or undefined in optimisticUpdate');
      return;
    }
    if (isDelete && !updatedLesson.id) {
      console.error('Error: Cannot delete lesson without id');
      return;
    }

    // Update den Cache direkt
    const newData = queryClient.setQueryData(['allYearlyLessons', userId, currentYear], (oldData) => {
      if (!oldData) return oldData;
      
      let updatedData = [...oldData];
      
      if (isDelete) {
        updatedData = updatedData.filter(l => l.id !== updatedLesson.id);
      } else if (isNew) {
        const normalizedLesson = { ...updatedLesson, lesson_number: Number(updatedLesson.lesson_number || 1) };
        updatedData.push(normalizedLesson);
      } else {
        updatedData = updatedData.map(l => 
          l.id === updatedLesson.id 
            ? { ...l, ...updatedLesson, lesson_number: Number(updatedLesson.lesson_number || l.lesson_number) }
            : l
        );
      }
      
      return updatedData;
    });

    // Synchronisiere den Store mit den neuen Daten
    if (newData) {
      setAllYearlyLessons(newData);
    }
  }, [queryClient, userId, currentYear, setAllYearlyLessons]);

  return {
    allYearlyLessons: data || [],
    isLoading,
    refetch: refetchAllYearlyLessons,
    optimisticUpdate, // Neue Funktion exportieren
  };
}