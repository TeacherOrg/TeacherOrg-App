function getCurrentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + start.getDay() + 1) / 7);
}

function getWeekInfo(week, year) {
  const jan4 = new Date(year, 0, 4);
  const mondayOfWeek1 = new Date();
  mondayOfWeek1.setTime(jan4.getTime() - ((jan4.getDay() + 6) % 7) * 86400000);
  const monday = new Date();
  monday.setTime(mondayOfWeek1.getTime() + (week - 1) * 7 * 86400000);
  const friday = new Date();
  friday.setTime(monday.getTime() + 4 * 86400000);
  const mondayStr = monday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  const fridayStr = friday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  const mondayForHolidayCheck = new Date(monday);
  mondayForHolidayCheck.setHours(0, 0, 0, 0);
  const fridayForHolidayCheck = new Date(friday);
  fridayForHolidayCheck.setHours(23, 59, 59, 999);
  return {
    start: mondayForHolidayCheck,
    end: fridayForHolidayCheck,
    calendarWeek: week,
    mondayStr,
    fridayStr,
    year: monday.getFullYear()
  };
}

function generateTimeSlots(settings) {
  if (!settings || !settings.startTime) {
    return [];
  }
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
    if (i < lessonsPerDay) {
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
  }
  return slots;
}

export { getCurrentWeek, getWeekInfo, generateTimeSlots };