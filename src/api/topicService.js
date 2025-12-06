// api/services/topicService.js  (oder direkt in entities.js)

import { Topic, YearlyLesson } from '@/api/entities';
import { toast } from 'sonner';

export const deleteTopicWithLessons = async (topicId) => {
  if (!topicId) {
    toast.error('Kein Thema angegeben');
    return false;
  }

  // Bonus: Prüfe vorher, ob das Topic noch existiert
  let topicExists = true;
  try {
    await Topic.getOne(topicId);
  } catch (err) {
    if (err.status === 404) topicExists = false;
  }

  if (!topicExists) {
    toast.info('Thema wurde bereits gelöscht');
    return false;
  }

  try {
    // 1. Zuerst alle zugehörigen Lektionen löschen
    const lessons = await YearlyLesson.list({ topic_id: topicId });

    if (lessons.length > 0) {
      const ids = lessons.map(l => l.id);
      await Promise.all(ids.map(id => YearlyLesson.delete(id)));
      toast.success(`${lessons.length} Jahreslektion${lessons.length === 1 ? '' : 'en'} gelöscht`);
    }

    // 2. Jetzt das Topic löschen – aber 404 ist OK!
    try {
      await Topic.delete(topicId);
      toast.success('Thema gelöscht');
    } catch (deleteError) {
      if (deleteError.status === 404 || deleteError.message?.includes('not found')) {
        // Thema war schon weg → alles gut!
        console.log('Thema war bereits gelöscht (404) – kein Problem');
        toast.success('Thema und Lektionen erfolgreich bereinigt');
      } else {
        // Echter Fehler
        throw deleteError;
      }
    }

    return true;

  } catch (error) {
    console.error('Unerwarteter Fehler beim Löschen:', error);
    toast.error('Fehler beim Löschen der Lektionen');
    return false;
  }
};