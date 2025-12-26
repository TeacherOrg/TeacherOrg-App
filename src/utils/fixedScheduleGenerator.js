import { Lesson } from '@/api/entities';
import toast from 'react-hot-toast';

/**
 * Detects double lesson slots in the template based on consecutive periods
 * @param {Object} template - Fixed schedule template object
 * @returns {Set} Set of keys identifying double lesson slots
 */
function detectDoubleLessonSlots(template) {
  const doubleSlots = new Set();
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  days.forEach(day => {
    const slots = (template[day] || []).sort((a, b) => a.period - b.period);

    for (let i = 0; i < slots.length - 1; i++) {
      const current = slots[i];
      const next = slots[i + 1];

      // If consecutive periods with same subject+class → mark as double
      if (
        current.period + 1 === next.period &&
        current.subject === next.subject &&
        current.class_id === next.class_id
      ) {
        const key = `${day}-${current.period}-${current.subject}-${current.class_id}`;
        doubleSlots.add(key);
      }
    }
  });

  return doubleSlots;
}

/**
 * Checks if a YearlyLesson is the second part of a double lesson
 * @param {Object} yearlyLesson - YearlyLesson to check
 * @param {Array} allYearlyLessons - All YearlyLessons to search
 * @returns {boolean}
 */
function isSecondPartOfDouble(yearlyLesson, allYearlyLessons) {
  return allYearlyLessons.some(yl =>
    yl.second_yearly_lesson_id === yearlyLesson.id
  );
}

/**
 * Groups YearlyLessons by subject and class
 * @param {Array} yearlyLessons - Array of YearlyLessons
 * @returns {Object} Grouped lessons by key 'subjectId_classId'
 */
function groupYearlyLessonsBySubjectClass(yearlyLessons) {
  const grouped = {};

  yearlyLessons.forEach(yl => {
    const key = `${yl.subject}_${yl.class_id}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(yl);
  });

  // Sort each group by lesson_number
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
  });

  return grouped;
}

/**
 * Calculates time slot based on settings
 * @param {number} period - Period number
 * @param {Object} settings - Settings object with time configuration
 * @returns {Object} { start, end } time strings
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
 * Maps template slots to YearlyLessons for a specific week
 * @param {Object} params - Parameters object
 * @returns {Array} Array of lesson data objects to create
 */
function mapTemplateToLessons({
  template,
  week,
  yearlyBySubClass,
  doubleLessonSlots,
  counters,
  currentYear,
  userId,
  activeClassId,
  settings,
  subjects
}) {
  const lessons = [];
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const processedDoubles = new Set();

  days.forEach(day => {
    const daySlots = (template[day] || []).sort((a, b) => a.period - b.period);

    daySlots.forEach(slot => {
      const slotKey = `${day}-${slot.period}-${slot.subject}-${slot.class_id}`;

      // Skip if this is the second part of a processed double lesson
      if (processedDoubles.has(slotKey)) return;

      // Find subject ID from subject name
      const subjectObj = subjects.find(s => s.name === slot.subject && s.class_id === slot.class_id);
      if (!subjectObj) {
        console.warn(`Subject not found: ${slot.subject} for class ${slot.class_id}`);
        return;
      }

      const key = `${subjectObj.id}_${slot.class_id}`;

      if (!counters[key]) counters[key] = 0;

      const availableYearlyLessons = yearlyBySubClass[key] || [];

      // Find next YearlyLesson (skip second parts of doubles)
      let yearlyLesson = null;
      let idx = counters[key];

      while (idx < availableYearlyLessons.length) {
        const candidate = availableYearlyLessons[idx];
        if (!isSecondPartOfDouble(candidate, availableYearlyLessons)) {
          yearlyLesson = candidate;
          break;
        }
        idx++;
      }

      if (!yearlyLesson) {
        // No more YearlyLessons available for this subject
        return;
      }

      // Check if this is a double lesson slot
      const isDouble = doubleLessonSlots.has(slotKey);

      const timeSlot = calculateTimeSlot(slot.period, settings);

      const lessonData = {
        subject: subjectObj.id,
        class_id: slot.class_id,
        day_of_week: day,
        period_slot: slot.period,
        week_number: week,
        yearly_lesson_id: yearlyLesson.id,
        is_double_lesson: isDouble && !!yearlyLesson.second_yearly_lesson_id,
        second_yearly_lesson_id: isDouble && yearlyLesson.second_yearly_lesson_id ? yearlyLesson.second_yearly_lesson_id : null,
        start_time: timeSlot.start,
        end_time: timeSlot.end,
        user_id: userId,
        school_year: currentYear,
        is_hidden: false,
        topic_id: yearlyLesson.topic_id || null,
        is_exam: yearlyLesson.is_exam || false,
        is_half_class: yearlyLesson.is_half_class || false,
        is_allerlei: yearlyLesson.is_allerlei || false,
        allerlei_subjects: yearlyLesson.allerlei_subjects || []
      };

      lessons.push(lessonData);

      counters[key] = idx + 1;

      // If double lesson, mark the next slot as processed
      if (isDouble && yearlyLesson.second_yearly_lesson_id) {
        const nextSlotKey = `${day}-${slot.period + 1}-${slot.subject}-${slot.class_id}`;
        processedDoubles.add(nextSlotKey);

        // Also increment counter past the second YearlyLesson if it's next in line
        if (counters[key] < availableYearlyLessons.length &&
            availableYearlyLessons[counters[key]].id === yearlyLesson.second_yearly_lesson_id) {
          counters[key]++;
        }
      }
    });
  });

  return lessons;
}

/**
 * Batch creates lessons with progress feedback
 * @param {Array} lessons - Array of lesson data objects
 * @returns {Promise<Array>} Array of created lesson records
 */
async function batchCreateWithProgress(lessons) {
  const results = [];
  const batchSize = 20; // Create 20 at a time

  for (let i = 0; i < lessons.length; i += batchSize) {
    const batch = lessons.slice(i, i + batchSize);

    // Show progress toast
    const progressText = `Erstelle Stunden ${i + 1}-${Math.min(i + batchSize, lessons.length)} von ${lessons.length}...`;
    toast.loading(progressText, {
      id: 'bulk-create-progress'
    });

    try {
      const batchResults = await Promise.all(
        batch.map(lesson => Lesson.create(lesson))
      );

      results.push(...batchResults);

      // Rate limiting to avoid server overload
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Batch creation error:', error);
      toast.error(`Fehler bei Batch ${i + 1}-${i + batchSize}: ${error.message}`, {
        id: 'bulk-create-progress'
      });
      // Continue with next batch
    }
  }

  toast.success(`${results.length} Stunden erfolgreich erstellt!`, {
    id: 'bulk-create-progress',
    duration: 5000
  });

  return results;
}

/**
 * Main function to generate lessons from fixed schedule template
 * @param {Object} params - Parameters object
 * @returns {Promise<Object>} Results object with created lessons and statistics
 */
export async function generateLessonsFromFixedTemplate({
  template,
  yearlyLessons,
  existingLessons,
  currentYear,
  activeClassId,
  userId,
  settings,
  subjects
}) {
  if (!template || Object.keys(template).length === 0) {
    throw new Error('Template ist leer oder nicht definiert');
  }

  if (!yearlyLessons || yearlyLessons.length === 0) {
    throw new Error('Keine YearlyLessons vorhanden. Bitte erstellen Sie zuerst Jahresplanung.');
  }

  console.log('Starting fixed schedule generation...', {
    templateDays: Object.keys(template).length,
    yearlyLessonsCount: yearlyLessons.length,
    existingLessonsCount: existingLessons.length
  });

  // Step 1: Detect double lesson slots in template
  const doubleLessonSlots = detectDoubleLessonSlots(template);
  console.log('Detected double lesson slots:', doubleLessonSlots.size);

  // Step 2: Prepare data
  const allLessonsToCreate = [];
  const skippedWeeks = [];
  const counters = {};

  // Step 3: Generate lessons for each week
  toast.loading('Analysiere Vorlage und Jahresplanung...', { id: 'bulk-create-progress' });

  for (let week = 1; week <= 52; week++) {
    // Skip if lessons already exist for this week (migration strategy)
    const existingForWeek = existingLessons.filter(l => l.week_number === week);
    if (existingForWeek.length > 0) {
      skippedWeeks.push({ week, reason: 'already_exists', count: existingForWeek.length });
      continue;
    }

    // Get YearlyLessons for this week
    const yearlyForWeek = yearlyLessons.filter(yl => yl.week_number === week);
    if (yearlyForWeek.length === 0) {
      skippedWeeks.push({ week, reason: 'no_yearly_lessons' });
      continue;
    }

    // Group by subject+class
    const yearlyBySubClass = groupYearlyLessonsBySubjectClass(yearlyForWeek);

    // Map template to lessons
    const lessonsForWeek = mapTemplateToLessons({
      template,
      week,
      yearlyBySubClass,
      doubleLessonSlots,
      counters: {}, // Reset counters for each week
      currentYear,
      userId,
      activeClassId,
      settings,
      subjects
    });

    allLessonsToCreate.push(...lessonsForWeek);

    // Show progress every 5 weeks
    if (week % 5 === 0) {
      toast.loading(
        `Woche ${week}/52 verarbeitet... (${allLessonsToCreate.length} Stunden geplant)`,
        { id: 'bulk-create-progress' }
      );
    }
  }

  console.log('Generation complete. Creating lessons...', {
    totalToCreate: allLessonsToCreate.length,
    skippedWeeks: skippedWeeks.length
  });

  // Step 4: Batch create all lessons
  const createdLessons = await batchCreateWithProgress(allLessonsToCreate);

  // Step 5: Calculate statistics
  const doubleLessonCount = createdLessons.filter(l => l.is_double_lesson).length;

  const stats = {
    totalCreated: createdLessons.length,
    doubleLessons: doubleLessonCount,
    skippedWeeks: skippedWeeks.length,
    processedWeeks: 52 - skippedWeeks.length,
    skippedDetails: skippedWeeks
  };

  console.log('Fixed schedule generation complete:', stats);

  return {
    lessons: createdLessons,
    stats
  };
}
