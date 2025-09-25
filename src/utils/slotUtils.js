// src/utils/slotUtils.js
/**
 * Utility functions for finding and managing lesson slots in the timetable
 */

/**
 * Finds a free slot for a lesson based on preferred day and current lessons
 * @param {Array} allLessons - All current lessons
 * @param {string} preferredDay - Preferred day (e.g., 'monday')
 * @param {Array} timeSlots - Available time slots
 * @param {number} week - Target week number
 * @param {number} [preferredPeriod=1] - Preferred starting period
 * @returns {Object|null} - {day, period} or null if no slot found
 */
export const findFreeSlot = (allLessons, preferredDay, timeSlots, week, preferredPeriod = 1) => {
  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  
  // First, try to find slot in preferred day starting from preferredPeriod
  for (let p = preferredPeriod; p <= timeSlots.length; p++) {
    const isOccupied = allLessons.some(l => 
      l.day_of_week === preferredDay && 
      l.period_slot === p && 
      l.week_number === week && 
      !l.is_hidden
    );
    if (!isOccupied) {
      return { day: preferredDay, period: p };
    }
  }

  // If no slot found in preferred day, try next days in order
  const dayIndex = validDays.indexOf(preferredDay);
  for (let d = dayIndex + 1; d < validDays.length; d++) {
    const nextDay = validDays[d];
    for (let p = 1; p <= timeSlots.length; p++) {
      const isOccupied = allLessons.some(l => 
        l.day_of_week === nextDay && 
        l.period_slot === p && 
        l.week_number === week && 
        !l.is_hidden
      );
      if (!isOccupied) {
        return { day: nextDay, period: p };
      }
    }
  }

  // Fallback: try earlier days if we started late in the week
  if (dayIndex > 0) {
    for (let d = 0; d < dayIndex; d++) {
      const earlierDay = validDays[d];
      for (let p = 1; p <= timeSlots.length; p++) {
        const isOccupied = allLessons.some(l => 
          l.day_of_week === earlierDay && 
          l.period_slot === p && 
          l.week_number === week && 
          !l.is_hidden
        );
        if (!isOccupied) {
          return { day: earlierDay, period: p };
        }
      }
    }
  }

  console.warn(`No free slot found for ${preferredDay} in week ${week}`);
  return null;
};

/**
 * Finds an alternative slot when the preferred one is occupied
 * @param {Array} lessons - Current lessons
 * @param {string} targetDay - Target day
 * @param {Array} timeSlots - Available time slots
 * @param {number} currentWeek - Current week
 * @param {number} targetPeriod - Original target period
 * @returns {Object|null} - {day, period} or null
 */
export const findAlternativeSlot = (lessons, targetDay, timeSlots, currentWeek, targetPeriod) => {
  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  
  // Try same day, later periods (skip the immediate next one to avoid double-lesson conflicts)
  for (let p = targetPeriod + 2; p <= timeSlots.length; p++) {
    const isOccupied = lessons.some(l => 
      l.day_of_week === targetDay && 
      l.period_slot === p && 
      l.week_number === currentWeek && 
      !l.is_hidden
    );
    if (!isOccupied) {
      return { day: targetDay, period: p };
    }
  }

  // Try next days
  const dayIndex = validDays.indexOf(targetDay);
  for (let d = dayIndex + 1; d < validDays.length; d++) {
    const nextDay = validDays[d];
    for (let p = 1; p <= timeSlots.length; p++) {
      const isOccupied = lessons.some(l => 
        l.day_of_week === nextDay && 
        l.period_slot === p && 
        l.week_number === currentWeek && 
        !l.is_hidden
      );
      if (!isOccupied) {
        return { day: nextDay, period: p };
      }
    }
  }

  console.warn(`No alternative slot found for ${targetDay} period ${targetPeriod}`);
  return null;
};

/**
 * Checks if a slot is available for a lesson (including double-lesson considerations)
 * @param {Array} lessons - Current lessons
 * @param {string} day - Target day
 * @param {number} period - Target period
 * @param {number} week - Target week
 * @param {boolean} [isDoubleLesson=false] - Whether this is a double lesson
 * @returns {boolean} - True if slot is available
 */
export const isSlotAvailable = (lessons, day, period, week, isDoubleLesson = false) => {
  if (isDoubleLesson) {
    // Check both periods for double lessons
    const nextPeriod = period + 1;
    return !lessons.some(l => 
      (l.day_of_week === day && l.period_slot === period && l.week_number === week && !l.is_hidden) ||
      (l.day_of_week === day && l.period_slot === nextPeriod && l.week_number === week && !l.is_hidden)
    );
  }
  
  // Single lesson check
  return !lessons.some(l => 
    l.day_of_week === day && 
    l.period_slot === period && 
    l.week_number === week && 
    !l.is_hidden
  );
};

/**
 * Gets all occupied slots for a given week
 * @param {Array} lessons - Current lessons
 * @param {number} week - Target week
 * @returns {Array} - Array of {day, period} objects for occupied slots
 */
export const getOccupiedSlots = (lessons, week) => {
  return lessons
    .filter(l => l.week_number === week && !l.is_hidden)
    .map(l => ({ day: l.day_of_week, period: l.period_slot }));
};

/**
 * Validates that a lesson placement doesn't conflict with existing lessons
 * @param {Object} lessonData - Lesson data with day_of_week, period_slot, etc.
 * @param {Array} allLessons - Current lessons
 * @param {number} week - Target week
 * @returns {boolean} - True if placement is valid
 */
export const validateLessonPlacement = (lessonData, allLessons, week) => {
  const { day_of_week, period_slot, is_double_lesson } = lessonData;
  
  if (!isSlotAvailable(allLessons, day_of_week, period_slot, week, is_double_lesson)) {
    return false;
  }
  
  // Additional validation for half-class lessons, holidays, etc. can be added here
  return true;
};