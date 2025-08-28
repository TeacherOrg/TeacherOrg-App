// src/components/auth/Login.jsx
import React, { useState } from 'react';
import { pb } from '@/entities';  // Importiere den PocketBase-Client aus entities.js
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      let result;
      if (isRegister) {
        // Registrierung: Erstelle User und sende Verification-Email
        result = await pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
          emailVisibility: true, // Optional: Macht E-Mail sichtbar
        });
        // Sende Verification-Email
        await pb.collection('users').requestVerification(email);
        setMessage('Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mail zur Bestätigung.');
      } else {
        // Login
        result = await pb.collection('users').authWithPassword(email, password);
        onLogin(result.record);  // Weiterleiten zur App, passe an pb.authStore.model an falls nötig
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {isRegister ? 'Registrieren' : 'Anmelden'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail-Adresse"
            className="bg-slate-700 border-slate-600 text-white"
            required
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            className="bg-slate-700 border-slate-600 text-white"
            required
          />
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert variant="success">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
            {loading ? 'Laden...' : isRegister ? 'Registrieren' : 'Anmelden'}
          </Button>
        </form>
        <Button
          variant="link"
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-4 text-slate-400"
        >
          {isRegister ? 'Zur Anmeldung' : 'Neu registrieren?'}
        </Button>
      </div>
    </div>
  );
}