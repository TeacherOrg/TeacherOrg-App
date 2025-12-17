import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, Search, CheckCircle2, Circle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CompetencyStatus = ({ status }) => {
  if (status === 'completed') {
    return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  } else if (status === 'planned') {
    return <Clock className="w-4 h-4 text-blue-500" />;
  }
  return <Circle className="w-4 h-4 text-slate-500" />;
};

const CompetencyItem = ({ competency, status, onSelect, isSelectable, selectedCompetencyIds }) => {
  const isSelected = isSelectable && selectedCompetencyIds?.includes(competency.id);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer ${
        isSelectable
          ? isSelected
            ? 'bg-blue-900/50 border-2 border-blue-500 shadow-lg shadow-blue-500/20'
            : 'hover:bg-slate-700/50 border-2 border-transparent'
          : 'cursor-default'
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
      {!isSelectable && <CompetencyStatus status={status} />}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-blue-400">{competency.kompetenz_id}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            competency.zyklus === '1' ? 'bg-yellow-900/30 text-yellow-400' :
            competency.zyklus === '2' ? 'bg-orange-900/30 text-orange-400' :
            'bg-red-900/30 text-red-400'
          }`}>
            Zyklus {competency.zyklus}
          </span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{competency.beschreibung}</p>
      </div>
    </motion.div>
  );
};

const DomainSection = ({ domain, competencies, getCompetencyStatus, onSelectCompetency, isSelectable, selectedCompetencyIds }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-slate-800/80 hover:bg-slate-700/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
          <div className="text-left">
            <h4 className="font-semibold text-white">{domain.name}</h4>
            <p className="text-xs text-slate-400 mt-0.5">{competencies.length} Kompetenzen</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {competencies.filter(c => getCompetencyStatus(c.id) === 'completed').length} abgeschlossen
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
            <div className="p-4 space-y-2 bg-slate-800/50">
              {competencies.map(competency => (
                <CompetencyItem
                  key={competency.id}
                  competency={competency}
                  status={getCompetencyStatus(competency.id)}
                  onSelect={onSelectCompetency}
                  isSelectable={isSelectable}
                  selectedCompetencyIds={selectedCompetencyIds}
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

try {
	CurriculumTreeMain = function CurriculumTreeMain({
	  competencies,
	  yearlyLessons,
	  topics,
	  currentWeek,
	  onSelectCompetency,
	  isSelectable = false,
	  selectedCompetencyIds = []
	}) {
	  const [searchTerm, setSearchTerm] = useState('');
	  const [selectedCycle, setSelectedCycle] = useState('all');

	  // Group competencies by hauptbereich and unterbereich (angepasst an Feldnamen aus lehrplanData.js)
	  const groupedCompetencies = useMemo(() => {
	    let filtered = competencies;

	    // Filter by search term
	    if (searchTerm) {
	      filtered = filtered.filter(c => 
	        c.beschreibung.toLowerCase().includes(searchTerm.toLowerCase()) ||  // ← angepasst: beschreibung
	        c.kompetenz_id.toLowerCase().includes(searchTerm.toLowerCase()) ||  // ← angepasst: kompetenz_id
	        c.hauptbereich.toLowerCase().includes(searchTerm.toLowerCase())     // ← angepasst: hauptbereich
	      );
	    }

	    // Filter by cycle (zyklus)
	    if (selectedCycle !== 'all') {
	      filtered = filtered.filter(c => c.zyklus === selectedCycle);  // ← angepasst: zyklus
	    }

	    // Group by hauptbereich + unterbereich
	    const grouped = {};
	    filtered.forEach(comp => {
	      const key = `${comp.hauptbereich} - ${comp.unterbereich}`;  // ← angepasst: hauptbereich, unterbereich
	      if (!grouped[key]) {
	        grouped[key] = {
	          name: key,
	          hauptbereich: comp.hauptbereich,  // ← angepasst
	          unterbereich: comp.unterbereich,  // ← angepasst
	          competencies: []
	        };
	      }
	      grouped[key].competencies.push(comp);
	    });

	    // Sort competencies within each group
	    Object.values(grouped).forEach(group => {
	      group.competencies.sort((a, b) => {
	        if (a.zyklus !== b.zyklus) return a.zyklus - b.zyklus;  // ← angepasst: zyklus (als String, aber - funktioniert für '1','2','3')
	        return (a.reihenfolge_index || '').localeCompare(b.reihenfolge_index || '');  // ← angepasst: reihenfolge_index (aus Daten)
	      });
	    });

	    // Sort groups by hauptbereich
	    return Object.values(grouped).sort((a, b) => a.hauptbereich.localeCompare(b.hauptbereich));  // ← angepasst: hauptbereich
	  }, [competencies, searchTerm, selectedCycle]);

	  // Determine competency status (bleibt gleich, da c.id die PB-ID ist)
	  const getCompetencyStatus = (competencyId) => {
    const relatedTopics = topics.filter(t =>
      Array.isArray(t.lehrplan_kompetenz_ids) && t.lehrplan_kompetenz_ids.includes(competencyId)
    );

    if (relatedTopics.length === 0) return 'not_started';

    const hasAnyLesson = relatedTopics.some(topic =>
      yearlyLessons.some(lesson => lesson.topic_id === topic.id)
    );

    if (!hasAnyLesson) return 'not_started';

    const hasPastLesson = relatedTopics.some(topic =>
      yearlyLessons.some(lesson =>
        lesson.topic_id === topic.id && lesson.week_number < currentWeek
      )
    );

    return hasPastLesson ? 'completed' : 'planned';  };
	  const stats = useMemo(() => {
	    const total = competencies.length;
	    const completed = competencies.filter(c => getCompetencyStatus(c.id) === 'completed').length;
	    const planned = competencies.filter(c => getCompetencyStatus(c.id) === 'planned').length;
	    const notStarted = total - completed - planned;

	    return { total, completed, planned, notStarted };
	  }, [competencies, getCompetencyStatus]);

	  return (
	    <div className="space-y-4">
	      {/* Statistics (bleibt gleich) */}
	      <div className="grid grid-cols-4 gap-3">
	        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
	          <div className="text-2xl font-bold text-white">{stats.total}</div>
	          <div className="text-xs text-slate-400">Total</div>
	        </div>
	        <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
	          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
	          <div className="text-xs text-green-300">Abgeschlossen</div>
	        </div>
	        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
	          <div className="text-2xl font-bold text-blue-400">{stats.planned}</div>
	          <div className="text-xs text-blue-300">Geplant</div>
	        </div>
	        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
	          <div className="text-2xl font-bold text-slate-400">{stats.notStarted}</div>
	          <div className="text-xs text-slate-500">Ausstehend</div>
	        </div>
	      </div>

	      {/* Filters (angepasst: search placeholder bleibt, aber intern schon geändert) */}
	      <div className="flex gap-3">
	        <div className="flex-1 relative">
	          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
	          <Input
	            value={searchTerm}
	            onChange={(e) => setSearchTerm(e.target.value)}
	            placeholder="Kompetenzen durchsuchen..."
	            className="pl-10 bg-slate-800 border-slate-600 text-white"
	          />
	        </div>
	        <div className="flex gap-2">
	          <Button
	            variant={selectedCycle === 'all' ? 'default' : 'outline'}
	            size="sm"
	            onClick={() => setSelectedCycle('all')}
	            className={selectedCycle === 'all' ? 'bg-blue-600' : 'border-slate-600 text-slate-300'}
	          >
	            Alle
	          </Button>
	          {['1', '2', '3'].map(cycle => (
	            <Button
	              key={cycle}
	              variant={selectedCycle === cycle ? 'default' : 'outline'}
	              size="sm"
	              onClick={() => setSelectedCycle(cycle)}
	              className={selectedCycle === cycle ? 'bg-blue-600' : 'border-slate-600 text-slate-300'}
	            >
	              Zyklus {cycle}
	            </Button>
	          ))}
	        </div>
	      </div>

	      {/* Tree */}
	      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
	        {groupedCompetencies.length === 0 ? (
	          <div className="text-center py-12 text-slate-400">
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
	            />
	          ))
	        )}
	      </div>
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