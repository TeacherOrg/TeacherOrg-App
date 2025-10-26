import { useCallback } from 'react';
import { PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Lesson } from "@/api/entities";

const useDragAndDrop = (lessonsForCurrentWeek, allLessons, allerleiLessons, currentWeek, yearlyLessons, timeSlots, currentYear, queryClientLocal, subjects, activeClassId, optimisticUpdateAllLessons, optimisticUpdateYearlyLessons, optimisticUpdateAllerleiLessons, reassignYearlyLessonLinks, updateYearlyLessonOrder, setAllLessons, setYearlyLessons, setAllerleiLessons, refetch, setActiveDragId) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  const findAlternativeSlot = useCallback((lessons, targetDay, startPeriod, timeSlots, currentWeek) => {
    for (let p = startPeriod + 2; p <= timeSlots.length; p++) {
      if (!lessons.some(l => l.day_of_week === targetDay && l.period_slot === p && l.week_number === currentWeek)) {
        return { day: targetDay, period: p };
      }
    }
    const nextDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayIndex = nextDays.indexOf(targetDay);
    if (dayIndex < nextDays.length - 1) {
      const nextDay = nextDays[dayIndex + 1];
      for (let p = 1; p <= timeSlots.length; p++) {
        if (!lessons.some(l => l.day_of_week === nextDay && l.period_slot === p && l.week_number === currentWeek)) {
          return { day: nextDay, period: p };
        }
      }
    }
    return null;
  }, [timeSlots.length]);

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setActiveDragId(null);
      return;
    }

    const [targetDay, targetPeriodStr] = over.id.split('-');
    const targetPeriod = parseInt(targetPeriodStr, 10);

    if (active.id.startsWith('pool-')) {
      // Handle drag from pool: Create new lesson
      const subjectId = active.id.replace('pool-', '');
      const subject = subjects.find(s => s.id === subjectId);
      if (!subject) {
        console.warn('Subject not found for pool item');
        setActiveDragId(null);
        return;
      }

      // Find next available yearly lesson for this subject in the current week
      const availableYearly = yearlyLessons
        .filter(yl => yl.subject === subject.id && yl.week_number === currentWeek && !allLessons.some(l => l.yearly_lesson_id === yl.id && l.week_number === currentWeek))
        .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number))[0];

      if (!availableYearly) {
        console.warn('No available yearly lesson for subject');
        setActiveDragId(null);
        return;
      }

      const isOccupied = lessonsForCurrentWeek.some(l => l.day_of_week === targetDay && l.period_slot === targetPeriod && l.week_number === currentWeek);

      let finalTarget = { day: targetDay, period: targetPeriod };
      if (isOccupied) {
        const alternative = findAlternativeSlot(lessonsForCurrentWeek, targetDay, targetPeriod, timeSlots, currentWeek);
        if (!alternative) {
          console.warn('No alternative slot found');
          setActiveDragId(null);
          return;
        }
        finalTarget = alternative;
      }

      // Handle double lesson if applicable
      const isDoubleLesson = availableYearly.is_double_lesson;
      if (isDoubleLesson) {
        const secondPeriod = finalTarget.period + 1;
        const isSecondOccupied = lessonsForCurrentWeek.some(l => l.day_of_week === finalTarget.day && l.period_slot === secondPeriod && l.week_number === currentWeek);
        if (isSecondOccupied || secondPeriod > timeSlots.length) {
          console.warn('Cannot place double lesson: second slot occupied or out of bounds');
          setActiveDragId(null);
          return;
        }
      }

      // Create new lesson data
      const timeSlot = timeSlots.find(ts => ts.period === finalTarget.period);
      const newLessonData = {
        subject: subject.id,
        day_of_week: finalTarget.day,
        period_slot: finalTarget.period,
        week_number: currentWeek,
        school_year: currentYear,
        yearly_lesson_id: availableYearly.id,
        topic_id: availableYearly.topic_id || null,
        is_double_lesson: isDoubleLesson,
        second_yearly_lesson_id: isDoubleLesson ? availableYearly.second_yearly_lesson_id : null,
        is_exam: availableYearly.is_exam || false,
        is_half_class: availableYearly.is_half_class || false,
        is_allerlei: false,
        start_time: timeSlot?.start || '08:00',
        end_time: timeSlot?.end || '08:45',
        user_id: activeClassId, // Assuming user_id is tied to class or similar; adjust if needed
      };

      try {
        const newLesson = await Lesson.create(newLessonData);
        optimisticUpdateAllLessons(newLesson, true); // true indicates addition

        if (isDoubleLesson && availableYearly.second_yearly_lesson_id) {
          const secondYearly = yearlyLessons.find(yl => yl.id === availableYearly.second_yearly_lesson_id);
          if (secondYearly) {
            const secondLessonData = {
              ...newLessonData,
              period_slot: finalTarget.period + 1,
              yearly_lesson_id: secondYearly.id,
              second_yearly_lesson_id: availableYearly.id,
              topic_id: secondYearly.topic_id || null,
              is_exam: secondYearly.is_exam || false,
              is_half_class: secondYearly.is_half_class || false,
            };
            const secondLesson = await Lesson.create(secondLessonData);
            optimisticUpdateAllLessons(secondLesson, true);
          }
        }

        // Reassign and update order for the affected subject
        const affectedSubjectName = subject.name;
        let updatedLessons = await reassignYearlyLessonLinks(affectedSubjectName, [...allLessons, newLesson]);
        const updatedYearly = await updateYearlyLessonOrder(affectedSubjectName, updatedLessons);
        setAllLessons(updatedLessons);
        setYearlyLessons(updatedYearly);

        await refetch();
        queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
      } catch (error) {
        console.error('Error creating lesson from pool:', error);
        setAllLessons(allLessons); // Rollback
        setYearlyLessons(yearlyLessons);
      } finally {
        setActiveDragId(null);
      }
      return;
    }

    // Existing handling for dragging existing lessons
    const draggedLesson = lessonsForCurrentWeek.find(l => l.id === active.id);
    if (!draggedLesson) {
      setActiveDragId(null);
      return;
    }

    const isOccupied = lessonsForCurrentWeek.some(l =>
      l.id !== draggedLesson.id &&
      l.day_of_week === targetDay &&
      l.period_slot === targetPeriod &&
      l.week_number === currentWeek
    );

    let finalTarget = { day: targetDay, period: targetPeriod };
    if (isOccupied) {
      const alternative = findAlternativeSlot(lessonsForCurrentWeek, targetDay, targetPeriod, timeSlots, currentWeek);
      if (!alternative) {
        console.warn('No alternative slot found');
        setActiveDragId(null);
        return;
      }
      finalTarget = alternative;
    }

    const isDoubleLesson = draggedLesson.is_double_lesson;
    if (isDoubleLesson) {
      const secondPeriod = finalTarget.period + 1;
      const isSecondOccupied = lessonsForCurrentWeek.some(l =>
        l.day_of_week === finalTarget.day &&
        l.period_slot === secondPeriod &&
        l.week_number === currentWeek
      );
      if (isSecondOccupied || secondPeriod > timeSlots.length) {
        console.warn('Cannot move double lesson: second slot occupied or out of bounds');
        setActiveDragId(null);
        return;
      }
    }

    const updateData = {
      day_of_week: finalTarget.day,
      period_slot: finalTarget.period,
    };

    try {
      optimisticUpdateAllLessons(draggedLesson.id, updateData);

      if (isDoubleLesson) {
        const secondLesson = lessonsForCurrentWeek.find(l =>
          l.day_of_week === draggedLesson.day_of_week &&
          l.period_slot === draggedLesson.period_slot + 1 &&
          l.week_number === currentWeek &&
          l.yearly_lesson_id === draggedLesson.second_yearly_lesson_id
        );
        if (secondLesson) {
          const secondUpdate = {
            day_of_week: finalTarget.day,
            period_slot: finalTarget.period + 1,
          };
          optimisticUpdateAllLessons(secondLesson.id, secondUpdate);
          await Lesson.update(secondLesson.id, secondUpdate);
        }
      }

      await Lesson.update(draggedLesson.id, updateData);

      const affectedSubject = subjects.find(s => s.id === draggedLesson.subject)?.name;
      if (affectedSubject) {
        let updatedLessons = await reassignYearlyLessonLinks(affectedSubject, allLessons);
        const updatedYearly = await updateYearlyLessonOrder(affectedSubject, updatedLessons);
        setAllLessons(updatedLessons);
        setYearlyLessons(updatedYearly);
      }

      await refetch();
      queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
    } catch (error) {
      console.error('Error updating lesson:', error);
      setAllLessons(allLessons);
      setYearlyLessons(yearlyLessons);
    } finally {
      setActiveDragId(null);
    }
  }, [lessonsForCurrentWeek, allLessons, allerleiLessons, currentWeek, yearlyLessons, timeSlots, currentYear, queryClientLocal, subjects, activeClassId, optimisticUpdateAllLessons, optimisticUpdateYearlyLessons, optimisticUpdateAllerleiLessons, reassignYearlyLessonLinks, updateYearlyLessonOrder, setAllLessons, setYearlyLessons, setAllerleiLessons, refetch, findAlternativeSlot, setActiveDragId]);

  return { sensors, handleDragStart, handleDragEnd };
};

export default useDragAndDrop;