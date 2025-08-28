import { useState } from 'react';
import { pb } from '@/entities'; 

const ResetPasswordRequest = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await pb.collection('users').requestPasswordReset(email);
      setMessage('Reset-Link wurde gesendet! Überprüfe deine E-Mail.');
    } catch (err) {
      setError(`Fehler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleReset}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Deine E-Mail"
        required
      />
      <button type="submit" disabled={loading}>
        Passwort zurücksetzen
      </button>
      {error && <p className="text-red-500">{error}</p>}
      {message && <p>{message}</p>}
    </form>
  );
};

export default ResetPasswordRequest;