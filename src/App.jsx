// src/App.jsx
import React, { useEffect, useState } from 'react';
import './App.css';
import Pages from "@/pages/index.jsx";
import { Toaster } from "@/components/ui/toaster";
import Login from "@/components/auth/Login";  
import pb from '@/api/pb';  
import { User } from '@/api/entities';  
import CalendarLoader from "@/components/ui/CalendarLoader";  // Für Loading-State

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bypassAuth, setBypassAuth] = useState(true);  // Temporär true für Tests ohne Login

  useEffect(() => {
    if (bypassAuth) {
      // Simuliere User für Tests (deaktiviere Auth)
      setUser({ id: 'test_user', email: 'test@example.com', role: 'admin' });  // Fake-User
      setLoading(false);
    } else {
      // Normaler Auth-Check
      const currentUser = User.current();
      setUser(currentUser);
      setLoading(false);

      const unsubscribe = pb.authStore.onChange((token, model) => {
        setUser(model || null);
      });

      return () => pb.authStore.clear();
    }
  }, [bypassAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <CalendarLoader />
      </div>
    );
  }

  if (!user && !bypassAuth) {
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