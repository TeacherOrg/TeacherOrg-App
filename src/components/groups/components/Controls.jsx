import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Shuffle, Trash2 } from "lucide-react";
import { SavedGroupSetsSelect } from "./SavedGroupSetsSelect";

export function Controls({
  classes,
  activeClassId,
  onClassChange,
  numGroups,
  setNumGroups,
  onCreateGroups,
  onRandomize,
  onClearGroups,
  savedGroupSets,
  onSaveCurrent,
  onLoadSet,
  onDeleteSet,
  onRenameSet,
  disabled
}) {
  return (
    <div className="bg-white dark:bg-slate-800 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200 dark:border-slate-700 p-6">
      <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-4">Steuerung</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600 dark:text-slate-300">Klasse wählen</label>
          <Select value={activeClassId || ''} onValueChange={onClassChange} disabled={classes.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder="Wähle eine Klasse" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            value={numGroups}
            onChange={e => setNumGroups(parseInt(e.target.value) || 1)}
            onFocus={(e) => e.target.select()}
            className="w-24 px-3 py-2 border rounded-2xl bg-white dark:bg-slate-700"
          />
          <Button
            onClick={onCreateGroups}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg rounded-2xl"
            disabled={!activeClassId}
            >
            Gruppen erstellen
            </Button>
        </div>

        <Button
            onClick={onRandomize}
            variant="outline"
            className="w-full bg-[linear-gradient(to_right,#10b981,#3b82f6,#8b5cf6,#f97316)] text-white font-semibold shadow-lg hover:opacity-90 border-0"
            disabled={disabled}
        >
            <Shuffle className="w-4 h-4 mr-2" />
            Zufällig verteilen
        </Button>

        <Button onClick={onClearGroups} variant="outline" className="w-full" disabled={disabled}>
          <Trash2 className="w-4 h-4 mr-2" /> Alle Gruppen löschen
        </Button>

        <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
          <label className="text-sm font-medium text-gray-600 dark:text-slate-300 block mb-2">
            Gespeicherte Gruppensets
          </label>
          <SavedGroupSetsSelect
            savedGroupSets={savedGroupSets}
            onLoad={onLoadSet}
            onDelete={onDeleteSet}
            onRename={onRenameSet}
            onSaveCurrent={onSaveCurrent}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}