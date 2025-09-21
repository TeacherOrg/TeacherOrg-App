import React, { useState, useEffect, useCallback } from "react";
import { Student, Performance, UeberfachlichKompetenz, Class } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Plus, GraduationCap, FileText, BarChart3, Users } from "lucide-react";
import { motion } from "framer-motion";
import PerformanceView from "../components/grades/PerformanceView";
import CalendarLoader from "../components/ui/CalendarLoader";

export default function GradesPage() {
  const [students, setStudents] = useState([]);
  const [performances, setPerformances] = useState([]);
  const [ueberfachlich, setUeberfachlich] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        studentsData, 
        performancesData, 
        ueberfachlichData,
        classesData
      ] = await Promise.all([
        Student.list(),
        Performance.list(),
        UeberfachlichKompetenz.list(),
        Class.list()
      ]);
      
      // Filtere ungültige Klassen
      const validClasses = classesData.filter(cls => cls && cls.id && cls.name);
      setStudents(studentsData || []);
      setPerformances(performancesData || []);
      setUeberfachlich(ueberfachlichData || []);
      setClasses(validClasses || []);
      // Setze activeClassId frühzeitig
      if (validClasses.length > 0 && !activeClassId) {
        setActiveClassId(validClasses[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Fehler beim Laden der Daten. Bitte versuchen Sie es erneut.");
    } finally {
      setIsLoading(false);
    }
  }, [activeClassId]);

  // Initiales Laden der Daten
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDataChange = useCallback(async (updatedPerformances, updatedUeberfachlich) => {
    if (updatedPerformances) {
      setPerformances(updatedPerformances);
    }
    if (updatedUeberfachlich) {
      setUeberfachlich(updatedUeberfachlich);
    } else {
      await loadData(); // Vollständiger Reload, falls nicht spezifiziert
    }
    // KEIN Tab-Set hier!
  }, [loadData]);

  const studentsForActiveClass = students.filter(s => s.class_id === activeClassId);
  const performancesForActiveClass = performances.filter(p => p.class_id === activeClassId);
  const ueberfachlichForActiveClass = ueberfachlich.filter(u => u.class_id === activeClassId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800 rounded-2xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
                Leistungsübersicht
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-base font-medium">
                Schülerleistungen und Kompetenzen verfolgen
              </p>
            </div>
          </div>
        </motion.div>

        {/* Class Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl p-3 shadow-lg border border-slate-200/30 dark:border-slate-700/50 max-w-xs">
            <Users className="w-5 h-5 text-gray-500" />
            <select
              value={activeClassId || ''}
              onChange={(e) => setActiveClassId(e.target.value)}
              className="bg-transparent text-gray-900 dark:text-white font-medium border-none outline-none w-full"
              disabled={isLoading || classes.length === 0}
            >
              <option disabled value="">Klasse auswählen...</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/60 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 overflow-hidden"
        >
          {isLoading ? (
            <CalendarLoader />
          ) : error ? (
            <div className="p-4 text-red-500">
              {error}
              <Button onClick={loadData} className="ml-4">Erneut versuchen</Button>
            </div>
          ) : activeClassId ? (
            <PerformanceView
              students={studentsForActiveClass}
              performances={performancesForActiveClass}
              ueberfachlich={ueberfachlichForActiveClass}
              activeClassId={activeClassId}
              classes={classes}
              onDataChange={handleDataChange}
            />
          ) : (
            <div className="text-center py-20">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-400 dark:text-slate-400" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Keine Klasse ausgewählt</h3>
              <p className="text-slate-600 dark:text-slate-400">Bitte wählen Sie eine Klasse aus, um die Leistungsübersicht anzuzeigen.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}