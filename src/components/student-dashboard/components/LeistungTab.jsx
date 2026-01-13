import React, { useState, useMemo } from 'react';
import { TrendingUp, BarChart3, Target, ChevronDown } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { SpaceCard } from './SpaceBackground';
import { useLeistungsChartData } from '@/components/grades/hooks/useLeistungsChartData';

// Space theme colors
const SPACE_COLORS = {
  primary: '#a855f7',     // Purple
  secondary: '#3b82f6',   // Blue
  accent: '#ec4899',      // Pink
  success: '#22c55e',     // Green
  warning: '#f59e0b',     // Amber
  danger: '#ef4444',      // Red
  text: '#e2e8f0',        // Slate-200
  muted: '#94a3b8',       // Slate-400
  grid: '#334155',        // Slate-700
  background: '#0d1025',  // Space deep
};

// Grade color based on value (Swiss system 1-6)
const getGradeColor = (grade) => {
  if (!grade || grade === 0) return SPACE_COLORS.muted;
  if (grade >= 5.5) return '#22c55e'; // Green
  if (grade >= 5.0) return '#84cc16'; // Lime
  if (grade >= 4.5) return '#eab308'; // Yellow
  if (grade >= 4.0) return '#f59e0b'; // Amber
  if (grade >= 3.0) return '#f97316'; // Orange
  return '#ef4444'; // Red
};

/**
 * Clickable Radar Chart Label - ermöglicht Klick auf Fachbereich-Namen
 */
const ClickablePolarAngleTick = ({ x, y, cx, cy, payload, onClick }) => {
  // Calculate angle from center to determine text position
  const angle = Math.atan2(y - cy, x - cx) * (180 / Math.PI);
  const labelText = payload.value || '';
  const isLongLabel = labelText.length > 12;

  // Determine textAnchor based on angle
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
          onClick={() => onClick(payload.value)}
          style={{ cursor: 'pointer' }}
          textAnchor={textAnchor}
          className="hover:fill-purple-400 transition-colors"
          fill={SPACE_COLORS.text}
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
        onClick={() => onClick(payload.value)}
        style={{ cursor: 'pointer' }}
        textAnchor={textAnchor}
        className="hover:fill-purple-400 transition-colors"
        fill={SPACE_COLORS.text}
        fontSize={10}
      >
        {labelText}
      </text>
    </g>
  );
};

/**
 * Berechnet Trendlinie mit linearer Regression (Methode der kleinsten Quadrate)
 * @param {Array} data - Chart-Daten
 * @param {string} dataKey - Key für Y-Werte
 * @returns {Object|null} Trendlinie-Info oder null
 */
const calculateTrendLine = (data, dataKey) => {
  if (!data || data.length < 2) return null;

  const points = data.map((d, i) => ({ x: i, y: d[dataKey] })).filter(p => p.y != null);
  if (points.length < 2) return null;

  // Durchschnitte berechnen
  const xMean = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const yMean = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  // Steigung m berechnen
  let numerator = 0;
  let denominator = 0;
  points.forEach(p => {
    numerator += (p.x - xMean) * (p.y - yMean);
    denominator += (p.x - xMean) ** 2;
  });

  const m = denominator !== 0 ? numerator / denominator : 0;
  const b = yMean - m * xMean;

  return {
    slope: m,
    intercept: b,
    isImproving: m > 0.05,      // Schwelle für "Verbesserung"
    isDeclining: m < -0.05,     // Schwelle für "Verschlechterung"
    isStable: Math.abs(m) <= 0.05  // Stabil wenn Steigung nahe 0
  };
};

/**
 * LeistungTab - Performance charts for students
 * Shows grade progression and Fachbereich analysis with space theme styling
 */
export default function LeistungTab({
  student,
  performances = [],
  subjects = [],
  students = []
}) {
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedFachbereich, setSelectedFachbereich] = useState(null);

  // Use the existing chart data hook with student-specific filters
  const {
    lineData,
    subjectData,
    fachbereichData,
    fachbereichDetailData,
    weakestFachbereicheData
  } = useLeistungsChartData({
    performances,
    students,
    subjects,
    selectedSubject,
    selectedStudents: student ? [student.id] : [],
    showClassAverage: false, // Students don't see class average
    selectedFachbereich
  });

  // Get student name for chart keys
  const studentName = student?.name || 'Meine Noten';

  // Filter subjects that have data
  const subjectsWithData = useMemo(() => {
    const subjectIds = new Set(performances.map(p =>
      typeof p.subject === 'object' ? p.subject.id : p.subject
    ));
    return subjects.filter(s => subjectIds.has(s.id));
  }, [performances, subjects]);

  // Custom tooltip for space theme
  const SpaceTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="bg-slate-800/95 border border-purple-500/50 rounded-lg p-3 shadow-lg backdrop-blur-sm">
        <p className="text-purple-300 font-medium text-sm mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-slate-200 text-sm">
            <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }} />
            {entry.name}: <span className="font-bold">{entry.value?.toFixed(2) || '-'}</span>
          </p>
        ))}
      </div>
    );
  };

  // Handle fachbereich click for drill-down
  const handleFachbereichClick = (data) => {
    if (data?.name) {
      setSelectedFachbereich(prev => prev === data.name ? null : data.name);
    }
  };

  // Determine which chart to show on the left
  // 'kernfaecher' shows bar chart like 'all', individual subjects show line chart
  const showLineChart = selectedSubject !== 'all' && selectedSubject !== 'kernfaecher' && lineData.length > 0;
  const showBarChart = (selectedSubject === 'all' || selectedSubject === 'kernfaecher') && subjectData.length > 0;

  // Trendlinie berechnen (nur für Einzelfach-Ansicht)
  const trendLine = useMemo(() => {
    if (selectedSubject === 'all' || selectedSubject === 'kernfaecher') return null;
    return calculateTrendLine(lineData, studentName);
  }, [lineData, studentName, selectedSubject]);

  // LineData mit Trendwerten erweitern
  const lineDataWithTrend = useMemo(() => {
    if (!trendLine || lineData.length < 2) return lineData;
    return lineData.map((d, i) => ({
      ...d,
      trend: Math.round((trendLine.intercept + (trendLine.slope * i)) * 100) / 100
    }));
  }, [trendLine, lineData]);

  // Determine which chart to show on the right
  const showFachbereichDetail = selectedFachbereich && fachbereichDetailData.length > 0;
  const showRadarChart = !showFachbereichDetail && fachbereichData.length >= 3;
  const showFachbereichBar = !showFachbereichDetail && !showRadarChart && fachbereichData.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with Subject Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Meine Leistungen</h2>
            <p className="text-sm text-slate-400">Noten und Fachbereiche</p>
          </div>
        </div>

        {/* Subject Filter Dropdown */}
        <div className="relative">
          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setSelectedFachbereich(null);
            }}
            className="appearance-none bg-slate-800/80 border border-purple-500/30 rounded-lg px-4 py-2 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer min-w-[180px]"
          >
            <option value="all">Alle Fächer</option>
            {subjects.some(s => s.is_core_subject) && (
              <option value="kernfaecher">Kernfächer</option>
            )}
            {subjectsWithData.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 pointer-events-none" />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Chart - Performance Overview */}
        <SpaceCard className="min-h-[350px]">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            {selectedSubject === 'all' ? 'Fächerübersicht' : 'Leistungsverlauf'}
          </h3>

          {showBarChart ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={subjectData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SPACE_COLORS.primary} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={SPACE_COLORS.secondary} stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={SPACE_COLORS.grid} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: SPACE_COLORS.text, fontSize: 11 }}
                  axisLine={{ stroke: SPACE_COLORS.grid }}
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  domain={[1, 6]}
                  tick={{ fill: SPACE_COLORS.text, fontSize: 11 }}
                  axisLine={{ stroke: SPACE_COLORS.grid }}
                  tickLine={false}
                />
                <Tooltip content={<SpaceTooltip />} />
                <Bar
                  dataKey={studentName}
                  fill="url(#gradeGradient)"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(data) => {
                    // Klick auf Balken wechselt zu Liniendiagramm des Fachs
                    const subject = subjects.find(s => s.name === data.name);
                    if (subject) setSelectedSubject(subject.id);
                  }}
                  label={{
                    position: 'top',
                    fill: SPACE_COLORS.text,
                    fontSize: 11,
                    formatter: (v) => v?.toFixed(1) || ''
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : showLineChart ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={lineDataWithTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={SPACE_COLORS.primary} />
                    <stop offset="100%" stopColor={SPACE_COLORS.accent} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={SPACE_COLORS.grid} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: SPACE_COLORS.text, fontSize: 10 }}
                  axisLine={{ stroke: SPACE_COLORS.grid }}
                  tickLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  domain={[1, 6]}
                  ticks={[1, 2, 3, 4, 5, 6]}
                  tick={{ fill: SPACE_COLORS.text, fontSize: 11 }}
                  axisLine={{ stroke: SPACE_COLORS.grid }}
                  tickLine={false}
                />
                <Tooltip content={<SpaceTooltip />} />
                <Line
                  type="monotone"
                  dataKey={studentName}
                  stroke="url(#lineGradient)"
                  strokeWidth={3}
                  dot={{ fill: SPACE_COLORS.primary, strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 8, fill: SPACE_COLORS.accent }}
                />
                {/* Trendlinie */}
                {trendLine && (
                  <Line
                    type="linear"
                    dataKey="trend"
                    stroke={
                      trendLine.isImproving ? '#22c55e' :     // Grün - Verbesserung
                      trendLine.isDeclining ? '#ef4444' :      // Rot - Verschlechterung
                      '#94a3b8'                                 // Grau - Stabil
                    }
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    dot={false}
                    activeDot={false}
                    name="Trend"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              <p>Noch keine Leistungsdaten vorhanden</p>
            </div>
          )}
        </SpaceCard>

        {/* Right Chart - Fachbereiche Analysis */}
        <SpaceCard className="min-h-[350px]">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            {showFachbereichDetail ? (
              <span>
                {selectedFachbereich}
                <button
                  onClick={() => setSelectedFachbereich(null)}
                  className="ml-2 text-xs text-purple-400 hover:text-purple-300"
                >
                  (zurück)
                </button>
              </span>
            ) : (
              'Fachbereiche'
            )}
          </h3>

          {showFachbereichDetail ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={fachbereichDetailData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="fachbereichGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SPACE_COLORS.primary} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={SPACE_COLORS.secondary} stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={SPACE_COLORS.grid} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: SPACE_COLORS.text, fontSize: 10 }}
                  axisLine={{ stroke: SPACE_COLORS.grid }}
                  tickLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  domain={[1, 6]}
                  ticks={[1, 2, 3, 4, 5, 6]}
                  tick={{ fill: SPACE_COLORS.text, fontSize: 11 }}
                  axisLine={{ stroke: SPACE_COLORS.grid }}
                  tickLine={false}
                />
                <Tooltip content={<SpaceTooltip />} />
                <Bar
                  dataKey={studentName}
                  fill="url(#fachbereichGradient)"
                  radius={[4, 4, 0, 0]}
                  label={{
                    position: 'top',
                    fill: SPACE_COLORS.text,
                    fontSize: 11,
                    formatter: (v) => v?.toFixed(1) || ''
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : showRadarChart ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={fachbereichData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid stroke={SPACE_COLORS.grid} />
                <PolarAngleAxis
                  dataKey="name"
                  tick={<ClickablePolarAngleTick onClick={(name) => setSelectedFachbereich(prev => prev === name ? null : name)} />}
                />
                <PolarRadiusAxis
                  domain={[1, 6]}
                  tick={{ fill: SPACE_COLORS.muted, fontSize: 10 }}
                  tickCount={6}
                  allowDataOverflow={true}
                />
                <Tooltip content={<SpaceTooltip />} />
                <Radar
                  name={studentName}
                  dataKey={studentName}
                  stroke={SPACE_COLORS.primary}
                  fill={SPACE_COLORS.primary}
                  fillOpacity={0.4}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : showFachbereichBar ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={fachbereichData}
                layout="vertical"
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={SPACE_COLORS.grid} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[1, 6]}
                  ticks={[1, 2, 3, 4, 5, 6]}
                  reversed
                  tick={{ fill: SPACE_COLORS.text, fontSize: 11 }}
                  axisLine={{ stroke: SPACE_COLORS.grid }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      textAnchor="end"
                      dominantBaseline="middle"
                      onClick={() => setSelectedFachbereich(prev => prev === payload.value ? null : payload.value)}
                      style={{ cursor: 'pointer' }}
                      className="hover:fill-purple-400 transition-colors"
                      fill={SPACE_COLORS.text}
                      fontSize={11}
                    >
                      {payload.value?.length > 15 ? payload.value.substring(0, 12) + '...' : payload.value}
                    </text>
                  )}
                  axisLine={{ stroke: SPACE_COLORS.grid }}
                  tickLine={false}
                />
                <Tooltip content={<SpaceTooltip />} />
                <Bar
                  dataKey={studentName}
                  fill={SPACE_COLORS.secondary}
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(data) => setSelectedFachbereich(prev => prev === data.name ? null : data.name)}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              <p>Noch keine Fachbereichsdaten vorhanden</p>
            </div>
          )}
        </SpaceCard>
      </div>

      {/* Weakest Fachbereiche Section */}
      {weakestFachbereicheData.length > 0 && selectedSubject === 'all' && (
        <SpaceCard>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            Verbesserungspotenzial
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {weakestFachbereicheData.map((fb, index) => {
              const grade = fb[studentName];
              const color = getGradeColor(grade);
              return (
                <button
                  key={fb.name}
                  onClick={() => handleFachbereichClick(fb)}
                  className="p-3 rounded-lg border border-slate-700 hover:border-purple-500/50 transition-colors text-left group"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">#{index + 1}</span>
                    <span className="text-lg font-bold" style={{ color }}>
                      {grade?.toFixed(1) || '-'}
                    </span>
                  </div>
                  <p className="text-sm text-white truncate group-hover:text-purple-300 transition-colors">
                    {fb.name}
                  </p>
                  {fb.subjects?.length > 0 && (
                    <p className="text-xs text-slate-500 truncate">
                      {fb.subjects.slice(0, 2).join(', ')}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </SpaceCard>
      )}
    </div>
  );
}
