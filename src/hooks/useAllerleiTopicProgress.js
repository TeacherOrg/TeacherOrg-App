// src/hooks/useAllerleiTopicProgress.js
import { useMemo } from "react";
import { useLessonStore } from "@/store";

function getCurrentWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function useAllerleiTopicProgress(lesson) {
  const { topics, allYearlyLessons, allLessons } = useLessonStore();

  const today = new Date();
  const realCurrentYear = today.getFullYear();
  const realCurrentWeek = getCurrentWeek(today);

  // Verwende die gleiche Logik wie useTopicProgress, aber für mehrere topic_ids
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
            const lessonWeek = l.week_number;
            const lessonYear = l.week_year || realCurrentYear;

            const isPastOrToday =
              lessonYear < realCurrentYear ||
              (lessonYear === realCurrentYear && lessonWeek <= realCurrentWeek);

            if (isPastOrToday) {
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
  }, [lesson, topics, allYearlyLessons, allLessons, realCurrentYear, realCurrentWeek]);
}