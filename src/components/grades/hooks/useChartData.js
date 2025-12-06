import { useMemo } from 'react';
import { format } from "date-fns";

export const useLeistungsChartData = ({
  performances = [],
  students = [],
  subjects = [],
  selectedSubject = 'all',
  selectedStudents = [],
  showClassAverage = true,
  selectedFachbereich = null
}) => {
  const lineData = useMemo(() => {
    if (!Array.isArray(performances) || !Array.isArray(students)) return [];

    const validPerformances = performances.filter(p =>
      p && typeof p.date === 'string' && typeof p.assessment_name === 'string' && typeof p.grade === 'number'
    );
    const sortedPerformances = validPerformances
      .filter(p => selectedSubject === 'all' || p.subject === selectedSubject)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sortedPerformances.length === 0) return [];

    const uniqueAssessments = [...new Map(
      sortedPerformances.map(item => [
        `${item.assessment_name || 'Unknown'}-${item.date || ''}-${item.subject || ''}`,
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
          perf.assessment_name === p.assessment_name && perf.date === p.date && perf.subject === p.subject
        );
        const validGrades = sameAssessments
          .map(perf => perf.grade)
          .filter(g => typeof g === 'number' && g > 0);
        if (validGrades.length > 0) {
          const avgGrade = validGrades.reduce((sum, perf) => sum + perf, 0) / validGrades.length;
          point['Klassenschnitt'] = parseFloat(avgGrade.toFixed(2));
        } else {
          point['Klassenschnitt'] = null;
        }
      }

      selectedStudents.forEach(studentId => {
        const student = students.find(s => s && s.id === studentId);
        if (student) {
          const studentPerf = sortedPerformances.find(perf =>
            perf.student_id === studentId &&
            perf.assessment_name === p.assessment_name &&
            perf.date === p.date &&
            perf.subject === p.subject
          );
          point[student.name || 'Unnamed'] = studentPerf && typeof studentPerf.grade === 'number' ? studentPerf.grade : null;
        }
      });

      return point;
    });
  }, [performances, students, selectedSubject, selectedStudents, showClassAverage]);

  const subjectData = useMemo(() => {
    if (!Array.isArray(performances) || !Array.isArray(students) || !Array.isArray(subjects)) return [];

    const subjectMap = {};
    const filteredPerfs = performances.filter(p =>
      p && typeof p.subject === 'string'
    );

    if (filteredPerfs.length === 0) return [];

    filteredPerfs.forEach(perf => {
      const subjectId = perf.subject;
      if (!subjectId || typeof subjectId !== 'string') return;
      const subjectName = subjects.find(s => s.id === subjectId)?.name || subjectId;
      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = { name: subjectName };
      }
      if (showClassAverage) {
        const allGrades = filteredPerfs
          .filter(p => p.subject === subjectId)
          .map(p => p.grade)
          .filter(g => typeof g === 'number' && g > 0);
        if (allGrades.length > 0) {
          const avgGrade = allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length;
          subjectMap[subjectName]['Klassenschnitt'] = parseFloat(avgGrade.toFixed(2));
        } else {
          subjectMap[subjectName]['Klassenschnitt'] = null;
        }
      }
      selectedStudents.forEach((studentId) => {
        const student = students.find(s => s && s.id === studentId);
        if (student) {
          const studentPerfsForSubject = filteredPerfs.filter(p =>
            p.student_id === studentId && p.subject === subjectId
          );
          if (studentPerfsForSubject.length > 0) {
            const grades = studentPerfsForSubject
              .map(p => p.grade)
              .filter(g => typeof g === 'number' && g > 0);
            if (grades.length > 0) {
              const avgGrade = grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
              subjectMap[subjectName][student.name || 'Unnamed'] = parseFloat(avgGrade.toFixed(2));
            } else {
              subjectMap[subjectName][student.name || 'Unnamed'] = null;
            }
          } else {
            subjectMap[subjectName][student.name || 'Unnamed'] = null;
          }
        }
      });
    });

    return Object.values(subjectMap);
  }, [performances, students, subjects, selectedStudents, showClassAverage]);

  const fachbereichData = useMemo(() => {
    if (!Array.isArray(performances) || !Array.isArray(students)) return [];

    const fachbereichMap = {};
    const filteredPerfs = performances.filter(p =>
      p && typeof p.subject === 'string' && (selectedSubject === 'all' || p.subject === selectedSubject)
    );

    if (filteredPerfs.length === 0) return [];

    filteredPerfs.forEach(perf => {
      if (Array.isArray(perf.fachbereiche)) {
        perf.fachbereiche.forEach(fachbereich => {
          if (!fachbereich || typeof fachbereich !== 'string') return;
          if (!fachbereichMap[fachbereich]) {
            fachbereichMap[fachbereich] = { name: fachbereich };
          }
          if (showClassAverage) {
            const allGrades = filteredPerfs
              .filter(p => Array.isArray(p.fachbereiche) && p.fachbereiche.includes(fachbereich))
              .map(p => p.grade)
              .filter(g => typeof g === 'number' && g > 0);
            if (allGrades.length > 0) {
              const avgGrade = allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length;
              fachbereichMap[fachbereich]['Klassenschnitt'] = parseFloat(avgGrade.toFixed(2));
            } else {
              fachbereichMap[fachbereich]['Klassenschnitt'] = null;
            }
          }
          selectedStudents.forEach((studentId) => {
            const student = students.find(s => s && s.id === studentId);
            if (student) {
              const studentPerfsForFachbereich = filteredPerfs.filter(p =>
                p.student_id === studentId && Array.isArray(p.fachbereiche) && p.fachbereiche.includes(fachbereich)
              );
              if (studentPerfsForFachbereich.length > 0) {
                const grades = studentPerfsForFachbereich
                  .map(p => p.grade)
                  .filter(g => typeof g === 'number' && g > 0);
                if (grades.length > 0) {
                  const avgGrade = grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
                  fachbereichMap[fachbereich][student.name || 'Unnamed'] = parseFloat(avgGrade.toFixed(2));
                } else {
                  fachbereichMap[fachbereich][student.name || 'Unnamed'] = null;
                }
              } else {
                fachbereichMap[fachbereich][student.name || 'Unnamed'] = null;
              }
            }
          });
        });
      }
    });

    return Object.values(fachbereichMap);
  }, [performances, students, selectedSubject, selectedStudents, showClassAverage]);

  const fachbereichDetailData = useMemo(() => {
    if (!selectedFachbereich) return [];
    if (!Array.isArray(performances) || !Array.isArray(students)) return [];

    const filteredPerfs = performances.filter(p =>
      p && typeof p.subject === 'string' && (selectedSubject === 'all' || p.subject === selectedSubject) &&
      Array.isArray(p.fachbereiche) && p.fachbereiche.includes(selectedFachbereich)
    );

    if (filteredPerfs.length === 0) return [];

    const assessmentMap = {};
    filteredPerfs.forEach(perf => {
      const key = `${perf.assessment_name || 'Unknown'}-${perf.date || ''}`;
      if (!assessmentMap[key]) {
        assessmentMap[key] = { 
          name: `${perf.assessment_name || 'Unknown'}\n${perf.date ? format(new Date(perf.date), 'dd.MM.yy') : 'Unbekannt'}`,
          assessment_name: perf.assessment_name || 'Unknown',
          date: perf.date || ''
        };
      }
      if (showClassAverage) {
        const allGrades = filteredPerfs
          .filter(p => p.assessment_name === perf.assessment_name && p.date === perf.date)
          .map(p => p.grade)
          .filter(g => typeof g === 'number' && g > 0);
        if (allGrades.length > 0) {
          const avgGrade = allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length;
          assessmentMap[key]['Klassenschnitt'] = parseFloat(avgGrade.toFixed(2));
        } else {
          assessmentMap[key]['Klassenschnitt'] = null;
        }
      }
      selectedStudents.forEach((studentId) => {
        const student = students.find(s => s && s.id === studentId);
        if (student) {
          const studentPerf = filteredPerfs.find(p =>
            p.student_id === studentId && p.assessment_name === perf.assessment_name && p.date === perf.date
          );
          assessmentMap[key][student.name || 'Unnamed'] = studentPerf && typeof studentPerf.grade === 'number' ? studentPerf.grade : null;
        }
      });
    });

    return Object.values(assessmentMap);
  }, [performances, students, selectedSubject, selectedStudents, showClassAverage, selectedFachbereich]);

  const getStudentColor = (index) => {
    const colors = ['#10B981', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c']; // Changed first color to green
    return colors[index % colors.length];
  };

  return { lineData, subjectData, fachbereichData, fachbereichDetailData, getStudentColor };
};