import { useMemo } from 'react';
import { format } from "date-fns";
import { calculateWeightedGrade } from '@/components/grades/utils/calculateWeightedGrade';
import { getStudentColor } from '@/components/grades/utils/constants';

export const useLeistungsChartData = ({
  performances = [],
  students = [],
  subjects = [],
  selectedSubject = 'all',
  selectedStudents = [],
  showClassAverage = true,
  selectedFachbereich = null
}) => {
  const getSubjectId = (subject) => typeof subject === 'object' ? subject.id : subject;

  const getSubjectName = (subject, subjectId) => typeof subject === 'object' ? subject.name : subjects.find(s => s.id === subjectId)?.name || subjectId || 'Unknown';

  const getSubjectKey = (subject) => typeof subject === 'object' ? subject.id || '' : subject || '';

  // Leistungsverlauf (Line Chart) – bereits korrekt gewichtet
  const lineData = useMemo(() => {
    // ... (bleibt wie in deiner guten Version mit calculateWeightedGrade)
    // Du hattest hier schon die richtige Version mit calculateWeightedGrade(sameAssessments)
    // → belasse es so
    if (!Array.isArray(performances) || !Array.isArray(students)) return [];

    const validPerformances = performances.filter(p =>
      p && typeof p.date === 'string' && typeof p.assessment_name === 'string' && typeof p.grade === 'number'
    );
    const sortedPerformances = validPerformances
      .filter(p => {
        if (selectedSubject === 'all') return true;
        if (selectedSubject === 'kernfaecher') {
          const coreSubjectIds = subjects.filter(s => s.is_core_subject).map(s => s.id);
          return coreSubjectIds.includes(getSubjectId(p.subject));
        }
        return getSubjectId(p.subject) === selectedSubject;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sortedPerformances.length === 0) return [];

    const uniqueAssessments = [...new Map(
      sortedPerformances.map(item => [
        `${item.assessment_name || 'Unknown'}-${item.date || ''}-${getSubjectKey(item.subject)}`,
        item
      ])
    ).values()];

    return uniqueAssessments.map((p, index) => {
      const point = {
        name: p.assessment_name || 'Unknown Assessment',
        date: p.date ? new Date(p.date).toLocaleDateString('de-DE') : '',
        key: `assessment-${index}`
      };

      if (showClassAverage) {
        const sameAssessments = sortedPerformances.filter(perf =>
          perf.assessment_name === p.assessment_name && 
          perf.date === p.date && 
          getSubjectId(perf.subject) === getSubjectId(p.subject)
        );
        point['Klassenschnitt'] = sameAssessments.length > 0 ? calculateWeightedGrade(sameAssessments) : null;
      }

      selectedStudents.forEach(studentId => {
        const student = students.find(s => s && s.id === studentId);
        if (student) {
          const studentPerf = sortedPerformances.find(perf =>
            perf.student_id === studentId &&
            perf.assessment_name === p.assessment_name &&
            perf.date === p.date &&
            getSubjectId(perf.subject) === getSubjectId(p.subject)
          );
          point[student.name || 'Unnamed'] = studentPerf?.grade ?? null;
        }
      });

      return point;
    });
  }, [performances, students, selectedSubject, selectedStudents, showClassAverage]);

  // Fächerübersicht – gewichtet
  const subjectData = useMemo(() => {
    if (!Array.isArray(performances) || !Array.isArray(students)) return [];

    const filteredPerfs = performances.filter(p => {
      if (!p || !(typeof p.subject === 'string' || (typeof p.subject === 'object' && p.subject.id))) {
        return false;
      }
      if (selectedSubject === 'all') return true;
      if (selectedSubject === 'kernfaecher') {
        const coreSubjectIds = subjects.filter(s => s.is_core_subject).map(s => s.id);
        return coreSubjectIds.includes(getSubjectId(p.subject));
      }
      return getSubjectId(p.subject) === selectedSubject;
    });

    if (filteredPerfs.length === 0) return [];

    const subjectMap = {};

    filteredPerfs.forEach(perf => {
      const subjectId = getSubjectId(perf.subject);
      if (!subjectId) return;
      const subjectName = getSubjectName(perf.subject, subjectId);
      if (!subjectMap[subjectName]) subjectMap[subjectName] = { name: subjectName };

      if (showClassAverage) {
        const subjectPerfs = filteredPerfs.filter(p => getSubjectId(p.subject) === subjectId);
        subjectMap[subjectName]['Klassenschnitt'] = subjectPerfs.length > 0 ? calculateWeightedGrade(subjectPerfs) : null;
      }

      selectedStudents.forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;
        const studentPerfs = filteredPerfs.filter(p => 
          p.student_id === studentId && getSubjectId(p.subject) === subjectId
        );
        subjectMap[subjectName][student.name || 'Unnamed'] = studentPerfs.length > 0 ? calculateWeightedGrade(studentPerfs) : null;
      });
    });

    // Sort by subject sort_order (from subjects array)
    const subjectOrder = new Map(subjects.map((s, index) => [s.name, s.sort_order ?? index]));
    return Object.values(subjectMap).sort((a, b) => {
      const orderA = subjectOrder.get(a.name) ?? 999;
      const orderB = subjectOrder.get(b.name) ?? 999;
      return orderA - orderB;
    });
  }, [performances, students, subjects, selectedSubject, selectedStudents, showClassAverage]);

  // Fachbereiche – DIE WICHTIGE KORREKTE VERSION
  const fachbereichData = useMemo(() => {
    if (!Array.isArray(performances) || !Array.isArray(students)) return [];

    const filteredPerfs = performances.filter(p => {
      if (!p || !(typeof p.subject === 'string' || (typeof p.subject === 'object' && p.subject.id))) {
        return false;
      }
      if (selectedSubject === 'all') return true;
      if (selectedSubject === 'kernfaecher') {
        const coreSubjectIds = subjects.filter(s => s.is_core_subject).map(s => s.id);
        return coreSubjectIds.includes(getSubjectId(p.subject));
      }
      return getSubjectId(p.subject) === selectedSubject;
    });

    if (filteredPerfs.length === 0) return [];

    const fachbereichToPerfs = {};
    const fachbereichToStudentPerfs = {};
    const fachbereichToSubjects = {}; // Track which subjects contain each fachbereich

    filteredPerfs.forEach(perf => {
      if (Array.isArray(perf.fachbereiche) && perf.fachbereiche.length > 0) {
        const weightPerFachbereich = (perf.weight ?? 1) / perf.fachbereiche.length;
        const subjectId = getSubjectId(perf.subject);
        const subjectName = getSubjectName(perf.subject, subjectId);

        perf.fachbereiche.forEach(fb => {
          if (typeof fb !== 'string') return;

          if (!fachbereichToPerfs[fb]) {
            fachbereichToPerfs[fb] = [];
            fachbereichToStudentPerfs[fb] = {};
            fachbereichToSubjects[fb] = {};
          }

          // Track subject occurrences for this fachbereich
          if (!fachbereichToSubjects[fb][subjectId]) {
            fachbereichToSubjects[fb][subjectId] = { id: subjectId, name: subjectName, count: 0 };
          }
          fachbereichToSubjects[fb][subjectId].count++;

          // Push ein "geteiltes" Performance-Objekt
          fachbereichToPerfs[fb].push({
            ...perf,
            weight: weightPerFachbereich  // ← entscheidend!
          });

          if (selectedStudents.includes(perf.student_id)) {
            if (!fachbereichToStudentPerfs[fb][perf.student_id]) {
              fachbereichToStudentPerfs[fb][perf.student_id] = [];
            }
            fachbereichToStudentPerfs[fb][perf.student_id].push({
              ...perf,
              weight: weightPerFachbereich
            });
          }
        });
      }
    });

    return Object.entries(fachbereichToPerfs).map(([fb, perfs]) => {
      // Find the most common subject for this fachbereich
      const subjectEntries = Object.values(fachbereichToSubjects[fb] || {});
      const primarySubject = subjectEntries.sort((a, b) => b.count - a.count)[0] || null;

      const entry = {
        name: fb,
        subjectId: primarySubject?.id || null,
        subjectName: primarySubject?.name || null,
        subjects: subjectEntries.map(s => s.name).sort()
      };

      if (showClassAverage && perfs.length > 0) {
        entry['Klassenschnitt'] = calculateWeightedGrade(perfs);
      }

      selectedStudents.forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        if (student) {
          const studentPerfs = fachbereichToStudentPerfs[fb][studentId] || [];
          entry[student.name || 'Unnamed'] = studentPerfs.length > 0 ? calculateWeightedGrade(studentPerfs) : null;
        }
      });

      return entry;
    });
  }, [performances, students, subjects, selectedSubject, selectedStudents, showClassAverage]);

  // Fachbereich-Detail (Bar Chart bei Klick)
  const fachbereichDetailData = useMemo(() => {
    if (!selectedFachbereich) return [];

    const filteredPerfs = performances.filter(p =>
      p && (typeof p.subject === 'string' || (typeof p.subject === 'object' && p.subject.id)) &&
      (selectedSubject === 'all' || getSubjectId(p.subject) === selectedSubject) &&
      Array.isArray(p.fachbereiche) && p.fachbereiche.includes(selectedFachbereich)
    );

    if (filteredPerfs.length === 0) return [];

    const assessmentMap = {};

    filteredPerfs.forEach(perf => {
      const key = `${perf.assessment_name || 'Unknown'}-${perf.date || ''}`;
      if (!assessmentMap[key]) {
        assessmentMap[key] = {
          name: `${perf.assessment_name || 'Unknown'}\n${perf.date ? format(new Date(perf.date), 'dd.MM.yy') : 'Unbekannt'}`,
        };
      }

      if (showClassAverage) {
        const sameAssessments = filteredPerfs.filter(p =>
          p.assessment_name === perf.assessment_name && p.date === perf.date
        );
        assessmentMap[key]['Klassenschnitt'] = sameAssessments.length > 0 ? calculateWeightedGrade(sameAssessments) : null;
      }

      selectedStudents.forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        if (student) {
          const studentPerf = filteredPerfs.find(p =>
            p.student_id === studentId &&
            p.assessment_name === perf.assessment_name &&
            p.date === perf.date
          );
          assessmentMap[key][student.name || 'Unnamed'] = studentPerf?.grade ?? null;
        }
      });
    });

    return Object.values(assessmentMap);
  }, [performances, students, selectedSubject, selectedStudents, showClassAverage, selectedFachbereich]);

  // NEW: Heatmap data - Fachbereiche grouped by subject (not merged)
  const fachbereichHeatmapData = useMemo(() => {
    if (!Array.isArray(performances) || !Array.isArray(students) || !Array.isArray(subjects)) {
      return { subjects: [], fachbereiche: [], matrix: [], rawData: {} };
    }

    // Only for "all subjects" view - otherwise use regular fachbereichData
    if (selectedSubject !== 'all') {
      return { subjects: [], fachbereiche: [], matrix: [], rawData: {} };
    }

    const filteredPerfs = performances.filter(p =>
      p && (typeof p.subject === 'string' || (typeof p.subject === 'object' && p.subject.id)) &&
      Array.isArray(p.fachbereiche) && p.fachbereiche.length > 0
    );

    if (filteredPerfs.length === 0) {
      return { subjects: [], fachbereiche: [], matrix: [], rawData: {} };
    }

    // Group performances by subject and fachbereich
    const dataBySubjectAndFachbereich = {};
    const allFachbereiche = new Set();
    const subjectsWithData = new Set();

    filteredPerfs.forEach(perf => {
      const subjectId = getSubjectId(perf.subject);
      const subjectName = getSubjectName(perf.subject, subjectId);

      if (!dataBySubjectAndFachbereich[subjectName]) {
        dataBySubjectAndFachbereich[subjectName] = {};
      }
      subjectsWithData.add(subjectName);

      const weightPerFachbereich = (perf.weight ?? 1) / perf.fachbereiche.length;

      perf.fachbereiche.forEach(fb => {
        if (typeof fb !== 'string') return;
        allFachbereiche.add(fb);

        if (!dataBySubjectAndFachbereich[subjectName][fb]) {
          dataBySubjectAndFachbereich[subjectName][fb] = [];
        }

        dataBySubjectAndFachbereich[subjectName][fb].push({
          ...perf,
          weight: weightPerFachbereich
        });
      });
    });

    const sortedSubjects = Array.from(subjectsWithData).sort();
    const sortedFachbereiche = Array.from(allFachbereiche).sort();

    // Build matrix for heatmap
    const matrix = sortedSubjects.map(subjectName => {
      return {
        subject: subjectName,
        values: sortedFachbereiche.map(fb => {
          const perfs = dataBySubjectAndFachbereich[subjectName]?.[fb] || [];
          if (perfs.length === 0) return null;

          // Calculate weighted average for this subject-fachbereich combination
          const avg = calculateWeightedGrade(perfs);
          return {
            fachbereich: fb,
            average: avg,
            count: perfs.length
          };
        })
      };
    });

    return {
      subjects: sortedSubjects,
      fachbereiche: sortedFachbereiche,
      matrix,
      rawData: dataBySubjectAndFachbereich
    };
  }, [performances, students, subjects, selectedSubject]);

  // NEW: Scatter plot data - all individual grades as points
  const scatterData = useMemo(() => {
    if (!Array.isArray(performances)) return [];

    // Filter performances - if single student selected, only their grades
    const isSingleStudent = selectedStudents.length === 1;
    let filteredPerfs = performances.filter(p =>
      p && typeof p.grade === 'number' && typeof p.date === 'string'
    );

    if (isSingleStudent) {
      filteredPerfs = filteredPerfs.filter(p => p.student_id === selectedStudents[0]);
    }

    if (filteredPerfs.length === 0) return [];

    // Sort by date
    const sortedPerfs = [...filteredPerfs].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Create scatter points
    return sortedPerfs.map((perf, index) => {
      const subjectId = getSubjectId(perf.subject);
      const subjectName = getSubjectName(perf.subject, subjectId);
      const student = students.find(s => s.id === perf.student_id);

      return {
        x: index,
        y: perf.grade,
        grade: perf.grade,
        assessmentName: perf.assessment_name || 'Unbekannt',
        date: perf.date ? format(new Date(perf.date), 'dd.MM.yyyy') : '',
        subject: subjectName,
        studentName: student?.name || 'Unbekannt',
        studentId: perf.student_id
      };
    });
  }, [performances, students, subjects, selectedStudents]);

  // NEW: Combined chart data - Fachbereiche grouped by subject with subject averages
  const combinedChartData = useMemo(() => {
    if (!Array.isArray(performances) || !Array.isArray(students) || !Array.isArray(subjects)) {
      return { data: [], subjectGroups: [] };
    }

    // Only for "all subjects" view
    if (selectedSubject !== 'all') {
      return { data: [], subjectGroups: [] };
    }

    const filteredPerfs = performances.filter(p =>
      p && (typeof p.subject === 'string' || (typeof p.subject === 'object' && p.subject.id)) &&
      Array.isArray(p.fachbereiche) && p.fachbereiche.length > 0
    );

    if (filteredPerfs.length === 0) {
      return { data: [], subjectGroups: [] };
    }

    // Calculate subject averages first
    const subjectAvgMap = {};
    const subjectPerfsMap = {};

    filteredPerfs.forEach(perf => {
      const subjectId = getSubjectId(perf.subject);
      const subjectName = getSubjectName(perf.subject, subjectId);

      if (!subjectPerfsMap[subjectName]) {
        subjectPerfsMap[subjectName] = [];
      }
      subjectPerfsMap[subjectName].push(perf);
    });

    Object.entries(subjectPerfsMap).forEach(([subjectName, perfs]) => {
      subjectAvgMap[subjectName] = calculateWeightedGrade(perfs);
    });

    // Group Fachbereiche by subject
    const dataBySubjectAndFachbereich = {};
    const subjectOrder = [];

    filteredPerfs.forEach(perf => {
      const subjectId = getSubjectId(perf.subject);
      const subjectName = getSubjectName(perf.subject, subjectId);

      if (!dataBySubjectAndFachbereich[subjectName]) {
        dataBySubjectAndFachbereich[subjectName] = {};
        subjectOrder.push(subjectName);
      }

      const weightPerFachbereich = (perf.weight ?? 1) / perf.fachbereiche.length;

      perf.fachbereiche.forEach(fb => {
        if (typeof fb !== 'string') return;

        if (!dataBySubjectAndFachbereich[subjectName][fb]) {
          dataBySubjectAndFachbereich[subjectName][fb] = {
            all: [],
            byStudent: {}
          };
        }

        dataBySubjectAndFachbereich[subjectName][fb].all.push({
          ...perf,
          weight: weightPerFachbereich
        });

        // Track student-specific data
        if (selectedStudents.includes(perf.student_id)) {
          if (!dataBySubjectAndFachbereich[subjectName][fb].byStudent[perf.student_id]) {
            dataBySubjectAndFachbereich[subjectName][fb].byStudent[perf.student_id] = [];
          }
          dataBySubjectAndFachbereich[subjectName][fb].byStudent[perf.student_id].push({
            ...perf,
            weight: weightPerFachbereich
          });
        }
      });
    });

    // Build flat data array for chart
    const data = [];
    const subjectGroups = [];
    let currentIndex = 0;

    // Sort subjects alphabetically
    const sortedSubjects = [...new Set(subjectOrder)].sort();

    sortedSubjects.forEach(subjectName => {
      const fachbereiche = dataBySubjectAndFachbereich[subjectName];
      const sortedFbs = Object.keys(fachbereiche).sort();

      const groupStart = currentIndex;

      sortedFbs.forEach(fb => {
        const fbData = fachbereiche[fb];
        const entry = {
          name: fb,
          fullName: `${subjectName} - ${fb}`,
          subject: subjectName,
          subjectAvg: subjectAvgMap[subjectName],
          index: currentIndex
        };

        // Class average for this Fachbereich
        if (showClassAverage && fbData.all.length > 0) {
          entry['Klassenschnitt'] = calculateWeightedGrade(fbData.all);
        }

        // Student-specific values
        selectedStudents.forEach(studentId => {
          const student = students.find(s => s.id === studentId);
          if (student) {
            const studentPerfs = fbData.byStudent[studentId] || [];
            entry[student.name || 'Unnamed'] = studentPerfs.length > 0
              ? calculateWeightedGrade(studentPerfs)
              : null;
          }
        });

        data.push(entry);
        currentIndex++;
      });

      subjectGroups.push({
        name: subjectName,
        start: groupStart,
        end: currentIndex - 1,
        avg: subjectAvgMap[subjectName],
        count: sortedFbs.length
      });
    });

    return { data, subjectGroups };
  }, [performances, students, subjects, selectedSubject, selectedStudents, showClassAverage]);

  // NEW: Weakest Fachbereiche - top 5 lowest scoring for dashboard overview
  const weakestFachbereicheData = useMemo(() => {
    if (!fachbereichData || fachbereichData.length === 0) return [];

    // Determine which key to use for sorting (student or class)
    const isSingleStudent = selectedStudents.length === 1;
    const student = isSingleStudent ? students.find(s => s.id === selectedStudents[0]) : null;
    const sortKey = student?.name || 'Klassenschnitt';

    // Filter out entries without valid data and sort ascending (lowest = weakest)
    const sorted = [...fachbereichData]
      .filter(fb => fb[sortKey] !== null && fb[sortKey] !== undefined)
      .sort((a, b) => (a[sortKey] || 6) - (b[sortKey] || 6));

    return sorted.slice(0, 5);
  }, [fachbereichData, selectedStudents, students]);

  return { lineData, subjectData, fachbereichData, fachbereichDetailData, fachbereichHeatmapData, combinedChartData, scatterData, weakestFachbereicheData, getStudentColor };
};