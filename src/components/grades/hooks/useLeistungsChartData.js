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

  const lineData = useMemo(() => {
    if (!Array.isArray(performances) || !Array.isArray(students)) return [];

    const validPerformances = performances.filter(p =>
      p && typeof p.date === 'string' && typeof p.assessment_name === 'string' && typeof p.grade === 'number'
    );
    const sortedPerformances = validPerformances
      .filter(p => selectedSubject === 'all' || getSubjectId(p.subject) === selectedSubject)
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
          perf.assessment_name === p.assessment_name && perf.date === p.date && getSubjectId(perf.subject) === getSubjectId(p.subject)
        );
        const validGrades = sameAssessments
          .map(perf => perf.grade)
          .filter(g => typeof g === 'number' && g > 0);
        if (validGrades.length > 0) {
          point['Klassenschnitt'] = calculateWeightedGrade(sameAssessments) || null;
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
            getSubjectId(perf.subject) === getSubjectId(p.subject)
          );
          point[student.name || 'Unnamed'] = studentPerf && typeof studentPerf.grade === 'number' ? studentPerf.grade : null;
        }
      });

      return point;
    });
  }, [performances, students, selectedSubject, selectedStudents, showClassAverage]);

  const subjectData = useMemo(() => {
    if (!Array.isArray(performances) || !Array.isArray(students)) return [];

    const filteredPerfs = performances.filter(p => p && (typeof p.subject === 'string' || (typeof p.subject === 'object' && typeof p.subject.id === 'string')));

    if (filteredPerfs.length === 0) return [];

    const subjectMap = {};
    filteredPerfs.forEach(perf => {
      const subjectId = getSubjectId(perf.subject);
      if (!subjectId || typeof subjectId !== 'string') return;
      const subjectName = getSubjectName(perf.subject, subjectId);
      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = { name: subjectName };
      }
      if (showClassAverage) {
        subjectMap[subjectName]['Klassenschnitt'] = calculateWeightedGrade(filteredPerfs.filter(p => getSubjectId(p.subject) === subjectId)) || null;
      }
      selectedStudents.forEach((studentId) => {
        const student = students.find(s => s && s.id === studentId);
        if (student) {
          const studentPerfsForSubject = filteredPerfs.filter(p =>
            p.student_id === studentId && getSubjectId(p.subject) === subjectId
          );
          if (studentPerfsForSubject.length > 0) {
            const grades = studentPerfsForSubject
              .map(p => p.grade)
              .filter(g => typeof g === 'number' && g > 0);
            if (grades.length > 0) {
              subjectMap[subjectName][student.name || 'Unnamed'] = calculateWeightedGrade(studentPerfsForSubject) || null;
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

    const filteredPerfs = performances.filter(p =>
      p && (typeof p.subject === 'string' || (typeof p.subject === 'object' && typeof p.subject.id === 'string')) && (selectedSubject === 'all' || getSubjectId(p.subject) === selectedSubject)
    );

    if (filteredPerfs.length === 0) return [];

    const fachbereichMap = {};
    filteredPerfs.forEach(perf => {
      if (Array.isArray(perf.fachbereiche)) {
        perf.fachbereiche.forEach(fachbereich => {
          if (!fachbereich || typeof fachbereich !== 'string') return;
          if (!fachbereichMap[fachbereich]) {
            fachbereichMap[fachbereich] = { name: fachbereich };
          }
          if (showClassAverage) {
            fachbereichMap[fachbereich]['Klassenschnitt'] = calculateWeightedGrade(filteredPerfs.filter(p => Array.isArray(p.fachbereiche) && p.fachbereiche.includes(fachbereich))) || null;
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
                  fachbereichMap[fachbereich][student.name || 'Unnamed'] = calculateWeightedGrade(studentPerfsForFachbereich) || null;
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
      p && (typeof p.subject === 'string' || (typeof p.subject === 'object' && typeof p.subject.id === 'string')) && (selectedSubject === 'all' || getSubjectId(p.subject) === selectedSubject) &&
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
        assessmentMap[key]['Klassenschnitt'] = calculateWeightedGrade(filteredPerfs.filter(p => p.assessment_name === perf.assessment_name && p.date === perf.date)) || null;
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

  return { lineData, subjectData, fachbereichData, fachbereichDetailData, getStudentColor };
};