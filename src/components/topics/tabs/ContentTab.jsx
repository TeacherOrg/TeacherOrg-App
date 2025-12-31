// src/components/topics/tabs/ContentTab.jsx
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BookOpen, Target } from "lucide-react";

export function ContentTab({ formData, onUpdateField }) {
  return (
    <div className="space-y-4">
      {/* Lernziele */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs md:text-sm font-semibold text-slate-300">
          <Target className="w-4 h-4" />
          Lernziele
        </Label>
        <Textarea
          value={formData.goals || ""}
          onChange={(e) => onUpdateField('goals', e.target.value)}
          placeholder="Was sollen die Schüler am Ende des Themas können?"
          className="bg-slate-800 border-slate-600 min-h-[120px] text-sm"
        />
      </div>

      {/* Beschreibung */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs md:text-sm font-semibold text-slate-300">
          <BookOpen className="w-4 h-4" />
          Beschreibung
        </Label>
        <Textarea
          value={formData.description || ""}
          onChange={(e) => onUpdateField('description', e.target.value)}
          placeholder="Zusätzliche Informationen zum Thema..."
          className="bg-slate-800 border-slate-600 min-h-[100px] text-sm"
        />
      </div>
    </div>
  );
}

export default ContentTab;
