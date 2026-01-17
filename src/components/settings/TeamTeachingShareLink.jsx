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
import { Link2, Loader2, AlertCircle, Users, Eye, Edit, Copy, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { useTeamTeaching } from '@/hooks/useTeamTeaching';

export default function TeamTeachingShareLink({
  isOpen,
  onClose,
  classData,
  onSuccess
}) {
  const [permissionLevel, setPermissionLevel] = useState('view_only');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const { generateInviteLink } = useTeamTeaching();

  const handleClose = () => {
    setPermissionLevel('view_only');
    setError('');
    setIsLoading(false);
    setGeneratedLink('');
    setCopied(false);
    onClose();
  };

  const handleGenerateLink = async () => {
    setError('');
    setIsLoading(true);

    try {
      const result = await generateInviteLink(classData.id, permissionLevel, classData.name);

      if (result.success) {
        setGeneratedLink(result.link);
        toast.success('Einladungslink wurde generiert!');
        onSuccess?.();
      } else {
        setError(result.error || 'Ein Fehler ist aufgetreten');
      }
    } catch (err) {
      console.error('Error generating invite link:', err);
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Link wurde in die Zwischenablage kopiert!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying link:', err);
      toast.error('Fehler beim Kopieren');
    }
  };

  if (!classData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white z-[1001]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Link2 className="w-5 h-5 text-purple-400" />
            Einladungslink generieren
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Teilen Sie diesen Link mit einer anderen Lehrperson, um sie einzuladen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Klassen-Info */}
          <div className="p-4 rounded-lg border border-slate-600 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-600">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white truncate">
                  {classData.name || 'Unbekannte Klasse'}
                </h4>
                <p className="text-sm text-slate-400">
                  Einladungslink erstellen
                </p>
              </div>
            </div>
          </div>

          {!generatedLink ? (
            <>
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

              {/* Ablauf-Info */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-900/30 border border-amber-700/50 text-amber-300">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">Der Link ist 7 Tage gueltig.</span>
              </div>
            </>
          ) : (
            <>
              {/* Generierter Link */}
              <div className="space-y-2">
                <Label className="text-slate-300">
                  Ihr Einladungslink
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={generatedLink}
                    className="bg-slate-800 border-slate-600 text-white font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Erfolgsinfo */}
              <div className="space-y-2 p-3 rounded-lg bg-green-900/30 border border-green-700/50 text-green-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">Link wurde erstellt!</span>
                </div>
                <p className="text-xs text-green-400/80">
                  Teilen Sie diesen Link per WhatsApp, E-Mail oder andere Wege.
                  Der Link ist 7 Tage gueltig und kann nur einmal verwendet werden.
                </p>
              </div>

              {/* Berechtigungs-Badge */}
              <div className="flex items-center gap-2">
                {permissionLevel === 'view_only' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-900/50 text-blue-300 border border-blue-700/50">
                    <Eye className="w-3 h-3" />
                    Nur Einsicht
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-900/50 text-green-300 border border-green-700/50">
                    <Edit className="w-3 h-3" />
                    Vollzugriff
                  </span>
                )}
              </div>
            </>
          )}

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
            {generatedLink ? 'Schliessen' : 'Abbrechen'}
          </Button>
          {!generatedLink && (
            <Button
              type="button"
              onClick={handleGenerateLink}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generiere...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Link generieren
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
