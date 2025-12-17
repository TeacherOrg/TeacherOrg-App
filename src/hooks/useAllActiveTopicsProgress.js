// src/hooks/useAllActiveTopicsProgress.js
import { useMemo } from "react";
import { useLessonStore } from "@/store";

function getCurrentWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function useAllActiveTopicsProgress() {
  const { yearlyLessons, allLessons } = useLessonStore();

  return useMemo(() => {
    const topicMap = new Map();
    const currentYear = new Date().getFullYear();
    const currentWeek = getCurrentWeek();

    yearlyLessons.forEach((yl) => {
      if (!yl.topic_id) return;

      if (!topicMap.has(yl.topic_id)) {
        topicMap.set(yl.topic_id, {
          topic: {
            id: yl.topic_id,
            title:
              (yl.expand?.topic?.title) || yl.topic_title || "Unbenanntes Thema",
            color: (yl.expand?.topic?.color) || "#3b82f6",
          },
          subjectName:
            (yl.expand?.subject?.name) || yl.subject_name || "Unbekannt",
          subjectColor:
            (yl.expand?.subject?.color) || "#94a3b8",
          planned: 0,
          completed: 0,
          hasExam: false,
          lessonsUntilExam: null,     // z.B. 3, 1, 0
          examThisWeek: false,
        });
      }
      const entry = topicMap.get(yl.topic_id);
      entry.planned += 1;

      // Prüfung finden
      if (yl.is_exam) {
        entry.hasExam = true;
      }
    });

    // Completed zählen + Prüfungsabstand berechnen
    allLessons.forEach((lesson) => {
      const ylId = lesson.yearly_lesson_id || lesson.second_yearly_lesson_id;
      if (!ylId) return;

      const yl = yearlyLessons.find((y) => y.id === ylId);
      if (!yl?.topic_id) return;

      const lessonWeek = lesson.week_number;
      const lessonYear = lesson.week_year || currentYear;
      const isPastOrToday =
        lessonYear < currentYear ||
        (lessonYear === currentYear && lessonWeek <= currentWeek);

      if (isPastOrToday) {
        const entry = topicMap.get(yl.topic_id);
        if (entry) {
          entry.completed += lesson.is_double_lesson ? 2 : 1;
        }
      }

      // Prüfung in dieser Woche?
      if (yl.is_exam && lessonWeek === currentWeek && lessonYear === currentYear) {
        const entry = topicMap.get(yl.topic_id);
        if (entry) entry.examThisWeek = true;
      }
    });

    // Nachbearbeitung: lessonsUntilExam berechnen
    topicMap.forEach((entry, topicId) => {
      if (!entry.hasExam) return;

      const examLessons = yearlyLessons
        .filter((yl) => yl.topic_id === topicId && yl.is_exam)
        .sort((a, b) => a.lesson_number - b.lesson_number);

      if (examLessons.length === 0) return;

      const nextExam = examLessons[0];
      const examIndex = yearlyLessons.findIndex((yl) => yl.id === nextExam.id);
      const completedSoFar = entry.completed;

      entry.lessonsUntilExam = examIndex + 1 - completedSoFar;
      if (entry.lessonsUntilExam < 0) entry.lessonsUntilExam = 0;
    });

    return Array.from(topicMap.values()).filter((e) => e.planned > 0);
  }, [yearlyLessons, allLessons]);
}