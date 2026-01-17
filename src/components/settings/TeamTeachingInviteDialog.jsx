import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2, AlertCircle, Users, Eye, Edit } from "lucide-react";
import { toast } from "sonner";
import { useTeamTeaching } from '@/hooks/useTeamTeaching';
import { formatPermissionLevel } from '@/utils/teamTeachingUtils';

export default function TeamTeachingInviteDialog({
  isOpen,
  onClose,
  classData,
  onSuccess
}) {
  const [email, setEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState('view_only');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { sendInvitation } = useTeamTeaching();

  const handleClose = () => {
    setEmail('');
    setPermissionLevel('view_only');
    setError('');
    setIsLoading(false);
    onClose();
  };

  const handleInvite = async () => {
    setError('');

    // E-Mail Validierung
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Bitte geben Sie eine gueltige E-Mail-Adresse ein');
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendInvitation(classData.id, email, permissionLevel, classData.name);

      if (result.success) {
        toast.success(`Einladung an ${email.trim()} gesendet!`);
        onSuccess?.();
        handleClose();
      } else {
        setError(result.error || 'Ein Fehler ist aufgetreten');
      }
    } catch (err) {
      console.error('Error inviting co-teacher:', err);
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!classData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white z-[1001]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-blue-400" />
            Co-Teacher einladen
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Laden Sie eine andere Lehrperson ein, diese Klasse mitzuverwalten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Klassen-Info */}
          <div className="p-4 rounded-lg border border-slate-600 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white truncate">
                  {classData.name || 'Unbekannte Klasse'}
                </h4>
                <p className="text-sm text-slate-400">
                  Team Teaching aktivieren
                </p>
              </div>
            </div>
          </div>

          {/* E-Mail Eingabe */}
          <div className="space-y-2">
            <Label htmlFor="invite-email" className="text-slate-300">
              E-Mail-Adresse der Lehrperson
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="kollege@schule.ch"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              disabled={isLoading}
            />
          </div>

          {/* Berechtigungsstufe */}
          <div className="space-y-2">
            <Label className="text-slate-300">
              Berechtigungsstufe
            </Label>
            <Select value={permissionLevel} onValueChange={setPermissionLevel} disabled={isLoading}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 z-[1002]">
                <SelectItem value="view_only" className="text-white">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-400" />
                    <span>Nur Einsicht</span>
                  </div>
                </SelectItem>
                <SelectItem value="full_access" className="text-white">
                  <div className="flex items-center gap-2">
                    <Edit className="w-4 h-4 text-green-400" />
                    <span>Vollzugriff</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              {permissionLevel === 'view_only'
                ? 'Kann Stundenplan, Noten und Schueler einsehen, aber nicht bearbeiten.'
                : 'Kann alles bearbeiten wie Sie selbst.'
              }
            </p>
          </div>

          {/* Fehlermeldung */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleInvite}
            disabled={isLoading || !email.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sende...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Einladen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
