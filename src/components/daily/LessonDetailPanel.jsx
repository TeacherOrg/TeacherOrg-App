import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  User,
  Users2,
  Users,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Play,
  Coffee,
  Megaphone,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTopicProgress } from "@/hooks/useTopicProgress";
import { useAllerleiTopicProgress } from "@/hooks/useAllerleiTopicProgress";
import { createMixedSubjectGradient, createGradient } from "@/utils/colorUtils";

const WORK_FORM_ICONS = {
  single: User,
  partner: Users2,
  group: Users,
  plenum: MessageCircle,
  frontal: Megaphone,
  experiment: FlaskConical,
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
  onStepComplete, // Callback wenn ein Step abgeschlossen wird
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [manualStepControl, setManualStepControl] = useState(false);
  const completedStepsRef = useRef(new Set()); // Track welche Steps bereits als complete gemeldet wurden

  // Anzuzeigende Lektion (ausgewählt oder aktuell laufend)
  const displayLesson = lesson || (currentItem?.type === "lesson" ? currentItem : null);
  const isPause = currentItem?.type === "break";

  const { topic, planned, completed } = useTopicProgress(displayLesson);
  const allerleiProgresses = useAllerleiTopicProgress(displayLesson);

  // Lokaler State für manuell abgehakte Steps (nur Session, kein DB-Speichern)
  const [manuallyCompletedSteps, setManuallyCompletedSteps] = useState(new Set());

  // Reset bei Lektionswechsel
  useEffect(() => {
    setManuallyCompletedSteps(new Set());
  }, [displayLesson?.id]);

  // Toggle-Funktion für manuelles Abhaken
  const toggleStepComplete = (index) => {
    setManuallyCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Fachfarbe + Name + Emoji ermitteln (inkl. Allerlei)
  const getLessonDisplay = (lesson) => {
    if (lesson?.is_allerlei) {
      return {
        name: "Allerlei",
        emoji: "🌈",
        // KEINE feste Farbe mehr! Wird vom Gradient überschrieben
        color: null, // oder '#a855f7' nur als allerletzter Fallback
      };
    }
    return {
      name: lesson?.subject?.name || lesson?.displayName || "Unbekanntes Fach",
      emoji: lesson?.subject?.emoji || lesson?.displayEmoji || "📚",
      color: lesson?.subject?.color || "#3b82f6",
    };
  };

  const { name, emoji, color } = getLessonDisplay(displayLesson);

  // Live-Uhrzeit formatieren
  const liveTime = currentTime.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Einfacher, kräftiger Gradient nur aus der Fachfarbe (wie in den alten Versionen)
  const headerGradient = lesson.is_allerlei && lesson.allerleiColors?.length > 0
    ? createMixedSubjectGradient(lesson.allerleiColors)
    : createGradient(color || "#3b82f6", -25); // color kommt aus getLessonDisplay

  // Manuelle Schrittsteuerung synchronisieren
  useEffect(() => {
    if (manualStepIndex !== null) {
      setCurrentStepIndex(manualStepIndex);
      setManualStepControl(true);
    } else {
      setManualStepControl(false);
    }
  }, [manualStepIndex]);

  // Automatischer Schrittfortschritt (nur heute)
  useEffect(() => {
    if (manualStepControl || !displayLesson) return;

    const today = new Date().toDateString();
    const selectedDay = selectedDate.toDateString();

    if (today !== selectedDay || !displayLesson.timeSlot || !displayLesson.steps?.length) {
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

  // Schrittfortschritt für Progresskreise
  const stepProgress = useMemo(() => {
    if (!displayLesson?.steps?.length || selectedDate.toDateString() !== new Date().toDateString()) {
      return displayLesson?.steps?.map(() => 0) || [];
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

  // Trigger onStepComplete callback when a step reaches 100%
  useEffect(() => {
    if (!onStepComplete || !displayLesson?.id || !stepProgress.length) return;

    stepProgress.forEach((progress, index) => {
      const stepKey = `${displayLesson.id}-step-${index}`;
      if (progress >= 100 && !completedStepsRef.current.has(stepKey)) {
        completedStepsRef.current.add(stepKey);
        onStepComplete(index);
      }
    });
  }, [stepProgress, displayLesson?.id, onStepComplete]);

  // Reset completed steps ref when lesson changes
  useEffect(() => {
    completedStepsRef.current = new Set();
  }, [displayLesson?.id]);

  // Pause-Ansicht mit Live-Countdown
  if (isPause) {
    // Berechne verbleibende Zeit bis Pausenende
    const pauseEnd = new Date(`${new Date().toDateString()} ${currentItem.timeSlot?.end}`);
    const remainingMs = Math.max(0, pauseEnd - currentTime);
    const remainingMinutes = Math.floor(remainingMs / 60000);
    const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);

    // Sammle Materialien der nächsten Lektion (dedupliziert)
    const nextLessonMaterials = [...new Set(
      nextLesson?.steps
        ?.map(step => step.material)
        .filter(m => m && m.trim() !== '' && m !== '–')
    )] || [];

    // Dynamische Farbe basierend auf dem nächsten Fach (Fallback: Orange)
    const nextSubjectColor = nextLesson?.subject?.color || '#f97316';

    // Prüfe ob es eine Doppellektions-Pause ist (gleiche Lektion nach der Pause)
    const isDoubleLessonBreak = displayLesson?.is_double_lesson &&
      nextLesson?.id === displayLesson?.id;

    // Theme-abhängige Transparenz und Textfarben für Pause-Ansicht
    const isSpaceTheme = customization.theme === 'space';
    const pauseBgClass = isSpaceTheme
      ? 'bg-white/30 dark:bg-slate-900/30 border border-white/20 dark:border-white/10'
      : 'bg-white/95 dark:bg-slate-900/95';
    const pauseTextClass = isSpaceTheme ? 'text-white' : 'text-slate-800 dark:text-slate-200';
    const pauseSubtextClass = isSpaceTheme ? 'text-white/80' : 'text-slate-700 dark:text-slate-300';
    const pauseCardBgClass = isSpaceTheme
      ? 'bg-white/20 dark:bg-slate-800/50 border border-white/20'
      : 'bg-slate-100 dark:bg-slate-800';
    const pauseLabelClass = isSpaceTheme ? 'text-white/70' : 'text-slate-600 dark:text-slate-400';

    return (
      <div className={`rounded-2xl shadow-2xl ${pauseBgClass} overflow-hidden h-full flex flex-col items-center justify-center p-8`}>
        {/* Kaffeetasse - Farbe des nächsten Fachs */}
        <Coffee className="w-20 h-20 mb-4 animate-pulse" style={{ color: nextSubjectColor }} />

        {/* Pause Text */}
        <h2 className={`text-3xl font-bold ${pauseTextClass} mb-2`}>
          {currentItem.name}
        </h2>

        {/* Live Countdown - Farbe des nächsten Fachs */}
        <div className="text-5xl font-bold tabular-nums mb-8" style={{ color: nextSubjectColor }}>
          {String(remainingMinutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
        </div>

        {/* Nächste Lektion - NICHT anzeigen bei Doppellektions-Pause */}
        {nextLesson && !isDoubleLessonBreak && (
          <div className={`w-full max-w-md ${pauseCardBgClass} rounded-xl p-6`}>
            <h3 className={`text-lg font-semibold ${pauseSubtextClass} mb-2`}>
              Nächste Lektion
            </h3>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{nextLesson.displayEmoji || nextLesson.subject?.emoji || '📚'}</span>
              <span className={`text-xl font-bold ${pauseTextClass}`}>
                {nextLesson.displayName || nextLesson.subject?.name || 'Unbekannt'}
              </span>
            </div>

            {/* Materialien - Bullet Points in Fachfarbe */}
            {nextLessonMaterials.length > 0 && (
              <div className="mt-4">
                <h4 className={`text-sm font-semibold ${pauseLabelClass} mb-2`}>
                  Materialien bereitstellen:
                </h4>
                <ul className="space-y-1">
                  {nextLessonMaterials.map((material, idx) => (
                    <li key={idx} className={`flex items-center gap-2 ${pauseSubtextClass}`}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: nextSubjectColor }}></span>
                      {material}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

      </div>
    );
  }

  // Keine Lektion ausgewählt
  if (!displayLesson) {
    const isSpaceTheme = customization.theme === 'space';
    return (
      <div className={`flex items-center justify-center h-full text-center rounded-2xl ${
        isSpaceTheme ? 'bg-transparent' : 'bg-white/50 dark:bg-slate-800/50'
      }`}>
        <div>
          <div className="text-6xl mb-4">👈</div>
          <h2 className={`${customization.fontSize.title} font-bold mb-2 ${
            isSpaceTheme ? 'text-white' : 'text-slate-600 dark:text-slate-400'
          }`}>
            Kein Element ausgewählt
          </h2>
          <p className={`${customization.fontSize.content} ${
            isSpaceTheme ? 'text-white/70' : 'text-slate-500'
          }`}>Wählen Sie eine Lektion aus.</p>
        </div>
      </div>
    );
  }

  // Kompakter Modus
  const headerPadding = customization.compactMode ? 'p-4' : 'p-6';
  const contentPadding = customization.compactMode ? 'p-3 md:p-4' : 'p-4 md:p-6';

  // Theme-abhängige Transparenz
  const isThemedBackground = customization.theme === 'space';
  const getBgClass = () => {
    if (customization.transparencyMode) {
      return "bg-transparent border border-white/20 dark:border-white/10";
    }
    if (isThemedBackground) {
      return "bg-transparent border border-purple-500/30 dark:border-purple-400/30";
    }
    return "bg-white/95 dark:bg-slate-900/95 border border-slate-200/30 dark:border-slate-700/30";
  };

  // Transition-Klassen bedingt anwenden
  const transitionClass = customization.reducedMotion ? '' : 'transition-all duration-500';

  // Haupt-Detail-Ansicht
  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl shadow-2xl ${getBgClass()}`}
    >
      {/* Header mit Fachfarben-Gradient */}
      <div
        className={`${headerPadding} border-b border-slate-200 dark:border-slate-700`}
        style={{ background: customization.transparencyMode ? "transparent" : headerGradient }}
      >
        <div className="flex justify-between items-start">
          <div>
            <h2 className={`${customization.fontSize.title} font-bold text-white flex items-center gap-3 flex-wrap`}>
              {emoji} {name}

              {/* Symbole direkt im Titel */}
              {displayLesson.is_exam && <span className="text-red-300 font-bold text-4xl leading-none">!</span>}
              {displayLesson.is_half_class && <span className="text-blue-300 font-bold text-3xl">½</span>}
              {displayLesson.is_double_lesson && <span className="text-yellow-300 font-bold text-3xl">×2</span>}
            </h2>

            {/* Themenzeile mit Progression als Bruch */}
            {displayLesson?.is_allerlei && allerleiProgresses.length > 0 ? (
              <div className="flex flex-wrap gap-3 mt-1">
                {allerleiProgresses.map(({ topic: t, planned: p, completed: c }) => (
                  <span key={t.id} className="text-white/80 text-sm">
                    {t.name} ({c}/{p})
                  </span>
                ))}
              </div>
            ) : topic ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/80">{topic.name}</span>
                <span className="text-white/60 text-sm">({completed}/{planned})</span>
              </div>
            ) : null}

            <p className={`mt-2 text-white/90 ${customization.fontSize.content}`}>
              {displayLesson.description}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-white tabular-nums">
              {liveTime}
            </div>
          </div>
        </div>
      </div>


      {/* Inhaltsbereich */}
      <div className={`flex-1 min-h-0 overflow-y-auto ${isThemedBackground ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-white/95 dark:bg-slate-900/95'}`}>
        <div className={contentPadding}>
          {/* Schrittsteuerung */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onManualStepChange(Math.max(-1, currentStepIndex - 1))} disabled={currentStepIndex <= -1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => onManualStepChange(Math.min(displayLesson.steps.length - 1, currentStepIndex + 1))} disabled={currentStepIndex >= displayLesson.steps.length - 1}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              {manualStepControl && (
                <Button variant="outline" size="sm" onClick={() => onManualStepChange(null)}>
                  <Play className="w-4 h-4 mr-1" /> Auto
                </Button>
              )}
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Schritt {Math.max(0, currentStepIndex + 1)} von {displayLesson.steps.length}
            </span>
          </div>

          {/* Mobile Karten-Layout */}
          <div className="md:hidden space-y-4">
            {displayLesson.steps.map((step, index) => {
              const progress = stepProgress[index] || 0;
              const isCurrent = index === currentStepIndex;
              const isCompleted = progress === 100;
              const WorkFormIcon = WORK_FORM_ICONS[step.workForm] || User;

              return (
                <div
                  key={step.id || index}
                  className={`p-4 rounded-xl border-2 ${
                    isCurrent
                      ? isThemedBackground
                        ? "border-blue-400/50 bg-blue-500/20"
                        : "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                      : isThemedBackground
                        ? "border-slate-500/20 bg-white/5"
                        : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <svg
                        className="h-10 w-10 -rotate-90 cursor-pointer hover:scale-110 transition-transform"
                        onClick={(e) => { e.stopPropagation(); toggleStepComplete(index); }}
                        title="Klicken um Schritt als erledigt zu markieren"
                      >
                        <circle cx="20" cy="20" r="16" stroke="#e5e7eb" strokeWidth="4" fill="none" />
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          stroke={manuallyCompletedSteps.has(index) ? "#22c55e" : (isCompleted ? "#22c55e" : "#3b82f6")}
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray="100"
                          strokeDashoffset={manuallyCompletedSteps.has(index) ? 0 : 100 * (1 - progress / 100)}
                          className={transitionClass}
                        />
                        {manuallyCompletedSteps.has(index) && (
                          <text x="20" y="24" textAnchor="middle" fill="#22c55e" fontSize="14" className="rotate-90" style={{ transformOrigin: '20px 20px' }}>✓</text>
                        )}
                      </svg>
                      <span className="font-semibold text-lg">{step.time} Min</span>
                    </div>
                    <div className="flex items-center">
                      <WorkFormIcon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className={`${customization.fontSize?.steps || 'text-sm'}`}>
                    <span className="font-medium">Ablauf:</span> {step.activity || "–"}
                  </div>
                  <div className={`${customization.fontSize?.steps || 'text-sm'} mt-1`}>
                    <span className="font-medium">Material:</span> {step.material || "–"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Grid-Layout */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[80px_80px_140px_1fr_200px] gap-4">
              <div className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 py-3"> </div>
              <div className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 py-3">Zeit</div>
              <div className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 py-3">Form</div>
              <div className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 py-3">Ablauf</div>
              <div className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 py-3">Material</div>

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
                        ? isThemedBackground
                          ? "bg-yellow-500/20 border-yellow-400/50 shadow-sm"
                          : "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600 shadow-sm"
                        : isCompleted
                        ? isThemedBackground
                          ? "bg-green-500/15 border-green-500/30 opacity-80"
                          : "bg-green-50 dark:bg-green-900/20 opacity-70"
                        : isThemedBackground
                          ? "bg-white/5 border-slate-500/20"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center">
                      <svg
                        className="h-10 w-10 -rotate-90 cursor-pointer hover:scale-110 transition-transform"
                        onClick={(e) => { e.stopPropagation(); toggleStepComplete(index); }}
                        title="Klicken um Schritt als erledigt zu markieren"
                      >
                        <circle cx="20" cy="20" r="16" stroke="#e5e7eb" strokeWidth="4" fill="none" />
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          stroke={manuallyCompletedSteps.has(index) ? "#22c55e" : (isCompleted ? "#22c55e" : "#3b82f6")}
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray="100"
                          strokeDashoffset={manuallyCompletedSteps.has(index) ? 0 : 100 * (1 - progress / 100)}
                          className={transitionClass}
                        />
                        {manuallyCompletedSteps.has(index) && (
                          <text x="20" y="24" textAnchor="middle" fill="#22c55e" fontSize="14" className="rotate-90" style={{ transformOrigin: '20px 20px' }}>✓</text>
                        )}
                      </svg>
                    </div>
                    <div className={`flex items-center ${customization.fontSize?.steps || 'text-sm'}`}>{step.time ? `${step.time} Min` : "–"}</div>
                    <div className={`flex items-center ${customization.fontSize?.steps || 'text-sm'}`}>
                      <WorkFormIcon className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className={`break-words ${customization.fontSize?.steps || 'text-sm'}`}>{step.activity || "–"}</div>
                    <div className={`break-words ${customization.fontSize?.steps || 'text-sm'}`}>{step.material || "–"}</div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}