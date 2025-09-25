// src/components/grades/hooks/useChartData.js
import { useMemo } from 'react';
import { format } from "date-fns";
import { getStudentColor } from '../utils/constants'; // Passe den Pfad an

export const useChartData = ({
  performances = [],
  ueberfachlich = [],
  students = [],
  selectedSubject = 'Alle',
  selectedCompetencyForProgression = null,
  selectedStudents = [],
  showClassAverage = true,
  diagramView = 'leistung'
}) => {
  // Leistung Chart Data
  const lineData = useMemo(() => {
    if (diagramView !== 'leistung') return [];
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
  }, [performances, students, selectedSubject, selectedStudents, showClassAverage, diagramView]);

  const fachbereichData = useMemo(() => {
    if (diagramView !== 'leistung') return [];
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
  }, [performances, students, selectedSubject, selectedStudents, showClassAverage, diagramView]);

  const ueberfachlichData = useMemo(() => {
    if (diagramView !== 'kompetenzen') return [];
    if (!Array.isArray(ueberfachlich) || !Array.isArray(students)) return [];

    const competencyNames = [...new Set(
      ueberfachlich
        .filter(comp => comp && comp.competency_name_display)
        .map(comp => comp.competency_name_display)
    )];

    if (competencyNames.length === 0) return [];

    const competencyMap = {};

    competencyNames.forEach(competencyName => {
      if (!competencyMap[competencyName]) {
        competencyMap[competencyName] = { name: competencyName };
      }
      if (showClassAverage) {
        let allScores = [];
        ueberfachlich.forEach(comp => {
          if (comp.competency_name_display === competencyName &&
              Array.isArray(comp.assessments) &&
              comp.assessments.length > 0) {
            const latestAssessment = comp.assessments
              .filter(a => a && typeof a.score === 'number' && a.score >= 1 && a.score <= 5)
              .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            if (latestAssessment) {
              allScores.push(latestAssessment.score);
            }
          }
        });
        if (allScores.length > 0) {
          const avgScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
          competencyMap[competencyName]['Klassenschnitt'] = parseFloat(avgScore.toFixed(2));
        } else {
          competencyMap[competencyName]['Klassenschnitt'] = null;
        }
      }
      selectedStudents.forEach(studentId => {
        const student = students.find(s => s && s.id === studentId);
        if (!student) return;
        const studentComp = ueberfachlich.find(u =>
          u.student_id === studentId && u.competency_name_display === competencyName
        );
        let studentScore = null;
        if (studentComp && Array.isArray(studentComp.assessments) && studentComp.assessments.length > 0) {
          const validAssessments = studentComp.assessments
            .filter(a => a && typeof a.date === 'string' && typeof a.score === 'number' && a.score >= 1 && a.score <= 5);
          if (validAssessments.length > 0) {
            const latestAssessment = validAssessments.reduce((latest, assessment) => {
              return !latest || new Date(assessment.date) > new Date(latest.date) ? assessment : latest;
            }, null);
            studentScore = latestAssessment?.score || null;
          }
        }
        competencyMap[competencyName][student.name || 'Unnamed'] = studentScore;
      });
    });

    return Object.values(competencyMap);
  }, [ueberfachlich, students, selectedStudents, showClassAverage, diagramView]);

  const ueberfachlichProgressionData = useMemo(() => {
    if (diagramView !== 'kompetenzen') return [];
    if (!selectedCompetencyForProgression || !Array.isArray(ueberfachlich) || ueberfachlich.length === 0) {
      return [];
    }

    const filteredUeberfachlich = ueberfachlich.filter(u =>
      u.competency_name_display === selectedCompetencyForProgression
    );

    const allAssessments = filteredUeberfachlich
      .flatMap(u => (u.assessments || []))
      .filter(a => a && a.date && typeof a.date === 'string')
      .map(a => ({ ...a, competency_name: selectedCompetencyForProgression }));

    const uniqueDates = [...new Set(allAssessments.map(a => a.date))]
      .sort((a, b) => new Date(a) - new Date(b));

    if (uniqueDates.length === 0) return [];

    return uniqueDates.map(date => {
      const point = {
        name: new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        date: date,
      };

      if (showClassAverage) {
        const scoresForDate = allAssessments
          .filter(a => a.date === date && typeof a.score === 'number' && a.score >= 1 && a.score <= 5)
          .map(a => a.score);

        if (scoresForDate.length > 0) {
          const avgScore = scoresForDate.reduce((sum, score) => sum + score, 0) / scoresForDate.length;
          point['Klassenschnitt'] = parseFloat(avgScore.toFixed(2));
        } else {
          point['Klassenschnitt'] = null;
        }
      }

      selectedStudents.forEach(studentId => {
        const student = students.find(s => s && s.id === studentId);
        if (!student) return;
        const studentEntry = filteredUeberfachlich.find(u => u.student_id === studentId);
        const assessmentForDate = (studentEntry?.assessments || [])
          .find(a => a.date === date && typeof a.score === 'number');

        point[student.name || 'Unnamed'] = (assessmentForDate && typeof assessmentForDate.score === 'number')
          ? assessmentForDate.score
          : null;
      });

      return point;
    });
  }, [ueberfachlich, students, selectedCompetencyForProgression, selectedStudents, showClassAverage, diagramView]);

  return {
    lineData,
    fachbereichData,
    ueberfachlichData,
    ueberfachlichProgressionData,
    getStudentColor
  };
};