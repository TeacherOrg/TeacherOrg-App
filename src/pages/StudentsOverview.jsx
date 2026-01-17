import React, { useState, useEffect, useMemo } from "react";
import { Student, Performance, UeberfachlichKompetenz, Class } from "@/api/entities";
import pb from '@/api/pb';
import { Users, Users2, TrendingDown, Award, AlertCircle, ChevronRight, Search, Star, LayoutDashboard, Scroll, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select";
import CalendarLoader from "../components/ui/CalendarLoader";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { calculateWeightedGrade } from '@/components/grades/utils/calculateWeightedGrade';
import BountiesStoreTab from '@/components/grades/BountiesStoreTab/BountiesStoreTab';
import { useStudentSortPreference } from '@/hooks/useStudentSortPreference';
import { sortStudents } from '@/utils/studentSortUtils';

export default function StudentsOverview() {
  const [students, setStudents] = useState([]);
  const [performances, setPerformances] = useState([]);
  const [ueberfachlich, setUeberfachlich] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [activeTab, setActiveTab] = useState("students"); // "students" | "bounties-store"

  const navigate = useNavigate();
  const [sortPreference] = useStudentSortPreference();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userId = pb.authStore.model?.id;

      // 1. Erst Team Teaching laden um shared class IDs zu bekommen
      // WICHTIG: owner_id != userId um Self-Team-Teaching-Records auszuschließen
      const teamTeachingAccess = await pb.collection('team_teachings').getFullList({
        filter: `invited_user_id = '${userId}' && status = 'accepted' && owner_id != '${userId}'`,
        expand: 'class_id,owner_id',
        $autoCancel: false
      }).catch(() => []);

      const sharedClassIds = teamTeachingAccess.map(tt => tt.class_id);

      // 2. Eigene Daten parallel laden
      const [ownStudentsData, ownPerformancesData, ownUeberfachlichData, ownedClassesData] = await Promise.all([
        Student.list(),
        Performance.list(),
        UeberfachlichKompetenz.list(),
        Class.list()
      ]);

      // 3. Daten von geteilten Klassen laden (NUR nicht-versteckte)
      let sharedStudents = [];
      let sharedPerformances = [];
      let sharedUeberfachlich = [];

      // Nur nicht-versteckte Klassen für Daten-Loading
      const visibleSharedClassIds = teamTeachingAccess
        .filter(tt => !tt.is_hidden)
        .map(tt => tt.class_id);

      if (visibleSharedClassIds.length > 0) {
        for (const classId of visibleSharedClassIds) {
          const [students, performances, ueberfachlich] = await Promise.all([
            pb.collection('students').getFullList({
              filter: `class_id = '${classId}'`,
              $autoCancel: false
            }).catch(() => []),
            pb.collection('performances').getFullList({
              filter: `class_id = '${classId}'`,
              $autoCancel: false
            }).catch(() => []),
            pb.collection('ueberfachlich_kompetenzen').getFullList({
              filter: `class_id = '${classId}'`,
              $autoCancel: false
            }).catch(() => [])
          ]);
          sharedStudents = [...sharedStudents, ...students];
          sharedPerformances = [...sharedPerformances, ...performances];
          sharedUeberfachlich = [...sharedUeberfachlich, ...ueberfachlich];
        }
      }

      console.log('[StudentsOverview] Shared class data:', {
        sharedClassIds,
        sharedStudents: sharedStudents.length,
        sharedPerformances: sharedPerformances.length
      });

      // 4. Eigene Klassen mit Metadaten
      const ownedWithMeta = (ownedClassesData || []).map(cls => ({
        ...cls,
        isOwner: true,
        permissionLevel: 'full_access'
      }));

      // 5. Geteilte Klassen aus Team Teaching - MIT FALLBACK wenn expand fehlschlägt (RLS)
      // NUR nicht-versteckte Klassen anzeigen
      const sharedClasses = teamTeachingAccess
        .filter(tt => (tt.expand?.class_id || tt.class_id) && !tt.is_hidden) // Fallback + Filter
        .map(tt => ({
          // Wenn expand funktioniert, nutze es - sonst Fallback
          ...(tt.expand?.class_id || {}),
          // Fallback-Felder wenn expand fehlt (wegen RLS)
          id: tt.expand?.class_id?.id || tt.class_id,
          name: tt.expand?.class_id?.name || tt.class_name || 'Geteilte Klasse',
          isOwner: false,
          permissionLevel: tt.permission_level || 'view_only',
          teamTeachingId: tt.id,
          ownerEmail: tt.expand?.owner_id?.email || ''
        }));

      // 6. Zusammenführen
      const allClasses = [...ownedWithMeta, ...sharedClasses];

      // 7. Alle Daten setzen
      setStudents([...(ownStudentsData || []), ...sharedStudents]);
      setPerformances([...(ownPerformancesData || []), ...sharedPerformances]);
      setUeberfachlich([...(ownUeberfachlichData || []), ...sharedUeberfachlich]);
      setClasses(allClasses || []);

      if (allClasses && allClasses.length > 0 && !activeClassId) {
        // ensure activeClassId is a string to match Select onValueChange and comparisons
        setActiveClassId(String(allClasses[0].id));
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
        case "name": {
          const sortedByName = sortStudents([a.student, b.student], sortPreference);
          return sortedByName[0].id === a.student.id ? -1 : 1;
        }
        case "average-asc":
          return (a.average || 0) - (b.average || 0);
        case "average-desc":
          return (b.average || 0) - (a.average || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [studentCards, searchQuery, sortBy, sortPreference]);

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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Schülerübersicht
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mt-1">
                    {activeTab === "students" ? "Kompakte Übersicht über alle Schüler" : "Bounties & Store verwalten"}
                  </p>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-1 border border-slate-200/50 dark:border-slate-700/50">
                <button
                  onClick={() => setActiveTab("students")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "students"
                      ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Schüler</span>
                </button>
                <button
                  onClick={() => setActiveTab("bounties-store")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "bounties-store"
                      ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Scroll className="w-4 h-4" />
                  <span className="hidden sm:inline">Bounties & Store</span>
                </button>
              </div>
            </div>

            {/* Filter und Suche - nur im Schüler-Tab */}
            {activeTab === "students" && (
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Klassen-Auswahl mit Kategorien */}
              <Select value={activeClassId || ''} onValueChange={setActiveClassId}>
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 min-w-[180px]">
                  <SelectValue placeholder="Klasse auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {/* Eigene Klassen */}
                  {classes.filter(c => c.isOwner !== false).length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs text-slate-500 dark:text-slate-400">Meine Klassen</SelectLabel>
                      {classes.filter(c => c.isOwner !== false).map(cls => (
                        <SelectItem key={cls.id} value={String(cls.id)}>{cls.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {/* Geteilte Klassen */}
                  {classes.filter(c => c.isOwner === false).length > 0 && (
                    <>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel className="text-xs text-purple-500 dark:text-purple-400 flex items-center gap-1">
                          <Users2 className="w-3 h-3" />
                          Geteilte Klassen
                        </SelectLabel>
                        {classes.filter(c => c.isOwner === false).map(cls => (
                          <SelectItem key={cls.id} value={String(cls.id)}>
                            <div className="flex items-center gap-2">
                              {cls.permissionLevel === 'view_only' ? (
                                <Eye className="w-3 h-3 text-blue-500" />
                              ) : (
                                <Users2 className="w-3 h-3 text-green-500" />
                              )}
                              {cls.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </>
                  )}
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
                </SelectContent>
              </Select>
            </div>
            )}
          </div>
        </motion.div>

        {/* Bounties & Store Tab */}
        {activeTab === "bounties-store" && (
          <BountiesStoreTab
            students={students.filter(s => String(s.class_id) === String(activeClassId))}
            classes={classes}
            activeClassId={activeClassId}
            onClassChange={setActiveClassId}
          />
        )}

        {/* Statistik-Bar - nur im Schüler-Tab */}
        {activeTab === "students" && (
        <>
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
        </>
        )}
      </div>
    </div>
  );
}
