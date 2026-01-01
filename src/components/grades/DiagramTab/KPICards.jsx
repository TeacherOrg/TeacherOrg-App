import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, Award, Target, Users, ChevronRight } from 'lucide-react';
import { calculateWeightedGrade } from '@/components/grades/utils/calculateWeightedGrade';

// Animated counter hook
const useCountUp = (end, duration = 800, start = 0) => {
  const [count, setCount] = useState(start);
  useEffect(() => {
    let startTime;
    let animationFrame;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(start + (end - start) * progress);
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, start]);
  return count;
};

const AnimatedNumber = ({ value, decimals = 2 }) => {
  const count = useCountUp(value, 800);
  return <span>{count.toFixed(decimals)}</span>;
};

// 5-Tier Color helper for grades (matching FachbereicheHeatmap)
const getGradeColor = (grade) => {
  if (grade >= 5.0) return { bg: 'from-green-500 to-emerald-600', text: 'text-white', icon: 'text-green-100' };    // Dunkelgrün
  if (grade >= 4.5) return { bg: 'from-green-400 to-emerald-500', text: 'text-white', icon: 'text-green-100' };    // Hellgrün
  if (grade >= 4.0) return { bg: 'from-yellow-400 to-amber-500', text: 'text-white', icon: 'text-yellow-100' };    // Gelb
  if (grade >= 3.5) return { bg: 'from-orange-400 to-orange-500', text: 'text-white', icon: 'text-orange-100' };   // Orange
  return { bg: 'from-red-500 to-rose-600', text: 'text-white', icon: 'text-red-100' };                             // Rot
};

const getCriticalColor = (count, total) => {
  const ratio = total > 0 ? count / total : 0;
  if (count === 0) return { bg: 'from-green-500 to-emerald-600', text: 'text-white', icon: 'text-green-100' };
  if (ratio <= 0.1) return { bg: 'from-yellow-500 to-amber-500', text: 'text-white', icon: 'text-yellow-100' };
  if (ratio <= 0.25) return { bg: 'from-orange-500 to-red-500', text: 'text-white', icon: 'text-orange-100' };
  return { bg: 'from-red-600 to-rose-700', text: 'text-white', icon: 'text-red-100' };
};

const KPICards = ({ performances, students, subjects, selectedSubject = 'all', selectedStudents = [] }) => {
  const [showDetailModal, setShowDetailModal] = useState(null); // 'class' | 'best' | 'worst' | 'critical'

  // Detect single student mode
  const isSingleStudent = selectedStudents?.length === 1;
  const selectedStudentId = isSingleStudent ? selectedStudents[0] : null;
  const selectedStudent = isSingleStudent ? students?.find(s => s.id === selectedStudentId) : null;

  const kpis = useMemo(() => {
    if (!performances?.length || !students?.length) {
      return {
        classAverage: 0,
        bestSubject: null,
        worstSubject: null,
        criticalCount: 0,
        criticalStudents: [],
        criticalFachbereiche: [],
        subjectStats: [],
        studentCount: students?.length || 0,
        isSingleStudent: false
      };
    }

    // Filter performances by selected subject if not "all"
    let relevantPerformances = selectedSubject === 'all'
      ? performances
      : performances.filter(p => p.subject === selectedSubject);

    // SINGLE STUDENT MODE: Filter performances to only selected student
    if (isSingleStudent && selectedStudentId) {
      relevantPerformances = relevantPerformances.filter(p => p.student_id === selectedStudentId);
    }

    // Calculate class average
    const classAverage = relevantPerformances.length > 0
      ? calculateWeightedGrade(relevantPerformances)
      : 0;

    // Calculate per-subject averages (filtered for single student if applicable)
    const subjectAverages = {};
    const perfsForSubjectCalc = isSingleStudent && selectedStudentId
      ? performances.filter(p => p.student_id === selectedStudentId)
      : performances;

    perfsForSubjectCalc.forEach(p => {
      if (!subjectAverages[p.subject]) {
        subjectAverages[p.subject] = [];
      }
      subjectAverages[p.subject].push(p);
    });

    const subjectStats = Object.entries(subjectAverages).map(([subjectId, perfs]) => {
      const subject = subjects.find(s => s.id === subjectId);
      const avg = calculateWeightedGrade(perfs);
      return {
        id: subjectId,
        name: subject?.name || subjectId,
        average: avg,
        count: perfs.length
      };
    }).filter(s => s.count > 0);

    subjectStats.sort((a, b) => b.average - a.average);

    // Calculate Fachbereiche for best/worst subject
    const calculateSubjectFachbereiche = (subjectId) => {
      const subjectPerfs = performances.filter(p => p.subject === subjectId);
      const fachbereicheMap = {};

      subjectPerfs.forEach(p => {
        if (Array.isArray(p.fachbereiche)) {
          p.fachbereiche.forEach(fachbereich => {
            if (!fachbereich || typeof fachbereich !== 'string') return;
            if (!fachbereicheMap[fachbereich]) {
              fachbereicheMap[fachbereich] = { grades: [], count: 0 };
            }
            fachbereicheMap[fachbereich].grades.push(p.grade);
            fachbereicheMap[fachbereich].count++;
          });
        }
      });

      return Object.entries(fachbereicheMap)
        .map(([name, data]) => ({
          name,
          average: parseFloat((data.grades.reduce((sum, g) => sum + g, 0) / data.grades.length).toFixed(2)),
          count: data.count
        }))
        .sort((a, b) => b.average - a.average);
    };

    const bestSubject = subjectStats[0]
      ? { ...subjectStats[0], fachbereiche: calculateSubjectFachbereiche(subjectStats[0].id) }
      : null;
    const worstSubject = subjectStats[subjectStats.length - 1]
      ? { ...subjectStats[subjectStats.length - 1], fachbereiche: calculateSubjectFachbereiche(subjectStats[subjectStats.length - 1].id) }
      : null;

    // Calculate per-student averages for critical detection with Fachbereiche details
    const studentAverages = students.map(student => {
      const studentPerfs = relevantPerformances.filter(p => p.student_id === student.id);
      if (studentPerfs.length === 0) return { student, average: null };
      const avg = calculateWeightedGrade(studentPerfs);

      // Calculate Fachbereiche for this student
      const fachbereicheMap = {};
      studentPerfs.forEach(p => {
        if (Array.isArray(p.fachbereiche)) {
          p.fachbereiche.forEach(fachbereich => {
            if (!fachbereich || typeof fachbereich !== 'string') return;
            if (!fachbereicheMap[fachbereich]) {
              fachbereicheMap[fachbereich] = { grades: [], subjects: new Set() };
            }
            fachbereicheMap[fachbereich].grades.push(p.grade);
            if (p.subject) {
              const subjectName = subjects.find(s => s.id === p.subject)?.name || p.subject;
              fachbereicheMap[fachbereich].subjects.add(subjectName);
            }
          });
        }
      });

      const allFachbereiche = Object.entries(fachbereicheMap).map(([name, data]) => ({
        name,
        average: parseFloat((data.grades.reduce((sum, g) => sum + g, 0) / data.grades.length).toFixed(2)),
        count: data.grades.length,
        subjects: Array.from(data.subjects).sort()
      })).sort((a, b) => b.average - a.average);

      const weakFachbereiche = allFachbereiche
        .filter(fb => fb.average < 4.0)
        .sort((a, b) => a.average - b.average);

      return {
        student,
        average: avg,
        performanceCount: studentPerfs.length,
        weakFachbereiche,
        allFachbereiche
      };
    }).filter(s => s.average !== null);

    const criticalStudents = studentAverages
      .filter(s => s.average < 4.0)
      .sort((a, b) => a.average - b.average);

    // SINGLE STUDENT MODE: Calculate critical Fachbereiche for selected student
    let criticalFachbereiche = [];
    if (isSingleStudent && selectedStudentId) {
      const studentPerfs = performances.filter(p => p.student_id === selectedStudentId);
      const fachbereicheMap = {};

      studentPerfs.forEach(p => {
        if (Array.isArray(p.fachbereiche)) {
          p.fachbereiche.forEach(fachbereich => {
            if (!fachbereich || typeof fachbereich !== 'string') return;
            if (!fachbereicheMap[fachbereich]) {
              fachbereicheMap[fachbereich] = { grades: [], subjects: new Set() };
            }
            fachbereicheMap[fachbereich].grades.push(p.grade);
            const subjectName = subjects.find(s => s.id === p.subject)?.name || p.subject;
            fachbereicheMap[fachbereich].subjects.add(subjectName);
          });
        }
      });

      criticalFachbereiche = Object.entries(fachbereicheMap)
        .map(([name, data]) => ({
          name,
          average: parseFloat((data.grades.reduce((sum, g) => sum + g, 0) / data.grades.length).toFixed(2)),
          count: data.grades.length,
          subjects: Array.from(data.subjects).sort()
        }))
        .filter(fb => fb.average < 4.0)
        .sort((a, b) => a.average - b.average);
    }

    return {
      classAverage: parseFloat(classAverage.toFixed(2)),
      bestSubject,
      worstSubject,
      criticalCount: isSingleStudent ? criticalFachbereiche.length : criticalStudents.length,
      criticalStudents,
      criticalFachbereiche,
      studentCount: students.length,
      subjectStats,
      isSingleStudent
    };
  }, [performances, students, subjects, selectedSubject, isSingleStudent, selectedStudentId]);

  const classColors = getGradeColor(kpis.classAverage);
  const bestColors = kpis.bestSubject ? getGradeColor(kpis.bestSubject.average) : { bg: 'from-slate-400 to-slate-500', text: 'text-white' };
  const worstColors = kpis.worstSubject ? getGradeColor(kpis.worstSubject.average) : { bg: 'from-slate-400 to-slate-500', text: 'text-white' };
  const criticalColors = getCriticalColor(kpis.criticalCount, kpis.studentCount);

  const cards = [
    {
      id: 'class',
      title: isSingleStudent ? 'Schülerschnitt' : 'Klassenschnitt',
      value: kpis.classAverage,
      subtitle: isSingleStudent ? (selectedStudent?.name || 'Schüler') : `${kpis.studentCount} Schüler`,
      icon: Users,
      colors: classColors,
      decimals: 2
    },
    {
      id: 'best',
      title: isSingleStudent ? 'Bestes Fach' : 'Stärkstes Fach',
      value: kpis.bestSubject?.average || 0,
      subtitle: kpis.bestSubject?.name || '—',
      icon: Award,
      colors: bestColors,
      decimals: 2
    },
    {
      id: 'worst',
      title: isSingleStudent ? 'Schwächstes Fach' : 'Schwächstes Fach',
      value: kpis.worstSubject?.average || 0,
      subtitle: kpis.worstSubject?.name || '—',
      icon: Target,
      colors: worstColors,
      decimals: 2
    },
    {
      id: 'critical',
      title: 'Förderbedarf',
      value: kpis.criticalCount,
      subtitle: isSingleStudent ? 'Kritische Fachbereiche' : '< 4.0 Schnitt',
      icon: AlertCircle,
      colors: criticalColors,
      decimals: 0
    }
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowDetailModal(card.id)}
              className="cursor-pointer group h-full"
            >
              <Card className={`relative overflow-hidden bg-gradient-to-br ${card.colors.bg} border-none shadow-md hover:shadow-lg transition-all duration-300 h-full`}>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardContent className="p-3 relative z-10">
                  <div className="flex items-start justify-between mb-1">
                    <p className={`text-xs font-medium ${card.colors.text} opacity-90`}>
                      {card.title}
                    </p>
                    <card.icon className={`w-4 h-4 ${card.colors.icon} opacity-80`} />
                  </div>
                  <div className={`text-2xl font-bold ${card.colors.text}`}>
                    {card.decimals > 0 ? (
                      <AnimatedNumber value={card.value} decimals={card.decimals} />
                    ) : (
                      card.value
                    )}
                  </div>
                  <p className={`text-xs ${card.colors.text} opacity-75 truncate`}>
                    {card.subtitle}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Detail Modal for Klassenschnitt - All Subjects */}
      <Dialog open={showDetailModal === 'class'} onOpenChange={() => setShowDetailModal(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" /> Klassenstatistik
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {kpis.subjectStats.map((subject, index) => {
              const colors = getGradeColor(subject.average);
              return (
                <div
                  key={subject.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colors.bg} flex items-center justify-center text-white text-xs font-bold`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{subject.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{subject.count} Beurteilungen</p>
                    </div>
                  </div>
                  <Badge className={`bg-gradient-to-r ${colors.bg} text-white font-bold`}>
                    {subject.average.toFixed(2)}
                  </Badge>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal for Best Subject - Fachbereiche */}
      <Dialog open={showDetailModal === 'best'} onOpenChange={() => setShowDetailModal(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" /> {kpis.bestSubject?.name || 'Stärkstes Fach'}
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Fachbereiche im stärksten Fach (beste zuerst)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {kpis.bestSubject?.fachbereiche?.length > 0 ? (
              kpis.bestSubject.fachbereiche.map((fb, index) => {
                const colors = getGradeColor(fb.average);
                return (
                  <div
                    key={fb.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colors.bg} flex items-center justify-center text-white text-xs font-bold`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{fb.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{fb.count} Beurteilungen</p>
                      </div>
                    </div>
                    <Badge className={`bg-gradient-to-r ${colors.bg} text-white font-bold`}>
                      {fb.average.toFixed(2)}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-slate-500 dark:text-slate-400 py-4">
                Keine Fachbereiche vorhanden
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal for Worst Subject - Fachbereiche */}
      <Dialog open={showDetailModal === 'worst'} onOpenChange={() => setShowDetailModal(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" /> {kpis.worstSubject?.name || 'Schwächstes Fach'}
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Fachbereiche im schwächsten Fach (schwächste zuerst)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {kpis.worstSubject?.fachbereiche?.length > 0 ? (
              [...kpis.worstSubject.fachbereiche].reverse().map((fb, index) => {
                const colors = getGradeColor(fb.average);
                return (
                  <div
                    key={fb.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colors.bg} flex items-center justify-center text-white text-xs font-bold`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{fb.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{fb.count} Beurteilungen</p>
                      </div>
                    </div>
                    <Badge className={`bg-gradient-to-r ${colors.bg} text-white font-bold`}>
                      {fb.average.toFixed(2)}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-slate-500 dark:text-slate-400 py-4">
                Keine Fachbereiche vorhanden
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal for Critical Students/Fachbereiche */}
      <Dialog open={showDetailModal === 'critical'} onOpenChange={() => setShowDetailModal(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              {isSingleStudent ? `Kritische Fachbereiche - ${selectedStudent?.name || 'Schüler'}` : 'Schüler mit Förderbedarf'}
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              {isSingleStudent
                ? `${kpis.criticalCount} Fachbereiche mit Schnitt unter 4.0`
                : `${kpis.criticalCount} von ${kpis.studentCount} Schülern haben einen Schnitt unter 4.0 - Detaillierte Fachbereich-Analyse`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <div
              className="h-full pr-4 space-y-4 kpi-critical-scroll"
              style={{
                maxHeight: 'calc(90vh - 180px)',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin'
              }}
            >
              {/* SINGLE STUDENT MODE: Show critical Fachbereiche */}
              {isSingleStudent ? (
                kpis.criticalFachbereiche.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Award className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    <p className="font-semibold text-lg">Keine kritischen Fachbereiche</p>
                    <p className="text-sm">Alle Fachbereiche haben einen Schnitt von 4.0 oder besser</p>
                  </div>
                ) : (
                  kpis.criticalFachbereiche.map((fb, index) => {
                    const colors = getGradeColor(fb.average);
                    return (
                      <motion.div
                        key={fb.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200 dark:border-red-800"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors.bg} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{fb.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {fb.subjects.join(', ')} • {fb.count} Beurteilungen
                              </p>
                            </div>
                          </div>
                          <Badge variant="destructive" className="text-lg font-bold px-3 py-1 shadow-md">
                            Ø {fb.average.toFixed(2)}
                          </Badge>
                        </div>
                      </motion.div>
                    );
                  })
                )
              ) : kpis.criticalStudents.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <Award className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <p className="font-semibold text-lg">Keine Schüler mit Förderbedarf</p>
                  <p className="text-sm">Alle Schüler haben einen Schnitt von 4.0 oder besser</p>
                </div>
              ) : (
                kpis.criticalStudents.map((item, index) => (
                  <motion.div
                    key={item.student.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200 dark:border-red-800 hover:shadow-lg transition-all"
                  >
                    {/* Student Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {item.student.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-lg">{item.student.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.performanceCount} Beurteilungen
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive" className="text-xl font-bold px-4 py-2 shadow-md">
                        Ø {item.average.toFixed(2)}
                      </Badge>
                    </div>

                    {/* Weak Fachbereiche Section */}
                    {item.weakFachbereiche && item.weakFachbereiche.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-3 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Kritische Fachbereiche (ungenügend):
                        </p>

                        {/* Group by Subject */}
                        {(() => {
                          const bySubject = {};
                          item.weakFachbereiche.forEach(fb => {
                            fb.subjects.forEach(subject => {
                              if (!bySubject[subject]) bySubject[subject] = [];
                              bySubject[subject].push(fb);
                            });
                          });
                          return Object.entries(bySubject).map(([subject, fbs]) => (
                            <div key={subject} className="mb-3 last:mb-0">
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                                {subject}
                              </p>
                              <div className="flex flex-wrap gap-2 ml-4">
                                {fbs.map((fb, fbIndex) => (
                                  <motion.div
                                    key={fbIndex}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 + fbIndex * 0.03 }}
                                    className="group relative"
                                  >
                                    <Badge
                                      variant="outline"
                                      className="bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 font-medium px-3 py-1 cursor-help"
                                    >
                                      {fb.name}
                                      <span className="ml-2 font-bold text-red-700 dark:text-red-400">
                                        {fb.average}
                                      </span>
                                    </Badge>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-sm">
                                      {fb.count} Beurteilung{fb.count > 1 ? 'en' : ''}
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}

                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Scrollbar Styles */}
          <style>{`
            .kpi-critical-scroll::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            .kpi-critical-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .kpi-critical-scroll::-webkit-scrollbar-thumb {
              background-color: rgba(0,0,0,0.12);
              border-radius: 9999px;
              border: 2px solid transparent;
              background-clip: padding-box;
            }
            .kpi-critical-scroll {
              scrollbar-color: rgba(0,0,0,0.12) transparent;
              scrollbar-width: thin;
            }
            .dark .kpi-critical-scroll::-webkit-scrollbar-thumb {
              background-color: rgba(255,255,255,0.08);
            }
            .dark .kpi-critical-scroll {
              scrollbar-color: rgba(255,255,255,0.08) transparent;
            }
          `}</style>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default React.memo(KPICards);
