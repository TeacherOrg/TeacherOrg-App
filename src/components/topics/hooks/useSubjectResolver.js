// src/components/topics/hooks/useSubjectResolver.js
import { useMemo } from 'react';

/**
 * Hook zur zuverlässigen Auflösung des Subject-Objekts für ein Topic.
 *
 * Problem: entities.js normalizeData() löscht die expand-Property,
 * wodurch topic.expand.subject verloren geht. Topics haben nur noch
 * topic.subject als ID-String.
 *
 * Dieser Hook löst das Problem durch multiple Fallback-Strategien:
 * 1. Direkte subject Prop (höchste Priorität)
 * 2. Suche in der subjects-Liste anhand der Topic.subject ID
 * 3. Fallback auf expand.subject (falls noch vorhanden)
 *
 * @param {Object} subjectProp - Direkt übergebenes Subject-Objekt
 * @param {Object} topic - Das Topic-Objekt (kann subject als ID-String haben)
 * @param {Array} subjects - Vollständige Liste aller Subjects
 * @returns {Object} - { effectiveSubject, isValid, subjectId }
 */
export function useSubjectResolver(subjectProp, topic, subjects = []) {
  const result = useMemo(() => {
    // Priority 1: Direkte Prop mit vollständigem Objekt
    if (subjectProp?.id && subjectProp?.name) {
      return {
        effectiveSubject: subjectProp,
        isValid: true,
        subjectId: subjectProp.id,
        source: 'prop'
      };
    }

    // Priority 2: Aus subjects-Array finden anhand der Topic.subject ID
    if (topic?.subject && subjects.length > 0) {
      // topic.subject kann entweder ein String (ID) oder ein Objekt sein
      const subjectId = typeof topic.subject === 'string'
        ? topic.subject
        : topic.subject?.id;

      if (subjectId) {
        const found = subjects.find(s => s.id === subjectId);
        if (found) {
          return {
            effectiveSubject: found,
            isValid: true,
            subjectId: found.id,
            source: 'subjects_array'
          };
        }
      }
    }

    // Priority 3: Fallback auf expand.subject (falls noch vorhanden)
    if (topic?.expand?.subject?.id && topic?.expand?.subject?.name) {
      return {
        effectiveSubject: topic.expand.subject,
        isValid: true,
        subjectId: topic.expand.subject.id,
        source: 'expand'
      };
    }

    // Priority 4: Partial subject prop (nur ID vorhanden)
    if (subjectProp?.id) {
      // Subject hat ID aber keinen Namen - in subjects-Liste suchen
      const found = subjects.find(s => s.id === subjectProp.id);
      if (found) {
        return {
          effectiveSubject: found,
          isValid: true,
          subjectId: found.id,
          source: 'prop_id_lookup'
        };
      }
    }

    // Keine gültige Auflösung möglich
    const partialId = subjectProp?.id ||
      (typeof topic?.subject === 'string' ? topic.subject : topic?.subject?.id) ||
      null;

    return {
      effectiveSubject: null,
      isValid: false,
      subjectId: partialId,
      source: 'none'
    };
  }, [subjectProp, topic, subjects]);

  return result;
}

/**
 * Hilfsfunktion zum Extrahieren der Subject-ID aus verschiedenen Formaten
 * @param {Object|string} subject - Subject als Objekt oder ID-String
 * @returns {string|null} - Die Subject-ID oder null
 */
export function extractSubjectId(subject) {
  if (!subject) return null;
  if (typeof subject === 'string') return subject;
  if (subject.id) return subject.id;
  return null;
}

/**
 * Hilfsfunktion zum Prüfen ob ein Subject vollständig ist
 * @param {Object} subject - Subject-Objekt
 * @returns {boolean} - true wenn Subject id und name hat
 */
export function isValidSubject(subject) {
  return Boolean(subject?.id && subject?.name);
}

export default useSubjectResolver;
