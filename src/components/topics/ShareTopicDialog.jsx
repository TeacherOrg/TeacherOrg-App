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
import { Share2, Loader2, AlertCircle, CheckCircle2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import pb from '@/api/pb';
import { SharedTopic } from '@/api/entities';
import { findUserByEmail } from '@/api/userService';

export default function ShareTopicDialog({
  isOpen,
  onClose,
  topic,
  yearlyLessons = [],
  departmentName = null
}) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');

  // Filter lessons belonging to this topic and sort by week/lesson number
  // IMPORTANT: Sorting ensures correct order when receiver assigns lessons
  const topicLessons = yearlyLessons
    .filter(l => l.topic_id === topic?.id)
    .sort((a, b) => {
      // First sort by week
      if (a.week_number !== b.week_number) {
        return a.week_number - b.week_number;
      }
      // Then by lesson number
      return a.lesson_number - b.lesson_number;
    });

  const handleClose = () => {
    setRecipientEmail('');
    setError('');
    setIsValidating(false);
    setIsSharing(false);
    onClose();
  };

  const handleShare = async () => {
    setError('');
    setIsValidating(true);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      setError('Bitte geben Sie eine gueltige E-Mail-Adresse ein');
      setIsValidating(false);
      return;
    }

    const trimmedEmail = recipientEmail.trim().toLowerCase();

    // Cannot share with yourself
    if (trimmedEmail === pb.authStore.model?.email?.toLowerCase()) {
      setError('Sie koennen nicht an sich selbst teilen');
      setIsValidating(false);
      return;
    }

    // Check if recipient exists
    const recipient = await findUserByEmail(trimmedEmail);
    if (!recipient) {
      setError('Kein Benutzer mit dieser E-Mail-Adresse gefunden');
      setIsValidating(false);
      return;
    }

    setIsValidating(false);
    setIsSharing(true);

    try {
      // Create topic snapshot (exclude user-specific fields)
      const topicSnapshot = {
        name: topic.name || topic.title || 'Unbenanntes Thema',
        description: topic.description || '',
        color: topic.color || '#3b82f6',
        goals: topic.goals || '',
        materials: topic.materials || [],
        lehrplan_kompetenz_ids: topic.lehrplan_kompetenz_ids || [],
        estimated_lessons: topic.estimated_lessons || 0,
        fachbereich_name: departmentName || null
      };

      // Create lessons snapshot (only content, no positioning)
      const lessonsSnapshot = topicLessons.map(lesson => ({
        name: lesson.name || '',
        notes: lesson.notes || '',
        steps: lesson.steps || [],
        is_exam: lesson.is_exam || false,
        is_double_lesson: lesson.is_double_lesson || false
      }));

      // Save to shared_topics
      await SharedTopic.create({
        sender_id: pb.authStore.model.id,
        sender_email: pb.authStore.model.email,
        sender_name: pb.authStore.model.name || pb.authStore.model.username || 'Unbekannt',
        recipient_id: recipient.id,
        recipient_email: trimmedEmail,
        status: 'pending',
        topic_snapshot: topicSnapshot,
        lessons_snapshot: lessonsSnapshot,
        shared_at: new Date().toISOString()
      });

      toast.success(`Thema erfolgreich an ${trimmedEmail} geteilt!`);
      handleClose();
    } catch (error) {
      console.error('Error sharing topic:', error);
      toast.error('Fehler beim Teilen des Themas');
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSharing(false);
    }
  };

  const isLoading = isValidating || isSharing;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Share2 className="w-5 h-5 text-blue-400" />
            Thema teilen
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Teilen Sie dieses Thema mit einem anderen Benutzer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Topic Preview */}
          <div
            className="p-4 rounded-lg border border-slate-600"
            style={{ backgroundColor: `${topic?.color || '#3b82f6'}20` }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: topic?.color || '#3b82f6' }}
              >
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white truncate">
                  {topic?.name || topic?.title || 'Unbenanntes Thema'}
                </h4>
                <p className="text-sm text-slate-400 mt-1">
                  {topicLessons.length} Lektion{topicLessons.length !== 1 ? 'en' : ''} enthalten
                </p>
              </div>
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="recipient-email" className="text-slate-300">
              E-Mail-Adresse des Empfaengers
            </Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="beispiel@email.com"
              value={recipientEmail}
              onChange={(e) => {
                setRecipientEmail(e.target.value);
                setError('');
              }}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
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
            onClick={handleShare}
            disabled={isLoading || !recipientEmail.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isValidating ? 'Pruefe...' : 'Teile...'}
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Teilen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
