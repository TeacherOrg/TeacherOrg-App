import React from 'react';
import { Calendar, BookOpen, ArrowRight, Link2, Grid } from 'lucide-react';
import { TutorialDialog } from '../TutorialDialog';
import { useTutorial, TUTORIAL_IDS } from '@/hooks/useTutorial';

const YEARLY_SLIDES = [
  {
    id: 'welcome',
    title: 'Willkommen in der Jahresansicht!',
    content: 'Die Jahresansicht zeigt Ihnen alle Lektionen eines Schuljahres auf einen Blick. Hier planen Sie Ihre Unterrichtseinheiten für das ganze Jahr.',
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    id: 'grid',
    title: 'Das Jahresraster',
    content: 'Jede Zeile repräsentiert eine Schulwoche, jede Spalte ein Fach. So sehen Sie sofort, wann welche Themen behandelt werden.',
    icon: <Grid className="w-5 h-5" />,
  },
  {
    id: 'add-lessons',
    title: 'Lektionen hinzufügen',
    content: 'Klicken Sie auf eine leere Zelle, um eine neue Lektion für diese Woche und dieses Fach zu erstellen. Geben Sie Thema, Materialien und Notizen ein.',
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    id: 'connection',
    title: 'Verbindung zum Stundenplan',
    content: 'Die hier erstellten Lektionen erscheinen automatisch im Stundenpool der entsprechenden Woche. Von dort können Sie sie per Drag & Drop in den Wochenplan ziehen.',
    icon: <Link2 className="w-5 h-5" />,
  },
  {
    id: 'topics',
    title: 'Themen zuweisen',
    content: 'Ordnen Sie Lektionen einem Thema zu, um den Lernfortschritt besser zu verfolgen. Themen können in der Themenansicht verwaltet werden.',
    icon: <ArrowRight className="w-5 h-5" />,
  },
];

export function YearlyTutorial() {
  const { activeTutorial, closeTutorial, completeTutorial } = useTutorial();

  const isOpen = activeTutorial === TUTORIAL_IDS.YEARLY;

  const handleComplete = () => {
    completeTutorial(TUTORIAL_IDS.YEARLY);
  };

  return (
    <TutorialDialog
      isOpen={isOpen}
      onClose={closeTutorial}
      onComplete={handleComplete}
      title="Jahresansicht Guide"
      slides={YEARLY_SLIDES}
    />
  );
}

export default YearlyTutorial;
