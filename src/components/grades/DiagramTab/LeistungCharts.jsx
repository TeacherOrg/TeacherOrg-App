import React, { useState } from 'react';
import { useLeistungsChartData } from '../hooks/useLeistungsChartData';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar, ReferenceArea, PolarRadiusAxis, Text } from 'recharts';
import { BarChart3, ArrowLeft } from 'lucide-react';

const CLASS_AVG_COLOR = '#10B981';
const ASSESSMENT_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c', '#d0ed57', '#ff9f40', '#ff6384', '#36a2eb', '#ffce56'];

const getAssessmentColor = (index) => ASSESSMENT_COLORS[index % ASSESSMENT_COLORS.length];

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

const ClickableXAxisTick = ({ x, y, payload, setSelectedFachbereich }) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text 
        onClick={() => setSelectedFachbereich(payload.value)}
        style={{ cursor: 'pointer' }}
        className="hover:fill-white hover:font-bold"
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

const Leistungscharts = ({ performances, students, selectedStudents, showClassAverage, selectedSubject, activeClassId, onDataChange }) => {
  const [enlargedChart, setEnlargedChart] = useState(null);
  const [selectedFachbereich, setSelectedFachbereich] = useState(null);
  const { lineData, fachbereichData, fachbereichDetailData, getStudentColor } = useLeistungsChartData({
    performances,
    students,
    selectedSubject,
    selectedStudents,
    showClassAverage,
    selectedFachbereich
  });

  const shouldUseBarChart = fachbereichData.length < 3 && fachbereichData.length > 0;

  const canRenderChart = (data) => {
    if (!Array.isArray(data) || data.length === 0) return false;
    return data.every(item => item && typeof item === 'object' && item.name);
  };

  const renderChartContent = (chartType, data, yDomain, showReverse = false, isDetail = false) => {
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
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              tick={(props) => isDetail ? <MultilineXAxisTick {...props} /> : <ClickableXAxisTick {...props} setSelectedFachbereich={setSelectedFachbereich} />}
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
                fill={CLASS_AVG_COLOR}
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
                  fill={getStudentColor(index)}
                  opacity={0.8}
                />
              );
            })}
          </BarChart>
        ) : isRadarChart ? (
          <RadarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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
                fill={CLASS_AVG_COLOR}
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
                  fill={getStudentColor(index)}
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
            {enlargedChart === 'verlauf' ? (
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
            Leistungsverlauf
            <Button variant="ghost" size="sm" onClick={() => setEnlargedChart('verlauf')} className="text-slate-400 hover:text-white">
              Vergrößern
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 300 }}>
            {renderChartContent('line', lineData, [1, 6], true)}
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
              : renderChartContent(shouldUseBarChart ? 'bar' : 'radar', fachbereichData, [1, 6], true)}
          </div>
        </CardContent>
      </Card>
      {enlargedChart && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-white">
                {enlargedChart === 'verlauf' && 'Leistungsverlauf'}
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
              {enlargedChart === 'verlauf' && renderChartContent('line', lineData, [1, 6], true)}
              {enlargedChart === 'fachbereich' && renderChartContent(shouldUseBarChart ? 'bar' : 'radar', fachbereichData, [1, 6], true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(Leistungscharts);