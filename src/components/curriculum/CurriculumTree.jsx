import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, Search, CheckCircle2, Circle, Clock, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useCompetencyStatus } from '@/hooks/useCompetencyStatus';
import { useTopics, useLessonStore } from '@/store';
import { toast } from 'sonner';

const CompetencyStatusIcon = ({ status }) => {
  if (status === 'completed') {
    return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  } else if (status === 'in_progress' || status === 'planned') {
    return <Clock className="w-4 h-4 text-blue-500" />;
  }
  return <Circle className="w-4 h-4 text-slate-500" />;
};

// Helper-Funktion für status-basierte Zeilen-Einfärbung
const getStatusRowStyle = (status, isSelectable, isSelected) => {
  if (isSelectable) {
    return isSelected
      ? 'bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500 shadow-lg shadow-blue-500/20 cursor-pointer'
      : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 border-2 border-transparent cursor-pointer';
  }

  // Status-basierte Einfärbung wenn nicht im Auswahl-Modus
  switch (status) {
    case 'completed':
      return 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700/40 hover:bg-green-200 dark:hover:bg-green-900/40';
    case 'in_progress':
    case 'planned':
      return 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700/40 hover:bg-blue-200 dark:hover:bg-blue-900/40';
    default:
      return 'bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-800/50';
  }
};

const CompetencyItem = ({
  competency,
  statusInfo,
  onSelect,
  isSelectable,
  selectedCompetencyIds,
  onManualOverride,
  onClearOverride,
  onDirectOverride,
  onClearDirectOverride,
  canOverride = false
}) => {
  const isSelected = isSelectable && selectedCompetencyIds?.includes(competency.id);
  const status = statusInfo?.status || 'not_started';
  const isManual = statusInfo?.isManual || false;

  const handleOverride = async (newStatus) => {
    // Hole aktuellen Store-Status direkt
    const currentStoreTopics = useLessonStore.getState().topics;
    const topicsWithThisCompetency = currentStoreTopics.filter(t =>
      t.lehrplan_kompetenz_ids?.includes(competency.id)
    );

    console.log('[CurriculumTree.handleOverride] Called with:', {
      newStatus,
      competencyId: competency.id,
      statusInfo,
      hasRelatedTopics: statusInfo?.relatedTopics?.length > 0
    });
    console.log('[CurriculumTree.handleOverride] Direct Store Check:', {
      storeTopicsCount: currentStoreTopics.length,
      topicsWithAnyCompetencies: currentStoreTopics.filter(t => t.lehrplan_kompetenz_ids?.length > 0).map(t => ({
        name: t.name,
        id: t.id,
        kompetenzIds: t.lehrplan_kompetenz_ids
      })),
      topicsWithThisCompetency: topicsWithThisCompetency.map(t => t.name),
      searchingForId: competency.id
    });

    if (onManualOverride && statusInfo?.relatedTopics?.length > 0) {
      // Fall 1: Kompetenz ist einem Topic zugeordnet -> speichere auf Topic
      const topicId = statusInfo.relatedTopics[0].id;
      console.log('[CurriculumTree.handleOverride] Calling onManualOverride with topicId:', topicId);
      const success = await onManualOverride(topicId, competency.id, newStatus);
      if (success) {
        toast.success('Status wurde manuell gesetzt');
      } else {
        toast.error('Fehler beim Setzen des Status');
      }
    } else if (onDirectOverride) {
      // Fall 2: Kompetenz ist keinem Topic zugeordnet -> speichere direkt auf Kompetenz
      console.log('[CurriculumTree.handleOverride] No related topics, using direct override for:', competency.id);
      const success = await onDirectOverride(competency.id, newStatus);
      if (success) {
        toast.success('Status wurde direkt gesetzt');
      } else {
        toast.error('Fehler beim Setzen des Status');
      }
    } else {
      console.error('[CurriculumTree.handleOverride] Neither onManualOverride nor onDirectOverride available');
      toast.error('Status konnte nicht gesetzt werden');
    }
  };

  const handleClearOverride = async () => {
    if (statusInfo?.isDirect && onClearDirectOverride) {
      // Direkte Überschreibung auf Kompetenz entfernen
      const success = await onClearDirectOverride(competency.id);
      if (success) {
        toast.success('Manuelle Markierung entfernt');
      }
    } else if (onClearOverride && statusInfo?.topicId) {
      // Topic-basierte Überschreibung entfernen
      const success = await onClearOverride(statusInfo.topicId, competency.id);
      if (success) {
        toast.success('Manuelle Markierung entfernt');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
        getStatusRowStyle(status, isSelectable, isSelected)
      }`}
      onClick={() => isSelectable && onSelect && onSelect(competency.id)}
    >
      {isSelectable && (
        <div className="mt-1">
          {isSelected ? (
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
          ) : (
            <Circle className="w-5 h-5 text-slate-600" />
          )}
        </div>
      )}
      {!isSelectable && (
        <div className="mt-1 flex items-center gap-1">
          <CompetencyStatusIcon status={status} isManual={isManual} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-mono text-blue-400">{competency.kompetenz_id}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            competency.zyklus === '1' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
            competency.zyklus === '2' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}>
            Zyklus {competency.zyklus}
          </span>
          {isManual && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-600 text-amber-400">
              Manuell
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{competency.beschreibung}</p>
      </div>

      {/* Override Menu - nur wenn nicht im Auswahlmodus und Override erlaubt */}
      {!isSelectable && canOverride && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <DropdownMenuItem
              onClick={() => handleOverride('completed')}
              className="text-green-600 dark:text-green-400 focus:text-green-700 dark:focus:text-green-300 focus:bg-green-100 dark:focus:bg-green-900/30"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Als abgeschlossen markieren
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleOverride('in_progress')}
              className="text-blue-600 dark:text-blue-400 focus:text-blue-700 dark:focus:text-blue-300 focus:bg-blue-100 dark:focus:bg-blue-900/30"
            >
              <Clock className="w-4 h-4 mr-2" />
              Als in Bearbeitung markieren
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleOverride('not_started')}
              className="text-slate-600 dark:text-slate-400 focus:text-slate-700 dark:focus:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-700"
            >
              <Circle className="w-4 h-4 mr-2" />
              Als nicht gestartet markieren
            </DropdownMenuItem>
            {isManual && (
              <>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                <DropdownMenuItem
                  onClick={handleClearOverride}
                  className="text-amber-600 dark:text-amber-400 focus:text-amber-700 dark:focus:text-amber-300 focus:bg-amber-100 dark:focus:bg-amber-900/30"
                >
                  Manuelle Markierung entfernen
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </motion.div>
  );
};

const DomainSection = ({
  domain,
  competencies,
  getCompetencyStatus,
  onSelectCompetency,
  isSelectable,
  selectedCompetencyIds,
  onManualOverride,
  onClearOverride,
  onDirectOverride,
  onClearDirectOverride,
  canOverride
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Zähle abgeschlossene Kompetenzen
  const completedCount = useMemo(() => {
    return competencies.filter(c => {
      const statusInfo = getCompetencyStatus(c.id);
      return statusInfo?.status === 'completed';
    }).length;
  }, [competencies, getCompetencyStatus]);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          )}
          <div className="text-left">
            <h4 className="font-semibold text-slate-900 dark:text-white">{domain.name}</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{competencies.length} Kompetenzen</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {completedCount} abgeschlossen
          </span>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 bg-white dark:bg-slate-800/50">
              {competencies.map(competency => (
                <CompetencyItem
                  key={competency.id}
                  competency={competency}
                  statusInfo={getCompetencyStatus(competency.id)}
                  onSelect={onSelectCompetency}
                  isSelectable={isSelectable}
                  selectedCompetencyIds={selectedCompetencyIds}
                  onManualOverride={onManualOverride}
                  onClearOverride={onClearOverride}
                  onDirectOverride={onDirectOverride}
                  onClearDirectOverride={onClearDirectOverride}
                  canOverride={canOverride}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

let __CurriculumTreeError = null;
let CurriculumTreeMain = null;

// Fach-Kurzformen für Filter-Buttons
// WICHTIG: Keys müssen mit fach_name in lehrplanData.js übereinstimmen
const SUBJECT_SHORTCUTS = {
  'Deutsch': 'De',
  'Mathematik': 'Ma',
  'NMG': 'NMG',  // fach_name in lehrplanData.js ist 'NMG', nicht 'Natur, Mensch, Gesellschaft'
  'Bewegung und Sport': 'BuS',
  'Musik': 'Mu',
  'Bildnerisches Gestalten': 'BG',
  'Textiles und Technisches Gestalten': 'TTG',
  'Englisch': 'En',
  'Französisch': 'Fr',
  'Medien und Informatik': 'MI',
  'Berufliche Orientierung': 'BO',
  'Politische Bildung': 'PB'
};

try {
	CurriculumTreeMain = function CurriculumTreeMain({
	  competencies,
	  // Legacy props - nicht mehr benötigt, da der Hook den Store verwendet
	  // yearlyLessons, topics, currentWeek werden für Abwärtskompatibilität akzeptiert
	  onSelectCompetency,
	  isSelectable = false,
	  selectedCompetencyIds = [],
	  onTopicsUpdate = null,
	  canOverride = true,
	  assignTopicId = null,
	  onAssignComplete = null,
	  userSubjects = []  // Für "Meine Fächer" Filter
	}) {
	  const [searchTerm, setSearchTerm] = useState('');
	  const [selectedCycle, setSelectedCycle] = useState('all');
	  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

	  // Ermittle verfügbare Fächer aus den Kompetenzen
	  const availableSubjects = useMemo(() => {
	    const subjects = [...new Set(competencies.map(c => c.fach_name))];
	    return subjects.sort((a, b) => {
	      const order = Object.keys(SUBJECT_SHORTCUTS);
	      return order.indexOf(a) - order.indexOf(b);
	    });
	  }, [competencies]);

	  // Direkte Store-Subscription um Re-Renders bei Topic-Änderungen zu triggern
	  // Dies ist notwendig weil useCompetencyStatus sonst nicht neu berechnet wird
	  const storeTopics = useTopics();

	  // Verwende den Hybrid-Status Hook
	  const {
	    getCompetencyStatus,
	    setManualOverride,
	    clearManualOverride,
	    setDirectCompetencyOverride,
	    clearDirectCompetencyOverride,
	    statistics
	  } = useCompetencyStatus(competencies, onTopicsUpdate);

	  // Fallback für leere Daten
	  if (!competencies || competencies.length === 0) {
	    return (
	      <div className="p-6 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-center">
	        <div className="text-slate-500 dark:text-slate-400 text-sm">
	          Keine Lehrplan-Kompetenzen für dieses Fach vorhanden.
	        </div>
	        <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
	          Die Daten werden automatisch geladen, wenn ein passendes Fach (z.B. Deutsch) vorhanden ist.
	        </div>
	      </div>
	    );
	  }

	  // Group competencies by hauptbereich and unterbereich
	  const groupedCompetencies = useMemo(() => {
	    let filtered = competencies;

	    // Filter by subject (Fach)
	    if (selectedSubjectFilter === 'mine') {
	      // "Meine Fächer" - nur Fächer die der User erstellt hat
	      const userSubjectNames = userSubjects.map(s => s.name);
	      filtered = filtered.filter(c => userSubjectNames.includes(c.fach_name));
	    } else if (selectedSubjectFilter !== 'all') {
	      // Einzelnes Fach ausgewählt
	      filtered = filtered.filter(c => c.fach_name === selectedSubjectFilter);
	    }

	    // Filter by search term
	    if (searchTerm) {
	      filtered = filtered.filter(c =>
	        c.beschreibung?.toLowerCase().includes(searchTerm.toLowerCase()) ||
	        c.kompetenz_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
	        c.hauptbereich?.toLowerCase().includes(searchTerm.toLowerCase())
	      );
	    }

	    // Filter by cycle (zyklus)
	    if (selectedCycle !== 'all') {
	      filtered = filtered.filter(c => c.zyklus === selectedCycle);
	    }

	    // Group by hauptbereich + unterbereich
	    const grouped = {};
	    filtered.forEach(comp => {
	      const key = `${comp.hauptbereich} - ${comp.unterbereich}`;
	      if (!grouped[key]) {
	        grouped[key] = {
	          name: key,
	          hauptbereich: comp.hauptbereich,
	          unterbereich: comp.unterbereich,
	          competencies: []
	        };
	      }
	      grouped[key].competencies.push(comp);
	    });

	    // Sort competencies within each group
	    Object.values(grouped).forEach(group => {
	      group.competencies.sort((a, b) => {
	        if (a.zyklus !== b.zyklus) return a.zyklus - b.zyklus;
	        return (a.reihenfolge_index || '').localeCompare(b.reihenfolge_index || '');
	      });
	    });

	    // Sort groups by hauptbereich (numeric sort for NMG.1, NMG.2, ..., NMG.10, NMG.11, etc.)
	    return Object.values(grouped).sort((a, b) => a.hauptbereich.localeCompare(b.hauptbereich, undefined, { numeric: true }));
	  }, [competencies, searchTerm, selectedCycle, selectedSubjectFilter, userSubjects]);

	  return (
	    <div className="space-y-4">
	      {/* Statistics - verwendet Hook-Statistiken */}
	      <div className="grid grid-cols-4 gap-3">
	        <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
	          <div className="text-2xl font-bold text-slate-900 dark:text-white">{statistics.total}</div>
	          <div className="text-xs text-slate-600 dark:text-slate-400">Total</div>
	        </div>
	        <div className="bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700/50 rounded-lg p-3">
	          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.completed}</div>
	          <div className="text-xs text-green-700 dark:text-green-300">Abgeschlossen</div>
	        </div>
	        <div className="bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700/50 rounded-lg p-3">
	          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{statistics.inProgress}</div>
	          <div className="text-xs text-blue-700 dark:text-blue-300">In Bearbeitung</div>
	        </div>
	        <div className="bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3">
	          <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">{statistics.notStarted}</div>
	          <div className="text-xs text-slate-500">Ausstehend</div>
	        </div>
	      </div>

	      {/* Fach-Filter */}
	      <div className="flex flex-wrap gap-1.5">
	        <Button
	          variant={selectedSubjectFilter === 'all' ? 'default' : 'outline'}
	          size="sm"
	          onClick={() => setSelectedSubjectFilter('all')}
	          className={`h-7 px-2 text-xs ${selectedSubjectFilter === 'all' ? 'bg-blue-600' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'}`}
	        >
	          Alle
	        </Button>
	        {userSubjects.length > 0 && (
	          <Button
	            variant={selectedSubjectFilter === 'mine' ? 'default' : 'outline'}
	            size="sm"
	            onClick={() => setSelectedSubjectFilter('mine')}
	            className={`h-7 px-2 text-xs ${selectedSubjectFilter === 'mine' ? 'bg-green-600' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'}`}
	          >
	            Meine
	          </Button>
	        )}
	        <div className="w-px bg-slate-300 dark:bg-slate-600 mx-1" />
	        {availableSubjects.map(subjectName => (
	          <Button
	            key={subjectName}
	            variant={selectedSubjectFilter === subjectName ? 'default' : 'outline'}
	            size="sm"
	            onClick={() => setSelectedSubjectFilter(subjectName)}
	            className={`h-7 px-2 text-xs ${selectedSubjectFilter === subjectName ? 'bg-blue-600' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'}`}
	            title={subjectName}
	          >
	            {SUBJECT_SHORTCUTS[subjectName] || subjectName.substring(0, 3)}
	          </Button>
	        ))}
	      </div>

	      {/* Zyklus-Filter + Suche */}
	      <div className="flex gap-3 items-center">
	        <div className="flex gap-1.5">
	          <Button
	            variant={selectedCycle === 'all' ? 'default' : 'outline'}
	            size="sm"
	            onClick={() => setSelectedCycle('all')}
	            className={`h-7 px-2 text-xs ${selectedCycle === 'all' ? 'bg-slate-600' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'}`}
	          >
	            Alle
	          </Button>
	          {['1', '2', '3'].map(cycle => (
	            <Button
	              key={cycle}
	              variant={selectedCycle === cycle ? 'default' : 'outline'}
	              size="sm"
	              onClick={() => setSelectedCycle(cycle)}
	              className={`h-7 px-2 text-xs ${selectedCycle === cycle ? 'bg-slate-600' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'}`}
	            >
	              Z{cycle}
	            </Button>
	          ))}
	        </div>
	        <div className="flex-1 max-w-xs relative">
	          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
	          <Input
	            value={searchTerm}
	            onChange={(e) => setSearchTerm(e.target.value)}
	            placeholder="Suche..."
	            className="h-7 pl-7 text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
	          />
	        </div>
	      </div>

	      {/* Tree */}
	      <div className={`space-y-3 overflow-y-auto pr-2 ${isSelectable && selectedCompetencyIds.length > 0 ? 'max-h-[500px]' : 'max-h-[600px]'}`}>
	        {groupedCompetencies.length === 0 ? (
	          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
	            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
	            <p>Keine Kompetenzen gefunden</p>
	          </div>
	        ) : (
	          groupedCompetencies.map((domain, index) => (
	            <DomainSection
	              key={index}
	              domain={domain}
	              competencies={domain.competencies}
	              getCompetencyStatus={getCompetencyStatus}
	              onSelectCompetency={onSelectCompetency}
	              isSelectable={isSelectable}
	              selectedCompetencyIds={selectedCompetencyIds}
	              onManualOverride={setManualOverride}
	              onClearOverride={clearManualOverride}
	              onDirectOverride={setDirectCompetencyOverride}
	              onClearDirectOverride={clearDirectCompetencyOverride}
	              canOverride={canOverride && !isSelectable}
	            />
	          ))
	        )}
	      </div>

	      {/* Selection UI - zeigt Zuweisen-Button wenn im Auswahl-Modus */}
	      {isSelectable && selectedCompetencyIds.length > 0 && onAssignComplete && (
	        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 mt-4 rounded-b-lg">
	          <div className="flex items-center justify-between">
	            <span className="text-sm text-slate-700 dark:text-slate-300">
	              <span className="font-semibold text-slate-900 dark:text-white">{selectedCompetencyIds.length}</span> Kompetenz(en) ausgewählt
	            </span>
	            <div className="flex gap-2">
	              <Button
	                variant="outline"
	                onClick={() => window.history.back()}
	                className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
	              >
	                Abbrechen
	              </Button>
	              <Button
	                onClick={() => onAssignComplete(selectedCompetencyIds)}
	                className="bg-green-600 hover:bg-green-700 text-white"
	              >
	                <CheckCircle2 className="w-4 h-4 mr-2" />
	                Kompetenzen zuweisen
	              </Button>
	            </div>
	          </div>
	        </div>
	      )}

	      {/* Info-Banner wenn im Auswahl-Modus aber noch nichts ausgewählt */}
	      {isSelectable && selectedCompetencyIds.length === 0 && assignTopicId && (
	        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4 mt-4">
	          <p className="text-sm text-blue-700 dark:text-blue-300">
	            Klicken Sie auf die Kompetenzen, die Sie diesem Thema zuweisen möchten.
	          </p>
	        </div>
	      )}
	    </div>
    );
  };
} catch (e) {
	console.error("CurriculumTree module init error:", e)
	__CurriculumTreeError = e;
}

export default function CurriculumTree(props) {
	if (__CurriculumTreeError) {
		return (
			<div className="p-4 bg-red-900/10 border border-red-700 rounded-lg">
				<div className="text-sm text-red-200">Fehler beim Laden der Lehrplan-Komponenten. Prüfe die Dev-Konsole.</div>
				<div className="mt-2 text-xs text-red-300">{String(__CurriculumTreeError.message || __CurriculumTreeError)}</div>
			</div>
		);
	}
	return CurriculumTreeMain ? <CurriculumTreeMain {...props} /> : null;
}