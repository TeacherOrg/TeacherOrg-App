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
import { BookOpen, User, Mail, FileText, X, Check, Clock } from "lucide-react";

export default function ReceivedTopicModal({
  isOpen,
  onClose,
  sharedTopic,
  onAccept,
  onReject
}) {
  if (!sharedTopic) return null;

  const topicData = sharedTopic.topic_snapshot || {};
  const lessonsData = sharedTopic.lessons_snapshot || [];
  const senderName = sharedTopic.sender_name || 'Unbekannt';
  const senderEmail = sharedTopic.sender_email || '';

  // Format date
  const sharedDate = sharedTopic.shared_at
    ? new Date(sharedTopic.shared_at).toLocaleDateString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-xl">
            <BookOpen className="w-6 h-6 text-blue-400" />
            Geteiltes Thema erhalten
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Ein Benutzer hat ein Thema mit Ihnen geteilt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sender Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">{senderName}</p>
              <p className="text-sm text-slate-400 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {senderEmail}
              </p>
            </div>
            {sharedDate && (
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {sharedDate}
              </div>
            )}
          </div>

          {/* Topic Preview - vereinfacht */}
          <div
            className="p-4 rounded-lg border border-slate-600"
            style={{ backgroundColor: `${topicData.color || '#3b82f6'}15` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: topicData.color || '#3b82f6' }}
              >
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-lg text-white">
                  {topicData.name || 'Unbenanntes Thema'}
                </h4>
                <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {lessonsData.length} Lektion{lessonsData.length !== 1 ? 'en' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Info */}
          <p className="text-sm text-slate-400">
            Wenn Sie dieses Thema uebernehmen, wird eine Kopie in Ihrem Account erstellt.
            Sie koennen dann das Fach waehlen und die Lektionen in Ihrer Jahresuebersicht platzieren.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onReject}
            className="border-red-600 text-red-400 hover:bg-red-900/30"
          >
            <X className="w-4 h-4 mr-2" />
            Ablehnen
          </Button>
          <Button
            type="button"
            onClick={onAccept}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            Uebernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
