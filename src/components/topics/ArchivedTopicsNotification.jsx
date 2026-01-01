import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Archive, FolderInput, X } from "lucide-react";

export default function ArchivedTopicsNotification({
  isOpen,
  onClose,
  archivedCount,
  onReassign
}) {
  const handleNo = () => {
    // Notification für diese Session nicht mehr anzeigen
    sessionStorage.setItem('archiveNotificationDismissed', 'true');
    onClose();
  };

  const handleYes = () => {
    onReassign();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-xl">
            <Archive className="w-6 h-6 text-orange-400" />
            Unverteilte Themen gefunden
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Du hast Themen, die keinem Fach zugeordnet sind.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-800 border border-slate-700">
            <div className="w-12 h-12 rounded-lg bg-orange-600 flex items-center justify-center flex-shrink-0">
              <Archive className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg text-white">
                {archivedCount} unverteilte{archivedCount === 1 ? 's' : ''} Thema{archivedCount !== 1 ? 'en' : ''}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Diese Themen befinden sich im Archiv und warten auf Zuweisung.
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-400 mt-4">
            Moechtest du die Themen jetzt einem Fach zuweisen?
            Du kannst dies auch spaeter im Archiv-Bereich tun.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleNo}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <X className="w-4 h-4 mr-2" />
            Spaeter
          </Button>
          <Button
            type="button"
            onClick={handleYes}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FolderInput className="w-4 h-4 mr-2" />
            Jetzt verteilen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
