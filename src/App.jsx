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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (pb.authStore.isValid) {
          await pb.collection('users').authRefresh();
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
    };

    checkAuth();

    const unsubscribe = pb.authStore.onChange((token, model) => {
      console.log('App.jsx: Auth changed, new user:', model);
      setUser(model || null);
    });

    return () => unsubscribe();
  }, []);

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
      <AuthGuard>
        <Pages />
      </AuthGuard>
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
    </ErrorBoundary>
  );
}

export default App;