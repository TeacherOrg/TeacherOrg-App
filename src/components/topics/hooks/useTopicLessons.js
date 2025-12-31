// src/components/topics/hooks/useTopicLessons.js
import { useState, useCallback, useMemo } from 'react';
import { YearlyLesson } from '@/api/entities';

/**
 * Hook für das Laden und Verwalten von Lektionen eines Topics.
 *
 * @param {string} topicId - Die ID des Topics
 * @param {string} classId - Die Klassen-ID für Filter
 * @returns {Object} - Lektionen und Hilfsfunktionen
 */
export function useTopicLessons(topicId = null, classId = null) {
  const [lessons, setLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Lädt alle Lektionen für das Topic
   */
  const loadLessons = useCallback(async () => {
    if (!topicId) {
      setLessons([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const filter = classId ? { class_id: classId } : {};
      const allLessons = await YearlyLesson.list(filter);

      const topicLessons = allLessons
        .filter(l => l.topic_id === topicId)
        .map(item => ({
          id: item.id,
          name: item.notes || `Lektion ${item.lesson_number}`,
          week_number: item.week_number,
          lesson_number: Number(item.lesson_number),
          is_half_class: item.is_half_class || false,
          is_exam: item.is_exam || false,
          notes: item.notes || ''
        }))
        .sort((a, b) => {
          if (a.week_number !== b.week_number) {
            return a.week_number - b.week_number;
          }
          return a.lesson_number - b.lesson_number;
        });

      setLessons(topicLessons);
    } catch (err) {
      console.error('Error loading topic lessons:', err);
      setError(err.message || 'Fehler beim Laden der Lektionen');
      setLessons([]);
    } finally {
      setIsLoading(false);
    }
  }, [topicId, classId]);

  /**
   * Gruppiert Lektionen nach Woche
   */
  const lessonsByWeek = useMemo(() => {
    return lessons.reduce((acc, lesson) => {
      const week = Number(lesson.week_number) || 1;
      if (!acc[week]) {
        acc[week] = [];
      }
      acc[week].push(lesson);
      return acc;
    }, {});
  }, [lessons]);

  /**
   * Sortierte Liste der Wochennummern
   */
  const sortedWeekNumbers = useMemo(() => {
    return Object.keys(lessonsByWeek)
      .map(Number)
      .sort((a, b) => a - b);
  }, [lessonsByWeek]);

  /**
   * Gesamtanzahl der Lektionen
   */
  const totalLessons = useMemo(() => lessons.length, [lessons]);

  /**
   * Anzahl der Prüfungslektionen
   */
  const examCount = useMemo(() => {
    return lessons.filter(l => l.is_exam).length;
  }, [lessons]);

  /**
   * Setzt die Lektionenliste zurück
   */
  const clearLessons = useCallback(() => {
    setLessons([]);
    setError(null);
  }, []);

  return {
    lessons,
    isLoading,
    error,
    loadLessons,
    clearLessons,
    lessonsByWeek,
    sortedWeekNumbers,
    totalLessons,
    examCount
  };
}

export default useTopicLessons;
