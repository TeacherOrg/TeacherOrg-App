// src/App.jsx
import React, { useEffect, useState } from 'react';
import './App.css';
import Pages from "@/pages/index.jsx";
import { Toaster } from "@/components/ui/toaster";
import Login from "@/components/auth/Login";  
import pb from '@/api/pb';  
import { User } from '@/api/entities';  
import CalendarLoader from "@/components/ui/CalendarLoader";  // Für Loading-State
import AuthGuard from '@/components/auth/AuthGuard';  // Neu: Import des AuthGuards

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Normaler Auth-Check (kein Bypass)
    const currentUser = User.current();
    console.log('App.jsx: Current User?', currentUser); // Sollte null sein bei neuem Browser
    setUser(currentUser);
    setLoading(false);

    // Listener für Auth-Changes (z. B. nach Login/Logout)
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model || null);
    });

    return () => unsubscribe();  // Cleanup
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
    <>
      <AuthGuard>  {/* Neu: Wrap um Pages für protected Routes */}
        <Pages />
      </AuthGuard>
      <Toaster />
    </>
  );
}

export default App;