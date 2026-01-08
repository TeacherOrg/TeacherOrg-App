import React from "react";
import { motion } from "framer-motion";
import { Clock, BookOpen, Settings, Maximize, Minimize, Coffee, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createMixedSubjectGradient, createGradient } from "@/utils/colorUtils";
import HolidayDecorations from "@/components/timetable/HolidayDecorations";

export default function LessonOverviewPanel({
  items,
  selectedItem,
  onItemSelect,
  currentHoliday,
  customization,
  currentItem,
  // Button Props
  onSettingsClick,
  onFullscreenToggle,
  isFullscreen,
  forcePauseView,
  onPauseToggle,
  showChoresView,
  onChoresToggle,
}) {
  // Kompakter Modus: Reduzierte Abstände
  const paddingClass = customization.compactMode ? 'p-2' : 'p-3';
  const gapClass = customization.compactMode ? 'gap-2' : 'gap-3';
  const cardPaddingClass = customization.compactMode ? 'p-2' : 'p-4';

  // Theme-abhängige Transparenz
  const isThemedBackground = customization.theme === 'space';
  const bgClass = isThemedBackground
    ? 'bg-transparent'
    : 'bg-white/80 dark:bg-slate-800/80';
  const headerBgClass = isThemedBackground
    ? 'bg-transparent'
    : 'bg-slate-100 dark:bg-slate-700';
  const borderClass = isThemedBackground
    ? 'border-purple-500/40 dark:border-purple-400/40'
    : 'border-slate-200/30 dark:border-slate-700/30';
  const blurClass = isThemedBackground ? '' : 'backdrop-blur-md';

  // Automatische Textfarben bei Space-Theme (immer hell für bessere Lesbarkeit)
  const textColorClass = isThemedBackground
    ? 'text-white'
    : 'text-slate-800 dark:text-slate-200';
  const iconColorClass = isThemedBackground
    ? 'text-white/80'
    : 'text-slate-600 dark:text-slate-400';
  const subtextColorClass = isThemedBackground
    ? 'text-white/70'
    : 'text-slate-600 dark:text-slate-400';
  const buttonClass = isThemedBackground
    ? 'text-white/80 hover:text-white hover:bg-white/20'
    : '';
  const getHolidayDisplay = (holiday) => {
    if (!holiday) return { emoji: '📅', gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' };
    switch (holiday.type) {
      case 'vacation':
        if (holiday.name.includes('Sommer')) return {
          emoji: '☀️',
          gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fb923c 100%)'
        };
        if (holiday.name.includes('Herbst')) return {
          emoji: '🍂',
          gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)'
        };
        if (holiday.name.includes('Weihnacht')) return {
          emoji: '🎄',
          gradient: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)'
        };
        if (holiday.name.includes('Sport')) return {
          emoji: '⛷️',
          gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)'
        };
        if (holiday.name.includes('Frühling')) return {
          emoji: '🌸',
          gradient: 'linear-gradient(135deg, #f9a8d4 0%, #f472b6 50%, #ec4899 100%)'
        };
        return {
          emoji: '🏖️',
          gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)'
        };
      case 'holiday': return {
        emoji: '🎉',
        gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #7e22ce 100%)'
      };
      case 'training': return {
        emoji: '📚',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)'
      };
      default: return {
        emoji: '📅',
        gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
      };
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

  // Animationen nur wenn reducedMotion false
  const cardVariants = customization.reducedMotion ? {} : {
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
      className={`${bgClass} ${blurClass} rounded-2xl shadow-xl border ${borderClass} overflow-hidden flex flex-col h-full min-h-0`}
      initial={customization.reducedMotion ? false : { opacity: 0, x: -50 }}
      animate={customization.reducedMotion ? false : { opacity: 1, x: 0 }}
    >
      <div className={`${headerBgClass} p-3 border-b border-slate-200/50 dark:border-slate-600/50`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className={`w-5 h-5 ${iconColorClass}`} />
            <h3 className={`${customization.fontSize.content} font-bold ${textColorClass} font-[Poppins]`}>
              Tagesübersicht
            </h3>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onSettingsClick} className={`h-7 w-7 rounded-lg ${buttonClass}`} title="Einstellungen">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onFullscreenToggle} className={`h-7 w-7 rounded-lg ${buttonClass}`} title="Vollbild">
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onPauseToggle}
              className={`h-7 w-7 rounded-lg ${forcePauseView ? 'bg-orange-500 text-white hover:bg-orange-600' : buttonClass}`}
              title="Pause"
            >
              <Coffee className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onChoresToggle}
              className={`h-7 w-7 rounded-lg ${showChoresView ? 'bg-blue-500 text-white hover:bg-blue-600' : buttonClass}`}
              title="Ämtli"
            >
              <ClipboardList className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden ${paddingClass}`}>
        {currentHoliday ? (
          <motion.div
            className="text-white p-6 rounded-xl text-center relative overflow-hidden"
            style={{ background: getHolidayDisplay(currentHoliday).gradient }}
          >
            {/* Animierte Dekorationen */}
            <HolidayDecorations type={currentHoliday.type} holidayName={currentHoliday.name} />

            {/* Inhalt */}
            <div className="relative z-10">
              <div className="text-6xl mb-4 drop-shadow-lg">{getHolidayDisplay(currentHoliday).emoji}</div>
              <h3 className={`${customization.fontSize.title} font-bold mb-2 font-[Inter] drop-shadow-md`}>
                {currentHoliday.name}
              </h3>
            </div>
          </motion.div>
        ) : items.length > 0 ? (
          <div className={`grid grid-cols-1 ${gapClass}`} style={{ gridAutoRows: '1fr' }}>
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
                  initial={customization.reducedMotion ? false : "hidden"}
                  animate={customization.reducedMotion ? false : "visible"}
                  whileHover={customization.reducedMotion ? undefined : "hover"}
                  whileTap={customization.reducedMotion ? undefined : "tap"}
                  onClick={() => onItemSelect(lesson)}
                  className={`
                    rounded-xl ${cardPaddingClass} cursor-pointer border-2 transition-all relative overflow-hidden min-h-full flex flex-col
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
                          initial={customization.reducedMotion ? false : { width: 0 }}
                          animate={{ width: `${lesson.progress}%` }}
                          transition={customization.reducedMotion ? { duration: 0 } : { duration: 0.5 }}
                        />
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
            <p className={`${customization.fontSize.content} ${subtextColorClass}`}>
              Keine Lektionen geplant
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}