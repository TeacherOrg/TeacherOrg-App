module.exports = {
  up: async (db) => {
    // Erweitere 'users' mit role (Single-Select, Nonempty)
    const users = await db.collection('users').getOne('users');
    users.schema.addField({
      name: 'role',
      type: 'select',
      required: true, // Nonempty
      options: {
        maxSelect: 1, // Single
        values: ['admin', 'teacher', 'student']
      }
    });
    await db.collection('users').save(users);

    // 'announcements'
    await db.collection('announcements').create({
      name: 'announcements',
      type: 'base',
      schema: [
        { name: 'user_id', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
        { name: 'text', type: 'text', required: true },
        { name: 'date', type: 'date', required: true }
      ],
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: '@request.auth.id != "" && @request.auth.role = "teacher"',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id'
    });

    // 'chore_assignments'
    await db.collection('chore_assignments').create({
      name: 'chore_assignments',
      type: 'base',
      schema: [
        { name: 'user_id', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
        { name: 'chore_id', type: 'relation', required: true, options: { collectionId: 'chores', maxSelect: 1 } },
        { name: 'student_id', type: 'relation', required: true, options: { collectionId: 'students', maxSelect: 1 } },
        { name: 'date', type: 'date', required: true },
        { name: 'status', type: 'select', options: { maxSelect: 1, values: ['open', 'done'] } }
      ],
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: '@request.auth.id != "" && @request.auth.role = "teacher"',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id'
    });

    // 'chores'
    await db.collection('chores').create({
      name: 'chores',
      type: 'base',
      schema: [
        { name: 'user_id', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
        { name: 'description', type: 'text', required: true },
        { name: 'due_date', type: 'date', required: true },
        { name: 'class_id', type: 'relation', options: { collectionId: 'classes', maxSelect: 1 } }
      ],
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: '@request.auth.id != "" && @request.auth.role = "teacher"',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id'
    });

    // 'classes'
    await db.collection('classes').create({
      name: 'classes',
      type: 'base',
      schema: [
        { name: 'user_id', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
        { name: 'name', type: 'text', required: true },
        { name: 'teacher_id', type: 'relation', options: { collectionId: 'users', maxSelect: 1 } }
      ],
      listRule: 'user_id = @request.auth.id || teacher_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id || teacher_id = @request.auth.id',
      createRule: '@request.auth.id != "" && @request.auth.role = "teacher"',
      updateRule: 'user_id = @request.auth.id || teacher_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id || teacher_id = @request.auth.id'
    });

    // 'competencies'
    await db.collection('competencies').create({
      name: 'competencies',
      type: 'base',
      schema: [
        { name: 'user_id', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
        { name: 'description', type: 'text', required: true },
        { name: 'subject', type: 'relation', options: { collectionId: 'subjects', maxSelect: 1 } },
        { name: 'level', type: 'number' }
      ],
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: '@request.auth.id != "" && @request.auth.role = "teacher"',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id'
    });

    // 'daily_notes'
    await db.collection('daily_notes').create({
      name: 'daily_notes',
      type: 'base',
      schema: [
        { name: 'user_id', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
        { name: 'date', type: 'date', required: true },
        { name: 'content', type: 'text', required: true },
        { name: 'student_id', type: 'relation', options: { collectionId: 'students', maxSelect: 1 } },
        { name: 'class_id', type: 'relation', options: { collectionId: 'classes', maxSelect: 1 } }
      ],
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: '@request.auth.id != "" && @request.auth.role = "teacher"',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id'
    });

    // 'fachbereiche'
    await db.collection('fachbereiche').create({
      name: 'fachbereiche',
      type: 'base',
      schema: [
        { name: 'user_id', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' }
      ],
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: '@request.auth.id != "" && @request.auth.role = "teacher"',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id'
    });

    // 'holidays'
    await db.collection('holidays').create({
      name: 'holidays',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'start_date', type: 'date', required: true },
        { name: 'end_date', type: 'date', required: true },
        { name: 'type', type: 'select', options: { maxSelect: 1, values: ['vacation', 'holiday', 'training'] } }
      ],
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && @request.auth.role = "teacher"',
      updateRule: '@request.auth.id != "" && @request.auth.role = "teacher"',
      deleteRule: '@request.auth.id != "" && @request.auth.role = "teacher"'
    });

    // 'lessons'
    await db.collection('lessons').create({
      name: 'lessons',
      type: 'base',
      schema: [
        { name: 'user_id', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
        { name: 'subject', type: 'relation', required: true, options: { collectionId: 'subjects', maxSelect: 1 } },
        { name: 'day_of_week', type: 'select', required: true, options: { maxSelect: 1, values: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] } },
        { name: 'period_slot', type: 'number', required: true },
        { name: 'start_time', type: 'text' },
        { name: 'end_time', type: 'text' },
        { name: 'week_number', type: 'number', required: true },
        { name: 'description', type: 'text' },
        { name: 'yearly_lesson_id', type: 'relation', options: { collectionId: 'yearly_lessons', maxSelect: 1 } },
        { name: 'second_yearly_lesson_id', type: 'relation', options: { collectionId: 'yearly_lessons', maxSelect: 1 } },
        { name: 'topic_id', type: 'relation', options: { collectionId: 'topics', maxSelect: 1 } },
        { name: 'is_double_lesson', type: 'bool' },
        { name: 'is_exam', type: 'bool' },
        { name: 'is_allerlei', type: 'bool' },
        { name: 'is_half_class', type: 'bool' },
        { name: 'allerlei_subjects', type: 'json' },
        { name: 'allerlei_yearly_lesson_ids', type: 'json' },
        { name: 'steps', type: 'json' }
      ],
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: '@request.auth.id != "" && @request.auth.role = "teacher"',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id'
    });

    // 'performances'
    await db.collection('performances').create({
      name: 'performances',
      type: 'base',
      schema: [
        { name: 'user_id', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
        { name: 'student_id', type: 'relation', required: true, options: { collectionId: 'students', maxSelect: 1 } },
        { name: 'lesson_id', type: 'relation', required: true, options: { collectionId: 'lessons', maxSelect: 1 } },
        { name: 'score', type: 'number', required: true },
        { name: 'date', type: 'date', required: true }
      ],
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: '@request.auth.id != "" && @request.auth.role = "teacher"',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id'
    });

    // 'settings' (global, kein user_id, oder user-spezifisch?)
    await db.collection('settings').create({
      name: 'settings',
      type: 'base',
      schema: [
        { name: 'user_id', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
        { name: 'startTime', type: 'text' },
        { name: 'lessonsPerDay', type: 'number' },
        { name: 'lessonDuration', type: 'number' },
        { name: 'shortBreak', type: 'number' },
        { name: 'morningBreakAfter', type: 'number' },
        { name: 'morningBreakDuration', type: 'number' },
        { name: 'lunchBreakAfter', type: 'number' },
        { name: 'lunchBreakDuration', type: 'number' },
        { name: 'afternoonBreakAfter', type: 'number' },
        { name: 'afternoonBreakDuration', type: 'number' },
        { name: 'cellWidth', type: 'number' },
        { name: 'cellHeight', type: 'number' }
      ],
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: '@request.auth.id != "" && @request.auth.role = "teacher"',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id'
    });

    // 'students'
    await db.collection('students').create({
      name: 'students',
      type: 'base',
      schema: [
        { name: 'user_id', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
        { name: 'name', type: 'text', required: true },
        { name: 'class_id', type: 'relation', required: true, options: { collectionId: 'classes', maxSelect: 1 } },
        { name: 'email', type: 'email' }
      ],
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: '@request.auth.id != "" && @request.auth.role = "teacher"',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id'
    });

    // 'ueberfachliche_kompetenzen'
    await db.collection('ueberfachliche_kompetenzen').create({
      name: 'ueberfachliche_kompetenzen',
      type: 'base',
      schema: [
        { name: 'user_id', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
        { name: 'description', type: 'text', required: true },
        { name: 'competency_id', type: 'relation', options: { collectionId: 'competencies', maxSelect: 1 } }
      ],
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: '@request.auth.id != "" && @request.auth.role = "teacher"',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id'
    });
  },

  down: async (db) => {
    await db.collection('announcements').delete();
    await db.collection('chore_assignments').delete();
    await db.collection('chores').delete();
    await db.collection('classes').delete();
    await db.collection('competencies').delete();
    await db.collection('daily_notes').delete();
    await db.collection('fachbereiche').delete();
    await db.collection('holidays').delete();
    await db.collection('lessons').delete();
    await db.collection('performances').delete();
    await db.collection('settings').delete();
    await db.collection('students').delete();
    await db.collection('subjects').delete();
    await db.collection('topics').delete();
    await db.collection('ueberfachliche_kompetenzen').delete();
    await db.collection('yearly_lessons').delete();
  }
};