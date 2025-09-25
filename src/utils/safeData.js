/**
 * Safe Data Utils
 * ===============
 * Sichere Datenverarbeitung und Validierung
 * Verhindert Crashes durch undefined/null Werte
 */

/**
 * Ultra-sichere String-Konvertierung
 * @param {*} value - Beliebiger Input-Wert
 * @returns {string} Sicherer String oder leerer String
 */
export const ultraSafeString = (value) => {
  try {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    
    // Für Objekte: Extrahiere name oder title
    if (typeof value === 'object') {
      if (value.name) return ultraSafeString(value.name);
      if (value.title) return ultraSafeString(value.title);
      if (Array.isArray(value)) return value.length.toString();
      return '[Objekt]';
    }
    
    return String(value).trim() || '';
  } catch (e) {
    console.warn('ultraSafeString error:', e, 'for value:', value);
    return '';
  }
};

/**
 * Sichere Sortierung nach Name/Title
 * @param {Array} items - Array von Objekten
 * @returns {Array} Gefiltertes und sortiertes Array
 */
export const safeSortByName = (items = []) => {
  try {
    // Filtere ungültige Elemente
    const validItems = items.filter(item => 
      item && 
      (item.name || item.title) && 
      typeof item === 'object'
    );
    
    // Sichere Sortierung
    return validItems.sort((a, b) => {
      const nameA = ultraSafeString(a.name || a.title || '');
      const nameB = ultraSafeString(b.name || b.title || '');
      return nameA.localeCompare(nameB);
    });
  } catch (e) {
    console.error('safeSortByName error:', e);
    return items || [];
  }
};

/**
 * Validierung und Normalisierung von Daten
 * @param {Array} data - Rohdaten vom Server
 * @returns {Array} Validierte und normalisierte Daten
 */
export const normalizeData = (data = []) => {
  try {
    return data
      .filter(item => item && typeof item === 'object')
      .map(item => {
        // Stelle sicher, dass IDs Strings sind
        if (item.id && typeof item.id !== 'string') {
          item.id = String(item.id);
        }
        
        // Normalisiere Zahlenfelder
        if (item.lesson_number) {
          item.lesson_number = Number(item.lesson_number) || 0;
        }
        if (item.week_number) {
          item.week_number = Number(item.week_number) || 0;
        }
        
        return item;
      });
  } catch (e) {
    console.error('normalizeData error:', e);
    return [];
  }
};

/**
 * Batch-Error-Handler für Array-Operationen
 * @param {Array} items - Items zum Verarbeiten
 * @param {Function} processor - Verarbeitungsfunktion
 * @returns {Array} Verarbeitete Items (mit Fallbacks)
 */
export const safeProcessArray = (items = [], processor) => {
  try {
    if (!Array.isArray(items) || typeof processor !== 'function') {
      return [];
    }
    
    return items.map((item, index) => {
      try {
        return processor(item, index);
      } catch (itemError) {
        console.warn(`Error processing item ${index}:`, itemError);
        return null; // Oder Fallback-Objekt
      }
    }).filter(Boolean);
  } catch (e) {
    console.error('safeProcessArray error:', e);
    return [];
  }
};