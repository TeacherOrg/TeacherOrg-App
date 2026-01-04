import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Calendar, CalendarDays, Clock, ArrowDown, Check, ChevronRight } from "lucide-react";
import { YearlyVisual } from "../visuals/YearlyVisual";
import { WeeklyVisual } from "../visuals/WeeklyVisual";
import { DailyVisual } from "../visuals/DailyVisual";
import { GlassCard } from "../ui/GlassCard";

const phases = [
  {
    id: "yearly",
    icon: Calendar,
    title: "Jahresplanung",
    subtitle: "Der grosse Überblick",
    description: "Plane Themen und Kompetenzen über das ganze Schuljahr. Visualisiere den roten Faden deines Unterrichts.",
    highlights: [
      "52 Wochen auf einen Blick",
      "Themen farbig markieren",
      "Ferien automatisch berücksichtigt",
      "Lehrplan-Kompetenz-Verknüpfung"
    ],
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "weekly",
    icon: CalendarDays,
    title: "Wochenplanung",
    subtitle: "Flexibel oder Fix",
    description: "Erstelle deinen Stundenplan per Drag-and-Drop oder nutze den fixen Modus für automatische Zuweisung.",
    highlights: [
      "Pool-System für flexible Planung",
      "Automatische Zuweisung im Fix-Modus",
      "Synchronisiert mit Jahresplan",
      "Doppellektionen unterstützt"
    ],
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "daily",
    icon: Clock,
    title: "Tagesansicht",
    subtitle: "Live im Unterricht",
    description: "Erhalte eine Schritt-für-Schritt-Anleitung für jede Lektion. Behalte Zeit und Material im Blick.",
    highlights: [
      "Live-Unterrichtsführung",
      "Detaillierte Lektionsschritte",
      "Timer und Countdown",
      "Arbeitsformen visualisiert"
    ],
    color: "from-green-500 to-emerald-500"
  }
];

// Mobile-friendly sequential view
function MobileStoryFlow() {
  return (
    <section id="story-flow" className="bg-slate-950 py-20 lg:hidden">
      <div className="max-w-lg mx-auto px-6 space-y-12">
        {phases.map((phase, index) => {
          const Icon = phase.icon;
          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Phase header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${phase.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className={`text-xs font-medium bg-gradient-to-r ${phase.color} bg-clip-text text-transparent`}>
                    {phase.subtitle}
                  </span>
                  <h3 className="text-2xl font-bold text-white">{phase.title}</h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-slate-400 mb-4">{phase.description}</p>

              {/* Highlights */}
              <ul className="space-y-2 mb-6">
                {phase.highlights.map((highlight, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${phase.color} flex items-center justify-center flex-shrink-0`}>
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-slate-300">{highlight}</span>
                  </li>
                ))}
              </ul>

              {/* Connector to next */}
              {index < phases.length - 1 && (
                <div className="flex justify-center py-4">
                  <motion.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ChevronRight className="w-6 h-6 text-slate-600 rotate-90" />
                  </motion.div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

// Desktop scrollytelling view
function DesktopStoryFlow({ scrollContainerRef }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: scrollContainerRef,
    offset: ["start start", "end end"]
  });

  // === ALL HOOKS MUST BE DEFINED HERE, NOT IN JSX ===

  // Background gradient
  const backgroundGradient = useTransform(
    scrollYProgress,
    [0, 0.33, 0.66, 1],
    [
      "radial-gradient(circle at 30% 50%, rgba(59, 130, 246, 0.3), transparent 50%)",
      "radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.3), transparent 50%)",
      "radial-gradient(circle at 70% 50%, rgba(34, 197, 94, 0.3), transparent 50%)",
      "radial-gradient(circle at 70% 50%, rgba(34, 197, 94, 0.3), transparent 50%)"
    ]
  );

  // Phase indicator opacities (one for each phase)
  const phase0Opacity = useTransform(
    scrollYProgress,
    [-0.1, 0, 0.33, 0.43],
    [0.3, 1, 1, 0.3]
  );
  const phase1Opacity = useTransform(
    scrollYProgress,
    [0.23, 0.33, 0.66, 0.76],
    [0.3, 1, 1, 0.3]
  );
  const phase2Opacity = useTransform(
    scrollYProgress,
    [0.56, 0.66, 0.99, 1],
    [0.3, 1, 1, 1]
  );
  const phaseOpacities = [phase0Opacity, phase1Opacity, phase2Opacity];

  // Content opacities (one for each phase)
  const content0Opacity = useTransform(
    scrollYProgress,
    [0, 0.1, 0.25, 0.35],
    [1, 1, 1, 0]
  );
  const content1Opacity = useTransform(
    scrollYProgress,
    [0.25, 0.35, 0.6, 0.7],
    [0, 1, 1, 0]
  );
  const content2Opacity = useTransform(
    scrollYProgress,
    [0.6, 0.7, 1, 1],
    [0, 1, 1, 1]
  );
  const contentOpacities = [content0Opacity, content1Opacity, content2Opacity];

  // Visual transitions
  const yearlyOpacity = useTransform(scrollYProgress, [0, 0.25, 0.35], [1, 1, 0]);
  const yearlyY = useTransform(scrollYProgress, [0, 0.35], [0, -50]);

  const weeklyOpacity = useTransform(scrollYProgress, [0.25, 0.35, 0.6, 0.7], [0, 1, 1, 0]);
  const weeklyY = useTransform(scrollYProgress, [0.25, 0.35, 0.7], [50, 0, -50]);

  const dailyOpacity = useTransform(scrollYProgress, [0.6, 0.7, 1], [0, 1, 1]);
  const dailyY = useTransform(scrollYProgress, [0.6, 0.7], [50, 0]);

  // Scroll progress indicator
  const progressOpacity = useTransform(scrollYProgress, [0, 0.05, 0.95, 1], [0, 1, 1, 0]);

  // Dot styles for scroll indicator
  const dot0Color = useTransform(
    scrollYProgress,
    [0, 0.165, 0.33],
    ["rgba(148, 163, 184, 0.3)", "rgba(59, 130, 246, 1)", "rgba(148, 163, 184, 0.3)"]
  );
  const dot0Scale = useTransform(scrollYProgress, [0, 0.165, 0.33], [1, 1.5, 1]);

  const dot1Color = useTransform(
    scrollYProgress,
    [0.33, 0.495, 0.66],
    ["rgba(148, 163, 184, 0.3)", "rgba(59, 130, 246, 1)", "rgba(148, 163, 184, 0.3)"]
  );
  const dot1Scale = useTransform(scrollYProgress, [0.33, 0.495, 0.66], [1, 1.5, 1]);

  const dot2Color = useTransform(
    scrollYProgress,
    [0.66, 0.825, 0.99],
    ["rgba(148, 163, 184, 0.3)", "rgba(59, 130, 246, 1)", "rgba(148, 163, 184, 0.3)"]
  );
  const dot2Scale = useTransform(scrollYProgress, [0.66, 0.825, 0.99], [1, 1.5, 1]);

  const dotStyles = [
    { backgroundColor: dot0Color, scale: dot0Scale },
    { backgroundColor: dot1Color, scale: dot1Scale },
    { backgroundColor: dot2Color, scale: dot2Scale }
  ];

  return (
    <section
      id="story-flow-desktop"
      ref={containerRef}
      className="relative bg-slate-950 hidden lg:block"
      style={{ height: "300vh" }}
    >
      {/* Sticky container */}
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        {/* Background gradient that shifts */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{ background: backgroundGradient }}
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side: Text content */}
            <div className="space-y-8">
              {/* Phase indicator */}
              <div className="flex items-center gap-4">
                {phases.map((phase, index) => {
                  const Icon = phase.icon;
                  return (
                    <motion.div
                      key={phase.id}
                      className="flex items-center gap-2"
                      style={{ opacity: phaseOpacities[index] }}
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${phase.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-white">
                        {phase.title}
                      </span>
                      {index < phases.length - 1 && (
                        <ArrowDown className="w-4 h-4 text-slate-600 rotate-[-90deg] ml-2" />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Dynamic content based on phase */}
              <div className="relative min-h-[400px]">
                {phases.map((phase, index) => (
                  <motion.div
                    key={phase.id}
                    className="absolute inset-0"
                    style={{ opacity: contentOpacities[index] }}
                  >
                    <div className="space-y-6">
                      <div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${phase.color} text-white mb-3`}>
                          {phase.subtitle}
                        </span>
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                          {phase.title}
                        </h2>
                        <p className="text-xl text-slate-400 leading-relaxed">
                          {phase.description}
                        </p>
                      </div>

                      <ul className="space-y-3">
                        {phase.highlights.map((highlight, i) => (
                          <li key={i} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${phase.color} flex items-center justify-center flex-shrink-0`}>
                              <Check className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-slate-300">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right side: Visual */}
            <div className="relative h-[500px] flex items-center justify-center">
              {/* Yearly Visual */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  opacity: yearlyOpacity,
                  y: yearlyY
                }}
              >
                <YearlyVisual />
              </motion.div>

              {/* Weekly Visual */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  opacity: weeklyOpacity,
                  y: weeklyY
                }}
              >
                <WeeklyVisual />
              </motion.div>

              {/* Daily Visual */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  opacity: dailyOpacity,
                  y: dailyY
                }}
              >
                <DailyVisual />
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll progress indicator */}
      <motion.div
        className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2"
        style={{ opacity: progressOpacity }}
      >
        {dotStyles.map((style, i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            style={style}
          />
        ))}
      </motion.div>
    </section>
  );
}

export function StoryFlowSection({ scrollContainerRef }) {
  return (
    <>
      {/* Mobile: Sequential cards */}
      <MobileStoryFlow />

      {/* Desktop: Scrollytelling */}
      <DesktopStoryFlow scrollContainerRef={scrollContainerRef} />
    </>
  );
}
