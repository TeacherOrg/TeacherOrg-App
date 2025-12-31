import React from 'react';
import { Calendar, ArrowRight, Copy, Users, BookOpen, Clock } from 'lucide-react';
import { TutorialDialog } from '../TutorialDialog';
import { AnimatedDemo } from '../AnimatedDemo';
import { useTutorial, TUTORIAL_IDS } from '@/hooks/useTutorial';

const TIMETABLE_SLIDES = [
  {
    id: 'welcome',
    title: 'Willkommen im flexiblen Stundenplan!',
    content: 'Der flexible Stundenplan gibt Ihnen volle Kontrolle über Ihre Wochenplanung. Lernen Sie die wichtigsten Funktionen in wenigen Schritten kennen.',
    animation: 'welcome',
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    id: 'yearly-connection',
    title: 'Der Stundenpool',
    content: 'Der Pool rechts zeigt alle verfügbaren Lektionen aus Ihrem Jahresplan. Jede Woche werden automatisch die entsprechenden Lektionen angezeigt, die Sie dann in den Stundenplan ziehen können.',
    animation: 'yearlyConnection',
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    id: 'drag-from-pool',
    title: 'Lektionen aus dem Pool ziehen',
    content: 'Ziehen Sie Fächer aus dem Stundenpool rechts direkt in leere Zeitslots. Die Lektionen werden automatisch mit dem Jahresplan verknüpft.',
    animation: 'dragFromPool',
    icon: <ArrowRight className="w-5 h-5" />,
  },
  {
    id: 'move-lessons',
    title: 'Lektionen verschieben',
    content: 'Bereits geplante Lektionen können einfach per Drag & Drop verschoben oder getauscht werden. Die Inhalte passen sich automatisch an.',
    animation: 'moveLessons',
    icon: <ArrowRight className="w-5 h-5" />,
  },
  {
    id: 'double-lessons',
    title: 'Doppellektionen erstellen',
    content: 'Klicken Sie auf eine Lektion und aktivieren Sie "Doppellektion". Sie können zusätzlich eine zweite Jahreslektion hinzufügen.',
    animation: 'doubleLessons',
    icon: <Clock className="w-5 h-5" />,
  },
  {
    id: 'allerlei-lessons',
    title: 'Allerlei-Lektionen',
    content: 'Kombinieren Sie mehrere Fächer in einer Lektion. Perfekt für fächerübergreifende Projekte oder integrierte Lerneinheiten.',
    animation: 'allerleiLessons',
    icon: <Copy className="w-5 h-5" />,
  },
  {
    id: 'special-types',
    title: 'Besondere Lektionstypen',
    content: 'Nutzen Sie Halbklassen für geteilte Gruppen und markieren Sie Prüfungen für bessere Übersicht.',
    animation: 'specialTypes',
    icon: <Users className="w-5 h-5" />,
  },
];

export function TimetableTutorial() {
  const { activeTutorial, closeTutorial, completeTutorial } = useTutorial();

  const isOpen = activeTutorial === TUTORIAL_IDS.TIMETABLE;

  const handleComplete = () => {
    completeTutorial(TUTORIAL_IDS.TIMETABLE);
  };

  const renderAnimation = (type, isActive) => {
    return <AnimatedDemo type={type} isActive={isActive} />;
  };

  return (
    <TutorialDialog
      isOpen={isOpen}
      onClose={closeTutorial}
      onComplete={handleComplete}
      title="Stundenplan Guide"
      slides={TIMETABLE_SLIDES}
      renderAnimation={renderAnimation}
    />
  );
}

export default TimetableTutorial;
