import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2, Users, Eye, Edit, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useTeamTeaching } from '@/hooks/useTeamTeaching';
import { formatPermissionLevel } from '@/utils/teamTeachingUtils';

export default function TeamTeachingInvitations({ onUpdate }) {
  const [processingId, setProcessingId] = useState(null);
  const { pendingInvitations, acceptInvitation, declineInvitation } = useTeamTeaching();

  const handleAccept = async (invitationId) => {
    setProcessingId(invitationId);
    try {
      const result = await acceptInvitation(invitationId);
      if (result.success) {
        toast.success('Einladung akzeptiert! Die Klasse ist nun verfuegbar.');
        onUpdate?.();
      } else {
        toast.error(result.error || 'Fehler beim Akzeptieren');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId) => {
    if (!window.confirm('Möchten Sie diese Einladung wirklich ablehnen?')) {
      return;
    }

    setProcessingId(invitationId);
    try {
      const result = await declineInvitation(invitationId);
      if (result.success) {
        toast.success('Einladung abgelehnt');
        onUpdate?.();
      } else {
        toast.error(result.error || 'Fehler beim Ablehnen');
      }
    } finally {
      setProcessingId(null);
    }
  };

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-700">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-blue-400" />
        <h4 className="text-base font-semibold text-white">
          Team Teaching Einladungen ({pendingInvitations.length})
        </h4>
      </div>

      <div className="space-y-3">
        {pendingInvitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-800 border border-slate-700"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  {invitation.className}
                </p>
                <p className="text-sm text-slate-400">
                  Von: {invitation.expand?.owner_id?.email || invitation.owner_id}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {invitation.permission_level === 'view_only' ? (
                    <Eye className="w-3 h-3 text-blue-400" />
                  ) : (
                    <Edit className="w-3 h-3 text-green-400" />
                  )}
                  <span className="text-xs text-slate-500">
                    {formatPermissionLevel(invitation.permission_level)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-900/30"
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
    </div>
  );
}
