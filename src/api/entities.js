import pb from '@/api/pb';
import { prepareAllerleiForPersist, normalizeAllerleiData } from '@/components/timetable/allerlei/AllerleiUtils';
import { safeProcessArray } from '@/utils/safeData'; // Neu: Import für Batch

// Debugging-Flag basierend auf der Umgebung
const isDebug = process.env.NODE_ENV === 'development' || false;

class PbEntity {
  constructor(name) {
    this.name = name.toLowerCase();
    this.collectionName = `${this.name}s`; // Explicitly set collectionName
    this.collection = pb.collection(this.collectionName);

    // Entitäts-spezifische expand-Felder, abgestimmt auf PocketBase-Schema
    const expandMap = {
      lesson: 'subject,user_id,yearly_lesson_id,second_yearly_lesson_id,topic_id',
      yearly_lesson: 'subject,user_id,class_id,topic_id,second_yearly_lesson_id',
      topic: 'class_id',
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
      user_preference: 'user_id,class_id'
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
      if (isDebug) console.warn(`Invalid data in prepareForPersist for ${this.name}:`, data);
      return data;
    }

    const prepared = { ...data };

    // Numerische Felder konvertieren
    ['lesson_number', 'week_number', 'school_year'].forEach(field => {
      if (prepared[field] !== undefined && prepared[field] !== null) {
        prepared[field] = Number(prepared[field]);
      }
    });

    // Ensure is_hidden is always a boolean for lesson, default to false
    if (this.name === 'lesson') {
      prepared.is_hidden = typeof prepared.is_hidden === 'boolean' ? prepared.is_hidden : false;
      if (isDebug) {
        console.log(`Debug: Set is_hidden to ${prepared.is_hidden} for lesson:`, JSON.stringify(prepared, null, 2));
      }
    }

    // NEU: Für chore_assignment: assignment_date als ISO-Datum formatieren
    if (this.name === 'chore_assignment' && prepared.assignment_date) {
      const date = new Date(prepared.assignment_date);
      prepared.assignment_date = date.toISOString().split('T')[0];
      if (isDebug) {
        console.log(`Debug: Normalized assignment_date to ${prepared.assignment_date} for chore_assignment`);
      }
    }

    // Spezifische Handhabungen für user_preference
    if (this.name === 'user_preference' && prepared.preferences && typeof prepared.preferences === 'string') {
      try {
        prepared.preferences = JSON.parse(prepared.preferences);
      } catch (e) {
        if (isDebug) console.error(`Error parsing preferences JSON for ${this.name}:`, e);
        prepared.preferences = {};
      }
    }

    // ✅ FIX: Spezielle Handhabung für relationale Felder (IDs)
    const relationalFields = ['user_id', 'class_id', 'student_id', 'subject', 'competency_id', 'topic_id', 'yearly_lesson_id', 'second_yearly_lesson_id'];
    
    relationalFields.forEach(field => {
      if (prepared[field] !== undefined && prepared[field] !== null) {
        prepared[field] = String(prepared[field]).trim();
        if (isDebug && prepared[field].length < 10) {
          console.warn(`Suspicious ID length for ${field} in ${this.name}:`, prepared[field]);
        }
      }
    });

    // ✅ FIX: Für competencies (und andere Entities) immer user_id erzwingen, wenn möglich
    if (['competencie', 'ueberfachliche_kompetenz', 'performance', 'classe'].includes(this.name)) {
      const currentUser = pb.authStore.model;
      console.log(`[PREPARE] Check for ${this.name} - currentUser:`, !!currentUser, 'id:', currentUser?.id, 'existing user_id:', prepared.user_id); // ← ERWEITERTER LOG
      if (currentUser && currentUser.id) {
        prepared.user_id = currentUser.id; // Immer setzen (überschreibt falls vorhanden)
        console.log(`[PREPARE] Set user_id to ${currentUser.id} for ${this.name}`); // ← LOG
      } else {
        console.error(`[PREPARE] No valid user found for ${this.name} - cannot set user_id`); // ← ERROR-LOG
        // Optional: Throw Error, um den Request zu stoppen
        // throw new Error(`Cannot prepare ${this.name}: No authenticated user`);
      }
    }

    // Entferne NUR denormalisierte Felder
    const denormFields = ['user_name', 'class_name', 'subject_name', 'topic_name', 'yearly_lesson_name', 'second_yearly_lesson_name', 'competency_name_display'];
    denormFields.forEach(field => delete prepared[field]);

    delete prepared.$cancelKey;

    if (isDebug) console.log(`Debug: Final prepared payload for ${this.name}:`, JSON.stringify(prepared, null, 2));
    return prepared;
  }

  normalizeData(item) {
    if (!item || typeof item !== 'object') {
      if (isDebug) {
        console.warn(`Invalid item in normalizeData for ${this.name}:`, item);
      }
      return null;
    }

    const normalizedItem = { ...item };

    // Neu: Debug-Log für name in yearly_lesson (temporär)
    if (this.name === 'yearly_lesson' && isDebug) {
      console.log('Debug: Normalizing yearly_lesson', {
        id: normalizedItem.id,
        rawName: item.name,
        normalizedName: normalizedItem.name,
        subject_name: normalizedItem.subject_name,
        expandSubjectName: item.expand?.subject?.name,
        week_number: normalizedItem.week_number
      });
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
      
      if (isDebug) {
        console.log('Debug: Normalizing chore_assignment', {
          id: normalizedItem.id,
          student_id: normalizedItem.student_id,
          student_name: normalizedItem.student_name,
          chore_id: normalizedItem.chore_id,
          chore_name: normalizedItem.chore_name,
          class_id: normalizedItem.class_id,
          class_name: normalizedItem.class_name,
          assignment_date: normalizedItem.assignment_date
        });
      }
    }

    ['lesson_number', 'week_number', 'school_year'].forEach(field => {
      if (normalizedItem[field] !== undefined && normalizedItem[field] !== null) {
        normalizedItem[field] = Number(normalizedItem[field]);
      }
    });

    normalizedItem.expand = normalizedItem.expand || {};

    normalizedItem.user_name = normalizedItem.expand.user_id?.name || '';
    normalizedItem.class_name = normalizedItem.expand.class_id?.name || '';

    if (this.name === 'topic') {
      normalizedItem.subject_name = normalizedItem.subject || '';
    } else {
      normalizedItem.subject_name = normalizedItem.expand?.subject?.name || 'Unbekannt';
    }

    normalizedItem.topic_name = normalizedItem.expand?.topic_id?.name || '';
    normalizedItem.yearly_lesson_name = normalizedItem.expand?.yearly_lesson_id?.name || '';
    normalizedItem.second_yearly_lesson_name = normalizedItem.expand?.second_yearly_lesson_id?.name || '';

    if (this.name === 'user_preference' && normalizedItem.preferences && typeof normalizedItem.preferences === 'string') {
      try {
        normalizedItem.preferences = JSON.parse(normalizedItem.preferences);
      } catch (e) {
        if (isDebug) {
          console.error(`Error parsing preferences JSON for ${this.name}:`, e);
        }
        normalizedItem.preferences = {};
      }
    }

    if (this.name === 'ueberfachliche_kompetenz') {
      if (!normalizedItem.competency_id || typeof normalizedItem.competency_id !== 'string') {
        if (isDebug) {
          console.warn(`Invalid competency_id for ${this.name}:`, normalizedItem);
        }
        return null;
      }
      if (!normalizedItem.expand?.competency_id?.name) {
        if (isDebug) {
          console.warn(`Missing expanded competency name for ${this.name} ID ${normalizedItem.competency_id}:`, normalizedItem);
        }
        normalizedItem.competency_name_display = `Kompetenz-ID: ${normalizedItem.competency_id} (Name fehlt)`;
      } else {
        normalizedItem.competency_name_display = normalizedItem.expand.competency_id.name;
      }
    }

    if (this.name === 'classe') {
      if (!normalizedItem.id || typeof normalizedItem.id !== 'string') {
        if (isDebug) {
          console.warn(`Invalid class item, missing or invalid id:`, normalizedItem);
        }
        return null;
      }
      if (!normalizedItem.name || typeof normalizedItem.name !== 'string') {
        if (isDebug) {
          console.warn(`Invalid class item, missing or invalid name:`, normalizedItem);
        }
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
      if (isDebug) console.warn(`Invalid items in batchNormalize for ${this.name}:`, items);
      return [];
    }

    return safeProcessArray(items, (item) => this.normalizeData(item)).filter(item => item !== null);
  }

  async list(query = {}) {
    // ✅ $cancelKey separat handhaben - NICHT im Filter!
    const cancelKey = query.$cancelKey || `list-${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const params = {
      filter: this.buildFilter({ ...query, $cancelKey: undefined }), // $cancelKey entfernen
      perPage: 500,
      expand: this.expandFields,
      $cancelKey: cancelKey // Als separater Parameter
    };
    
    try {
      const currentUser = pb.authStore.model;
      if (isDebug) {
        console.log(`Debug: Loading ${this.name}s for user:`, currentUser?.id || 'No user');
        console.log(`Debug: Query params:`, params);
      }
      const response = await this.collection.getList(1, params.perPage, params);
      const items = response?.items || [];
      if (!Array.isArray(items)) {
        console.error(`Invalid API response for ${this.name}: items is not an array`, response);
        return [];
      }
      if (this.name === 'ueberfachliche_kompetenz') {
        console.log(`Debug: Raw ueberfachliche_kompetenz data from API`, items.map(item => ({
          id: item.id,
          competency_id: item.competency_id,
          class_id: item.class_id,
          student_id: item.student_id,
          user_id: item.user_id,
          assessments: item.assessments,
          expand: {
            competency_id: item.expand?.competency_id ? {
              id: item.expand.competency_id.id,
              name: item.expand.competency_id.name
            } : null
          }
        })));
      }
      const validItems = items.filter(item => item && typeof item === 'object');
      const normalizedItems = this.batchNormalize(validItems); // Vorschlag 2: Batch statt map(single)
      return normalizedItems;
    } catch (error) {
      // ✅ Bessere Autocancellation-Behandlung auch hier
      if (error.message?.includes('autocancelled') && isDebug) {
        console.warn(`Debug: List request for ${this.name} was autocancelled`);
        return []; // Leere Liste zurückgeben statt Fehler werfen
      }
      
      console.error(`Error listing ${this.name}s:`, error.message, error.data, error.stack);
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
      if (isDebug) {
        console.error(`Error fetching ${this.name} by id ${id}:`, error.message, error.data, error.stack);
      }
      return null;
    }
  }

  async create(data, options = {}) {
    // ✅ $cancelKey aus data entfernen und separat handhaben
    const cancelKey = options.$cancelKey || `create-${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cleanData = { ...data };
    delete cleanData.$cancelKey; // Falls jemand es in data gesteckt hat
    
    const preparedData = this.prepareForPersist(cleanData);
    
    // ✅ FIX: Finale Validierung für required Felder wie user_id
    if (['competencie', 'ueberfachliche_kompetenz', 'performance', 'classe'].includes(this.name)) {
      const currentUser = pb.authStore.model;
      if (!preparedData.user_id) {
        if (currentUser && currentUser.id) {
          preparedData.user_id = currentUser.id;
          if (isDebug) console.log(`Debug: Force-added user_id ${currentUser.id} to ${this.name} payload`);
        } else {
          const error = new Error(`Missing required user_id for ${this.name}. No authenticated user found.`);
          if (isDebug) console.error(`Error creating ${this.name}:`, error.message);
          throw error;
        }
      }
    }
    
    // ✅ FIX: Validierung vor dem Erstellen
    if (!preparedData || Object.keys(preparedData).length === 0) {
      const error = new Error(`No valid data to create ${this.name}`);
      if (isDebug) console.error(`Error creating in ${this.name}:`, error.message);
      throw error;
    }
    
    if (isDebug) {
      console.log(`Debug: Raw create payload for ${this.name}:`, JSON.stringify(cleanData, null, 2));
      console.log(`Debug: Prepared create for ${this.name}:`, JSON.stringify(preparedData, null, 2));
      console.log(`Debug: Using collectionName:`, this.collectionName);
    }
    
    try {
      const response = await pb.collection(this.collectionName).create(preparedData, { $cancelKey: cancelKey });
      if (isDebug) console.log(`Debug: Create response for ${this.name}:`, JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      if (isDebug) {
        console.error(`Error creating in ${this.name}:`, {
          message: error.message,
          status: error.status,
          data: error.data ? JSON.stringify(error.data, null, 2) : error,
          requestData: JSON.stringify(preparedData, null, 2),
          stack: error.stack
        });
      }
      
      // ✅ Bessere Fehlerbehandlung: Unterscheide zwischen Autocancellation und Validierungsfehlern
      if (error.message?.includes('autocancelled')) {
        if (isDebug) console.warn(`Create request for ${this.name} was autocancelled`);
        throw error; // Weiterwerfen, damit Retry-Logik im aufrufenden Code greifen kann
      }
      
      // Spezifische Behandlung für Validierungsfehler
      if (error.status === 400 && error.data?.data) {
        const validationErrors = error.data.data;
        
        // Für competencies: Prüfe auf fehlende required Felder
        if (this.name === 'competencie') {
          const currentUser = pb.authStore.model;
          if (!preparedData.user_id && currentUser && currentUser.id) {
            // Retry mit auto-added user_id
            if (isDebug) console.log(`Retrying competencie create with auto-added user_id:`, currentUser.id);
            const retryData = { ...preparedData, user_id: currentUser.id };
            try {
              const retryResponse = await pb.collection(this.collectionName).create(retryData, { 
                $cancelKey: `retry-create-${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
              });
              if (isDebug) console.log(`Debug: Retry create response for ${this.name}:`, JSON.stringify(retryResponse, null, 2));
              return retryResponse;
            } catch (retryError) {
              if (isDebug) console.error(`Retry failed for ${this.name}:`, retryError);
              // Original error weiterwerfen
            }
          }
        }
        
        // Fallback für lesson-spezifische Felder
        if (this.name === 'lesson' && validationErrors.is_hidden?.code === 'validation_required') {
          console.warn('Retrying without is_hidden due to validation error');
          const fallbackData = { ...preparedData };
          delete fallbackData.is_hidden;
          
          try {
            const fallbackResponse = await pb.collection(this.collectionName).create(fallbackData, { 
              $cancelKey: cancelKey 
            });
            if (isDebug) console.log(`Debug: Fallback create response for ${this.name}:`, JSON.stringify(fallbackResponse, null, 2));
            return fallbackResponse;
          } catch (fallbackError) {
            if (isDebug) console.error(`Error in fallback create for ${this.name}:`, fallbackError);
          }
        }
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
      if (isDebug) console.log(`Debug: Prepared updates for ${this.name}:`, preparedUpdates);
      if (!preparedUpdates) {
        throw new Error(`Invalid update data for ${this.name}`);
      }
      
      const currentUser = pb.authStore.model;
      if (currentUser && isDebug) {
        console.log(`Debug: Updating ${this.name} ${id} for user ${currentUser.id}`);
      }
      
      const updated = await this.collection.update(id, preparedUpdates, params);
      const fullUpdated = await this.collection.getOne(id, { expand: this.expandFields });
      return this.normalizeData(fullUpdated);
    } catch (error) {
      // ✅ BESSERE FEHLERBEHANDLUNG für Autocancellation
      if (error.message?.includes('autocancelled') && preparedUpdates) {
        if (isDebug) {
          console.warn(`Debug: Update request for ${this.name} ${id} was autocancelled - likely due to parallel request`);
        }
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
                if (isDebug) console.error(`Retry failed for ${this.name} ${id}:`, retryError);
                reject(error); // Original error weiterwerfen
              }
            }, 150); // 150ms Wartezeit
          });
        }
        throw error; // Für andere Entities normal weiterwerfen
      }
      
      if (isDebug) {
        console.error(`Error updating in ${this.name}:`, {
          message: error.message,
          data: error.data,
          stack: error.stack,
          requestData: JSON.stringify(updates, null, 2)
        });
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
      if (isDebug) {
        console.error(`Error deleting ${this.name} with id ${id}:`, error.message, error.data, error.stack);
      }
      import('react-hot-toast').then(({ toast }) => {
        toast.error(`Fehler beim Löschen von ${this.name}. Bitte versuchen Sie es erneut.`);
      });
      return false;
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
      if (isDebug) {
        console.log('Building filter with query:', query, 'Final filter:', query.filter);
      }
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

    if (isDebug) {
      console.log('Building filter with query:', query, 'Final filter:', filters);
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
export const Competency = new PbEntity('Competencie');
export const Fachbereich = new PbEntity('Fachbereich');
export const DailyNote = new PbEntity('Daily_note');
export const Announcement = new PbEntity('Announcement');
export const Chore = new PbEntity('Chore');
export const ChoreAssignment = new PbEntity('Chore_assignment');
export const Group = new PbEntity('Group');
export const UserPreferences = new PbEntity('User_preference');
export const CustomizationSettings = new PbEntity('Customization_setting');

export const User = {
  current: () => pb.authStore.model || null,

  login: async ({ email, password }) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      return { success: true, user: authData.record };
    } catch (error) {
      if (isDebug) {
        console.error('Login Error Details:', error.message, error.data);
      }
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