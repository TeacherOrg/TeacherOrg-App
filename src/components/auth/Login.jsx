// src/components/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import pb from '@/api/pb';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import auditLogger from '@/services/auditLogger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'; // shadcn/ui Dialog

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-fill email from URL parameter (for QR-code login)
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState(''); // Vollständiger Name für Anzeige
  const [role, setRole] = useState('teacher');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // --- Zustände für Passwort-vergessen-Dialog ---
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  // Redirect wenn bereits eingeloggt
  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.model) {
      const defaultPage = pb.authStore.model.default_start_page || 'Timetable';
      navigate(`/${defaultPage}`, { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isRegister) {
        await pb.collection('users').create({
          username,
          name, // Vollständiger Name für Anzeige
          email,
          password,
          passwordConfirm: password,
          role,
          emailVisibility: true,
        });
        await pb.collection('users').requestVerification(email);
        setMessage('Registrierung erfolgreich! Bitte prüfe deine E-Mail zur Bestätigung.');
      } else {
        const authData = await pb.collection('users').authWithPassword(email, password);

        // Audit-Logging: Erfolgreicher Login
        await auditLogger.logLogin(authData.record.id, authData.record.email);

        const defaultPage = authData.record.default_start_page || 'Timetable';
        navigate(`/${defaultPage}`, { replace: true });
      }
    } catch (err) {
      // Audit-Logging: Fehlgeschlagener Login
      if (!isRegister) {
        await auditLogger.logFailedLogin(email, err.message);
      }
      setError(err.message || JSON.stringify(err.data));
    } finally {
      setLoading(false);
    }
  };

  // --- Passwort-Reset-Logik ---
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    setResetLoading(true);

    try {
      await pb.collection('users').requestPasswordReset(resetEmail);
      setResetMessage('Ein Link zum Zurücksetzen des Passworts wurde an deine E-Mail gesendet.');
    } catch (err) {
      setResetError(err.message || 'Etwas ist schiefgelaufen – existiert die E-Mail?');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {isRegister ? 'Registrieren' : 'Anmelden'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vollstaendiger Name (z.B. Max Mustermann)"
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Benutzername (erforderlich)"
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </>
          )}

          {isRegister && (
            <div>
              <label className="text-white block mb-1 text-sm">Rolle</label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Rolle wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="teacher">Lehrer/in</SelectItem>
                  <SelectItem value="student">Schüler/in</SelectItem>
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

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Laden...' : isRegister ? 'Registrieren' : 'Anmelden'}
          </Button>
        </form>

        {/* Passwort vergessen Link */}
        {!isRegister && (
          <Button
            variant="link"
            onClick={() => {
              setResetEmail(email); // vorausgefüllt mit bereits eingegebener E-Mail
              setResetOpen(true);
            }}
            className="w-full mt-2 text-slate-400 text-sm"
          >
            Passwort vergessen?
          </Button>
        )}

        <Button
          variant="link"
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-4 text-slate-400"
        >
          {isRegister ? '→ Zur Anmeldung' : 'Neu hier? Jetzt registrieren'}
        </Button>

        {/* Link zur Datenschutzerklärung */}
        <div className="mt-6 text-center">
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
          >
            Datenschutzerklärung
          </a>
        </div>
      </div>

      {/* ----------------- Passwort-Reset Dialog ----------------- */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle>Passwort zurücksetzen</DialogTitle>
            <DialogDescription className="text-slate-400">
              Gib deine E-Mail-Adresse ein – wir schicken dir einen Link zum Zurücksetzen.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordReset} className="space-y-4 mt-4">
            <Input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="E-Mail-Adresse"
              className="bg-slate-700 border-slate-600 text-white"
              required
            />

            {resetError && (
              <Alert variant="destructive">
                <AlertDescription>{resetError}</AlertDescription>
              </Alert>
            )}

            {resetMessage && (
              <Alert variant="success">
                <AlertDescription>{resetMessage}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setResetOpen(false)}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={resetLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {resetLoading ? 'Sendet...' : 'Link anfordern'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}