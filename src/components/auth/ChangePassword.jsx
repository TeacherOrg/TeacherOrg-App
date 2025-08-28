import { useState, useEffect } from 'react';
import { pb } from '@/entities'; 
import { useRouter } from 'next/router'; // Oder React Router, je nach Framework

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Neu: Bestätigungsfeld hinzufügen
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { token } = router.query; // Token aus URL holen (z.B. /change-password?token=...)

  useEffect(() => {
    if (!token) {
      setError('Ungültiger Reset-Link. Bitte fordern Sie einen neuen an.');
    }
  }, [token]);

  const handleChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await pb.collection('users').confirmPasswordReset(token, newPassword, confirmPassword);
      setMessage('Passwort geändert! Du kannst dich jetzt einloggen.');
      router.push('/login');
    } catch (err) {
      setError(`Fehler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleChange}>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="Neues Passwort"
        required
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Passwort bestätigen"
        required
      />
      <button type="submit" disabled={loading || !token}>
        Passwort ändern
      </button>
      {error && <p className="text-red-500">{error}</p>}
      {message && <p>{message}</p>}
    </form>
  );
};

export default ChangePassword;