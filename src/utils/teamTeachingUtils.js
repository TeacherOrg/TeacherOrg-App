import pb from '@/api/pb';

/**
 * Prüft ob der User eine Klasse bearbeiten darf
 * @param {Object} classData - Klassendaten mit isOwner und permissionLevel
 * @param {string} userId - Aktuelle User-ID (optional, wird aus authStore geholt)
 * @returns {boolean}
 */
export const canEditClass = (classData, userId = null) => {
  if (!classData) return false;

  const currentUserId = userId || pb.authStore.model?.id;

  // Owner darf immer bearbeiten
  if (classData.user_id === currentUserId || classData.isOwner === true) {
    return true;
  }

  // Co-Teacher mit full_access darf bearbeiten
  if (classData.permissionLevel === 'full_access') {
    return true;
  }

  return false;
};

/**
 * Prüft ob der User nur Lesezugriff hat
 * @param {Object} classData - Klassendaten mit permissionLevel
 * @returns {boolean}
 */
export const isViewOnly = (classData) => {
  if (!classData) return true;

  // Owner ist nie view_only
  if (classData.isOwner === true) {
    return false;
  }

  return classData.permissionLevel === 'view_only';
};

/**
 * Prüft ob der User der Besitzer der Klasse ist
 * @param {Object} classData - Klassendaten
 * @param {string} userId - Aktuelle User-ID (optional)
 * @returns {boolean}
 */
export const isClassOwner = (classData, userId = null) => {
  if (!classData) return false;

  const currentUserId = userId || pb.authStore.model?.id;

  return classData.user_id === currentUserId || classData.isOwner === true;
};

/**
 * Gibt die Berechtigung für eine Klasse zurück
 * @param {Object} classData - Klassendaten
 * @param {string} userId - Aktuelle User-ID (optional)
 * @returns {'owner' | 'full_access' | 'view_only' | null}
 */
export const getClassPermission = (classData, userId = null) => {
  if (!classData) return null;

  const currentUserId = userId || pb.authStore.model?.id;

  if (classData.user_id === currentUserId || classData.isOwner === true) {
    return 'owner';
  }

  return classData.permissionLevel || null;
};

/**
 * Baut einen PocketBase Filter, der eigene und geteilte Daten einschließt
 * @param {string} userId - User-ID
 * @param {Array<string>} sharedClassIds - IDs der geteilten Klassen
 * @param {string} fieldName - Feldname für class_id (default: 'class_id')
 * @returns {string} PocketBase Filter-String
 */
export const buildSharedClassFilter = (userId, sharedClassIds = [], fieldName = 'class_id') => {
  const ownFilter = `user_id = '${userId}'`;

  if (!sharedClassIds || sharedClassIds.length === 0) {
    return ownFilter;
  }

  const sharedFilter = sharedClassIds.map(id => `${fieldName} = '${id}'`).join(' || ');
  return `(${ownFilter}) || (${sharedFilter})`;
};

/**
 * Formatiert die Berechtigung für die Anzeige
 * @param {string} permissionLevel - 'owner' | 'full_access' | 'view_only'
 * @returns {string} Deutsche Bezeichnung
 */
export const formatPermissionLevel = (permissionLevel) => {
  switch (permissionLevel) {
    case 'owner':
      return 'Besitzer';
    case 'full_access':
      return 'Vollzugriff';
    case 'view_only':
      return 'Nur Einsicht';
    default:
      return 'Unbekannt';
  }
};

/**
 * Formatiert den Status für die Anzeige
 * @param {string} status - 'pending' | 'accepted' | 'declined' | 'revoked'
 * @returns {string} Deutsche Bezeichnung
 */
export const formatInvitationStatus = (status) => {
  switch (status) {
    case 'pending':
      return 'Ausstehend';
    case 'accepted':
      return 'Akzeptiert';
    case 'declined':
      return 'Abgelehnt';
    case 'revoked':
      return 'Widerrufen';
    default:
      return 'Unbekannt';
  }
};

/**
 * Gibt das passende Icon für die Berechtigung zurück
 * @param {string} permissionLevel - Berechtigungsstufe
 * @returns {string} Lucide Icon Name
 */
export const getPermissionIcon = (permissionLevel) => {
  switch (permissionLevel) {
    case 'owner':
      return 'Crown';
    case 'full_access':
      return 'Edit';
    case 'view_only':
      return 'Eye';
    default:
      return 'HelpCircle';
  }
};

/**
 * Gibt die Farbe für die Berechtigung zurück
 * @param {string} permissionLevel - Berechtigungsstufe
 * @returns {string} Tailwind CSS Farbklasse
 */
export const getPermissionColor = (permissionLevel) => {
  switch (permissionLevel) {
    case 'owner':
      return 'text-amber-500';
    case 'full_access':
      return 'text-green-500';
    case 'view_only':
      return 'text-blue-500';
    default:
      return 'text-slate-500';
  }
};
