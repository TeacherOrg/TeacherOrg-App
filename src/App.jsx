import React, { useEffect, useState } from 'react';
import './App.css';
import Pages from "@/pages/index.jsx";
import { Toaster as HotToastToaster } from 'react-hot-toast';
import Login from "@/components/auth/Login";
import pb from '@/api/pb';
import { User } from '@/api/entities';
import CalendarLoader from "@/components/ui/CalendarLoader";
import AuthGuard from '@/components/auth/AuthGuard';
import ErrorBoundary from '@/components/ErrorBoundary';
import debounce from 'lodash/debounce';
import { version } from '../package.json';
import UpdateModal from '@/components/ui/UpdateModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLessonStore } from '@/store';
// Onboarding imports
import { OnboardingProvider, useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { SetupWizard } from '@/components/onboarding/SetupWizard';
import { TimetableTutorial } from '@/components/onboarding/tutorials/TimetableTutorial';
import { YearlyTutorial } from '@/components/onboarding/tutorials/YearlyTutorial';
import { GroupsTutorial } from '@/components/onboarding/tutorials/GroupsTutorial';
import { TopicsTutorial } from '@/components/onboarding/tutorials/TopicsTutorial';
import { GradesTutorial } from '@/components/onboarding/tutorials/GradesTutorial';
import { HelpButton } from '@/components/onboarding/HelpButton';

// Erstelle eine Instanz von QueryClient
const queryClient = new QueryClient();

// Onboarding Content Component - renders all onboarding UI
function OnboardingContent() {
  const { showSetupWizard, completeSetupWizard } = useOnboarding();

  return (
    <>
      {/* Setup Wizard for first-time users */}
      <SetupWizard
        isOpen={showSetupWizard}
        onComplete={completeSetupWizard}
      />
      {/* Feature Tutorials */}
      <TimetableTutorial />
      <YearlyTutorial />
      <GroupsTutorial />
      <TopicsTutorial />
      <GradesTutorial />
      {/* Help Button */}
      <HelpButton />
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false); // New state for modal

  useEffect(() => {
    const checkAuth = debounce(async () => {
      try {
        if (pb.authStore.isValid) {
          await pb.collection('users').authRefresh({ signal: AbortSignal.timeout(5000) }); // Add timeout
          setUser(pb.authStore.model || null);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }, 100); // Debounce for 100ms to prevent rapid calls

    checkAuth();

    const unsubscribe = pb.authStore.onChange((token, model) => {
      console.log('App.jsx: Auth changed, new user:', model);
      // Bei Logout: Cache und Store leeren
      if (!model) {
        queryClient.clear();
        useLessonStore.getState().clearAll();
      }
      setUser(model || null);
    });

    // Logout-Event abfangen (von entities.js und SettingsModal.jsx)
    const handleLogoutEvent = () => {
      queryClient.clear();
      useLessonStore.getState().clearAll();
    };
    window.addEventListener('user-logout', handleLogoutEvent);

    return () => {
      unsubscribe();
      checkAuth.cancel(); // Cancel debounced calls on cleanup
      window.removeEventListener('user-logout', handleLogoutEvent);
    };
  }, []);

  // New effect for update check
  useEffect(() => {
    if (user) {
      const storedVersion = localStorage.getItem('appVersion');
      if (storedVersion !== version) {
        setShowUpdateModal(true);
        localStorage.setItem('appVersion', version);
      }
      // Kommentiere aus: View-Creation hier verursacht 403 – erstelle manuell im PB-Admin
      // createLehrplanWahlView();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <CalendarLoader />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={(loggedUser) => setUser(loggedUser)} />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OnboardingProvider>
          <AuthGuard>
            <Pages />
          </AuthGuard>
          {/* Onboarding Components */}
          <OnboardingContent />
          <HotToastToaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#ffffff',
                border: '1px solid #475569',
              },
              error: {
                style: {
                  background: '#7f1d1d',
                  color: '#ffffff',
                },
              },
            }}
          />
          <UpdateModal
            isOpen={showUpdateModal}
            onClose={() => setShowUpdateModal(false)}
            version={version}
          />
        </OnboardingProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;