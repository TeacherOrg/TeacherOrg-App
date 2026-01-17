import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2, Users, Eye, Edit, Bell, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useTeamTeaching } from '@/hooks/useTeamTeaching';
import { formatPermissionLevel } from '@/utils/teamTeachingUtils';

/**
 * Modal für Team Teaching Einladungen
 * Wird automatisch nach Login angezeigt, wenn Einladungen vorhanden sind
 */
const TeamTeachingInvitationsModal = ({ isOpen, onClose, onUpdate }) => {
  const [processingId, setProcessingId] = useState(null);
  const { pendingInvitations, acceptInvitation, declineInvitation } = useTeamTeaching();

  const handleAccept = async (invitationId) => {
    setProcessingId(invitationId);
    try {
      const result = await acceptInvitation(invitationId);
      if (result.success) {
        toast.success('Einladung akzeptiert! Die Klasse ist nun verfügbar.');
        onUpdate?.();

        // Auto-close modal wenn keine Einladungen mehr übrig
        if (pendingInvitations.length === 1) {
          onClose();
        }
      } else {
        toast.error(result.error || 'Fehler beim Akzeptieren');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId) => {
    setProcessingId(invitationId);
    try {
      const result = await declineInvitation(invitationId);
      if (result.success) {
        toast.success('Einladung abgelehnt');
        onUpdate?.();

        // Auto-close modal wenn keine Einladungen mehr übrig
        if (pendingInvitations.length === 1) {
          onClose();
        }
      } else {
        toast.error(result.error || 'Fehler beim Ablehnen');
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-white">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-600 shadow-lg">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            Team Teaching Einladungen
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Sie haben {pendingInvitations.length} ausstehende Einladung{pendingInvitations.length !== 1 ? 'en' : ''} zum gemeinsamen Unterrichten.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[50vh] overflow-y-auto space-y-3 pr-1">
          {pendingInvitations.map((invitation) => (
            <div
              key={invitation.id}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 shadow-md flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white text-lg">
                    {invitation.className}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Von: {invitation.ownerEmail || invitation.expand?.owner_id?.email || 'Unbekannt'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {invitation.permission_level === 'view_only' ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">
                          {formatPermissionLevel(invitation.permission_level)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                        <Edit className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">
                          {formatPermissionLevel(invitation.permission_level)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                  onClick={() => handleDecline(invitation.id)}
                  disabled={processingId === invitation.id}
                >
                  {processingId === invitation.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-1" />
                      Ablehnen
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleAccept(invitation.id)}
                  disabled={processingId === invitation.id}
                >
                  {processingId === invitation.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Akzeptieren
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
          >
            Später entscheiden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamTeachingInvitationsModal;
