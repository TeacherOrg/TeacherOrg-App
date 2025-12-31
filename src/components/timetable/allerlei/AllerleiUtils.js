// src/components/timetable/allerlei/AllerleiUtils.js

import { createMixedSubjectGradient } from '@/utils/colorUtils';

/**
 * Bereitet Allerlei-Daten für das Speichern vor (entfernt alte Flags)
 */
export const prepareAllerleiForPersist = (data) => {
  if (!data.is_allerlei) return data; // Nur bereinigen, wenn es KEINE Allerlei ist

  const prepared = { ...data };
  // delete prepared.is_allerlei;         // auskommentieren oder entfernen
  // delete prepared.allerlei_subjects;   // auskommentieren
  // delete prepared.subject_name;        // bleibt 'Allerlei'
  delete prepared.allerlei_yearly_lesson_ids;
  delete prepared.original_topic_id;
  delete prepared.integratedOriginalData;

  prepared.added_yearly_lesson_ids = (prepared.added_yearly_lesson_ids || []).filter(Boolean);
  prepared.steps = prepared.steps || [];

  return prepared;
};

/**
 * Hilfsfunktion: Holt den Subject-Namen aus einer YearlyLesson
 */
const getSubjectName = (yl, subjects) => {
  // 1. Direkter expand (wie bei deinem Setup)
  if (yl.expand?.expand?.subject?.name) return yl.expand.expand.subject.name;
  if (yl.expand?.subject?.expand?.name) return yl.expand.subject.expand.name;
  if (yl.expand?.subject?.name) return yl.expand.subject.name;
  if (yl.subject_name) return yl.subject_name;

  // 2. Fallback über subjects-Array
  const subjectId = yl.subject || yl.expand?.subject || yl.expand?.expand?.subject?.id;
  const subj = subjects.find(s => s.id === subjectId);
  return subj?.name || 'Unbekannt';
};

/**
 * Normalisiert eine Allerlei-Lektion OHNE zusätzlichen API-Call
 * Nutzt nur die Daten, die bereits im Store sind (raw + expand aus create)
 */
export const normalizeAllerleiData = (item, subjects) => {
  // Wenn wir allerlei_subjects haben → wir sind fertig
  if (Array.isArray(item.allerlei_subjects) && item.allerlei_subjects.length > 0) {
    const colors = item.allerlei_subjects
      .map(name => subjects.find(s => s.name === name)?.color)
      .filter(Boolean);

    return {
      ...item, // Alles behalten: IDs, expand, alles
      color: colors.length > 0 ? createMixedSubjectGradient(colors) : '#94a3b8',
      isGradient: colors.length > 1,
      subject_name: 'Allerlei',
      description: `Allerlei: ${item.allerlei_subjects.join(' + ')}`,
      allerlei_subjects: item.allerlei_subjects,
      period_span: item.period_span || (Array.isArray(item.added_yearly_lesson_ids) ? item.added_yearly_lesson_ids.length + 1 : 1),
      // Computed: is_exam wenn mindestens eine enthaltene Lektion eine Prüfung ist
      is_exam: Array.isArray(item.exam_yearly_lesson_ids) && item.exam_yearly_lesson_ids.length > 0,
      is_half_class: Array.isArray(item.half_class_yearly_lesson_ids) && item.half_class_yearly_lesson_ids.length > 0,
    };
  }

  // Fallback nur für sehr alte Daten ohne allerlei_subjects
  // (kann langfristig entfernt werden)
  const colors = ['#94a3b8'];
  return {
    ...item,
    color: '#94a3b8',
    isGradient: false,
    subject_name: 'Allerlei',
    description: 'Allerlei (alte Version)',
    allerlei_subjects: [],
    period_span: 1,
    is_exam: Array.isArray(item.exam_yearly_lesson_ids) && item.exam_yearly_lesson_ids.length > 0,
    is_half_class: Array.isArray(item.half_class_yearly_lesson_ids) && item.half_class_yearly_lesson_ids.length > 0,
  };
};

/**
 * Für Merge-Vorschau im Grid – super kurz & sweet
 */
export const calculateAllerleiGradient = (lessonArrayOrSubjectNames, subjects) => {
  let colors = [];

  if (Array.isArray(lessonArrayOrSubjectNames[0])) {
    // Fall 1: Array von Lessons (wie in mergePreview)
    colors = lessonArrayOrSubjectNames
      .map(l => l.color || subjects.find(s => s.name === l.subject_name)?.color)
      .filter(Boolean);
  } else {
    // Fall 2: Array von Subject-Namen (string)
    colors = lessonArrayOrSubjectNames
      .map(name => subjects.find(s => s.name === name)?.color)
      .filter(Boolean);
  }

  return createMixedSubjectGradient(colors.length > 0 ? colors : ['#94a3b8']);
};