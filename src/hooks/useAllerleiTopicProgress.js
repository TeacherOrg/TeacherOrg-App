// src/hooks/useAllerleiTopicProgress.js
import { useMemo } from "react";
import { useLessonStore, useSettings } from "@/store";
import { getCurrentWeek, generateTimeSlots, hasLessonEnded } from "@/utils/lessonTimeUtils";

export function useAllerleiTopicProgress(lesson) {
  const { topics, allYearlyLessons, allLessons } = useLessonStore();
  const settings = useSettings();

  const today = new Date();
  const realCurrentYear = today.getFullYear();
  const realCurrentWeek = getCurrentWeek(today);

  // TimeSlots aus Settings generieren fuer Endzeitpruefung
  const timeSlots = useMemo(() => generateTimeSlots(settings), [settings]);

  // Verwende die gleiche Logik wie useTopicProgress, aber fuer mehrere topic_ids
  return useMemo(() => {
    if (!lesson?.is_allerlei || !lesson.allerleiTopicIds || lesson.allerleiTopicIds.length === 0) {
      return [];
    }

    const progresses = lesson.allerleiTopicIds.map(topicId => {
      const topic = topics.find(t => t.id === topicId);
      if (!topic) return null;

      // Wir müssen die Logik aus useTopicProgress hier duplizieren oder umbauen
      // Einfachste Lösung: Die gleiche Berechnung wie in useAllActiveTopicsProgress

      const plannedLessons = allYearlyLessons
        .filter(yl => yl.topic_id === topicId)
        .sort((a, b) => (a.lesson_number || 0) - (b.lesson_number || 0));

      const planned = plannedLessons.length;
      let completed = 0;
      let halfClassCount = new Map(); // außerhalb der Schleife

      allLessons.forEach(l => {
        const ylId = l.yearly_lesson_id || l.second_yearly_lesson_id;
        const yl = allYearlyLessons.find(y => y.id === ylId);
        if (yl?.topic_id === topicId) {
          const index = plannedLessons.findIndex(p => p.id === ylId);
          if (index !== -1) {
            // Pruefe ob die Lektion bereits beendet ist (Jahr, Woche, Tag UND Endzeit)
            const isCompleted = hasLessonEnded(l, timeSlots, today);

            if (isCompleted) {
              const yl = plannedLessons[index];

              if (yl.is_half_class) {
                const current = halfClassCount.get(ylId) || 0;
                halfClassCount.set(ylId, current + 1);
                if (current + 1 === 2) {
                  completed += 1;
                }
                // KEIN Math.max hier!
              } else {
                // Normale Lektion: nur +1 (oder +2 bei double)
                completed += 1;
                if (l.is_double_lesson) {
                  completed += 1;
                }
              }
            }
          }
        }
      });

      return { topic, planned, completed };
    }).filter(Boolean);

    return progresses;
  }, [lesson, topics, allYearlyLessons, allLessons, realCurrentYear, realCurrentWeek, timeSlots]);
}