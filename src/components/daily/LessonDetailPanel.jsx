import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, User, Users, Users2, Building, ChevronLeft, ChevronRight, Play, Coffee, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getThemeGradient } from "@/utils/colorDailyUtils";

const WORK_FORM_ICONS = {
  'Single': User,
  'Partner': Users2,
  'Group': Users,
  'Plenum': Building
};

const WORK_FORMS = {
  'Single': '👤 Single',
  'Partner': '👥 Partner', 
  'Group': '👨‍👩‍👧‍👦 Group',
  'Plenum': '🏛️ Plenum'
};

export default function LessonDetailPanel({
  lesson,
  currentItem,
  nextLesson,
  customization,
  currentTime,
  selectedDate,
  manualStepIndex,
  onManualStepChange,
  theme, // Neu hinzufügen
  isDark // Neu hinzufügen
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [manualStepControl, setManualStepControl] = useState(false);
  const [timeLeftInPause, setTimeLeftInPause] = useState("");

  // Determine what to display
  const displayLesson = lesson || (currentItem?.type === 'lesson' ? currentItem : null);
  const isPause = currentItem?.type === 'break';

  // Anpassung für Allerlei: Nutze lesson.color und isGradient
  const getLessonDisplay = (lesson) => {
    if (lesson.is_allerlei) {
      console.log("Debug: Allerlei Lesson in Detail", {
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
      name: lesson.subject?.name || lesson.subject || "Unbekanntes Fach",
      emoji: lesson.subject?.emoji || "📚",
      color: lesson.subject?.color || "#3b82f6",
      isGradient: lesson.isGradient || false,
    };
  };

  // NEU: Effekt für den Pausen-Countdown
  useEffect(() => {
    if (!isPause) {
      setTimeLeftInPause("");
      return;
    }

    const breakEndTime = new Date(`${new Date().toDateString()} ${currentItem.timeSlot.end}`);
    
    const timer = setInterval(() => {
      const now = new Date();
      const distance = breakEndTime.getTime() - now.getTime();

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeftInPause("Die Pause ist vorbei!");
        return;
      }

      const totalSeconds = Math.floor(distance / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      if (hours > 0) {
        setTimeLeftInPause(`${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      } else {
        setTimeLeftInPause(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isPause, currentItem]);

  // Sync with parent component's manual control state
  useEffect(() => {
    if (manualStepIndex !== null) {
      setCurrentStepIndex(manualStepIndex);
      setManualStepControl(true);
    } else {
      setManualStepControl(false);
    }
  }, [manualStepIndex]);

  // Calculate current step based on time (only for today)
  useEffect(() => {
    if (manualStepControl || !displayLesson) return;
    
    const today = new Date().toDateString();
    const selectedDay = selectedDate.toDateString();
    
    if (today !== selectedDay || !displayLesson.timeSlot || !displayLesson.steps) {
      setCurrentStepIndex(-1);
      return;
    }

    const lessonStart = new Date(`${today} ${displayLesson.timeSlot.start}`);
    let elapsed = (currentTime - lessonStart) / 60000;
    
    if (elapsed < 0) {
      setCurrentStepIndex(-1);
      return;
    }

    let stepIndex = 0;
    for (const step of displayLesson.steps) {
      const stepTime = parseInt(step.time) || 0;
      if (elapsed <= 0) break;
      elapsed -= stepTime;
      if (elapsed >= 0) stepIndex++;
    }
    
    setCurrentStepIndex(Math.min(stepIndex, displayLesson.steps.length - 1));
  }, [displayLesson, currentTime, selectedDate, manualStepControl]);

  const handlePrevStep = () => {
    const newIndex = Math.max(-1, currentStepIndex - 1);
    onManualStepChange(newIndex);
  };

  const handleNextStep = () => {
    const newIndex = Math.min(displayLesson.steps.length - 1, currentStepIndex + 1);
    onManualStepChange(newIndex);
  };

  const resetToAutoMode = () => {
    onManualStepChange(null);
  };

  const stepProgress = useMemo(() => {
    if (!displayLesson?.steps || selectedDate.toDateString() !== new Date().toDateString()) {
      return displayLesson.steps ? displayLesson.steps.map(() => 0) : [];
    }

    const progresses = [];
    const lessonStart = new Date(`${new Date().toDateString()} ${displayLesson.timeSlot.start}`);
    let elapsed = Math.max(0, (currentTime - lessonStart) / 60000);

    for (const step of displayLesson.steps) {
      const duration = parseInt(step.time) || 0;
      if (duration === 0) {
        progresses.push(0);
        continue;
      }
      if (elapsed >= duration) {
        progresses.push(100);
        elapsed -= duration;
      } else {
        progresses.push((elapsed / duration) * 100);
        elapsed = 0;
      }
    }

    return progresses;
  }, [displayLesson, currentTime, selectedDate]);

  // Pause View
  if (isPause) {
    return (
      <div className="rounded-2xl shadow-2xl border-2 border-slate-300/40 bg-slate-100/50 dark:bg-slate-800/50 overflow-hidden h-full flex flex-col items-center justify-center text-center p-6">
        <Coffee className="w-20 h-20 text-slate-500 mb-6" />
        <h2 className={`${customization.fontSize.title} font-bold text-slate-800 dark:text-slate-200`}>
          {currentItem.name}
        </h2>
        <span className={`font-bold tracking-tighter ${timeLeftInPause === "Die Pause ist vorbei!" ? "text-2xl" : "text-4xl"}`}>
          {timeLeftInPause}
        </span>
        
        {nextLesson && (
          <div className="mt-8 w-full max-w-md">
            <p className="text-slate-600 dark:text-slate-400 mb-2 font-semibold">Nächste Lektion:</p>
            <div className="p-4 rounded-xl border-2 transition-all duration-200" style={{ backgroundColor: nextLesson.subject.color + '20', borderColor: nextLesson.subject.color + '50' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`${customization.fontSize.content} font-bold text-slate-800 dark:text-slate-200`}>
                    {nextLesson.subject.name}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {nextLesson.description}
                  </p>
                </div>
                <ChevronsRight className="w-8 h-8 text-slate-400" style={{ color: nextLesson.subject.color }} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Add debugging logs for overflow check (updated for new grid layout)
  useEffect(() => {
    if (!displayLesson) return;

    const check = () => {
      // Robuster: Nimm das äußere Panel und das innere Grid
      const panel = document.querySelector('[class*="LessonDetailPanel"] > div > div.flex.h-full');
      const content = document.querySelector('.flex-1.overflow-y-auto.bg-white\\/95');
      const grid = document.querySelector('.grid-cols-\\[80px_80px_140px_1fr_200px\\]');

      console.log('%cLessonDetail Overflow Check', 'font-weight:bold; color:#ec4899');
      console.log('Viewport Breite:', window.innerWidth);
      if (content && grid) {
        console.log('Content wrapper Breite:', content.clientWidth, 'scrollWidth:', content.scrollWidth);
        console.log('Grid Breite:', grid.offsetWidth, 'scrollWidth:', grid.scrollWidth);
        console.log('Overflow?', grid.offsetWidth > content.clientWidth ? 'JA (Grid zu breit)' : 'Nein – alles gut 🎉');
      } else {
        console.log('Elemente nicht gefunden – wahrscheinlich noch nicht gerendert');
      }
    };

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [displayLesson]);

  // Lesson Detail View
  if (displayLesson) {
    const { name, emoji, color, isGradient } = getLessonDisplay(displayLesson);

    return (
      <div 
        className="flex h-full flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{ 
          background: isGradient ? color : getThemeGradient(theme || 'default', color, undefined, isDark),
          borderColor: color + '40',
        }}
      >
        {/* Header */}
        <div 
          className="p-6 cursor-default border-b flex justify-between items-center"
          style={{ 
            background: isGradient ? color : getThemeGradient(theme || 'default', color, -10, isDark),
          }}
        >
          <div>
            <h2 className={`${customization.fontSize.title} font-bold text-white`}>
              {emoji} {name}
            </h2>
            <p className={`${customization.fontSize.content} text-white/90`}>
              {displayLesson.description}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {displayLesson.timeSlot && (
              <div className="text-white/90 text-right">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">
                    {displayLesson.timeSlot.start} - {displayLesson.timeSlot.end}
                  </span>
                </div>
                <div className="text-sm">Periode {displayLesson.period_slot}</div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white/95 dark:bg-slate-900/95">
          <div className="p-4 md:p-6">
            {/* Step controls */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevStep}
                  disabled={currentStepIndex <= -1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextStep}
                  disabled={currentStepIndex >= displayLesson.steps.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                {manualStepControl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToAutoMode}
                    className="text-xs"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Auto
                  </Button>
                )}
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Schritt {Math.max(0, currentStepIndex + 1)} von {displayLesson.steps.length}
                {manualStepControl && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                    Manuell
                  </span>
                )}
              </span>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-4">
              {displayLesson.steps.map((step, index) => {
                const progress = stepProgress[index] || 0;
                const isCurrent = index === currentStepIndex;
                const isCompleted = progress === 100;
                const WorkFormIcon = WORK_FORM_ICONS[step.workForm] || User;

                return (
                  <div key={index} className={`p-4 rounded-xl border-2 ${index === currentStepIndex ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10">
                          <svg className="h-8 w-8 -rotate-90 transform">
                            <circle cx="16" cy="16" r="14" stroke="#e5e7eb" strokeWidth="3" fill="none" />
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              stroke={isCompleted ? "#22c55e" : "#3b82f6"}
                              strokeWidth="3"
                              fill="none"
                              strokeDasharray="88"
                              strokeDashoffset={88 * (1 - progress / 100)}
                              className="transition-all duration-500"
                            />
                          </svg>
                        </div>
                        <span className="font-semibold">{step.time} Min</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <WorkFormIcon className="h-5 w-5" />
                        <span>{WORK_FORMS[step.workForm] || step.workForm}</span>
                      </div>
                    </div>
                    <div className="text-sm"><span className="font-medium">Ablauf:</span> {step.activity || '–'}</div>
                    <div className="text-sm"><span className="font-medium">Material:</span> {step.material || '–'}</div>
                  </div>
                );
              })}
            </div>

            {/* === TABELLE MIT FORCIERTER RESPONSIVEN LAYOUT === */}
            {/* Desktop Steps – komplett responsives Grid (ersetzt die alte Tabelle) */}
            <div className="hidden md:block desktop-steps-grid">
              <div className="grid grid-cols-[80px_80px_140px_1fr_200px] gap-4">
                {/* Header */}
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 py-3"></div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 py-3">Zeit</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 py-3">Form</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 py-3">Ablauf</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 py-3">Material</div>

                {/* Rows */}
                {displayLesson.steps.map((step, index) => {
                  const progress = stepProgress[index] || 0;
                  const isCurrent = index === currentStepIndex;
                  const isCompleted = progress === 100;
                  const WorkFormIcon = WORK_FORM_ICONS[step.workForm] || User;

                  return (
                    <motion.div
                      key={step.id || index}
                      className={`grid grid-cols-subgrid col-span-5 gap-4 p-4 rounded-lg border transition-all ${
                        isCurrent 
                          ? 'bg-yellow-100 dark:bg-yellow-900/40 font-bold shadow-sm border-yellow-300 dark:border-yellow-700' 
                          : isCompleted 
                            ? 'bg-green-50 dark:bg-green-900/20 opacity-60' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {/* Progress Kreis */}
                      <div className="flex items-center">
                        <svg className="h-8 w-8 -rotate-90">
                          <circle cx="16" cy="16" r="14" stroke="#e5e7eb" strokeWidth="3" fill="none" />
                          <circle
                            cx="16" cy="16"
                            r="14"
                            stroke={isCompleted ? "#22c55e" : "#3b82f6"}
                            strokeWidth="3"
                            fill="none"
                            strokeDasharray="88"
                            strokeDashoffset={88 * (1 - progress / 100)}
                            className="transition-all duration-500"
                          />
                        </svg>
                      </div>

                      {/* Zeit */}
                      <div className="text-sm flex items-center">
                        {step.time ? `${step.time} Min` : '–'}
                      </div>

                      {/* Arbeitsform */}
                      <div className="text-sm flex items-center gap-2">
                        <WorkFormIcon className="h-5 w-5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{WORK_FORMS[step.workForm] || step.workForm || '–'}</span>
                      </div>

                      {/* Ablauf – bricht um, läuft nie über */}
                      <div className="text-sm break-words hyphens-auto">
                        {step.activity || '–'}
                      </div>

                      {/* Material – bricht auch um */}
                      <div className="text-sm break-words hyphens-auto">
                        {step.material || '–'}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Additional lesson info */}
            {(displayLesson.is_exam || displayLesson.is_half_class || displayLesson.is_double_lesson) && (
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <h4 className={`${customization.fontSize.content} font-semibold text-slate-700 dark:text-slate-300 mb-2`}>
                  Lektionsdetails
                </h4>
                <div className="flex flex-wrap gap-2">
                  {displayLesson.is_double_lesson && (
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm rounded-full">
                      Doppellektion ({displayLesson.is_double_lesson ? '90' : '45'} Min)
                    </span>
                  )}
                  {displayLesson.is_exam && (
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-sm rounded-full">
                      Prüfung
                    </span>
                  )}
                  {displayLesson.is_half_class && (
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-blue-300 text-sm rounded-full">
                      Halbklasse
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Placeholder View when no lesson is selected and it's not a break
  return (
    <div className="flex items-center justify-center h-full text-center bg-white/50 dark:bg-slate-800/50 rounded-2xl">
      <div>
        <div className="text-6xl mb-4">👈</div>
        <h2 className={`${customization.fontSize.title} font-bold text-slate-600 dark:text-slate-400 mb-2`}>
          Kein Element ausgewählt
        </h2>
        <p className={`${customization.fontSize.content} text-slate-500 dark:text-slate-500`}>
          Wählen Sie eine Lektion aus der Übersicht, um Details anzuzeigen.
        </p>
      </div>
    </div>
  );
}