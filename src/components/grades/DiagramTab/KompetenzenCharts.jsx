import React, { useState } from 'react';
import { useKompetenzenChartData } from '../hooks/useKompetenzenChartData';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { BarChart3 } from 'lucide-react';

const KompetenzenCharts = ({ ueberfachlich, students, selectedStudents, showClassAverage, selectedCompetencyForProgression, activeClassId, onDataChange }) => {
  const [enlargedChart, setEnlargedChart] = useState(null);
  const { ueberfachlichData, ueberfachlichProgressionData, getStudentColor } = useKompetenzenChartData({
    ueberfachlich,
    students,
    selectedCompetencyForProgression,
    selectedStudents,
    showClassAverage
  });

  const shouldUseUeberfachlichBarChart = ueberfachlichData.length < 3 && ueberfachlichData.length > 0;

  const canRenderChart = (data) => {
    if (!Array.isArray(data) || data.length === 0) return false;
    return data.every(item => item && typeof item === 'object' && item.name);
  };

  const renderChartContent = (chartType, data, yDomain, showReverse = false) => {
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
      yAxisProps.ticks = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
      yAxisProps.reversed = false;
    }
    if (chartType === 'bar' && !showReverse) {
      yAxisProps.ticks = [1, 2, 3, 4, 5];
    }
    if (chartType === 'bar' && showReverse) {
      yAxisProps.ticks = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
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
              tick={{ fontSize: 12 }}
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
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            />
            {showClassAverage && (
              <Radar
                name="Klassenschnitt"
                dataKey="Klassenschnitt"
                stroke="#3b82f6" // Changed to blue
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
                stroke="#3b82f6" // Changed to blue
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
            Kompetenzverlauf
            <Button variant="ghost" size="sm" onClick={() => setEnlargedChart('kompetenzverlauf')} className="text-slate-400 hover:text-white">
              Vergrößern
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 300 }}>
            {renderChartContent('line', ueberfachlichProgressionData, [1, 5], false)}
          </div>
          {/* NEU: Trennung und Klassenschnitt-Anzeige für Konsistenz */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Kompetenz Klassenschnitt
              </p>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {ueberfachlichProgressionData.length > 0 ? (ueberfachlichProgressionData.reduce((sum, item) => sum + (item.Klassenschnitt || 0), 0) / ueberfachlichProgressionData.length).toFixed(2) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white dark:bg-slate-800 text-black dark:text-white border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Kompetenzübersicht
            <Button variant="ghost" size="sm" onClick={() => setEnlargedChart('ueberfachlich')} className="text-slate-400 hover:text-white">
              Vergrößern
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 300 }}>
            {renderChartContent(shouldUseUeberfachlichBarChart ? 'bar' : 'radar', ueberfachlichData, [1, 5], false)}
          </div>
          {/* NEU: Trennung und Klassenschnitt-Anzeige für Konsistenz */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Kompetenzübersicht Klassenschnitt
              </p>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {ueberfachlichData.length > 0 ? (ueberfachlichData.reduce((sum, item) => sum + (item.Klassenschnitt || 0), 0) / ueberfachlichData.length).toFixed(2) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      {enlargedChart && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-white">
                {enlargedChart === 'kompetenzverlauf' ? 'Kompetenzverlauf' : 'Kompetenzübersicht'}
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
              {enlargedChart === 'kompetenzverlauf' && renderChartContent('line', ueberfachlichProgressionData, [1, 5], false)}
              {enlargedChart === 'ueberfachlich' && renderChartContent(shouldUseUeberfachlichBarChart ? 'bar' : 'radar', ueberfachlichData, [1, 5], false)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(KompetenzenCharts);