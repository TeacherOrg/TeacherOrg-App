import React, { useState, useMemo } from 'react';
import { useLeistungsChartData } from '../hooks/useLeistungsChartData';
import SubjectAveragesTable from './SubjectAveragesTable';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar, ReferenceArea, PolarRadiusAxis, ScatterChart, Scatter, Cell } from 'recharts';
import { BarChart3, ArrowLeft } from 'lucide-react';
import { calculateWeightedGrade } from '@/components/grades/utils/calculateWeightedGrade';
import { CLASS_AVG_COLOR } from '@/components/grades/utils/constants';

// 5-Tier Farbschema für Noten
const getScatterColor = (grade) => {
  if (grade >= 5.5) return '#22c55e'; // grün
  if (grade >= 5.0) return '#84cc16'; // lime
  if (grade >= 4.0) return '#eab308'; // gelb
  if (grade >= 3.0) return '#f97316'; // orange
  return '#ef4444'; // rot
};

// Custom Tooltip für Scatter Plot
const ScatterTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-2 shadow-lg text-white text-sm">
      <p className="font-bold" style={{ color: getScatterColor(data.grade) }}>{data.grade.toFixed(1)}</p>
      <p className="text-slate-300">{data.assessmentName}</p>
      <p className="text-slate-400 text-xs">{data.subject} • {data.date}</p>
      <p className="text-slate-500 text-xs">{data.studentName}</p>
    </div>
  );
};

// Custom Tooltip für Weakest Fachbereiche Chart
const WeakestTooltip = ({ active, payload, valueKey }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const grade = data[valueKey] || 0;
  return (
    <div className="bg-slate-800 dark:bg-slate-900 border border-slate-600 dark:border-slate-500 rounded-lg p-2 shadow-lg text-sm">
      <p className="text-slate-400 dark:text-slate-300 text-xs mb-1">{data.subjectName || data.subjects?.join(', ') || 'Fach'}</p>
      <p className="text-white font-medium">{data.name}</p>
      <p className="font-bold mt-1" style={{ color: getScatterColor(grade) }}>{grade.toFixed(2)}</p>
    </div>
  );
};

const ClickablePolarAngleTick = ({ x, y, cx, cy, payload, onFachbereichClick }) => {
  // Calculate angle from center to determine text position
  const angle = Math.atan2(y - cy, x - cx) * (180 / Math.PI);
  const labelText = payload.value || '';
  const isLongLabel = labelText.length > 12;

  // Determine textAnchor based on angle
  // Right side (roughly -60 to 60): start
  // Left side (roughly 120 to 180 or -180 to -120): end
  // Top/bottom: middle
  let textAnchor = 'middle';
  let dx = 0;
  let dy = 0;
  const isBottomArea = angle >= 45 && angle <= 135;

  if (angle > -45 && angle < 45) {
    // Right side
    textAnchor = 'start';
    dx = 6;
  } else if (angle > 135 || angle < -135) {
    // Left side
    textAnchor = 'end';
    dx = -6;
  } else if (isBottomArea) {
    // Bottom - stagger long labels more
    dy = isLongLabel ? 16 : 10;
  } else if (angle >= -135 && angle <= -45) {
    // Top
    dy = -4;
  }

  // For bottom labels, split long text into two lines
  if (isBottomArea && isLongLabel && labelText.includes(' ')) {
    const words = labelText.split(' ');
    const midpoint = Math.ceil(words.length / 2);
    const line1 = words.slice(0, midpoint).join(' ');
    const line2 = words.slice(midpoint).join(' ');

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          onClick={() => onFachbereichClick(payload.value)}
          style={{ cursor: 'pointer' }}
          textAnchor={textAnchor}
          className="hover:fill-white hover:font-bold"
          fill="hsl(var(--foreground))"
          fontSize={10}
        >
          <tspan x={dx} dy={8}>{line1}</tspan>
          <tspan x={dx} dy={11}>{line2}</tspan>
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={dx}
        y={dy}
        onClick={() => onFachbereichClick(payload.value)}
        style={{ cursor: 'pointer' }}
        textAnchor={textAnchor}
        className="hover:fill-white hover:font-bold"
        fill="hsl(var(--foreground))"
        fontSize={11}
      >
        {labelText}
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

// Trend line calculation using linear regression
const calculateTrendLine = (data, dataKey) => {
  if (!data || data.length < 2) return null;
  const points = data.map((d, i) => ({ x: i, y: d[dataKey] })).filter(p => p.y != null);
  if (points.length < 2) return null;

  const xMean = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const yMean = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  let numerator = 0, denominator = 0;
  points.forEach(p => {
    numerator += (p.x - xMean) * (p.y - yMean);
    denominator += (p.x - xMean) ** 2;
  });

  const m = denominator !== 0 ? numerator / denominator : 0;
  const b = yMean - m * xMean;

  return {
    slope: m,
    intercept: b,
    isImproving: m > 0.05,
    isDeclining: m < -0.05,
    isStable: Math.abs(m) <= 0.05
  };
};

const Leistungscharts = ({ performances, students, subjects, selectedStudents, showClassAverage, selectedSubject, setSelectedSubject, activeClassId, onDataChange }) => {
  const [enlargedChart, setEnlargedChart] = useState(null);
  const [selectedFachbereich, setSelectedFachbereich] = useState(null);
  const { lineData, subjectData, fachbereichData, fachbereichDetailData, weakestFachbereicheData, getStudentColor } = useLeistungsChartData({
    performances,
    students,
    subjects,
    selectedSubject,
    selectedStudents,
    showClassAverage,
    selectedFachbereich
  });

  // Trend lines for each selected student (only for line chart / single subject)
  const trendLines = useMemo(() => {
    if (selectedSubject === 'all' || selectedSubject === 'kernfaecher' || lineData.length < 2) {
      return {};
    }

    const trends = {};
    selectedStudents.forEach(studentId => {
      const student = students.find(s => s.id === studentId);
      if (student) {
        trends[student.name] = calculateTrendLine(lineData, student.name);
      }
    });

    // Also for class average if enabled
    if (showClassAverage) {
      trends['Klassenschnitt'] = calculateTrendLine(lineData, 'Klassenschnitt');
    }

    return trends;
  }, [lineData, selectedStudents, students, selectedSubject, showClassAverage]);

  // Add trend data to lineData
  const lineDataWithTrend = useMemo(() => {
    if (Object.keys(trendLines).length === 0) return lineData;

    return lineData.map((d, i) => {
      const withTrend = { ...d };
      Object.entries(trendLines).forEach(([name, trend]) => {
        if (trend) {
          withTrend[`${name}_trend`] = Math.round((trend.intercept + (trend.slope * i)) * 100) / 100;
        }
      });
      return withTrend;
    });
  }, [lineData, trendLines]);

  // Berechne gewichteten Durchschnitt für ausgewählte Schüler/Fächer
  const averageGrade = useMemo(() => {
    const relevantStudents = selectedStudents.length > 0
      ? students.filter(s => selectedStudents.includes(s.id))
      : students;
    const relevantPerformances = performances.filter(p => {
      const studentMatch = relevantStudents.some(s => s.id === p.student_id);
      let subjectMatch = false;
      if (selectedSubject === 'all') {
        subjectMatch = true;
      } else if (selectedSubject === 'kernfaecher') {
        const coreSubjectIds = subjects.filter(s => s.is_core_subject).map(s => s.id);
        const perfSubjectId = typeof p.subject === 'object' ? p.subject.id : p.subject;
        subjectMatch = coreSubjectIds.includes(perfSubjectId);
      } else {
        subjectMatch = p.subject === selectedSubject || (typeof p.subject === 'object' && p.subject.id === selectedSubject);
      }
      return studentMatch && subjectMatch;
    });
    if (relevantPerformances.length === 0) return 0;
    return parseFloat(calculateWeightedGrade(relevantPerformances).toFixed(2));
  }, [performances, students, subjects, selectedStudents, selectedSubject]);

  const isAllSubjects = selectedSubject === 'all' || selectedSubject === 'kernfaecher';
  const isKernfaecher = selectedSubject === 'kernfaecher';
  const shouldUseBarChartForFachbereich = fachbereichData.length < 3 && fachbereichData.length > 0;

  const canRenderChart = (data) => {
    if (!Array.isArray(data) || data.length === 0) return false;
    return data.every(item => item && typeof item === 'object' && item.name);
  };

  // Handler for fachbereich click - keeps enlarged view if open
  const handleFachbereichClick = (fachbereich) => {
    setSelectedFachbereich(fachbereich);
    // Don't close enlarged dialog - stay in enlarged view to show fachbereich detail
  };

  const renderChartContent = (chartType, data, yDomain, showReverse = false, isDetail = false, isSubjectChart = false) => {
    const isBarChart = chartType === 'bar';
    const isRadarChart = chartType === 'radar';
    const isLineChart = chartType === 'line';
    const isScatterChart = chartType === 'scatter';
    const isWeakestChart = chartType === 'weakest';

    // Scatter chart has different data structure (array without name property)
    if (isScatterChart) {
      if (!Array.isArray(data) || data.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 p-4">
            <BarChart3 className="w-10 h-10 mb-2" />
            <p className="font-semibold">Keine Daten verfügbar</p>
            <p className="text-sm">Für die aktuelle Auswahl gibt es keine Daten zum Anzeigen.</p>
          </div>
        );
      }
    } else if (!canRenderChart(data)) {
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

    // Determine which value key to use for weakest chart (student or class)
    const isSingleStudent = selectedStudents.length === 1;
    const singleStudent = isSingleStudent ? students.find(s => s.id === selectedStudents[0]) : null;
    const weakestValueKey = singleStudent?.name || 'Klassenschnitt';

    return (
      <ResponsiveContainer width="100%" height="100%">
        {isWeakestChart ? (
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              domain={[1, 6]}
              ticks={[1, 2, 3, 4, 5, 6]}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              width={100}
            />
            <Tooltip content={<WeakestTooltip valueKey={weakestValueKey} />} />
            <Bar
              dataKey={weakestValueKey}
              radius={[0, 4, 4, 0]}
              onClick={(barData) => {
                if (barData?.subjectId) {
                  setSelectedSubject(barData.subjectId);
                  setSelectedFachbereich(barData.name);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              {data.map((entry, index) => {
                const grade = entry[weakestValueKey] || 0;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={getScatterColor(grade)}
                  />
                );
              })}
            </Bar>
          </BarChart>
        ) : isScatterChart ? (
          <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="x"
              type="number"
              tick={false}
              stroke="hsl(var(--muted-foreground))"
              label={{ value: 'Prüfungen', position: 'insideBottom', offset: -5, fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <YAxis
              dataKey="y"
              type="number"
              domain={[1, 6]}
              ticks={[1, 2, 3, 4, 5, 6]}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<ScatterTooltip />} />
            <Scatter data={data} shape="circle">
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getScatterColor(entry.grade)}
                  opacity={0.7}
                  r={5}
                />
              ))}
            </Scatter>
          </ScatterChart>
        ) : isBarChart ? (
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
            <Legend
              formatter={(value) => (
                <span style={{ color: value === 'Klassenschnitt' ? CLASS_AVG_COLOR : undefined }}>
                  {value}
                </span>
              )}
            />
            {showClassAverage && (
              <Bar
                dataKey="Klassenschnitt"
                fill="url(#classAvgGradient)"
                opacity={0.8}
                onClick={(data) => {
                  if (isSubjectChart && data?.name) {
                    const subjectId = subjects.find(s => s.name === data.name)?.id;
                    if (subjectId) setSelectedSubject(subjectId);
                  }
                }}
                style={{ cursor: isSubjectChart ? 'pointer' : 'default' }}
              />
            )}
            {selectedStudents.map((studentId) => {
              const student = students.find(s => s && s.id === studentId);
              if (!student || !student.name) return null;
              return (
                <Bar
                  key={`bar-student-${student.id}`}
                  dataKey={student.name}
                  fill={`url(#studentGradient-${student.id})`}
                  opacity={0.8}
                  onClick={(data) => {
                    if (isSubjectChart && data?.name) {
                      const subjectId = subjects.find(s => s.name === data.name)?.id;
                      if (subjectId) setSelectedSubject(subjectId);
                    }
                  }}
                  style={{ cursor: isSubjectChart ? 'pointer' : 'default' }}
                />
              );
            })}
          </BarChart>
        ) : isRadarChart ? (
          <RadarChart data={data} margin={{ top: 20, right: 60, bottom: 30, left: 60 }} outerRadius="70%">
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
              tick={(props) => <ClickablePolarAngleTick {...props} onFachbereichClick={handleFachbereichClick} />}
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
            <Legend
              formatter={(value) => (
                <span style={{ color: value === 'Klassenschnitt' ? CLASS_AVG_COLOR : undefined }}>
                  {value}
                </span>
              )}
            />
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
            <Legend
              formatter={(value) => (
                <span style={{ color: value === 'Klassenschnitt' ? CLASS_AVG_COLOR : undefined }}>
                  {value}
                </span>
              )}
            />
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
            {/* Trend lines for each student/class average */}
            {Object.entries(trendLines).map(([name, trend]) => {
              if (!trend) return null;
              const trendColor = trend.isImproving ? '#22c55e' : trend.isDeclining ? '#ef4444' : '#94a3b8';
              return (
                <Line
                  key={`trend-${name}`}
                  type="linear"
                  dataKey={`${name}_trend`}
                  stroke={trendColor}
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  dot={false}
                  activeDot={false}
                  name={`Trend ${name}`}
                  legendType="none"
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
      {/* LEFT: Notenschnitte der Fächer (Bar) or Leistungsverlauf (Line) */}
      <Card className="bg-white dark:bg-slate-800 text-black dark:text-white border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            {isAllSubjects ? (
              isKernfaecher ? 'Notenschnitte der Kernfächer' : 'Notenschnitte der Fächer'
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setSelectedSubject('all'); setSelectedFachbereich(null); }} className="text-slate-400 hover:text-white p-1">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                Leistungsverlauf
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => setEnlargedChart('left')} className="text-slate-400 hover:text-white">
              Vergrößern
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div style={{ width: '100%', height: 320 }}>
            {renderChartContent(
              isAllSubjects ? 'bar' : 'line',
              isAllSubjects ? subjectData : lineDataWithTrend,
              [1, 6],
              true,
              false,
              isAllSubjects
            )}
          </div>
          {/* Notenschnittanzeige unter dem Diagramm */}
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            {selectedStudents.length === 0 ? (
              <div className="text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-0.5">
                  {isKernfaecher
                    ? 'Kernfachschnitt'
                    : (selectedSubject !== 'all'
                        ? `${subjects.find(s => s.id === selectedSubject)?.name || selectedSubject}-Schnitt`
                        : 'Klassenschnitt')}
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {averageGrade > 0 ? averageGrade.toFixed(2) : '—'}
                </p>
              </div>
            ) : (
              (() => {
                const allClassPerfs = performances.filter(p => {
                  if (selectedSubject === 'all') return true;
                  if (selectedSubject === 'kernfaecher') {
                    const coreSubjectIds = subjects.filter(s => s.is_core_subject).map(s => s.id);
                    const perfSubjectId = typeof p.subject === 'object' ? p.subject.id : p.subject;
                    return coreSubjectIds.includes(perfSubjectId);
                  }
                  return p.subject === selectedSubject || (typeof p.subject === 'object' && p.subject.id === selectedSubject);
                });
                const classAvg = allClassPerfs.length > 0 ? calculateWeightedGrade(allClassPerfs).toFixed(2) : null;
                const diff = classAvg && averageGrade > 0 ? (averageGrade - parseFloat(classAvg)).toFixed(2) : null;
                const studentColor = selectedStudents.length === 1 ? getStudentColor(0) : '#3b82f6';
                return (
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-center">
                      <p className="text-xs font-medium mb-0.5" style={{ color: studentColor }}>
                        {selectedStudents.length === 1 ? 'Schülerschnitt' : 'Ausgewählte Schüler'}
                      </p>
                      <p className="text-2xl font-bold" style={{ color: studentColor }}>
                        {averageGrade > 0 ? averageGrade.toFixed(2) : '—'}
                      </p>
                    </div>
                    {diff !== null && (
                      <div className="text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-0.5">Differenz</p>
                        <p className={`text-xl font-bold ${parseFloat(diff) > 0 ? 'text-green-600' : parseFloat(diff) < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                          {parseFloat(diff) > 0 ? '↑' : parseFloat(diff) < 0 ? '↓' : '='} {Math.abs(parseFloat(diff))}
                        </p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-0.5">
                        {isKernfaecher ? 'Kernfach-Ø' : 'Klassenschnitt'}
                      </p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{classAvg || '—'}</p>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </CardContent>
      </Card>

      {/* RIGHT: Fachbereiche Radar/Bar Chart or Weakest Fachbereiche */}
      <Card className="bg-white dark:bg-slate-800 text-black dark:text-white border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            {selectedFachbereich
              ? `Fachbereich: ${selectedFachbereich}`
              : (isAllSubjects ? 'Ausbaufähige Fachbereiche' : 'Fachbereiche')}
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
        <CardContent className="pt-0">
          {/* Chart - varies based on view */}
          <div style={{ width: '100%', height: 320 }}>
            {selectedFachbereich
              ? renderChartContent('bar', fachbereichDetailData, [1, 6], true, true)
              : isAllSubjects
                ? renderChartContent('weakest', weakestFachbereicheData, [1, 6], true)
                : renderChartContent(shouldUseBarChartForFachbereich ? 'bar' : 'radar', fachbereichData, [1, 6], true)}
          </div>
          {/* Compact average display */}
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-0.5">
                {isAllSubjects ? 'Ø Top 5 Schwächste' : 'Ø Fachbereiche'}
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {isAllSubjects
                  ? (weakestFachbereicheData.length > 0
                      ? (weakestFachbereicheData.reduce((sum, item) => sum + (item.Klassenschnitt || 0), 0) / weakestFachbereicheData.length).toFixed(2)
                      : '—')
                  : (fachbereichData.length > 0
                      ? (fachbereichData.reduce((sum, item) => sum + (item.Klassenschnitt || 0), 0) / fachbereichData.length).toFixed(2)
                      : '—')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fachschnitte-Tabelle - volle Breite unterhalb der Charts */}
      {isAllSubjects && (
        <div className="col-span-2">
          <SubjectAveragesTable
            performances={performances}
            subjects={subjects}
            selectedStudents={selectedStudents}
            onSubjectSelect={setSelectedSubject}
          />
        </div>
      )}

      {enlargedChart && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                {enlargedChart === 'fachbereich' && selectedFachbereich && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFachbereich(null)}
                    className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                )}
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {enlargedChart === 'left' && (isAllSubjects ? (isKernfaecher ? 'Notenschnitte der Kernfächer' : 'Notenschnitte der Fächer') : 'Leistungsverlauf')}
                  {enlargedChart === 'fachbereich' && (
                    selectedFachbereich
                      ? `Fachbereich: ${selectedFachbereich}`
                      : (isAllSubjects ? 'Ausbaufähige Fachbereiche' : 'Fachbereiche')
                  )}
                </h3>
              </div>
              <Button
                variant="ghost"
                onClick={() => { setEnlargedChart(null); setSelectedFachbereich(null); }}
                className="text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 text-xl px-4 py-2"
              >
                ✕
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              {enlargedChart === 'left' && renderChartContent(
                isAllSubjects ? 'bar' : 'line',
                isAllSubjects ? subjectData : lineDataWithTrend,
                [1, 6],
                true,
                false,
                isAllSubjects
              )}
              {enlargedChart === 'fachbereich' && (
                selectedFachbereich
                  ? renderChartContent('bar', fachbereichDetailData, [1, 6], true, true)
                  : renderChartContent(
                      isAllSubjects ? 'weakest' : (shouldUseBarChartForFachbereich ? 'bar' : 'radar'),
                      isAllSubjects ? weakestFachbereicheData : fachbereichData,
                      [1, 6],
                      true
                    )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(Leistungscharts);