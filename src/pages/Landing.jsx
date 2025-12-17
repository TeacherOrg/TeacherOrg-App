import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  GraduationCap,
  Users,
  ClipboardList,
  BarChart3,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Zap,
  Shield,
  Heart,
  Star,
  ChevronRight,
  Menu,
  X,
  ArrowLeft,
  Circle,
  User,
  Users2,
  Building,
  LayoutDashboard
} from "lucide-react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const features = [
  {
    icon: Calendar,
    title: "Flexibler und fixer Stundenplan",
    description: "Erstellen Sie Wochenpläne per Drag-and-Drop, kopieren Sie Layouts, verwalten Sie Doppellektionen. Oder nutzen Sie den fixen Modus für automatische Lektionszuweisung.",
    color: "from-blue-500 to-cyan-500",
    highlights: ["Drag & Drop", "Doppellektionen", "Vorlagen", "Automatisch"]
  },
  {
    icon: BookOpen,
    title: "Jahresübersicht: Der rote Faden",
    description: "Planen Sie Themen langfristig, ordnen Sie sie Lektionen zu und behalten Sie die Übersicht über das gesamte Schuljahr. Ferien werden automatisch berücksichtigt.",
    color: "from-purple-500 to-pink-500",
    highlights: ["Themenplanung", "52 Wochen", "Ferienverwaltung", "Übersicht"]
  },
  {
    icon: GraduationCap,
    title: "Noten & Leistungsübersicht",
    description: "Erfassen Sie Noten und überfachliche Kompetenzen, sehen Sie Klassenschnitte und individuelle Fortschritte. Interaktive Diagramme bieten tiefe Einblicke.",
    color: "from-green-500 to-emerald-500",
    highlights: ["Notenanalyse", "Kompetenzen", "Diagramme", "Klassenschnitt"]
  },
  {
    icon: Users,
    title: "Intelligente Gruppenbildung",
    description: "Erstellen Sie dynamisch Schülergruppen für verschiedene Aktivitäten. Einfaches Drag-and-Drop und Zufallsfunktion für faire Aufteilung.",
    color: "from-orange-500 to-red-500",
    highlights: ["Drag & Drop", "Zufallsgruppen", "Mehrere Gruppen", "Schnell"]
  },
  {
    icon: ClipboardList,
    title: "Ämtchen-Management",
    description: "Planen und verwalten Sie Ämtchen für Ihre Klasse. Weisen Sie Aufgaben per Drag-and-Drop zu oder lassen Sie sie zufällig verteilen.",
    color: "from-yellow-500 to-orange-500",
    highlights: ["Wochenplanung", "Automatisch", "Verlängerung", "Übersicht"]
  },
  {
    icon: Clock,
    title: "Live-Unterrichtsführung",
    description: "Erhalten Sie eine Schritt-für-Schritt-Anleitung für Ihre aktuelle Lektion. Behalten Sie die Zeit im Blick und machen Sie Notizen.",
    color: "from-indigo-500 to-blue-500",
    highlights: ["Live-Ansicht", "Timer", "Notizen", "Anpassbar"]
  }
];

const benefits = [
  {
    icon: Zap,
    title: "Zeitersparnis",
    description: "Automatisierung von Verwaltungsaufgaben gibt Ihnen mehr Zeit für Ihre Schüler."
  },
  {
    icon: BarChart3,
    title: "Bessere Übersicht",
    description: "Alle relevanten Daten auf einer Plattform - von Planung bis Leistungsbewertung."
  },
  {
    icon: Sparkles,
    title: "Intuitive Bedienung",
    description: "Weniger Einarbeitung, mehr Fokus auf den Unterricht. Modern und benutzerfreundlich."
  },
  {
    icon: Shield,
    title: "Anpassungsfähigkeit",
    description: "Für flexible und fixe Lehrpläne geeignet. Passen Sie TimeGrid an Ihre Bedürfnisse an."
  },
  {
    icon: Heart,
    title: "Moderne Pädagogik",
    description: "Unterstützt individualisiertes Lernen und differenzierten Unterricht."
  },
  {
    icon: CheckCircle2,
    title: "Alles in Einem",
    description: "Von Stundenplanung über Noten bis zu Gruppenverwaltung - eine Lösung für alles."
  }
];

const testimonials = [
  {
    name: "Anna Müller",
    role: "Primarlehrerin",
    content: "TimeGrid hat meinen Planungsaufwand halbiert und mir mehr Zeit für meine Schüler gegeben! Die Jahresübersicht ist genial.",
    rating: 5
  },
  {
    name: "Dr. Klaus Schmidt",
    role: "Mathematiklehrer",
    content: "Die Notenübersicht mit den interaktiven Diagrammen ist Gold wert. Endlich sehe ich auf einen Blick, wo jeder Schüler steht.",
    rating: 5
  },
  {
    name: "Sarah Weber",
    role: "Schulleiterin",
    content: "Unsere Lehrkräfte sind begeistert von der einfachen Handhabung. TimeGrid hat die Schulorganisation revolutioniert!",
    rating: 5
  }
];

const stats = [
  { value: "6+", label: "Hauptfunktionen" },
  { value: "100%", label: "Übersicht" },
  { value: "50%", label: "Zeit gespart" },
  { value: "∞", label: "Möglichkeiten" }
];

// Mockup-Daten für Tagesansicht Demo - NUR MATHEMATIK
const dailyViewLessons = [
  {
    id: 1,
    subject: "Mathematik",
    title: "Bruchrechnung: Addition und Subtraktion",
    color: "#3b82f6",
    gradient: "from-blue-500 to-cyan-500",
    time: "09:00 - 09:45",
    steps: [
      { id: 1, time: 10, workForm: "Plenum", activity: "Wiederholung Grundlagen", material: "Tafel" },
      { id: 2, time: 15, workForm: "Plenum", activity: "Gemeinsame Beispiele lösen", material: "Arbeitsblatt 1" },
      { id: 3, time: 15, workForm: "Partner", activity: "Partnerarbeit: Aufgaben 1-5", material: "Arbeitsheft S. 23" },
      { id: 4, time: 5, workForm: "Plenum", activity: "Besprechung und Klärung", material: "-" }
    ]
  }
];

const dailyViewChores = [
  { student: "Anna", chore: "Tafel wischen", emoji: "🧹" },
  { student: "Tom", chore: "Papierkorb leeren", emoji: "🗑️" },
  { student: "Lisa", chore: "Ordnung Bücherregal", emoji: "📚" }
];

const WORK_FORM_ICONS = {
  'Single': User,
  'Partner': Users2,
  'Group': Users,
  'Plenum': Building
};

// Mockup-Daten für Notenanalyse
const fachbereichOverviewData = [
  { fachbereich: 'Algebra', classAvg: 4.8, studentAvg: 5.2 },
  { fachbereich: 'Geometrie', classAvg: 4.5, studentAvg: 4.3 },
  { fachbereich: 'Bruchrechnen', classAvg: 4.7, studentAvg: 5.0 },
  { fachbereich: 'Dezimalzahlen', classAvg: 4.9, studentAvg: 5.5 },
  { fachbereich: 'Prozentrechnung', classAvg: 4.6, studentAvg: 4.8 },
];

const fachbereichDetailDataMap = {
  'Algebra': [
    { name: 'Prüfung 1', classAvg: 4.7, studentAvg: 5.1, color: '#3b82f6' },
    { name: 'Test 1', classAvg: 4.9, studentAvg: 5.3, color: '#8b5cf6' },
    { name: 'Prüfung 2', classAvg: 4.8, studentAvg: 5.2, color: '#10b981' },
  ],
  'Geometrie': [
    { name: 'Prüfung 1', classAvg: 4.4, studentAvg: 4.2, color: '#3b82f6' },
    { name: 'Test 1', classAvg: 4.6, studentAvg: 4.4, color: '#8b5cf6' },
  ],
  'Bruchrechnen': [
    { name: 'Prüfung 1', classAvg: 4.6, studentAvg: 4.9, color: '#3b82f6' },
    { name: 'Test 1', classAvg: 4.8, studentAvg: 5.1, color: '#8b5cf6' },
  ],
  'Dezimalzahlen': [
    { name: 'Prüfung 1', classAvg: 4.8, studentAvg: 5.4, color: '#3b82f6' },
    { name: 'Test 1', classAvg: 5.0, studentAvg: 5.6, color: '#8b5cf6' },
  ],
  'Prozentrechnung': [
    { name: 'Prüfung 1', classAvg: 4.5, studentAvg: 4.7, color: '#3b82f6' },
    { name: 'Test 1', classAvg: 4.7, studentAvg: 4.9, color: '#8b5cf6' },
  ],
};

const CLASS_AVG_COLOR = '#10B981';
const STUDENT_AVG_COLOR = '#3b82f6';

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0.95]);

  // State für Notenanalyse-Demo
  const [selectedFachbereich, setSelectedFachbereich] = useState(null);
  const [showStudentComparison, setShowStudentComparison] = useState(false);

  // State für Wochenplan-Demo Animation
  const [weekAnimPhase, setWeekAnimPhase] = useState(0);

  // Refs für Tagesansicht Scroll-Integration
  const dailyDemoRef = useRef(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [showChores, setShowChores] = useState(false);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  // Auto-Show Student Comparison
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !showStudentComparison) {
            setTimeout(() => setShowStudentComparison(true), 1000);
          }
        });
      },
      { threshold: 0.5 }
    );

    const gradesElement = document.getElementById('grades-demo');
    if (gradesElement) {
      observer.observe(gradesElement);
    }

    return () => observer.disconnect();
  }, [showStudentComparison]);

  // Weekly Planning Demo Animation Effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const runAnimation = async () => {
              setWeekAnimPhase(0);
              await new Promise(resolve => setTimeout(resolve, 1500));
              setWeekAnimPhase(0.5);
              await new Promise(resolve => setTimeout(resolve, 800));
              setWeekAnimPhase(1);
              await new Promise(resolve => setTimeout(resolve, 2500));
              runAnimation();
            };
            runAnimation();
          }
        });
      },
      { threshold: 0.5 }
    );

    const weeklyElement = document.getElementById('weekly-planning-demo');
    if (weeklyElement) {
      observer.observe(weeklyElement);
    }

    return () => observer.disconnect();
  }, []);

  // Tagesansicht Scroll-Logik - ANGEPASST für nur eine Lektion
  useEffect(() => {
    const handleScroll = () => {
      if (!dailyDemoRef.current) return;

      const demoRect = dailyDemoRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      const demoTop = demoRect.top;
      const demoBottom = demoRect.bottom;
      
      // Nur aktiv, wenn Demo teilweise oder vollständig im Viewport ist
      if (demoBottom < 0 || demoTop > viewportHeight) {
        return;
      }

      // Berechne Scroll-Progress: startet, wenn Demo ins Bild kommt
      const scrollStart = viewportHeight * 0.8;
      const scrollEnd = 0;
      
      let scrollProgress;
      if (demoTop >= scrollStart) {
        scrollProgress = 0;
      } else if (demoTop <= scrollEnd) {
        scrollProgress = 1;
      } else {
        scrollProgress = (scrollStart - demoTop) / (scrollStart - scrollEnd);
      }
      
      // Nur Mathe-Schritte + Chores
      const totalSteps = dailyViewLessons[0].steps.length;
      const totalUnits = totalSteps + 1; // +1 für Chores
      
      const currentUnit = Math.floor(scrollProgress * totalUnits);

      if (currentUnit < totalSteps) {
        setActiveLessonIndex(0);
        setActiveStepIndex(currentUnit);
        setShowChores(false);
      } else {
        setShowChores(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currentLesson = dailyViewLessons[activeLessonIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900">
      {/* Header / Navigation */}
      <motion.header
        style={{ opacity: headerOpacity }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                TimeGrid
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                Features
              </button>
              <button onClick={() => scrollToSection('benefits')} className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                Vorteile
              </button>
              <button onClick={() => scrollToSection('testimonials')} className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                Stimmen
              </button>
              <Button
                onClick={() => navigate(createPageUrl('Timetable'))}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
              >
                Jetzt starten
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden py-4 border-t border-slate-200 dark:border-slate-800"
            >
              <div className="flex flex-col gap-4">
                <button onClick={() => scrollToSection('features')} className="text-left px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  Features
                </button>
                <button onClick={() => scrollToSection('benefits')} className="text-left px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  Vorteile
                </button>
                <button onClick={() => scrollToSection('testimonials')} className="text-left px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  Stimmen
                </button>
                <Button
                  onClick={() => navigate(createPageUrl('Timetable'))}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white w-full"
                >
                  Jetzt starten
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-6">
                <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Die Zukunft der Schulorganisation
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                TimeGrid:
                <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent block">
                  Einfach. Intelligent. Effizient.
                </span>
              </h1>

              <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                Verwalten Sie Stundenpläne, Noten, Gruppen und Ämtchen mit einer intuitiven App,
                die speziell für die Anforderungen des modernen Unterrichts entwickelt wurde.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => navigate(createPageUrl('Timetable'))}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-lg px-8 py-6 shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all"
                >
                  Kostenlos testen
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  onClick={() => scrollToSection('features')}
                  size="lg"
                  variant="outline"
                  className="border-2 border-slate-300 dark:border-slate-700 text-lg px-8 py-6 hover:border-blue-600 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Features entdecken
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mt-12">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-8 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-blue-500 to-cyan-500 p-8">
                {/* App Mockup - Realistic Timetable */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-6 ml-4"></div>
                  </div>

                  {/* Timetable Grid with Subject Names */}
                  <div className="grid grid-cols-5 gap-2">
                    {/* Monday */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Mathe
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.52 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Deutsch
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.54 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Englisch
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.56 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Sport
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.58 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Musik
                    </motion.div>

                    {/* Tuesday */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Englisch
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.62 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Mathe
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.64 }}
                      className="h-12 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md relative overflow-hidden"
                      style={{
                        background: `
                          radial-gradient(circle at 50% 20%, #3b82f6 0%, #3b82f680 40%, transparent 70%),
                          radial-gradient(circle at 50% 80%, #ef4444 0%, #ef444480 40%, transparent 70%),
                          linear-gradient(135deg, #3b82f640, #ef444440)
                        `
                      }}
                    >
                      Allerlei
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.66 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Sport
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.68 }}
                      className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800"
                    ></motion.div>

                    {/* Wednesday */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Deutsch
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.72 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Mathe
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.74 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Musik
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.76 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Englisch
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.78 }}
                      className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800"
                    ></motion.div>

                    {/* Thursday */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Mathe
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.82 }}
                      className="h-12 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md relative overflow-hidden"
                      style={{
                        background: `
                          radial-gradient(circle at 30% 50%, #10b981 0%, #10b98180 40%, transparent 70%),
                          radial-gradient(circle at 70% 50%, #8b5cf6 0%, #8b5cf680 40%, transparent 70%),
                          linear-gradient(90deg, #10b98140, #8b5cf640)
                        `
                      }}
                    >
                      Allerlei
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.84 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Deutsch
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.86 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Sport
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.88 }}
                      className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800"
                    ></motion.div>

                    {/* Friday */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.9 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Englisch
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.92 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Musik
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.94 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Mathe
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.96 }}
                      className="h-12 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-md"
                    >
                      Deutsch
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.98 }}
                      className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800"
                    ></motion.div>

                    {/* More empty rows to fill space */}
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={`extra-${i}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 + i * 0.02 }}
                        className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800"
                      ></motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-gradient-to-br from-green-500 to-emerald-500 p-4 rounded-2xl shadow-2xl"
              >
                <GraduationCap className="w-8 h-8 text-white" />
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -bottom-4 -left-4 bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-2xl shadow-2xl"
              >
                <Users className="w-8 h-8 text-white" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section - Summary Cards */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Alles, was Sie brauchen.
              <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent block">
                  Und noch viel mehr.
              </span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              TimeGrid vereint alle wichtigen Werkzeuge für moderne Schulorganisation in einer eleganten Oberfläche.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-2xl hover:shadow-blue-500/20 group cursor-pointer bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <CardHeader>
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-300 text-base">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {feature.highlights.map((highlight) => (
                        <span
                          key={highlight}
                          className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium"
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Demonstrations Section */}
      <section id="demos" className="py-20 px-4 sm:px-6 lg:px-8 bg-white/30 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Sehen Sie TimeGrid in Aktion
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Entdecken Sie die verschiedenen Ansichten und Funktionen, die Ihren Schulalltag vereinfachen.
            </p>
          </motion.div>

          {/* Yearly Overview Demo */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            className="mb-20"
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
                  <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-purple-600 dark:text-purple-400 font-semibold text-sm">Jahresansicht</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  Themenplanung über das ganze Jahr
                </h3>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
                  Organisieren Sie Ihre Lektionen nach Themen über alle 52 Wochen. Visualisieren Sie den roten Faden
                  Ihres Unterrichts und behalten Sie den Überblick über Ihre Jahresplanung.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Themen farbig markieren und zuordnen</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Doppellektionen automatisch erkennen</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Ferien und Feiertage berücksichtigen</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Detaillierte Lektionsplanung pro Woche</span>
                  </li>
                </ul>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 shadow-2xl">
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xl">
                    {/* Yearly Grid Mockup - More realistic */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Klasse 5b - Schuljahr 2024/25</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">52 Wochen</div>
                    </div>

                    {/* Subject Headers */}
                    <div className="grid grid-cols-[40px_1fr_1fr_1fr] gap-3 mb-3">
                      <div></div>
                      <div className="text-center font-bold text-sm text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 py-2 rounded-lg">
                        Mathematik
                      </div>
                      <div className="text-center font-bold text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 py-2 rounded-lg">
                        Deutsch
                      </div>
                      <div className="text-center font-bold text-sm text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 py-2 rounded-lg">
                        Englisch
                      </div>
                    </div>

                    {/* Weekly Lessons Grid - Reduced to 8 weeks (no scrolling) */}
                    <div className="space-y-2">
                      {[...Array(8)].map((_, weekIndex) => {
                        const week = weekIndex + 1;

                        return (
                          <div key={week} className="grid grid-cols-[40px_1fr_1fr_1fr] gap-3">
                            {/* Week Number Column */}
                            <div className="flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-md">
                              KW {week}
                            </div>

                            {/* Mathematik Column */}
                            <div className="space-y-1">
                              {week <= 4 ? (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  whileInView={{ opacity: 1, scale: 1 }}
                                  viewport={{ once: true, amount: 0.1 }}
                                  transition={{ delay: weekIndex * 0.05 }}
                                  className="bg-blue-500 text-white rounded-md p-2 text-xs font-bold text-center shadow-sm"
                                >
                                  Algebra
                                </motion.div>
                              ) : (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  whileInView={{ opacity: 1, scale: 1 }}
                                  viewport={{ once: true, amount: 0.1 }}
                                  transition={{ delay: weekIndex * 0.05 }}
                                  className="bg-cyan-500 text-white rounded-md p-2 text-xs font-bold text-center shadow-sm"
                                >
                                  {week === 7 ? '🏖️ Ferien' : 'Geometrie'}
                                </motion.div>
                              )}
                            </div>

                            {/* Deutsch Column */}
                            <div className="space-y-1">
                              {week <= 3 ? (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  whileInView={{ opacity: 1, scale: 1 }}
                                  viewport={{ once: true, amount: 0.1 }}
                                  transition={{ delay: weekIndex * 0.05 + 0.05 }}
                                  className="bg-red-500 text-white rounded-md p-2 text-xs font-bold text-center shadow-sm"
                                >
                                  Leseverstehen
                                </motion.div>
                              ) : week <= 7 ? (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  whileInView={{ opacity: 1, scale: 1 }}
                                  viewport={{ once: true, amount: 0.1 }}
                                  transition={{ delay: weekIndex * 0.05 + 0.05 }}
                                  className="bg-pink-500 text-white rounded-md p-2 text-xs font-bold text-center shadow-sm"
                                >
                                  {week === 7 ? '🏖️ Ferien' : 'Grammatik'}
                                </motion.div>
                              ) : (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  whileInView={{ opacity: 1, scale: 1 }}
                                  viewport={{ once: true, amount: 0.1 }}
                                  transition={{ delay: weekIndex * 0.05 + 0.05 }}
                                  className="bg-rose-500 text-white rounded-md p-2 text-xs font-bold text-center shadow-sm"
                                >
                                  Aufsatz
                                </motion.div>
                              )}
                            </div>

                            {/* Englisch Column */}
                            <div className="space-y-1">
                              {week <= 5 ? (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  whileInView={{ opacity: 1, scale: 1 }}
                                  viewport={{ once: true, amount: 0.1 }}
                                  transition={{ delay: weekIndex * 0.05 + 0.1 }}
                                  className="bg-green-500 text-white rounded-md p-2 text-xs font-bold text-center shadow-sm"
                                >
                                  Vocabulary
                                </motion.div>
                              ) : (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  whileInView={{ opacity: 1, scale: 1 }}
                                  viewport={{ once: true, amount: 0.1 }}
                                  transition={{ delay: weekIndex * 0.05 + 0.1 }}
                                  className="bg-emerald-500 text-white rounded-md p-2 text-xs font-bold text-center shadow-sm"
                                >
                                  {week === 7 ? '🏖️ Ferien' : 'Grammar'}
                                </motion.div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Topic Legend */}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Aktuelle Themen:</div>
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-xs text-blue-700 dark:text-blue-300">Algebra</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded-full">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span className="text-xs text-red-700 dark:text-red-300">Leseverstehen</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-xs text-green-700 dark:text-green-300">Vocabulary</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Weekly Planning Demo */}
          <motion.div
            id="weekly-planning-demo"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            className="mb-20"
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 relative">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 shadow-2xl">
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xl">
                    {/* Flexible Timetable Mockup */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Wochenplan KW 3</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Klasse 5b</div>
                    </div>

                    <div className="flex gap-4 relative">
                      {/* Stundenplan Grid - 2 Tage x 4 Zeitslots */}
                      <div className="flex-1">
                        <div className="grid grid-cols-2 gap-2">
                          {/* Header Row */}
                          <div className="text-center p-2 bg-slate-700 rounded-t text-white text-xs font-bold">Mo</div>
                          <div className="text-center p-2 bg-slate-700 rounded-t text-white text-xs font-bold">Di</div>
                          
                          {/* Time Slots */}
                          {[...Array(4)].map((_, slotIndex) => (
                            <React.Fragment key={slotIndex}>
                              {/* Monday slot */}
                              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-slate-300 dark:border-slate-600 h-16 relative group">
                                {/* Mathe landet im Montag-Slot */}
                                {slotIndex === 1 && (
                                  <AnimatePresence>
                                    {weekAnimPhase === 1 && (
                                      <motion.div
                                        key="mathe-monday"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3 }}
                                        className="absolute inset-1 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-bold shadow-md"
                                      >
                                        Mathe
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                )}
                                
                                {slotIndex === 3 && (
                                  <div className="absolute inset-1 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">
                                    Deutsch
                                  </div>
                                )}
                                
                                {(slotIndex !== 1 && slotIndex !== 3) && (
                                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute inset-1 border-2 border-dashed border-blue-400 rounded bg-blue-900/10" />
                                  </div>
                                )}
                              </div>

                              {/* Tuesday slot */}
                              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-slate-300 dark:border-slate-600 h-16 relative group">
                                {slotIndex === 0 && (
                                  <div className="absolute inset-1 bg-green-500 rounded text-white text-xs flex items-center justify-center font-bold">
                                    Englisch
                                  </div>
                                )}
                                
                                {slotIndex === 2 && (
                                  <div className="absolute inset-1 bg-purple-500 rounded text-white text-xs flex items-center justify-center font-bold">
                                    Musik
                                  </div>
                                )}
                                
                                {(slotIndex !== 0 && slotIndex !== 2) && (
                                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute inset-1 border-2 border-dashed border-blue-400 rounded bg-blue-900/10" />
                                  </div>
                                )}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {/* Stundenpool */}
                      <div className="w-24 space-y-2">
                        <div className="text-xs text-slate-400 text-center font-bold mb-2">Pool</div>
                        
                        {/* Mathe im Pool - Anzahl basierend auf Phase */}
                        <AnimatePresence mode="wait">
                          {weekAnimPhase === 0 && (
                            <motion.div
                              key="mathe-pool-full"
                              initial={{ opacity: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              className="bg-blue-500 rounded-lg p-2 text-white text-xs text-center font-bold shadow-md cursor-pointer"
                            >
                              <div>Mathe</div>
                              <div className="text-[10px] opacity-75 mt-0.5">2 übrig</div>
                            </motion.div>
                          )}
                          
                          {weekAnimPhase === 1 && (
                            <motion.div
                              key="mathe-pool-one"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3 }}
                              className="bg-blue-500 rounded-lg p-2 text-white text-xs text-center font-bold shadow-md"
                            >
                              <div>Mathe</div>
                              <div className="text-[10px] opacity-75 mt-0.5">1 übrig</div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="bg-orange-500 rounded-lg p-2 text-white text-xs text-center font-bold shadow-md">
                          <div>Sport</div>
                          <div className="text-[10px] opacity-75 mt-0.5">4 übrig</div>
                        </div>
                        
                        <div className="bg-slate-600 rounded-lg p-2 text-white text-xs text-center font-bold shadow-md opacity-50">
                          <div>NMG</div>
                          <div className="text-[10px] opacity-75 mt-0.5">0 übrig</div>
                        </div>
                      </div>

                      {/* Animated Dragging Element */}
                      <AnimatePresence>
                        {weekAnimPhase === 0.5 && (
                          <motion.div
                            key="dragging-mathe"
                            initial={{
                              position: 'absolute',
                              right: '16px',
                              top: '56px',
                              width: '80px',
                              height: '48px',
                              opacity: 1,
                              scale: 1.1,
                              zIndex: 50
                            }}
                            animate={{
                              left: 'calc(8px)',
                              top: 'calc(56px + 18px + 68px)',
                              right: 'auto',
                              width: 'calc(50% - 16px)',
                              height: '60px',
                              scale: 1
                            }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                            className="bg-blue-500 rounded-lg text-white text-xs font-bold shadow-2xl flex items-center justify-center border-2 border-blue-300"
                            style={{ pointerEvents: 'none' }}
                          >
                            Mathe
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Animated Mouse Cursor */}
                      <AnimatePresence>
                        {weekAnimPhase === 0.5 && (
                          <motion.div
                            key="cursor"
                            initial={{
                              position: 'absolute',
                              right: '46px',
                              top: '80px',
                              zIndex: 51
                            }}
                            animate={{
                              left: 'calc(30% - 16px)',
                              top: 'calc(56px + 18px + 68px + 30px)',
                              right: 'auto'
                            }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                            className="pointer-events-none"
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg">
                              <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="white" stroke="black" strokeWidth="1.5" strokeLinejoin="round"/>
                            </svg>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Legend */}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        💡 Ziehen Sie Fächer aus dem Pool direkt in die Zeitslots
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">Flexible Wochenplanung</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  Ihr Stundenplan per Drag & Drop
                </h3>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
                  Gestalten Sie Ihren Wochenplan intuitiv: Ziehen Sie Lektionen aus dem Stundenpool direkt in die gewünschten Zeitslots.
                  Der Pool zeigt automatisch, wie viele Lektionen pro Fach noch zu planen sind.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Drag-and-Drop aus dem Stundenpool</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Automatische Verknüpfung mit Jahresplanung</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Verbleibende Lektionen auf einen Blick</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Schnelles Umplanen durch einfaches Verschieben</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Fixed Schedule Demo */}
          <motion.div
            id="fixed-schedule-demo"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            className="mb-20"
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-1">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-full mb-4">
                  <LayoutDashboard className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold text-sm">Fixer Stundenplan</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  Automatische Lektionsverteilung
                </h3>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
                  Ideal für feste Stundenpläne: Definieren Sie einmalig Ihr Raster. Die nummerierten Lektionen aus der Jahresplanung fließen automatisch in die korrekten Slots der Woche.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Einmalige Definition des Wochenrasters</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Automatische Zuordnung der Jahreslektionen</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Unterstützung für Doppellektionen</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Kein manuelles Drag-and-Drop nötig</span>
                  </li>
                </ul>
              </div>

              <div className="order-2 relative">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl p-6 shadow-2xl">
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xl space-y-6">
                    
                    {/* 1. Yearly View Mock (Top) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jahresplanung (Auszug)</div>
                        <div className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400">KW 10</div>
                      </div>
                      <div className="grid grid-cols-[auto_1fr] gap-3">
                        {/* Header Subject 1: Mathe (2 Lekt.) */}
                        <div className="text-xs font-bold text-blue-600 w-14 pt-2">Mathe</div>
                        <div className="flex gap-1">
                           <div className="h-8 bg-blue-100 text-blue-700 border border-blue-200 rounded flex items-center justify-center text-[10px] font-bold flex-1 shadow-sm">Lekt. 1</div>
                           <div className="h-8 bg-blue-100 text-blue-700 border border-blue-200 rounded flex items-center justify-center text-[10px] font-bold flex-1 shadow-sm">Lekt. 2</div>
                           <div className="flex-[3]"></div> 
                        </div>

                        {/* Header Subject 2: Deutsch (3 Lekt., Double) */}
                        <div className="text-xs font-bold text-red-600 w-14 pt-2">Deutsch</div>
                        <div className="flex gap-1">
                           {/* Double Lesson */}
                           <div className="h-8 bg-red-100 text-red-700 border border-red-200 rounded flex items-center justify-center text-[10px] font-bold flex-[2] relative overflow-hidden shadow-sm">
                              <span className="relative z-10">Lekt. 1-2</span>
                              <div className="absolute inset-0 bg-red-200/30"></div>
                           </div>
                           <div className="h-8 bg-red-100 text-red-700 border border-red-200 rounded flex items-center justify-center text-[10px] font-bold flex-1 shadow-sm">Lekt. 3</div>
                           <div className="flex-[2]"></div>
                        </div>

                        {/* Header Subject 3: Englisch (5 Lekt., Double) */}
                        <div className="text-xs font-bold text-green-600 w-14 pt-2">Englisch</div>
                        <div className="flex gap-1">
                           <div className="h-8 bg-green-100 text-green-700 border border-green-200 rounded flex items-center justify-center text-[10px] font-bold flex-1 shadow-sm">Lekt. 1</div>
                           {/* Double Lesson */}
                           <div className="h-8 bg-green-100 text-green-700 border border-green-200 rounded flex items-center justify-center text-[10px] font-bold flex-[2] relative overflow-hidden shadow-sm">
                              <span className="relative z-10">Lekt. 2-3</span>
                              <div className="absolute inset-0 bg-green-200/30"></div>
                           </div>
                           <div className="h-8 bg-green-100 text-green-700 border border-green-200 rounded flex items-center justify-center text-[10px] font-bold flex-1 shadow-sm">Lekt. 4</div>
                           <div className="h-8 bg-green-100 text-green-700 border border-green-200 rounded flex items-center justify-center text-[10px] font-bold flex-1 shadow-sm">Lekt. 5</div>
                        </div>
                      </div>
                    </div>

                    {/* Arrow Down */}
                    <div className="flex justify-center -my-3 relative z-10">
                      <div className="bg-white dark:bg-slate-800 p-1.5 rounded-full shadow border border-slate-100 dark:border-slate-700">
                        <Clock className="w-4 h-4 text-cyan-500" />
                      </div>
                    </div>

                    {/* 2. Weekly Schedule Mock (Bottom) */}
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-0.5 h-full border-l-2 border-dashed border-slate-200 dark:border-slate-700"></div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 pl-2">Fixer Wochenstundenplan</div>
                      <div className="grid grid-cols-5 gap-1.5 text-center">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Mo</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Di</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Mi</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Do</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Fr</div>

                        {/* Row 1 */}
                        <div className="bg-blue-500 text-white rounded-md p-1 text-[10px] font-bold shadow-sm h-10 flex flex-col justify-center">
                          Mathe<span className="opacity-75 text-[8px] font-normal">Lekt. 1</span>
                        </div>
                        <div className="bg-red-500 text-white rounded-md p-1 text-[10px] font-bold shadow-sm row-span-2 h-22 flex flex-col justify-center relative overflow-hidden">
                          Deutsch<span className="opacity-75 text-[8px] font-normal">Lekt. 1-2</span>
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20"></div>
                        </div>
                        <div className="bg-green-500 text-white rounded-md p-1 text-[10px] font-bold shadow-sm row-span-2 h-22 flex flex-col justify-center relative overflow-hidden">
                          Englisch<span className="opacity-75 text-[8px] font-normal">Lekt. 2-3</span>
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20"></div>
                        </div>
                        <div className="bg-green-500 text-white rounded-md p-1 text-[10px] font-bold shadow-sm h-10 flex flex-col justify-center">
                          Englisch<span className="opacity-75 text-[8px] font-normal">Lekt. 4</span>
                        </div>
                        <div className="bg-red-500 text-white rounded-md p-1 text-[10px] font-bold shadow-sm h-10 flex flex-col justify-center">
                          Deutsch<span className="opacity-75 text-[8px] font-normal">Lekt. 3</span>
                        </div>

                        {/* Row 2 */}
                        <div className="bg-green-500 text-white rounded-md p-1 text-[10px] font-bold shadow-sm h-10 flex flex-col justify-center">
                          Englisch<span className="opacity-75 text-[8px] font-normal">Lekt. 1</span>
                        </div>
                        {/* (Deutsch spans) */}
                        {/* (Englisch spans) */}
                        <div className="bg-blue-500 text-white rounded-md p-1 text-[10px] font-bold shadow-sm h-10 flex flex-col justify-center">
                          Mathe<span className="opacity-75 text-[8px] font-normal">Lekt. 2</span>
                        </div>
                        <div className="bg-green-500 text-white rounded-md p-1 text-[10px] font-bold shadow-sm h-10 flex flex-col justify-center">
                          Englisch<span className="opacity-75 text-[8px] font-normal">Lekt. 5</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Daily View Demo - REDUZIERTE HÖHE FÜR LANGSAMERES SCROLLEN */}
          <motion.div
            ref={dailyDemoRef}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            className="mb-4"
            style={{ minHeight: '150vh' }}
          >
            {/* Sticky Demo Container */}
            <div className="sticky top-24">
              <div className="bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl p-6 shadow-2xl">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xl">
                  {/* Header */}
                  <div className="mb-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
                    <div>
                      <h4 className="text-2xl font-bold text-slate-900 dark:text-white">Tagesansicht - Live</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Scrollen Sie, um durch die Lektion zu navigieren</p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Clock className="w-5 h-5" />
                      <span className="text-sm font-medium">09:00 - 09:45</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Left: Lesson Cards */}
                    <div className="space-y-3">
                      {dailyViewLessons.map((lesson, index) => {
                        const isActive = !showChores && activeLessonIndex === index;
                        
                        return (
                          <motion.div
                            key={lesson.id}
                            animate={{
                              scale: isActive ? 1.02 : 1,
                              opacity: isActive ? 1 : 0.6
                            }}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              isActive ? 'border-blue-400 shadow-lg shadow-blue-500/50' : 'border-slate-300 dark:border-slate-600'
                            } bg-gradient-to-br ${lesson.gradient}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-bold text-white">{lesson.subject}</h5>
                              {isActive && (
                                <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded-full font-bold shadow-md">
                                  Aktuell
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-white/90 mb-2">{lesson.title}</p>
                            <div className="flex items-center gap-2 text-xs text-white/80">
                              <Clock className="w-3 h-3" />
                              <span>{lesson.time}</span>
                            </div>
                          </motion.div>
                        );
                      })}

                      {/* Chores Card */}
                      <motion.div
                        animate={{
                          scale: showChores ? 1.02 : 1,
                          opacity: showChores ? 1 : 0.6
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          showChores ? 'border-yellow-400 shadow-lg shadow-yellow-500/50' : 'border-slate-300 dark:border-slate-600'
                        } bg-gradient-to-br from-yellow-400 to-orange-400`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-bold text-white flex items-center gap-2">
                            <ClipboardList className="w-4 h-4" />
                            Ämtchen
                          </h5>
                          {showChores && (
                            <span className="px-2 py-1 bg-white text-yellow-600 text-xs rounded-full font-bold shadow-md">
                              Aktuell
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/90">Aufgaben nach dem Unterricht</p>
                      </motion.div>
                    </div>

                    {/* Right: Detailed Steps or Chores - FIXIERTE HÖHE */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex flex-col" style={{ height: '540px' }}>
                      <AnimatePresence mode="wait">
                        {!showChores ? (
                          <motion.div
                            key="lesson-math"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col h-full"
                          >
                            <div className="mb-4 pb-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                              <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                                {currentLesson.subject}
                              </h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{currentLesson.title}</p>
                            </div>

                            <div className="space-y-3 flex-1 flex flex-col justify-center">
                              {currentLesson.steps.map((step, index) => {
                                const isActiveStep = activeStepIndex === index;
                                const WorkFormIcon = WORK_FORM_ICONS[step.workForm] || User;

                                return (
                                  <motion.div
                                    key={step.id}
                                    animate={{
                                      scale: isActiveStep ? 1.02 : 1,
                                      opacity: isActiveStep ? 1 : 0.6
                                    }}
                                    className={`p-3 rounded-lg border-2 transition-all ${
                                      isActiveStep
                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        {isActiveStep && (
                                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                        )}
                                        <span className="font-bold text-slate-900 dark:text-white">
                                          {step.time} Min
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                        <WorkFormIcon className="w-4 h-4" />
                                        <span className="text-sm">{step.workForm}</span>
                                      </div>
                                    </div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300 mb-1">
                                      {step.activity}
                                    </div>
                                    {step.material !== '-' && (
                                      <div className="text-xs text-slate-500 dark:text-slate-500">
                                        Material: {step.material}
                                      </div>
                                    )}
                                  </motion.div>
                                );
                              })}
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="chores"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col h-full"
                          >
                            <div className="mb-4 pb-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                              <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-yellow-500" />
                                Heutige Ämtchen
                              </h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Wer ist heute dran?</p>
                            </div>

                            <div className="space-y-3 flex-1 flex flex-col justify-center">
                              {dailyViewChores.map((chore, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-2xl">{chore.emoji}</span>
                                    <span className="font-medium text-slate-900 dark:text-white">
                                      {chore.student}
                                    </span>
                                  </div>
                                  <span className="text-sm text-slate-600 dark:text-slate-400">
                                    {chore.chore}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Description Text for Daily View */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm">Tagesansicht</span>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Ihr digitaler Unterrichtsbegleiter
            </h3>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
              Die Tagesansicht zeigt Ihnen Schritt für Schritt, was als Nächstes kommt. Scrollen Sie,
              um durch die Lektion und die anstehenden Ämtchen zu navigieren.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                <span className="text-slate-700 dark:text-slate-300">Live-Uhr mit Countdown für aktuelle Lektion</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                <span className="text-slate-700 dark:text-slate-300">Detaillierte Schritte mit Zeitangaben</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                <span className="text-slate-700 dark:text-slate-300">Arbeitsformen visuell dargestellt</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                <span className="text-slate-700 dark:text-slate-300">Ämtchen-Übersicht am Ende des Tages</span>
              </li>
            </ul>
          </div>

          {/* Grades View Demo */}
          <motion.div
            id="grades-demo"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            className="mb-20"
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                  <GraduationCap className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400 font-semibold text-sm">Leistungsansicht</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  Intelligente Notenanalyse
                </h3>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
                  Visualisieren Sie Schülerleistungen mit interaktiven Diagrammen. Klicken Sie auf Fachbereiche,
                  um detaillierte Einblicke in einzelne Prüfungen zu erhalten.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Radar- und Balkendiagramme für Übersicht</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Drill-down zu einzelnen Fachbereichen</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Klassenschnitt und individuelle Leistungen</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Schülervergleich mit Klassenschnitt</span>
                  </li>
                </ul>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 shadow-2xl">
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xl">
                    <AnimatePresence mode="wait">
                      {!selectedFachbereich ? (
                        <motion.div
                          key="overview"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {/* Grades Chart Mockup - Overview */}
                          <div className="mb-6 flex items-center justify-between">
                            <div className="text-base font-bold text-slate-900 dark:text-white">Mathematik - Fachbereiche</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Klasse 5b</div>
                          </div>

                          {/* Radar Chart with clickable labels */}
                          <div className="relative w-full mb-6" style={{ height: '400px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart data={fachbereichOverviewData}>
                                <PolarGrid stroke="#e5e7eb" className="dark:stroke-slate-700" />
                                <PolarAngleAxis
                                  dataKey="fachbereich"
                                  tick={({ payload, x, y, textAnchor }) => {
                                    const text = payload.value;
                                    return (
                                      <g>
                                        <text
                                          x={x}
                                          y={y}
                                          textAnchor={textAnchor}
                                          onClick={() => setSelectedFachbereich(text)}
                                          className="fill-slate-700 dark:fill-slate-300 text-xs font-bold cursor-pointer hover:fill-blue-600 dark:hover:fill-blue-400 transition-colors"
                                          style={{ cursor: 'pointer' }}
                                        >
                                          {text}
                                        </text>
                                      </g>
                                    );
                                  }}
                                />
                                <PolarRadiusAxis angle={90} domain={[0, 6]} tick={{fill: '#94a3b8', fontSize: 10}} />
                                <Radar
                                  name="Klassenschnitt"
                                  dataKey="classAvg"
                                  stroke={CLASS_AVG_COLOR}
                                  fill={CLASS_AVG_COLOR}
                                  fillOpacity={0.3}
                                  strokeWidth={2}
                                />
                                {showStudentComparison && (
                                  <Radar
                                    name="Max Mustermann"
                                    dataKey="studentAvg"
                                    stroke={STUDENT_AVG_COLOR}
                                    fill={STUDENT_AVG_COLOR}
                                    fillOpacity={0.2}
                                    strokeWidth={2}
                                  />
                                )}
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Legend and Stats */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4">
                              <div className="text-sm text-green-700 dark:text-green-300 mb-2 font-medium">Klassenschnitt</div>
                              <div className="text-3xl font-bold text-green-600 dark:text-green-400">4.8</div>
                            </div>
                            {showStudentComparison && (
                              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4">
                                <div className="text-sm text-blue-700 dark:text-blue-300 mb-2 font-medium">Max Mustermann</div>
                                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">5.2</div>
                              </div>
                            )}
                          </div>

                          <div className="text-sm text-slate-500 dark:text-slate-400 text-center bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                            💡 Klicken Sie auf Fachbereiche für Details
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="detail"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {/* Fachbereich Detail View */}
                          <div className="mb-6 flex items-center justify-between">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedFachbereich(null)}
                              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            >
                              <ArrowLeft className="w-4 h-4 mr-2" />
                              Zurück
                            </Button>
                            <div className="text-base font-bold text-slate-900 dark:text-white">{selectedFachbereich}</div>
                          </div>

                          {/* Bar Chart for selected Fachbereich */}
                          <div className="relative w-full mb-6" style={{ height: '400px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={fachbereichDetailDataMap[selectedFachbereich] || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
                                <XAxis
                                  dataKey="name"
                                  tick={{ fill: '#64748b', fontSize: 12 }}
                                />
                                <YAxis
                                  domain={[0, 6]}
                                  tick={{ fill: '#64748b', fontSize: 12 }}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff'
                                  }}
                                />
                                <Legend />
                                <Bar dataKey="classAvg" name="Klassenschnitt" fill={CLASS_AVG_COLOR} radius={[8, 8, 0, 0]} />
                                <Bar dataKey="studentAvg" name="Max Mustermann" fill={STUDENT_AVG_COLOR} radius={[8, 8, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4">
                              <div className="text-sm text-green-700 dark:text-green-300 mb-2 font-medium">Prüfungen</div>
                              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                                {fachbereichDetailDataMap[selectedFachbereich]?.length || 0}
                              </div>
                            </div>
                            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4">
                              <div className="text-sm text-blue-700 dark:text-blue-300 mb-2 font-medium">Durchschnitt</div>
                              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {((fachbereichDetailDataMap[selectedFachbereich]?.reduce((sum, item) => sum + item.classAvg, 0) || 0) /
                                  (fachbereichDetailDataMap[selectedFachbereich]?.length || 1)).toFixed(1)}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Chores View Demo */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 relative">
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 shadow-2xl">
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xl">
                    {/* Chores Mockup */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Ämtchen-Plan KW 3</div>
                      <Button size="sm" className="text-xs h-7 bg-yellow-500 hover:bg-yellow-600 text-white">
                        Zufällig verteilen
                      </Button>
                    </div>

                    {/* Chores Grid */}
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {['Mo', 'Di', 'Mi', 'Do', 'Fr'].map((day, dayIndex) => (
                        <div key={day} className="text-center">
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">{day}</div>
                          <div className="space-y-2">
                            {['🧹', '🗑️', '📝'].map((emoji, choreIndex) => (
                              <div key={`${day}-${choreIndex}`} className="bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg p-2 border border-yellow-300 dark:border-yellow-700">
                                <div className="text-lg mb-1">{emoji}</div>
                                <div className="text-[9px] font-medium text-slate-700 dark:text-slate-300">
                                  {dayIndex % 3 === 0 ? 'Anna' : dayIndex % 3 === 1 ? 'Tom' : 'Lisa'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Student Pool */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Schüler-Pool</div>
                      <div className="flex flex-wrap gap-2">
                        {['Max', 'Sophie', 'Luca', 'Emma', 'Noah', 'Mia'].map(name => (
                          <div key={name} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                            {name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-4">
                  <ClipboardList className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-yellow-600 dark:text-yellow-400 font-semibold text-sm">Ämtchen</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  Verantwortung spielerisch vermitteln
                </h3>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
                  Verwalten Sie Klassenämter mühelos mit Drag-and-Drop oder automatischer Zuweisung.
                  Fördern Sie Verantwortungsbewusstsein und Struktur im Schulalltag.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Wochenübersicht mit allen Ämtchen</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Drag-and-Drop Zuweisung oder Zufallsgenerator</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Zuweisungen über mehrere Wochen verlängern</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-slate-700 dark:text-slate-300">Status-Tracking (zugewiesen/erledigt/verpasst)</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Ihre Vorteile mit TimeGrid
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Mehr Zeit für das Wesentliche: Ihre Schüler und exzellenten Unterricht.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-xl group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Was Lehrkräfte sagen
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300">
              Echte Erfahrungen von Pädagogen, die TimeGrid täglich nutzen.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.15 }}
              >
                <Card className="h-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-2xl">
                  <CardHeader>
                    <div className="flex gap-1 mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 italic text-lg leading-relaxed">
                      "{testimonial.content}"
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                        {testimonial.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {testimonial.name}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {testimonial.role}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-cyan-600 to-purple-600 p-12 shadow-2xl"
          >
            <div className="relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Bereit für den nächsten Schritt in der Schulorganisation?
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Schließen Sie sich den Lehrkräften an, die TimeGrid bereits verwenden,
                um ihren Schulalltag zu revolutionieren.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate(createPageUrl('Timetable'))}
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-10 py-6 shadow-xl hover:shadow-2xl transition-all"
                >
                  Jetzt kostenlos starten
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  onClick={() => scrollToSection('features')}
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white/10 text-lg px-10 py-6"
                >
                  Mehr erfahren
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>

            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-300 rounded-full blur-3xl"></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 dark:bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">TimeGrid</span>
              </div>
              <p className="text-slate-400 mb-4">
                Die moderne Lösung für Schulorganisation. Von Lehrkräften, für Lehrkräfte.
              </p>
              <p className="text-sm text-slate-500">
                © {new Date().getFullYear()} TimeGrid. Alle Rechte vorbehalten.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-4">Navigation</h3>
              <div className="flex flex-col gap-2">
                <button onClick={() => scrollToSection('features')} className="text-slate-400 hover:text-white transition-colors text-left">
                  Features
                </button>
                <button onClick={() => scrollToSection('benefits')} className="text-slate-400 hover:text-white transition-colors text-left">
                  Vorteile
                </button>
                <button onClick={() => scrollToSection('testimonials')} className="text-slate-400 hover:text-white transition-colors text-left">
                  Stimmen
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-4">Rechtliches</h3>
              <div className="flex flex-col gap-2">
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  Impressum
                </a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  Datenschutz
                </a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  Nutzungsbedingungen
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8">
            <p className="text-center text-slate-500 text-sm">
              Entwickelt mit <Heart className="w-4 h-4 inline text-red-500" /> für Bildung
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}