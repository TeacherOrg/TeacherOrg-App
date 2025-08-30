// src/components/auth/Login.jsx
import React, { useState } from 'react';
import pb from '@/api/pb';  // Direkter Import von pb (aus pb.js)
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Neu: Import für Select (aus shadcn/ui, falls installiert)

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // Vorherig: Für username
  const [role, setRole] = useState('teacher'); // Neu: State für role, default 'teacher'
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
          username, // Vorherig
          email,
          password,
          passwordConfirm: password,
          role, // Neu: Gesendete Rolle (required, wenn nonempty aktiviert)
          emailVisibility: true, // Optional
        });
        // Sende Verification-Email
        await pb.collection('users').requestVerification(email);
        setMessage('Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mail zur Bestätigung.');
      } else {
        // Login (kein role needed)
        result = await pb.collection('users').authWithPassword(email, password);
        onLogin(result.record);
      }
    } catch (err) {
      const errorDetails = err.data ? JSON.stringify(err.data) : err.message;
      setError(`Fehler: ${errorDetails}`);
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
          {isRegister && ( // Username nur bei Registrierung
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Benutzername (erforderlich)"
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          )}
          {isRegister && ( // Neu: Role-Select nur bei Registrierung
            <div>
              <label className="text-white mb-2 block">Rolle auswählen (erforderlich)</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Rolle wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
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