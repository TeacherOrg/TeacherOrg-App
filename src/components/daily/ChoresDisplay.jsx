import { motion } from "framer-motion";
import { User, Check, X, CheckCircle, XCircle, RotateCcw } from "lucide-react";

export default function ChoresDisplay({
  assignments,
  chores,
  students,
  customization,
  isDark,
  onMarkCompleted
}) {
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
        notCompletedCount: 0,
        isCompleted: false,
        isNotCompleted: false
      };
    }
    // Status normalisieren (Rückwärtskompatibilität)
    const status = assignment.status || (assignment.is_completed ? 'completed' : 'pending');
    acc[key].students.push({
      name: assignment.studentName,
      assignmentId: assignment.id,
      status: status,
      isCompleted: status === 'completed',
      isNotCompleted: status === 'not_completed'
    });
    acc[key].assignmentIds.push(assignment.id);
    if (status === 'completed') {
      acc[key].completedCount++;
    } else if (status === 'not_completed') {
      acc[key].notCompletedCount++;
    }
    return acc;
  }, {});

  // Mark chore status based on ALL students' statuses
  Object.values(groupedChores).forEach(chore => {
    const total = chore.students.length;
    // Alle erledigt = grün
    chore.isCompleted = total > 0 && chore.completedCount === total;
    // Mindestens einer nicht erledigt = rot (wenn keine mehr pending)
    chore.isNotCompleted = total > 0 &&
                           chore.notCompletedCount > 0 &&
                           (chore.completedCount + chore.notCompletedCount) === total;
  });

  const groupedChoresList = Object.values(groupedChores);

  // Theme-abhängige Transparenz und Textfarben
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
  const textColorClass = isThemedBackground
    ? 'text-white'
    : 'text-slate-800 dark:text-slate-200';
  const subtextColorClass = isThemedBackground
    ? 'text-white/70'
    : 'text-slate-500 dark:text-slate-400';

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

  const handleMarkCompleted = (assignmentIds, status) => {
    if (onMarkCompleted) {
      onMarkCompleted(assignmentIds, status);
    }
  };

  return (
    <motion.div
      className={`${containerBgClass} ${blurClass} rounded-2xl shadow-xl border ${borderClass} overflow-hidden h-full min-h-0 flex flex-col`}
      initial={customization?.reducedMotion ? false : { opacity: 0 }}
      animate={customization?.reducedMotion ? false : { opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className={`${headerBgClass} p-2 md:p-3 border-b border-slate-200/50 dark:border-slate-600/50`}>
        <h3 className={`${customization?.fontSize?.title || 'text-xl'} font-bold ${textColorClass} font-[Inter]`}>
          Ämtchen am Ende des Tages
        </h3>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4">
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
              >
                {/* Status Indicator */}
                {chore.isCompleted && (
                  <div className="absolute top-2 right-2 z-10">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                )}
                {chore.isNotCompleted && (
                  <div className="absolute top-2 right-2 z-10">
                    <XCircle className="w-6 h-6 text-red-500" />
                  </div>
                )}

                {/* Card Content */}
                <div>
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
                    <p className={`text-sm ${subtextColorClass} mb-3 line-clamp-2 font-[Poppins]`}>
                      {chore.choreDescription}
                    </p>
                  )}

                  {/* Spacer für konsistente Höhe */}
                  <div className="flex-1" />

                  {/* Zugewiesene Schüler */}
                  <div
                    className="flex flex-col gap-1.5 text-sm mt-3 pt-3 w-full"
                    style={{ borderTop: `1px solid ${chore.choreColor}30` }}
                  >
                    {chore.students.map((student, idx) => (
                      <div key={idx} className="flex items-center gap-2 w-full">
                        <User className="w-4 h-4 flex-shrink-0" style={{ color: chore.choreColor }} />
                        <span className={`font-semibold flex-1 text-left ${
                          student.isCompleted ? 'line-through text-green-600' :
                          student.isNotCompleted ? 'line-through text-red-500' : ''
                        }`}>
                          {student.name}
                        </span>
                        {/* Inline Buttons für individuelle Markierung */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {student.status !== 'completed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkCompleted([student.assignmentId], 'completed');
                              }}
                              className="p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                              title="Als erledigt markieren"
                            >
                              <Check className="w-4 h-4 text-green-500 hover:text-green-700" />
                            </button>
                          )}
                          {student.status !== 'not_completed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkCompleted([student.assignmentId], 'not_completed');
                              }}
                              className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              title="Als nicht erledigt markieren"
                            >
                              <X className="w-4 h-4 text-red-500 hover:text-red-700" />
                            </button>
                          )}
                          {(student.status === 'completed' || student.status === 'not_completed') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkCompleted([student.assignmentId], 'pending');
                              }}
                              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors"
                              title="Zurücksetzen"
                            >
                              <RotateCcw className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 md:py-12">
            <div className="text-4xl md:text-6xl mb-2 md:mb-4">📋</div>
            <p className={`${customization?.fontSize?.content || 'text-xl'} ${subtextColorClass} font-[Poppins]`}>
              Keine Ämtchen für heute
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
