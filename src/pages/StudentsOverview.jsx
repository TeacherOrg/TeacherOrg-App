import React, { useState, useEffect, useMemo } from "react";
import { Student, Performance, UeberfachlichKompetenz, Class } from "@/api/entities";
import { Users, TrendingDown, Award, AlertCircle, ChevronRight, Search, Star, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CalendarLoader from "../components/ui/CalendarLoader";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { calculateWeightedGrade } from '@/components/grades/utils/calculateWeightedGrade';

export default function StudentsOverview() {
  const [students, setStudents] = useState([]);
  const [performances, setPerformances] = useState([]);
  const [ueberfachlich, setUeberfachlich] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [studentsData, performancesData, ueberfachlichData, classesData] = await Promise.all([
        Student.list(),
        Performance.list(),
        UeberfachlichKompetenz.list(),
        Class.list()
      ]);
      
      setStudents(studentsData || []);
      setPerformances(performancesData || []);
      setUeberfachlich(ueberfachlichData || []);
      setClasses(classesData || []);
      
      if (classesData && classesData.length > 0 && !activeClassId) {
        // ensure activeClassId is a string to match Select onValueChange and comparisons
        setActiveClassId(String(classesData[0].id));
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setIsLoading(false);
    }
  };

  // Berechne Schülerdaten für die Karten
  const studentCards = useMemo(() => {
    if (!activeClassId) return [];

    // normalize comparisons to strings to avoid type mismatch (number vs string)
    const classStudents = students.filter(s => String(s.class_id) === String(activeClassId));
    const classPerformances = performances.filter(p => String(p.class_id) === String(activeClassId));
    const classUeberfachlich = ueberfachlich.filter(u => String(u.class_id) === String(activeClassId));

    return classStudents.map(student => {
      // NEU – gewichteter Durchschnitt!
      const studentPerformances = classPerformances.filter(p => p.student_id === student.id);

      const average = calculateWeightedGrade(studentPerformances) || null;

      // Fachbereiche analysieren
      const fachbereicheMap = {};
      classPerformances
        .filter(p => p.student_id === student.id)
        .forEach(p => {
          if (Array.isArray(p.fachbereiche)) {
            p.fachbereiche.forEach(fb => {
              if (!fb) return;
              if (!fachbereicheMap[fb]) {
                fachbereicheMap[fb] = { grades: [], subjects: new Set() };
              }
              fachbereicheMap[fb].grades.push(p.grade);
              if (p.subject) fachbereicheMap[fb].subjects.add(p.subject);
            });
          }
        });

      const allFachbereiche = Object.entries(fachbereicheMap).map(([name, data]) => ({
        name,
        average: calculateWeightedGrade(
          classPerformances.filter(p => 
            p.student_id === student.id && 
            Array.isArray(p.fachbereiche) && 
            p.fachbereiche.includes(name)
          )
        ),
        subjects: Array.from(data.subjects)
      }));

      // Top 3 Fachbereiche (nach Note absteigend sortiert)
      const sortedByBest = [...allFachbereiche].sort((a, b) => b.average - a.average);
      const strongFachbereiche = sortedByBest.slice(0, 3);

      // Bottom 3 Fachbereiche (nach Note aufsteigend sortiert)
      const sortedByWorst = [...allFachbereiche].sort((a, b) => a.average - b.average);
      const weakFachbereiche = sortedByWorst.slice(0, 3);

      // Überfachliche Kompetenzen
      const studentComps = classUeberfachlich.filter(u => u.student_id === student.id);
      const allCompScores = studentComps
        .flatMap(u => (u.assessments || []).map(a => a.score))
        .filter(s => typeof s === 'number' && s >= 1 && s <= 5);
      
      const compAverage = allCompScores.length > 0
        ? allCompScores.reduce((sum, s) => sum + s, 0) / allCompScores.length
        : null;

      // Zähle kritische Kompetenzen (< 3)
      const criticalComps = studentComps.filter(u => {
        if (!Array.isArray(u.assessments) || u.assessments.length === 0) return false;
        const latest = u.assessments.reduce((l, a) => 
          !l || new Date(a.date) > new Date(l.date) ? a : l
        , null);
        return latest && latest.score < 3;
      }).length;

      return {
        student,
        average,
        weakFachbereiche,
        strongFachbereiche,
        compAverage,
        criticalComps,
        totalAssessments: studentPerformances.length
      };
    }).filter(card => card.average !== null);
  }, [students, performances, ueberfachlich, activeClassId]);

  // Filter und Sortierung
  const filteredAndSortedCards = useMemo(() => {
    let filtered = studentCards;

    // Suche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(card => 
        card.student.name.toLowerCase().includes(query)
      );
    }

    // Sortierung
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.student.name.localeCompare(b.student.name);
        case "average-asc":
          return (a.average || 0) - (b.average || 0);
        case "average-desc":
          return (b.average || 0) - (a.average || 0);
        case "foerderbedarf":
          return b.weakFachbereiche.length - a.weakFachbereiche.length;
        default:
          return 0;
      }
    });

    return sorted;
  }, [studentCards, searchQuery, sortBy]);

  const handleCardClick = (studentId) => {
    navigate(`${createPageUrl("Grades")}?studentId=${studentId}`);
  };

  const getGradeColor = (avg) => {
    if (!avg) return { bg: 'from-slate-500 to-slate-600', text: 'text-slate-100', indicator: 'bg-slate-400' };
    if (avg >= 5.0) return { bg: 'from-green-500 to-emerald-500', text: 'text-green-100', indicator: 'bg-green-300' };
    if (avg >= 4.5) return { bg: 'from-blue-500 to-cyan-500', text: 'text-blue-100', indicator: 'bg-blue-300' };
    if (avg >= 4.0) return { bg: 'from-yellow-500 to-amber-500', text: 'text-yellow-100', indicator: 'bg-yellow-300' };
    return { bg: 'from-red-500 to-orange-500', text: 'text-red-100', indicator: 'bg-red-300' };
  };

  // NEU: Sterne-Rating Komponente
  const StarRating = ({ score }) => {
    const stars = Math.round(score);
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= stars
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-300 text-slate-300 dark:fill-slate-600 dark:text-slate-600'
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <CalendarLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-6 transition-colors duration-300">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Schülerübersicht
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mt-1">
                  Kompakte Übersicht über alle Schüler
                </p>
              </div>
            </div>

            {/* Filter und Suche */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Klassen-Auswahl */}
              <Select value={activeClassId || ''} onValueChange={setActiveClassId}>
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 min-w-[180px]">
                  <SelectValue placeholder="Klasse auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    // ensure option values are strings so Select value matches activeClassId
                    <SelectItem key={cls.id} value={String(cls.id)}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Suche */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Schüler suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Sortierung */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 min-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nach Name</SelectItem>
                  <SelectItem value="average-desc">Nach Note (hoch → tief)</SelectItem>
                  <SelectItem value="average-asc">Nach Note (tief → hoch)</SelectItem>
                  <SelectItem value="foerderbedarf">Nach Förderbedarf</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Statistik-Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-slate-200/50 dark:border-slate-700/50">
            <CardContent className="p-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Schüler</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{filteredAndSortedCards.length}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-slate-200/50 dark:border-slate-700/50">
            <CardContent className="p-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Ø Klassenschnitt</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {(() => {
                  const classPerformances = performances.filter(p => String(p.class_id) === String(activeClassId));
                  return classPerformances.length > 0 ? calculateWeightedGrade(classPerformances).toFixed(2) : '—';
                })()}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-slate-200/50 dark:border-slate-700/50">
            <CardContent className="p-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Förderbedarf</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {filteredAndSortedCards.filter(c => c.average < 4.0).length}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-slate-200/50 dark:border-slate-700/50">
            <CardContent className="p-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Starke Leistung</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {filteredAndSortedCards.filter(c => c.average >= 5.0).length}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Schüler Grid */}
        {filteredAndSortedCards.length === 0 ? (
          <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl shadow-xl border border-white/20 dark:border-slate-700/50">
            <CardContent className="text-center py-20">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {searchQuery ? "Keine Schüler gefunden" : "Keine Schüler vorhanden"}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {searchQuery
                  ? "Versuchen Sie eine andere Suche"
                  : "Fügen Sie Schüler in den Einstellungen hinzu"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-y-auto max-h-[calc(100vh-320px)] pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredAndSortedCards.map((card, index) => {
              const gradeColors = getGradeColor(card.average);

              return (
                <motion.div
                  key={card.student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCardClick(card.student.id)}
                  className="cursor-pointer group"
                >
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-2xl transition-all duration-300 h-full overflow-hidden flex flex-col">
                    {/* Header mit Durchschnittsnote */}
                    <div className={`p-4 bg-gradient-to-br ${gradeColors.bg} relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                            {card.student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className={`font-bold ${gradeColors.text} text-base leading-tight truncate`}>
                              {card.student.name}
                            </h3>
                            <p className="text-xs text-white/80 mt-0.5">
                              {card.totalAssessments} Beurteilungen
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-3xl font-bold ${gradeColors.text}`}>
                            {card.average.toFixed(1)}
                          </div>
                          <div className={`w-3 h-3 rounded-full ${gradeColors.indicator} mt-1 ml-auto`} />
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                      {/* Stärken (Top 3) - IMMER anzeigen */}
                      {card.strongFachbereiche.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Award className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                            <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                              Stärken
                            </p>
                          </div>
                          <div className="grid grid-cols-1 gap-1.5">
                            {card.strongFachbereiche.map((fb, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs bg-green-50 dark:bg-green-900/20 px-2 py-1.5 rounded"
                              >
                                <span className="text-green-900 dark:text-green-100 font-medium truncate flex-1 mr-2">
                                  {fb.name}
                                </span>
                                <Badge variant="outline" className="ml-auto bg-green-200 dark:bg-green-900/50 border-green-400 dark:border-green-700 text-green-900 dark:text-green-200 text-xs font-bold">
                                  {fb.average.toFixed(1)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Förderbedarf (Bottom 3) - IMMER anzeigen */}
                      {card.weakFachbereiche.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <TrendingDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                              Ausbaufähig
                            </p>
                          </div>
                          <div className="grid grid-cols-1 gap-1.5">
                            {card.weakFachbereiche.map((fb, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 rounded"
                              >
                                <span className="text-amber-900 dark:text-amber-100 font-medium truncate flex-1 mr-2">
                                  {fb.name}
                                </span>
                                <Badge variant="outline" className="ml-auto bg-amber-200 dark:bg-amber-900/50 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-bold">
                                  {fb.average.toFixed(1)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Überfachliche Kompetenzen mit Sternen */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-auto">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Überfachlich
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {card.compAverage !== null && (
                              <StarRating score={card.compAverage} />
                            )}
                            {card.criticalComps > 0 && (
                              <Badge variant="outline" className="bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 text-xs flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {card.criticalComps}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Call to Action */}
                      <div className="pt-2 flex items-center justify-between text-xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/student-dashboard?studentId=${card.student.id}`);
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                          title="Schüler-Dashboard ansehen"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5" />
                          <span className="font-medium">Dashboard</span>
                        </button>
                        <div className="flex items-center text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          <span className="font-medium">Details</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
