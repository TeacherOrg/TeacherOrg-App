// src/components/daily/TopicProgressBar.jsx
import React from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { adjustBrightness } from "@/utils/colorUtils";

export default function TopicProgressBar({ topic, planned, completed, className }) {
  if (!topic || planned === 0) return null;

  const percentage = Math.round((completed / planned) * 100);
  const isFinished = completed >= planned;
  const topicColor = topic.color || "#3b82f6";

  return (
    <div className={`px-6 pb-5 ${className || ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white drop-shadow-md">
            Thema-Fortschritt
          </span>
          <Badge
            className="font-bold shadow-md border"
            style={{
              backgroundColor: topicColor + "40",
              color: "white",
              borderColor: topicColor,
            }}
          >
            {topic.title}
          </Badge>
        </div>
        <span className="text-lg font-bold text-white drop-shadow-md">
          {completed}/{planned}
          {isFinished && " ✅"}
        </span>
      </div>

      {/* Progress mit vollständig überschriebenem Stil */}
      <div className="relative h-6 bg-black/40 rounded-full overflow-hidden border border-white/30 shadow-inner">
        <div
          className="absolute inset-0 h-full rounded-full transition-all duration-1500 ease-out flex items-center justify-end pr-4"
          style={{
            width: `${percentage}%`,
            background: isFinished
              ? "linear-gradient(90deg, #10b981, #34d399, #6ee7b7)"
              : `linear-gradient(90deg, ${topicColor}, ${adjustBrightness(topicColor, 30)})`,
          }}
        >
          {/* Welle */}
          {!isFinished && percentage > 0 && percentage < 100 && (
            <div
              className="absolute inset-x-0 bottom-0 h-full opacity-50"
              style={{
                background: `linear-gradient(to top, ${topicColor}60 0%, transparent 70%)`,
                animation: "waveFlow 8s ease-in-out infinite",
              }}
            />
          )}
          {/* Prozentzahl innen rechts */}
          <span className="text-white font-bold text-sm drop-shadow-lg z-10">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
}