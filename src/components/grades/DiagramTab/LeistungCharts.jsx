import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLeistungsChartData } from '../hooks/useLeistungsChartData';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge"; // NEU: Für Badges in der Modal
import { ResponsiveContainer, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar, ReferenceArea, PolarRadiusAxis, Text } from 'recharts';
import { BarChart3, ArrowLeft, AlertCircle, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'; // NEU: TrendingUp/Down hinzugefügt
import { calculateWeightedGrade } from '@/components/grades/utils/calculateWeightedGrade'; // ← Import hinzugefügt
import { CLASS_AVG_COLOR } from '@/components/grades/utils/constants'; // ← Neu: Zentraler Import für CLASS_AVG_COLOR

const ASSESSMENT_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c', '#d0ed57', '#ff9f40', '#ff6384', '#36a2eb', '#ffce56'];

const getAssessmentColor = (index) => ASSESSMENT_COLORS[index % ASSESSMENT_COLORS.length];

// NEU: Hook für animierte Zahlen
const useCountUp = (end, duration = 1000, start = 0) => {
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

// NEU: AnimatedCounter-Komponente
const AnimatedCounter = ({ value, decimals = 0, suffix = "" }) => {
  const count = useCountUp(value, 1000);
  return <span>{decimals > 0 ? count.toFixed(decimals) : Math.floor(count)}{suffix}</span>;
};

// NEU: Funktion für kritische Farben
const getCriticalColor = (count) => {
  if (count === 0) return { from: 'from-green-500', to: 'to-emerald-500', text: 'text-green-100', icon: 'text-green-200' };
  if (count <= 2) return { from: 'from-yellow-500', to: 'to-amber-500', text: 'text-yellow-100', icon: 'text-yellow-200' };
  if (count <= 5) return { from: 'from-orange-500', to: 'to-red-500', text: 'text-orange-100', icon: 'text-orange-200' };
  return { from: 'from-red-600', to: 'to-red-700', text: 'text-red-100', icon: 'text-red-200' };
};

const ClickablePolarAngleTick = ({ x, y, payload, setSelectedFachbereich }) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        onClick={() => setSelectedFachbereich(payload.value)}
        style={{ cursor: 'pointer' }}
        className="hover:fill-white hover:font-bold"
        fill="hsl(var(--foreground))"
      >
        {payload.value}
      </text>
    </g>
  );
};

const ClickableXAxisTick = ({ x, y, payload, setSelectedItem, isSubject, subjects }) => {
  const handleClick = () => {
    if (isSubject) {
      const subjectId = subjects.find(s => s.name === payload.value)?.id;
      if (subjectId) {
        setSelectedItem(subjectId);
      }
    } else {
      setSelectedItem(payload.value);
    }
  };

  return (
    <g transform={`translate(${x},${y})`}>
      <text 
        x={0} 
        y={0} 
        dy={16} 
        textAnchor="middle"  // Geändert zu "middle" für Zentrierung
        fill="hsl(var(--muted-foreground))" 
        fontSize={12} 
        // Entferne transform="rotate(-35)" für gerade Labels
        onClick={handleClick}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        className="hover:fill-white hover:font-bold transition-all"
      >
        {payload.value}
      </text>
    </g>
  );
};

const MultilineXAxisTick = ({ x, y, payload }) => {
  const [line1, line2] = payload.value.split('\n');
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#666">
        {line1}
      </text>
      <text x={0} y={0} dy={32} textAnchor="middle" fill="#666">
        {line2}
      </text>
    </g>
  );
};

const Leistungscharts = ({ performances, students, subjects, selectedStudents, showClassAverage, selectedSubject, setSelectedSubject, activeClassId, onDataChange }) => {
  const [enlargedChart, setEnlargedChart] = useState(null);
  const [selectedFachbereich, setSelectedFachbereich] = useState(null);
  const [showCriticalModal, setShowCriticalModal] = useState(false); // NEU: Für Detailansicht
  const { lineData, subjectData, fachbereichData, fachbereichDetailData, getStudentColor } = useLeistungsChartData({
    performances,
    students,
    subjects,
    selectedSubject,
    selectedStudents,
    showClassAverage,
    selectedFachbereich
  });

  // NEU: Berechnung der KPIs (angepasst aus altem Code, fokussiert auf Leistungen)
  const kpis = useMemo(() => {
    const relevantStudents = selectedStudents.length > 0
      ? students.filter(s => selectedStudents.includes(s.id))
      : students;
    const relevantPerformances = performances.filter(p => {
      const studentMatch = relevantStudents.some(s => s.id === p.student_id);
      const subjectMatch = selectedSubject === 'all' || p.subject === selectedSubject;
      return studentMatch && subjectMatch;
    });
    if (relevantStudents.length === 0) {
      return {
        averageGrade: 0,
        criticalStudents: 0,
        criticalStudentsList: [],
        studentCount: 0
      };
    }
    const validGrades = relevantPerformances
      .map(p => p.grade)
      .filter(g => typeof g === 'number' && g > 0);
    const averageGrade = validGrades.length > 0
      ? calculateWeightedGrade(relevantPerformances) // ← Ersetzt
      : 0;
    const studentAverages = relevantStudents.map(student => {
      const studentGrades = relevantPerformances
        .filter(p => p.student_id === student.id)
        .map(p => p.grade)
        .filter(g => typeof g === 'number' && g > 0);
      const avg = studentGrades.length > 0
        ? calculateWeightedGrade(relevantPerformances.filter(p => p.student_id === student.id)) // ← Ersetzt
        : null;
      const fachbereicheMap = {};
      relevantPerformances
        .filter(p => p.student_id === student.id)
        .forEach(p => {
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
        average: parseFloat((data.grades.reduce((sum, g) => sum + g, 0) / data.grades.length).toFixed(2)), // ← Hier bleibt ungewichtet, da fachbereiche spezifisch
        count: data.grades.length,
        subjects: Array.from(data.subjects).sort()
      })).sort((a, b) => b.average - a.average);
      const weakFachbereiche = allFachbereiche.filter(fb => fb.average < 4.0).sort((a, b) => a.average - b.average);
      return {
        student,
        average: avg,
        weakFachbereiche,
        allFachbereiche
      };
    }).filter(item => item.average !== null);
    const criticalStudentsList = studentAverages
      .filter(item => item.average < 4.0)
      .sort((a, b) => a.average - b.average);
    return {
      averageGrade: parseFloat(averageGrade.toFixed(2)),
      criticalStudents: criticalStudentsList.length,
      criticalStudentsList,
      studentCount: relevantStudents.length
    };
  }, [performances, students, subjects, selectedStudents, selectedSubject]);

  // NEU: Critical Colors basierend auf KPIs
  const criticalColors = getCriticalColor(kpis.criticalStudents);

  const isAllSubjects = selectedSubject === 'all';
  const shouldUseBarChartForFachbereich = fachbereichData.length < 3 && fachbereichData.length > 0;

  const canRenderChart = (data) => {
    if (!Array.isArray(data) || data.length === 0) return false;
    return data.every(item => item && typeof item === 'object' && item.name);
  };

  const renderChartContent = (chartType, data, yDomain, showReverse = false, isDetail = false, isSubjectChart = false) => {
    const isBarChart = chartType === 'bar';
    const isRadarChart = chartType === 'radar';
    const isLineChart = chartType === 'line';

    if (!canRenderChart(data)) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 p-4">
          <BarChart3 className="w-10 h-10 mb-2" />
          <p className="font-semibold">Keine Daten verfügbar</p>
          <p className="text-sm">Für die aktuelle Auswahl gibt es keine Daten zum Anzeigen.</p>
        </div>
      );
    }

    const yAxisProps = {
      domain: yDomain,
      reversed: showReverse,
      stroke: "hsl(var(--muted-foreground))",
      tick: { fontSize: 12 },
    };
    if (chartType === 'line' && showReverse) {
      yAxisProps.ticks = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
      yAxisProps.reversed = false;
    }
    if (chartType === 'bar' && !showReverse) {
      yAxisProps.ticks = [1, 2, 3, 4, 5];
    }
    if (chartType === 'bar' && showReverse) {
      yAxisProps.ticks = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
      yAxisProps.reversed = false;
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        {isBarChart ? (
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="classAvgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            {selectedStudents.map((studentId, index) => {
              const student = students.find(s => s && s.id === studentId);
              if (!student || !student.name) return null;
              const color = getStudentColor(index);
              const lighterColor = color.replace('#', '').match(/.{2}/g).map(c => Math.min(255, parseInt(c, 16) + 40).toString(16).padStart(2, '0')).join('');
              return (
                <linearGradient key={`studentGradient-${student.id}`} id={`studentGradient-${student.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={`#${lighterColor}`} />
                  <stop offset="100%" stopColor={color} />
                </linearGradient>
              );
            })}
          </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              tick={(props) => isDetail ? <MultilineXAxisTick {...props} /> : <ClickableXAxisTick {...props} setSelectedItem={isSubjectChart ? setSelectedSubject : setSelectedFachbereich} isSubject={isSubjectChart} subjects={subjects} />}
              tickMargin={isDetail ? 10 : undefined}
              height={isDetail ? 50 : undefined}
            />
            <YAxis {...yAxisProps} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--card-foreground))'
              }}
              labelStyle={{ color: 'hsl(var(--card-foreground))' }}
              filterNull={true}
            />
            <Legend />
            {showClassAverage && (
              <Bar
                dataKey="Klassenschnitt"
                fill="url(#classAvgGradient)"
                opacity={0.8}
              />
            )}
            {selectedStudents.map((studentId, index) => {
              const student = students.find(s => s && s.id === studentId);
              if (!student || !student.name) return null;
              return (
                <Bar
                  key={`bar-student-${student.id}`}
                  dataKey={student.name}
                  fill={`url(#studentGradient-${student.id})`}
                  opacity={0.8}
                />
              );
            })}
          </BarChart>
        ) : isRadarChart ? (
          <RadarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <defs>
              <linearGradient id="classAvgRadarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              {selectedStudents.map((studentId, index) => {
                const student = students.find(s => s && s.id === studentId);
                if (!student || !student.name) return null;
                const color = getStudentColor(index);
                const lighterColor = color.replace('#', '').match(/.{2}/g).map(c => Math.min(255, parseInt(c, 16) + 40).toString(16).padStart(2, '0')).join('');
                return (
                  <linearGradient key={`studentRadarGradient-${student.id}`} id={`studentRadarGradient-${student.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={`#${lighterColor}`} />
                    <stop offset="100%" stopColor={color} />
                  </linearGradient>
                );
              })}
            </defs>
            <PolarGrid stroke="hsl(var(--muted-foreground))" strokeWidth={0.5} strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="name"
              tick={(props) => <ClickablePolarAngleTick {...props} setSelectedFachbereich={setSelectedFachbereich} />}
            />
            <PolarRadiusAxis domain={yDomain} ticks={[1,2,3,4,5,6]} tick={false} />
            {showClassAverage && (
              <Radar
                name="Klassenschnitt"
                dataKey="Klassenschnitt"
                stroke={CLASS_AVG_COLOR}
                fill="url(#classAvgRadarGradient)"
                fillOpacity={0.2}
                strokeWidth={2}
                connectNulls={false}
              />
            )}
            {selectedStudents.map((studentId, index) => {
              const student = students.find(s => s && s.id === studentId);
              if (!student || !student.name) return null;
              return (
                <Radar
                  key={`radar-student-${student.id}`}
                  name={student.name}
                  dataKey={student.name}
                  stroke={getStudentColor(index)}
                  fill={`url(#studentRadarGradient-${student.id})`}
                  fillOpacity={0.1}
                  strokeWidth={2}
                  connectNulls={false}
                />
              );
            })}
            <Legend />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--card-foreground))'
              }}
              labelStyle={{ color: 'hsl(var(--card-foreground))' }}
              filterNull={true}
            />
          </RadarChart>
        ) : (
          <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            {enlargedChart === 'left' ? (
              <>
                <ReferenceArea y1={1} y2={4.5} fill="rgba(255, 99, 71, 0.1)" fillOpacity={0.3} />
                <ReferenceArea y1={4.5} y2={5} fill="rgba(255, 255, 0, 0.1)" fillOpacity={0.3} />
                <ReferenceArea y1={5} y2={6} fill="rgba(0, 128, 0, 0.1)" fillOpacity={0.3} />
              </>
            ) : null}
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis {...yAxisProps} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--card-foreground))'
              }}
              labelStyle={{ color: 'hsl(var(--card-foreground))' }}
              filterNull={true}
            />
            <Legend />
            {showClassAverage && (
              <Line
                type="monotone"
                dataKey="Klassenschnitt"
                stroke={CLASS_AVG_COLOR}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={false}
              />
            )}
            {selectedStudents.map((studentId, index) => {
              const student = students.find(s => s && s.id === studentId);
              if (!student || !student.name) return null;
              return (
                <Line
                  key={`student-${student.id}`}
                  type="monotone"
                  dataKey={student.name}
                  stroke={getStudentColor(index)}
                  strokeWidth={2}
                  connectNulls={false}
                />
              );
            })}
          </LineChart>
        )}
      </ResponsiveContainer>
    );
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="bg-white dark:bg-slate-800 text-black dark:text-white border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {isAllSubjects ? 'Notenschnitte der Fächer' : 'Leistungsverlauf'}
            <Button variant="ghost" size="sm" onClick={() => setEnlargedChart('left')} className="text-slate-400 hover:text-white">
              Vergrößern
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 300 }}>
            {renderChartContent(
              isAllSubjects ? 'bar' : 'line',
              isAllSubjects ? subjectData : lineData,
              [1, 6],
              true,
              false,
              isAllSubjects
            )}
          </div>
          {/* NEU: Notenschnittanzeige unter dem Diagramm */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            {selectedStudents.length === 0 ? (
              // Nur Klassenschnitt wenn keine Schüler ausgewählt
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                  {selectedSubject !== 'all' ? `${subjects.find(s => s.id === selectedSubject)?.name || selectedSubject}-Schnitt` : 'Klassenschnitt'} {/* NEU: Fächernamen holen */}
                </p>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {kpis.averageGrade > 0 ? kpis.averageGrade.toFixed(2) : '—'}
                </p>
              </div>
            ) : (
              // Vergleich: Schülerschnitt vs. Klassenschnitt
              (() => {
                const allClassPerfs = performances.filter(p => {
                  const subjectMatch = selectedSubject === 'all' || p.subject === selectedSubject;
                  return subjectMatch;
                });
                
                const classAvg = allClassPerfs.length > 0
                  ? calculateWeightedGrade(allClassPerfs).toFixed(2)
                  : null;
                
                const diff = classAvg && kpis.averageGrade > 0
                  ? (kpis.averageGrade - parseFloat(classAvg)).toFixed(2)
                  : null;
                // Farbe für Schülerschnitt - wenn nur 1 Schüler, nutze Schülerfarbe, sonst blau
                const studentColor = selectedStudents.length === 1
                  ? getStudentColor(0)
                  : '#3b82f6'; // Blau für mehrere Schüler
                return (
                  <div className="grid grid-cols-3 gap-4 items-center">
                    {/* Schülerschnitt */}
                    <div className="text-center">
                      <p className="text-xs font-medium mb-1" style={{ color: studentColor }}>
                        {selectedStudents.length === 1 ? 'Schülerschnitt' : 'Ausgewählte Schüler'}
                      </p>
                      <p className="text-3xl font-bold" style={{ color: studentColor }}>
                        {kpis.averageGrade > 0 ? kpis.averageGrade.toFixed(2) : '—'}
                      </p>
                    </div>
                    
                    {/* Differenz */}
                    {diff !== null && (
                      <div className="text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                          Differenz
                        </p>
                        <p className={`text-2xl font-bold ${
                          parseFloat(diff) > 0
                            ? 'text-green-600 dark:text-green-400'
                            : parseFloat(diff) < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          {parseFloat(diff) > 0 ? '↑' : parseFloat(diff) < 0 ? '↓' : '='} {Math.abs(parseFloat(diff))}
                        </p>
                      </div>
                    )}
                    
                    {/* Klassenschnitt */}
                    <div className="text-center">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                        Klassenschnitt
                      </p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {classAvg || '—'}
                      </p>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white dark:bg-slate-800 text-black dark:text-white border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {selectedFachbereich ? `Fachbereich: ${selectedFachbereich}` : 'Fachbereiche'}
            {selectedFachbereich ? (
              <Button variant="ghost" size="sm" onClick={() => setSelectedFachbereich(null)} className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Zurück
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setEnlargedChart('fachbereich')} className="text-slate-400 hover:text-white">
                Vergrößern
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 300 }}>
            {selectedFachbereich 
              ? renderChartContent('bar', fachbereichDetailData, [1, 6], true, true) 
              : renderChartContent(shouldUseBarChartForFachbereich ? 'bar' : 'radar', fachbereichData, [1, 6], true)}
          </div>
          {/* NEU: Trennung und Klassenschnitt-Anzeige für Konsistenz */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Durchschnitt aller Fachbereiche
              </p>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {fachbereichData.length > 0 ? (fachbereichData.reduce((sum, item) => sum + (item.Klassenschnitt || 0), 0) / fachbereichData.length).toFixed(2) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* NEU: Aufmerksamkeits-KPI unterhalb der Diagramme */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-md col-span-2" // NEU: Span über beide Columns für Platzierung unter Grid
      >
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCriticalModal(true)} // NEU: Öffnet das Modal
          className="cursor-pointer group"
        >
          <Card className={`relative overflow-hidden bg-gradient-to-br ${criticalColors.from} ${criticalColors.to} border-none shadow-lg hover:shadow-2xl transition-all duration-300`}>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {kpis.criticalStudents > 5 && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full"
              />
            )}
            <CardHeader className="pb-3 relative z-10">
              <CardTitle className={`text-sm font-medium ${criticalColors.text} flex items-center gap-2`}>
                <motion.div whileHover={{ scale: 1.3 }} transition={{ duration: 0.2 }}>
                  <AlertCircle className={`w-4 h-4 ${criticalColors.icon}`} />
                </motion.div>
                Aufmerksamkeit
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-bold text-white mb-1">
                <AnimatedCounter value={kpis.criticalStudents} />
              </div>
              <p className="text-xs text-white/80">
                {kpis.criticalStudents === 1 ? 'Schüler' : 'Schüler'} mit Ø {'<'} 4.0
              </p>
              
              {/* Zeige Schülernamen bei Klassenschnitt-Ansicht */}
              {selectedStudents.length === 0 && kpis.criticalStudentsList.length > 0 && (
                // Ersetzt: zuvor wurde hier eine Liste mit Namen und Bewertungen angezeigt.
                // Jetzt nur noch kompakte Anzeige der Anzahl ungenügender Schüler (keine Namen).
                <div className="mt-3 pt-3 border-t border-white/20">
                  <div className="text-center">
                    <p className="text-sm text-white/85">
                      {kpis.criticalStudentsList.length} ungenügende {kpis.criticalStudentsList.length === 1 ? 'Schülerin' : 'Schüler'}
                    </p>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-white/70 mt-2 flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                {selectedStudents.length === 0 ? 'Für Details klicken' : 'Liste anzeigen'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      {/* NEU: Kritische Schüler Modal - aus dem alten Code angepasst */}
      <Dialog open={showCriticalModal} onOpenChange={setShowCriticalModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              {selectedStudents.length > 0 ? 'Schüler-Analyse' : 'Schüler-Leistungsübersicht'}
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              {selectedStudents.length > 0
                ? 'Detaillierte Fachbereich-Analyse der ausgewählten Schüler'
                : 'Detaillierte Analyse nach Förderbedarf und starken Leistungen'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {/* Scrollbarer Bereich: feste maxHeight relativ zur Modalhöhe, overflowY auto und WebKit-optimiertes Scrolling */}
            <div
              className="h-full pr-4 space-y-6 kpi-scroll-area"
              style={{
                // maxHeight & overflow bleiben deklarativ hier, detaillierte Scrollbar-Stile per CSS weiter unten
                maxHeight: 'calc(90vh - 200px)',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                // Firefox fallback: dünne Scrollbar
                scrollbarWidth: 'thin'
              }}
              tabIndex={0}
              aria-label="KPI Detailansicht Scrollbereich"
            >
               {/* Wenn KEINE Schüler ausgewählt sind: Zeige Förderbedarf + Starke Leistungen */}
               {selectedStudents.length === 0 ? (
                 <>
                   {/* Kritische Schüler Sektion */}
                   {kpis.criticalStudentsList.length > 0 && (
                     <div>
                       <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-red-500">
                         <AlertCircle className="w-5 h-5 text-red-600" />
                         <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                           Förderbedarf ({kpis.criticalStudentsList.length})
                         </h3>
                       </div>
                       <div className="space-y-4">
                         {kpis.criticalStudentsList.map((item, index) => (
                           <motion.div
                             key={item.student.id}
                             initial={{ opacity: 0, x: -20 }}
                             animate={{ opacity: 1, x: 0 }}
                             transition={{ delay: index * 0.05 }}
                             className="p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200 dark:border-red-800 hover:shadow-lg transition-all"
                           >
                             <div className="flex items-center justify-between mb-3">
                               <div className="flex items-center gap-3">
                                 <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                   {item.student.name.charAt(0)}
                                 </div>
                                 <div>
                                   <p className="font-bold text-slate-900 dark:text-white text-lg">{item.student.name}</p>
                                   <p className="text-xs text-slate-500 dark:text-slate-400">
                                     {performances.filter(p => p.student_id === item.student.id).length} Beurteilungen
                                   </p>
                                 </div>
                               </div>
                               <Badge variant="destructive" className="text-xl font-bold px-4 py-2 shadow-md">
                                 Ø {item.average.toFixed(2)}
                               </Badge>
                             </div>
                             {item.weakFachbereiche.length > 0 && (
                               <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
                                 <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-3 flex items-center gap-1">
                                   <AlertCircle className="w-3 h-3" />
                                   Kritische Fachbereiche (ungenügend):
                                 </p>
                                 
                                 {/* Gruppiere nach Fächern */}
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
                                         📚 {subject}
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
                                             </Badge>
                                             
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
                         ))}
                       </div>
                     </div>
                   )}
                 </>
               ) : (
                 /* Wenn Schüler AUSGEWÄHLT sind: Zeige ihre Top/Bottom Fachbereiche */
                 <div className="space-y-4">
                   {kpis.criticalStudentsList.map((item, index) => {
                     const hasWeakAreas = item.weakFachbereiche.length > 0;
                     const colorScheme = hasWeakAreas
                       ? { bg: 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20', border: 'border-red-200 dark:border-red-800', avatar: 'from-red-500 to-orange-500', badge: 'destructive' }
                       : { bg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20', border: 'border-green-200 dark:border-green-800', avatar: 'from-green-500 to-emerald-500', badge: 'green' };
                     return (
                       <motion.div
                         key={item.student.id}
                         initial={{ opacity: 0, x: -20 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ delay: index * 0.05 }}
                         className={`p-4 bg-gradient-to-br ${colorScheme.bg} rounded-xl border ${colorScheme.border} hover:shadow-lg transition-all`}
                       >
                         <div className="flex items-center justify-between mb-3">
                           <div className="flex items-center gap-3">
                             <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colorScheme.avatar} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                               {item.student.name.charAt(0)}
                             </div>
                             <div>
                               <p className="font-bold text-slate-900 dark:text-white text-lg">{item.student.name}</p>
                               <p className="text-xs text-slate-500 dark:text-slate-400">
                                 {performances.filter(p => p.student_id === item.student.id).length} Beurteilungen
                               </p>
                             </div>
                           </div>
                           <Badge variant={colorScheme.badge} className={`text-xl font-bold px-4 py-2 shadow-md ${!hasWeakAreas ? 'bg-green-600' : ''}`}>
                             Ø {item.average.toFixed(2)}
                           </Badge>
                         </div>
                         {/* Wenn ungenügende Fachbereiche vorhanden */}
                         {hasWeakAreas && (
                           <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700 mb-3">
                             <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-3 flex items-center gap-1">
                               <AlertCircle className="w-3 h-3" />
                               Kritische Fachbereiche (ungenügend):
                             </p>
                             
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
                                     📚 {subject}
                                   </p>
                                   <div className="flex flex-wrap gap-2 ml-4">
                                     {fbs.map((fb, fbIndex) => (
                                       <Badge
                                         key={fbIndex}
                                         variant="outline"
                                         className="bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 font-medium px-3 py-1"
                                       >
                                         {fb.name}
                                         <span className="ml-2 font-bold text-red-700 dark:text-red-400">
                                           {fb.average}
                                         </span>
                                       </Badge>
                                     ))}
                                   </div>
                                 </div>
                               ));
                             })()}
                           </div>
                         )}
                         {/* Top/Bottom Fachbereiche - IMMER anzeigen wenn Daten vorhanden */}
                         {item.allFachbereiche.length > 0 && (
                           <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                             {/* Stärkste 3 */}
                             <div>
                               <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-1">
                                 <TrendingUp className="w-3 h-3" />
                                 Stärkste Bereiche (Top 3):
                               </p>
                               <div className="space-y-2">
                                 {item.allFachbereiche.slice(0, 3).map((fb, fbIndex) => (
                                   <div key={fbIndex} className="flex items-center justify-between text-xs bg-green-100 dark:bg-green-900/30 p-2 rounded">
                                     <div className="flex-1">
                                       <p className="font-medium text-green-900 dark:text-green-100">{fb.name}</p>
                                       <p className="text-green-700 dark:text-green-300 text-[10px]">
                                         {fb.subjects.join(', ')}
                                       </p>
                                     </div>
                                     <Badge variant="outline" className="ml-2 bg-green-200 dark:bg-green-900/50 border-green-400 text-green-900 dark:text-green-100 font-bold">
                                       {fb.average}
                                     </Badge>
                                   </div>
                                 ))}
                               </div>
                             </div>
                             {/* Ausbaufähige (Bottom 3) */}
                             {item.allFachbereiche.length > 3 && (
                               <div>
                                 <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                                   <TrendingDown className="w-3 h-3" />
                                   Ausbaufähig (Bottom 3):
                                 </p>
                                 <div className="space-y-2">
                                   {item.allFachbereiche.slice(-3).reverse().map((fb, fbIndex) => (
                                     <div key={fbIndex} className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                                       <div className="flex-1">
                                         <p className="font-medium text-amber-900 dark:text-amber-100">{fb.name}</p>
                                         <p className="text-amber-700 dark:text-amber-300 text-[10px]">
                                           {fb.subjects.join(', ')}
                                         </p>
                                       </div>
                                       <Badge variant="outline" className="ml-2 bg-amber-100 dark:bg-amber-900/30 border-amber-400 text-amber-900 dark:text-amber-100 font-bold">
                                         {fb.average}
                                       </Badge>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )}
                           </div>
                         )}
                       </motion.div>
                     );
                   })}
                 </div>
               )}
             </div>
           </div>
         </DialogContent>
       </Dialog>

      {/* Globale/komponentenlokale Scrollbar-CSS für dezente Darstellung in Light+Dark */}
      <style>{`
        /* Basis für die Scroll-Area */
        .kpi-scroll-area {
          -webkit-overflow-scrolling: touch;
        }

        /* WebKit (Chrome, Safari) */
        .kpi-scroll-area::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .kpi-scroll-area::-webkit-scrollbar-track {
          background: transparent;
        }
        .kpi-scroll-area::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.12); /* default (light mode) */
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        /* Firefox */
        .kpi-scroll-area {
          scrollbar-color: rgba(0,0,0,0.12) transparent;
          scrollbar-width: thin;
        }

        /* Dark mode overrides (Tailwind 'dark' class auf Root vorausgesetzt) */
        .dark .kpi-scroll-area::-webkit-scrollbar-thumb {
          background-color: rgba(255,255,255,0.06);
        }
        .dark .kpi-scroll-area {
          scrollbar-color: rgba(255,255,255,0.06) transparent;
        }

        /* Optional: sehr dezenter Hover-Effekt */
        .kpi-scroll-area::-webkit-scrollbar-thumb:hover {
          filter: brightness(0.9);
        }
      `}</style>
      {enlargedChart && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-white">
                {enlargedChart === 'left' && (isAllSubjects ? 'Notenschnitte der Fächer' : 'Leistungsverlauf')}
                {enlargedChart === 'fachbereich' && 'Fachbereiche'}
              </h3>
              <Button
                variant="ghost"
                onClick={() => setEnlargedChart(null)}
                className="text-white hover:bg-slate-700 text-xl px-4 py-2"
              >
                ✕
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              {enlargedChart === 'left' && renderChartContent(
                isAllSubjects ? 'bar' : 'line',
                isAllSubjects ? subjectData : lineData,
                [1, 6],
                true,
                false,
                isAllSubjects
              )}
              {enlargedChart === 'fachbereich' && renderChartContent(shouldUseBarChartForFachbereich ? 'bar' : 'radar', fachbereichData, [1, 6], true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(Leistungscharts);