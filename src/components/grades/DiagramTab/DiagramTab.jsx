import React, { useState, useMemo, useEffect } from 'react';
import FiltersSection from './FiltersSection';
import Leistungscharts from './LeistungCharts';
import KompetenzenCharts from './KompetenzenCharts';
import KPICards from './KPICards';
import KompetenzenKPICards from './KompetenzenKPICards';
import { Button } from "@/components/ui/button";
import { Activity, Star } from 'lucide-react';

const DiagramTab = ({ students, performances, ueberfachlich, subjects, allCompetencies, activeClassId, onDataChange, selectedStudentId, choreAssignments = [], onChoreUpdate }) => {
  const [diagramView, setDiagramView] = useState('leistung');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedCompetencyForProgression, setSelectedCompetencyForProgression] = useState(null);
  const [showClassAverage, setShowClassAverage] = useState(true);

  const competencyOptions = useMemo(() => {
    if (!Array.isArray(allCompetencies) || allCompetencies.length === 0) return [];
    return allCompetencies.map(c => c.name).filter(Boolean);
  }, [allCompetencies]);

  useEffect(() => {
    if (selectedStudentId) {
      setSelectedStudents([selectedStudentId]);
    } else {
      setSelectedStudents([]);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    if (diagramView === 'kompetenzen') {
      if (!selectedCompetencyForProgression || !competencyOptions.includes(selectedCompetencyForProgression)) {
        if (competencyOptions.length > 0) {
          console.log('Auto-selecting first competency:', competencyOptions[0]);
          setSelectedCompetencyForProgression(competencyOptions[0]);
        }
      }
    } else if (diagramView === 'leistung') {
      if (selectedCompetencyForProgression) {
        setSelectedCompetencyForProgression(null);
      }
      if (!selectedSubject) {
        setSelectedSubject('all');
      }
    }
  }, [diagramView, competencyOptions]);

  return (
    <div className="space-y-3">
      {/* View Toggle */}
      <div className="flex justify-start gap-3 p-1.5 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 max-w-xs">
        <Button
          variant={diagramView === 'leistung' ? 'default' : 'ghost'}
          size="sm"
          className={`flex-1 ${diagramView === 'leistung' ? 'bg-blue-600' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          onClick={() => setDiagramView('leistung')}
        >
          <Activity className="w-4 h-4 mr-1.5" />
          Leistung
        </Button>
        <Button
          variant={diagramView === 'kompetenzen' ? 'default' : 'ghost'}
          size="sm"
          className={`flex-1 ${diagramView === 'kompetenzen' ? 'bg-blue-600' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          onClick={() => setDiagramView('kompetenzen')}
        >
          <Star className="w-4 h-4 mr-1.5" />
          Kompetenzen
        </Button>
      </div>

      {/* KPI Cards - show different cards based on view */}
      {diagramView === 'leistung' ? (
        <KPICards
          performances={performances}
          students={students}
          subjects={subjects}
          selectedSubject={selectedSubject}
          selectedStudents={selectedStudents}
        />
      ) : (
        <KompetenzenKPICards
          ueberfachlich={ueberfachlich}
          students={students}
          choreAssignments={choreAssignments}
          selectedStudents={selectedStudents}
          onChoreUpdate={onChoreUpdate}
        />
      )}

      <FiltersSection
        diagramView={diagramView}
        selectedSubject={selectedSubject}
        setSelectedSubject={setSelectedSubject}
        selectedCompetencyForProgression={selectedCompetencyForProgression}
        setSelectedCompetencyForProgression={setSelectedCompetencyForProgression}
        selectedStudents={selectedStudents}
        setSelectedStudents={setSelectedStudents}
        showClassAverage={showClassAverage}
        setShowClassAverage={setShowClassAverage}
        subjects={subjects}
        competencyOptions={competencyOptions}
        students={students}
      />
      {diagramView === 'leistung' ? (
        <Leistungscharts
          performances={performances}
          students={students}
          subjects={subjects}
          selectedStudents={selectedStudents}
          showClassAverage={showClassAverage}
          selectedSubject={selectedSubject}
          setSelectedSubject={setSelectedSubject}
          activeClassId={activeClassId}
          onDataChange={onDataChange}
        />
      ) : (
        <KompetenzenCharts
          ueberfachlich={ueberfachlich}
          students={students}
          selectedStudents={selectedStudents}
          showClassAverage={showClassAverage}
          selectedCompetencyForProgression={selectedCompetencyForProgression}
          activeClassId={activeClassId}
          onDataChange={onDataChange}
        />
      )}
    </div>
  );
};

export default React.memo(DiagramTab);