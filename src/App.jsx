import React, { useEffect, useState } from 'react';
import './App.css';
import Pages from "@/pages/index.jsx";
import { Toaster as HotToastToaster } from 'react-hot-toast';
import Login from "@/components/auth/Login";
import pb from '@/api/pb';
import { User } from '@/api/entities';
import CalendarLoader from "@/components/ui/CalendarLoader";
import ErrorBoundary from '@/components/ErrorBoundary';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Landing from '@/pages/Landing';
import Privacy from '@/pages/Privacy';
import InvitePage from '@/pages/InvitePage';
import debounce from 'lodash/debounce';
import { version } from '../package.json';
import UpdateModal from '@/components/ui/UpdateModal';
import { queryClient } from '@/lib/queryClient';
import { useLessonStore } from '@/store';
// Onboarding imports
import { OnboardingProvider, useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { SetupWizard } from '@/components/onboarding/SetupWizard';
import { TourProvider } from '@/components/onboarding/TourProvider';
import { TourSpotlight } from '@/components/onboarding/TourSpotlight';
import { usePostLoginInit } from '@/hooks/usePostLoginInit';
import { TimetableTutorial } from '@/components/onboarding/tutorials/TimetableTutorial';
import { YearlyTutorial } from '@/components/onboarding/tutorials/YearlyTutorial';
import { GroupsTutorial } from '@/components/onboarding/tutorials/GroupsTutorial';
import { TopicsTutorial } from '@/components/onboarding/tutorials/TopicsTutorial';
import { GradesTutorial } from '@/components/onboarding/tutorials/GradesTutorial';
import { HelpButton } from '@/components/onboarding/HelpButton';
import TeamTeachingInvitationsModal from '@/components/settings/TeamTeachingInvitationsModal';
import { useTeamTeaching } from '@/hooks/useTeamTeaching';

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
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showInvitationsModal, setShowInvitationsModal] = useState(false);

  // Team Teaching Einladungen
  const { pendingInvitations } = useTeamTeaching();

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

  // Daten nach Login initialisieren
  usePostLoginInit(user);

  // Team Teaching Einladungen-Popup nach Login anzeigen
  useEffect(() => {
    if (user && pendingInvitations.length > 0 && !showUpdateModal) {
      // Kleine Verzögerung damit das UpdateModal zuerst angezeigt werden kann
      const timer = setTimeout(() => {
        setShowInvitationsModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, pendingInvitations.length, showUpdateModal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <CalendarLoader />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {/* HotToast und UpdateModal auf Top-Level */}
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
      <TeamTeachingInvitationsModal
        isOpen={showInvitationsModal}
        onClose={() => setShowInvitationsModal(false)}
        onUpdate={() => {
          // Query-Cache invalidieren damit Klassen neu geladen werden
          queryClient.invalidateQueries(['classes']);
          queryClient.invalidateQueries(['timetable']);
        }}
      />

      {/* Router mit Public & Protected Routes */}
      <Routes>
        {/* Public Route: Login */}
        <Route path="/login" element={<Login />} />

        {/* Public Route: Landing */}
        <Route path="/landing" element={<Landing />} />

        {/* Public Route: Datenschutzerklärung */}
        <Route path="/privacy" element={<Privacy />} />

        {/* Public Route: Team Teaching Einladungslink */}
        <Route path="/invite/:token" element={<InvitePage />} />

        {/* Protected Routes: Alle anderen Seiten */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <TourProvider>
                <OnboardingProvider>
                  <Pages />
                  <OnboardingContent />
                  <TourSpotlight />
                </OnboardingProvider>
              </TourProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;