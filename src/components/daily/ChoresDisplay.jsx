import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { getThemeGradient, getThemeTextColor } from "@/utils/colorDailyUtils";

export default function ChoresDisplay({ assignments, chores, students, customization, theme, isDark }) {
  // Verknüpfe Assignments mit Chores und Students
  const enrichedAssignments = assignments.map((assignment) => {
    const chore = chores.find((c) => c.id === assignment.chore_id);
    const student = students.find((s) => s.id === assignment.student_id);
    return {
      ...assignment,
      choreName: chore?.name || chore?.description || "Unbekannte Aufgabe",
      studentName: student?.name || "Kein Schüler zugewiesen",
    };
  });

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (index) => ({
      opacity: 1,
      y: 0,
      transition: { delay: index * 0.1, duration: 0.5, ease: "easeOut" },
    }),
    hover: { scale: 1.03, boxShadow: "0px 4px 12px rgba(0,0,0,0.1)" },
  };

  return (
    <motion.div
      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/30 dark:border-slate-700/30 overflow-hidden h-full flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-slate-100 dark:bg-slate-700 p-3 border-b border-slate-200 dark:border-slate-600">
        <h3 className={`${customization.fontSize.title} font-bold text-slate-800 dark:text-slate-200 font-[Inter]`}>
          Ämtchen am Ende des Tages
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 md:p-4">
        {enrichedAssignments.length > 0 ? (
          <div className="space-y-1 md:space-y-2">
            {enrichedAssignments.map((assignment, index) => (
              <motion.div
                key={assignment.id}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className="p-2 md:p-3 rounded-xl border border-slate-200 dark:border-slate-600"
                style={{
                  background: getThemeGradient(theme, "#3b82f6", -10, isDark), // Standardfarbe, anpassen nach Bedarf
                  color: getThemeTextColor(theme, "#3b82f6", isDark),
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <div>
                      <p className={`${customization.fontSize.content} font-medium font-[Poppins]`}>
                        {assignment.choreName}
                      </p>
                      <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                        Zugewiesen: {assignment.studentName}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 md:py-12">
            <div className="text-4xl md:text-6xl mb-2 md:mb-4">📋</div>
            <p className={`${customization.fontSize.content} text-slate-500 dark:text-slate-400 font-[Poppins]`}>
              Keine Ämtchen für heute
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}