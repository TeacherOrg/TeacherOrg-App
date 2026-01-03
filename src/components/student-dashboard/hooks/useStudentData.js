import { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, Performance, UeberfachlichKompetenz, Competency, StudentSelfAssessment, CompetencyGoal, Class } from '@/api/entities';
import { calculateWeightedGrade } from '@/components/grades/utils/calculateWeightedGrade';
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
        goalsData
      ] = await Promise.all([
        Performance.filter({ student_id: studentData.id }),
        Competency.filter({ class_id: studentData.class_id }),
        UeberfachlichKompetenz.filter({ student_id: studentData.id }),
        StudentSelfAssessment.filter({ student_id: studentData.id }).catch(() => []),
        CompetencyGoal.filter({ student_id: studentData.id }).catch(() => [])
      ]);

      setPerformances(performancesData);
      setCompetencies(competenciesData);
      setTeacherAssessments(teacherAssessmentsData);
      setSelfAssessments(selfAssessmentsData);
      setGoals(goalsData);

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

  // Analyze strengths and weaknesses by fachbereiche
  const { strengths, weaknesses } = useMemo(() => {
    if (performances.length === 0) {
      return { strengths: [], weaknesses: [] };
    }

    // Group by fachbereiche
    const fachbereicheMap = {};

    performances.forEach(p => {
      if (Array.isArray(p.fachbereiche)) {
        p.fachbereiche.forEach(fb => {
          if (!fachbereicheMap[fb]) {
            fachbereicheMap[fb] = { grades: [], count: 0 };
          }
          fachbereicheMap[fb].grades.push(p.grade);
          fachbereicheMap[fb].count++;
        });
      }
    });

    // Calculate averages and sort
    const fachbereicheArray = Object.entries(fachbereicheMap)
      .map(([name, data]) => ({
        name,
        average: data.grades.reduce((a, b) => a + b, 0) / data.grades.length,
        count: data.count
      }))
      .filter(fb => fb.count >= 2) // At least 2 grades for significance
      .sort((a, b) => b.average - a.average);

    return {
      strengths: fachbereicheArray.slice(0, 3),
      weaknesses: fachbereicheArray.slice(-3).reverse()
    };
  }, [performances]);

  // Get competency data with both teacher and self assessments
  const competencyData = useMemo(() => {
    return competencies.map(comp => {
      // Teacher assessments for this competency
      const teacherData = teacherAssessments.find(ta => ta.competency_id === comp.id);
      const teacherLatest = teacherData?.assessments?.sort((a, b) =>
        new Date(b.date) - new Date(a.date)
      )[0];

      // Self assessments for this competency
      const selfData = selfAssessments.filter(sa => sa.competency_id === comp.id);
      const selfLatest = selfData.sort((a, b) =>
        new Date(b.date) - new Date(a.date)
      )[0];

      // Goals for this competency
      const compGoals = goals.filter(g => g.competency_id === comp.id);

      return {
        ...comp,
        teacherScore: teacherLatest?.score || null,
        teacherDate: teacherLatest?.date || null,
        teacherHistory: teacherData?.assessments || [],
        selfScore: selfLatest?.self_score || null,
        selfDate: selfLatest?.date || null,
        selfHistory: selfData,
        goals: compGoals,
        completedGoals: compGoals.filter(g => g.is_completed).length,
        totalGoals: compGoals.length,
        gap: teacherLatest?.score && selfLatest?.self_score
          ? Math.abs(teacherLatest.score - selfLatest.self_score)
          : null
      };
    });
  }, [competencies, teacherAssessments, selfAssessments, goals]);

  // Summary stats
  const stats = useMemo(() => {
    const completedGoals = goals.filter(g => g.is_completed);
    const activeGoals = goals.filter(g => !g.is_completed);

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
        .slice(0, 5)
    };
  }, [performances, gradeAverage, competencies, competencyData, goals]);

  return {
    // Data
    student,
    classInfo,
    performances,
    competencies,
    teacherAssessments,
    selfAssessments,
    goals,

    // Derived data
    gradeAverage,
    strengths,
    weaknesses,
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
