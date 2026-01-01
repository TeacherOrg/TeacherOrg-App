/**
 * Berechnet den Montag einer ISO-Woche in einem gegebenen Jahr
 * @param {number} week - Wochennummer (1-53)
 * @param {number} year - Schuljahr (z.B. 2024 fuer 2024/25)
 * @returns {Date} Das Datum des Montags dieser Woche
 */
export function getMondayOfWeek(week, year) {
  // ISO-Woche 1 enthaelt den 4. Januar
  const jan4 = new Date(year, 0, 4);
  const mondayOfWeek1 = new Date(jan4);
  // Finde den Montag der Woche 1
  mondayOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  // Berechne den Montag der gewuenschten Woche
  const monday = new Date(mondayOfWeek1);
  monday.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
  return monday;
}

/**
 * Berechnet das tatsaechliche Kalenderjahr fuer eine Schulwoche
 * @param {number} weekNumber - Wochennummer (1-53)
 * @param {number} schoolYear - Schuljahr (z.B. 2024 fuer 2024/25)
 * @returns {number} Das Kalenderjahr, in dem diese Woche liegt
 */
export function getWeekYear(weekNumber, schoolYear) {
  const monday = getMondayOfWeek(weekNumber, schoolYear);
  return monday.getFullYear();
}

/**
 * Berechnet das aktuelle Schuljahr basierend auf der aktuellen Woche
 * Wenn aktuelle Woche < schoolYearStartWeek → Schuljahr = vorheriges Kalenderjahr
 * Wenn aktuelle Woche >= schoolYearStartWeek → Schuljahr = aktuelles Kalenderjahr
 * @param {number} schoolYearStartWeek - Die Startwoche des Schuljahres (z.B. 35)
 * @returns {number} Das Schuljahr (z.B. 2025 fuer Schuljahr 2025/26)
 */
export function getCurrentSchoolYear(schoolYearStartWeek = 35) {
  const now = new Date();
  const currentCalendarYear = now.getFullYear();

  // Berechne aktuelle ISO-Woche
  const jan4 = new Date(currentCalendarYear, 0, 4);
  const daysToMonday = (jan4.getDay() + 6) % 7;
  const mondayOfWeek1 = new Date(jan4.getTime() - daysToMonday * 86400000);
  const diffTime = now.getTime() - mondayOfWeek1.getTime();
  const currentWeek = Math.max(1, Math.min(53, Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1));

  // Wenn aktuelle Woche < Startwoche → Schuljahr = vorheriges Kalenderjahr
  return currentWeek < schoolYearStartWeek ? currentCalendarYear - 1 : currentCalendarYear;
}
