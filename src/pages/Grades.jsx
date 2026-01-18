import React, { useState, useEffect, useCallback } from "react";
import { Student, Performance, UeberfachlichKompetenz, Class } from "@/api/entities";
import pb from '@/api/pb';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStudentId = searchParams.get('studentId');

  // URL-basierte Klassenauswahl
  const urlClassId = searchParams.get('classId') || null;
  const [activeClassId, setActiveClassIdLocal] = useState(urlClassId);

  // Sync URL → State
  useEffect(() => {
    const urlClass = searchParams.get('classId');
    if (urlClass !== activeClassId) {
      setActiveClassIdLocal(urlClass || null);
    }
  }, [searchParams]);

  // Wrapper für setActiveClassId der auch URL aktualisiert
  const setActiveClassId = useCallback((newClassId) => {
    setActiveClassIdLocal(newClassId);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (newClassId) {
        next.set('classId', newClassId);
      } else {
        next.delete('classId');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userId = pb.authStore.model?.id;

      // 1. Erst Team Teaching laden um shared class IDs zu bekommen
      // WICHTIG: owner_id != userId um Self-Team-Teaching-Records auszuschließen
      const teamTeachingAccess = await pb.collection('team_teachings').getFullList({
        filter: `invited_user_id = '${userId}' && status = 'accepted' && owner_id != '${userId}'`,
        expand: 'class_id,owner_id',
        $autoCancel: false
      }).catch(() => []);

      const sharedClassIds = teamTeachingAccess.map(tt => tt.class_id);

      // 2. Daten parallel laden (eigene + für shared classes)
      const [
        ownStudentsData,
        ownPerformancesData,
        ownUeberfachlichData,
        ownedClassesData
      ] = await Promise.all([
        Student.list(),
        Performance.list(),
        UeberfachlichKompetenz.list(),
        Class.list()
      ]);

      // 3. Daten von geteilten Klassen laden (NUR nicht-versteckte)
      let sharedStudents = [];
      let sharedPerformances = [];
      let sharedUeberfachlich = [];

      // Nur nicht-versteckte Klassen für Daten-Loading
      const visibleSharedClassIds = teamTeachingAccess
        .filter(tt => !tt.is_hidden)
        .map(tt => tt.class_id);

      if (visibleSharedClassIds.length > 0) {
        for (const classId of visibleSharedClassIds) {
          const [students, performances, ueberfachlich] = await Promise.all([
            pb.collection('students').getFullList({
              filter: `class_id = '${classId}'`,
              $autoCancel: false
            }).catch(() => []),
            pb.collection('performances').getFullList({
              filter: `class_id = '${classId}'`,
              $autoCancel: false
            }).catch(() => []),
            pb.collection('ueberfachlich_kompetenzen').getFullList({
              filter: `class_id = '${classId}'`,
              $autoCancel: false
            }).catch(() => [])
          ]);
          sharedStudents = [...sharedStudents, ...students];
          sharedPerformances = [...sharedPerformances, ...performances];
          sharedUeberfachlich = [...sharedUeberfachlich, ...ueberfachlich];
        }
      }

      console.log('[Grades] Shared class data:', {
        sharedClassIds,
        sharedStudents: sharedStudents.length,
        sharedPerformances: sharedPerformances.length,
        sharedUeberfachlich: sharedUeberfachlich.length
      });

      // 4. Eigene Klassen mit Metadaten
      const ownedWithMeta = (ownedClassesData || []).map(cls => ({
        ...cls,
        isOwner: true,
        permissionLevel: 'full_access'
      }));

      // 5. Geteilte Klassen aus Team Teaching - MIT FALLBACK wenn expand fehlschlägt (RLS)
      // NUR nicht-versteckte Klassen anzeigen
      const sharedClasses = teamTeachingAccess
        .filter(tt => (tt.expand?.class_id || tt.class_id) && !tt.is_hidden) // Fallback + Filter
        .map(tt => ({
          // Wenn expand funktioniert, nutze es - sonst Fallback
          ...(tt.expand?.class_id || {}),
          // Fallback-Felder wenn expand fehlt (wegen RLS)
          id: tt.expand?.class_id?.id || tt.class_id,
          name: tt.expand?.class_id?.name || tt.class_name || 'Geteilte Klasse',
          isOwner: false,
          permissionLevel: tt.permission_level || 'view_only',
          teamTeachingId: tt.id,
          ownerEmail: tt.expand?.owner_id?.email || ''
        }));

      // 6. Zusammenführen mit Deduplizierung (owned hat Priorität)
      const merged = [...ownedWithMeta, ...sharedClasses];
      const uniqueClasses = merged.reduce((acc, cls) => {
        const existing = acc.find(c => c.id === cls.id);
        if (!existing) {
          acc.push(cls);
        } else if (cls.isOwner && !existing.isOwner) {
          const idx = acc.findIndex(c => c.id === cls.id);
          acc[idx] = cls;
        }
        return acc;
      }, []);
      const validClasses = uniqueClasses.filter(cls => cls && cls.id && cls.name);

      // 7. Alle Daten zusammenführen
      setStudents([...(ownStudentsData || []), ...sharedStudents]);
      setPerformances([...(ownPerformancesData || []), ...sharedPerformances]);
      setUeberfachlich([...(ownUeberfachlichData || []), ...sharedUeberfachlich]);
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
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-925 dark:to-slate-950 p-2 sm:p-3 transition-colors duration-300">
      <div className="max-w-7xl mx-auto h-full">
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