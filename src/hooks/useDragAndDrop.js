import { useCallback } from 'react';
import { PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Lesson } from "@/api/entities";
import { toast } from 'react-hot-toast';
import pb from '@/api/pb'; // Add this import

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

  const handleDragStart = useCallback((event) => {
    setActiveDragId(event.active.id);
    console.log('Debug: Drag started with ID:', event.active.id);
  }, [setActiveDragId]);

  const findAlternativeSlot = useCallback((lessons, targetDay, startPeriod, timeSlots, currentWeek) => {
    console.log('Debug: findAlternativeSlot called with:', { targetDay, startPeriod, currentWeek });
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
    console.warn('No alternative slot found for:', { targetDay, startPeriod });
    return null;
  }, [timeSlots.length]);

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      console.log('Debug: Drag ended without a valid drop target or same ID:', { activeId: active.id, overId: over?.id });
      setActiveDragId(null);
      return;
    }

    const [targetDay, targetPeriodStr] = over.id.split('-');
    const targetPeriod = parseInt(targetPeriodStr, 10);

    console.log('Debug: handleDragEnd called with:', { activeId: active.id, overId: over.id, targetDay, targetPeriod });

    if (active.id.startsWith('pool-')) {
      // Handle drag from pool: Create new lesson
      const subjectId = active.id.replace('pool-', '');
      const subject = subjects.find(s => s.id === subjectId);
      if (!subject) {
        console.error('Subject not found for pool item:', subjectId);
        toast.error('Fach nicht gefunden.');
        setActiveDragId(null);
        return;
      }

      // Find next available yearly lesson for this subject in the current week
      const availableYearly = yearlyLessons
        .filter(yl => {
          const matchesSubject = yl.subject === subject.id || yl.expand?.subject?.id === subject.id;
          const matchesWeek = yl.week_number === currentWeek;
          const lessonCount = allLessons.filter(l => 
            l.yearly_lesson_id === yl.id && 
            l.week_number === currentWeek && 
            !l.is_hidden
          ).length;
          console.log('Debug: Checking YearlyLesson availability:', { 
            ylId: yl.id, 
            subject: yl.expand?.subject?.name || yl.subject_name, 
            week_number: yl.week_number, 
            lessonCount, 
            is_half_class: yl.is_half_class 
          });
          return matchesSubject && matchesWeek && lessonCount < (yl.is_half_class ? 2 : 1);
        })
        .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number))[0];

      if (!availableYearly) {
        console.warn('No available yearly lesson for subject:', subject.name);
        toast.error(`Keine verfügbaren Lektionen für ${subject.name} in Woche ${currentWeek}`);
        setActiveDragId(null);
        return;
      }

      console.log('Debug: Selected YearlyLesson:', {
        id: availableYearly.id,
        subject: subject.name,
        week_number: availableYearly.week_number,
        lesson_number: availableYearly.lesson_number,
        is_half_class: availableYearly.is_half_class
      });

      const isOccupied = lessonsForCurrentWeek.some(l => 
        l.day_of_week === targetDay && 
        l.period_slot === targetPeriod && 
        l.week_number === currentWeek
      );

      let finalTarget = { day: targetDay, period: targetPeriod };
      if (isOccupied) {
        const alternative = findAlternativeSlot(lessonsForCurrentWeek, targetDay, targetPeriod, timeSlots, currentWeek);
        if (!alternative) {
          console.warn('No alternative slot found for:', { targetDay, targetPeriod });
          toast.error('Kein alternativer Slot verfügbar.');
          setActiveDragId(null);
          return;
        }
        finalTarget = alternative;
        console.log('Debug: Using alternative slot:', finalTarget);
      }

      // Handle double lesson if applicable
      const isDoubleLesson = availableYearly.is_double_lesson;
      if (isDoubleLesson) {
        const secondPeriod = finalTarget.period + 1;
        const isSecondOccupied = lessonsForCurrentWeek.some(l => 
          l.day_of_week === finalTarget.day && 
          l.period_slot === secondPeriod && 
          l.week_number === currentWeek
        );
        if (isSecondOccupied || secondPeriod > timeSlots.length) {
          console.warn('Cannot place double lesson: second slot occupied or out of bounds:', { day: finalTarget.day, secondPeriod });
          toast.error('Kein Platz für Doppellektion: Zweiter Slot belegt oder außerhalb der Zeitfenster.');
          setActiveDragId(null);
          return;
        }
      }

      // Create new lesson data
      const timeSlot = timeSlots.find(ts => ts.period === finalTarget.period);
      if (!timeSlot) {
        console.error('No time slot found for period:', finalTarget.period);
        toast.error(`Kein Zeitfenster für Periode ${finalTarget.period} gefunden.`);
        setActiveDragId(null);
        return;
      }

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
        start_time: timeSlot.start || '08:00',
        end_time: timeSlot.end || '08:45',
        user_id: pb.authStore.model.id, // Use authenticated user ID
        class_id: activeClassId,
      };

      console.log('Debug: Creating new lesson with data:', newLessonData);

      try {
        const newLesson = await Lesson.create(newLessonData);
        optimisticUpdateAllLessons(newLesson, true); // true indicates addition
        console.log('Debug: Created lesson:', newLesson);

        if (isDoubleLesson && availableYearly.second_yearly_lesson_id) {
          const secondYearly = yearlyLessons.find(yl => yl.id === availableYearly.second_yearly_lesson_id);
          if (secondYearly) {
            const secondTimeSlot = timeSlots.find(ts => ts.period === finalTarget.period + 1);
            if (!secondTimeSlot) {
              console.error('No time slot for second period of double lesson:', finalTarget.period + 1);
              toast.error('Kein Zeitfenster für zweite Periode der Doppellektion.');
              throw new Error('No time slot for second period');
            }
            const secondLessonData = {
              ...newLessonData,
              period_slot: finalTarget.period + 1,
              yearly_lesson_id: secondYearly.id,
              second_yearly_lesson_id: availableYearly.id,
              topic_id: secondYearly.topic_id || null,
              is_exam: secondYearly.is_exam || false,
              is_half_class: secondYearly.is_half_class || false,
              start_time: secondTimeSlot.start || '08:45',
              end_time: secondTimeSlot.end || '09:30',
            };
            console.log('Debug: Creating second lesson for double lesson:', secondLessonData);
            const secondLesson = await Lesson.create(secondLessonData);
            optimisticUpdateAllLessons(secondLesson, true);
            console.log('Debug: Created second lesson:', secondLesson);
          }
        }

        // Reassign and update order for the affected subject
        const affectedSubjectName = subject.name;
        console.log('Debug: Reassigning lessons for subject:', affectedSubjectName);
        let updatedLessons = await reassignYearlyLessonLinks(affectedSubjectName, [...allLessons, newLesson]);
        console.log('Debug: Updated lessons after reassignment:', updatedLessons);
        const updatedYearly = await updateYearlyLessonOrder(affectedSubjectName, updatedLessons);
        console.log('Debug: Updated yearly lessons order:', updatedYearly);
        setAllLessons(updatedLessons);
        setYearlyLessons(updatedYearly);

        await refetch();
        queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
      } catch (error) {
        console.error('Error creating lesson from pool:', error);
        toast.error('Fehler beim Erstellen der Lektion: ' + (error.message || 'Unbekannter Fehler'));
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
      console.warn('Dragged lesson not found:', active.id);
      toast.error('Ziehbare Lektion nicht gefunden.');
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
        console.warn('No alternative slot found for moving lesson:', draggedLesson.id);
        toast.error('Kein alternativer Slot verfügbar zum Verschieben der Lektion.');
        setActiveDragId(null);
        return;
      }
      finalTarget = alternative;
      console.log('Debug: Using alternative slot for moved lesson:', finalTarget);
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
        console.warn('Cannot move double lesson: second slot occupied or out of bounds:', { day: finalTarget.day, secondPeriod });
        toast.error('Kein Platz für Doppellektion: Zweiter Slot belegt oder außerhalb der Zeitfenster.');
        setActiveDragId(null);
        return;
      }
    }

    const updateData = {
      day_of_week: finalTarget.day,
      period_slot: finalTarget.period,
    };

    console.log('Debug: Updating lesson:', { lessonId: draggedLesson.id, updateData });

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
          console.log('Debug: Updating second lesson for double lesson:', { lessonId: secondLesson.id, secondUpdate });
          optimisticUpdateAllLessons(secondLesson.id, secondUpdate);
          await Lesson.update(secondLesson.id, secondUpdate);
        }
      }

      await Lesson.update(draggedLesson.id, updateData);

      const affectedSubject = subjects.find(s => s.id === draggedLesson.subject)?.name;
      if (affectedSubject) {
        console.log('Debug: Reassigning lessons for subject:', affectedSubject);
        let updatedLessons = await reassignYearlyLessonLinks(affectedSubject, allLessons);
        console.log('Debug: Updated lessons after reassignment:', updatedLessons);
        const updatedYearly = await updateYearlyLessonOrder(affectedSubject, updatedLessons);
        console.log('Debug: Updated yearly lessons order:', updatedYearly);
        setAllLessons(updatedLessons);
        setYearlyLessons(updatedYearly);
      }

      await refetch();
      queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
    } catch (error) {
      console.error('Error updating lesson:', error);
      toast.error('Fehler beim Verschieben der Lektion: ' + (error.message || 'Unbekannter Fehler'));
      setAllLessons(allLessons);
      setYearlyLessons(yearlyLessons);
    } finally {
      setActiveDragId(null);
    }
  }, [lessonsForCurrentWeek, allLessons, allerleiLessons, currentWeek, yearlyLessons, timeSlots, currentYear, queryClientLocal, subjects, activeClassId, optimisticUpdateAllLessons, optimisticUpdateYearlyLessons, optimisticUpdateAllerleiLessons, reassignYearlyLessonLinks, updateYearlyLessonOrder, setAllLessons, setYearlyLessons, setAllerleiLessons, refetch, findAlternativeSlot, setActiveDragId]);

  return { sensors, handleDragStart, handleDragEnd };
};

export default useDragAndDrop;