// src/components/topics/tabs/MaterialTab.jsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Package, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const COMMON_MATERIALS = [
  "Dossier", "Arbeitsheft", "Schreibheft", "Buch", "Zirkel",
  "Geodreieck", "Taschenrechner", "Lineal", "IPad", "Laptop",
  "Heft", "Stift", "Farben", "Schere"
];

export function MaterialTab({
  selectedCommon = [],
  customMaterials = [],
  newMaterialName,
  onNewMaterialNameChange,
  onToggleCommonMaterial,
  onAddCustomMaterial,
  onRemoveCustomMaterial
}) {
  return (
    <div className="space-y-4">
      {/* Standard-Materialien */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs md:text-sm font-semibold text-slate-300">
          <Package className="w-4 h-4" />
          Häufige Materialien
        </Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_MATERIALS.map((material) => {
            const isSelected = selectedCommon.includes(material);
            return (
              <button
                key={material}
                type="button"
                onClick={() => onToggleCommonMaterial(material)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {material}
              </button>
            );
          })}
        </div>
      </div>

      {/* Eigene Materialien */}
      <div className="space-y-2">
        <Label className="text-xs md:text-sm font-semibold text-slate-300">
          Eigene Materialien
        </Label>
        <div className="flex gap-2">
          <Input
            value={newMaterialName}
            onChange={(e) => onNewMaterialNameChange(e.target.value)}
            placeholder="Neues Material hinzufügen..."
            className="bg-slate-800 border-slate-600 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddCustomMaterial();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddCustomMaterial}
            className="border-slate-600"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Liste der eigenen Materialien */}
        <AnimatePresence>
          {customMaterials.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 mt-2"
            >
              {customMaterials.map((material, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-900/30 text-green-400 rounded-full text-sm"
                >
                  {material}
                  <button
                    type="button"
                    onClick={() => onRemoveCustomMaterial(index)}
                    className="ml-1 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Zusammenfassung */}
      {(selectedCommon.length > 0 || customMaterials.length > 0) && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
          <Label className="text-xs font-semibold text-slate-400 mb-2 block">
            Ausgewählte Materialien ({selectedCommon.length + customMaterials.length})
          </Label>
          <div className="flex flex-wrap gap-1">
            {[...selectedCommon, ...customMaterials].map((material, index) => (
              <span
                key={index}
                className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded"
              >
                {material}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MaterialTab;
