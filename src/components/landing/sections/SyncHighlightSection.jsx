import { motion } from "framer-motion";
import { RefreshCw, Link2, Zap, ArrowRight } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";

const syncFeatures = [
  {
    icon: Link2,
    title: "Verknüpft",
    description: "Änderungen in der Jahresplanung wirken sich automatisch auf Wochen- und Tagesansicht aus."
  },
  {
    icon: RefreshCw,
    title: "Synchronisiert",
    description: "Themen, Kompetenzen und Lektionsnummern bleiben über alle Ansichten konsistent."
  },
  {
    icon: Zap,
    title: "Intelligent",
    description: "Das System erkennt Doppellektionen, Ferien und Feiertage automatisch."
  }
];

export function SyncHighlightSection() {
  return (
    <section className="relative py-32 bg-slate-950 overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-6">
            Das Geheimnis
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Alles ist
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {" "}verbunden
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            TimeGrid synchronisiert deine Jahres-, Wochen- und Tagesplanung automatisch.
            Ändere etwas an einer Stelle - der Rest passt sich an.
          </p>
        </motion.div>

        {/* Visual representation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          className="mb-16"
        >
          <GlassCard className="p-8" glow glowColor="blue">
            <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap">
              {/* Year */}
              <div className="text-center">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/30">
                  <span className="text-3xl md:text-4xl font-bold text-white">J</span>
                </div>
                <span className="text-sm text-slate-400">Jahr</span>
              </div>

              {/* Arrow */}
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-6 h-6 text-blue-400" />
              </motion.div>

              {/* Week */}
              <div className="text-center">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3 shadow-lg shadow-purple-500/30">
                  <span className="text-3xl md:text-4xl font-bold text-white">W</span>
                </div>
                <span className="text-sm text-slate-400">Woche</span>
              </div>

              {/* Arrow */}
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              >
                <ArrowRight className="w-6 h-6 text-purple-400" />
              </motion.div>

              {/* Day */}
              <div className="text-center">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-3 shadow-lg shadow-green-500/30">
                  <span className="text-3xl md:text-4xl font-bold text-white">T</span>
                </div>
                <span className="text-sm text-slate-400">Tag</span>
              </div>
            </div>

            {/* Connection line */}
            <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 -translate-y-1/2 opacity-30" />
          </GlassCard>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {syncFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-6 h-full">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.description}</p>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
