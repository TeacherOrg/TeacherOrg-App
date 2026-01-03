import { useCallback } from 'react';
import { Lesson, YearlyLesson } from '@/api/entities';
import { getWeekYear } from '@/utils/weekYearUtils';
import pb from '@/api/pb';
import { findFreeSlot } from '@/utils/slotUtils'; // Importiere die Funktion, falls nicht bereits vorhanden
const useLessonHandlers = (editingLesson, currentYear, allLessons, yearlyLessons, timeSlots, currentWeek, queryClientLocal, subjects, optimisticUpdateAllLessons, optimisticUpdateYearlyLessons, addAllerleiLesson, removeAllLesson, setAllLessons, setYearlyLessons, activeClassId, refetch, setIsModalOpen, setEditingLesson, setInitialSubjectForModal, setCopiedLesson) => { const reassignYearlyLessonLinks = useCallback(async (subjectName, currentLessons, yearlyLessonsParam = yearlyLessons) => {
    const dayOrder = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
    const lessonsForSubject = currentLessons
      .filter(l =>
        l.expand?.subject?.name === subjectName &&
        l.week_number === currentWeek &&
        (!l.is_allerlei || (l.is_allerlei === false && l.yearly_lesson_id))
      )
      .sort((a, b) => {
        const dayDiff = dayOrder[a.day_of_week] - dayOrder[b.day_of_week];
        return dayDiff !== 0 ? dayDiff : a.period_slot - b.period_slot;
      });
    const integratedYearlyIds = new Set();
    currentLessons
      .filter(l => l.is_allerlei && l.week_number === currentWeek)
      .forEach(l => l.allerlei_yearly_lesson_ids?.forEach(id => {
        if (id) integratedYearlyIds.add(id);
      }));
    const yearlyLessonsForSubject = yearlyLessonsParam
      .filter(yl => yl.expand?.subject?.name === subjectName && yl.week_number === currentWeek)
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
    const normalYearlies = yearlyLessonsForSubject
      .filter(yl => !yl.is_half_class && !integratedYearlyIds.has(yl.id))
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
    const halfYearlies = yearlyLessonsForSubject
      .filter(yl => yl.is_half_class && !integratedYearlyIds.has(yl.id))
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
    let normalIndex = 0;
    let halfIndex = 0;
    let currentHalfYl = null;
    let halfCount = 0;
    const updatePromises = [];
    const updatedLessonsMap = new Map(currentLessons.map(l => [l.id, l]));
    let i = 0;
    while (i < lessonsForSubject.length) {
      let lesson = lessonsForSubject[i];
      let yearlyLessonToLink = null;
      if (!lesson.is_half_class) {
        if (normalIndex < normalYearlies.length) {
          yearlyLessonToLink = normalYearlies[normalIndex++];
        }
      } else {
        if (halfCount === 0) {
          if (halfIndex < halfYearlies.length) {
            currentHalfYl = halfYearlies[halfIndex++];
          } else {
            currentHalfYl = null;
          }
        }
        if (currentHalfYl) {
          yearlyLessonToLink = currentHalfYl;
          halfCount = (halfCount + 1) % 2;
        }
      }
      if (yearlyLessonToLink) {
        const isDouble = yearlyLessonToLink.is_double_lesson && !lesson.is_half_class;
        const updateData = {
          yearly_lesson_id: yearlyLessonToLink.id,
          topic_id: yearlyLessonToLink.topic_id || null,
          is_double_lesson: isDouble,
          second_yearly_lesson_id: isDouble ? yearlyLessonToLink.second_yearly_lesson_id : null,
          is_exam: yearlyLessonToLink.is_exam,
          is_allerlei: yearlyLessonToLink.is_allerlei,
          is_half_class: yearlyLessonToLink.is_half_class, // Geändert: Kopiere is_half_class von YearlyLesson
          is_hidden: false,
        };
        if (lesson.yearly_lesson_id !== yearlyLessonToLink.id ||
            lesson.second_yearly_lesson_id !== updateData.second_yearly_lesson_id ||
            lesson.is_double_lesson !== updateData.is_double_lesson ||
            lesson.topic_id !== updateData.topic_id ||
            lesson.is_exam !== updateData.is_exam ||
            lesson.is_allerlei !== updateData.is_allerlei ||
            lesson.is_half_class !== updateData.is_half_class) {
          updatePromises.push(Lesson.update(lesson.id, updateData));
          const updatedLesson = { ...lesson, ...updateData };
          updatedLessonsMap.set(lesson.id, updatedLesson);
        }
        if (isDouble && yearlyLessonToLink.second_yearly_lesson_id) {
          if (i < lessonsForSubject.length - 1) {
            const nextLesson = lessonsForSubject[i + 1];
            if (nextLesson.day_of_week === lesson.day_of_week &&
                nextLesson.period_slot === lesson.period_slot + 1) {
              const secondYearly = yearlyLessonsParam.find(yl => yl.id === yearlyLessonToLink.second_yearly_lesson_id);
              if (secondYearly) {
                const updateDataNext = {
                  yearly_lesson_id: secondYearly.id,
                  topic_id: secondYearly.topic_id || null,
                  is_double_lesson: true,
                  second_yearly_lesson_id: yearlyLessonToLink.id,
                  is_exam: secondYearly.is_exam,
                  is_allerlei: secondYearly.is_allerlei,
                  is_half_class: secondYearly.is_half_class,
                  allerlei_subjects: secondYearly.allerlei_subjects || [],
                  is_hidden: false
                };
                updatePromises.push(Lesson.update(nextLesson.id, updateDataNext));
                const updatedNext = { ...nextLesson, ...updateDataNext };
                updatedLessonsMap.set(nextLesson.id, updatedNext);
                i++;
              } else {
                updatePromises.push(Lesson.update(lesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }));
                updatedLessonsMap.set(lesson.id, { ...lesson, is_double_lesson: false, second_yearly_lesson_id: null });
              }
            } else {
              updatePromises.push(Lesson.update(lesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }));
              updatedLessonsMap.set(lesson.id, { ...lesson, is_double_lesson: false, second_yearly_lesson_id: null });
            }
          } else {
            updatePromises.push(Lesson.update(lesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }));
            updatedLessonsMap.set(lesson.id, { ...lesson, is_double_lesson: false, second_yearly_lesson_id: null });
          }
        }
      } else {
        if (lesson.yearly_lesson_id !== null) {
          const updateData = {
            yearly_lesson_id: null,
            topic_id: null,
            is_double_lesson: false,
            second_yearly_lesson_id: null,
            is_exam: false,
            is_allerlei: false,
            is_half_class: false,
            allerlei_subjects: []
          };
          updatePromises.push(Lesson.update(lesson.id, updateData));
          const updatedLesson = { ...lesson, ...updateData };
          updatedLessonsMap.set(lesson.id, updatedLesson);
        }
      }
      i++;
    }
    for (const lesson of lessonsForSubject) {
      const mappedLesson = updatedLessonsMap.get(lesson.id);
      if (mappedLesson.is_double_lesson && mappedLesson.second_yearly_lesson_id) {
        const secondLesson = Array.from(updatedLessonsMap.values()).find(l =>
          l.yearly_lesson_id === mappedLesson.second_yearly_lesson_id &&
          l.day_of_week === mappedLesson.day_of_week &&
          l.period_slot === mappedLesson.period_slot + 1
        );
        if (!secondLesson) {
          updatePromises.push(Lesson.update(mappedLesson.id, { is_double_lesson: false, second_yearly_lesson_id: null }));
          updatedLessonsMap.set(mappedLesson.id, { ...mappedLesson, is_double_lesson: false, second_yearly_lesson_id: null });
        }
      }
    }
    const ylToCount = new Map();
    lessonsForSubject.forEach(l => {
      const mappedL = updatedLessonsMap.get(l.id);
      if (mappedL.yearly_lesson_id) {
        ylToCount.set(mappedL.yearly_lesson_id, (ylToCount.get(mappedL.yearly_lesson_id) || 0) + 1);
      }
    });
    for (const [ylId, count] of ylToCount) {
      const yl = yearlyLessonsParam.find(y => y.id === ylId);
      if (yl && yl.is_half_class && count !== 2) {
        await YearlyLesson.update(ylId, { is_half_class: false });
        optimisticUpdateYearlyLessons(ylId, { is_half_class: false });
        Array.from(updatedLessonsMap.values()).forEach(mappedL => {
          if (mappedL.yearly_lesson_id === ylId) {
            const updateData = { is_half_class: false };
            updatePromises.push(Lesson.update(mappedL.id, updateData));
            updatedLessonsMap.set(mappedL.id, { ...mappedL, ...updateData });
          }
        });
      }
    }
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    return Array.from(updatedLessonsMap.values());
  }, [currentWeek, yearlyLessons, optimisticUpdateYearlyLessons, refetch]);
 const updateYearlyLessonOrder = useCallback(async (subjectName, currentLessons, yearlyLessonsParam = yearlyLessons) => {
    const dayOrder = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
    const contributingEvents = [];
    currentLessons
      .filter(l => l.expand?.subject?.name === subjectName && !l.is_allerlei && l.week_number === currentWeek)
      .forEach(l => {
        contributingEvents.push({
          type: 'linked',
          dayOrder: dayOrder[l.day_of_week],
          period: l.period_slot,
          ylId: l.yearly_lesson_id,
          isDouble: l.is_double_lesson,
          secondYlId: l.second_yearly_lesson_id,
          isHalf: l.is_half_class
        });
      });
    currentLessons
      .filter(l => l.is_allerlei && l.week_number === currentWeek && l.allerlei_yearly_lesson_ids?.some(id => {
        const yl = yearlyLessonsParam.find(y => y.id === id);
        return yl && yl.expand?.subject?.name === subjectName;
      }))
      .forEach(l => {
        const ylIdForSubject = l.allerlei_yearly_lesson_ids.find(id => {
          const yl = yearlyLessonsParam.find(y => y.id === id);
          return yl && yl.expand?.subject?.name === subjectName;
        });
        if (ylIdForSubject) {
          contributingEvents.push({
            type: 'integrated',
            dayOrder: dayOrder[l.day_of_week],
            period: l.period_slot,
            ylId: ylIdForSubject
          });
        }
      });
    contributingEvents.sort((a, b) => {
      const dayDiff = a.dayOrder - b.dayOrder;
      return dayDiff !== 0 ? dayDiff : a.period - b.period;
    });
    const orderedScheduledYearlyIds = [];
    let i = 0;
    while (i < contributingEvents.length) {
      const event = contributingEvents[i];
      if (event.type === 'linked' && event.ylId && !orderedScheduledYearlyIds.includes(event.ylId)) {
        orderedScheduledYearlyIds.push(event.ylId);
        if (event.isDouble && event.secondYlId) {
          const nextEvent = contributingEvents[i + 1];
          if (nextEvent && nextEvent.ylId === event.secondYlId && nextEvent.dayOrder === event.dayOrder && nextEvent.period === event.period + 1) {
            orderedScheduledYearlyIds.push(event.secondYlId);
            i++;
          }
        }
      } else if (event.type === 'integrated' && event.ylId && !orderedScheduledYearlyIds.includes(event.ylId)) {
        orderedScheduledYearlyIds.push(event.ylId);
      }
      i++;
    }
    const allYearlyForSubject = yearlyLessonsParam
      .filter(yl => yl.expand?.subject?.name === subjectName && yl.week_number === currentWeek)
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
    const unlinkedYearly = allYearlyForSubject
      .filter(yl => !orderedScheduledYearlyIds.includes(yl.id))
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
    let lessonNum = 1;
    const yearlyToNewNum = new Map();
    orderedScheduledYearlyIds.forEach(ylId => {
      yearlyToNewNum.set(ylId, lessonNum);
      lessonNum++;
    });
    unlinkedYearly.forEach(yl => {
      yearlyToNewNum.set(yl.id, lessonNum);
      lessonNum++;
    });
    const updatePromises = [];
    const updatedYearlyLessons = [...yearlyLessonsParam];
    for (const [ylId, newNum] of yearlyToNewNum) {
      const ylIndex = updatedYearlyLessons.findIndex(y => y.id === ylId);
      const yl = updatedYearlyLessons[ylIndex];
      if (yl && Number(yl.lesson_number) !== newNum) {
        updatePromises.push(YearlyLesson.update(ylId, { lesson_number: newNum }));
        updatedYearlyLessons[ylIndex] = { ...yl, lesson_number: newNum };
      }
    }
    await Promise.all(updatePromises);
    return updatedYearlyLessons;
  }, [currentWeek, yearlyLessons, refetch]);
 const handleSaveLesson = useCallback(async (lessonData, toDeleteIds) => {
    if (!lessonData) {
      await refetch();
      return;
    }
    const originalLesson = editingLesson;
    let subjectsToReassign = new Set();
    if (!Array.isArray(toDeleteIds)) {
      toDeleteIds = toDeleteIds ? [toDeleteIds] : [];
    }
    try {
      let oldLesson = null;
      if (!lessonData.isNew) {
        oldLesson = allLessons.find(l => l.id === lessonData.id);
      }
      if (lessonData.collectionName === 'allerlei_lessons') {
        if (lessonData.isNew) {
          addAllerleiLesson(lessonData);
        } else {
          optimisticUpdateAllerleiLessons(lessonData.id, lessonData);
        }
        if (lessonData.allerlei_subjects) {
          lessonData.allerlei_subjects.forEach(sub => subjectsToReassign.add(sub));
        }
      } else {
        let primaryYearlyLesson = null;
        let secondYearlyLesson = null;
        if (lessonData.yearly_lesson_id) {
          primaryYearlyLesson = yearlyLessons.find(yl => yl.id === lessonData.yearly_lesson_id);
        }
        if (lessonData.is_double_lesson && lessonData.second_yearly_lesson_id) {
          secondYearlyLesson = yearlyLessons.find(yl => yl.id === lessonData.second_yearly_lesson_id);
        }
        if (lessonData.is_allerlei) {
          console.log('Saving Allerlei lesson:', {
            allerlei_subjects: lessonData.allerlei_subjects,
            allerlei_yearly_lesson_ids: lessonData.allerlei_yearly_lesson_ids,
            steps: lessonData.steps
          });
          lessonData.yearly_lesson_id = null;
          lessonData.second_yearly_lesson_id = null;
          lessonData.is_double_lesson = false;
        }
        if (lessonData.isNew) {
          const { isNew, steps, ...createDataWithoutSteps } = lessonData;
          if (lessonData.is_allerlei) {
            createDataWithoutSteps.steps = steps;
          }
          const subjectName = subjects.find(s => s.id === createDataWithoutSteps.subject)?.name;
          subjectsToReassign.add(subjectName);
          if (!createDataWithoutSteps.start_time || !createDataWithoutSteps.end_time) {
            const timeSlot = timeSlots.find(ts => ts.period === createDataWithoutSteps.period_slot);
            if (timeSlot) {
              createDataWithoutSteps.start_time = timeSlot.start;
              createDataWithoutSteps.end_time = timeSlot.end;
            }
          }
          createDataWithoutSteps.user_id = pb.authStore.model.id;

          createDataWithoutSteps.week_year = getWeekYear(currentWeek, currentYear);

          const newLesson = await Lesson.create(createDataWithoutSteps);
          if (!newLesson.yearly_lesson_id && !newLesson.is_allerlei && newLesson.subject) {
            const existingYearlyForSub = yearlyLessons
              .filter(yl => yl.subject === newLesson.subject && yl.week_number === newLesson.week_number)
              .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
            const nextLessonNumber = existingYearlyForSub.length > 0
              ? Math.max(...existingYearlyForSub.map(yl => Number(yl.lesson_number))) + 1
              : 1;
            const newYearlyLesson = await YearlyLesson.create({
              subject: newLesson.subject,
              week_number: newLesson.week_number,
              lesson_number: nextLessonNumber,
              school_year: currentYear,
              name: lessonData.name || `Lektion ${nextLessonNumber} für ${subjects.find(s => s.id === newLesson.subject)?.name || 'Unbekannt'}`,
              steps: lessonData.steps?.filter(s => !s.id?.startsWith('second-')) || [],
              topic_id: newLesson.topic_id || null,
              is_double_lesson: newLesson.is_double_lesson || false,
              second_yearly_lesson_id: newLesson.second_yearly_lesson_id || null,
              is_exam: newLesson.is_exam || false,
              is_half_class: newLesson.is_half_class || false,
              user_id: pb.authStore.model.id,
              class_id: activeClassId
            });
            await Lesson.update(newLesson.id, { yearly_lesson_id: newYearlyLesson.id });
            newLesson.yearly_lesson_id = newYearlyLesson.id;
            optimisticUpdateYearlyLessons(newYearlyLesson, true);
          }
          optimisticUpdateAllLessons(newLesson, true);
          if (newLesson.yearly_lesson_id && !newLesson.is_allerlei) {
            const yearlyLessonToUpdate = yearlyLessons.find(yl => yl.id === newLesson.yearly_lesson_id);
            if (yearlyLessonToUpdate) {
              const yearlyUpdateData = {
                steps: lessonData.steps?.filter(s => !s.id?.startsWith('second-')) || [],
                topic_id: newLesson.topic_id || null,
                is_double_lesson: newLesson.is_double_lesson || false,
                second_yearly_lesson_id: newLesson.second_yearly_lesson_id || null,
                is_exam: newLesson.is_exam || false,
                is_allerlei: newLesson.is_allerlei || false,
                is_half_class: newLesson.is_half_class || false,
                name: lessonData.name || yearlyLessonToUpdate.name || `Lektion ${yearlyLessonToUpdate.lesson_number}`
              };
              await YearlyLesson.update(yearlyLessonToUpdate.id, yearlyUpdateData);
              optimisticUpdateYearlyLessons(yearlyLessonToUpdate.id, yearlyUpdateData);
            }
          }
          if (lessonData.is_half_class && lessonData.isNew) {
            const nextPeriod = lessonData.period_slot + 1;
            if (nextPeriod <= timeSlots.length && !allLessons.some(l => l.day_of_week === lessonData.day_of_week && l.period_slot === nextPeriod && l.week_number === currentWeek)) {
              const copyData = { ...lessonData, period_slot: nextPeriod, id: null, yearly_lesson_id: newLesson.yearly_lesson_id, week_year: getWeekYear(currentWeek, currentYear) };
              const copyLesson = await Lesson.create(copyData);
              optimisticUpdateAllLessons(copyLesson, true);
            }
          } else if (!lessonData.is_half_class && originalLesson?.is_half_class) {
            const nextPeriod = originalLesson.period_slot + 1;
            const copyLesson = allLessons.find(l => l.day_of_week === originalLesson.day_of_week && l.period_slot === nextPeriod && l.week_number === currentWeek && l.yearly_lesson_id === originalLesson.yearly_lesson_id);
            if (copyLesson) {
              await Lesson.delete(copyLesson.id);
              removeAllLesson(copyLesson.id);
            }
          }
        } else {
          const { id, steps, ...updateDataWithoutSteps } = lessonData;
          if (lessonData.is_allerlei) {
            updateDataWithoutSteps.steps = steps;
          }
          if (oldLesson?.subject) {
            const oldSubjectName = subjects.find(s => s.id === oldLesson.subject)?.name;
            subjectsToReassign.add(oldSubjectName);
          }
          if (updateDataWithoutSteps.subject) {
            const updateSubjectName = subjects.find(s => s.id === updateDataWithoutSteps.subject)?.name;
            subjectsToReassign.add(updateSubjectName);
          }
          if (oldLesson && oldLesson.is_allerlei && !lessonData.is_allerlei) {
            const originalYearlyLessonId = oldLesson.allerlei_yearly_lesson_ids?.[0] || oldLesson.yearly_lesson_id;
            if (originalYearlyLessonId) {
              updateDataWithoutSteps.yearly_lesson_id = originalYearlyLessonId;
              const originalYearlyLesson = yearlyLessons.find(yl => yl.id === originalYearlyLessonId);
              if (originalYearlyLesson) {
                await YearlyLesson.update(originalYearlyLessonId, {
                  name: lessonData.name || originalYearlyLesson.name || `Lektion ${originalYearlyLesson.lesson_number}`,
                  steps: steps?.filter(s => !s.id?.startsWith('second-')) || [],
                  topic_id: lessonData.topic_id || null,
                  is_double_lesson: lessonData.is_double_lesson || false,
                  second_yearly_lesson_id: lessonData.second_yearly_lesson_id || null,
                  is_exam: lessonData.is_exam || false,
                  is_allerlei: false,
                  is_half_class: lessonData.is_half_class || false
                });
              }
            }
            const oldSubs = oldLesson.allerlei_subjects || [];
            oldSubs.forEach(sub => subjectsToReassign.add(sub));
          } else if (oldLesson && !oldLesson.is_allerlei && lessonData.is_allerlei) {
            const oldSubjectName = subjects.find(s => s.id === oldLesson.subject)?.name;
            subjectsToReassign.add(oldSubjectName);
          }
          // Skip Lesson.update for Allerlei that was already saved directly
          if (lessonData.collectionName !== 'allerlei_lessons') {
            await Lesson.update(id, updateDataWithoutSteps);
            const updatedLesson = { ...oldLesson, ...updateDataWithoutSteps };
            optimisticUpdateAllLessons(updatedLesson);
            if (updatedLesson.yearly_lesson_id && !updatedLesson.is_allerlei) {
              const yearlyLessonToUpdate = yearlyLessons.find(yl => yl.id === updatedLesson.yearly_lesson_id);
              if (yearlyLessonToUpdate) {
                const yearlyUpdateData = {
                  steps: steps?.filter(s => !s.id?.startsWith('second-')) || [],
                  topic_id: updatedLesson.topic_id || null,
                  is_double_lesson: updatedLesson.is_double_lesson || false,
                  second_yearly_lesson_id: updatedLesson.second_yearly_lesson_id || null,
                  is_exam: updatedLesson.is_exam || false,
                  is_half_class: updatedLesson.is_half_class || false,
                  name: lessonData.name || yearlyLessonToUpdate.name || `Lektion ${yearlyLessonToUpdate.lesson_number}`
                };
                await YearlyLesson.update(yearlyLessonToUpdate.id, yearlyUpdateData);
                optimisticUpdateYearlyLessons(yearlyLessonToUpdate.id, yearlyUpdateData);
              }
            }
          }
        }
        const wasDoubleLesson = oldLesson ? oldLesson.is_double_lesson : false;
        const isDoubleLesson = lessonData.is_double_lesson;
        if (isDoubleLesson && lessonData.yearly_lesson_id && lessonData.second_yearly_lesson_id) {
          const primaryYL = yearlyLessons.find(yl => yl.id === lessonData.yearly_lesson_id);
          const secondYL = yearlyLessons.find(yl => yl.id === lessonData.second_yearly_lesson_id);
          if (primaryYL && secondYL) {
            const allSteps = lessonData.steps || [];
            const pSteps = allSteps.filter(s => !s.id?.startsWith('second-'));
            const sSteps = allSteps.filter(s => s.id?.startsWith('second-')).map(s => ({ ...s, id: s.id.replace('second-', '') }));
            const primaryUpdate = {
              steps: pSteps,
              notes: lessonData.notes || primaryYL.notes || '',
              is_double_lesson: true,
              second_yearly_lesson_id: secondYL.id,
              name: lessonData.name || primaryYL.name || `Lektion ${primaryYL.lesson_number}`
            };
            await YearlyLesson.update(primaryYL.id, primaryUpdate);
            await YearlyLesson.update(secondYL.id, {
              steps: sSteps,
              is_double_lesson: true,
              name: lessonData.second_name || secondYL.name || `Lektion ${Number(primaryYL.lesson_number) + 1}`
            });
            optimisticUpdateYearlyLessons(primaryYL.id, primaryUpdate);
            optimisticUpdateYearlyLessons(secondYL.id, {
              steps: sSteps,
              is_double_lesson: true,
              name: lessonData.second_name || secondYL.name || `Lektion ${Number(primaryYL.lesson_number) + 1}`
            });
          }
        } else if (!isDoubleLesson && wasDoubleLesson && oldLesson?.yearly_lesson_id) {
          const primaryYearlyLessonToRevert = yearlyLessons.find(yl => yl.id === oldLesson.yearly_lesson_id);
          if (primaryYearlyLessonToRevert) {
            await YearlyLesson.update(primaryYearlyLessonToRevert.id, {
              is_double_lesson: false,
              second_yearly_lesson_id: null,
            });
            const oldSecondId = oldLesson.second_yearly_lesson_id;
            if (oldSecondId) {
              await YearlyLesson.update(oldSecondId, { is_double_lesson: false });
            }
            optimisticUpdateYearlyLessons(primaryYearlyLessonToRevert.id, { is_double_lesson: false, second_yearly_lesson_id: null });
            if (oldSecondId) {
              optimisticUpdateYearlyLessons(oldSecondId, { is_double_lesson: false });
            }
          }
        }
      }
      for (const deleteId of toDeleteIds) {
        const lessonToDelete = allLessons.find(l => l.id === deleteId);
        if (lessonToDelete) {
          if (lessonToDelete.subject) {
            const deleteSubjectName = subjects.find(s => s.id === lessonToDelete.subject)?.name;
            if (deleteSubjectName) {
              subjectsToReassign.add(deleteSubjectName);
            } else {
              console.warn('Subject name not found for ID:', lessonToDelete.subject);
            }
          }
          if (lessonToDelete.is_allerlei && lessonToDelete.allerlei_subjects) {
            lessonToDelete.allerlei_subjects.forEach(sub => subjectsToReassign.add(sub));
          }
          try {
            await Lesson.delete(deleteId);
            removeAllLesson(deleteId);
          } catch (deleteError) {
            if (deleteError.response && deleteError.response.status === 404) {
              console.warn(`Lesson with ID ${deleteId} not found on server during delete attempt, likely already deleted. Removing from local state.`);
            } else {
              console.error(`Error deleting lesson ${deleteId}:`, deleteError);
              throw deleteError;
            }
            removeAllLesson(deleteId);
          }
        } else {
          console.warn(`Lesson with ID ${deleteId} not found in current state for deletion during save operation.`);
        }
      }
      const refreshedYearly = await YearlyLesson.list();
      if (!refreshedYearly) {
        console.error('Failed to fetch refreshed yearly lessons');
        throw new Error('Failed to fetch yearly lessons');
      }
      setYearlyLessons(refreshedYearly.map(l => ({ ...l, lesson_number: Number(l.lesson_number) })));
      let finalLessons = allLessons;
      for (const sub of subjectsToReassign) {
        if (sub) {
          finalLessons = await reassignYearlyLessonLinks(sub, finalLessons);
        }
      }
      setAllLessons(JSON.parse(JSON.stringify(finalLessons)));
      await refetch();
      queryClientLocal.invalidateQueries({ queryKey: ['timetableData'] });
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
      setIsModalOpen(false);
      setEditingLesson(null);
      setInitialSubjectForModal(null);
      setCopiedLesson(null);
      queryClientLocal.invalidateQueries({ queryKey: ['timetableData'] });
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
    } catch (error) {
      setYearlyLessons(yearlyLessons);
      setAllLessons(allLessons);
      console.error("Error saving lesson:", error);
      queryClientLocal.invalidateQueries({ queryKey: ['timetableData'] });
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
    }
    }, [editingLesson, currentYear, allLessons, yearlyLessons, timeSlots, currentWeek, queryClientLocal, subjects, optimisticUpdateAllLessons, optimisticUpdateYearlyLessons, addAllerleiLesson, removeAllLesson, setAllLessons, setYearlyLessons, activeClassId, refetch, setIsModalOpen]); const handleDeleteLesson = useCallback(async (lessonId) => {
    const lessonToDelete = allLessons.find(l => l.id === lessonId);
    if (!lessonToDelete) return;
    let subjectsToReassign = new Set();
    const subjectName = subjects.find(s => s.id === lessonToDelete.subject)?.name;
    if (subjectName) subjectsToReassign.add(subjectName);
    if (lessonToDelete.is_allerlei && lessonToDelete.allerlei_subjects) {
      lessonToDelete.allerlei_subjects.forEach(sub => subjectsToReassign.add(sub));
    }
    try {
      if (lessonToDelete.collectionName === 'allerlei_lessons') {
        // Bei Allerleilektionen: unlinkAndDelete löscht alles (versteckte Lektionen + AllerleiLesson)
        await allerleiService.unlinkAndDelete(lessonToDelete.id, allLessons, currentWeek);
        removeAllLesson(lessonId);
        // Auch die versteckten Lektionen aus dem State entfernen
        const allerleiYlIds = [
          lessonToDelete.primary_yearly_lesson_id,
          ...(lessonToDelete.added_yearly_lesson_ids || [])
        ].filter(Boolean);
        let finalLessons = allLessons.filter(l => {
          // AllerleiLesson selbst entfernen
          if (l.id === lessonId) return false;
          // Versteckte Lektionen der Allerlei entfernen
          if (l.is_hidden && l.week_number === currentWeek && allerleiYlIds.includes(l.yearly_lesson_id)) return false;
          return true;
        });
        for (const sub of subjectsToReassign) {
          if (sub) {
            finalLessons = await reassignYearlyLessonLinks(sub, finalLessons);
          }
        }
        setAllLessons(finalLessons);
        await refetch();
        queryClientLocal.invalidateQueries({ queryKey: ['timetableData'] });
        queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
        return; // Früh zurückkehren - alles erledigt
      }
      await Lesson.delete(lessonId);
      removeAllLesson(lessonId);
      let finalLessons = allLessons.filter(l => l.id !== lessonId);
      for (const sub of subjectsToReassign) {
        if (sub) {
          finalLessons = await reassignYearlyLessonLinks(sub, finalLessons);
        }
      }
      setAllLessons(finalLessons);
      await refetch();
      queryClientLocal.invalidateQueries({ queryKey: ['timetableData'] });
      queryClientLocal.invalidateQueries(['yearlyData', currentYear]);
    } catch (error) {
      console.error('Error deleting lesson:', error);
      queryClientLocal.invalidateQueries({ queryKey: ['timetableData'] });
    }
  }, [allLessons, subjects, currentYear, currentWeek, queryClientLocal, removeAllLesson, setAllLessons, refetch, reassignYearlyLessonLinks]);

  const handleCreateFromPool = useCallback(async (subject, day, period) => {
    // Finde die verfügbaren YearlyLessons für das Subject
    const integratedYearlyIds = new Set();
    allLessons
      .filter(l => l.is_allerlei && l.week_number === currentWeek)
      .forEach(l => l.allerlei_yearly_lesson_ids?.forEach(id => integratedYearlyIds.add(id)));

    const available = yearlyLessons
      .filter(yl => 
        yl.expand?.subject?.name === subject.name && 
        yl.week_number === currentWeek && 
        !allLessons.some(l => l.yearly_lesson_id === yl.id || l.second_yearly_lesson_id === yl.id) && 
        !integratedYearlyIds.has(yl.id) && 
        !yl.is_allerlei
      )
      .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));

    if (available.length === 0) {
      console.warn(`No available YearlyLessons for subject ${subject.name} in week ${currentWeek}`);
      toast.error(`Keine verfügbaren Lektionen für ${subject.name} in Woche ${currentWeek}`);
      return;
    }

    const yl = available[0];

    const timeSlot = timeSlots.find(ts => ts.period === period);
    if (!timeSlot) {
      console.error(`No time slot found for period ${period}`);
      toast.error(`Kein Zeitfenster für Periode ${period} gefunden`);
      return;
    }

    const createData = {
      subject: subject.id,
      day_of_week: day,
      period_slot: period,
      week_number: currentWeek,
      week_year: getWeekYear(currentWeek, currentYear),
      start_time: timeSlot.start,
      end_time: timeSlot.end,
      yearly_lesson_id: yl.id,
      topic_id: yl.topic_id || null,
      is_double_lesson: yl.is_double_lesson,
      second_yearly_lesson_id: yl.second_yearly_lesson_id || null,
      is_exam: yl.is_exam,
      is_allerlei: yl.is_allerlei,
      is_half_class: yl.is_half_class,
      is_hidden: false,
      user_id: pb.authStore.model.id,
      class_id: activeClassId,
    };

    const newLesson = await Lesson.create(createData);
    optimisticUpdateAllLessons(newLesson, true);

    let tempLessons = [...allLessons, newLesson];

    // Handle double lesson if applicable
    if (yl.is_double_lesson && yl.second_yearly_lesson_id) {
      const nextPeriod = period + 1;
      if (nextPeriod <= timeSlots.length && !tempLessons.some(l => l.day_of_week === day && l.period_slot === nextPeriod && l.week_number === currentWeek)) {
        const secondYl = yearlyLessons.find(y => y.id === yl.second_yearly_lesson_id);
        if (secondYl) {
          const nextTimeSlot = timeSlots.find(ts => ts.period === nextPeriod);
          const createDataNext = {
            ...createData,
            yearly_lesson_id: secondYl.id,
            topic_id: secondYl.topic_id || null,
            is_double_lesson: true,
            second_yearly_lesson_id: yl.id,
            is_exam: secondYl.is_exam,
            is_allerlei: secondYl.is_allerlei,
            is_half_class: secondYl.is_half_class,
            period_slot: nextPeriod,
            start_time: nextTimeSlot.start,
            end_time: nextTimeSlot.end,
          };
          const newNext = await Lesson.create(createDataNext);
          optimisticUpdateAllLessons(newNext, true);
          tempLessons.push(newNext);
        }
      }
    }

    const updatedLessons = await reassignYearlyLessonLinks(subject.name, tempLessons);
    setAllLessons(updatedLessons);

    const updatedYearly = await updateYearlyLessonOrder(subject.name, updatedLessons);
    setYearlyLessons(updatedYearly);

    await refetch();
  }, [yearlyLessons, allLessons, timeSlots, currentWeek, subjects, optimisticUpdateAllLessons, reassignYearlyLessonLinks, updateYearlyLessonOrder, setAllLessons, setYearlyLessons, refetch, activeClassId]);

 return { handleSaveLesson, handleDeleteLesson, reassignYearlyLessonLinks, updateYearlyLessonOrder, handleCreateFromPool };
};
export default useLessonHandlers;