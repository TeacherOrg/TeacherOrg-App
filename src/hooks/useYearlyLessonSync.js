import { useCallback } from 'react';
import { Lesson } from '@/api/entities';
import pb from '@/api/pb';

/**
 * Finds the template placement for a YearlyLesson
 * @param {Object} params - Parameters
 * @returns {Object|null} { day, period } or null if not found
 */
function findYearlyLessonPlacement({ yearlyLesson, template, subjects, allYearlyLessons }) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  // Get subject name from yearlyLesson - try multiple sources
  let subjectName = yearlyLesson.expand?.subject?.name ||
                    yearlyLesson.subject_name;

  // If still not found, look up by ID in subjects array
  if (!subjectName && yearlyLesson.subject) {
    const subject = subjects.find(s => s.id === yearlyLesson.subject);
    subjectName = subject?.name;
  }

  if (!subjectName) {
    console.warn('Cannot find subject name for YearlyLesson:', yearlyLesson.id, 'subject ID:', yearlyLesson.subject);
    return null;
  }

  console.log(`Finding placement for YearlyLesson ${yearlyLesson.id}: ${subjectName}, Week ${yearlyLesson.week_number}, Lesson #${yearlyLesson.lesson_number}`);

  // Find all template slots for this subject
  const subjectSlots = [];
  days.forEach(day => {
    (template[day] || []).forEach(slot => {
      if (slot.subject === subjectName && slot.class_id === yearlyLesson.class_id) {
        subjectSlots.push({ day, period: slot.period });
      }
    });
  });

  if (subjectSlots.length === 0) {
    console.warn('No template slots found for subject:', subjectName);
    return null;
  }

  // Sort slots by day then period
  subjectSlots.sort((a, b) => {
    const dayOrder = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
    return dayOrder[a.day] - dayOrder[b.day] || a.period - b.period;
  });

  // Get all YearlyLessons for this subject in this week, sorted by lesson_number
  const allForSubject = allYearlyLessons
    .filter(yl =>
      yl.week_number === yearlyLesson.week_number &&
      yl.subject === yearlyLesson.subject &&
      yl.class_id === yearlyLesson.class_id
    )
    .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));

  console.log(`  → Found ${allForSubject.length} lessons for ${subjectName} in week ${yearlyLesson.week_number}`);
  console.log(`  → Template has ${subjectSlots.length} slots for ${subjectName}`);
  console.log(`  → Current lesson_number: ${yearlyLesson.lesson_number}`);

  // CRITICAL FIX: Use lesson_number directly to map to slot index
  // lesson_number is 1-based (L1, L2, L3...), so subtract 1 for 0-based array index
  const slotIndex = Number(yearlyLesson.lesson_number) - 1;

  console.log(`  → Calculated slot index: ${slotIndex}`);

  if (slotIndex >= 0 && slotIndex < subjectSlots.length) {
    const placement = subjectSlots[slotIndex];
    console.log(`  ✓ Placing at ${placement.day}, period ${placement.period}`);
    return placement;
  }

  // Fallback: if lesson_number exceeds available slots, place in last slot
  if (slotIndex >= subjectSlots.length) {
    console.warn('Lesson number exceeds template slots. Using last slot for:', yearlyLesson.id);
    return subjectSlots[subjectSlots.length - 1];
  }

  console.warn('Could not determine placement for YearlyLesson:', yearlyLesson.id);
  return null;
}

/**
 * Calculate time slot based on period and settings
 * Helper function (duplicated from fixedScheduleGenerator for independence)
 */
function calculateTimeSlot(period, settings) {
  const {
    startTime = '08:00',
    lessonDuration = 45,
    shortBreak = 5,
    morningBreakAfter = 2,
    morningBreakDuration = 20,
    lunchBreakAfter = 4,
    lunchBreakDuration = 40,
    afternoonBreakAfter = 6,
    afternoonBreakDuration = 15
  } = settings;

  const [startHour, startMinute] = startTime.split(':').map(Number);
  let currentTime = new Date(2000, 0, 1, startHour, startMinute, 0);

  // Calculate time for this period
  for (let i = 1; i < period; i++) {
    currentTime.setMinutes(currentTime.getMinutes() + lessonDuration);

    let breakDuration = shortBreak;
    if (i === morningBreakAfter) {
      breakDuration = morningBreakDuration;
    } else if (i === lunchBreakAfter) {
      breakDuration = lunchBreakDuration;
    } else if (i === afternoonBreakAfter) {
      breakDuration = afternoonBreakDuration;
    }
    currentTime.setMinutes(currentTime.getMinutes() + breakDuration);
  }

  const slotStart = new Date(currentTime);
  currentTime.setMinutes(currentTime.getMinutes() + lessonDuration);
  const slotEnd = new Date(currentTime);

  return {
    start: slotStart.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    end: slotEnd.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  };
}

/**
 * Standalone sync function (can be used outside hooks)
 * @param {Object} yearlyLesson - The YearlyLesson to sync
 * @param {Object} settings - Settings object
 * @param {Array} subjects - Array of subjects
 * @param {Array} allYearlyLessons - All YearlyLessons for context
 * @returns {Promise<void>}
 */
export async function syncYearlyLessonToWeekly(yearlyLesson, settings, subjects, allYearlyLessons = []) {
  // Only in fixed schedule mode
  if (settings?.scheduleType !== 'fixed') {
    return;
  }

  const template = settings.fixedScheduleTemplate || {};
  if (!template || Object.keys(template).length === 0) {
    console.warn('No fixed schedule template found');
    return;
  }

  // Find where this YearlyLesson should be placed
  const placement = findYearlyLessonPlacement({
    yearlyLesson,
    template,
    subjects,
    allYearlyLessons
  });

  if (!placement) {
    console.warn('No placement found for YearlyLesson in template:', yearlyLesson);
    return;
  }

  // Detect if this should be a double lesson based on template
  const isTemplateDouble = (() => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const currentDay = placement.day;
    const currentPeriod = placement.period;

    // Check if next period on same day has same subject
    const daySlots = template[currentDay] || [];
    const currentSlotInDay = daySlots.find(s => s.period === currentPeriod);
    const nextSlotInDay = daySlots.find(s => s.period === currentPeriod + 1);

    if (currentSlotInDay && nextSlotInDay) {
      const sameSubject = currentSlotInDay.subject === nextSlotInDay.subject;
      const sameClass = currentSlotInDay.class_id === nextSlotInDay.class_id;
      const isConsecutive = nextSlotInDay.period === currentSlotInDay.period + 1;

      console.log(`    → Checking double lesson: ${sameSubject && sameClass && isConsecutive ? 'YES' : 'NO'}`);
      return sameSubject && sameClass && isConsecutive;
    }

    return false;
  })();

  try {
    // Check if Lesson already exists for this YearlyLesson
    const existing = await Lesson.list({
      yearly_lesson_id: yearlyLesson.id,
      week_number: yearlyLesson.week_number
    });

    // Calculate time slot based on settings
    const timeSlot = calculateTimeSlot(placement.period, settings);

    // Determine is_double_lesson: prioritize yearlyLesson flag, fallback to template detection
    const isDoubleLesson = yearlyLesson.is_double_lesson ?? isTemplateDouble;

    if (existing.length > 0) {
      // Update existing Lesson
      await Lesson.update(existing[0].id, {
        topic_id: yearlyLesson.topic_id,
        is_exam: yearlyLesson.is_exam,
        is_double_lesson: isDoubleLesson,
        period_span: isDoubleLesson ? 2 : 1,
        second_yearly_lesson_id: yearlyLesson.second_yearly_lesson_id,
        is_half_class: yearlyLesson.is_half_class,
        is_allerlei: yearlyLesson.is_allerlei,
        allerlei_subjects: yearlyLesson.allerlei_subjects || []
      });

      console.log('Updated existing Lesson:', existing[0].id);
    } else {
      // Create new Lesson
      const lessonData = {
        subject: yearlyLesson.subject,
        class_id: yearlyLesson.class_id,
        day_of_week: placement.day,
        period_slot: placement.period,
        week_number: yearlyLesson.week_number,
        yearly_lesson_id: yearlyLesson.id,
        topic_id: yearlyLesson.topic_id,
        start_time: timeSlot.start,
        end_time: timeSlot.end,
        user_id: pb.authStore.model?.id,
        school_year: yearlyLesson.school_year || new Date().getFullYear(),
        is_double_lesson: isDoubleLesson,
        period_span: isDoubleLesson ? 2 : 1,
        second_yearly_lesson_id: yearlyLesson.second_yearly_lesson_id || null,
        is_hidden: false,
        is_exam: yearlyLesson.is_exam || false,
        is_half_class: yearlyLesson.is_half_class || false,
        is_allerlei: yearlyLesson.is_allerlei || false,
        allerlei_subjects: yearlyLesson.allerlei_subjects || []
      };

      const newLesson = await Lesson.create(lessonData);
      console.log('Created new Lesson:', newLesson.id, 'for YearlyLesson:', yearlyLesson.id, '| is_double_lesson:', isDoubleLesson);
    }
  } catch (error) {
    console.error('Error syncing YearlyLesson to weekly Lesson:', error);
    throw error;
  }
}

/**
 * Hook to sync YearlyLessons to weekly Lessons in fixed schedule mode
 * @param {Object} settings - Settings object with scheduleType and fixedScheduleTemplate
 * @param {Array} subjects - Array of subject objects
 * @param {Array} allYearlyLessons - All YearlyLessons for context
 * @returns {Object} { syncYearlyLessonToWeekly }
 */
export function useYearlyLessonSync(settings, subjects, allYearlyLessons = []) {
  const syncYearlyLessonToWeeklyCallback = useCallback(async (yearlyLesson) => {
    return syncYearlyLessonToWeekly(yearlyLesson, settings, subjects, allYearlyLessons);
  }, [settings, subjects, allYearlyLessons]);

  return { syncYearlyLessonToWeekly: syncYearlyLessonToWeeklyCallback };
}
