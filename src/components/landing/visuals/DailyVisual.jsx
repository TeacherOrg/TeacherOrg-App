import { motion } from "framer-motion";
import { Clock, Users, User, Building, Play } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";

const lessonSteps = [
  {
    time: "10 Min",
    activity: "Einstieg: Wiederholung Grundlagen",
    workForm: "Plenum",
    icon: Building,
    material: "Tafel",
    active: true
  },
  {
    time: "15 Min",
    activity: "Gemeinsame Beispiele lösen",
    workForm: "Plenum",
    icon: Building,
    material: "Arbeitsblatt 1"
  },
  {
    time: "15 Min",
    activity: "Partnerarbeit: Aufgaben 1-5",
    workForm: "Partner",
    icon: Users,
    material: "Arbeitsheft S. 23"
  },
  {
    time: "5 Min",
    activity: "Abschluss und Klärung",
    workForm: "Plenum",
    icon: Building,
    material: "-"
  }
];

export function DailyVisual({ style }) {
  return (
    <motion.div style={style} className="w-full max-w-4xl mx-auto">
      <GlassCard className="p-8" animate={false}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Tagesansicht</h3>
            <p className="text-slate-400 text-sm">Montag, 15. Januar 2024</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium">Live</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">09:15</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: Current Lesson */}
          <div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded bg-white/20 text-white text-xs font-medium">
                  Aktuell
                </span>
                <span className="text-white/80 text-sm">08:00 - 08:45</span>
              </div>
              <h4 className="text-xl font-bold text-white mb-1">Mathematik</h4>
              <p className="text-white/80 text-sm mb-3">Bruchrechnung: Addition und Subtraktion</p>
              <div className="flex items-center gap-2 text-white/60 text-xs">
                <span className="px-2 py-0.5 rounded bg-white/10">Algebra</span>
                <span className="px-2 py-0.5 rounded bg-white/10">Lekt. 3/4</span>
              </div>
            </div>

            {/* Next lessons preview */}
            <div className="mt-4 space-y-2">
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 opacity-60">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Deutsch</span>
                  <span className="text-xs text-slate-500">09:00</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 opacity-40">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Pause</span>
                  <span className="text-xs text-slate-500">09:45</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Lesson Steps */}
          <div className="bg-slate-800/30 rounded-xl p-4">
            <div className="text-sm font-medium text-slate-400 mb-3">Lektionsschritte</div>
            <div className="space-y-2">
              {lessonSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      step.active
                        ? 'bg-yellow-500/10 border-yellow-500/50'
                        : 'bg-slate-800/50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {step.active && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-2 h-2 rounded-full bg-yellow-500"
                          />
                        )}
                        <span className={`text-sm font-bold ${
                          step.active ? 'text-yellow-400' : 'text-slate-300'
                        }`}>
                          {step.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-xs">{step.workForm}</span>
                      </div>
                    </div>
                    <div className={`text-sm ${
                      step.active ? 'text-white' : 'text-slate-400'
                    }`}>
                      {step.activity}
                    </div>
                    {step.material !== '-' && (
                      <div className="text-xs text-slate-500 mt-1">
                        Material: {step.material}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Lektionsfortschritt</span>
            <span>15/45 Min</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "33%" }}
              transition={{ delay: 0.5, duration: 1 }}
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
            />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
