import React, { useState, useEffect } from "react";
import { Student, Class } from "@/api/entities";
import pb from '@/api/pb';
import { motion } from "framer-motion";
import CalendarLoader from "../components/ui/CalendarLoader";
import { toast } from "sonner";
import BountiesStoreTab from '@/components/grades/BountiesStoreTab/BountiesStoreTab';

export default function GameZone() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userId = pb.authStore.model?.id;

      // Team Teaching laden
      const teamTeachingAccess = await pb.collection('team_teachings').getFullList({
        filter: `invited_user_id = '${userId}' && status = 'accepted' && owner_id != '${userId}'`,
        expand: 'class_id,owner_id',
        $autoCancel: false
      }).catch(() => []);

      const visibleSharedClassIds = teamTeachingAccess
        .filter(tt => !tt.is_hidden)
        .map(tt => tt.class_id);

      // Eigene Daten parallel laden
      const [ownStudentsData, ownedClassesData] = await Promise.all([
        Student.list(),
        Class.list()
      ]);

      // Daten von geteilten Klassen laden
      let sharedStudents = [];

      if (visibleSharedClassIds.length > 0) {
        for (const classId of visibleSharedClassIds) {
          const students = await pb.collection('students').getFullList({
            filter: `class_id = '${classId}'`,
            $autoCancel: false
          }).catch(() => []);
          sharedStudents = [...sharedStudents, ...students];
        }
      }

      // Eigene Klassen mit Metadaten
      const ownedWithMeta = (ownedClassesData || []).map(cls => ({
        ...cls,
        isOwner: true,
        permissionLevel: 'full_access'
      }));

      // Geteilte Klassen aus Team Teaching
      const sharedClasses = teamTeachingAccess
        .filter(tt => (tt.expand?.class_id || tt.class_id) && !tt.is_hidden)
        .map(tt => ({
          ...(tt.expand?.class_id || {}),
          id: tt.expand?.class_id?.id || tt.class_id,
          name: tt.expand?.class_id?.name || tt.class_name || 'Geteilte Klasse',
          isOwner: false,
          permissionLevel: tt.permission_level || 'view_only',
          teamTeachingId: tt.id,
          ownerEmail: tt.expand?.owner_id?.email || ''
        }));

      const allClasses = [...ownedWithMeta, ...sharedClasses];

      setStudents([...(ownStudentsData || []), ...sharedStudents]);
      setClasses(allClasses || []);

      if (allClasses && allClasses.length > 0 && !activeClassId) {
        setActiveClassId(String(allClasses[0].id));
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <CalendarLoader />
      </div>
    );
  }

  const classStudents = students.filter(s => String(s.class_id) === String(activeClassId));

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-925 dark:to-slate-950 p-2 sm:p-3 transition-colors duration-300">
      <div className="max-w-7xl mx-auto h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/60 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 overflow-hidden h-full"
        >
          <BountiesStoreTab
            students={classStudents}
            classes={classes}
            activeClassId={activeClassId}
            onClassChange={setActiveClassId}
          />
        </motion.div>
      </div>
    </div>
  );
}
