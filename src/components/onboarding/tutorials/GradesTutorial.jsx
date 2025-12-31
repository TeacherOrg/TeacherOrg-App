import React from 'react';
import { GraduationCap, FileText, BarChart3, Users, Calculator } from 'lucide-react';
import { TutorialDialog } from '../TutorialDialog';
import { useTutorial, TUTORIAL_IDS } from '@/hooks/useTutorial';

const GRADES_SLIDES = [
  {
    id: 'welcome',
    title: 'Willkommen in der Leistungsübersicht!',
    content: 'Hier erfassen und verwalten Sie die Leistungen Ihrer Schüler. Behalten Sie den Überblick über Noten, Tests und Beurteilungen.',
    icon: <GraduationCap className="w-5 h-5" />,
  },
  {
    id: 'add-grades',
    title: 'Noten erfassen',
    content: 'Fügen Sie Noten für Tests, Prüfungen oder andere Leistungsnachweise hinzu. Wählen Sie Fach, Datum und Bewertungsart.',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: 'overview',
    title: 'Übersicht pro Schüler',
    content: 'Sehen Sie alle Leistungen eines Schülers auf einen Blick. Die Übersicht zeigt Durchschnitte und Trends.',
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 'statistics',
    title: 'Klassenstatistik',
    content: 'Analysieren Sie die Leistung der gesamten Klasse mit Durchschnittswerten, Verteilungen und Vergleichen.',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    id: 'calculate',
    title: 'Notenberechnung',
    content: 'Lassen Sie Durchschnitte und Gesamtnoten automatisch berechnen. Gewichten Sie verschiedene Leistungsarten nach Bedarf.',
    icon: <Calculator className="w-5 h-5" />,
  },
];

export function GradesTutorial() {
  const { activeTutorial, closeTutorial, completeTutorial } = useTutorial();

  const isOpen = activeTutorial === TUTORIAL_IDS.GRADES;

  const handleComplete = () => {
    completeTutorial(TUTORIAL_IDS.GRADES);
  };

  return (
    <TutorialDialog
      isOpen={isOpen}
      onClose={closeTutorial}
      onComplete={handleComplete}
      title="Leistung Guide"
      slides={GRADES_SLIDES}
    />
  );
}

export default GradesTutorial;
