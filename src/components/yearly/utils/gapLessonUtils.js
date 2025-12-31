import pb from '@/lib/pocketbase';
import { YearlyLesson } from '@/models/YearlyLesson';

/**
 * Gap Lesson Utilities
 * ====================
 * Functions for identifying and filling gaps in lesson sequences.
 */

/**
 * Find gaps in a lesson sequence for a given week/subject/topic.
 * @param {Array} lessons - All yearly lessons
 * @param {number} weekNumber - Week number to check
 * @param {string} subjectId - Subject ID to filter by
 * @param {string} topicId - Topic ID to filter by
 * @returns {Array<number>} Array of missing lesson numbers
 */
export const findGapsInWeek = (lessons, weekNumber, subjectId, topicId) => {
  const weekLessons = lessons
    .filter(l =>
      l.week_number === weekNumber &&
      l.subject === subjectId &&
      l.topic_id === topicId
    )
    .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));

  if (weekLessons.length <= 1) {
    return [];
  }

  const minNum = Math.min(...weekLessons.map(l => Number(l.lesson_number)));
  const maxNum = Math.max(...weekLessons.map(l => Number(l.lesson_number)));
  const gaps = [];

  for (let num = minNum; num <= maxNum; num++) {
    if (!weekLessons.some(l => Number(l.lesson_number) === num)) {
      gaps.push(num);
    }
  }

  return gaps;
};

/**
 * Create gap lesson data object (for optimistic update).
 * @param {Object} params - Parameters for the gap lesson
 * @param {number} params.weekNumber - Week number
 * @param {string} params.subjectName - Subject name (for slot)
 * @param {string} params.subjectId - Subject ID
 * @param {number} params.lessonNumber - Lesson number
 * @param {string} params.topicId - Topic ID
 * @param {string} params.schoolYear - School year
 * @returns {Object} Gap lesson data object
 */
export const createGapLessonData = ({
  weekNumber,
  subjectName,
  subjectId,
  lessonNumber,
  topicId,
  schoolYear
}) => ({
  id: `temp-gap-${Date.now()}-${lessonNumber}`,
  week_number: weekNumber,
  subject: subjectId,
  lesson_number: lessonNumber,
  school_year: schoolYear,
  topic_id: topicId,
  notes: '',
  is_double_lesson: false,
  second_yearly_lesson_id: null
});

/**
 * Create and persist a gap lesson to the database.
 * @param {Object} params - Parameters for the gap lesson
 * @param {number} params.weekNumber - Week number
 * @param {string} params.subjectName - Subject name
 * @param {string} params.subjectId - Subject ID
 * @param {number} params.lessonNumber - Lesson number
 * @param {string} params.topicId - Topic ID
 * @param {string} params.schoolYear - School year
 * @param {string} params.classId - Class ID
 * @param {Object} tempLesson - The temporary lesson for optimistic update
 * @param {Function} optimisticUpdate - Callback for optimistic cache updates
 * @returns {Promise} Promise that resolves when the lesson is created
 */
export const createGapLesson = async ({
  weekNumber,
  subjectName,
  subjectId,
  lessonNumber,
  topicId,
  schoolYear,
  classId
}, tempLesson, optimisticUpdate) => {
  try {
    const gapCreated = await YearlyLesson.create({
      week_number: weekNumber,
      subject: subjectId,
      lesson_number: lessonNumber,
      school_year: schoolYear,
      topic_id: topicId,
      notes: '',
      is_double_lesson: false,
      second_yearly_lesson_id: null,
      name: 'Neue Lektion',
      description: '',
      user_id: pb.authStore.model.id,
      class_id: classId
    });

    // Remove temp, add real
    optimisticUpdate(tempLesson, false, true);
    optimisticUpdate(gapCreated, true);

    return gapCreated;
  } catch (err) {
    console.error("Error creating gap lesson:", err);
    optimisticUpdate(tempLesson, false, true);
    throw err;
  }
};

/**
 * Fill all gaps in a week's lesson sequence.
 * @param {Object} params - Parameters
 * @param {Array} params.allLessons - All yearly lessons
 * @param {number} params.weekNumber - Week number
 * @param {string} params.subjectName - Subject name
 * @param {string} params.subjectId - Subject ID
 * @param {string} params.topicId - Topic ID
 * @param {string} params.schoolYear - School year
 * @param {string} params.classId - Class ID
 * @param {Function} params.optimisticUpdate - Callback for optimistic cache updates
 * @param {Function} [params.onTempLessonCreated] - Called when a temp lesson is created for UI update
 * @returns {Promise<Array>} Array of created gap lessons
 */
export const fillGapsInWeek = async ({
  allLessons,
  weekNumber,
  subjectName,
  subjectId,
  topicId,
  schoolYear,
  classId,
  optimisticUpdate,
  onTempLessonCreated
}) => {
  const gaps = findGapsInWeek(allLessons, weekNumber, subjectId, topicId);

  if (gaps.length === 0) {
    return [];
  }

  const promises = gaps.map(lessonNumber => {
    const tempLesson = createGapLessonData({
      weekNumber,
      subjectName,
      subjectId,
      lessonNumber,
      topicId,
      schoolYear
    });

    // Notify caller about temp lesson for UI updates
    if (onTempLessonCreated) {
      onTempLessonCreated(tempLesson);
    }

    return createGapLesson({
      weekNumber,
      subjectName,
      subjectId,
      lessonNumber,
      topicId,
      schoolYear,
      classId
    }, tempLesson, optimisticUpdate);
  });

  return Promise.all(promises);
};
