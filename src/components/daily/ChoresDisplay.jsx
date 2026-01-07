import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Check, X, CheckCircle } from "lucide-react";

export default function ChoresDisplay({
  assignments,
  chores,
  students,
  customization,
  isDark,
  onMarkCompleted
}) {
  const [hoveredChoreId, setHoveredChoreId] = useState(null);

  // Verknüpfe Assignments mit Chores und Students
  const enrichedAssignments = assignments.map((assignment) => {
    const chore = chores.find((c) => c.id === assignment.chore_id) || {};
    const student = students.find((s) => s.id === assignment.student_id) || {};
    return {
      ...assignment,
      choreName: chore.name || "Unbekannte Aufgabe",
      choreIcon: chore.icon || "📋",
      choreDescription: chore.description || "",
      studentName: student.name || "Kein Schüler zugewiesen",
      choreColor: chore.color || "#3b82f6",
    };
  });

  // Gruppiere nach chore_id (alle Personen eines Ämtli in einer Karte)
  const groupedChores = enrichedAssignments.reduce((acc, assignment) => {
    const key = assignment.chore_id;
    if (!acc[key]) {
      acc[key] = {
        chore_id: key,
        choreName: assignment.choreName,
        choreIcon: assignment.choreIcon,
        choreDescription: assignment.choreDescription,
        choreColor: assignment.choreColor,
        students: [],
        assignmentIds: [],
        completedCount: 0,
        isCompleted: false
      };
    }
    acc[key].students.push({
      name: assignment.studentName,
      assignmentId: assignment.id,
      isCompleted: assignment.is_completed
    });
    acc[key].assignmentIds.push(assignment.id);
    if (assignment.is_completed) {
      acc[key].completedCount++;
    }
    return acc;
  }, {});

  // Mark chore as completed if ALL students completed
  Object.values(groupedChores).forEach(chore => {
    chore.isCompleted = chore.students.length > 0 &&
                        chore.completedCount === chore.students.length;
  });

  const groupedChoresList = Object.values(groupedChores);

  // Theme-abhängige Transparenz
  const isThemedBackground = customization?.theme === 'space';
  const containerBgClass = isThemedBackground
    ? 'bg-transparent'
    : 'bg-white/80 dark:bg-slate-800/80';
  const headerBgClass = isThemedBackground
    ? 'bg-transparent'
    : 'bg-slate-100 dark:bg-slate-700';
  const borderClass = isThemedBackground
    ? 'border-purple-500/40 dark:border-purple-400/40'
    : 'border-slate-200/30 dark:border-slate-700/30';
  const blurClass = isThemedBackground ? '' : 'backdrop-blur-md';

  // Animation variants
  const cardVariants = customization?.reducedMotion ? {} : {
    hidden: { opacity: 0, scale: 0.9 },
    visible: (index) => ({
      opacity: 1,
      scale: 1,
      transition: { delay: index * 0.08, duration: 0.4, ease: "easeOut" },
    }),
    hover: { scale: 1.02, y: -2 },
  };

  const handleMarkCompleted = (assignmentIds, isCompleted) => {
    if (onMarkCompleted) {
      onMarkCompleted(assignmentIds, isCompleted);
    }
    setHoveredChoreId(null);
  };

  return (
    <motion.div
      className={`${containerBgClass} ${blurClass} rounded-2xl shadow-xl border ${borderClass} overflow-hidden h-full flex flex-col`}
      initial={customization?.reducedMotion ? false : { opacity: 0 }}
      animate={customization?.reducedMotion ? false : { opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className={`${headerBgClass} p-2 md:p-3 border-b border-slate-200/50 dark:border-slate-600/50`}>
        <h3 className={`${customization?.fontSize?.title || 'text-xl'} font-bold text-slate-800 dark:text-slate-200 font-[Inter]`}>
          Ämtchen am Ende des Tages
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        {groupedChoresList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {groupedChoresList.map((chore, index) => (
              <motion.div
                key={chore.chore_id}
                custom={index}
                variants={cardVariants}
                initial={customization?.reducedMotion ? false : "hidden"}
                animate={customization?.reducedMotion ? false : "visible"}
                whileHover={customization?.reducedMotion ? undefined : "hover"}
                className="relative p-4 md:p-5 rounded-2xl flex flex-col items-center text-center transition-all duration-200"
                style={{
                  backgroundColor: chore.choreColor + "18",
                  border: `2px solid ${chore.choreColor}40`,
                  color: isDark ? "#e2e8f0" : "#1e293b",
                }}
                onMouseEnter={() => !chore.isCompleted && setHoveredChoreId(chore.chore_id)}
                onMouseLeave={() => setHoveredChoreId(null)}
              >
                {/* Completion Indicator */}
                {chore.isCompleted && (
                  <div className="absolute top-2 right-2 z-10">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                )}

                {/* Card Content */}
                <div className={`transition-all duration-300 ${hoveredChoreId === chore.chore_id ? 'blur-sm opacity-50' : ''}`}>
                  {/* Grosses Emoji */}
                  <div className="text-4xl md:text-5xl mb-3 drop-shadow-sm">
                    {chore.choreIcon}
                  </div>

                  {/* Ämtli-Name */}
                  <h4 className={`${customization?.fontSize?.content || 'text-xl'} font-bold font-[Poppins] mb-1 line-clamp-2`}>
                    {chore.choreName}
                  </h4>

                  {/* Beschreibung (optional) */}
                  {chore.choreDescription && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2 font-[Poppins]">
                      {chore.choreDescription}
                    </p>
                  )}

                  {/* Spacer für konsistente Höhe */}
                  <div className="flex-1" />

                  {/* Zugewiesene Schüler */}
                  <div
                    className="flex flex-col gap-1 text-sm mt-3 pt-3 w-full"
                    style={{ borderTop: `1px solid ${chore.choreColor}30` }}
                  >
                    {chore.students.map((student, idx) => (
                      <div key={idx} className="flex items-center gap-2 justify-center">
                        <User className="w-4 h-4" style={{ color: chore.choreColor }} />
                        <span className={`font-semibold ${student.isCompleted ? 'line-through text-green-600' : ''}`}>
                          {student.name}
                        </span>
                        {student.isCompleted && (
                          <Check className="w-3 h-3 text-green-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hover Overlay with Buttons */}
                <AnimatePresence>
                  {hoveredChoreId === chore.chore_id && !chore.isCompleted && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3 z-20"
                      style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                    >
                      <motion.button
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ delay: 0.05 }}
                        onClick={() => handleMarkCompleted(chore.assignmentIds, true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl shadow-lg transition-colors"
                      >
                        <Check className="w-5 h-5" />
                        Erledigt
                      </motion.button>
                      <motion.button
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 10, opacity: 0 }}
                        transition={{ delay: 0.1 }}
                        onClick={() => handleMarkCompleted(chore.assignmentIds, false)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl shadow-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                        Nicht erledigt
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 md:py-12">
            <div className="text-4xl md:text-6xl mb-2 md:mb-4">📋</div>
            <p className={`${customization?.fontSize?.content || 'text-xl'} text-slate-500 dark:text-slate-400 font-[Poppins]`}>
              Keine Ämtchen für heute
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
