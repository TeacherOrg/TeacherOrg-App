// src/hooks/useCompetencyStatus.js
import { useMemo, useCallback } from "react";
import { useLessonStore } from "@/store";
import { Topic, LehrplanKompetenz } from "@/api/entities";
import pb from '@/api/pb';

/**
 * Berechnet die aktuelle Kalenderwoche (ISO 8601)
 */
function getCurrentWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Status-Werte:
 * - 'completed': Alle verknüpften Topic-Lektionen sind abgeschlossen (grün)
 * - 'in_progress': Topics haben geplante oder laufende Lektionen (blau)
 * - 'not_started': Keine verknüpften Topics oder keine Lektionen (grau)
 */
export const COMPETENCY_STATUS = {
  COMPLETED: 'completed',
  IN_PROGRESS: 'in_progress',
  NOT_STARTED: 'not_started'
};

/**
 * Hook für das Hybrid-Status-Tracking von Lehrplankompetenzen.
 *
 * Berechnet den Status basierend auf:
 * 1. Manueller Überschreibung (höchste Priorität)
 * 2. Automatischer Berechnung aus YearlyLessons
 *
 * @param {Array} competencies - Liste aller Kompetenzen
 * @param {Function} onTopicsUpdate - Callback wenn Topics aktualisiert werden (optional)
 * @returns {Object} - Status-Funktionen und -Daten
 */
export function useCompetencyStatus(competencies = [], onTopicsUpdate = null, classId = null) {
  const { allYearlyLessons, allLessons, topics } = useLessonStore();
  const currentUserId = pb.authStore.model?.id;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentWeek = getCurrentWeek(today);

  /**
   * Berechnet den automatischen Status einer Kompetenz basierend auf verknüpften Topics
   */
  const calculateAutomaticStatus = useCallback((competencyId) => {
    // Debug: Zeige was im Store ist
    console.log('[calculateAutomaticStatus] Input:', {
      competencyId,
      topicsCount: topics.length,
      topicsWithCompetencies: topics.filter(t => t.lehrplan_kompetenz_ids?.length > 0).map(t => ({
        name: t.name,
        kompetenzIds: t.lehrplan_kompetenz_ids
      }))
    });

    // Finde alle Topics, die diese Kompetenz haben
    const relatedTopics = topics.filter(topic => {
      const kompetenzIds = topic.lehrplan_kompetenz_ids || [];
      const hasMatch = kompetenzIds.includes(competencyId);

      // Debug: Zeige warum kein Match
      if (kompetenzIds.length > 0 && !hasMatch) {
        console.log('[calculateAutomaticStatus] Topic:', topic.name,
          'has IDs:', kompetenzIds,
          'searching for:', competencyId,
          'match:', hasMatch);
      }

      return hasMatch;
    });

    console.log('[calculateAutomaticStatus] Found relatedTopics:', relatedTopics.length);

    if (relatedTopics.length === 0) {
      return {
        status: COMPETENCY_STATUS.NOT_STARTED,
        source: 'no_topics',
        relatedTopics: []
      };
    }

    let hasAnyLesson = false;
    let hasCompletedLesson = false;
    let allLessonsCompleted = true;
    let totalPlannedLessons = 0;
    let totalCompletedLessons = 0;

    // Für jedes verknüpfte Topic prüfen
    for (const topic of relatedTopics) {
      // Alle YearlyLessons dieses Topics
      const topicYearlyLessons = allYearlyLessons.filter(yl => yl.topic_id === topic.id);

      console.log('[calculateAutomaticStatus] Topic:', topic.name,
        'yearlyLessons:', topicYearlyLessons.length,
        'allLessons available:', allLessons.length);

      if (topicYearlyLessons.length > 0) {
        hasAnyLesson = true;
        totalPlannedLessons += topicYearlyLessons.length;

        // Prüfe welche Lektionen in der Vergangenheit liegen
        for (const yl of topicYearlyLessons) {
          // Finde die tatsächliche Lektion im Stundenplan
          const actualLesson = allLessons.find(
            l => l.yearly_lesson_id === yl.id || l.second_yearly_lesson_id === yl.id
          );

          console.log('[calculateAutomaticStatus] YearlyLesson:', yl.id,
            'hasActualLesson:', !!actualLesson,
            'actualLessonWeek:', actualLesson?.week_number,
            'currentWeek:', currentWeek);

          if (actualLesson) {
            const lessonWeek = actualLesson.week_number;
            const lessonYear = actualLesson.week_year || currentYear;

            // Lektion gilt als vergangen wenn sie VOR der aktuellen Woche ist
            // ODER in der aktuellen Woche liegt (dann wurde sie diese Woche durchgeführt)
            const isPast =
              lessonYear < currentYear ||
              (lessonYear === currentYear && lessonWeek <= currentWeek);

            console.log('[calculateAutomaticStatus] lessonWeek:', lessonWeek,
              'lessonYear:', lessonYear,
              'currentYear:', currentYear,
              'currentWeek:', currentWeek,
              'isPast:', isPast);

            if (isPast) {
              hasCompletedLesson = true;
              totalCompletedLessons++;
            } else {
              allLessonsCompleted = false;
            }
          } else {
            // YearlyLesson ohne tatsächliche Lektion = noch nicht im Stundenplan
            console.log('[calculateAutomaticStatus] YearlyLesson', yl.id, 'has no actual lesson - marking as not completed');
            allLessonsCompleted = false;
          }
        }
      }
    }

    console.log('[calculateAutomaticStatus] Final state for', competencyId, ':', {
      hasAnyLesson,
      hasCompletedLesson,
      allLessonsCompleted,
      totalPlannedLessons,
      totalCompletedLessons
    });

    // Status bestimmen
    if (!hasAnyLesson) {
      return {
        status: COMPETENCY_STATUS.NOT_STARTED,
        source: 'no_lessons',
        relatedTopics,
        planned: 0,
        completed: 0
      };
    }

    if (hasCompletedLesson && allLessonsCompleted && totalPlannedLessons > 0) {
      return {
        status: COMPETENCY_STATUS.COMPLETED,
        source: 'all_lessons_completed',
        relatedTopics,
        planned: totalPlannedLessons,
        completed: totalCompletedLessons
      };
    }

    if (hasCompletedLesson || hasAnyLesson) {
      return {
        status: COMPETENCY_STATUS.IN_PROGRESS,
        source: hasCompletedLesson ? 'some_lessons_completed' : 'lessons_planned',
        relatedTopics,
        planned: totalPlannedLessons,
        completed: totalCompletedLessons
      };
    }

    return {
      status: COMPETENCY_STATUS.NOT_STARTED,
      source: 'default',
      relatedTopics,
      planned: 0,
      completed: 0
    };
  }, [topics, allYearlyLessons, allLessons, currentYear, currentWeek]);

  /**
   * Holt den Status einer Kompetenz (mit Berücksichtigung manueller Überschreibungen)
   */
  const getCompetencyStatus = useCallback((competencyId) => {
    // 1. Prüfe auf direkte Überschreibung auf der Kompetenz selbst (ohne Topic)
    const competency = competencies.find(c => c.id === competencyId);
    if (competency?.class_status_overrides) {
      // Suche nach Override für aktuelle Klasse oder User
      const directOverride = competency.class_status_overrides[classId] ||
                             competency.class_status_overrides[currentUserId];
      if (directOverride?.manually_set) {
        return {
          status: directOverride.status,
          isManual: true,
          isDirect: true, // Markiert dass es direkt auf der Kompetenz gespeichert ist
          overrideDate: directOverride.date,
          competencyId: competencyId
        };
      }
    }

    // 2. Prüfe auf manuelle Überschreibung in verknüpften Topics
    for (const topic of topics) {
      const kompetenzIds = topic.lehrplan_kompetenz_ids || [];
      if (!kompetenzIds.includes(competencyId)) continue;

      const overrides = topic.competency_status_overrides || {};
      const override = overrides[competencyId];

      if (override?.manually_set) {
        return {
          status: override.status,
          isManual: true,
          overrideDate: override.date,
          topicId: topic.id,
          topicName: topic.name
        };
      }
    }

    // 3. Keine manuelle Überschreibung → automatische Berechnung
    const automaticStatus = calculateAutomaticStatus(competencyId);
    return {
      ...automaticStatus,
      isManual: false
    };
  }, [topics, competencies, classId, currentUserId, calculateAutomaticStatus]);

  /**
   * Setzt eine manuelle Überschreibung für eine Kompetenz auf einem Topic
   */
  const setManualOverride = useCallback(async (topicId, competencyId, status) => {
    console.log('[setManualOverride] Called with:', { topicId, competencyId, status });
    console.log('[setManualOverride] Available topics:', topics.map(t => ({ id: t.id, name: t.name, kompetenzIds: t.lehrplan_kompetenz_ids })));

    const topic = topics.find(t => t.id === topicId);
    if (!topic) {
      console.error('[setManualOverride] Topic nicht gefunden:', topicId);
      return false;
    }

    console.log('[setManualOverride] Found topic:', topic.name, 'with overrides:', topic.competency_status_overrides);

    const currentOverrides = topic.competency_status_overrides || {};
    const updatedOverrides = {
      ...currentOverrides,
      [competencyId]: {
        status,
        manually_set: true,
        date: new Date().toISOString()
      }
    };

    console.log('[setManualOverride] Updated overrides:', updatedOverrides);

    try {
      const result = await Topic.update(topicId, { competency_status_overrides: updatedOverrides });
      console.log('[setManualOverride] Update result:', result);
      if (onTopicsUpdate) {
        console.log('[setManualOverride] Calling onTopicsUpdate callback');
        onTopicsUpdate();
      }
      return true;
    } catch (error) {
      console.error('[setManualOverride] Fehler beim Setzen der manuellen Überschreibung:', error);
      return false;
    }
  }, [topics, onTopicsUpdate]);

  /**
   * Entfernt eine manuelle Überschreibung
   */
  const clearManualOverride = useCallback(async (topicId, competencyId) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) {
      console.error('Topic nicht gefunden:', topicId);
      return false;
    }

    const currentOverrides = { ...(topic.competency_status_overrides || {}) };
    delete currentOverrides[competencyId];

    try {
      await Topic.update(topicId, { competency_status_overrides: currentOverrides });
      if (onTopicsUpdate) {
        onTopicsUpdate();
      }
      return true;
    } catch (error) {
      console.error('Fehler beim Entfernen der manuellen Überschreibung:', error);
      return false;
    }
  }, [topics, onTopicsUpdate]);

  /**
   * Setzt Status direkt auf der Kompetenz (für Kompetenzen ohne Topic)
   * Speichert in class_status_overrides Feld auf der LehrplanKompetenz
   */
  const setDirectCompetencyOverride = useCallback(async (competencyId, status) => {
    console.log('[setDirectCompetencyOverride] Called with:', { competencyId, status, classId, currentUserId });

    const competency = competencies.find(c => c.id === competencyId);
    if (!competency) {
      console.error('[setDirectCompetencyOverride] Kompetenz nicht gefunden:', competencyId);
      return false;
    }

    // Verwende classId wenn vorhanden, sonst currentUserId als Fallback
    const overrideKey = classId || currentUserId;
    if (!overrideKey) {
      console.error('[setDirectCompetencyOverride] Keine classId oder userId verfügbar');
      return false;
    }

    const currentOverrides = competency.class_status_overrides || {};
    const updatedOverrides = {
      ...currentOverrides,
      [overrideKey]: {
        status,
        manually_set: true,
        date: new Date().toISOString(),
        user_id: currentUserId
      }
    };

    console.log('[setDirectCompetencyOverride] Updated overrides:', updatedOverrides);

    try {
      const result = await LehrplanKompetenz.update(competencyId, { class_status_overrides: updatedOverrides });
      console.log('[setDirectCompetencyOverride] Update result:', result);
      if (onTopicsUpdate) {
        onTopicsUpdate();
      }
      return true;
    } catch (error) {
      console.error('[setDirectCompetencyOverride] Fehler:', error);
      return false;
    }
  }, [competencies, classId, currentUserId, onTopicsUpdate]);

  /**
   * Entfernt direkte Überschreibung von der Kompetenz
   */
  const clearDirectCompetencyOverride = useCallback(async (competencyId) => {
    const competency = competencies.find(c => c.id === competencyId);
    if (!competency) {
      console.error('[clearDirectCompetencyOverride] Kompetenz nicht gefunden:', competencyId);
      return false;
    }

    const overrideKey = classId || currentUserId;
    if (!overrideKey) return false;

    const currentOverrides = { ...(competency.class_status_overrides || {}) };
    delete currentOverrides[overrideKey];

    try {
      await LehrplanKompetenz.update(competencyId, { class_status_overrides: currentOverrides });
      if (onTopicsUpdate) {
        onTopicsUpdate();
      }
      return true;
    } catch (error) {
      console.error('[clearDirectCompetencyOverride] Fehler:', error);
      return false;
    }
  }, [competencies, classId, currentUserId, onTopicsUpdate]);

  /**
   * Berechnet alle Status auf einmal (für Performance bei vielen Kompetenzen)
   */
  const allStatuses = useMemo(() => {
    const statusMap = new Map();

    for (const comp of competencies) {
      const compId = comp.id || comp.kompetenz_id;
      if (compId) {
        statusMap.set(compId, getCompetencyStatus(compId));
      }
    }

    return statusMap;
  }, [competencies, getCompetencyStatus]);

  /**
   * Statistiken über alle Kompetenzen
   */
  const statistics = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;

    allStatuses.forEach((statusInfo) => {
      switch (statusInfo.status) {
        case COMPETENCY_STATUS.COMPLETED:
          completed++;
          break;
        case COMPETENCY_STATUS.IN_PROGRESS:
          inProgress++;
          break;
        case COMPETENCY_STATUS.NOT_STARTED:
          notStarted++;
          break;
      }
    });

    return {
      total: competencies.length,
      completed,
      inProgress,
      notStarted,
      completedPercent: competencies.length > 0
        ? Math.round((completed / competencies.length) * 100)
        : 0
    };
  }, [allStatuses, competencies.length]);

  return {
    getCompetencyStatus,
    setManualOverride,
    clearManualOverride,
    setDirectCompetencyOverride,
    clearDirectCompetencyOverride,
    allStatuses,
    statistics,
    COMPETENCY_STATUS
  };
}

export default useCompetencyStatus;
