import { useOnboarding, TUTORIAL_IDS } from '@/components/onboarding/OnboardingProvider';

/**
 * Hook für Tutorial-Funktionalität
 *
 * Verwendung:
 * const { showTutorial, completeTutorial, isCompleted, progress } = useTutorial();
 *
 * // Tutorial anzeigen
 * showTutorial('timetable');
 *
 * // Prüfen ob abgeschlossen
 * if (!isCompleted('timetable')) { ... }
 */
export function useTutorial() {
  const onboarding = useOnboarding();

  return {
    // State
    activeTutorial: onboarding.activeTutorial,
    completedTutorials: onboarding.completedTutorials,
    showSetupWizard: onboarding.showSetupWizard,
    isLoading: onboarding.isLoading,
    progress: onboarding.progress,

    // Actions
    showTutorial: onboarding.showTutorial,
    closeTutorial: onboarding.closeTutorial,
    completeTutorial: onboarding.completeTutorial,
    isCompleted: onboarding.isCompleted,
    resetTutorial: onboarding.resetTutorial,
    resetAllTutorials: onboarding.resetAllTutorials,
    completeSetupWizard: onboarding.completeSetupWizard,
    triggerTutorialForRoute: onboarding.triggerTutorialForRoute,
    setShowSetupWizard: onboarding.setShowSetupWizard,

    // Constants
    TUTORIAL_IDS,
  };
}

export { TUTORIAL_IDS };
export default useTutorial;
