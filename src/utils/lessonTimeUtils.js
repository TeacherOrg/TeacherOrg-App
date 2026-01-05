// src/utils/lessonTimeUtils.js
// Helper-Funktionen fuer die Berechnung von Lektionszeiten und Fortschritt

/**
 * Berechnet die aktuelle Kalenderwoche
 */
export function getCurrentWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Generiert TimeSlots basierend auf den Einstellungen
 * (Gleiche Logik wie in DailyView.jsx generateTimeSlotsWithBreaks, aber nur Slots)
 */
export function generateTimeSlots(settings) {
  if (!settings || !settings.startTime) return [];

  const slots = [];
  const {
    startTime,
    lessonsPerDay = 8,
    lessonDuration = 45,
    shortBreak = 5,
    morningBreakAfter = 2,
    morningBreakDuration = 20,
    lunchBreakAfter = 4,
    lunchBreakDuration = 40,
    afternoonBreakAfter = 6,
    afternoonBreakDuration = 15,
  } = settings;

  const [startHour, startMinute] = startTime.split(':').map(Number);
  let currentTime = new Date(2000, 0, 1, startHour, startMinute, 0);

  for (let i = 1; i <= lessonsPerDay; i++) {
    const slotStartTime = new Date(currentTime);
    currentTime.setMinutes(currentTime.getMinutes() + lessonDuration);
    const slotEndTime = new Date(currentTime);

    slots.push({
      period: i,
      start: slotStartTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      end: slotEndTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    });

    // Pausendauer fuer naechste Periode hinzufuegen
    if (i < lessonsPerDay) {
      let breakDuration = shortBreak;
      if (i === morningBreakAfter) breakDuration = morningBreakDuration;
      else if (i === lunchBreakAfter) breakDuration = lunchBreakDuration;
      else if (i === afternoonBreakAfter) breakDuration = afternoonBreakDuration;
      currentTime.setMinutes(currentTime.getMinutes() + breakDuration);
    }
  }

  return slots;
}

/**
 * Prueft ob eine Lektion bereits beendet ist
 * Beruecksichtigt: Jahr, Woche, Tag und Endzeit der Lektion
 *
 * @param {Object} lesson - Das Lektionsobjekt mit week_number, day_of_week, period_slot, is_double_lesson
 * @param {Array} timeSlots - Array mit TimeSlot-Objekten (period, start, end)
 * @param {Date} now - Aktueller Zeitpunkt (optional, default: new Date())
 * @returns {boolean} - true wenn die Lektion beendet ist
 */
export function hasLessonEnded(lesson, timeSlots, now = new Date()) {
  const realCurrentYear = now.getFullYear();
  const realCurrentWeek = getCurrentWeek(now);
  const lessonYear = lesson.week_year || realCurrentYear;
  const lessonWeek = lesson.week_number;

  // 1. Vergangenes Jahr -> abgeschlossen
  if (lessonYear < realCurrentYear) return true;
  // Zukuenftiges Jahr -> nicht abgeschlossen
  if (lessonYear > realCurrentYear) return false;

  // 2. Vergangene Woche -> abgeschlossen
  if (lessonWeek < realCurrentWeek) return true;
  // Zukuenftige Woche -> nicht abgeschlossen
  if (lessonWeek > realCurrentWeek) return false;

  // 3. Gleiche Woche - Tag pruefen
  const dayOrder = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };
  const currentDayIndex = now.getDay();
  const lessonDayOfWeek = lesson.day_of_week?.toLowerCase();
  const lessonDayIndex = dayOrder[lessonDayOfWeek];

  // Unguelitger Tag -> nicht abgeschlossen (Sicherheitsfall)
  if (lessonDayIndex === undefined) return false;

  // Vergangener Tag -> abgeschlossen
  if (lessonDayIndex < currentDayIndex) return true;
  // Zukuenftiger Tag -> nicht abgeschlossen
  if (lessonDayIndex > currentDayIndex) return false;

  // 4. Gleicher Tag - Endzeit pruefen
  // Bei Doppellektionen die Endzeit der zweiten Periode verwenden
  let endPeriod = lesson.period_slot;
  if (lesson.is_double_lesson) {
    endPeriod = lesson.period_slot + 1;
  }

  const timeSlot = timeSlots.find(ts => ts.period === endPeriod);

  // Kein TimeSlot gefunden -> nicht abgeschlossen (Sicherheitsfall)
  if (!timeSlot) return false;

  // Endzeit parsen und vergleichen
  const [hours, minutes] = timeSlot.end.split(':').map(Number);
  const lessonEndTime = new Date(now);
  lessonEndTime.setHours(hours, minutes, 0, 0);

  return now >= lessonEndTime;
}
