import React from "react";
import { motion } from "framer-motion";
import { GlassCard } from "../ui/GlassCard";

const days = ["Mo", "Di", "Mi", "Do", "Fr"];
const timeSlots = ["08:00", "09:00", "10:15", "11:15", "13:30", "14:30"];

const schedule = [
  // Monday
  [
    { subject: "Mathematik", color: "bg-blue-500", theme: "Algebra" },
    { subject: "Mathematik", color: "bg-blue-500", theme: "Algebra" },
    { subject: "Deutsch", color: "bg-red-500", theme: "Grammatik" },
    { subject: "Englisch", color: "bg-green-500", theme: "Vocabulary" },
    null,
    null
  ],
  // Tuesday
  [
    { subject: "Deutsch", color: "bg-red-500", theme: "Aufsatz" },
    { subject: "Deutsch", color: "bg-red-500", theme: "Aufsatz" },
    { subject: "Sport", color: "bg-orange-500", theme: "Ballspiele" },
    { subject: "Sport", color: "bg-orange-500", theme: "Ballspiele" },
    { subject: "Musik", color: "bg-purple-500", theme: "Rhythmus" },
    null
  ],
  // Wednesday
  [
    { subject: "Englisch", color: "bg-green-500", theme: "Grammar" },
    { subject: "Mathematik", color: "bg-blue-500", theme: "Geometrie" },
    { subject: "NMG", color: "bg-amber-500", theme: "Natur" },
    { subject: "NMG", color: "bg-amber-500", theme: "Natur" },
    null,
    null
  ],
  // Thursday
  [
    { subject: "Mathematik", color: "bg-blue-500", theme: "Geometrie" },
    { subject: "Deutsch", color: "bg-red-500", theme: "Lesen" },
    { subject: "Englisch", color: "bg-green-500", theme: "Speaking" },
    { subject: "BG", color: "bg-pink-500", theme: "Malen" },
    { subject: "BG", color: "bg-pink-500", theme: "Malen" },
    null
  ],
  // Friday
  [
    { subject: "Deutsch", color: "bg-red-500", theme: "Diktat" },
    { subject: "Mathematik", color: "bg-blue-500", theme: "Übung" },
    { subject: "Musik", color: "bg-purple-500", theme: "Singen" },
    { subject: "Klassenstunde", color: "bg-slate-500", theme: "Wochenrückblick" },
    null,
    null
  ]
];

export function WeeklyVisual({ style }) {
  return (
    <motion.div style={style} className="w-full max-w-4xl mx-auto">
      <GlassCard className="p-8" animate={false}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Wochenplanung</h3>
            <p className="text-slate-400 text-sm">KW 3 - Klasse 5b</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium">
              Flexibler Modus
            </div>
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="grid grid-cols-[60px_repeat(5,1fr)] gap-1">
          {/* Header Row */}
          <div className="h-10" />
          {days.map((day, i) => (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="h-10 flex items-center justify-center text-sm font-bold text-slate-300 bg-slate-800/50 rounded-t-lg"
            >
              {day}
            </motion.div>
          ))}

          {/* Time slots */}
          {timeSlots.map((time, slotIndex) => (
            <React.Fragment key={`slot-${slotIndex}`}>
              {/* Time label */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: slotIndex * 0.05 }}
                className="h-14 flex items-center justify-end pr-2 text-xs text-slate-500"
              >
                {time}
              </motion.div>

              {/* Day cells */}
              {days.map((_, dayIndex) => {
                const lesson = schedule[dayIndex][slotIndex];
                return (
                  <motion.div
                    key={`${dayIndex}-${slotIndex}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: dayIndex * 0.05 + slotIndex * 0.03,
                      duration: 0.3
                    }}
                    className={`h-14 rounded-lg ${
                      lesson
                        ? `${lesson.color} shadow-lg`
                        : 'bg-slate-800/30 border border-dashed border-slate-700'
                    } flex flex-col items-center justify-center p-1`}
                  >
                    {lesson && (
                      <>
                        <span className="text-xs font-bold text-white truncate max-w-full">
                          {lesson.subject}
                        </span>
                        <span className="text-[10px] text-white/70 truncate max-w-full">
                          {lesson.theme}
                        </span>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Pool indicator */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Noch zu planen:</span>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">
                Mathe: 0
              </span>
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs">
                Deutsch: 0
              </span>
              <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">
                Englisch: 0
              </span>
            </div>
          </div>
        </motion.div>
      </GlassCard>
    </motion.div>
  );
}
