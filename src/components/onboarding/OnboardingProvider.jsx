import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import pb from '@/api/pb';

// Tutorial IDs - diese werden im User-Record gespeichert
export const TUTORIAL_IDS = {
  SETUP: 'setup',
  TIMETABLE: 'timetable',
  YEARLY: 'yearly',
  GROUPS: 'groups',
  TOPICS: 'topics',
  GRADES: 'grades',
};

// Mapping von Routes zu Tutorial IDs
export const ROUTE_TUTORIAL_MAP = {
  '/': TUTORIAL_IDS.TIMETABLE,
  '/Timetable': TUTORIAL_IDS.TIMETABLE,
  '/YearlyOverview': TUTORIAL_IDS.YEARLY,
  '/Groups': TUTORIAL_IDS.GROUPS,
  '/Topics': TUTORIAL_IDS.TOPICS,
  '/Grades': TUTORIAL_IDS.GRADES,
};

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  // Query Client für Cache-Invalidierung
  const queryClient = useQueryClient();

  // State
  const [completedTutorials, setCompletedTutorials] = useState([]);
  const [activeTutorial, setActiveTutorial] = useState(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Lade Tutorial-Status beim Mount
  useEffect(() => {
    const loadTutorialStatus = async () => {
      try {
        const user = pb.authStore.model;
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Lade completed_tutorials aus User-Record
        const completed = user.completed_tutorials || [];
        setCompletedTutorials(Array.isArray(completed) ? completed : []);

        // Zeige Setup-Wizard wenn noch nicht abgeschlossen
        if (!user.has_completed_onboarding) {
          setShowSetupWizard(true);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading tutorial status:', error);
        setIsLoading(false);
      }
    };

    loadTutorialStatus();
  }, []);

  // Speichere Tutorial-Status im User-Record
  const saveTutorialStatus = useCallback(async (tutorials) => {
    try {
      const user = pb.authStore.model;
      if (!user) return;

      await pb.collection('users').update(user.id, {
        completed_tutorials: tutorials,
      });
    } catch (error) {
      console.error('Error saving tutorial status:', error);
    }
  }, []);

  // Tutorial als abgeschlossen markieren
  const completeTutorial = useCallback(async (tutorialId) => {
    if (completedTutorials.includes(tutorialId)) return;

    const newCompleted = [...completedTutorials, tutorialId];
    setCompletedTutorials(newCompleted);
    setActiveTutorial(null);
    await saveTutorialStatus(newCompleted);
  }, [completedTutorials, saveTutorialStatus]);

  // Prüfen ob Tutorial abgeschlossen ist
  const isCompleted = useCallback((tutorialId) => {
    return completedTutorials.includes(tutorialId);
  }, [completedTutorials]);

  // Tutorial anzeigen
  const showTutorial = useCallback((tutorialId) => {
    setActiveTutorial(tutorialId);
  }, []);

  // Tutorial schliessen
  const closeTutorial = useCallback(() => {
    setActiveTutorial(null);
  }, []);

  // Tutorial zurücksetzen
  const resetTutorial = useCallback(async (tutorialId) => {
    const newCompleted = completedTutorials.filter(id => id !== tutorialId);
    setCompletedTutorials(newCompleted);
    await saveTutorialStatus(newCompleted);
  }, [completedTutorials, saveTutorialStatus]);

  // Alle Tutorials zurücksetzen
  const resetAllTutorials = useCallback(async () => {
    setCompletedTutorials([]);
    await saveTutorialStatus([]);

    try {
      const user = pb.authStore.model;
      if (user) {
        await pb.collection('users').update(user.id, {
          has_completed_onboarding: false,
        });
        setShowSetupWizard(true);
      }
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }, [saveTutorialStatus]);

  // Setup-Wizard abschliessen
  const completeSetupWizard = useCallback(async () => {
    try {
      const user = pb.authStore.model;
      if (user) {
        const updatedUser = await pb.collection('users').update(user.id, {
          has_completed_onboarding: true,
        });
        // Aktualisiere den authStore mit dem neuen User-Record
        pb.authStore.save(pb.authStore.token, updatedUser);
      }
      setShowSetupWizard(false);
      await completeTutorial(TUTORIAL_IDS.SETUP);

      // Query Cache invalidieren damit Timetable neue Daten lädt
      queryClient.invalidateQueries({ queryKey: ['timetableData'] });
    } catch (error) {
      console.error('Error completing setup wizard:', error);
    }
  }, [completeTutorial, queryClient]);

  // Automatischer Trigger für Feature-Tutorials
  const triggerTutorialForRoute = useCallback((pathname) => {
    const tutorialId = ROUTE_TUTORIAL_MAP[pathname];
    if (tutorialId && !isCompleted(tutorialId) && !showSetupWizard) {
      // Kleiner Delay damit die Seite erst laden kann
      setTimeout(() => {
        showTutorial(tutorialId);
      }, 500);
    }
  }, [isCompleted, showSetupWizard, showTutorial]);

  // Fortschritt berechnen
  const progress = {
    completed: completedTutorials.length,
    total: Object.keys(TUTORIAL_IDS).length,
    percentage: Math.round((completedTutorials.length / Object.keys(TUTORIAL_IDS).length) * 100),
  };

  const value = {
    // State
    completedTutorials,
    activeTutorial,
    showSetupWizard,
    isLoading,
    progress,

    // Actions
    completeTutorial,
    isCompleted,
    showTutorial,
    closeTutorial,
    resetTutorial,
    resetAllTutorials,
    completeSetupWizard,
    triggerTutorialForRoute,
    setShowSetupWizard,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

export default OnboardingProvider;
