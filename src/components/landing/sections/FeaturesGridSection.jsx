import { motion } from "framer-motion";
import { GraduationCap, Users, ClipboardList, BarChart3 } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";

const features = [
  {
    icon: GraduationCap,
    title: "Notenübersicht",
    description: "Erfasse Noten und Kompetenzen. Interaktive Diagramme zeigen Klassenschnitt und individuelle Fortschritte.",
    color: "from-green-500 to-emerald-500",
    highlights: ["Fachbereiche", "Radar-Charts", "Drill-down"]
  },
  {
    icon: Users,
    title: "Gruppenbildung",
    description: "Erstelle dynamisch Schülergruppen per Drag-and-Drop oder lass sie zufällig verteilen.",
    color: "from-orange-500 to-red-500",
    highlights: ["Drag & Drop", "Zufallsgenerator", "Speicherbar"]
  },
  {
    icon: ClipboardList,
    title: "Ämtchen",
    description: "Verwalte Klassenämter wochenweise. Automatische Rotation oder manuelle Zuweisung.",
    color: "from-yellow-500 to-orange-500",
    highlights: ["Wochenplan", "Rotation", "Status-Tracking"]
  },
  {
    icon: BarChart3,
    title: "Lehrplan-Kompetenz",
    description: "Verknüpfe Themen mit Lehrplan-Kompetenzen und behalte den Überblick über die Abdeckung.",
    color: "from-purple-500 to-pink-500",
    highlights: ["Verknüpfung", "Fortschritt", "Export"]
  }
];

export function FeaturesGridSection() {
  return (
    <section className="relative py-32 bg-slate-950">
      {/* Subtle background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-6">
            Und noch mehr
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Weitere
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {" "}Features
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            TimeGrid bietet noch mehr Werkzeuge für deinen Schulalltag.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-6 h-full group hover:border-white/20 transition-all">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                      <p className="text-slate-400 text-sm mb-4">{feature.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {feature.highlights.map((highlight) => (
                          <span
                            key={highlight}
                            className="px-2 py-1 bg-slate-800/50 text-slate-400 rounded text-xs"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
