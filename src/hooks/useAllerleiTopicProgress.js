// src/hooks/useAllerleiTopicProgress.js
import { useMemo } from "react";
import { useLessonStore } from "@/store";

export function useAllerleiTopicProgress(lesson) {
  const { topics, allYearlyLessons, allLessons } = useLessonStore();

  // Verwende die gleiche Logik wie useTopicProgress, aber für mehrere topic_ids
  return useMemo(() => {
    if (!lesson?.is_allerlei || !lesson.allerleiTopicIds || lesson.allerleiTopicIds.length === 0) {
      return [];
    }

    const progresses = lesson.allerleiTopicIds.map(topicId => {
      const topic = topics.find(t => t.id === topicId);
      if (!topic) return null;

      // Simuliere ein fakeLesson für useTopicProgress-kompatible Logik
      const fakeLesson = {
        // Wir übergeben nur das Nötigste
        yearlyLesson: { topic_id: topicId },
      };

      // Wir müssen die Logik aus useTopicProgress hier duplizieren oder umbauen
      // Einfachste Lösung: Die gleiche Berechnung wie in useAllActiveTopicsProgress

      const plannedLessons = allYearlyLessons
        .filter(yl => yl.topic_id === topicId)
        .sort((a, b) => (a.lesson_number || 0) - (b.lesson_number || 0));

      const planned = plannedLessons.length;
      let completed = 0;

      allLessons.forEach(l => {
        const ylId = l.yearly_lesson_id || l.second_yearly_lesson_id;
        const yl = allYearlyLessons.find(y => y.id === ylId);
        if (yl?.topic_id === topicId) {
          const index = plannedLessons.findIndex(p => p.id === ylId);
          if (index !== -1) {
            completed = Math.max(completed, index + 1);
            if (l.is_double_lesson) completed += 1;
          }
        }
      });

      return { topic, planned, completed };
    }).filter(Boolean);

    return progresses;
  }, [lesson, topics, allYearlyLessons, allLessons]);
}