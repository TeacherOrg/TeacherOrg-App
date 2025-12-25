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

    const filteredPerfs = performances.filter(p => 
      p && (typeof p.subject === 'string' || (typeof p.subject === 'object' && p.subject.id))
    );

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

    return Object.values(subjectMap);
  }, [performances, students, subjects, selectedStudents, showClassAverage]);

  // Fachbereiche – DIE WICHTIGE KORREKTE VERSION
  const fachbereichData = useMemo(() => {
    if (!Array.isArray(performances) || !Array.isArray(students)) return [];

    const filteredPerfs = performances.filter(p =>
      p && (typeof p.subject === 'string' || (typeof p.subject === 'object' && p.subject.id)) &&
      (selectedSubject === 'all' || getSubjectId(p.subject) === selectedSubject)
    );

    if (filteredPerfs.length === 0) return [];

    const fachbereichToPerfs = {};
    const fachbereichToStudentPerfs = {};

    filteredPerfs.forEach(perf => {
      if (Array.isArray(perf.fachbereiche) && perf.fachbereiche.length > 0) {
        const weightPerFachbereich = (perf.weight ?? 1) / perf.fachbereiche.length;

        perf.fachbereiche.forEach(fb => {
          if (typeof fb !== 'string') return;

          if (!fachbereichToPerfs[fb]) {
            fachbereichToPerfs[fb] = [];
            fachbereichToStudentPerfs[fb] = {};
          }

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
      const entry = { name: fb };

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

  return { lineData, subjectData, fachbereichData, fachbereichDetailData, getStudentColor };
};