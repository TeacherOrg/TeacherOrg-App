// src/components/daily/TopicProgressBar.jsx
import React from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function TopicProgressBar({ topic, planned, completed, className }) {
  if (!topic || planned === 0) return null;

  const percentage = Math.round((completed / planned) * 100);
  const isFinished = completed >= planned;

  return (
    <div className={`px-6 pb-4 ${className || ""}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white/90">Thema-Fortschritt</span>
          <Badge variant="secondary" style={{ backgroundColor: topic.color + "30", color: topic.color }}>
            {topic.title}
          </Badge>
        </div>
        <span className="text-sm font-medium text-white/90">
          {completed} / {planned} Lektion{planned > 1 ? "en" : ""}
          {isFinished && " ✅"}
        </span>
      </div>

      <div className="relative">
        <Progress value={percentage} className="h-4 bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${percentage}%`,
              background: isExamSoon
                ? "linear-gradient(90deg, #f97316, #fb923c)"
                : percentage === 100
                ? "#10b981"
                : "linear-gradient(90deg, #3b82f6, #60a5fa)",
            }}
          >
            {percentage < 100 && percentage > 10 && (
              <div className="absolute inset-0 opacity-30 wave-bg" />
            )}
          </div>
        </Progress>
      </div>

      <p className="text-xs text-white/70 mt-1 text-right">{percentage}% abgeschlossen</p>
    </div>
  );
}