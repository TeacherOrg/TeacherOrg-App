import { motion } from "framer-motion";
import { GlassCard } from "../ui/GlassCard";

// Simplified year visualization - 12 months with colored blocks representing subjects
const months = [
  "Aug", "Sep", "Okt", "Nov", "Dez", "Jan",
  "Feb", "Mär", "Apr", "Mai", "Jun", "Jul"
];

const subjects = [
  { name: "Mathematik", color: "bg-blue-500", weeks: [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1] },
  { name: "Deutsch", color: "bg-red-500", weeks: [1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1] },
  { name: "Englisch", color: "bg-green-500", weeks: [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0] }
];

export function YearlyVisual({ style }) {
  return (
    <motion.div style={style} className="w-full max-w-4xl mx-auto">
      <GlassCard className="p-8" animate={false}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Jahresübersicht</h3>
            <p className="text-slate-400 text-sm">Schuljahr 2024/25</p>
          </div>
          <div className="flex items-center gap-4">
            {subjects.map((subject) => (
              <div key={subject.name} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${subject.color}`} />
                <span className="text-xs text-slate-400">{subject.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Year Grid */}
        <div className="relative">
          {/* Month Headers */}
          <div className="grid grid-cols-12 gap-1 mb-2">
            {months.map((month, i) => (
              <motion.div
                key={month}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="text-center text-xs text-slate-500 font-medium"
              >
                {month}
              </motion.div>
            ))}
          </div>

          {/* Subject Rows */}
          {subjects.map((subject, subjectIndex) => (
            <div key={subject.name} className="grid grid-cols-12 gap-1 mb-2">
              {subject.weeks.map((hasContent, weekIndex) => (
                <motion.div
                  key={`${subject.name}-${weekIndex}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: subjectIndex * 0.1 + weekIndex * 0.03,
                    duration: 0.3
                  }}
                  className={`h-8 rounded-md ${
                    hasContent
                      ? `${subject.color} shadow-lg shadow-${subject.color.replace('bg-', '')}/20`
                      : 'bg-slate-800/50'
                  } ${weekIndex === 4 || weekIndex === 11 ? 'opacity-30' : ''}`}
                >
                  {/* Holiday indicator */}
                  {(weekIndex === 4 || weekIndex === 11) && hasContent && (
                    <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">
                      F
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ))}

          {/* Current week indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute top-0 left-[16.66%] w-[8.33%] h-full border-2 border-cyan-400/50 rounded-lg pointer-events-none"
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyan-500/20 rounded text-xs text-cyan-400">
              KW 3
            </div>
          </motion.div>
        </div>

        {/* Stats */}
        <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">52</div>
            <div className="text-xs text-slate-500">Schulwochen</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">36</div>
            <div className="text-xs text-slate-500">Geplante Themen</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">100%</div>
            <div className="text-xs text-slate-500">Lehrplan abgedeckt</div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
