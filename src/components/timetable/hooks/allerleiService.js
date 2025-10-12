import pb from '@/api/pb';
import { AllerleiLesson, YearlyLesson, Lesson } from '@/api/entities';
import { prepareAllerleiForPersist } from '@/components/timetable/allerlei/AllerleiUtils';
import { findFreeSlot } from '@/utils/slotUtils';

export const allerleiService = {
  async integrate(selectedLessonIds, allLessons, currentWeek, currentPosition, yearlyLessons, onUpdateIntegratedData, currentLessonId) {
    const integrationPromises = selectedLessonIds.map(async (ylId, index) => {
      if (!ylId) return;
      const scheduledLessons = allLessons.filter(l =>
        l.yearly_lesson_id === ylId &&
        l.week_number === currentWeek &&
        l.id !== currentLessonId
      );
      for (const scheduledLesson of scheduledLessons) {
        await Lesson.update(scheduledLesson.id, { is_hidden: true });
        const yearlyLesson = yearlyLessons.find(yl => yl.id === ylId);
        if (yearlyLesson) {
          const originalData = {
            original_name: yearlyLesson.name || `Lektion ${yearlyLesson.lesson_number}`,
            original_notes: yearlyLesson.notes || '',
            original_topic_id: yearlyLesson.topic_id || 'no_topic',
            steps: yearlyLesson.steps || []
          };
          onUpdateIntegratedData(prev => ({
            ...prev,
            [ylId]: originalData
          }));
          await YearlyLesson.update(ylId, {
            name: index === 0 ? (yearlyLesson.name || `Lektion ${yearlyLesson.lesson_number}`) : `${yearlyLesson.name || `Lektion ${yearlyLesson.lesson_number}`} (Allerlei)`,
            notes: `${yearlyLesson.notes || ''} (in Allerlei)`,
            is_allerlei: true
          });
        }
      }
    });
    await Promise.all(integrationPromises);
  },

  async unlink(allerleiId, allLessons, timeSlots, currentWeek, originalData = {}, allerleiDay, allerleiPeriod) {
    try {
      const allerlei = await AllerleiLesson.findById(allerleiId);
      if (!allerlei) {
        console.warn(`Allerlei lesson not found for ID ${allerleiId}. Skipping unlink.`);
        return;
      }

      const allYlIds = [allerlei.primary_yearly_lesson_id, ...allerlei.added_yearly_lesson_ids].filter(Boolean);
      console.log('Debug: unlink start - Allerlei ID:', allerleiId, 'Primary YL ID:', allerlei.primary_yearly_lesson_id, 'Added YL IDs:', allerlei.added_yearly_lesson_ids);
      const unhidePromises = allYlIds.map(async (ylId, index) => {
        if (!ylId) return;
        const yearlyLesson = await YearlyLesson.findById(ylId);
        if (!yearlyLesson) {
          console.warn(`Yearly lesson ${ylId} not found during unlink.`);
          return;
        }

        const orig = originalData[ylId] || {};
        const origName = (yearlyLesson.name || '').replace(' (Allerlei)', '') || orig.original_name || `Lektion ${yearlyLesson.lesson_number || ''}`;
        const origNotes = (yearlyLesson.notes || '').replace(' (in Allerlei)', '') || orig.original_notes || '';
        const origSteps = orig.steps || yearlyLesson.steps || [];

        console.log('Debug: unlink processing YL:', {
          ylId,
          isPrimary: index === 0,
          origName,
          origNotes,
          origSteps,
          subject: yearlyLesson.subject_name || yearlyLesson.expand?.subject?.name
        });

        await YearlyLesson.update(ylId, {
          name: origName,
          notes: origNotes,
          steps: origSteps,
          is_allerlei: false
        });

        const integratedLesson = allLessons.find(l => l.yearly_lesson_id === ylId && l.is_hidden && l.week_number === currentWeek);
        if (index === 0) {
          // Restore primary lesson at original position
          let targetDay = integratedLesson?.day_of_week || allerleiDay;
          let targetPeriod = integratedLesson?.period_slot || allerleiPeriod;

          if (integratedLesson) {
            const retryUpdate = async (id, data, retries = 3) => {
              for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                  console.log(`Debug: Unhiding lesson ${id} (attempt ${attempt})`);
                  return await Lesson.update(id, { is_hidden: false });
                } catch (error) {
                  if (error.message?.includes('autocancelled') && attempt < retries) {
                    console.warn(`Autocancelled update for ${id} (attempt ${attempt}), retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 150));
                  } else {
                    throw error;
                  }
                }
              }
            };
            await retryUpdate(integratedLesson.id, { is_hidden: false });
            console.log('Debug: Unhid lesson:', integratedLesson.id);
            return integratedLesson;
          }

          const timeSlot = timeSlots.find(ts => ts.period === targetPeriod) || { start: '07:25', end: '08:10' };
          const newLessonData = {
            day_of_week: targetDay,
            period_slot: targetPeriod,
            start_time: timeSlot.start,
            end_time: timeSlot.end,
            week_number: currentWeek,
            yearly_lesson_id: ylId,
            subject: yearlyLesson.subject,
            user_id: pb.authStore.model.id,
            is_double_lesson: false,
            is_exam: false,
            is_half_class: false,
            is_hidden: false,
            topic_id: yearlyLesson.topic_id === 'no_topic' ? null : yearlyLesson.topic_id,
            description: '',
            steps: origSteps
          };
          console.log('Debug: unlink newLessonData payload for primary:', newLessonData);
          try {
            const created = await Lesson.create(newLessonData);
            const verified = await Lesson.findById(created.id);
            if (!verified) {
              console.warn(`Created lesson ${created.id} not verifiable.`);
            } else {
              console.log(`Debug: Verified created lesson ${created.id} in unlink.`);
            }
            return created;
          } catch (createError) {
            console.error('Error creating new lesson in unlink:', createError);
          }
        } else {
          // Hide secondary lesson instead of placing it
          if (integratedLesson) {
            console.log(`Debug: Keeping secondary lesson ${integratedLesson.id} hidden.`);
            return integratedLesson;
          }
          console.log(`Debug: No visible slot for secondary YL ${ylId}; keeping hidden.`);
          return null; // Secondary lesson remains in pool
        }
      });

      const restoredLessons = await Promise.all(unhidePromises);
      console.log('Debug: unlink - Restored lessons:', restoredLessons.filter(Boolean));
      await AllerleiLesson.delete(allerleiId);
      console.log(`Debug: Unlink completed for Allerlei ID ${allerleiId}. Restored lesson IDs:`, allYlIds.filter((_, index) => index === 0 || restoredLessons[index]));
      return restoredLessons.filter(Boolean);
    } catch (error) {
      console.error('Error in unlink:', error);
      throw error;
    }
  },

  async convertToAllerlei(lessonId, data) {
    const prepared = prepareAllerleiForPersist(data);
    const newAllerlei = await AllerleiLesson.create(prepared);
    return newAllerlei;
  },

  validateAllerlei(data) {
    if (!data.primary_yearly_lesson_id) {
      throw new Error('Bitte wählen Sie eine primäre Lektion für eine Allerleilektion aus.');
    }
    const allIds = [data.primary_yearly_lesson_id, ...data.added_yearly_lesson_ids];
    const uniqueIds = new Set(allIds);
    if (uniqueIds.size !== allIds.length) {
      throw new Error('Keine doppelten Lektionen in Allerleilektion erlaubt.');
    }
    // Optional: Existenz prüfen (async, wenn nötig)
    return true;
  }
};