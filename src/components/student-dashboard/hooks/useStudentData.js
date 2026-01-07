import { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, Performance, UeberfachlichKompetenz, Competency, StudentSelfAssessment, CompetencyGoal, Class, ChoreAssignment } from '@/api/entities';
import { calculateWeightedGrade } from '@/components/grades/utils/calculateWeightedGrade';
import { getFachbereichColor } from '@/utils/colorUtils';
import pb from '@/api/pb';

/**
 * Hook to fetch all student data for the dashboard
 * Works for both student (own data) and teacher (viewing student) roles
 *
 * @param {string} studentId - The student ID to fetch data for (optional for students)
 * @returns {Object} Student data, loading state, and refresh function
 */
export function useStudentData(studentId = null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [student, setStudent] = useState(null);
  const [performances, setPerformances] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [teacherAssessments, setTeacherAssessments] = useState([]);
  const [selfAssessments, setSelfAssessments] = useState([]);
  const [goals, setGoals] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [choreAssignments, setChoreAssignments] = useState([]);

  const currentUser = pb.authStore.model;
  const isStudent = currentUser?.role === 'student';

  // Determine which student to load
  const targetStudentId = useMemo(() => {
    if (isStudent) {
      // Students can only see their own data - find their student record
      return null; // Will be resolved by loading student by account_id
    }
    return studentId;
  }, [isStudent, studentId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let studentData = null;

      // Get student record
      if (isStudent) {
        // Find student by their account_id
        const students = await Student.list();
        studentData = students.find(s => s.account_id === currentUser.id);

        if (!studentData) {
          throw new Error('Kein Schüler-Profil gefunden. Bitte wenden Sie sich an Ihren Lehrer.');
        }
      } else if (targetStudentId) {
        studentData = await Student.findById(targetStudentId);
      }

      if (!studentData) {
        throw new Error('Schüler nicht gefunden.');
      }

      setStudent(studentData);

      // Load class info
      if (studentData.class_id) {
        const classData = await Class.findById(studentData.class_id);
        setClassInfo(classData);
      }

      // Load all related data in parallel
      const [
        performancesData,
        competenciesData,
        teacherAssessmentsData,
        selfAssessmentsData,
        goalsData,
        choreAssignmentsData
      ] = await Promise.all([
        Performance.filter({ student_id: studentData.id }),
        Competency.filter({ class_id: studentData.class_id }),
        UeberfachlichKompetenz.filter({ student_id: studentData.id }),
        StudentSelfAssessment.filter({ student_id: studentData.id }).catch(() => []),
        CompetencyGoal.filter({ student_id: studentData.id }).catch(() => []),
        ChoreAssignment.filter({ student_id: studentData.id }).catch(() => [])
      ]);

      setPerformances(performancesData);
      setCompetencies(competenciesData);
      setTeacherAssessments(teacherAssessmentsData);
      setSelfAssessments(selfAssessmentsData);
      setGoals(goalsData);
      setChoreAssignments(choreAssignmentsData);

    } catch (err) {
      console.error('Error loading student data:', err);
      setError(err.message || 'Fehler beim Laden der Daten.');
    } finally {
      setLoading(false);
    }
  }, [isStudent, targetStudentId, currentUser?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate derived data
  const gradeAverage = useMemo(() => {
    if (performances.length === 0) return null;
    return calculateWeightedGrade(performances);
  }, [performances]);

  // Analyze strengths and weaknesses by fachbereiche with improvement tracking
  const { strengths, weaknesses, conqueredCount } = useMemo(() => {
    if (performances.length === 0) {
      return { strengths: [], weaknesses: [], conqueredCount: 0 };
    }

    // Zeitraum für "neuere" Noten: letzte 30 Tage
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Group by fachbereiche mit Datum-Tracking
    const fachbereicheMap = {};

    performances.forEach(p => {
      // Grade 0 ignorieren - bedeutet "nicht geschrieben"
      if (!p.grade || p.grade === 0) return;

      const performanceDate = p.date ? new Date(p.date) : null;

      if (Array.isArray(p.fachbereiche)) {
        p.fachbereiche.forEach(fb => {
          if (!fachbereicheMap[fb]) {
            fachbereicheMap[fb] = {
              allGrades: [],
              recentGrades: [],  // Letzte 30 Tage
              olderGrades: [],   // Älter als 30 Tage
              count: 0
            };
          }

          fachbereicheMap[fb].allGrades.push(p.grade);
          fachbereicheMap[fb].count++;

          // Kategorisiere nach Datum
          if (performanceDate) {
            if (performanceDate >= thirtyDaysAgo) {
              fachbereicheMap[fb].recentGrades.push(p.grade);
            } else {
              fachbereicheMap[fb].olderGrades.push(p.grade);
            }
          }
        });
      }
    });

    // Calculate averages, improvement and sort
    const fachbereicheArray = Object.entries(fachbereicheMap)
      .map(([name, data]) => {
        const average = data.allGrades.reduce((a, b) => a + b, 0) / data.allGrades.length;

        // Berechne Verbesserung
        let improvement = 0;
        let conquered = false;

        if (data.recentGrades.length > 0 && data.olderGrades.length > 0) {
          const recentAvg = data.recentGrades.reduce((a, b) => a + b, 0) / data.recentGrades.length;
          const olderAvg = data.olderGrades.reduce((a, b) => a + b, 0) / data.olderGrades.length;
          improvement = recentAvg - olderAvg;

          // "Erobert" wenn Verbesserung >= 0.5
          conquered = improvement >= 0.5;
        }

        return {
          name,
          average,
          count: data.count,
          color: getFachbereichColor(name),
          improvement: Math.round(improvement * 10) / 10, // Auf 1 Dezimalstelle runden
          conquered,
          recentCount: data.recentGrades.length,
          olderCount: data.olderGrades.length
        };
      })
      .filter(fb => fb.count >= 2) // At least 2 grades for significance
      .sort((a, b) => b.average - a.average);

    // Zähle eroberte Fachbereiche (nur aus den Schwächen)
    const weaknessesRaw = fachbereicheArray.slice(-3).reverse();
    const conqueredTotal = fachbereicheArray.filter(fb => fb.conquered).length;

    return {
      strengths: fachbereicheArray.slice(0, 3),
      weaknesses: weaknessesRaw,
      conqueredCount: conqueredTotal
    };
  }, [performances]);

  // Helper: Rundet auf 0.5
  const roundToHalf = (num) => Math.round(num * 2) / 2;

  // Get competency data with both teacher and self assessments
  const competencyData = useMemo(() => {
    return competencies.map(comp => {
      // Teacher assessments for this competency
      const teacherData = teacherAssessments.find(ta => ta.competency_id === comp.id);
      const teacherAllScores = teacherData?.assessments || [];
      const teacherLatest = teacherAllScores.sort((a, b) =>
        new Date(b.date) - new Date(a.date)
      )[0];

      // Durchschnitt aller Lehrer-Bewertungen (auf 0.5 gerundet)
      const teacherAverage = teacherAllScores.length > 0
        ? roundToHalf(teacherAllScores.reduce((sum, a) => sum + a.score, 0) / teacherAllScores.length)
        : null;

      // Self assessments for this competency
      const selfData = selfAssessments.filter(sa => sa.competency_id === comp.id);
      const selfLatest = selfData.sort((a, b) =>
        new Date(b.date) - new Date(a.date)
      )[0];

      // Durchschnitt aller Selbsteinschätzungen (auf 0.5 gerundet)
      const selfAverage = selfData.length > 0
        ? roundToHalf(selfData.reduce((sum, a) => sum + a.self_score, 0) / selfData.length)
        : null;

      // Goals for this competency
      const compGoals = goals.filter(g => g.competency_id === comp.id);

      return {
        ...comp,
        teacherScore: teacherAverage,
        teacherDate: teacherLatest?.date || null,
        teacherHistory: teacherAllScores,
        teacherAssessmentCount: teacherAllScores.length,
        selfScore: selfAverage,
        selfDate: selfLatest?.date || null,
        selfHistory: selfData,
        selfAssessmentCount: selfData.length,
        goals: compGoals,
        completedGoals: compGoals.filter(g => g.is_completed).length,
        totalGoals: compGoals.length,
        gap: teacherAverage && selfAverage
          ? Math.abs(teacherAverage - selfAverage)
          : null
      };
    });
  }, [competencies, teacherAssessments, selfAssessments, goals]);

  // Summary stats
  const stats = useMemo(() => {
    const completedGoals = goals.filter(g => g.is_completed);
    const activeGoals = goals.filter(g => !g.is_completed);

    // Chore stats - nur vergangene Ämtlis zählen (fair für die Quote)
    const today = new Date().toISOString().split('T')[0];
    const pastChores = choreAssignments.filter(a => a.assignment_date <= today);
    const totalChores = pastChores.length;
    const completedChores = pastChores.filter(a => a.is_completed).length;

    return {
      totalPerformances: performances.length,
      gradeAverage,
      totalCompetencies: competencies.length,
      assessedCompetencies: competencyData.filter(c => c.teacherScore).length,
      selfAssessedCompetencies: competencyData.filter(c => c.selfScore).length,
      completedGoals: completedGoals.length,
      activeGoals: activeGoals.length,
      recentGoals: completedGoals
        .sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))
        .slice(0, 5),
      // Chore stats
      totalChores,
      completedChores,
      failedChores: totalChores - completedChores
    };
  }, [performances, gradeAverage, competencies, competencyData, goals, choreAssignments]);

  return {
    // Data
    student,
    classInfo,
    performances,
    competencies,
    teacherAssessments,
    selfAssessments,
    goals,
    choreAssignments,

    // Derived data
    gradeAverage,
    strengths,
    weaknesses,
    conqueredCount,
    competencyData,
    stats,

    // State
    loading,
    error,
    isStudent,

    // Actions
    refresh: loadData
  };
}

export default useStudentData;
