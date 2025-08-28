
import React from "react";
import { Clock } from "lucide-react";

export default function ClockPanel({ currentTime, customization }) {
  const formatTime = (date) => {
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden h-full flex flex-col">
      {/* Handle for dragging - ENTFERNT: clock-handle Klasse */}
      <div className="bg-slate-100 dark:bg-slate-700 p-2 cursor-default border-b border-slate-200 dark:border-slate-600">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Uhrzeit
          </h3>
        </div>
      </div>

      {/* Clock content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className={`${customization.fontSize.clock} font-bold text-slate-800 dark:text-slate-200 leading-none`}>
          {formatTime(currentTime)}
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400 mt-2 text-center">
          {formatDate(currentTime)}
        </div>
      </div>
    </div>
  );
}
