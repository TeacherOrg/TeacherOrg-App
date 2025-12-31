// src/components/topics/tabs/GeneralTab.jsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Palette, Plus } from "lucide-react";

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981',
  '#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#64748b'
];

export function GeneralTab({
  formData,
  onUpdateField,
  departments = [],
  newDepartmentName,
  onNewDepartmentNameChange,
  onAddDepartment
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Titel */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-xs md:text-sm font-semibold text-slate-300">
            Thema Titel
          </Label>
          <Input
            id="title"
            value={formData.name || ""}
            onChange={(e) => onUpdateField('name', e.target.value)}
            placeholder="z.B. Quadratische Gleichungen"
            required
            className="bg-slate-800 border-slate-600 text-sm md:text-base py-2 md:py-3"
          />
        </div>

        {/* Fachbereich */}
        {departments.length > 0 && (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="department" className="text-xs md:text-sm font-semibold text-slate-300">
              Fachbereich (optional)
            </Label>
            <Select
              value={formData.department}
              onValueChange={(value) => onUpdateField('department', value)}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-sm md:text-base py-2 md:py-3">
                <SelectValue placeholder="Fachbereich wählen" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 mt-2">
              <Input
                value={newDepartmentName}
                onChange={(e) => onNewDepartmentNameChange(e.target.value)}
                placeholder="Neuer Fachbereich..."
                className="bg-slate-800 border-slate-600 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddDepartment}
                className="border-slate-600"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Farbe */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-xs md:text-sm font-semibold text-slate-300">
          <Palette className="w-4 h-4" />
          Farbe
        </Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                formData.color === color
                  ? 'border-white scale-110 shadow-lg'
                  : 'border-slate-600 hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => onUpdateField('color', color)}
            />
          ))}
          <input
            type="color"
            value={formData.color || "#3b82f6"}
            onChange={(e) => onUpdateField('color', e.target.value)}
            className="w-10 h-8 rounded-md border-2 border-slate-600 cursor-pointer bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}

export default GeneralTab;
