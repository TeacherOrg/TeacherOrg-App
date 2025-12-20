// src/hooks/useTopicProgress.js
import { useMemo } from "react";
import { useLessonStore } from "@/store";

function getCurrentWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function useTopicProgress(currentLesson) {
  const { allYearlyLessons, allLessons, topics } = useLessonStore();

  const currentYear = new Date().getFullYear();
  const currentWeek = getCurrentWeek();

  return useMemo(() => {
    let topicId = null;

    if (currentLesson?.yearly_lesson_id) {
      const yl = allYearlyLessons.find(yl => yl.id === currentLesson.yearly_lesson_id);
      topicId = yl?.topic_id;
    } else if (currentLesson?.second_yearly_lesson_id) {
      const yl = allYearlyLessons.find(yl => yl.id === currentLesson.second_yearly_lesson_id);
      topicId = yl?.topic_id;
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

    allLessons.forEach((lesson) => {
      const ylId = lesson.yearly_lesson_id || lesson.second_yearly_lesson_id;
      if (!ylId) return;

      // Wichtig: Index in der sortierten Liste finden!
      const index = plannedLessons.findIndex(yl => yl.id === ylId);
      if (index === -1) return; // nicht in diesem Thema

      const lessonWeek = lesson.week_number;
      const lessonYear = lesson.week_year || currentYear;

      const isPastOrToday =
        lessonYear < currentYear ||
        (lessonYear === currentYear && lessonWeek <= currentWeek);

      if (isPastOrToday) {
        // Jede vergangene Lektion zählt – auch wenn dazwischen Lücken sind
        completedCount = Math.max(completedCount, index + 1);
        if (lesson.is_double_lesson) completedCount += 1;
      }
    });

    console.log("TopicProgress Debug Final:", { planned, completedCount, topicId });

    return { topic, planned, completed: completedCount };
  }, [currentLesson, allYearlyLessons, allLessons, topics, currentWeek]);
}