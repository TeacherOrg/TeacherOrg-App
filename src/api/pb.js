import PocketBase from 'pocketbase';

// ✅ PocketBase URL aus Environment-Variable (nicht hardcoded)
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://teacherorg.com';

// Warnung wenn Environment-Variable nicht gesetzt
if (!import.meta.env.VITE_POCKETBASE_URL && import.meta.env.DEV) {
  console.warn('⚠️ VITE_POCKETBASE_URL nicht gesetzt in .env.local - nutze Fallback');
}

const pb = new PocketBase(POCKETBASE_URL);

// Für Debugging/Migration in der Browser-Console verfügbar machen
if (typeof window !== 'undefined') {
  window.pb = pb;
}

export default pb;
