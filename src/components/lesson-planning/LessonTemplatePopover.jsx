// src/components/lesson-planning/LessonTemplatePopover.jsx
import React, { useState, useEffect } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Copy, Trash2, Loader2, Save } from "lucide-react";
import pb from '@/api/pb';

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function LessonTemplatePopover({
  subjectId,
  onInsert,
  trigger,
  currentSteps,
}) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  // Templates laden, sobald das Popover geöffnet wird
  useEffect(() => {
    if (!open) return;

    setLoading(true);
    pb.collection('lesson_templates')
      .getList(1, 50, {
        filter: `user_id = "${pb.authStore.model?.id || ''}" || is_global = true`,
        sort: '-created',
      })
      .then((res) => {
        setTemplates(res.items);
      })
      .catch((err) => {
        console.error('Fehler beim Laden der Vorlagen:', err);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;

    try {
      const newTemplate = await pb.collection('lesson_templates').create({
        name,
        subject: subjectId || null,
        steps: [], // später kann man hier die aktuellen Schritte speichern
        user_id: pb.authStore.model?.id,
        is_global: false,
      });

      setTemplates([newTemplate, ...templates]);
      setNewName("");
      setIsCreating(false);
    } catch (err) {
      console.error('Fehler beim Erstellen der Vorlage:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Vorlage wirklich löschen?')) return;
    try {
      await pb.collection('lesson_templates').delete(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Löschen fehlgeschlagen:', err);
    }
  };

  const defaultTrigger = (
    <Button type="button" variant="outline" size="sm">
      <Copy className="w-4 h-4 mr-1" />
      Vorlagen
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">Lektionsvorlagen</h4>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCreating(true)}
            title="Neue Vorlage anlegen"
          >
            <PlusCircle className="w-4 h-4" />
          </Button>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-8">
              Noch keine Vorlagen vorhanden
            </p>
          ) : (
            <div className="divide-y">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 group"
                >
                  <button
                    className="text-left flex-1 text-sm truncate pr-2"
                    onClick={() => {
                      const stepsWithNewIds = (t.steps || []).map((s) => ({
                        ...s,
                        id: generateId(),
                      }));
                      // templateName als zweiter Parameter übergeben
                      onInsert(stepsWithNewIds, t.name);
                      setOpen(false);
                    }}
                  >
                    {t.name}
                    {t.steps?.length > 0 && (
                      <span className="text-xs text-slate-500 ml-2">
                        ({t.steps.length} Schritt{t.steps.length !== 1 ? 'e' : ''})
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={async () => {
                        if (!confirm(`Vorlage "${t.name}" überschreiben?`)) return;

                        try {
                          await pb.collection('lesson_templates').update(t.id, {
                            steps: currentSteps,
                          });
                          import('react-hot-toast').then(({ toast }) => toast.success("Vorlage aktualisiert!"));
                          setOpen(false);
                        } catch (err) {
                          import('react-hot-toast').then(({ toast }) => toast.error("Fehler beim Aktualisieren"));
                        }
                      }}
                      title="Vorlage mit aktuellen Schritten überschreiben"
                    >
                      <Save className="w-4 h-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isCreating && (
          <div className="p-3 border-t space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Name der Vorlage"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <Button size="sm" onClick={handleCreate}>
                OK
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsCreating(false);
                  setNewName("");
                }}
              >
                Abbrechen
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Hinweis: Schritte werden beim späteren „Speichern als Vorlage“ übernommen.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}