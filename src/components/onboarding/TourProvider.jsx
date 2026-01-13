import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '@/api/pb';
import { TOURS } from './tours/tourDefinitions';
import { listenForTourEvent } from './tours/tourEvents';

const TourContext = createContext(null);

export function TourProvider({ children }) {
  const navigate = useNavigate();
  const [activeTour, setActiveTour] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedTours, setCompletedTours] = useState([]);
  const [skipAllTours, setSkipAllTours] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [droppedDay, setDroppedDay] = useState(null);

  // Load from PocketBase on mount
  useEffect(() => {
    const loadTourState = async () => {
      try {
        const user = pb.authStore.model;
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Load completed tours
        const completed = user.tour_preferences?.completed_tours || [];
        setCompletedTours(Array.isArray(completed) ? completed : []);

        const skipAll = user.tour_preferences?.skip_all_tours || false;
        setSkipAllTours(skipAll);

        setIsLoading(false);
      } catch (error) {
        console.error('[Tour] Error loading tour state:', error);
        setIsLoading(false);
      }
    };

    loadTourState();
  }, []);

  const startTour = useCallback((tourId) => {
    if (skipAllTours || completedTours.includes(tourId)) {
      console.log('[Tour] Skipping tour (already completed or all tours skipped):', tourId);
      return;
    }

    const tour = TOURS[tourId];
    if (!tour) {
      console.error('[Tour] Tour not found:', tourId);
      return;
    }

    console.log('[Tour] Starting tour:', tourId);
    setActiveTour(tour);
    setCurrentStep(0);

    // Save to PocketBase
    const user = pb.authStore.model;
    if (user) {
      pb.collection('users').update(user.id, {
        'tour_progress.current_tour': tourId,
        'tour_progress.current_step': 0,
        'tour_progress.last_visited': new Date().toISOString()
      }).catch(err => {
        if (err?.message?.includes('autocancelled') || err?.name === 'AbortError') return;
        console.error('[Tour] Error saving tour progress:', err);
      });
    }
  }, [skipAllTours, completedTours]);

  const nextStep = useCallback(() => {
    if (!activeTour) return;

    const nextStepIndex = currentStep + 1;

    if (nextStepIndex >= activeTour.steps.length) {
      // Tour completed
      completeTour();
    } else {
      setCurrentStep(nextStepIndex);

      // Emit step change event for components to react
      const nextStepData = activeTour.steps[nextStepIndex];
      window.dispatchEvent(new CustomEvent('tour-step-change', {
        detail: { stepId: nextStepData.id, stepIndex: nextStepIndex }
      }));

      // Save to PocketBase
      const user = pb.authStore.model;
      if (user) {
        pb.collection('users').update(user.id, {
          'tour_progress.current_step': nextStepIndex
        }).catch(err => {
          if (err?.message?.includes('autocancelled') || err?.name === 'AbortError') return;
          console.error('[Tour] Error saving step progress:', err);
        });
      }
    }
  }, [activeTour, currentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);

      // Save to PocketBase
      const user = pb.authStore.model;
      if (user) {
        pb.collection('users').update(user.id, {
          'tour_progress.current_step': prevStepIndex
        }).catch(err => {
          if (err?.message?.includes('autocancelled') || err?.name === 'AbortError') return;
          console.error('[Tour] Error saving step progress:', err);
        });
      }
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    if (!activeTour) return;

    console.log('[Tour] Skipping tour:', activeTour.id);
    setActiveTour(null);
    setCurrentStep(0);

    // Clear tour progress
    const user = pb.authStore.model;
    if (user) {
      pb.collection('users').update(user.id, {
        'tour_progress.current_tour': null,
        'tour_progress.current_step': 0
      }).catch(err => {
        if (err?.message?.includes('autocancelled') || err?.name === 'AbortError') return;
        console.error('[Tour] Error clearing tour progress:', err);
      });
    }
  }, [activeTour]);

  const completeTour = useCallback(() => {
    if (!activeTour) return;

    console.log('[Tour] Completing tour:', activeTour.id);
    const newCompleted = [...completedTours, activeTour.id];
    setCompletedTours(newCompleted);
    setActiveTour(null);
    setCurrentStep(0);

    // Save to PocketBase
    const user = pb.authStore.model;
    if (user) {
      pb.collection('users').update(user.id, {
        'tour_preferences.completed_tours': newCompleted,
        'tour_progress.current_tour': null,
        'tour_progress.current_step': 0
      }).catch(err => {
        if (err?.message?.includes('autocancelled') || err?.name === 'AbortError') return;
        console.error('[Tour] Error saving completed tour:', err);
      });
    }
  }, [activeTour, completedTours]);

  // Handle auto-navigation for 'navigate' type steps
  useEffect(() => {
    if (!activeTour) return;

    const step = activeTour.steps[currentStep];
    if (step?.type === 'navigate') {
      console.log('[Tour] Auto-navigating to:', step.route);
      navigate(step.route);

      // Auto-advance after navigation (delay for page to fully render)
      setTimeout(() => {
        nextStep();
      }, 600);
    }
  }, [activeTour, currentStep, navigate, nextStep]);

  // Listen for tour events and auto-advance when actions complete
  useEffect(() => {
    if (!activeTour || !activeTour.isInteractive) return;

    const step = activeTour.steps[currentStep];
    if (!step?.waitForAction) return;

    console.log('[Tour] Waiting for action:', step.waitForAction);

    // Listen for the specific action
    const cleanup = listenForTourEvent(step.waitForAction, (data) => {
      console.log('[Tour] Action completed:', step.waitForAction, data);

      // Capture dropped day for daily view navigation
      if (step.waitForAction === 'double-lesson-placed' && data?.day) {
        setDroppedDay(data.day);
      }

      // Save completed action to progress
      const user = pb.authStore.model;
      if (user) {
        pb.collection('users').update(user.id, {
          'tour_progress.completed_actions': [
            ...(user.tour_progress?.completed_actions || []),
            step.waitForAction
          ]
        }).catch(err => {
          if (err?.message?.includes('autocancelled') || err?.name === 'AbortError') return;
          console.error('[Tour] Error saving completed action:', err);
        });
      }

      // Auto-advance to next step after a short delay
      setTimeout(() => {
        nextStep();
      }, 250);
    });

    return cleanup;
  }, [activeTour, currentStep, nextStep]);

  const value = {
    activeTour,
    currentStep,
    completedTours,
    skipAllTours,
    isLoading,
    droppedDay,
    startTour,
    nextStep,
    previousStep,
    skipTour,
    completeTour,
    setSkipAllTours
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
