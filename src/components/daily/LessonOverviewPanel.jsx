import React from "react";
import { motion } from "framer-motion";
import { Clock, BookOpen } from "lucide-react";
import { getThemeGradient, getGlowColor, getThemeTextColor } from "@/utils/colorDailyUtils";

export default function LessonOverviewPanel({
  items,
  selectedItem,
  onItemSelect,
  currentHoliday,
  customization,
  currentItem,
  theme,
  isDark
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
      case 'holiday':
        return '🎉';
      case 'training':
        return '📚';
      default:
        return '📅';
    }
  };

  const getHolidayHexColor = (holiday) => {
    if (!holiday) return '#64748b'; // Default Slate-500
    
    switch (holiday.type) {
      case 'vacation':
        if (holiday.name.includes('Sommer')) return '#f59e0b'; // Yellow-500
        if (holiday.name.includes('Herbst')) return '#f97316'; // Orange-500
        if (holiday.name.includes('Weihnacht')) return '#22c55e'; // Green-500
        if (holiday.name.includes('Sport')) return '#3b82f6'; // Blue-500
        if (holiday.name.includes('Frühling')) return '#ec4899'; // Pink-500
        return '#06b6d4'; // Cyan-500
      case 'holiday':
        return '#8b5cf6'; // Purple-500
      case 'training':
        return '#6366f1'; // Indigo-500
      default:
        return '#64748b'; // Slate-500
    }
  };

  // Anpassung für Allerlei: Nutze lesson.color und isGradient
  const getLessonDisplay = (lesson) => {
    if (lesson.is_allerlei) {
      console.log("Debug: Allerlei Lesson in Overview", {
        lessonId: lesson.id,
        color: lesson.color,
        isGradient: lesson.isGradient,
        allerlei_subjects: lesson.allerlei_subjects
      });
      return {
        name: "Allerlei",
        emoji: "🌈",
        color: lesson.color || "#a855f7", // Fallback auf Purple-500
        isGradient: lesson.isGradient || false,
      };
    }
    return {
      name: lesson.subject?.name || "Unbekanntes Fach",
      emoji: lesson.subject?.emoji || "📚",
      color: lesson.subject?.color || "#3b82f6",
      isGradient: lesson.isGradient || false,
    };
  };

  // Variants for animations
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (index) => ({
      opacity: 1,
      y: 0,
      transition: { delay: index * 0.1, duration: 0.5, ease: "easeOut" },
    }),
    hover: { scale: 1.03, boxShadow: "0px 4px 12px rgba(0,0,0,0.1)" },
    tap: { scale: 0.97 },
  };

  return (
    <motion.div 
      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/30 dark:border-slate-700/30 overflow-hidden h-full flex flex-col"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Handle for dragging */}
      <div className="bg-slate-100 dark:bg-slate-700 p-3 cursor-default border-b border-slate-200 dark:border-slate-600">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className={`${customization.fontSize.content} font-bold text-slate-800 dark:text-slate-200 font-[Poppins]`}>
            Tagesübersicht
          </h3>
        </div>
      </div>

      {/* Content - Max-Height und Overflow anpassen */}
      <div className="flex-1 overflow-y-auto p-2 md:p-4">
        {currentHoliday ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white p-4 md:p-6 rounded-xl text-center"
            style={{ background: getThemeGradient(theme || 'default', getHolidayHexColor(currentHoliday), -10, isDark) }}
          >
            <div className="text-4xl md:text-6xl mb-2 md:mb-4">{getHolidayEmoji(currentHoliday)}</div>
            <h3 className={`${customization.fontSize.title} font-bold mb-1 md:mb-2 font-[Inter]`}>
              {currentHoliday.name}
            </h3>
            {items.length > 0 && (
              <div className="mt-2 md:mt-4">
                <p className={`${customization.fontSize.content} opacity-90 mb-1 md:mb-2 font-[Poppins]`}>
                  Hinweis: Termine trotz Ferien/Feiertag:
                </p>
                <div className="space-y-1">
                  {items.map((item, index) => (
                    <div key={index} className="text-xs md:text-sm opacity-80">
                      {item.type === 'break' ? 
                        `${item.name} (${item.timeSlot.start} - ${item.timeSlot.end})` :
                        `${item.subject?.name || item.subject} - ${item.description}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : items.length > 0 ? (
          <div className="space-y-1 md:space-y-3">
            {items.map((lesson, index) => {
              const isSelected = selectedItem?.id === lesson.id;
              const isCurrent = currentItem?.type === 'lesson' && currentItem.id === lesson.id;
              const isPast = lesson.progress >= 100;
              const { name, emoji, color, isGradient } = getLessonDisplay(lesson);
              const cardStyle = {
                background: isGradient 
                  ? color 
                  : (isCurrent ? color : getThemeGradient(theme || 'default', color, undefined, isDark) + '20'), // Voll saturiert für aktiv
                borderColor: isSelected ? color : undefined,
                color: getThemeTextColor(theme || 'default', color, isDark),
              };
              const glowStyle = isCurrent ? { boxShadow: getGlowColor(theme || 'default', color, undefined, isDark) } : {};
              
              return (
                <motion.div
                  key={lesson.id}
                  custom={index}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  whileTap="tap"
                  className={`p-2 md:p-4 rounded-xl cursor-pointer border-2 transition-all duration-200 ${
                    isSelected 
                      ? 'border-blue-500 shadow-lg scale-105' 
                      : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                  } ${
                    isPast ? 'opacity-60' : 'opacity-100'
                  } ${
                    isCurrent ? 'ring-2 ring-green-400 ring-opacity-75' : ''
                  }`}
                  style={{ 
                    ...cardStyle, 
                    ...glowStyle,
                    backgroundColor: isGradient ? undefined : color + '20',
                  }}
                  onClick={() => onItemSelect(lesson)}
                >
                  <div className="flex items-start justify-between mb-1 md:mb-2">
                    <div>
                      <h4 className={`${customization.fontSize.content} font-bold font-[Inter]`}>
                        {emoji} {name}
                        {isCurrent && (
                          <span className="ml-2 px-1 md:px-2 py-0.5 md:py-1 bg-green-500 text-white text-xs rounded-full">
                            Aktuell
                          </span>
                        )}
                      </h4>
                      <p className="text-xs md:text-sm mt-0.5 md:mt-1 font-[Poppins] line-clamp-1">
                        {lesson.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs md:text-sm font-medium font-[Poppins]">
                        Periode {lesson.period_slot}
                      </div>
                      {lesson.is_double_lesson && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium font-[Poppins]">
                          Doppellektion
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time and Progress */}
                  {lesson.timeSlot && (
                    <div className="space-y-1 md:space-y-2">
                      <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm font-[Poppins]">
                        <Clock className="w-3 md:w-4 h-3 md:h-4" />
                        <span>{lesson.timeSlot.start} - {lesson.timeSlot.end}</span>
                      </div>
                      
                      <motion.div 
                        className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 md:h-2 overflow-hidden"
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 0.5 }}
                      >
                        <motion.div 
                          className="h-1.5 md:h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${lesson.progress}%` }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          style={{ 
                            backgroundColor: color 
                          }}
                        />
                      </motion.div>
                      
                      <div className="text-xs text-right font-[Poppins]">
                        {lesson.progress}% abgeschlossen
                      </div>
                    </div>
                  )}

                  {/* Additional lesson flags */}
                  <div className="flex gap-1 md:gap-2 mt-1 md:mt-2 flex-wrap">
                    {lesson.is_exam && (
                      <motion.span 
                        className="px-1 md:px-2 py-0.5 md:py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs rounded-full"
                        whileHover={{ scale: 1.1 }}
                      >
                        Prüfung
                      </motion.span>
                    )}
                    {lesson.is_half_class && (
                      <motion.span 
                        className="px-1 md:px-2 py-0.5 md:py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                        whileHover={{ scale: 1.1 }}
                      >
                        Halbklasse
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 md:py-12">
            <div className="text-4xl md:text-6xl mb-2 md:mb-4">📚</div>
            <p className={`${customization.fontSize.content} text-slate-500 dark:text-slate-400 font-[Poppins]`}>
              Keine Lektionen geplant
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}