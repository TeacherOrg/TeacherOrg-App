/**
 * Subject Helper Utilities
 * ========================
 * Utility functions for finding and working with subject objects.
 */

/**
 * Find a subject by name
 * @param {Array} subjects - Array of subject objects
 * @param {string} name - Subject name to search for
 * @returns {Object|undefined} The found subject or undefined
 */
export const findSubjectByName = (subjects, name) => {
  if (!subjects || !name) return undefined;
  return subjects.find(s => s.name === name);
};

/**
 * Find a subject by name and class ID
 * @param {Array} subjects - Array of subject objects
 * @param {string} name - Subject name to search for
 * @param {string} classId - Class ID to match
 * @returns {Object|undefined} The found subject or undefined
 */
export const findSubjectByNameAndClass = (subjects, name, classId) => {
  if (!subjects || !name) return undefined;
  return subjects.find(s => s.name === name && s.class_id === classId);
};

/**
 * Find a subject by ID
 * @param {Array} subjects - Array of subject objects
 * @param {string} id - Subject ID to search for
 * @returns {Object|undefined} The found subject or undefined
 */
export const findSubjectById = (subjects, id) => {
  if (!subjects || !id) return undefined;
  return subjects.find(s => s.id === id);
};

/**
 * Find a subject by ID or name (flexible lookup)
 * @param {Array} subjects - Array of subject objects
 * @param {string} idOrName - ID or name to search for
 * @returns {Object|undefined} The found subject or undefined
 */
export const findSubject = (subjects, idOrName) => {
  if (!subjects || !idOrName) return undefined;
  return subjects.find(s => s.id === idOrName || s.name === idOrName);
};

/**
 * Get subject ID from a name, with class filtering
 * @param {Array} subjects - Array of subject objects
 * @param {string} name - Subject name to search for
 * @param {string} classId - Optional class ID to filter by
 * @returns {string|undefined} The subject ID or undefined
 */
export const getSubjectId = (subjects, name, classId = null) => {
  if (!subjects || !name) return undefined;
  const subject = classId
    ? findSubjectByNameAndClass(subjects, name, classId)
    : findSubjectByName(subjects, name);
  return subject?.id;
};

/**
 * Get subject color by name
 * @param {Array} subjects - Array of subject objects
 * @param {string} name - Subject name to search for
 * @returns {string|undefined} The subject color or undefined
 */
export const getSubjectColor = (subjects, name) => {
  return findSubjectByName(subjects, name)?.color;
};
