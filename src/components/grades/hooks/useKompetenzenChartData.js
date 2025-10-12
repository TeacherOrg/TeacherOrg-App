import { useMemo } from 'react';
import { format } from "date-fns";

export const useKompetenzenChartData = ({
  ueberfachlich = [],
  students = [],
  selectedCompetencyForProgression = null,
  selectedStudents = [],
  showClassAverage = true
}) => {
  const ueberfachlichData = useMemo(() => {
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
  }, [ueberfachlich, students, selectedStudents, showClassAverage]);

  const ueberfachlichProgressionData = useMemo(() => {
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
  }, [ueberfachlich, students, selectedCompetencyForProgression, selectedStudents, showClassAverage]);

  const getStudentColor = (index) => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c'];
    return colors[index % colors.length];
  };

  return { ueberfachlichData, ueberfachlichProgressionData, getStudentColor };
};