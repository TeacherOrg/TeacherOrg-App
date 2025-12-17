// src/hooks/useTopicProgress.js
import { useMemo } from "react";
import { useLessonStore } from "@/store";

export function useTopicProgress(currentLesson) {
  const { yearlyLessons, allLessons } = useLessonStore();

  return useMemo(() => {
    if (!currentLesson?.yearlyLesson?.topic_id && !currentLesson?.secondYearlyLesson?.topic_id) {
      return { topic: null, planned: 0, completed: 0 };
    }

    const topicId = currentLesson.yearlyLesson?.topic_id || currentLesson.secondYearlyLesson?.topic_id;
    const topic = currentLesson.topic || null; // kommt oft schon mit (in lessonsWithDetails)

    // Alle yearlyLessons dieses Themas (auch über Klassen/Jahre hinweg – normalerweise pro Klasse eindeutig)
    const plannedLessons = yearlyLessons.filter(yl => yl.topic_id === topicId);

    const planned = plannedLessons.length;

    // Wie viele davon sind bereits als weekly lesson eingetragen UND liegen in der Vergangenheit oder heute?
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completed = allLessons.filter(lesson => {
      const ylId = lesson.yearly_lesson_id || lesson.second_yearly_lesson_id;
      const yl = plannedLessons.find(p => p.id === ylId);
      if (!yl) return false;

      // Woche + Jahr der weekly lesson bestimmen
      const lessonDate = new Date(); // wir haben keine direkte date, aber week_number + year reicht
      // Alternativ: wir können aus week_number + year ein Datum bauen
      const jan4 = new Date(lesson.week_year || new Date().getFullYear(), 0, 4);
      const mondayOfWeek1 = new Date(jan4);
      mondayOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
      const lessonMonday = new Date(mondayOfWeek1);
      lessonMonday.setDate(mondayOfWeek1.getDate() + (lesson.week_number - 1) * 7);

      return lessonMonday <= today;
    }).length;

    return { topic, planned, completed };
  }, [currentLesson, yearlyLessons, allLessons]);
}