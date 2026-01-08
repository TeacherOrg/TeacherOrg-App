/**
 * Student Sorting Utilities
 * Handles sorting by first name or last name
 */

/**
 * Extract first name from a combined name string
 * @param {string} fullName - e.g., "Max Mustermann"
 * @returns {string} First word, e.g., "Max"
 */
export const getFirstName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') return '';
  return fullName.trim().split(/\s+/)[0] || '';
};

/**
 * Extract last name from a combined name string
 * @param {string} fullName - e.g., "Max Mustermann"
 * @returns {string} Last word, e.g., "Mustermann"
 */
export const getLastName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') return '';
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
};

/**
 * Sort students by first name or last name
 * @param {Array} students - Array of student objects with 'name' field
 * @param {'firstName' | 'lastName'} sortBy - Sort preference
 * @returns {Array} Sorted copy of students array
 */
export const sortStudents = (students, sortBy = 'firstName') => {
  if (!Array.isArray(students)) return [];

  return [...students].sort((a, b) => {
    const nameA = a?.name || '';
    const nameB = b?.name || '';

    if (sortBy === 'lastName') {
      const lastCompare = getLastName(nameA).localeCompare(getLastName(nameB), 'de');
      return lastCompare === 0
        ? getFirstName(nameA).localeCompare(getFirstName(nameB), 'de')
        : lastCompare;
    }

    const firstCompare = getFirstName(nameA).localeCompare(getFirstName(nameB), 'de');
    return firstCompare === 0
      ? getLastName(nameA).localeCompare(getLastName(nameB), 'de')
      : firstCompare;
  });
};

export default sortStudents;
