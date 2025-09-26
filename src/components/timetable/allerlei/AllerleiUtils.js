import { findFreeSlot } from '@/utils/slotUtils';
import { Lesson, YearlyLesson } from '@/api/entities';
import { adjustColor } from '@/utils/colorUtils';
import pb from '@/api/pb';

export const prepareAllerleiForPersist = (data, isAllerlei) => {
  if (!isAllerlei) return data;
  
  const prepared = { ...data };
  prepared.allerlei_subjects = (prepared.allerlei_subjects || []).filter(Boolean);
  prepared.allerlei_yearly_lesson_ids = (prepared.allerlei_yearly_lesson_ids || []).filter(id => id);
  
  // Merge Steps aus allerleiSteps in prepared.steps
  if (prepared.allerleiSteps) {
    prepared.steps = Object.values(prepared.allerleiSteps).flat();
    delete prepared.allerleiSteps;
  }
  
  // Entferne temporäre Felder
  delete prepared.original_topic_id;
  delete prepared.integratedOriginalData;
  
  return prepared;
};

export const normalizeAllerleiData = (item, subjects) => {
  if (!item.is_allerlei) return item;
  
  const normalized = { ...item };
  normalized.allerlei_subjects = normalized.allerlei_subjects || [];
  
  // Berechne Gradient-Color (aus LessonCard extrahiert)
  const colors = normalized.allerlei_subjects
    .map(name => subjects.find(s => s.name === name)?.color)
    .filter(Boolean);
    
  if (colors.length > 1) {
    const uniqueColors = [...new Set(colors)];
    const gradientStops = uniqueColors
      .map((color, index, arr) => `${color} ${((index) / (arr.length - 1)) * 100}%`)
      .join(', ');
    normalized.color = `linear-gradient(135deg, ${gradientStops})`;
    normalized.isGradient = true;
  }
  
  // Normalize display name
  if (normalized.allerlei_subjects.length > 0) {
    normalized.description = `Allerlei: ${normalized.allerlei_subjects.join(', ')}`;
  }
  
  return normalized;
};

export const validateAllerlei = (data) => {
  if (!data.is_allerlei) return true;
  
  if (!data.allerlei_subjects || data.allerlei_subjects.filter(Boolean).length < 1) {  // Geändert: <1 statt <2
    throw new Error('Bitte wählen Sie mindestens ein Fach für eine Allerleilektion aus.');
  }
  
  if (!data.allerlei_yearly_lesson_ids || 
      data.allerlei_yearly_lesson_ids.length !== data.allerlei_subjects.length ||
      data.allerlei_yearly_lesson_ids.some(id => !id)) {
    throw new Error('Alle ausgewählten Fächer müssen eine gültige Lektion zugewiesen haben.');
  }
  
  // Check for duplicate yearly lessons
  const uniqueIds = new Set(data.allerlei_yearly_lesson_ids);
  if (uniqueIds.size !== data.allerlei_yearly_lesson_ids.length) {
    throw new Error('Keine doppelten Lektionen in Allerleilektion erlaubt.');
  }
  
  return true;
};

export const handleAllerleiUnlink = async (originalIntegratedIds, allLessons, timeSlots, currentWeek, integratedOriginalData = {}) => {
  const primaryId = originalIntegratedIds[0]; // Assume first is primary
  const unhidePromises = originalIntegratedIds.map(async (ylId) => {
    if (!ylId) return;
    
    const integratedLesson = allLessons.find(l => l.yearly_lesson_id === ylId && l.is_hidden);
    if (!integratedLesson) return;
    
    if (ylId === primaryId) {
      // Delete hidden primary to avoid duplicate
      await Lesson.delete(integratedLesson.id);
      return;
    }
    
    const freeSlot = findFreeSlot(allLessons, 'monday', timeSlots, currentWeek);
    if (!freeSlot) return;
    
    await Lesson.update(integratedLesson.id, {
      is_hidden: false,
      day_of_week: freeSlot.day,
      period_slot: freeSlot.period
    });
    
    const originalData = integratedOriginalData[ylId];
    if (originalData) {
      await YearlyLesson.update(ylId, {
        notes: originalData.original_notes,
        name: originalData.original_name
      });
    }
  });
  
  await Promise.all(unhidePromises);
};

export const handleAllerleiIntegration = async (selectedLessonIds, allLessons, currentWeek, currentPosition, yearlyLessons, onUpdateIntegratedData, currentLessonId) => {
  const integrationPromises = selectedLessonIds.map(async (ylId) => {
    if (!ylId) return;

    const scheduledLessons = allLessons.filter(l =>
      l.yearly_lesson_id === ylId &&
      l.week_number === currentWeek &&
      l.id !== currentLessonId  // Skip current lesson
    );

    for (const scheduledLesson of scheduledLessons) {
      await Lesson.update(scheduledLesson.id, { is_hidden: true });

      const yearlyLesson = yearlyLessons.find(yl => yl.id === ylId);
      if (yearlyLesson) {
        const originalData = {
          original_notes: yearlyLesson.notes,
          original_name: yearlyLesson.name
        };

        onUpdateIntegratedData(prev => ({
          ...prev,
          [ylId]: originalData
        }));

        await YearlyLesson.update(ylId, {
          notes: `${yearlyLesson.notes || ''} (in Allerlei)`,
          name: `${yearlyLesson.name || ''} (Allerlei)`
        });
      }
    }
  });

  await Promise.all(integrationPromises);
};

export const calculateAllerleiGradient = (subjects, allSubjects) => {
  // Enhanced gradient calculation for multiple subjects
  const colors = subjects
    .map(name => allSubjects.find(s => s.name === name)?.color)
    .filter(Boolean);
    
  if (colors.length === 0) return '#3b82f6';
  if (colors.length === 1) return colors[0];
  
  // Create complex gradient for multiple colors
  const uniqueColors = [...new Set(colors)];
  const gradientParts = uniqueColors.map((color, index) => {
    const angle = (index * 360) / uniqueColors.length;
    const x = 50 + Math.cos(angle * Math.PI / 180) * 30;
    const y = 50 + Math.sin(angle * Math.PI / 180) * 30;
    return `radial-gradient(circle at ${x}% ${y}%, ${color} 0%, ${adjustColor(color, -20)} 40%, transparent 70%)`;
  });
  
  const baseGradient = `linear-gradient(45deg, ${uniqueColors[0]}40, ${uniqueColors[uniqueColors.length - 1]}40)`;
  return [baseGradient, ...gradientParts].join(', ');
};