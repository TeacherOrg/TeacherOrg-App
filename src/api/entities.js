import pb from '@/api/pb';
import { prepareAllerleiForPersist } from '@/components/timetable/allerlei/AllerleiUtils';
import { safeProcessArray } from '@/utils/safeData'; // Neu: Import für Batch

class PbEntity {
  constructor(name) {
    this.name = name.toLowerCase();
    this.collectionName = `${this.name}s`; // Explicitly set collectionName
    this.collection = pb.collection(this.collectionName);

    // Entitäts-spezifische expand-Felder, abgestimmt auf PocketBase-Schema
    const expandMap = {
      lesson: 'subject,user_id,yearly_lesson_id,second_yearly_lesson_id,topic_id',
      yearly_lesson: 'subject,user_id,class_id,topic_id,second_yearly_lesson_id',
      allerlei_lesson: 'primary_yearly_lesson_id.expand.subject,added_yearly_lesson_ids.expand.subject,user_id,class_id,topic_id',
      topic: 'class_id,subject',
      subject: 'class_id',
      setting: 'user_id',
      classe: 'user_id',
      holiday: 'user_id',
      student: 'class_id,user_id',
      performance: 'student_id,class_id,subject',
      ueberfachliche_kompetenz: 'student_id,class_id,competency_id',
      competencie: 'user_id,class_id',
      fachbereich: '',
      daily_note: '',
      announcement: '',
      chore: 'class_id,user_id',
      chore_assignment: 'student_id,chore_id,class_id',
      group: 'student_ids,class_id,user_id',
      user_preference: 'user_id,class_id',
      lehrplan_kompetenz: ''
    };

    this.expandFields = expandMap[this.name] || '';
  }

  formatValue(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`;
    if (typeof value === 'boolean') return value.toString();
    return value;
  }

  prepareForPersist(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const prepared = { ...data };

    // Entferne id für Create-Anfragen bei yearly_lesson
    if (this.name === 'yearly_lesson') {
      delete prepared.id;
    }

    // Numerische Felder konvertieren
    ['lesson_number', 'week_number', 'school_year'].forEach(field => {
      if (prepared[field] !== undefined && prepared[field] !== null) {
        prepared[field] = Number(prepared[field]);
      }
    });

    // Ensure is_hidden is always a boolean for lesson, default to false
    if (this.name === 'lesson') {
      prepared.is_hidden = typeof prepared.is_hidden === 'boolean' ? prepared.is_hidden : false;
    }

    // Konvertiere topic_id zu null, wenn leer oder 'no_topic' für yearly_lesson
    if (this.name === 'yearly_lesson' && (prepared.topic_id === '' || prepared.topic_id === 'no_topic')) {
      prepared.topic_id = null;
    }

    // Setze is_draft für topic
    if (this.name === 'topic') {
      prepared.is_draft = typeof prepared.is_draft === 'boolean' ? prepared.is_draft : false;
    }

    // Für chore_assignment: assignment_date als ISO-Datum formatieren
    if (this.name === 'chore_assignment' && prepared.assignment_date) {
      const date = new Date(prepared.assignment_date);
      prepared.assignment_date = date.toISOString().split('T')[0];
    }

    // Spezifische Handhabungen für user_preference
    if (this.name === 'user_preference' && prepared.preferences && typeof prepared.preferences === 'string') {
      try {
        prepared.preferences = JSON.parse(prepared.preferences);
      } catch (e) {
        prepared.preferences = {};
      }
    }

    // Handhabung für relationale Felder (IDs)
    const relationalFields = ['user_id', 'class_id', 'student_id', 'subject', 'competency_id', 'topic_id', 'yearly_lesson_id', 'second_yearly_lesson_id'];
    relationalFields.forEach(field => {
      if (prepared[field] !== undefined && prepared[field] !== null) {
        if (field === 'topic_id' && prepared[field] === 'no_topic') return;
        prepared[field] = String(prepared[field]).trim();
      }
    });

    // Für bestimmte Entitäten user_id erzwingen
    if (['competencie', 'ueberfachliche_kompetenz', 'performance', 'classe'].includes(this.name)) {
      const currentUser = pb.authStore.model;
      console.log(`[PREPARE] Check for ${this.name} - currentUser:`, !!currentUser, 'id:', currentUser?.id, 'existing user_id:', prepared.user_id);
      if (currentUser && currentUser.id) {
        prepared.user_id = currentUser.id; // Immer setzen (überschreibt falls vorhanden)
        console.log(`[PREPARE] Set user_id to ${currentUser.id} for ${this.name}`);
      } else {
        console.error(`[PREPARE] No valid user found for ${this.name} - cannot set user_id`);
      }
    }

    if (['lesson', 'allerlei_lesson', 'holiday'].includes(this.name)) {
      const currentUser = pb.authStore.model;
      if (currentUser && currentUser.id) {
        prepared.user_id = currentUser.id;
      } else {
        console.error('[PbEntity] Kein authentifizierter User beim Erstellen von ' + this.name);
      }
    }

    if (['topic', 'subject', 'yearly_lesson', 'lesson', 'holiday', 'allerlei_lesson'].includes(this.name)) {
      if (!prepared.user_id && pb.authStore.model?.id) {
        prepared.user_id = pb.authStore.model.id;
      }
    }

    delete prepared.$cancelKey;

    return prepared;
  }

  normalizeData(item) {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const normalizedItem = { ...item };

    if (this.name === 'topic') {
      // Immer die reine String-ID sicherstellen (auch wenn expand das Feld überschreibt)
      normalizedItem.subject = (typeof item.subject === 'object' && item.subject?.id) 
        ? item.subject.id 
        : item.subject || null;

      normalizedItem.subject_name = item.expand?.subject?.name 
        || (typeof item.subject === 'object' ? item.subject?.name : null) 
        || 'Unbekannt';

      // Name & Title robust setzen
      const topicName = item.name || item.title || 'Unbenanntes Thema';
      normalizedItem.name = topicName;
      normalizedItem.title = topicName;

      // Optional: die anderen Felder, die du brauchst
      normalizedItem.color = item.color || '#3b82f6';
      normalizedItem.description = item.description || '';
    }

    // NEU: Normalize chore_assignment
    if (this.name === 'chore_assignment') {
      normalizedItem.student_name = normalizedItem.expand?.student_id?.name || 'Unknown Student';
      normalizedItem.chore_name = normalizedItem.expand?.chore_id?.name || normalizedItem.expand?.chore_id?.description || 'Unknown Chore';
      normalizedItem.class_name = normalizedItem.expand?.class_id?.name || 'Unknown Class';
     
      // NEU: assignment_date auf ISO-Datum normalisieren
      if (normalizedItem.assignment_date) {
        const date = new Date(normalizedItem.assignment_date);
        normalizedItem.assignment_date = date.toISOString().split('T')[0];
      }
    }

    if (this.name === 'lehrplan_kompetenz') {
      normalizedItem.fach_name = item.fach_name || 'Unbekannt';  // ← Hinzufügen: Default auf 'Unbekannt'
    }

    ['lesson_number', 'week_number', 'school_year'].forEach(field => {
      if (normalizedItem[field] !== undefined && normalizedItem[field] !== null) {
        normalizedItem[field] = Number(normalizedItem[field]);
      }
    });

    normalizedItem.expand = normalizedItem.expand || {};

    normalizedItem.user_name = normalizedItem.expand.user_id?.name || '';
    normalizedItem.class_name = normalizedItem.expand.class_id?.name || '';

    normalizedItem.subject_name = normalizedItem.expand?.subject?.name || normalizedItem.subject_name || 'Unbekannt';
    if (this.name === 'allerlei_lesson') {
      normalizedItem.subject_name = 'Allerlei'; // Kein single subject für Allerlei
      normalizedItem.subject = null;
      // Setze subjectNames aus allerlei_subjects, wenn verfügbar
      normalizedItem.allerlei_subjects = normalizedItem.allerlei_subjects || [];
      normalizedItem.added_yearly_lesson_ids = normalizedItem.added_yearly_lesson_ids || [];  // ← Neu: Sicherstelle Array
    } else if (this.name === 'yearly_lesson') {
      normalizedItem.subject_name = normalizedItem.expand?.subject?.name || normalizedItem.subject_name || 'Unbekannt';
    }
    normalizedItem.topic_name = normalizedItem.expand?.topic_id?.name || '';
    normalizedItem.yearly_lesson_name = normalizedItem.expand?.yearly_lesson_id?.name || '';
    normalizedItem.second_yearly_lesson_name = normalizedItem.expand?.second_yearly_lesson_id?.name || '';

    if (this.name === 'user_preference' && normalizedItem.preferences && typeof normalizedItem.preferences === 'string') {
      try {
        normalizedItem.preferences = JSON.parse(normalizedItem.preferences);
      } catch (e) {
        normalizedItem.preferences = {};
      }
    }

    if (this.name === 'ueberfachliche_kompetenz') {
      if (!normalizedItem.competency_id || typeof normalizedItem.competency_id !== 'string') {
        return null;
      }
      if (!normalizedItem.expand?.competency_id?.name) {
        normalizedItem.competency_name_display = `Kompetenz-ID: ${normalizedItem.competency_id} (Name fehlt)`;
      } else {
        normalizedItem.competency_name_display = normalizedItem.expand.competency_id.name;
      }
    }

    if (this.name === 'classe') {
      if (!normalizedItem.id || typeof normalizedItem.id !== 'string') {
        return null;
      }
      if (!normalizedItem.name || typeof normalizedItem.name !== 'string') {
        normalizedItem.name = 'Unbenannte Klasse';
      }
    }

    if (this.name === 'subject') {
      normalizedItem.emoji = item.emoji || '📚'; // Default-Emoji
    }

    delete normalizedItem.expand;

    return normalizedItem;
  }

  // Vorschlag 2: Neue Batch-Normalisierungs-Methode mit safeProcessArray
  batchNormalize(items) {
    if (!Array.isArray(items)) {
      return [];
    }

    return safeProcessArray(items, (item) => this.normalizeData(item)).filter(item => item !== null);
  }

  async list(query = {}) {
    const cancelKey = query.$cancelKey || `list-${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Spezialfall für subjects: lädt deine aktuellen + alle alten ohne user_id
    let customFilter = '';
    if (this.name === 'subject') {
      const uid = pb.authStore.model?.id;
      if (uid) {
        customFilter = `(user_id = '${uid}' || user_id = null || user_id = '')`;
      } else {
        customFilter = `(user_id = null || user_id = '')`;
      }
    }

    const baseFilter = this.buildFilter({ ...query, $cancelKey: undefined });

    let finalFilter = '';
    if (baseFilter && customFilter) finalFilter = `(${baseFilter}) && ${customFilter}`;
    else if (baseFilter) finalFilter = baseFilter;
    else if (customFilter) finalFilter = customFilter;

    const params = {
      filter: finalFilter || '',
      perPage: 500,
      expand: this.expandFields,
      $cancelKey: cancelKey
    };

    try {
      const response = await this.collection.getList(1, params.perPage, params);

      const items = response?.items || [];
      if (!Array.isArray(items)) return [];

      const validItems = items.filter(Boolean);
      return this.batchNormalize(validItems);
    } catch (error) {
      if (!error.message?.includes('autocancelled')) {
        console.error(`Error listing ${this.name}s:`, error);
      }
      return [];
    }
  }
  async find(query = {}) {
    return this.list(query);
  }

  async filter(query = {}) {
    return this.find(query);
  }

  async findOne(query = {}) {
    // ✅ $cancelKey separat handhaben
    const cancelKey = query.$cancelKey || `findOne-${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const results = await this.find({ ...query, $cancelKey: cancelKey });
    return results[0] || null;
  }

  async findById(id) {
    try {
      const params = {
        expand: this.expandFields,
        $cancelKey: `getOne-${this.name}-${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      const item = await this.collection.getOne(id, params);
      return this.normalizeData(item);
    } catch (error) {
      console.error(`Error fetching ${this.name} by id ${id}:`, error.message, error.data, error.stack);
      return null;
    }
  }

  // In entities.js PbEntity.create: Replace the entire create method with this
  async create(data, options = {}) {
    const cancelKey = options.$cancelKey || `create-${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const params = { $cancelKey: cancelKey };

    if (data instanceof FormData) {
      try {
        const response = await pb.collection(this.collectionName).create(data, params);
        return response;
      } catch (error) {
        throw error;
      }
    }

    const cleanData = { ...data };
    delete cleanData.$cancelKey;
    
    const preparedData = this.prepareForPersist(cleanData);
    
    // Neu: Validation for 'yearly_lesson' required fields
    if (this.name === 'yearly_lesson') {
      if (!preparedData.class_id) {
        throw new Error('Missing required field: class_id for yearly_lesson');
      }
      if (!preparedData.subject) {
        throw new Error('Missing required field: subject for yearly_lesson');
      }
      if (!preparedData.user_id) {
        throw new Error('Missing required field: user_id for yearly_lesson');
      }
      // Konvertiere leeres topic_id zu null
      if (preparedData.topic_id === '' || preparedData.topic_id === 'no_topic') {
        preparedData.topic_id = null;
      }
    }

    // Bestehende Validierung für 'allerlei_lesson' relational IDs
    if (this.name === 'allerlei_lesson') {
      const primaryId = preparedData.primary_yearly_lesson_id;
      const addedIds = preparedData.added_yearly_lesson_ids || [];
      if (primaryId) {
        try {
          await pb.collection('yearly_lessons').getOne(primaryId);
        } catch (err) {
          if (err.status === 404) {
            throw new Error(`Primary yearly lesson ID ${primaryId} does not exist.`);
          }
        }
      } else {
        throw new Error('Primary yearly lesson ID required for allerlei_lesson.');
      }
      for (const addedId of addedIds) {
        try {
          await pb.collection('yearly_lessons').getOne(addedId);
        } catch (err) {
          if (err.status === 404) {
            throw new Error(`Added yearly lesson ID ${addedId} does not exist.`);
          }
        }
      }
    }
    
    // Bestehende Validierung für required Felder wie user_id
    if (['competencie', 'ueberfachliche_kompetenz', 'performance', 'classe', 'allerlei_lesson', 'topic', 'holiday', 'yearly_lesson', 'lesson', 'setting'].includes(this.name)) {
      const currentUser = pb.authStore.model;
      if (!preparedData.user_id) {
        if (currentUser && currentUser.id) {
          preparedData.user_id = currentUser.id;
        } else {
          const error = new Error(`Missing required user_id for ${this.name}. No authenticated user found.`);
          throw error;
        }
      }
    }
    
    // Validierung vor dem Erstellen
    if (!preparedData || Object.keys(preparedData).length === 0) {
      const error = new Error(`No valid data to create ${this.name}`);
      throw error;
    }
    
    try {
      const response = await pb.collection(this.collectionName).create(preparedData, params);
      return response;
    } catch (error) {
      // Bessere Fehlerbehandlung: Unterscheide zwischen Autocancellation und Validierungsfehlern
      if (error.message?.includes('autocancelled')) {
        throw error; // Weiterwerfen, damit Retry-Logik im aufrufenden Code greifen kann
      }
      
      // Spezifische Behandlung für Validierungsfehler
      if (error.status === 400 && error.data?.data) {
        console.error('Validation errors:', JSON.stringify(error.data.data, null, 2));
        // Kein Retry für yearly_lesson, da es wahrscheinlich ein Validierungsproblem ist
        throw error;
      }
      
      // Allgemeine Fehlerbehandlung
      import('react-hot-toast').then(({ toast }) => {
        const message = error.message.includes('Missing or invalid collection context')
          ? `Fehler beim Erstellen von ${this.name}: Ungültige Sammlung. Bitte überprüfen Sie die Konfiguration.`
          : `Fehler beim Erstellen von ${this.name}. Bitte versuchen Sie es erneut.`;
        toast.error(message);
      });
      throw error;
    }
  }

  async update(id, updates, options = {}) {
    const cancelKey = options.$cancelKey || `update-${this.name}-${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const params = { $cancelKey: cancelKey };
    
    // ✅ $cancelKey aus updates entfernen
    const cleanUpdates = { ...updates };
    delete cleanUpdates.$cancelKey;
    
    let preparedUpdates;
    
    try {
      preparedUpdates = this.prepareForPersist(cleanUpdates);
      if (!preparedUpdates) {
        throw new Error(`Invalid update data for ${this.name}`);
      }
      
      const currentUser = pb.authStore.model;
      
      const updated = await this.collection.update(id, preparedUpdates, params);
      const fullUpdated = await this.collection.getOne(id, { expand: this.expandFields });
      return this.normalizeData(fullUpdated);
    } catch (error) {
      // ✅ BESSERE FEHLERBEHANDLUNG für Autocancellation
      if (error.message?.includes('autocancelled') && preparedUpdates) {
        // ✅ Retry-Logik für user_preference und customization_setting
        if (['user_preference', 'customization_setting'].includes(this.name)) {
          return new Promise((resolve, reject) => {
            setTimeout(async () => {
              try {
                const retryParams = { 
                  $cancelKey: `retry-update-${this.name}-${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                };
                const updated = await this.collection.update(id, preparedUpdates, retryParams);
                const fullUpdated = await this.collection.getOne(id, { expand: this.expandFields });
                resolve(this.normalizeData(fullUpdated));
              } catch (retryError) {
                reject(error); // Original error weiterwerfen
              }
            }, 150); // 150ms Wartezeit
          });
        }
        throw error; // Für andere Entities normal weiterwerfen
      }
      
      import('react-hot-toast').then(({ toast }) => {
        toast.error(`Fehler beim Aktualisieren von ${this.name}. Bitte versuchen Sie es erneut.`);
      });
      throw error;
    }
  }

  async delete(id, options = {}) {
      const cancelKey = options.$cancelKey || `delete-${this.name}-${id}-${Date.now()}`;
      const params = { $cancelKey: cancelKey };
      try {
          await this.collection.delete(id, params);
          return true;
      } catch (error) {
          console.error(`Error deleting ${this.name} with id ${id}:`, error.message, error.data, error.stack);
          // Entferne toast.error, wenn nicht immer verfügbar
          throw error;  // ← Geändert: Throw statt return false, um Promise.all zu rejecten
      }
  }

  async batchCreate(items) {
    const results = [];
    for (const item of items) {
      results.push(await this.create(item));
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return results;
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
    return { status: 'synced' };
  }

  buildFilter(query) {
    if (query.filter && typeof query.filter === 'string') {
      return query.filter;
    }

    if (Object.keys(query).length === 0) return '';
    let filters = Object.entries(query).map(([key, value]) => {
      // ✅ $cancelKey ignorieren - das ist kein Filter-Feld!
      if (key === '$cancelKey') return null;
      
      if (typeof value === 'object' && value !== null) {
        if (value.$gt) return `${key} > ${this.formatValue(value.$gt)}`;
        if (value.$lt) return `${key} < ${this.formatValue(value.$lt)}`;
        if (value.$in) return `${key} ~ '${value.$in.map(v => this.formatValue(v)).join('|')}'`;
        if (value.$eq) return `${key} = ${this.formatValue(value.$eq)}`;
      }
      return `${key} = ${this.formatValue(value)}`;
    }).filter(Boolean); // Null-Werte entfernen

    if (this.name === 'ueberfachliche_kompetenz' && query.competency_id) {
      filters.push(`competency_id = '${query.competency_id}'`);
    }

    if (query.excludeDoubleSeconds && this.name === 'yearly_lesson') {
      const doubleFilter = '(is_double_lesson = false) || (is_double_lesson = true && second_yearly_lesson_id != null)';
      filters = filters.length ? `${filters.join(' && ')} && ${doubleFilter}` : doubleFilter;
    } else {
      filters = filters.join(' && ');
    }

    return filters;
  }
}

export const Lesson = new PbEntity('Lesson');
export const Student = new PbEntity('Student');
export const YearlyLesson = new PbEntity('Yearly_lesson');
export const Topic = new PbEntity('Topic');
export const Setting = new PbEntity('Setting');
export const Class = new PbEntity('Classe');
export const Subject = new PbEntity('Subject');
export const Holiday = new PbEntity('Holiday');
export const Performance = new PbEntity('Performance');
export const UeberfachlichKompetenz = new PbEntity('Ueberfachliche_kompetenz');
export const Competency = new PbEntity('Competicie');
export const Fachbereich = new PbEntity('Fachbereich');
Fachbereich.collectionName = 'fachbereichs';
export const DailyNote = new PbEntity('Daily_note');
export const Announcement = new PbEntity('Announcement');
export const Chore = new PbEntity('Chore');
export const ChoreAssignment = new PbEntity('Chore_assignment');
export const Group = new PbEntity('Group');
export const UserPreferences = new PbEntity('User_preference');
export const CustomizationSettings = new PbEntity('Customization_setting');
export const AllerleiLesson = new PbEntity('Allerlei_lesson');  // Neu: Entity für neue Collection
export const LehrplanKompetenz = new PbEntity('lehrplan_kompetenz');

export const User = {
  current: () => pb.authStore.model || null,

  login: async ({ email, password }) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      return { success: true, user: authData.record };
    } catch (error) {
      import('react-hot-toast').then(({ toast }) => {
        toast.error('Fehler beim Anmelden. Bitte überprüfen Sie Ihre Anmeldedaten.');
      });
      throw error;
    }
  },

  signup: async ({ email, password }) => {
    try {
      const username = email.split('@')[0];
      const userData = {
        username,
        email,
        password,
        passwordConfirm: password,
        role: 'teacher',
        emailVisibility: true,
      };
      const newUser = await pb.collection('users').create(userData);
      await pb.collection('users').requestVerification(email);
      import('react-hot-toast').then(({ toast }) => {
        toast.success('Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mail.');
      });
      return { success: true, user: newUser, message: 'Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mail.' };
    } catch (error) {
      console.error('Signup Error Details:', error.message, error.data);
      let errorMessage = 'Ein Fehler ist aufgetreten.';
      if (error.status === 400 && error.data) {
        errorMessage = `Ungültige Daten: ${JSON.stringify(error.data)}`;
      }
      import('react-hot-toast').then(({ toast }) => {
        toast.error(errorMessage);
      });
      return { success: false, error: errorMessage };
    }
  },

  logout: () => {
    pb.authStore.clear();
    import('react-hot-toast').then(({ toast }) => {
      toast.success('Erfolgreich abgemeldet.');
    });
    return { success: true };
  },
};