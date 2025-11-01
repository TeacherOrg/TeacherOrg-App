import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, User, Users, Users2, Building, ChevronLeft, ChevronRight, Play, CheckCircle2, Circle, Coffee, ChevronsRight } from "lucide-react";
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
  completedSteps,
  onStepCompleteChange,
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

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      setTimeLeftInPause(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
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
  
  const handleStepToggle = useCallback((stepId) => {
    onStepCompleteChange(stepId);
  }, [onStepCompleteChange]);

  const totalTime = useMemo(() => {
    return displayLesson?.steps?.reduce((total, step) => total + (parseInt(step.time) || 0), 0) || 0;
  }, [displayLesson?.steps]);

  const completedTime = useMemo(() => {
    if (currentStepIndex < 0 || !displayLesson) return 0;
    return displayLesson.steps?.slice(0, currentStepIndex + 1).reduce((total, step) => total + (parseInt(step.time) || 0), 0) || 0;
  }, [displayLesson?.steps, currentStepIndex]);

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

  // Lesson Detail View
  if (displayLesson) {
    const { name, emoji, color, isGradient } = getLessonDisplay(displayLesson);

    return (
      <div 
        className="rounded-2xl shadow-2xl border-2 overflow-hidden h-full flex flex-col"
        style={{ 
          background: isGradient ? color : getThemeGradient(theme || 'default', color, undefined, isDark),
          borderColor: color + '40'
        }}
      >
        {/* Header */}
        <div 
          className="p-4 cursor-default border-b flex justify-between items-center"
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
        <div className="flex-1 overflow-y-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
          {displayLesson.steps && displayLesson.steps.length > 0 ? (
            <div className="p-4 md:p-6"> {/* Reduziert auf p-4, md:p-6 für Responsive */}
              {/* Progress indicator */}
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className={`${customization.fontSize.content} font-medium text-slate-700 dark:text-slate-300`}>
                    Fortschritt
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {completedTime} / {totalTime} Min
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${totalTime > 0 ? (completedTime / totalTime) * 100 : 0}%`,
                      backgroundColor: color
                    }}
                  />
                </div>
                
                {/* Step controls */}
                <div className="flex justify-between items-center mt-3">
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
              </div>

              {/* Steps table with Emojis */}
              <div className="overflow-x-auto max-w-full w-full">
                <table className="w-full table-auto lesson-detail-table">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-600">
                      <th className="p-3"></th>
                      <th className={`${customization.fontSize.content} text-left p-3 text-slate-700 dark:text-slate-300 font-semibold`}>
                        <span className="mr-1">⏱️</span>Zeit
                      </th>
                      <th className={`${customization.fontSize.content} text-left p-3 text-slate-700 dark:text-slate-300 font-semibold`}>
                        <span className="mr-1">👥</span>Form
                      </th>
                      <th className={`${customization.fontSize.content} text-left p-3 text-slate-700 dark:text-slate-300 font-semibold`}>
                        <span className="mr-1">✏️</span>Ablauf
                      </th>
                      <th className={`${customization.fontSize.content} text-left p-3 text-slate-700 dark:text-slate-300 font-semibold`}>
                        <span className="mr-1">📦</span>Material
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayLesson.steps.map((step, index) => {
                      const isCurrent = index === currentStepIndex;
                      const isCompleted = completedSteps.has(step.id);
                      const isPast = index < currentStepIndex;
                      const WorkFormIcon = WORK_FORM_ICONS[step.workForm] || User;
                      
                      return (
                        <motion.tr
                          key={step.id || index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`border-b border-slate-100 dark:border-slate-700 transition-all duration-200 ${
                            isCurrent 
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 font-bold shadow-md' 
                              : isPast && !isCompleted
                                ? 'opacity-60 bg-slate-50 dark:bg-slate-800/50' 
                                : isCompleted 
                                  ? 'opacity-50 bg-green-50 dark:bg-green-900/20 line-through'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="p-3 text-center break-words">
                            <button onClick={() => handleStepToggle(step.id)} className="cursor-pointer">
                              {isCompleted ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-slate-400" />}
                            </button>
                          </td>
                          <td className="p-3 break-words">
                            <div className="flex items-center gap-2">
                              {isCurrent && (
                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                              )}
                              <span className={`${customization.fontSize.content} ${isCurrent ? 'font-bold' : ''}`}>
                                {step.time ? `${step.time} Min` : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 break-words">
                            <div className="flex items-center gap-2">
                              <WorkFormIcon className="w-4 h-4 text-slate-500" />
                              <span className={`${customization.fontSize.content} ${isCurrent ? 'font-bold' : ''}`}>
                                {WORK_FORMS[step.workForm] || step.workForm || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 break-words">
                            <span className={`${customization.fontSize.content} ${isCurrent ? 'font-bold' : ''}`}>
                              {step.activity || '-'}
                            </span>
                          </td>
                          <td className="p-3 break-words">
                            <span className={`${customization.fontSize.content} ${isCurrent ? 'font-bold' : ''}`}>
                              {step.material || '-'}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
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
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">📝</div>
                <h3 className={`${customization.fontSize.title} font-bold text-slate-600 dark:text-slate-400 mb-2`}>
                  Keine Schritte definiert
                </h3>
                <p className={`${customization.fontSize.content} text-slate-500 dark:text-slate-500`}>
                  Für diese Lektion sind noch keine detaillierten Schritte hinterlegt.
                </p>
              </div>
            </div>
          )}
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