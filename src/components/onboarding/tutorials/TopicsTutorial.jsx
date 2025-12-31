import React from 'react';
import { BookOpen, FolderTree, BarChart3, Link2, CheckCircle } from 'lucide-react';
import { TutorialDialog } from '../TutorialDialog';
import { useTutorial, TUTORIAL_IDS } from '@/hooks/useTutorial';

const TOPICS_SLIDES = [
  {
    id: 'welcome',
    title: 'Willkommen in der Themenansicht!',
    content: 'Die Themenansicht hilft Ihnen, Ihre Unterrichtsinhalte thematisch zu organisieren und den Lernfortschritt zu verfolgen.',
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    id: 'structure',
    title: 'Themenstruktur',
    content: 'Erstellen Sie Themen für jedes Fach und organisieren Sie diese hierarchisch. So behalten Sie den Überblick über alle Lerninhalte.',
    icon: <FolderTree className="w-5 h-5" />,
  },
  {
    id: 'assign',
    title: 'Lektionen zuordnen',
    content: 'Ordnen Sie Ihre Jahres- und Wochenlektionen den entsprechenden Themen zu. Dies ermöglicht eine bessere Planung und Übersicht.',
    icon: <Link2 className="w-5 h-5" />,
  },
  {
    id: 'progress',
    title: 'Fortschritt verfolgen',
    content: 'Sehen Sie auf einen Blick, welche Themen bereits behandelt wurden und welche noch ausstehen. Der Fortschrittsbalken zeigt den Status.',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    id: 'complete',
    title: 'Themen abschliessen',
    content: 'Markieren Sie Themen als abgeschlossen, wenn alle zugehörigen Lektionen unterrichtet wurden.',
    icon: <CheckCircle className="w-5 h-5" />,
  },
];

export function TopicsTutorial() {
  const { activeTutorial, closeTutorial, completeTutorial } = useTutorial();

  const isOpen = activeTutorial === TUTORIAL_IDS.TOPICS;

  const handleComplete = () => {
    completeTutorial(TUTORIAL_IDS.TOPICS);
  };

  return (
    <TutorialDialog
      isOpen={isOpen}
      onClose={closeTutorial}
      onComplete={handleComplete}
      title="Themen Guide"
      slides={TOPICS_SLIDES}
    />
  );
}

export default TopicsTutorial;
