import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTutorial, TUTORIAL_IDS } from '@/hooks/useTutorial';
import { useLocation } from 'react-router-dom';

// Mapping von Routes zu Tutorial IDs
const ROUTE_TUTORIAL_MAP = {
  '/': TUTORIAL_IDS.TIMETABLE,
  '/Timetable': TUTORIAL_IDS.TIMETABLE,
  '/YearlyOverview': TUTORIAL_IDS.YEARLY,
  '/Groups': TUTORIAL_IDS.GROUPS,
  '/Topics': TUTORIAL_IDS.TOPICS,
  '/Grades': TUTORIAL_IDS.GRADES,
};

// Tutorial Namen für Anzeige
const TUTORIAL_NAMES = {
  [TUTORIAL_IDS.TIMETABLE]: 'Stundenplan',
  [TUTORIAL_IDS.YEARLY]: 'Jahresansicht',
  [TUTORIAL_IDS.GROUPS]: 'Gruppen',
  [TUTORIAL_IDS.TOPICS]: 'Themen',
  [TUTORIAL_IDS.GRADES]: 'Leistung',
};

export function HelpButton({ variant = 'floating' }) {
  const { showTutorial, isCompleted, progress } = useTutorial();
  const location = useLocation();

  const currentTutorialId = ROUTE_TUTORIAL_MAP[location.pathname];
  const tutorialName = currentTutorialId ? TUTORIAL_NAMES[currentTutorialId] : null;

  const handleClick = () => {
    if (currentTutorialId) {
      showTutorial(currentTutorialId);
    }
  };

  // Only show on pages that have tutorials
  if (!currentTutorialId) {
    return null;
  }

  if (variant === 'floating') {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={handleClick}
          className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
          size="icon"
        >
          <HelpCircle className="w-6 h-6" />
        </Button>
        {progress.completed < progress.total && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
            {progress.total - progress.completed}
          </div>
        )}
      </div>
    );
  }

  // Sidebar/inline variant
  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      size="sm"
      className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
    >
      <HelpCircle className="w-4 h-4 mr-2" />
      {tutorialName} Tutorial
    </Button>
  );
}

export default HelpButton;
