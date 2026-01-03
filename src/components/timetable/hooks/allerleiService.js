import pb from '@/api/pb';
import { AllerleiLesson, YearlyLesson, Lesson } from '@/api/entities';
import { prepareAllerleiForPersist } from '@/components/timetable/allerlei/AllerleiUtils';
import { findFreeSlot } from '@/utils/slotUtils';

console.log('Debug: allerleiService.js loaded'); // Neu: Log zum Überprüfen, ob Datei geladen wird

export const allerleiService = {
  async integrate(selectedLessonIds, allLessons, currentWeek, currentPosition, yearlyLessons, onUpdateIntegratedData, currentLessonId) {
    console.log('Debug: integrate called with', { selectedLessonIds });
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

      const allYlIds = [allerlei.primary_yearly_lesson_id, ...(Array.isArray(allerlei.added_yearly_lesson_ids) ? allerlei.added_yearly_lesson_ids : [])].filter(Boolean);
      const examYlIds = allerlei.exam_yearly_lesson_ids || [];
      const halfClassYlIds = allerlei.half_class_yearly_lesson_ids || [];
      console.log('Debug: unlink start - Allerlei ID:', allerleiId, 'Primary YL ID:', allerlei.primary_yearly_lesson_id, 'Added YL IDs:', allerlei.added_yearly_lesson_ids, 'examYlIds:', examYlIds, 'halfClassYlIds:', halfClassYlIds);

      // Schritt 1: Alle YearlyLessons laden und Secondary-IDs von Doppellektionen identifizieren
      const yearlyLessonsMap = new Map();
      const secondaryIdsOfDoubleLessons = new Set();

      for (const ylId of allYlIds) {
        const yl = await YearlyLesson.findById(ylId);
        if (yl) {
          yearlyLessonsMap.set(ylId, yl);
          // Wenn diese YL eine Doppellektion ist, ihre Secondary-ID merken
          if (yl.is_double_lesson && yl.second_yearly_lesson_id) {
            secondaryIdsOfDoubleLessons.add(yl.second_yearly_lesson_id);
          }
        }
      }

      console.log('Debug: unlink - Secondary IDs of double lessons:', [...secondaryIdsOfDoubleLessons]);

      // Schritt 2: Alle YearlyLessons zurücksetzen (is_allerlei: false, Namen bereinigen)
      for (const [ylId, yearlyLesson] of yearlyLessonsMap) {
        const orig = originalData[ylId] || {};
        const origName = (yearlyLesson.name || '').replace(' (Allerlei)', '') || orig.original_name || `Lektion ${yearlyLesson.lesson_number || ''}`;
        const origNotes = (yearlyLesson.notes || '').replace(' (in Allerlei)', '') || orig.original_notes || '';
        const origSteps = orig.steps || yearlyLesson.steps || [];

        await YearlyLesson.update(ylId, {
          name: origName,
          notes: origNotes,
          steps: origSteps,
          is_allerlei: false
        });
      }

      // Schritt 3: Lektionen wiederherstellen - nur Primary-YLs (nicht die Secondary von Doppellektionen)
      const restoredLessons = [];
      let isFirstLesson = true;

      for (const ylId of allYlIds) {
        // Skip wenn diese YL die Secondary einer Doppellektion ist (wird mit Primary erstellt)
        if (secondaryIdsOfDoubleLessons.has(ylId)) {
          console.log(`Debug: Skipping YL ${ylId} - is secondary of a double lesson`);
          continue;
        }

        const yearlyLesson = yearlyLessonsMap.get(ylId);
        if (!yearlyLesson) {
          console.error(`Yearly lesson ${ylId} not found during unlink. Skipping.`);
          continue;
        }

        const orig = originalData[ylId] || {};
        const origSteps = orig.steps || yearlyLesson.steps || [];
        const isDoubleLesson = yearlyLesson.is_double_lesson || false;

        console.log('Debug: unlink processing YL:', {
          ylId,
          isFirstLesson,
          isDoubleLesson,
          secondYlId: yearlyLesson.second_yearly_lesson_id,
          subject: yearlyLesson.subject_name || yearlyLesson.expand?.subject?.name
        });

        // Prüfen ob es eine versteckte Lektion gibt, die unhidden werden kann
        const integratedLesson = allLessons.find(l =>
          l.yearly_lesson_id === ylId &&
          l.is_hidden &&
          l.week_number === currentWeek
        );

        if (integratedLesson) {
          // Versteckte Lektion wieder sichtbar machen
          const retryUpdate = async (id, retries = 3) => {
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
          await retryUpdate(integratedLesson.id);
          console.log('Debug: Unhid lesson:', integratedLesson.id);
          restoredLessons.push(integratedLesson);
        } else {
          // Neue Lektion erstellen
          let targetDay, targetPeriod;

          if (isFirstLesson) {
            // Erste Lektion: am Original-Slot der Allerlei platzieren
            targetDay = allerleiDay;
            targetPeriod = allerleiPeriod;
          } else {
            // Weitere Lektionen: freien Slot suchen (mit Doppellektion-Unterstützung)
            const freeSlot = (Array.isArray(timeSlots) && timeSlots.length > 0)
              ? findFreeSlot(
                  [...allLessons, ...restoredLessons], // Inkl. bereits wiederhergestellte
                  timeSlots,
                  currentWeek,
                  yearlyLesson.subject_name || yearlyLesson.expand?.subject?.name || yearlyLesson.subject,
                  1, // preferredPeriod
                  isDoubleLesson // Für Doppellektionen 2 aufeinanderfolgende Slots suchen
                )
              : null;

            if (!freeSlot) {
              console.log(`Debug: No free slot for YL ${ylId}${isDoubleLesson ? ' (double lesson)' : ''}; leaving in pool.`);
              continue;
            }
            targetDay = freeSlot.day;
            targetPeriod = freeSlot.period;
          }

          const timeSlot = timeSlots.find(ts => ts.period === targetPeriod) || { start: '07:25', end: '08:10' };
          const newLessonData = {
            day_of_week: targetDay,
            period_slot: targetPeriod,
            period_span: isDoubleLesson ? 2 : 1,
            start_time: timeSlot.start,
            end_time: timeSlot.end,
            week_number: currentWeek,
            yearly_lesson_id: ylId,
            subject: yearlyLesson.subject,
            user_id: pb.authStore.model.id,
            is_double_lesson: isDoubleLesson,
            second_yearly_lesson_id: yearlyLesson.second_yearly_lesson_id || null,
            is_exam: examYlIds.includes(ylId),
            is_half_class: halfClassYlIds.includes(ylId),
            is_hidden: false,
            topic_id: yearlyLesson.topic_id === 'no_topic' ? null : yearlyLesson.topic_id,
            description: '',
            steps: origSteps
          };

          console.log('Debug: unlink creating lesson:', newLessonData);

          try {
            const created = await Lesson.create(newLessonData);
            console.log(`Debug: Created lesson ${created.id} for YL ${ylId}${isDoubleLesson ? ' (double lesson)' : ''}`);
            restoredLessons.push(created);
          } catch (createError) {
            console.error('Error creating new lesson in unlink:', createError);
          }
        }

        isFirstLesson = false;
      }

      console.log('Debug: unlink - Restored lessons:', restoredLessons);
      await AllerleiLesson.delete(allerleiId);
      console.log(`Debug: Unlink completed for Allerlei ID ${allerleiId}. Restored lesson IDs:`, restoredLessons.map(l => l?.id).filter(Boolean));
      return restoredLessons.filter(Boolean);
    } catch (error) {
      console.error('Error in unlink:', error);
      throw error;
    }
  },

  async unlinkAndDelete(allerleiId, allLessons, currentWeek) {
    try {
      const allerlei = await AllerleiLesson.findById(allerleiId);
      if (!allerlei) {
        console.warn(`Allerlei lesson not found for ID ${allerleiId}. Skipping unlinkAndDelete.`);
        return;
      }

      // 1. Alle YearlyLesson-IDs sammeln
      const allYlIds = [
        allerlei.primary_yearly_lesson_id,
        ...(Array.isArray(allerlei.added_yearly_lesson_ids) ? allerlei.added_yearly_lesson_ids : [])
      ].filter(Boolean);

      console.log('Debug: unlinkAndDelete - Allerlei ID:', allerleiId, 'YL IDs:', allYlIds);

      // 2. YearlyLessons zurücksetzen (is_allerlei: false, Namen bereinigen)
      for (const ylId of allYlIds) {
        const yl = await YearlyLesson.findById(ylId);
        if (yl) {
          await YearlyLesson.update(ylId, {
            name: (yl.name || '').replace(' (Allerlei)', ''),
            notes: (yl.notes || '').replace(' (in Allerlei)', ''),
            is_allerlei: false
          });
        }
      }

      // 3. Alle versteckten Lektionen dieser YearlyLessons LÖSCHEN
      for (const ylId of allYlIds) {
        const hiddenLessons = allLessons.filter(l =>
          l.yearly_lesson_id === ylId &&
          l.is_hidden &&
          l.week_number === currentWeek
        );
        for (const lesson of hiddenLessons) {
          console.log('Debug: Deleting hidden lesson:', lesson.id);
          await Lesson.delete(lesson.id);
        }
      }

      // 4. AllerleiLesson löschen
      await AllerleiLesson.delete(allerleiId);
      console.log(`Debug: unlinkAndDelete completed for Allerlei ID ${allerleiId}`);
    } catch (error) {
      console.error('Error in unlinkAndDelete:', error);
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
  },

  restoreYearlyLessons: async (
    yearlyLessonIds,
    allLessons,
    timeSlots,
    currentWeek,
    day_of_week,
    period_slot,
    allerleiLesson = null  // Optional: für exam/half_class Info
  ) => {
    const restored = [];

    // Exam/HalfClass IDs aus der Allerlei-Lektion
    const examYlIds = allerleiLesson?.exam_yearly_lesson_ids || [];
    const halfClassYlIds = allerleiLesson?.half_class_yearly_lesson_ids || [];

    for (const ylId of yearlyLessonIds) {
      // Prüfen, ob schon eine sichtbare Lesson existiert
      const existing = allLessons.find(
        l => l.yearly_lesson_id === ylId && l.week_number === currentWeek && !l.is_hidden
      );

      if (existing) {
        restored.push(existing);
        continue;
      }

      // YearlyLesson holen, um das Fach und Doppellektions-Info zu bekommen
      const yearlyLesson = await YearlyLesson.findById(ylId);
      if (!yearlyLesson) {
        console.warn(`YearlyLesson ${ylId} nicht gefunden beim Wiederherstellen.`);
        continue;
      }

      const isDoubleLesson = yearlyLesson.is_double_lesson || false;
      const timeSlot = timeSlots.find(ts => ts.period === period_slot) || { start: '07:25', end: '08:10' };

      const newLesson = await Lesson.create({
        yearly_lesson_id: ylId,
        week_number: currentWeek,
        day_of_week,
        period_slot,
        period_span: isDoubleLesson ? 2 : 1,
        start_time: timeSlot.start,
        end_time: timeSlot.end,
        is_hidden: false,
        user_id: pb.authStore.model.id,
        subject: yearlyLesson.subject,
        // Doppellektions-Info aus YearlyLesson
        is_double_lesson: isDoubleLesson,
        second_yearly_lesson_id: yearlyLesson.second_yearly_lesson_id || null,
        // Exam/HalfClass aus Allerlei oder YearlyLesson
        is_exam: examYlIds.includes(ylId) || yearlyLesson.is_exam || false,
        is_half_class: halfClassYlIds.includes(ylId) || yearlyLesson.is_half_class || false,
        topic_id: yearlyLesson.topic_id || null,
      });

      restored.push(newLesson);
    }

    return restored;
  }
};