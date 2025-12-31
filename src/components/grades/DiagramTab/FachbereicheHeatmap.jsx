import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Maximize2, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// 5-Tier Color helper for grades - Swiss grading system (1-6, 6 is best)
const getGradeColor = (grade) => {
  if (grade === null || grade === undefined) return '#94a3b8'; // slate-400
  if (grade >= 5.0) return '#22c55e';  // green-500
  if (grade >= 4.5) return '#4ade80';  // green-400
  if (grade >= 4.0) return '#facc15';  // yellow-400
  if (grade >= 3.5) return '#fb923c';  // orange-400
  return '#ef4444';                     // red-500
};

const getGradeBg = (grade) => {
  if (grade === null || grade === undefined) return 'bg-slate-100 dark:bg-slate-800';
  if (grade >= 5.0) return 'bg-green-500';
  if (grade >= 4.5) return 'bg-green-400';
  if (grade >= 4.0) return 'bg-yellow-400';
  if (grade >= 3.5) return 'bg-orange-400';
  return 'bg-red-500';
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-2 rounded shadow-lg text-sm">
        <p className="font-bold">{data.name}</p>
        <p>Note: {data.average?.toFixed(2) || '—'}</p>
        <p className="text-slate-300 dark:text-slate-600">{data.count} Bewertung{data.count !== 1 ? 'en' : ''}</p>
      </div>
    );
  }
  return null;
};

const SubjectBars = ({ subject, fachbereiche, onCellClick, isEnlarged = false }) => {
  const barHeight = isEnlarged ? 28 : 24;
  const chartHeight = fachbereiche.length * (barHeight + 4) + 20;

  // Prepare data for the bar chart
  const chartData = fachbereiche.map(fb => ({
    name: fb.name,
    average: fb.average,
    count: fb.count,
    subject: subject
  })).sort((a, b) => b.average - a.average);

  return (
    <div className="mb-4 last:mb-0">
      <h4
        className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        onClick={() => onCellClick && onCellClick(subject, null)}
      >
        {subject}
      </h4>
      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 50, left: 0, bottom: 0 }}
          >
            <XAxis type="number" domain={[0, 6]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={isEnlarged ? 100 : 80}
              tick={{
                fontSize: isEnlarged ? 12 : 11,
                fill: 'hsl(var(--muted-foreground))'
              }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar
              dataKey="average"
              radius={[0, 4, 4, 0]}
              onClick={(data) => onCellClick && onCellClick(data.subject, data.name)}
              className="cursor-pointer"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getGradeColor(entry.average)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const HorizontalBarsView = ({ data, onCellClick, isEnlarged = false }) => {
  const { matrix } = data;

  if (!matrix?.length) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
        <p>Keine Fachbereich-Daten verfügbar</p>
      </div>
    );
  }

  // Transform matrix to grouped structure
  const groupedData = matrix.map(row => ({
    subject: row.subject,
    fachbereiche: row.values
      .map((value, index) => ({
        name: data.fachbereiche[index],
        average: value?.average || null,
        count: value?.count || 0
      }))
      .filter(fb => fb.average !== null)
  })).filter(group => group.fachbereiche.length > 0);

  return (
    <div className="space-y-2">
      {groupedData.map((group, index) => (
        <motion.div
          key={group.subject}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <SubjectBars
            subject={group.subject}
            fachbereiche={group.fachbereiche}
            onCellClick={onCellClick}
            isEnlarged={isEnlarged}
          />
        </motion.div>
      ))}

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex-wrap">
        <span className="text-xs text-slate-500 dark:text-slate-400">Legende:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-xs text-slate-600 dark:text-slate-300">&lt;3.5</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-400" />
          <span className="text-xs text-slate-600 dark:text-slate-300">3.5-4</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-400" />
          <span className="text-xs text-slate-600 dark:text-slate-300">4-4.5</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-400" />
          <span className="text-xs text-slate-600 dark:text-slate-300">4.5-5</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-xs text-slate-600 dark:text-slate-300">&ge;5</span>
        </div>
      </div>
    </div>
  );
};

const FachbereicheHeatmap = ({ data, onFachbereichSelect, onSubjectSelect }) => {
  const [isEnlarged, setIsEnlarged] = useState(false);

  const handleCellClick = (subject, fachbereich) => {
    if (onSubjectSelect && subject) {
      onSubjectSelect(subject);
    }
    if (onFachbereichSelect && fachbereich) {
      onFachbereichSelect(fachbereich);
    }
  };

  const { subjects, fachbereiche } = data;
  const hasData = subjects?.length > 0 && fachbereiche?.length > 0;

  return (
    <>
      <Card className="bg-white dark:bg-slate-800 text-black dark:text-white border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            Fachbereiche nach Fach
            {hasData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEnlarged(true)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <Maximize2 className="w-4 h-4 mr-1" />
                Vergrößern
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-h-[200px]">
            {hasData ? (
              <HorizontalBarsView
                data={data}
                onCellClick={handleCellClick}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
                <div>
                  <p className="font-medium">Keine Fachbereich-Daten</p>
                  <p className="text-sm">Wählen Sie ein Fach oder fügen Sie Fachbereiche zu Bewertungen hinzu.</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enlarged Dialog */}
      <Dialog open={isEnlarged} onOpenChange={setIsEnlarged}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-between">
              Fachbereiche nach Fach
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEnlarged(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[80vh] p-4">
            <HorizontalBarsView
              data={data}
              onCellClick={handleCellClick}
              isEnlarged={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default React.memo(FachbereicheHeatmap);
