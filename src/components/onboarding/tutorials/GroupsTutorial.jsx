import React from 'react';
import { Users, Shuffle, Save, Eye, Settings } from 'lucide-react';
import { TutorialDialog } from '../TutorialDialog';
import { useTutorial, TUTORIAL_IDS } from '@/hooks/useTutorial';

const GROUPS_SLIDES = [
  {
    id: 'welcome',
    title: 'Willkommen in der Gruppenansicht!',
    content: 'Hier können Sie Ihre Klasse in Gruppen einteilen - für Gruppenarbeiten, Projekte oder unterschiedliche Lerngruppen.',
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 'create',
    title: 'Gruppen erstellen',
    content: 'Erstellen Sie neue Gruppen und geben Sie ihnen aussagekräftige Namen. Sie können beliebig viele Gruppen anlegen.',
    icon: <Settings className="w-5 h-5" />,
  },
  {
    id: 'assign',
    title: 'Schüler zuweisen',
    content: 'Ziehen Sie Schüler per Drag & Drop in die gewünschten Gruppen. Ein Schüler kann auch mehreren Gruppen angehören.',
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 'random',
    title: 'Zufallsgruppen',
    content: 'Nutzen Sie die Zufallsfunktion, um Schüler automatisch auf Gruppen zu verteilen. Ideal für spontane Gruppenarbeiten.',
    icon: <Shuffle className="w-5 h-5" />,
  },
  {
    id: 'save',
    title: 'Gruppen speichern',
    content: 'Speichern Sie häufig verwendete Gruppenkonstellationen, um sie später schnell wiederherzustellen.',
    icon: <Save className="w-5 h-5" />,
  },
];

export function GroupsTutorial() {
  const { activeTutorial, closeTutorial, completeTutorial } = useTutorial();

  const isOpen = activeTutorial === TUTORIAL_IDS.GROUPS;

  const handleComplete = () => {
    completeTutorial(TUTORIAL_IDS.GROUPS);
  };

  return (
    <TutorialDialog
      isOpen={isOpen}
      onClose={closeTutorial}
      onComplete={handleComplete}
      title="Gruppen Guide"
      slides={GROUPS_SLIDES}
    />
  );
}

export default GroupsTutorial;
