import React, { useState, useEffect, useCallback } from "react";
import { Student, Performance, UeberfachlichKompetenz, Class } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import PerformanceView from "../components/grades/PerformanceView";
import CalendarLoader from "../components/ui/CalendarLoader";
import { useSearchParams } from "react-router-dom";

export default function GradesPage() {
  const [students, setStudents] = useState([]);
  const [performances, setPerformances] = useState([]);
  const [ueberfachlich, setUeberfachlich] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const selectedStudentId = searchParams.get('studentId');

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
      // Setze activeClassId frühzeitig (als string)
      if (validClasses.length > 0 && !activeClassId) {
        setActiveClassId(String(validClasses[0].id));
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
    <div className="h-screen overflow-y-auto grades-page-scroll bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
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
          ) : (
            <PerformanceView
              students={studentsForActiveClass}
              performances={performancesForActiveClass}
              ueberfachlich={ueberfachlichForActiveClass}
              activeClassId={activeClassId}
              setActiveClassId={setActiveClassId}
              classes={classes}
              onDataChange={handleDataChange}
              selectedStudentId={selectedStudentId}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}