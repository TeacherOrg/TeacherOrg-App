import { Lesson, YearlyLesson, AllerleiLesson } from '@/api/entities';
import pb from '@/api/pb';

export const prepareAllerleiForPersist = (data) => {
  // Entferne alte Flags, da nun separate Collection
  const prepared = { ...data };
  delete prepared.is_allerlei;
  delete prepared.allerlei_subjects;
  delete prepared.allerlei_yearly_lesson_ids;
  prepared.added_yearly_lesson_ids = (prepared.added_yearly_lesson_ids || []).filter(id => id);
  prepared.steps = prepared.steps || [];
  delete prepared.original_topic_id;
  delete prepared.integratedOriginalData;
  return prepared;
};

export const normalizeAllerleiData = async (item, subjects, selectedSubject) => {
  const normalized = { ...item };
  normalized.is_allerlei = true;
  const allYlIds = [normalized.primary_yearly_lesson_id, ...(normalized.added_yearly_lesson_ids || [])].filter(Boolean);
  
  // Neu: Validierung für primäre Lektion
  if (!normalized.primary_yearly_lesson_id) {
    throw new Error('Missing primary_yearly_lesson_id in Allerlei normalization.');
  }

  console.log('Debug normalizeAllerleiData inputs:', {
    allYlIds,
    itemExpand: item.expand,
    subjects: subjects.map(s => ({ id: s.id, name: s.name, color: s.color })),
    selectedSubject
  });

  let subjectNames = [];
  let yearlyLessons = [];
  try {
    if (item.expand && item.expand.primary_yearly_lesson_id) {
      yearlyLessons = [item.expand.primary_yearly_lesson_id];
      if (item.expand.added_yearly_lesson_ids) {
        yearlyLessons.push(...item.expand.added_yearly_lesson_ids.filter(Boolean));
      }
    } else {
      console.warn('No expand data, fetching yearly lessons directly');
      const fetched = await Promise.all(
        allYlIds.map(id => YearlyLesson.findById(id, { expand: 'subject' }))
      );
      yearlyLessons = fetched.filter(yl => yl !== null);
    }

    // Always include primary even if fetch fails
    const primaryYl = yearlyLessons.find(yl => yl.id === normalized.primary_yearly_lesson_id) || { subject: selectedSubject || 'Unbekannt' };
    const primaryName = primaryYl.expand?.subject?.name || primaryYl.subject_name || subjects.find(s => s.id === primaryYl.subject)?.name || 'Unbekannt';
    if (primaryName !== 'Unbekannt') subjectNames.push(primaryName);

    subjectNames.push(...yearlyLessons.map(yl => yl.expand?.subject?.name || yl.subject_name || subjects.find(s => s.id === yl.subject)?.name || 'Unbekannt').filter(n => n !== 'Unbekannt' && n !== primaryName));
    subjectNames = [...new Set(subjectNames.filter(Boolean))]; // Neu: Duplikate entfernen (sicherheitshalber)

    item.description = `Allerlei: ${subjectNames.join(', ')}`;  // Fix Beschriftung

    console.log('Debug subjectNames:', subjectNames);
  } catch (error) {
    console.error('Error in subjectNames calculation:', error, { item });
    // Fallback to selectedSubject for primary
    if (selectedSubject) {
      const primaryName = subjects.find(s => s.id === selectedSubject)?.name || 'Unbekannt';
      subjectNames.push(primaryName);
    }
  }

  let colors = [];
  try {
    colors = subjectNames
      .map(name => subjects.find(s => s.name === name)?.color)
      .filter(Boolean);

    colors = [...new Set(colors)]; // Neu: Duplikate in Farben entfernen

    if (colors.length === 0 && allYlIds.length > 0 && subjects.length > 0) {
      console.warn('No colors from names, trying ID-based lookup');
      const fetchedColors = await Promise.all(
        allYlIds.map(async id => {
          const yl = yearlyLessons.find(yl => yl.id === id) || await YearlyLesson.findById(id, { expand: 'subject' });
          return yl ? subjects.find(s => s.id === yl.subject)?.color : null;
        })
      );
      colors = fetchedColors.filter(Boolean);
    }
  } catch (error) {
    console.error('Error calculating colors:', error);
  }
  console.log('Debug colors calc:', { subjectNames, colors, fallbackUsed: colors.length > 0 && subjectNames.length === 0 });

  if (colors.length === 1) {
    normalized.color = colors[0];
    normalized.isGradient = false;
  } else if (colors.length > 1) {
    const stops = colors.map((color, index) => `${color} ${Math.round((index / (colors.length - 1)) * 100)}%`);
    normalized.color = `linear-gradient(135deg, ${stops.join(', ')})`;
    normalized.isGradient = true;
  } else {
    normalized.color = '#3b82f6'; // Global fallback
    normalized.isGradient = false;
  }
  normalized.description = `Allerlei: ${subjectNames.join(', ')}`;
  normalized.subject_name = 'Allerlei';
  normalized.allerlei_subjects = subjectNames;
  console.log("Debug: normalizeAllerleiData", {
    lessonId: item.id,
    colors,
    color: normalized.color,
    isGradient: normalized.isGradient,
    subjectNames
  });
  return normalized;
};

export const calculateAllerleiGradient = (subjects, allSubjects) => {
  // Enhanced gradient calculation for multiple subjects
  const uniqueSubjects = [...new Set(subjects)];  // Entferne Duplikate
  const colors = uniqueSubjects
    .map(sub => typeof sub === 'string' ? allSubjects.find(s => s.name === sub)?.color : allSubjects.find(s => s.id === sub)?.color)
    .filter(Boolean);
 
  if (colors.length === 0) return '#3b82f6';
  if (colors.length === 1) return colors[0];
 
  // Verbessert: Multi-stop linear gradient mit smoother Übergängen (z.B. 0%, 50%, 100% für 2 Farben)
  const stops = colors.map((color, index) => `${color} ${Math.round((index / (colors.length - 1)) * 100)}%`);
  return `linear-gradient(135deg, ${stops.join(', ')})`;
};