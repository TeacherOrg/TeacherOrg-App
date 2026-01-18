/**
 * Migration Script: Setzt class_id für alle Lessons basierend auf deren Subject
 *
 * EINMALIG AUSFÜHREN als Lehrer eingeloggt!
 *
 * Verwendung in der Browser-Console:
 * 1. Als Lehrer einloggen
 * 2. In der Console ausführen:
 *    import('/src/utils/migrateClassIdToLessons.js').then(m => m.migrateClassIdToLessons())
 */

import pb from '@/api/pb';

export async function migrateClassIdToLessons() {
  const userId = pb.authStore.model?.id;

  if (!userId) {
    console.error('❌ Nicht eingeloggt!');
    return;
  }

  console.log('🚀 Starte Migration: class_id für Lessons setzen...');
  console.log('👤 User:', userId);

  try {
    // 1. Lade alle Lessons des Users
    const lessons = await pb.collection('lessons').getFullList({
      filter: `user_id = '${userId}'`,
      expand: 'subject',
    });

    console.log(`📚 ${lessons.length} Lessons gefunden`);

    // 2. Zähle Lessons ohne class_id
    const lessonsWithoutClassId = lessons.filter(l => !l.class_id);
    console.log(`⚠️ ${lessonsWithoutClassId.length} Lessons ohne class_id`);

    if (lessonsWithoutClassId.length === 0) {
      console.log('✅ Alle Lessons haben bereits eine class_id!');
      return { updated: 0, total: lessons.length };
    }

    // 3. Lade alle Subjects für class_id Mapping
    const subjects = await pb.collection('subjects').getFullList({
      filter: `user_id = '${userId}'`,
    });

    const subjectClassMap = {};
    subjects.forEach(s => {
      if (s.class_id) {
        subjectClassMap[s.id] = s.class_id;
      }
    });

    console.log(`📖 ${subjects.length} Subjects geladen, ${Object.keys(subjectClassMap).length} mit class_id`);

    // 4. Update Lessons mit class_id vom Subject
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const lesson of lessonsWithoutClassId) {
      const subjectId = lesson.subject;
      const classId = subjectClassMap[subjectId];

      if (!classId) {
        console.warn(`⚠️ Lesson ${lesson.id}: Subject ${subjectId} hat keine class_id`);
        skipped++;
        continue;
      }

      try {
        await pb.collection('lessons').update(lesson.id, {
          class_id: classId,
        });
        updated++;

        if (updated % 50 === 0) {
          console.log(`✓ ${updated} Lessons aktualisiert...`);
        }
      } catch (err) {
        console.error(`❌ Fehler bei Lesson ${lesson.id}:`, err);
        errors++;
      }
    }

    console.log('');
    console.log('=== Migration abgeschlossen ===');
    console.log(`✅ Aktualisiert: ${updated}`);
    console.log(`⚠️ Übersprungen: ${skipped}`);
    console.log(`❌ Fehler: ${errors}`);
    console.log(`📊 Gesamt: ${lessons.length}`);

    return { updated, skipped, errors, total: lessons.length };

  } catch (error) {
    console.error('❌ Migration fehlgeschlagen:', error);
    throw error;
  }
}

// Für einfachen Aufruf aus der Console
window.migrateClassIdToLessons = migrateClassIdToLessons;
