import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Save, FolderOpen } from "lucide-react";

export function SavedGroupSetsSelect({
  savedGroupSets,
  onLoad,
  onDelete,
  onSaveCurrent,
  disabled
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSetName, setNewSetName] = useState("");

  const handleSave = () => {
    if (newSetName.trim()) {
      onSaveCurrent(newSetName.trim());
      setNewSetName("");
      setIsDialogOpen(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
            onClick={() => setIsDialogOpen(true)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg rounded-2xl"
            disabled={disabled}
        >
            <Save className="w-4 h-4 mr-2" />
            Aktuelle Gruppen speichern
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gruppenset speichern</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Name für das Gruppenset..."
              autoFocus
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-xl"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={!newSetName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {savedGroupSets.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {savedGroupSets.map(set => (
            <div
              key={set.id}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <button
                onClick={() => onLoad(set.id)}
                className="flex items-center gap-2 flex-1 text-left text-sm font-medium text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <FolderOpen className="w-4 h-4 text-gray-400" />
                {set.name}
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full shrink-0"
                onClick={() => onDelete(set.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-2">
          Keine gespeicherten Sets
        </p>
      )}
    </div>
  );
}