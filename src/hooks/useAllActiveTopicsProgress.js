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

  const today = new Date();
  const realCurrentYear = today.getFullYear();
  const realCurrentWeek = getCurrentWeek(today);

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
          halfClassCount: new Map(),
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
      const lessonYear = lesson.week_year || realCurrentYear;

      const isPastOrToday =
        lessonYear < realCurrentYear ||
        (lessonYear === realCurrentYear && lessonWeek <= realCurrentWeek);

      if (isPastOrToday) {
        // Finde Index dieser Lektion in der sortierten Liste
        const index = entry.sortedLessons.findIndex(l => l.id === ylId);
        if (index >= 0) {
          const yl = entry.sortedLessons[index];

          if (yl.is_half_class) {
            // Halbklasse: Nur exakt zählen, KEIN Math.max
            const currentCount = entry.halfClassCount.get(ylId) || 0;
            entry.halfClassCount.set(ylId, currentCount + 1);

            if (currentCount + 1 === 2) {
              entry.completedCount += 1;
            }
            // KEIN Math.max hier!
          } else {
            // Normale Lektion: nur +1 (oder +2 bei double)
            entry.completedCount += 1;
            if (lesson.is_double_lesson) {
              entry.completedCount += 1;
            }
          }
        }
      }
    });

    // Debug-Logs für jedes Thema
    topicMap.forEach((entry) => {
      console.log("Topic Progress Debug:", {
        topicId: entry.topic.id,
        topicTitle: entry.topic.title,
        planned: entry.planned,
        completedCount: entry.completedCount,
        lessonsChecked: allLessons.filter(l => {
          const id = l.yearly_lesson_id || l.second_yearly_lesson_id;
          return entry.sortedLessons.some(yl => yl.id === id);
        }).map(l => ({week: l.week_number, year: l.week_year || realCurrentYear, isDouble: l.is_double_lesson}))
      });
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

          const weekDiff = Math.abs(lesson.week_number - realCurrentWeek);
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
  }, [allYearlyLessons, allLessons, topics, realCurrentYear, realCurrentWeek]);
}