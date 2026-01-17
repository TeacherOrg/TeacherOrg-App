import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Class } from '@/api/entities';
import pb from '@/api/pb';
import { canEditClass } from '@/utils/teamTeachingUtils';

/**
 * Hook für globale Klassenauswahl mit URL-Synchronisation
 * Ermöglicht konsistente Klassenauswahl über alle Seiten hinweg
 */
export function useClassSelection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUserId = pb.authStore.model?.id;

  // Klassen-ID aus URL lesen
  const activeClassId = searchParams.get('classId') || null;

  // Klassen-ID in URL setzen
  const setActiveClassId = useCallback((classId) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (classId) {
        next.set('classId', classId);
      } else {
        next.delete('classId');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Alle Klassen laden (eigene + geteilte)
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classesWithTeamTeaching', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];

      // 1. Eigene Klassen laden
      const ownedClasses = await Class.list({ user_id: currentUserId });
      const ownedWithMeta = (ownedClasses || []).map(cls => ({
        ...cls,
        isOwner: true,
        permissionLevel: 'full_access'
      }));

      // 2. Geteilte Klassen via Team Teaching laden
      // WICHTIG: owner_id != currentUserId um Self-Team-Teaching-Records auszuschließen
      const teamTeachingAccess = await pb.collection('team_teachings').getFullList({
        filter: `invited_user_id = '${currentUserId}' && status = 'accepted' && owner_id != '${currentUserId}'`,
        expand: 'class_id,owner_id',
        $autoCancel: false
      }).catch(() => []);

      // 3. Geteilte Klassen extrahieren (nur nicht-versteckte)
      const sharedClasses = teamTeachingAccess
        .filter(tt => (tt.expand?.class_id || tt.class_id) && !tt.is_hidden)
        .map(tt => ({
          ...(tt.expand?.class_id || {}),
          id: tt.expand?.class_id?.id || tt.class_id,
          name: tt.expand?.class_id?.name || tt.class_name || 'Geteilte Klasse',
          isOwner: false,
          permissionLevel: tt.permission_level || 'view_only',
          teamTeachingId: tt.id,
          ownerEmail: tt.expand?.owner_id?.email || '',
          is_hidden: tt.is_hidden || false
        }));

      // 4. Zusammenführen mit Deduplizierung (owned hat Priorität)
      const merged = [...ownedWithMeta, ...sharedClasses];
      const uniqueClasses = merged.reduce((acc, cls) => {
        const existing = acc.find(c => c.id === cls.id);
        if (!existing) {
          acc.push(cls);
        } else if (cls.isOwner && !existing.isOwner) {
          const idx = acc.findIndex(c => c.id === cls.id);
          acc[idx] = cls;
        }
        return acc;
      }, []);

      return uniqueClasses;
    },
    enabled: !!currentUserId,
    staleTime: 60000, // 1 Minute
  });

  // Aktive Klasse finden
  const activeClass = useMemo(() => {
    if (!activeClassId) return null;
    return classes.find(c => c.id === activeClassId) || null;
  }, [classes, activeClassId]);

  // Berechtigungsprüfung
  const canEdit = useMemo(() => {
    if (!activeClass) return true; // "Alle Klassen" erlaubt Bearbeitung
    return canEditClass(activeClass, currentUserId);
  }, [activeClass, currentUserId]);

  // Prüfung ob View-Only
  const isViewOnly = useMemo(() => {
    if (!activeClass) return false;
    return activeClass.permissionLevel === 'view_only' && !activeClass.isOwner;
  }, [activeClass]);

  // Eigene Klassen (für Filter)
  const ownedClasses = useMemo(() => {
    return classes.filter(c => c.isOwner === true);
  }, [classes]);

  // Geteilte Klassen (für Filter)
  const sharedClasses = useMemo(() => {
    return classes.filter(c => c.isOwner === false);
  }, [classes]);

  return {
    // State
    activeClassId,
    setActiveClassId,
    activeClass,
    classes,
    ownedClasses,
    sharedClasses,

    // Loading
    isLoading: classesLoading,

    // Permissions
    canEdit,
    isViewOnly,

    // Utilities
    currentUserId,
  };
}

export default useClassSelection;
