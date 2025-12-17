// src/components/daily/AllTopicsProgressOverview.jsx
import React, { useEffect, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Bell, Trophy } from "lucide-react";
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
          colors: ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"],
        });
      }
    });
  }, [activeTopics]);

  if (activeTopics.length === 0) {
    return (
      <div className="text-center py-16">
        <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
        <p className="text-3xl font-bold text-slate-700 dark:text-slate-300">
          Alle Themen abgeschlossen!
        </p>
        <p className="text-slate-500 mt-2">Genieße die Pause – du bist ein Held!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-3xl font-bold text-center text-slate-800 dark:text-slate-200">
        Themen-Fortschritt
      </h3>

      {activeTopics.map((p) => {
        const percentage = Math.round((p.completed / p.planned) * 100);
        const remaining = p.planned - p.completed;
        const isExamSoon = p.hasExam && p.lessonsUntilExam !== null && p.lessonsUntilExam <= 3;

        return (
          <div key={p.topic.id} className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="font-semibold"
                  style={{
                    backgroundColor: p.subjectColor + "30",
                    color: p.subjectColor,
                  }}
                >
                  {p.subjectName}
                </Badge>
                <span className="font1556-bold text-lg text-slate-700 dark:text-slate-300">
                  {p.topic.title}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {isExamSoon && (
                  <div className="flex items-center gap-1 text-orange-600 font-bold animate-pulse">
                    <Bell className="w-5 h-5" />
                    <span className="text-sm">
                      {p.lessonsUntilExam === 0
                        ? "Heute Prüfung!"
                        : p.lessonsUntilExam === 1
                        ? "Prüfung nächste Lektion!"
                        : `Prüfung in ${p.lessonsUntilExam} Lektion${p.lessonsUntilExam > 1 ? "en" : ""}`}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {p.completed}/{p.planned} Lektionen
                </span>
              </div>
            </div>

            <div className="relative">
              <Progress value={percentage} className="h-5 bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{
                    width: `${percentage}%`,
                    background: isExamSoon
                      ? "linear-gradient(90deg, #f97316, #fb923c)" // Orange bei Prüfung
                      : percentage === 100
                      ? "linear-gradient(90deg, #10b981, #34d399)"
                      : "linear-gradient(90deg, #3b82f6, #60a5fa)",
                  }}
                >
                  {/* Welle-Animation */}
                  {!isExamSoon && percentage < 100 && percentage > 0 && (
                    <div
                      className="absolute inset-0 opacity-40"
                      style={{
                        background:
                          "repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 40px)",
                        animation: "wave 8s linear infinite",
                      }}
                    />
                  )}
                </div>
              </Progress>
            </div>

            <div className="mt-1 text-right text-xs text-slate-500">
              {percentage}% abgeschlossen {percentage === 100 && "→ Fertig!"}
            </div>
          </div>
        );
      })}
    </div>
  );
}