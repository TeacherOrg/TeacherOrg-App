// src/components/topics/tabs/CompetenciesTab.jsx
import { useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, Search, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export function CompetenciesTab({
  competencies = [],
  selectedCompetencies = [],
  onToggleCompetency,
  searchTerm,
  onSearchChange,
  cycleFilter,
  onCycleFilterChange,
  isLoading = false,
  subjectName = '',
  onNavigateToCurriculum = null
}) {
  // Gruppiere Kompetenzen nach Hauptbereich und Unterbereich
  const groupedCompetencies = useMemo(() => {
    let filtered = competencies;

    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.beschreibung?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.kompetenz_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.hauptbereich?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by cycle
    if (cycleFilter !== 'all') {
      filtered = filtered.filter(c => c.zyklus === cycleFilter);
    }

    // Group by hauptbereich + unterbereich
    const grouped = {};
    filtered.forEach(comp => {
      const key = `${comp.hauptbereich} - ${comp.unterbereich}`;
      if (!grouped[key]) {
        grouped[key] = {
          name: key,
          competencies: []
        };
      }
      grouped[key].competencies.push(comp);
    });

    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
  }, [competencies, searchTerm, cycleFilter]);

  if (isLoading) {
    return (
      <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Lade Lehrplankompetenzen...</p>
      </div>
    );
  }

  if (competencies.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
        <GraduationCap className="w-12 h-12 mx-auto mb-3 text-slate-500" />
        <p className="text-sm text-slate-400">
          Keine Lehrplankompetenzen für "{subjectName || 'dieses Fach'}" verfügbar.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Lehrplankompetenzen können in der Lehrplanansicht importiert werden.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Kompetenzen durchsuchen..."
            className="pl-10 bg-slate-800 border-slate-600 text-white text-sm"
          />
        </div>
        <Select value={cycleFilter} onValueChange={onCycleFilterChange}>
          <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-sm">
            <SelectValue placeholder="Zyklus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="1">Zyklus 1</SelectItem>
            <SelectItem value="2">Zyklus 2</SelectItem>
            <SelectItem value="3">Zyklus 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kompetenzliste */}
      <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
        {groupedCompetencies.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Keine Kompetenzen gefunden</p>
          </div>
        ) : (
          groupedCompetencies.map((group, groupIndex) => (
            <div key={groupIndex} className="border border-slate-700 rounded-lg overflow-hidden">
              <div className="bg-slate-800/80 px-3 py-2">
                <span className="text-sm font-medium text-slate-300">{group.name}</span>
                <span className="text-xs text-slate-500 ml-2">
                  ({group.competencies.length} Kompetenzen)
                </span>
              </div>
              <div className="p-2 space-y-1 bg-slate-800/30">
                {group.competencies.map((comp) => {
                  const isSelected = selectedCompetencies.includes(comp.id);
                  return (
                    <motion.div
                      key={comp.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-900/40 border border-blue-600'
                          : 'hover:bg-slate-700/50 border border-transparent'
                      }`}
                      onClick={() => onToggleCompetency(comp.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-blue-400">
                            {comp.kompetenz_id}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            comp.zyklus === '1' ? 'bg-yellow-900/30 text-yellow-400' :
                            comp.zyklus === '2' ? 'bg-orange-900/30 text-orange-400' :
                            'bg-red-900/30 text-red-400'
                          }`}>
                            Z{comp.zyklus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {comp.beschreibung}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tipp */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
        <p className="text-xs text-blue-300">
          Tipp: Wählen Sie die Lehrplankompetenzen aus, die Sie mit diesem Thema abdecken möchten.
          Der Status wird automatisch in der Lehrplanansicht aktualisiert.
        </p>
      </div>

      {/* Button zur Lehrplanansicht */}
      {onNavigateToCurriculum && (
        <Button
          type="button"
          variant="outline"
          onClick={onNavigateToCurriculum}
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Zur Lehrplanansicht
        </Button>
      )}
    </div>
  );
}

export default CompetenciesTab;
