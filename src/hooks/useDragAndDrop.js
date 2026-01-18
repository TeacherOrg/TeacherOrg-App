import { useCallback } from 'react';
import { PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Lesson } from "@/api/entities";
import { getWeekYear } from '@/utils/weekYearUtils';
import { toast } from 'react-hot-toast';
import pb from '@/api/pb';
import { emitTourEvent, TOUR_EVENTS } from '@/components/onboarding/tours/tourEvents';

// Touch-Detection für plattform-spezifisches Verhalten
const isTouchDevice = typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const useDragAndDrop = (lessonsForCurrentWeek, allLessons, allerleiLessons, currentWeek, yearlyLessons, timeSlots, currentYear, queryClientLocal, subjects, activeClassId, optimisticUpdateAllLessons, optimisticUpdateYearlyLessons, optimisticUpdateAllerleiLessons, reassignYearlyLessonLinks, updateYearlyLessonOrder, setAllLessons, setYearlyLessons, setAllerleiLessons, refetch, setActiveDragId) => {
  // Touch: Long-Press (300ms) für Drag
  // Desktop: Sofortiger Start (Ctrl-Check erfolgt in handleDragStart)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isTouchDevice
        ? { delay: 300, tolerance: 5 }   // Touch: Long-press
        : { delay: 0, tolerance: 0 },    // Desktop: Sofort (Ctrl-Check im Handler)
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event) => {
    const { activatorEvent } = event;

    // Alt-Key: Merge-Selection (bestehend) → Drag abbrechen
    if (activatorEvent?.altKey) {
      return;
    }

    // Desktop (non-touch): Ctrl erforderlich für Drag
    if (!isTouchDevice && !activatorEvent?.ctrlKey) {
      return;
    }

    // Drag starten
    setActiveDragId(event.active.id);
  }, [setActiveDragId]);

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
    console.warn('No alternative slot found for:', { targetDay, startPeriod });
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
        console.error('Subject not found for pool item:', subjectId);
        toast.error('Fach nicht gefunden.');
        setActiveDragId(null);
        return;
      }

      // Find next available yearly lesson for this subject in the current week
      const availableYearly = yearlyLessons
        .filter(yl => {
          // 1. Subject match
          const matchesSubject = yl.subject === subject.id || yl.expand?.subject?.id === subject.id;
          // 2. Week match
          const matchesWeek = yl.week_number === currentWeek;
          // 3. Nicht bereits als normale Lektion geplant
          const lessonCount = allLessons.filter(l => 
            (l.yearly_lesson_id === yl.id || l.second_yearly_lesson_id === yl.id) && 
            l.week_number === currentWeek && 
            !l.is_hidden &&
            l.collectionName !== 'allerlei_lessons' // ← Nur normale!
          ).length;
          // 4. Nicht bereits in Allerlei enthalten
          const isPlannedInAllerlei = allerleiLessons.some(al => 
            al.week_number === currentWeek &&
            (al.primary_yearly_lesson_id === yl.id || 
             (Array.isArray(al.added_yearly_lesson_ids) && al.added_yearly_lesson_ids.includes(yl.id)))
          );
          // 5. Nicht selbst eine Allerlei-YearlyLesson
          const isNotAllerlei = !yl.is_allerlei;
          // Neu: Slave in normaler Lektion
          const isPlannedAsSlave = allLessons.some(l => 
            l.second_yearly_lesson_id === yl.id && 
            l.week_number === currentWeek && 
            !l.is_hidden
          );

          return matchesSubject && 
                 matchesWeek && 
                 lessonCount < (yl.is_half_class ? 2 : 1) && 
                 !isPlannedInAllerlei && 
                 !isPlannedAsSlave && 
                 isNotAllerlei;
        })
        .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number))[0]; // Die früheste verfügbare

      if (!availableYearly) {
        console.warn('No available yearly lesson for subject:', subject.name);
        toast.error(`Keine verfügbare Lektion für ${subject.name} in Woche ${currentWeek}. (Bereits in Allerlei oder geplant)`);
        setActiveDragId(null);
        return;
      }

      // Korrekte Master/Slave-Zuordnung
      let masterYL = availableYearly;
      let slaveYL = null;

      // Check if this is part of a double lesson (either as master or slave)
      // WICHTIG: Prüfe ALLE drei Bedingungen, nicht nur is_double_lesson!
      const isPartOfDoubleLesson = availableYearly.is_double_lesson ||
                                    availableYearly.second_yearly_lesson_id ||
                                    yearlyLessons.some(yl => yl.second_yearly_lesson_id === availableYearly.id);

      if (isPartOfDoubleLesson) {
        // Fall 1: availableYearly hat second_yearly_lesson_id
        if (availableYearly.second_yearly_lesson_id) {
          slaveYL = yearlyLessons.find(yl => yl.id === availableYearly.second_yearly_lesson_id);

          // Wenn Slave gefunden wurde und eine niedrigere lesson_number hat: tauschen
          if (slaveYL && Number(slaveYL.lesson_number) < Number(availableYearly.lesson_number)) {
            // Die niedrigere lesson_number ist immer Master
            [masterYL, slaveYL] = [slaveYL, availableYearly];
          }
        }
        // Fall 2: Eine andere YearlyLesson referenziert availableYearly als Slave
        else {
          const potentialMaster = yearlyLessons.find(yl =>
            yl.second_yearly_lesson_id === availableYearly.id &&
            yl.subject === availableYearly.subject &&
            yl.week_number === availableYearly.week_number
          );

          if (potentialMaster && Number(potentialMaster.lesson_number) < Number(availableYearly.lesson_number)) {
            masterYL = potentialMaster;
            slaveYL = availableYearly;
          }
        }
      }

      const isDoubleLesson = !!slaveYL;

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
      }

      // Handle double lesson if applicable
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
        week_year: getWeekYear(currentWeek, currentYear),
        school_year: currentYear,
        yearly_lesson_id: masterYL.id,
        topic_id: masterYL.topic_id || null,
        is_double_lesson: isDoubleLesson,
        second_yearly_lesson_id: isDoubleLesson ? slaveYL.id : null,
        is_exam: masterYL.is_exam || false,
        is_half_class: masterYL.is_half_class || false,
        is_allerlei: false,
        period_span: isDoubleLesson ? 2 : 1,  // NEU: explizit setzen!
        start_time: timeSlot.start || '08:00',
        end_time: timeSlot.end || '08:45',
        user_id: pb.authStore.model.id, // Use authenticated user ID
        class_id: activeClassId,
      };

      try {
        const newLesson = await Lesson.create(newLessonData);
        optimisticUpdateAllLessons(newLesson, true); // true indicates addition

        // NEU – Nur Master anlegen, Slave nur verlinken
        if (isDoubleLesson && slaveYL) {
          // Suche, ob die zweite YearlyLesson schon irgendwo geplant ist
          const existingSlave = allLessons.find(l => 
            l.yearly_lesson_id === slaveYL.id &&
            l.week_number === currentWeek
          );

          if (existingSlave) {
            // Verlinke sie als Slave der neuen Master-Lesson
            await Lesson.update(existingSlave.id, {
              double_master_id: newLesson.id,
              period_slot: finalTarget.period + 1,
              day_of_week: finalTarget.day,
              period_span: 1,  // explizit
            });
            optimisticUpdateAllLessons(existingSlave.id, {
              double_master_id: newLesson.id,
              period_slot: finalTarget.period + 1,
              day_of_week: finalTarget.day,
              period_span: 1,  // explizit
            });
          } else {
            // Slave-Lesson erstellen falls nicht vorhanden
            const secondTimeSlot = timeSlots.find(ts => ts.period === finalTarget.period + 1);
            const slaveData = {
              subject: subject.id,
              day_of_week: finalTarget.day,
              period_slot: finalTarget.period + 1,
              week_number: currentWeek,
              week_year: getWeekYear(currentWeek, currentYear),
              school_year: currentYear,
              yearly_lesson_id: slaveYL.id,
              topic_id: slaveYL.topic_id || null,
              is_double_lesson: true,
              second_yearly_lesson_id: masterYL.id,
              double_master_id: newLesson.id,
              start_time: secondTimeSlot?.start || '08:45',
              end_time: secondTimeSlot?.end || '09:30',
              period_span: 1,
              is_exam: slaveYL.is_exam || false,
              is_half_class: slaveYL.is_half_class || false,
              is_hidden: false,
              user_id: pb.authStore.model.id,
              class_id: activeClassId,
            };
            const newSlave = await Lesson.create(slaveData);
            optimisticUpdateAllLessons(newSlave, true);
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

        // Emit tour event for successful drop with day info
        emitTourEvent(TOUR_EVENTS.DOUBLE_LESSON_PLACED, { day: finalTarget.day });
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
    }

    const isDoubleLesson = !!draggedLesson.second_yearly_lesson_id;
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
      period_span: draggedLesson.is_double_lesson ? 2 : draggedLesson.period_span || 1,
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
            period_span: 1,  // explizit
          };
          optimisticUpdateAllLessons(secondLesson.id, secondUpdate);
          await Lesson.update(secondLesson.id, secondUpdate);
        }
      }
      // In handleDragEnd, wenn is_double_lesson:
      if (draggedLesson.is_double_lesson && !draggedLesson.double_master_id) {
        // Das ist der Master → Slave mitverschieben
        const slave = allLessons.find(l => l.double_master_id === draggedLesson.id);
        if (slave) {
          await Lesson.update(slave.id, {
            day_of_week: finalTarget.day,
            period_slot: finalTarget.period + 1,
            period_span: 1,  // explizit
          });
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