import pb from '@/api/pb'; 

class PbEntity {
  constructor(name) {
    this.name = name.toLowerCase();
    this.collection = pb.collection(`${this.name}s`); // Plural-Namen, z. B. 'lessons' für Lesson
  }

  normalizeData(item) {
    if (item.lesson_number !== undefined) item.lesson_number = Number(item.lesson_number);
    if (item.week_number !== undefined) item.week_number = Number(item.week_number);
    if (item.school_year !== undefined) item.school_year = Number(item.school_year);
    return item;
  }

  async list(query = {}) {
    const params = { filter: this.buildFilter(query), perPage: 500 }; // Passe Limit an Bedarf an
    const { items } = await this.collection.getList(1, params.perPage, params);
    return items.map(this.normalizeData);
  }

  async find(query = {}) {
    return this.list(query);
  }

  async filter(query = {}) {
    return this.find(query);
  }

  async findOne(query = {}) {
    const results = await this.find(query);
    return results[0] || null;
  }

  async findById(id) {
    try {
      const item = await this.collection.getOne(id);
      return this.normalizeData(item);
    } catch {
      return null;
    }
  }

  async create(newData) {
    const entity = this.normalizeData(newData);
    const created = await this.collection.create(entity);
    return this.normalizeData(created);
  }

  async update(id, updates) {
    const updated = await this.collection.update(id, this.normalizeData(updates));
    return this.normalizeData(updated);
  }

  async delete(id) {
    try {
      await this.collection.delete(id);
      return true;
    } catch {
      return false;
    }
  }

  async batchCreate(items) {
    return Promise.all(items.map(item => this.create(item)));
  }

  async bulkCreate(items) {
    return this.batchCreate(items);
  }

  async batchUpdate(updates) {
    return Promise.all(updates.map(({ id, data }) => this.update(id, data)));
  }

  async batchDelete(ids) {
    return Promise.all(ids.map(id => this.delete(id)));
  }

  async sync() {
    // Für Realtime-Sync: Nutze Subscriptions in deinen Komponenten (z. B. in useEffect)
    return { status: 'synced' };
  }

  buildFilter(query) {
    if (Object.keys(query).length === 0) return '';
    return Object.entries(query).map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        if (value.$gt) return `${key} > ${value.$gt}`;
        if (value.$lt) return `${key} < ${value.$lt}`;
        if (value.$in) return `${key} ~ '${value.$in.join('|')}'`; // Annäherung für IN
        if (value.$eq) return `${key} = ${this.formatValue(value.$eq)}`;
      }
      return `${key} = ${this.formatValue(value)}`;
    }).join(' && ');
  };

  // Neue Hilfsfunktion hinzufügen (direkt unter buildFilter)
  formatValue(value) {
    if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`; // Escape single quotes
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    return `'${value}'`; // Fallback für andere Typen
  }
}

// Instanzen für ALLE Entities – gleich wie bisher
export const Lesson = new PbEntity('Lesson'); // Generiert 'lessons'
export const Student = new PbEntity('Student'); // Generiert 'students'
export const YearlyLesson = new PbEntity('Yearly_lesson'); // Generiert 'yearly_lessons' – korrigiert mit Underscore
export const Topic = new PbEntity('Topic'); // Generiert 'topics'
export const Setting = new PbEntity('Setting'); // Generiert 'settings'
export const Class = new PbEntity('Classe'); // Generiert 'classes' – korrigiert für korrekten Plural
export const Subject = new PbEntity('Subject'); // Generiert 'subjects'
export const Holiday = new PbEntity('Holiday'); // Generiert 'holidays'
export const Performance = new PbEntity('Performance'); // Generiert 'performances'
export const UeberfachlichKompetenz = new PbEntity('Ueberfachliche_kompetenz'); // Generiert 'ueberfachliche_kompetenzs' – passe bei Bedarf in PocketBase zu diesem Namen um, oder erweitere die Logic
export const Competency = new PbEntity('Competencie'); // Generiert 'competencies' – korrigiert für 'ies'-Plural
export const Fachbereich = new PbEntity('Fachbereich'); // Generiert 'fachbereichs' – passe in PocketBase zu 'fachbereichs' um, oder erweitere Logic für 'e'
export const DailyNote = new PbEntity('Daily_note'); // Generiert 'daily_notes' – korrigiert mit Underscore
export const Announcement = new PbEntity('Announcement'); // Generiert 'announcements'
export const Chore = new PbEntity('Chore'); // Generiert 'chores'
export const ChoreAssignment = new PbEntity('Chore_assignment');

// Auth mit PocketBase – echt, mit Default role 'teacher' bei Signup
export const User = {
  current: () => pb.authStore.model || null,

  login: async ({ email, password }) => {
    const authData = await pb.collection('users').authWithPassword(email, password);
    return { success: true, user: authData.record };
  },

  signup: async ({ email, password }) => {
    try {
      const username = email.split('@')[0]; // Neu: Erstelle username aus Email (z. B. 'test' von test@example.com) – oder lass User eingeben
      const userData = {
        username, // Required Field
        email,
        password,
        passwordConfirm: password,
        role: 'teacher',  // Custom Field
        emailVisibility: true,
      };
      const newUser = await pb.collection('users').create(userData);
      await pb.collection('users').requestVerification(email);
      return { success: true, user: newUser, message: 'Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mail.' };
    } catch (error) {
      console.error('Signup Error Details:', error.data); // Neu: Log detailliertes data (z. B. { username: { code: 'validation_required' } })
      let errorMessage = 'Ein Fehler ist aufgetreten.';
      if (error.status === 400 && error.data) {
        errorMessage = `Ungültige Daten: ${JSON.stringify(error.data)}`; // Zeige spezifisch in UI
      }
      return { success: false, error: errorMessage };
    }
  },

  logout: () => {
    pb.authStore.clear();
    return { success: true };
  },
};