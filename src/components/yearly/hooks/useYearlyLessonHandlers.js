import { useCallback } from 'react';
import pb from '@/lib/pocketbase';
import { YearlyLesson } from '@/models/YearlyLesson';
import { findGapsInWeek, createGapLessonData, createGapLesson } from '../utils/gapLessonUtils';

/**
 * Custom hook for managing yearly lesson click handlers.
 * Splits the complex handleLessonClick logic into separate handlers.
 *
 * @param {Object} params - Hook parameters
 * @returns {Object} Lesson click handlers
 */
export const useYearlyLessonHandlers = ({
  // State
  allYearlyLessons,
  subjects,
  topicsById,
  currentYear,
  activeClassId,
  settings,
  // Actions
  optimisticUpdate,
  refetchYearly,
  syncYearlyLessonToWeekly,
  toast,
  // Modal state setters
  setEditingLesson,
  setNewLessonSlot,
  setIsLessonModalOpen,
  setSelectedTopicLessons,
  setSelectedTopicInfo,
  setIsTopicLessonsModalOpen
}) => {
  /**
   * Handle lesson click in Assign Mode.
   * Used when assigning lessons to a topic.
   */
  const handleLessonClickAssignMode = useCallback((lesson, slot, handleSelectLesson) => {
    if (lesson?.topic_id) {
      toast.error("Diese Lektion ist bereits einem anderen Thema zugewiesen");
      return;
    }

    const subjectName = lesson
      ? subjects.find(s => s.id === lesson.subject)?.name || 'Unbekannt'
      : slot.subject;

    const selectSlot = {
      week_number: lesson?.week_number || slot.week_number,
      subject: subjectName,
      lesson_number: lesson?.lesson_number || slot.lesson_number,
    };

    handleSelectLesson(selectSlot);
  }, [subjects, toast]);

  /**
   * Handle lesson click in Topic Mode (existing lesson).
   * Toggles topic assignment for an existing lesson.
   */
  const handleExistingLessonTopicToggle = useCallback(async (lesson, activeTopicId) => {
    const newTopicId = lesson.topic_id === activeTopicId ? null : activeTopicId;
    const lessonsToUpdate = lesson.mergedLessons || [lesson];
    let tempUpdatedLessons = allYearlyLessons.map(p => {
      const toUpdate = lessonsToUpdate.find(l => l.id === p.id);
      if (toUpdate) {
        return { ...p, topic_id: newTopicId };
      }
      return p;
    });

    const gapPromises = [];

    if (newTopicId) {
      const gaps = findGapsInWeek(tempUpdatedLessons, lesson.week_number, lesson.subject, newTopicId);

      for (const lessonNumber of gaps) {
        const subjectId = subjects.find(s => s.name === lesson.subject)?.id || lesson.subject;
        const tempLesson = createGapLessonData({
          weekNumber: lesson.week_number,
          subjectName: lesson.subject,
          subjectId,
          lessonNumber,
          topicId: newTopicId,
          schoolYear: currentYear
        });

        tempUpdatedLessons = [...tempUpdatedLessons, tempLesson];

        const createPromise = createGapLesson({
          weekNumber: lesson.week_number,
          subjectName: lesson.subject,
          subjectId,
          lessonNumber,
          topicId: newTopicId,
          schoolYear: currentYear,
          classId: activeClassId
        }, tempLesson, optimisticUpdate);

        gapPromises.push(createPromise);
      }
    }

    try {
      await Promise.all(
        lessonsToUpdate.map(mergedLesson =>
          YearlyLesson.update(mergedLesson.id, { topic_id: newTopicId })
        )
      );
      await Promise.all(gapPromises);
    } catch (error) {
      console.error("Error updating block lesson topics:", error);
      await refetchYearly();
    }
  }, [allYearlyLessons, subjects, currentYear, activeClassId, optimisticUpdate, refetchYearly]);

  /**
   * Handle creating a new lesson in Topic Mode.
   */
  const handleNewLessonInTopicMode = useCallback(async (slot, activeTopicId) => {
    const slotClassId = slot.class_id || activeClassId;

    if (!slotClassId) {
      console.error('Error: No class_id available for creating new lesson');
      alert('Bitte wählen Sie eine Klasse aus, bevor Sie eine neue Lektion erstellen.');
      return;
    }

    const subjectId = subjects.find(s => s.name === slot.subject && s.class_id === slotClassId)?.id || slot.subject;

    const newLesson = {
      id: `temp-${Date.now()}`,
      ...slot,
      subject: subjectId,
      topic_id: activeTopicId,
      school_year: currentYear,
      notes: '',
      is_double_lesson: false,
      second_yearly_lesson_id: null,
      class_id: slotClassId
    };
    optimisticUpdate(newLesson, true);

    try {
      const createdLesson = await YearlyLesson.create({
        ...slot,
        topic_id: activeTopicId,
        school_year: currentYear,
        name: 'Neue Lektion',
        description: '',
        user_id: pb.authStore.model.id,
        class_id: slotClassId,
        subject: subjectId,
        notes: '',
        is_double_lesson: false,
        second_yearly_lesson_id: null,
        is_exam: false,
        is_half_class: false,
        is_allerlei: false,
        allerlei_subjects: []
      });

      optimisticUpdate(newLesson, false, true);
      optimisticUpdate({ ...createdLesson, lesson_number: Number(createdLesson.lesson_number) }, true);

      // Sync to weekly timetable if in fixed schedule mode
      const tempUpdatedLessons = [...allYearlyLessons, { ...createdLesson, lesson_number: Number(createdLesson.lesson_number) }];

      try {
        await syncYearlyLessonToWeekly(createdLesson, settings, subjects, tempUpdatedLessons);
      } catch (syncError) {
        console.warn('Failed to sync to weekly timetable:', syncError);
      }

      // Fill gaps in the week
      const gaps = findGapsInWeek(tempUpdatedLessons, slot.week_number, subjectId, activeTopicId);

      const gapPromises = gaps.map(lessonNumber => {
        const tempGapLesson = createGapLessonData({
          weekNumber: slot.week_number,
          subjectName: slot.subject,
          subjectId,
          lessonNumber,
          topicId: activeTopicId,
          schoolYear: currentYear
        });

        return createGapLesson({
          weekNumber: slot.week_number,
          subjectName: slot.subject,
          subjectId,
          lessonNumber,
          topicId: activeTopicId,
          schoolYear: currentYear,
          classId: activeClassId
        }, tempGapLesson, optimisticUpdate);
      });

      await Promise.all(gapPromises);
    } catch (error) {
      console.error("Error creating lesson:", error);
      optimisticUpdate(newLesson, false, true);
    }
  }, [allYearlyLessons, subjects, currentYear, activeClassId, settings, optimisticUpdate, syncYearlyLessonToWeekly]);

  /**
   * Handle lesson click in Standard Mode.
   * Opens modals for viewing/editing lessons.
   */
  const handleLessonClickStandardMode = useCallback((lesson, slot) => {
    // Check if this is a merged/double lesson with a topic
    if (lesson && lesson.topic_id && ((lesson.mergedLessons && lesson.mergedLessons.length > 1) || lesson.is_double_lesson)) {
      let topicLessons = [];
      if (lesson.is_double_lesson && (!lesson.mergedLessons || lesson.mergedLessons.length <= 1)) {
        const secondLesson = allYearlyLessons.find(l => l.id === lesson.second_yearly_lesson_id);
        topicLessons = [lesson];
        if (secondLesson) {
          topicLessons.push(secondLesson);
        }
      } else {
        topicLessons = lesson.mergedLessons;
      }

      const topic = topicsById.get(lesson.topic_id);
      setSelectedTopicLessons(topicLessons);
      setSelectedTopicInfo({
        topic: topic,
        subject: lesson.subject,
        week: lesson.week_number
      });
      setIsTopicLessonsModalOpen(true);
      return true; // Signal that modal was opened
    }

    // Open edit modal for existing lesson
    if (lesson && lesson.id) {
      const fullLesson = allYearlyLessons.find(l => l.id === lesson.id);
      setEditingLesson(fullLesson);
      setNewLessonSlot(null);
    } else {
      // Create new lesson
      const slotClassId = slot.class_id || activeClassId;

      if (!slotClassId) {
        console.error('Error: No class_id available for creating new lesson');
        alert('Bitte wählen Sie eine Klasse aus, bevor Sie eine neue Lektion erstellen.');
        return false;
      }

      setEditingLesson(null);
      setNewLessonSlot({
        ...slot,
        subject: subjects.find(s => s.name === slot.subject && s.class_id === slotClassId)?.id || slot.subject,
        school_year: currentYear,
        class_id: slotClassId
      });
    }

    setIsLessonModalOpen(true);
    return true;
  }, [
    allYearlyLessons,
    topicsById,
    subjects,
    currentYear,
    activeClassId,
    setEditingLesson,
    setNewLessonSlot,
    setIsLessonModalOpen,
    setSelectedTopicLessons,
    setSelectedTopicInfo,
    setIsTopicLessonsModalOpen
  ]);

  return {
    handleLessonClickAssignMode,
    handleExistingLessonTopicToggle,
    handleNewLessonInTopicMode,
    handleLessonClickStandardMode
  };
};

export default useYearlyLessonHandlers;
