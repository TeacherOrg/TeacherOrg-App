self.onmessage = (e) => {
  const { lessons, subjects, sort } = e.data;

  // Vorschlag 3: Erweiterung - Sorting, wenn angefordert
  let processedLessons = [...lessons];
  if (sort) {
    processedLessons.sort((a, b) => {
      if (a.week_number !== b.week_number) return a.week_number - b.week_number;
      if (a.lesson_number !== b.lesson_number) return a.lesson_number - b.lesson_number;
      return 0;
    });
  }

  // Einfache Normalisierung im Worker (Offload)
  processedLessons = processedLessons.map(lesson => ({
    ...lesson,
    lesson_number: Number(lesson.lesson_number) || 0,
    week_number: Number(lesson.week_number) || 0
  }));

  const subjectMap = new Map(subjects.map(s => [s.id, s.name]));
  const lessonsByWeek = {};
  processedLessons.forEach(lesson => {
    const subjectName = subjectMap.get(lesson.subject) || 'Unknown';
    const key = `${lesson.week_number}-${subjectName}-${lesson.lesson_number}`;
    lessonsByWeek[key] = lesson;
  });
  self.postMessage(lessonsByWeek);
};