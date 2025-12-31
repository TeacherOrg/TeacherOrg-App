import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { calculateWeightedGrade } from '@/components/grades/utils/calculateWeightedGrade';

// Color helper for grades
const getGradeColor = (grade) => {
  if (grade === null || grade === undefined) return 'text-slate-400';
  if (grade >= 5) return 'text-green-600 dark:text-green-400';
  if (grade >= 4.5) return 'text-green-500 dark:text-green-500';
  if (grade >= 4) return 'text-yellow-600 dark:text-yellow-400';
  if (grade >= 3.5) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

const getGradeBg = (grade) => {
  if (grade === null || grade === undefined) return 'bg-slate-100 dark:bg-slate-800';
  if (grade >= 5) return 'bg-green-100 dark:bg-green-900/30';
  if (grade >= 4.5) return 'bg-green-50 dark:bg-green-900/20';
  if (grade >= 4) return 'bg-yellow-50 dark:bg-yellow-900/20';
  if (grade >= 3.5) return 'bg-orange-50 dark:bg-orange-900/20';
  return 'bg-red-100 dark:bg-red-900/30';
};

const TrendIndicator = ({ trend }) => {
  if (trend === null || trend === undefined || Math.abs(trend) < 0.05) {
    return (
      <span className="flex items-center gap-1 text-slate-500">
        <Minus className="w-3 h-3" />
        <span className="text-xs">±0.0</span>
      </span>
    );
  }

  if (trend > 0) {
    return (
      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <TrendingUp className="w-3 h-3" />
        <span className="text-xs">+{trend.toFixed(1)}</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
      <TrendingDown className="w-3 h-3" />
      <span className="text-xs">{trend.toFixed(1)}</span>
    </span>
  );
};

const SortButton = ({ column, sortConfig, onSort }) => {
  const isActive = sortConfig.key === column;
  const Icon = isActive
    ? (sortConfig.direction === 'asc' ? ArrowUp : ArrowDown)
    : ArrowUpDown;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(column)}
      className={`h-6 px-1 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
    >
      <Icon className="w-3 h-3" />
    </Button>
  );
};

const SubjectAveragesTable = ({ performances, subjects, selectedStudents, onSubjectSelect }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'average', direction: 'desc' });

  // Detect single student mode
  const isSingleStudent = selectedStudents?.length === 1;
  const selectedStudentId = isSingleStudent ? selectedStudents[0] : null;

  const tableData = useMemo(() => {
    if (!performances?.length || !subjects?.length) return [];

    // Filter performances by selected student if single student mode
    const filteredPerformances = isSingleStudent
      ? performances.filter(p => p.student_id === selectedStudentId)
      : performances;

    const subjectStats = subjects.map(subject => {
      const subjectPerfs = filteredPerformances.filter(p => {
        const perfSubjectId = typeof p.subject === 'object' ? p.subject?.id : p.subject;
        return perfSubjectId === subject.id;
      });

      if (subjectPerfs.length === 0) {
        return {
          id: subject.id,
          name: subject.name,
          average: null,
          best: null,
          worst: null,
          trend: null,
          count: 0
        };
      }

      const grades = subjectPerfs.map(p => p.grade).filter(g => typeof g === 'number' && g > 0);
      const average = calculateWeightedGrade(subjectPerfs);
      const best = grades.length > 0 ? Math.max(...grades) : null;
      const worst = grades.length > 0 ? Math.min(...grades) : null;

      // Calculate trend (compare recent vs older performances)
      const sortedByDate = [...subjectPerfs]
        .filter(p => p.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      let trend = null;
      if (sortedByDate.length >= 2) {
        const midPoint = Math.floor(sortedByDate.length / 2);
        const recentPerfs = sortedByDate.slice(0, midPoint);
        const olderPerfs = sortedByDate.slice(midPoint);

        if (recentPerfs.length > 0 && olderPerfs.length > 0) {
          const recentAvg = calculateWeightedGrade(recentPerfs);
          const olderAvg = calculateWeightedGrade(olderPerfs);
          trend = recentAvg - olderAvg;
        }
      }

      return {
        id: subject.id,
        name: subject.name,
        average,
        best,
        worst,
        trend,
        count: subjectPerfs.length
      };
    }).filter(s => s.count > 0); // Only show subjects with data

    // Sort
    return [...subjectStats].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === null) return 1;
      if (bVal === null) return -1;

      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      return (aVal - bVal) * direction;
    });
  }, [performances, subjects, sortConfig, isSingleStudent, selectedStudentId]);

  const handleSort = (column) => {
    setSortConfig(prev => ({
      key: column,
      direction: prev.key === column && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  if (tableData.length === 0) {
    return null; // Don't render if no data
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-900 dark:text-white">
          Fachschnitte
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    Fach
                    <SortButton column="name" sortConfig={sortConfig} onSort={handleSort} />
                  </div>
                </th>
                <th className="text-center py-2 px-3 font-medium text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-center gap-1">
                    {isSingleStudent ? 'Ø Schüler' : 'Ø Klasse'}
                    <SortButton column="average" sortConfig={sortConfig} onSort={handleSort} />
                  </div>
                </th>
                <th className="text-center py-2 px-3 font-medium text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                  <div className="flex items-center justify-center gap-1">
                    Beste
                    <SortButton column="best" sortConfig={sortConfig} onSort={handleSort} />
                  </div>
                </th>
                <th className="text-center py-2 px-3 font-medium text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                  <div className="flex items-center justify-center gap-1">
                    Schlechteste
                    <SortButton column="worst" sortConfig={sortConfig} onSort={handleSort} />
                  </div>
                </th>
                <th className="text-center py-2 px-3 font-medium text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-center gap-1">
                    Trend
                    <SortButton column="trend" sortConfig={sortConfig} onSort={handleSort} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr
                  key={row.id}
                  onClick={() => onSubjectSelect && onSubjectSelect(row.id)}
                  className={`
                    border-b border-slate-100 dark:border-slate-700/50 last:border-0
                    hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer
                    transition-colors duration-150
                  `}
                >
                  <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                    {row.name}
                    <span className="text-xs text-slate-400 ml-2">({row.count})</span>
                  </td>
                  <td className={`py-2 px-3 text-center font-bold ${getGradeColor(row.average)}`}>
                    <span className={`inline-block px-2 py-0.5 rounded ${getGradeBg(row.average)}`}>
                      {row.average !== null ? row.average.toFixed(2) : '—'}
                    </span>
                  </td>
                  <td className={`py-2 px-3 text-center hidden sm:table-cell ${getGradeColor(row.best)}`}>
                    {row.best !== null ? row.best.toFixed(1) : '—'}
                  </td>
                  <td className={`py-2 px-3 text-center hidden sm:table-cell ${getGradeColor(row.worst)}`}>
                    {row.worst !== null ? row.worst.toFixed(1) : '—'}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex justify-center">
                      <TrendIndicator trend={row.trend} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(SubjectAveragesTable);
