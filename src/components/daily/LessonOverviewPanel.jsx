import React from "react";
import { motion } from "framer-motion";
import { Clock, BookOpen } from "lucide-react";
import { createMixedSubjectGradient, createGradient } from "@/utils/colorUtils";

export default function LessonOverviewPanel({
  items,
  selectedItem,
  onItemSelect,
  currentHoliday,
  customization,
  currentItem,
}) {
  const getHolidayEmoji = (holiday) => {
    if (!holiday) return '📅';
    switch (holiday.type) {
      case 'vacation':
        if (holiday.name.includes('Sommer')) return '☀️';
        if (holiday.name.includes('Herbst')) return '🍂';
        if (holiday.name.includes('Weihnacht')) return '🎄';
        if (holiday.name.includes('Sport')) return '⛷️';
        if (holiday.name.includes('Frühling')) return '🌸';
        return '🏖️';
      case 'holiday': return '🎉';
      case 'training': return '📚';
      default: return '📅';
    }
  };

  const getHolidayHexColor = (holiday) => {
    if (!holiday) return '#64748b';
    switch (holiday.type) {
      case 'vacation':
        if (holiday.name.includes('Sommer')) return '#f59e0b';
        if (holiday.name.includes('Herbst')) return '#f97316';
        if (holiday.name.includes('Weihnacht')) return '#22c55e';
        if (holiday.name.includes('Sport')) return '#3b82f6';
        if (holiday.name.includes('Frühling')) return '#ec4899';
        return '#06b6d4';
      case 'holiday': return '#8b5cf6';
      case 'training': return '#6366f1';
      default: return '#64748b';
    }
  };

  const getLessonDisplay = (lesson) => {
    if (lesson.is_allerlei) {
      return {
        name: "Allerlei",
        emoji: "🌈",
        // Farbe wird vom Gradient überschrieben → egal was hier steht
        color: '#a855f7',
      };
    }

    // Verwende displayName/displayEmoji aus DailyView
    return {
      name: lesson.displayName || lesson.subject?.name || "Unbekanntes Fach",
      emoji: lesson.displayEmoji || lesson.subject?.emoji || "📚",
      color: lesson.subject?.color || "#3b82f6",
    };
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08 } }),
    hover: { scale: 1.03 },
    tap: { scale: 0.98 },
  };

  const getCardGradient = (lesson) => {
    if (lesson.is_allerlei && Array.isArray(lesson.allerleiColors) && lesson.allerleiColors.length > 0) {
      return createMixedSubjectGradient(lesson.allerleiColors);
    }

    // Normale Lektionen: echte Fachfarbe
    const color = lesson.subject?.color || lesson.color || '#3b82f6';
    return createGradient(color, -25);
  };

  return (
    <motion.div
      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/30 dark:border-slate-700/30 overflow-hidden h-full flex flex-col"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="bg-slate-100 dark:bg-slate-700 p-3 border-b border-slate-200 dark:border-slate-600">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className={`${customization.fontSize.content} font-bold text-slate-800 dark:text-slate-200 font-[Poppins]`}>
            Tagesübersicht
          </h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {currentHoliday ? (
          <motion.div
            className="text-white p-6 rounded-xl text-center"
            style={{ background: getCardGradient(getHolidayHexColor(currentHoliday)) }}
          >
            <div className="text-6xl mb-4">{getHolidayEmoji(currentHoliday)}</div>
            <h3 className={`${customization.fontSize.title} font-bold mb-2 font-[Inter]`}>
              {currentHoliday.name}
            </h3>
          </motion.div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 gap-3" style={{ gridAutoRows: '1fr' }}>
            {items.map((lesson, index) => {
              const isSelected = selectedItem?.id === lesson.id;
              const isCurrent = currentItem?.type === 'lesson' && currentItem.id === lesson.id;
              const isPast = lesson.progress >= 100;
              const { name, emoji, color } = getLessonDisplay(lesson);

              return (
                <motion.div
                  key={lesson.id}
                  custom={index}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => onItemSelect(lesson)}
                  className={`
                    rounded-xl p-4 cursor-pointer border-2 transition-all relative overflow-hidden min-h-full flex flex-col
                    ${isSelected ? 'ring-4 ring-blue-400 border-blue-500' : 'border-transparent'}
                    ${isCurrent ? 'ring-2 ring-green-400' : ''}
                    ${isPast ? 'opacity-70' : ''}
                  `}
                  style={{
                    background: getCardGradient(lesson),
                    gridRow: lesson.spansSlots > 1 ? `span ${lesson.spansSlots}` : 'auto',
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className={`${customization.fontSize.content} font-bold text-white font-[Inter] flex items-center gap-2 flex-wrap`}>
                        {emoji} {name}
                        
                        {/* Symbole direkt im Titel */}
                        {lesson.is_exam && <span className="text-red-300 font-bold text-lg">!</span>}
                        {lesson.is_half_class && <span className="text-blue-300 font-bold">½</span>}
                        {lesson.is_double_lesson && <span className="text-yellow-300 font-bold">×2</span>}
                        
                        {isCurrent && (
                          <span className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                            Aktuell
                          </span>
                        )}
                      </h4>
                      <p className="text-white/90 text-sm mt-1 line-clamp-2">
                        {lesson.description}
                      </p>
                    </div>
                  </div>

                  {/* Zeit + Fortschritt */}
                  {lesson.timeSlot && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-white/90 text-sm mb-2">
                        <Clock className="w-4 h-4" />
                        <span>{lesson.timeSlot.start} – {lesson.timeSlot.end}</span>
                      </div>

                      <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className="h-full bg-white rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${lesson.progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <div className="text-right text-white/80 text-xs mt-1">
                        {lesson.progress}% abgeschlossen
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <p className={`${customization.fontSize.content} text-slate-500 dark:text-slate-400`}>
              Keine Lektionen geplant
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}