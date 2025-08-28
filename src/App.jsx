// src/App.jsx
import React, { useEffect, useState } from 'react';
import './App.css';
import Pages from "@/pages/index.jsx";
import { Toaster } from "@/components/ui/toaster";
import Login from "@/components/auth/Login";  // Deine neue Login-Komponente
import { supabase } from '@/api/supabase';  // Der Client
import CalendarLoader from "@/components/ui/CalendarLoader";  // Für Loading-State

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aktuelle Session laden
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Auf Auth-Änderungen hören (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <CalendarLoader />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <>
      <Pages />
      <Toaster />
    </>
  );
}

export default App;