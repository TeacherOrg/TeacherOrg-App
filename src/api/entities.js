import pb from '@/api/pb';
import { prepareAllerleiForPersist } from '@/components/timetable/allerlei/AllerleiUtils';
import { safeProcessArray } from '@/utils/safeData'; // Neu: Import für Batch
import auditLogger from '@/services/auditLogger';

class PbEntity {
  constructor(name) {
    this.name = name.toLowerCase();
    this.collectionName = `${this.name}s`; // Explicitly set collectionName
    this.collection = pb.collection(this.collectionName);

    // Entitäts-spezifische expand-Felder, abgestimmt auf PocketBase-Schema
    const expandMap = {
      lesson: 'subject,user_id,yearly_lesson_id,second_yearly_lesson_id,topic_id',
      yearly_lesson: 'topic,subject',
      allerlei_lesson: 'primary_yearly_lesson_id.subject,added_yearly_lesson_ids.subject,user_id,topic_id',
      topic: 'class_id,subject',
      subject: 'class_id',
      setting: 'user_id',
      classe: 'user_id',
      holiday: 'user_id',
      student: 'class_id,user_id,account_id',
      performance: 'student_id,class_id,subject',
      ueberfachliche_kompetenz: 'student_id,class_id,competency_id',
      competencie: 'user_id,class_id',
      student_self_assessment: 'student_id,competency_id',
      competency_goal: 'student_id,competency_id,created_by,completed_by',
      fachbereich: '',
      daily_note: '',
      announcement: '',
      chore: 'class_id,user_id',
      chore_assignment: 'student_id,chore_id,class_id',
      group: 'student_ids,class_id,user_id',
      user_preference: 'user_id,class_id',
      lehrplan_kompetenz: '',
      // Currency & Store System
      student_currencie: 'student_id',
      currency_transaction: 'student_id',
      store_item: '',
      store_purchase: 'student_id,item_id,reviewed_by',
      bountie: '',
      bounty_completion: 'bounty_id,student_id,approved_by',
      achievement_reward: '',
      achievement_coins_awarded: 'student_id',
      // Team Teaching
      team_teaching: 'class_id,owner_id,invited_user_id'
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
    ['lesson_number', 'week_number', 'school_year', 'week_year'].forEach(field => {
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

    // Konvertiere department zu null, wenn leer (Relation akzeptiert keine leeren Strings)
    if (this.name === 'topic' && (prepared.department === '' || prepared.department === undefined)) {
      prepared.department = null;
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
    const relationalFields = ['user_id', 'class_id', 'student_id', 'subject', 'competency_id', 'topic_id', 'yearly_lesson_id', 'second_yearly_lesson_id', 'department'];
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

    // Currency & Store System - immer user_id setzen
    if (['student_currencie', 'currency_transaction', 'store_item', 'store_purchase', 'bountie', 'bounty_completion', 'achievement_reward', 'achievement_coins_awarded'].includes(this.name)) {
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

      // assignment_date auf ISO-Datum normalisieren
      if (normalizedItem.assignment_date) {
        const date = new Date(normalizedItem.assignment_date);
        normalizedItem.assignment_date = date.toISOString().split('T')[0];
      }

      // Completion-Tracking Felder
      normalizedItem.is_completed = normalizedItem.is_completed || false;
      normalizedItem.completed_at = normalizedItem.completed_at || null;

      // Status-Feld normalisieren (pending | completed | not_completed)
      // Rückwärtskompatibilität: Wenn status nicht gesetzt, von is_completed ableiten
      if (!normalizedItem.status) {
        normalizedItem.status = normalizedItem.is_completed ? 'completed' : 'pending';
      }
    }

    if (this.name === 'lehrplan_kompetenz') {
      normalizedItem.fach_name = item.fach_name || 'Unbekannt';  // ← Hinzufügen: Default auf 'Unbekannt'
    }

    ['lesson_number', 'week_number', 'school_year', 'week_year'].forEach(field => {
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
      normalizedItem.subject_color = normalizedItem.expand?.subject?.color || normalizedItem.subject_color;
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

    // Student Self Assessment normalization
    if (this.name === 'student_self_assessment') {
      normalizedItem.student_name = normalizedItem.expand?.student_id?.name || '';
      normalizedItem.competency_name = normalizedItem.expand?.competency_id?.name || '';
    }

    // Competency Goal normalization
    if (this.name === 'competency_goal') {
      normalizedItem.student_name = normalizedItem.expand?.student_id?.name || '';
      normalizedItem.competency_name = normalizedItem.expand?.competency_id?.name || '';
      normalizedItem.creator_name = normalizedItem.expand?.created_by?.name || '';
      normalizedItem.completer_name = normalizedItem.expand?.completed_by?.name || '';
    }

    // Student - include account info if expanded
    if (this.name === 'student') {
      normalizedItem.has_account = !!normalizedItem.account_id;
      normalizedItem.account_email = normalizedItem.expand?.account_id?.email || null;
      // Speichere expandierte Klassendaten für Student-Pfad im Timetable
      normalizedItem.expanded_class = normalizedItem.expand?.class_id || null;
    }

    // Currency & Store System Normalizations
    if (this.name === 'student_currencie') {
      normalizedItem.student_name = normalizedItem.expand?.student_id?.name || '';
      normalizedItem.balance = normalizedItem.balance || 0;
      normalizedItem.lifetime_earned = normalizedItem.lifetime_earned || 0;
      normalizedItem.lifetime_spent = normalizedItem.lifetime_spent || 0;
    }

    if (this.name === 'currency_transaction') {
      normalizedItem.student_name = normalizedItem.expand?.student_id?.name || '';
    }

    if (this.name === 'store_purchase') {
      normalizedItem.student_name = normalizedItem.expand?.student_id?.name || '';
      normalizedItem.item_name = normalizedItem.expand?.item_id?.name || '';
      normalizedItem.item_icon = normalizedItem.expand?.item_id?.icon || '';
      normalizedItem.reviewer_name = normalizedItem.expand?.reviewed_by?.name || '';
    }

    if (this.name === 'bounty_completion') {
      normalizedItem.bounty_title = normalizedItem.expand?.bounty_id?.title || '';
      normalizedItem.student_name = normalizedItem.expand?.student_id?.name || '';
      normalizedItem.approver_name = normalizedItem.expand?.approved_by?.name || '';
    }

    if (this.name === 'subject') {
      normalizedItem.emoji = item.emoji || '📚'; // Default-Emoji
      normalizedItem.is_core_subject = item.is_core_subject || false;
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
    // Für Studenten: KEIN user_id-Filter, da sie Lehrer-Subjects über class_id laden
    let customFilter = '';
    if (this.name === 'subject') {
      const isStudent = pb.authStore.model?.role === 'student';
      if (!isStudent) {
        const uid = pb.authStore.model?.id;
        if (uid) {
          customFilter = `(user_id = '${uid}' || user_id = null || user_id = '')`;
        } else {
          customFilter = `(user_id = null || user_id = '')`;
        }
      }
      // Für Studenten: customFilter bleibt leer, class_id-Filter aus Query wird verwendet
    }

    const baseFilter = this.buildFilter({ ...query, $cancelKey: undefined }); // $cancelKey nicht als Filter

    let finalFilter = '';
    if (baseFilter && customFilter) finalFilter = `(${baseFilter}) && ${customFilter}`;
    else if (baseFilter) finalFilter = baseFilter;
    else if (customFilter) finalFilter = customFilter;

    const params = {
      filter: finalFilter || '',
      expand: this.expandFields,
      $cancelKey: cancelKey,
      // Sortierung nach sort_order für Subjects
      sort: this.name === 'subject' ? '+sort_order,+created' : ''
    };

    try {
      // getFullList() lädt automatisch alle Records (kein 1000er Limit wie bei getList)
      const items = await this.collection.getFullList(params);

      if (!Array.isArray(items)) return [];

      const validItems = items.filter(Boolean);
      const results = this.batchNormalize(validItems);

      // Audit-Logging für Zugriff auf sensible Daten
      if (this.name === 'student' && results.length > 0) {
        auditLogger.logViewStudentsOverview().catch(() => {});
      } else if (this.name === 'performance' && results.length > 0) {
        auditLogger.logViewGrades().catch(() => {});
      }

      return results;
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

      // Audit-Logging für sensible Daten-Erstellung
      if (this.name === 'student' && response?.id) {
        auditLogger.logCreateStudent(response.id, response.name || 'Unknown').catch(() => {});
      } else if (this.name === 'performance' && response?.id) {
        auditLogger.logCreateGrade(response.id, response.student_id, response.subject).catch(() => {});
      }

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

      // Audit-Logging für sensible Daten-Updates
      if (this.name === 'student' && fullUpdated?.id) {
        auditLogger.logUpdateStudent(fullUpdated.id, preparedUpdates).catch(() => {});
      } else if (this.name === 'performance' && fullUpdated?.id) {
        auditLogger.logUpdateGrade(fullUpdated.id, fullUpdated.student_id, preparedUpdates).catch(() => {});
      }

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
          // Audit-Logging: Hole Daten VOR dem Löschen für besseres Logging
          let recordData = null;
          if (this.name === 'student' || this.name === 'performance') {
            try {
              recordData = await this.collection.getOne(id);
            } catch (e) {
              // Falls getOne fehlschlägt, fahre trotzdem fort
            }
          }

          await this.collection.delete(id, params);

          // Audit-Logging für Löschungen
          if (this.name === 'student' && recordData) {
            auditLogger.logDeleteStudent(id, recordData.name || 'Unknown').catch(() => {});
          } else if (this.name === 'performance' && recordData) {
            auditLogger.logDeleteGrade(id, recordData.student_id).catch(() => {});
          }

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

// Batch-Update für Subject-Sortierung
Subject.updateSortOrder = async (updates) => {
  // updates: Array von { id, sort_order }
  const results = [];
  for (const { id, sort_order } of updates) {
    try {
      await Subject.update(id, { sort_order });
      results.push({ id, success: true });
    } catch (error) {
      console.error(`Error updating sort_order for subject ${id}:`, error);
      results.push({ id, success: false, error });
    }
  }
  return results;
};
export const Holiday = new PbEntity('Holiday');
export const Performance = new PbEntity('Performance');
export const UeberfachlichKompetenz = new PbEntity('Ueberfachliche_kompetenz');
export const Competency = new PbEntity('competencie');
export const Fachbereich = new PbEntity('Fachbereich');
Fachbereich.collectionName = 'fachbereichs';
export const DailyNote = new PbEntity('Daily_note');
export const Announcement = new PbEntity('Announcement');
export const Chore = new PbEntity('Chore');
export const ChoreAssignment = new PbEntity('Chore_assignment');
export const ChoreRotationHistory = new PbEntity('Chore_rotation_history');
ChoreRotationHistory.collectionName = 'chore_rotation_histories';
ChoreRotationHistory.collection = pb.collection('chore_rotation_histories');
export const Group = new PbEntity('Group');
export const UserPreferences = new PbEntity('User_preference');
export const CustomizationSettings = new PbEntity('customization_setting');
export const AllerleiLesson = new PbEntity('Allerlei_lesson');  // Neu: Entity für neue Collection
export const LehrplanKompetenz = new PbEntity('lehrplan_kompetenz');
export const SharedTopic = new PbEntity('shared_topic');
SharedTopic.collectionName = 'shared_topics';
SharedTopic.collection = pb.collection('shared_topics');

// Team Teaching Entity
export const TeamTeaching = new PbEntity('team_teaching');
TeamTeaching.collectionName = 'team_teachings';
TeamTeaching.collection = pb.collection('team_teachings');

// Student Dashboard Entities
export const StudentSelfAssessment = new PbEntity('Student_self_assessment');
export const CompetencyGoal = new PbEntity('Competency_goal');

// Currency & Store System Entities
export const StudentCurrency = new PbEntity('Student_currencie');
StudentCurrency.collectionName = 'student_currencies';
StudentCurrency.collection = pb.collection('student_currencies');

export const CurrencyTransaction = new PbEntity('Currency_transaction');

export const StoreItem = new PbEntity('Store_item');

export const StorePurchase = new PbEntity('Store_purchase');

export const Bounty = new PbEntity('Bountie');
Bounty.collectionName = 'bounties';
Bounty.collection = pb.collection('bounties');

export const BountyCompletion = new PbEntity('Bounty_completion');

// Achievement Rewards - Custom coin rewards per achievement
export const AchievementReward = new PbEntity('Achievement_reward');

// Achievement Coins Awarded - Tracks which achievements have awarded coins to prevent double-awarding
export const AchievementCoinsAwarded = new PbEntity('Achievement_coins_awarded');

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
    // Custom Event für App.jsx auslösen, um Cache und Store zu leeren
    window.dispatchEvent(new CustomEvent('user-logout'));
    import('react-hot-toast').then(({ toast }) => {
      toast.success('Erfolgreich abgemeldet.');
    });
    return { success: true };
  },

  /**
   * Generiert ein merkbares Fun-Passwort mit Tier/Planeten-Namen
   * Format: Wort + Symbol + Zahl → z.B. "Tiger#42", "Venus+17"
   * Alle Wörter haben mindestens 5 Buchstaben für 8+ Zeichen Passwörter
   */
  generateFunPassword: () => {
    const words = [
      // Planeten & Weltraum (5+ Buchstaben)
      'Venus', 'Jupiter', 'Saturn', 'Neptun', 'Pluto', 'Komet', 'Stern', 'Orbit',
      // Tiere (5+ Buchstaben)
      'Tiger', 'Loewe', 'Adler', 'Delfin', 'Panda', 'Fuchs', 'Otter', 'Falke',
      'Kondor', 'Kolibri', 'Pinguin', 'Drache', 'Phoenix', 'Zebra', 'Biber',
      // Natur (5+ Buchstaben)
      'Eiche', 'Tulpe', 'Blitz', 'Wolke', 'Sonne', 'Ozean', 'Blume', 'Sturm'
    ];
    const symbols = ['!', '#', '+', '*', '@', '&'];
    const word = words[Math.floor(Math.random() * words.length)];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const number = Math.floor(Math.random() * 90) + 10; // 10-99
    return `${word}${symbol}${number}`;
  },

  /**
   * Erstellt einen Schüler-Account und verknüpft ihn mit dem Student-Record
   * @param {Object} params - { studentId, email, name }
   * @returns {Object} { success, user, password } oder { success: false, error }
   */
  createStudentAccount: async ({ studentId, email, name }) => {
    try {
      // Generiere merkbares Fun-Passwort
      const password = User.generateFunPassword();

      // Erstelle User-Account mit Rolle 'student'
      const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now().toString(36);
      const userData = {
        username,
        email,
        password,
        passwordConfirm: password,
        role: 'student',
        name: name,
        emailVisibility: true,
        verified: false,  // Studenten werden durch erstes Login verifiziert
      };

      const newUser = await pb.collection('users').create(userData);

      // Verknüpfe Student-Record mit dem neuen Account und speichere Passwort
      await Student.update(studentId, {
        account_id: newUser.id,
        generated_password: password
      });

      return { success: true, user: newUser, password };
    } catch (error) {
      console.error('Error creating student account:', error);
      let errorMessage = 'Fehler beim Erstellen des Accounts.';
      if (error.status === 400 && error.data?.data?.email) {
        errorMessage = 'Diese E-Mail-Adresse ist bereits registriert.';
      }
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Setzt das Passwort eines Schülers zurück durch Account-Regenerierung
   * (PocketBase erlaubt keine direkte Passwort-Änderung ohne Admin-Auth)
   * @param {string} userId - Die User-ID des Schüler-Accounts
   * @returns {Object} { success, password } oder { success: false, error }
   */
  resetStudentPassword: async (userId) => {
    try {
      // 1. Hole Student-Daten
      const students = await Student.filter({ account_id: userId });
      if (students.length === 0) {
        return { success: false, error: 'Kein Student mit diesem Account gefunden' };
      }
      const student = students[0];

      // 2. Hole User-Daten (für Email und Name)
      const user = await pb.collection('users').getOne(userId);

      // 3. Lösche alten Account
      await pb.collection('users').delete(userId);

      // 4. Erstelle neuen Account mit gleichem Email
      const newPassword = User.generateFunPassword();
      const username = user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now().toString(36);

      const newUser = await pb.collection('users').create({
        username,
        email: user.email,
        password: newPassword,
        passwordConfirm: newPassword,
        role: 'student',
        name: user.name,
        emailVisibility: true,
        verified: true,  // Studenten werden automatisch verifiziert
      });

      // 5. Update Student mit neuem Account
      await Student.update(student.id, {
        account_id: newUser.id,
        generated_password: newPassword,
      });

      return { success: true, password: newPassword, newUserId: newUser.id };
    } catch (error) {
      console.error('Error resetting student password:', error);
      return { success: false, error: error.message || 'Fehler beim Zurücksetzen des Passworts.' };
    }
  },
};