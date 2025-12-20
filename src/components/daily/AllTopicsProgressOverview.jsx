// src/components/daily/AllTopicsProgressOverview.jsx
import React, { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Trophy, Zap } from "lucide-react";
import { adjustBrightness } from "@/utils/colorUtils";
import confetti from "canvas-confetti";

export default function AllTopicsProgressOverview({ progresses }) {
  const activeTopics = progresses
    .filter((p) => p.planned > p.completed)
    .sort((a, b) => (b.completed / b.planned) - (a.completed / a.planned));

  const confettiTriggered = useRef(new Set());

  useEffect(() => {
    activeTopics.forEach((p) => {
      const percentage = Math.round((p.completed / p.planned) * 100);
      if (percentage === 100 && !confettiTriggered.current.has(p.topic.id)) {
        confettiTriggered.current.add(p.topic.id);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"],
        });
      }
    });
  }, [activeTopics]);

  if (activeTopics.length === 0) {
    return (
      <div className="text-center py-16">
        <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6 drop-shadow-lg" />
        <p className="text-3xl font-bold text-slate-700 dark:text-slate-200">
          Alle Themen abgeschlossen!
        </p>
        <p className="text-lg text-slate-500 dark:text-slate-400 mt-4">
          Genieße die Pause – du hast es dir verdient! 🎉
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7 px-4">
      <h3 className="text-3xl font-bold text-center text-slate-800 dark:text-slate-200 mb-6">
        Themen-Fortschritt
      </h3>

      {activeTopics.map((p) => {
        const percentage = Math.round((p.completed / p.planned) * 100);
        const remaining = p.planned - p.completed;
        const isExamSoon = p.hasExam && p.lessonsUntilExam !== null && p.lessonsUntilExam <= 3;

        // Korrekte Fachfarbe – jetzt ohne grauen Fallback
        const baseColor = p.subjectColor || "#3b82f6";
        const lighter = baseColor + "40"; // leicht transparent für Wellen
        const glowColor = baseColor + "80";
        const gradientStart = adjustBrightness(baseColor, 20); // Heller für Start
        const gradientEnd = adjustBrightness(baseColor, -15); // Dunkler für Ende

        return (
          <div key={p.topic.id} className="group">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                {/* Fach-Badge: volle Fachfarbe */}
                <Badge
                  className="font-bold text-white px-4 py-1.5 text-base shadow-md border-0"
                  style={{ backgroundColor: baseColor }}
                >
                  {p.subjectName}
                </Badge>
                <span className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                  {p.topic.title}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {isExamSoon && (
                  <div className="flex items-center gap-2 text-orange-500 font-bold animate-pulse">
                    <Zap className="w-5 h-5" />
                    <span className="text-sm">
                      {p.lessonsUntilExam === 0 ? "Heute Prüfung!" : `Prüfung in ${p.lessonsUntilExam} Lektion${p.lessonsUntilExam > 1 ? "en" : ""}`}
                    </span>
                  </div>
                )}
                <span className="text-base font-medium text-slate-600 dark:text-slate-400">
                  {p.completed}/{p.planned}
                </span>
              </div>
            </div>

            {/* Progressbar – schlanker, mit echter Wellen-Animation von unten */}
            <div className="relative h-10 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div
                className="absolute inset-0 rounded-full transition-all duration-1500 ease-out flex items-center justify-end pr-5"
                style={{
                  width: `${percentage}%`,
                  background: isExamSoon
                    ? "linear-gradient(90deg, #f97316, #fb923c, #fdba74)"
                    : percentage === 100
                    ? "linear-gradient(90deg, #10b981, #34d399)"
                    : `linear-gradient(135deg, ${gradientStart} 0%, ${baseColor} 50%, ${gradientEnd} 100%)`,
                }}
              >
                {/* Neue Wellen-Animation: Flüssigkeit von unten hoch */}
                {false && !isExamSoon && percentage > 0 && percentage < 100 && (
                  <div
                    className="absolute inset-x-0 bottom-0 h-full opacity-70"
                    style={{
                      background: `
                        linear-gradient(to top, ${lighter} 0%, transparent 70%),
                        repeating-linear-gradient(90deg, transparent 0%, transparent 30px, ${glowColor} 30px, ${glowColor} 60px)
                      `,
                      animation: "waveFlow 10s ease-in-out infinite",
                    }}
                  />
                )}

                {/* Legendärer Glow bei Prüfung */}
                {isExamSoon && (
                  <div className="absolute inset-0 animate-pulse pointer-events-none">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        boxShadow: `inset 0 0 30px ${glowColor}, 0 0 20px ${glowColor}60`,
                      }}
                    />
                  </div>
                )}

                <span className="relative text-white font-bold text-xl drop-shadow-lg z-10">
                  {percentage}%
                </span>
              </div>
            </div>

            <div className="mt-1 text-right text-sm text-slate-500 dark:text-slate-400">
              {percentage === 100 ? "✅ Fertig!" : `${remaining} übrig`}
            </div>
          </div>
        );
      })}
    </div>
  );
}