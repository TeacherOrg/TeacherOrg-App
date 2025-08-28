// src/App.jsx
import React, { useEffect, useState } from 'react';
import './App.css';
import Pages from "@/pages/index.jsx";
import { Toaster } from "@/components/ui/toaster";
import Login from "@/components/auth/Login";  // Deine neue Login-Komponente (angepasst für PocketBase)
import pb from '@/api/pb';  // Dein PocketBase-Client
import { User } from '@/entities';  // Dein User-Objekt aus entities.js
import CalendarLoader from "@/components/ui/CalendarLoader";  // Für Loading-State

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aktuellen User laden
    const currentUser = User.current();  // Oder pb.authStore.model
    setUser(currentUser);
    setLoading(false);

    // Auf Auth-Änderungen hören (Login/Logout)
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model || null);
    });

    return () => {
      // Unsubscribe (PocketBase onChange hat kein direktes unsubscribe, aber clear falls nötig)
      pb.authStore.clear();  // Optional, nur bei Cleanup
    };
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
      <Pages />
      <Toaster />
    </>
  );
}

export default App;