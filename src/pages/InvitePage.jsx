import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, Eye, Edit, Check, X, Loader2, AlertCircle, Clock, UserPlus, LogIn } from 'lucide-react';
import { useTeamTeaching } from '@/hooks/useTeamTeaching';
import pb from '@/api/pb';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const { getInviteByToken, acceptInviteByToken } = useTeamTeaching();
  const isLoggedIn = pb.authStore.isValid && pb.authStore.model;

  // Load invitation data
  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setError('Kein Einladungstoken angegeben');
        setIsLoading(false);
        return;
      }

      try {
        const result = await getInviteByToken(token);
        if (result.success) {
          setInvitation(result.invitation);
        } else {
          setError(result.error);
        }
      } catch (err) {
        console.error('Error loading invitation:', err);
        setError('Fehler beim Laden der Einladung');
      } finally {
        setIsLoading(false);
      }
    };

    loadInvitation();
  }, [token, getInviteByToken]);

  const handleAccept = async () => {
    if (!isLoggedIn) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }

    setIsAccepting(true);
    try {
      const result = await acceptInviteByToken(token);
      if (result.success) {
        setAccepted(true);
        toast.success('Einladung angenommen! Die Klasse wurde hinzugefuegt.');
        // Wait a moment then redirect
        setTimeout(() => {
          navigate('/Timetable');
        }, 2000);
      } else {
        toast.error(result.error || 'Fehler beim Akzeptieren');
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      toast.error('Fehler beim Akzeptieren der Einladung');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-slate-400">Einladung wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8 text-center"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Einladung nicht gefunden</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Button
            onClick={() => navigate('/')}
            className="bg-slate-700 hover:bg-slate-600 text-white"
          >
            Zur Startseite
          </Button>
        </motion.div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-green-700/50 p-8 text-center"
        >
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Erfolgreich beigetreten!</h1>
          <p className="text-slate-400 mb-6">
            Die Klasse "{invitation?.className}" wurde zu Ihrem Account hinzugefuegt.
            Sie werden jetzt weitergeleitet...
          </p>
          <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Team Teaching Einladung</h1>
          <p className="text-purple-200 mt-2">
            Sie wurden eingeladen, eine Klasse mitzuverwalten
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Class Info */}
          <div className="p-4 rounded-xl bg-slate-700/50 border border-slate-600">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-600">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-white truncate">
                  {invitation?.className || 'Unbekannte Klasse'}
                </h3>
                {invitation?.ownerEmail && (
                  <p className="text-sm text-slate-400">
                    Eingeladen von: {invitation.ownerEmail}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Permission Level */}
          <div className="p-4 rounded-xl bg-slate-700/50 border border-slate-600">
            <p className="text-sm text-slate-400 mb-2">Ihre Berechtigung:</p>
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${
              invitation?.permission_level === 'view_only'
                ? 'bg-blue-900/50 border border-blue-700/50'
                : 'bg-green-900/50 border border-green-700/50'
            }`}>
              {invitation?.permission_level === 'view_only' ? (
                <>
                  <Eye className="w-5 h-5 text-blue-400" />
                  <span className="font-medium text-blue-300">Nur Einsicht</span>
                </>
              ) : (
                <>
                  <Edit className="w-5 h-5 text-green-400" />
                  <span className="font-medium text-green-300">Vollzugriff</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {invitation?.permission_level === 'view_only'
                ? 'Sie koennen alle Daten einsehen, aber nicht bearbeiten.'
                : 'Sie koennen alle Daten einsehen und bearbeiten wie der Besitzer.'
              }
            </p>
          </div>

          {/* Expiry Info */}
          {invitation?.invite_expires_at && (
            <div className="flex items-center gap-2 text-sm text-amber-400/80">
              <Clock className="w-4 h-4" />
              <span>
                Gueltig bis: {new Date(invitation.invite_expires_at).toLocaleDateString('de-CH', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}

          {/* Not Logged In Warning */}
          {!isLoggedIn && (
            <div className="p-4 rounded-xl bg-amber-900/30 border border-amber-700/50 text-amber-300">
              <div className="flex items-center gap-2 mb-2">
                <LogIn className="w-5 h-5" />
                <span className="font-medium">Anmeldung erforderlich</span>
              </div>
              <p className="text-sm text-amber-300/80">
                Sie muessen angemeldet sein, um diese Einladung anzunehmen.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={isAccepting}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <X className="w-4 h-4 mr-2" />
              Ablehnen
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isAccepting}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird angenommen...
                </>
              ) : !isLoggedIn ? (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Anmelden & Annehmen
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Annehmen
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
