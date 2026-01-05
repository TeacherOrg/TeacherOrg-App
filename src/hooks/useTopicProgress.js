// src/hooks/useTopicProgress.js
import { useMemo } from "react";
import { useLessonStore, useSettings } from "@/store";
import { getCurrentWeek, generateTimeSlots, hasLessonEnded } from "@/utils/lessonTimeUtils";

export function useTopicProgress(currentLesson) {
  const { allYearlyLessons, allLessons, topics } = useLessonStore();
  const settings = useSettings();

  const today = new Date();
  const realCurrentYear = today.getFullYear();
  const realCurrentWeek = getCurrentWeek(today);

  // TimeSlots aus Settings generieren fuer Endzeitpruefung
  const timeSlots = useMemo(() => generateTimeSlots(settings), [settings]);

  return useMemo(() => {
    let topicId = null;

    if (currentLesson?.yearly_lesson_id) {
      const yl = allYearlyLessons.find(yl => yl.id === currentLesson.yearly_lesson_id);
      topicId = yl?.topic_id;
    } else if (currentLesson?.second_yearly_lesson_id) {
      const yl = allYearlyLessons.find(yl => yl.id === currentLesson.second_yearly_lesson_id);
      topicId = yl?.topic_id;
    }

    // Fallback auf direktes topic_id (für TopicLessonsModal)
    if (!topicId && currentLesson?.topic_id) {
      topicId = currentLesson.topic_id;
    }

    if (!topicId) {
      return { topic: null, planned: 0, completed: 0 };
    }

    const topic = topics.find(t => t.id === topicId) || null;

    // Alle yearlyLessons dieses Themas – sortiert nach lesson_number
    const plannedLessons = allYearlyLessons
      .filter(yl => yl.topic_id === topicId)
      .sort((a, b) => (a.lesson_number || 0) - (b.lesson_number || 0));

    const planned = plannedLessons.length;
    if (planned === 0) return { topic, planned: 0, completed: 0 };

    // Chronologisches Zählen – exakt wie in useAllActiveTopicsProgress
    let completedCount = 0;
    let halfClassCount = new Map(); // außerhalb der Schleife

    allLessons.forEach((lesson) => {
      const ylId = lesson.yearly_lesson_id || lesson.second_yearly_lesson_id;
      if (!ylId) return;

      // Wichtig: Index in der sortierten Liste finden!
      const index = plannedLessons.findIndex(yl => yl.id === ylId);
      if (index === -1) return; // nicht in diesem Thema

      // Pruefe ob die Lektion bereits beendet ist (Jahr, Woche, Tag UND Endzeit)
      const isCompleted = hasLessonEnded(lesson, timeSlots, today);

      if (isCompleted) {
        // Jede vergangene Lektion zählt – auch wenn dazwischen Lücken sind
        const yl = plannedLessons[index];

        if (yl.is_half_class) {
          const current = halfClassCount.get(ylId) || 0;
          halfClassCount.set(ylId, current + 1);
          if (current + 1 === 2) {
            completedCount += 1;
          }
          // KEIN Math.max hier!
        } else {
          // Normale Lektion: nur +1 (oder +2 bei double)
          completedCount += 1;
          if (lesson.is_double_lesson) {
            completedCount += 1;
          }
        }
      }
    });

    console.log("TopicProgress Debug Final:", { planned, completedCount, topicId });

    return { topic, planned, completed: completedCount };
  }, [currentLesson, allYearlyLessons, allLessons, topics, realCurrentYear, realCurrentWeek, timeSlots]);
}