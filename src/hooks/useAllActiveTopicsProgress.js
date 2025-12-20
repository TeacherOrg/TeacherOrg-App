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
  const { allYearlyLessons, allLessons, topics } = useLessonStore();

  const currentYear = new Date().getFullYear();
  const currentWeek = getCurrentWeek();

  return useMemo(() => {
    const topicMap = new Map();

    // Alle yearlyLessons nach topic_id gruppieren und sortieren
    allYearlyLessons.forEach((yl) => {
      if (!yl.topic_id) return;

      const topicObj = topics.find(t => t.id === yl.topic_id) || {
        id: yl.topic_id,
        title: "Unbenanntes Thema",
        color: "#94a3b8"
      };

      if (!topicMap.has(yl.topic_id)) {
        topicMap.set(yl.topic_id, {
          topic: {
            id: yl.topic_id,
            title: topicObj.title,
            color: topicObj.color || "#3b82f6",
          },
          subjectName:
            (yl.expand?.subject?.name) || yl.subject_name || "Unbekannt",
          subjectColor:
            yl.subject_color || yl.expand?.subject?.color || "#3b82f6", // fallback nur auf Blau
          sortedLessons: [],
          completedCount: 0,
          hasExam: false,
          lessonsUntilExam: null,
        });
      }

      const entry = topicMap.get(yl.topic_id);
      entry.sortedLessons.push(yl);
      if (yl.is_exam) entry.hasExam = true;
    });

    // Sortiere jede Themenliste nach lesson_number
    topicMap.forEach((entry) => {
      entry.sortedLessons.sort((a, b) => (a.lesson_number || 0) - (b.lesson_number || 0));
      entry.planned = entry.sortedLessons.length;
    });

    // Zähle chronologisch abgeschlossene Lektionen
    allLessons.forEach((lesson) => {
      const ylId = lesson.yearly_lesson_id || lesson.second_yearly_lesson_id;
      if (!ylId) return;

      const yl = allYearlyLessons.find((y) => y.id === ylId);
      if (!yl?.topic_id) return;

      const entry = topicMap.get(yl.topic_id);
      if (!entry) return;

      const lessonWeek = lesson.week_number;
      const lessonYear = lesson.week_year || currentYear;

      const isPastOrToday =
        lessonYear < currentYear ||
        (lessonYear === currentYear && lessonWeek <= currentWeek);

      if (isPastOrToday) {
        // Finde Index dieser Lektion in der sortierten Liste
        const index = entry.sortedLessons.findIndex(l => l.id === ylId);
        if (index >= 0) {
          // Jede vergangene Lektion zählt – auch wenn dazwischen Lücken sind
          entry.completedCount = Math.max(entry.completedCount, index + 1);
          if (lesson.is_double_lesson) entry.completedCount += 1;
        }
      }
    });

    // Prüfungs-Countdown
    topicMap.forEach((entry) => {
      if (!entry.hasExam) return;

      const examLesson = entry.sortedLessons.find(yl => yl.is_exam);
      if (!examLesson) return;

      const examIndex = entry.sortedLessons.findIndex(yl => yl.id === examLesson.id);
      entry.lessonsUntilExam = examIndex + 1 - entry.completedCount;
      if (entry.lessonsUntilExam < 0) entry.lessonsUntilExam = 0;
    });

    // Nur aktuelle Themen (nicht abgeschlossen + kürzlich aktiv)
    const activeTopics = Array.from(topicMap.values())
      .filter(entry => {
        if (entry.completedCount >= entry.planned) return false;

        // War in den letzten 10 Wochen aktiv oder hat bald Lektionen?
        const hasRecentOrUpcoming = entry.sortedLessons.some(yl => {
          const lesson = allLessons.find(l => 
            l.yearly_lesson_id === yl.id || l.second_yearly_lesson_id === yl.id
          );
          if (!lesson) return false;

          const weekDiff = Math.abs(lesson.week_number - currentWeek);
          return weekDiff <= 10;
        });

        return hasRecentOrUpcoming || entry.completedCount > 0;
      })
      .map(entry => ({
        ...entry,
        completed: entry.completedCount,
        planned: entry.planned,
      }));

    return activeTopics.sort((a, b) => 
      (b.completed / b.planned) - (a.completed / a.planned)
    );
  }, [allYearlyLessons, allLessons, topics]);
}