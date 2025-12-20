import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  User,
  Users2,
  Users,
  Building,
  ChevronLeft,
  ChevronRight,
  Play,
  Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TopicProgressBar from "./TopicProgressBar";
import { useTopicProgress } from "@/hooks/useTopicProgress";
import { useAllerleiTopicProgress } from "@/hooks/useAllerleiTopicProgress";
import AllTopicsProgressOverview from "./AlltopicsProgressOverview";
import { useAllActiveTopicsProgress } from "@/hooks/useAllActiveTopicsProgress";
import { createMixedSubjectGradient, createGradient } from "@/utils/colorUtils";

const WORK_FORM_ICONS = {
  Single: User,
  Partner: Users2,
  Group: Users,
  Plenum: Building,
};

const WORK_FORMS = {
  Single: "👤 Single",
  Partner: "👥 Partner",
  Group: "👨‍👩‍👧‍👦 Group",
  Plenum: "🏛️ Plenum",
};

export default function LessonDetailPanel({
  lesson,
  currentItem,
  customization,
  currentTime,
  selectedDate,
  manualStepIndex,
  onManualStepChange,
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [manualStepControl, setManualStepControl] = useState(false);

  // Anzuzeigende Lektion (ausgewählt oder aktuell laufend)
  const displayLesson = lesson || (currentItem?.type === "lesson" ? currentItem : null);
  const isPause = currentItem?.type === "break";

  const { topic, planned, completed } = useTopicProgress(displayLesson);
  const allerleiProgresses = useAllerleiTopicProgress(displayLesson);
  const allProgress = useAllActiveTopicsProgress();

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

  // Pause-Ansicht
  if (isPause) {
    return (
      <div className="rounded-2xl shadow-2xl bg-white/95 dark:bg-slate-900/95 overflow-hidden h-full flex flex-col items-center justify-center p-8">
        <Coffee className="w-24 h-24 text-orange-500 mb-8 animate-pulse" />
        <h2 className="text-4xl font-bold text-slate-800 dark:text-slate-200 mb-12">
          {currentItem.name}
        </h2>
        <div className="w-full max-w-2xl">
          <AllTopicsProgressOverview progresses={allProgress} />
        </div>
      </div>
    );
  }

  // Keine Lektion ausgewählt
  if (!displayLesson) {
    return (
      <div className="flex items-center justify-center h-full text-center bg-white/50 dark:bg-slate-800/50 rounded-2xl">
        <div>
          <div className="text-6xl mb-4">👈</div>
          <h2 className={`${customization.fontSize.title} font-bold text-slate-600 dark:text-slate-400 mb-2`}>
            Kein Element ausgewählt
          </h2>
          <p className={`${customization.fontSize.content} text-slate-500`}>Wählen Sie eine Lektion aus.</p>
        </div>
      </div>
    );
  }

  // Haupt-Detail-Ansicht
  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl shadow-2xl ${
        customization.transparencyMode
          ? "bg-transparent border border-white/20 dark:border-white/10"
          : "bg-white/95 dark:bg-slate-900/95 border border-slate-200/30 dark:border-slate-700/30"
      }`}
    >
      {/* Header mit Fachfarben-Gradient */}
      <div
        className="p-6 border-b border-slate-200 dark:border-slate-700"
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

      {/* Themenfortschrittsbalken */}
      <div className="space-y-3">
        {displayLesson?.is_allerlei ? (
          <>
            {allerleiProgresses.length > 0 ? (
              allerleiProgresses.map(({ topic, planned, completed }) => (
                <TopicProgressBar
                  key={topic.id}
                  topic={topic}
                  planned={planned}
                  completed={completed}
                />
              ))
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400 italic">
                Keine Themen zugeordnet
              </div>
            )}
          </>
        ) : topic ? (
          <TopicProgressBar topic={topic} planned={planned} completed={completed} />
        ) : (
          <div className="text-sm text-slate-500 dark:text-slate-400 italic">
            Kein Thema zugeordnet
          </div>
        )}
      </div>

      {/* Inhaltsbereich */}
      <div className="flex-1 overflow-y-auto bg-white/95 dark:bg-slate-900/95">
        <div className="p-4 md:p-6">
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
                    isCurrent ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30" : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <svg className="h-10 w-10 -rotate-90">
                        <circle cx="20" cy="20" r="16" stroke="#e5e7eb" strokeWidth="4" fill="none" />
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          stroke={isCompleted ? "#22c55e" : "#3b82f6"}
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray="100"
                          strokeDashoffset={100 * (1 - progress / 100)}
                          className="transition-all duration-500"
                        />
                      </svg>
                      <span className="font-semibold text-lg">{step.time} Min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <WorkFormIcon className="h-6 w-6" />
                      <span>{WORK_FORMS[step.workForm] || step.workForm}</span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Ablauf:</span> {step.activity || "–"}
                  </div>
                  <div className="text-sm mt-1">
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
                        ? "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600 shadow-sm"
                        : isCompleted
                        ? "bg-green-50 dark:bg-green-900/20 opacity-70"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center">
                      <svg className="h-10 w-10 -rotate-90">
                        <circle cx="20" cy="20" r="16" stroke="#e5e7eb" strokeWidth="4" fill="none" />
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          stroke={isCompleted ? "#22c55e" : "#3b82f6"}
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray="100"
                          strokeDashoffset={100 * (1 - progress / 100)}
                          className="transition-all duration-500"
                        />
                      </svg>
                    </div>
                    <div className="flex items-center text-sm">{step.time ? `${step.time} Min` : "–"}</div>
                    <div className="flex items-center gap-2 text-sm">
                      <WorkFormIcon className="h-5 w-5 text-slate-500" />
                      <span className="truncate">{WORK_FORMS[step.workForm] || step.workForm || "–"}</span>
                    </div>
                    <div className="text-sm break-words">{step.activity || "–"}</div>
                    <div className="text-sm break-words">{step.material || "–"}</div>
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