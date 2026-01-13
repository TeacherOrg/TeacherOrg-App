import { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, Performance, UeberfachlichKompetenz, Competency, StudentSelfAssessment, CompetencyGoal, Class, ChoreAssignment, Subject } from '@/api/entities';
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
  const [subjects, setSubjects] = useState([]);

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
        choreAssignmentsData,
        subjectsData
      ] = await Promise.all([
        Performance.filter({ student_id: studentData.id }),
        Competency.filter({ class_id: studentData.class_id }),
        UeberfachlichKompetenz.filter({ student_id: studentData.id }),
        StudentSelfAssessment.filter({ student_id: studentData.id }).catch(() => []),
        CompetencyGoal.filter({ student_id: studentData.id }).catch(() => []),
        ChoreAssignment.filter({ student_id: studentData.id }).catch(() => []),
        Subject.filter({ class_id: studentData.class_id }).catch(() => [])
      ]);

      setPerformances(performancesData);
      setCompetencies(competenciesData);
      setTeacherAssessments(teacherAssessmentsData);
      setSelfAssessments(selfAssessmentsData);
      setGoals(goalsData);
      setChoreAssignments(choreAssignmentsData);
      setSubjects(subjectsData);

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

  // NEW: Calculate consistency streak (consecutive weeks with self-assessments)
  const consistencyStreak = useMemo(() => {
    if (selfAssessments.length === 0) return 0;

    // Get week number from date (ISO week)
    const getWeek = (date) => {
      const d = new Date(date);
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    // Get unique weeks with assessments
    const weeksWithAssessments = new Set(
      selfAssessments.map(a => {
        const year = new Date(a.date).getUTCFullYear();
        const week = getWeek(a.date);
        return `${year}-W${week}`;
      })
    );

    const sortedWeeks = Array.from(weeksWithAssessments).sort();

    if (sortedWeeks.length === 0) return 0;

    // Calculate longest streak
    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < sortedWeeks.length; i++) {
      const [prevYear, prevWeek] = sortedWeeks[i - 1].split('-W').map(Number);
      const [currYear, currWeek] = sortedWeeks[i].split('-W').map(Number);

      // Check if consecutive weeks (accounting for year boundaries)
      const isConsecutive = (currYear === prevYear && currWeek === prevWeek + 1) ||
                           (currYear === prevYear + 1 && prevWeek === 52 && currWeek === 1);

      if (isConsecutive) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return maxStreak;
  }, [selfAssessments]);

  // NEW: Count self-reflections
  const selfReflectionCount = useMemo(() => {
    return selfAssessments.length;
  }, [selfAssessments]);

  // NEW: Calculate self-awareness gap (average difference between self and teacher scores)
  const selfAwarenessGap = useMemo(() => {
    const gaps = competencyData
      .filter(c => c.teacherScore !== null && c.selfScore !== null)
      .map(c => Math.abs(c.teacherScore - c.selfScore));

    if (gaps.length === 0) return null;

    return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  }, [competencyData]);

  // NEW: Count perfect grades (6.0)
  const perfectGrades = useMemo(() => {
    return performances.filter(p => p.grade === 6.0).length;
  }, [performances]);

  // NEW: Calculate improvement streak
  const improvementStreak = useMemo(() => {
    if (performances.length === 0) return 0;

    // Group by fachbereich and sort by date
    const byFachbereich = {};

    performances.forEach(p => {
      if (!p.grade || p.grade === 0 || !p.date) return;

      if (Array.isArray(p.fachbereiche)) {
        p.fachbereiche.forEach(fb => {
          if (!byFachbereich[fb]) {
            byFachbereich[fb] = [];
          }
          byFachbereich[fb].push({ date: p.date, grade: p.grade });
        });
      }
    });

    let maxStreak = 0;

    Object.values(byFachbereich).forEach(grades => {
      if (grades.length < 2) return;

      const sorted = grades.sort((a, b) => new Date(a.date) - new Date(b.date));
      let currentStreak = 0;

      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].grade > sorted[i - 1].grade) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }
    });

    return maxStreak;
  }, [performances]);

  // NEW: Check if multiple fachbereiche have improvement streaks
  const hasMultipleImprovementStreaks = useMemo(() => {
    if (performances.length === 0) return false;

    const byFachbereich = {};

    performances.forEach(p => {
      if (!p.grade || p.grade === 0 || !p.date) return;

      if (Array.isArray(p.fachbereiche)) {
        p.fachbereiche.forEach(fb => {
          if (!byFachbereich[fb]) {
            byFachbereich[fb] = [];
          }
          byFachbereich[fb].push({ date: p.date, grade: p.grade });
        });
      }
    });

    let fachbereicheWithStreaks = 0;

    Object.values(byFachbereich).forEach(grades => {
      if (grades.length < 3) return;

      const sorted = grades.sort((a, b) => new Date(a.date) - new Date(b.date));
      let hasStreak = false;

      // Check for at least 3 consecutive improvements
      for (let i = 2; i < sorted.length; i++) {
        if (sorted[i].grade > sorted[i - 1].grade &&
            sorted[i - 1].grade > sorted[i - 2].grade) {
          hasStreak = true;
          break;
        }
      }

      if (hasStreak) {
        fachbereicheWithStreaks++;
      }
    });

    return fachbereicheWithStreaks >= 2;
  }, [performances]);

  // NEW: Check for transformation (weak area <4.0 to 5.0+)
  const hasTransformation = useMemo(() => {
    if (performances.length === 0) return false;

    const byFachbereich = {};

    performances.forEach(p => {
      if (!p.grade || p.grade === 0 || !p.date) return;

      if (Array.isArray(p.fachbereiche)) {
        p.fachbereiche.forEach(fb => {
          if (!byFachbereich[fb]) {
            byFachbereich[fb] = [];
          }
          byFachbereich[fb].push({ date: p.date, grade: p.grade });
        });
      }
    });

    // Check each fachbereich for transformation
    return Object.values(byFachbereich).some(grades => {
      if (grades.length < 2) return false;

      const sorted = grades.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate early average (first half)
      const halfPoint = Math.floor(sorted.length / 2);
      const earlyGrades = sorted.slice(0, halfPoint);
      const recentGrades = sorted.slice(halfPoint);

      if (earlyGrades.length === 0 || recentGrades.length === 0) return false;

      const earlyAvg = earlyGrades.reduce((sum, g) => sum + g.grade, 0) / earlyGrades.length;
      const recentAvg = recentGrades.reduce((sum, g) => sum + g.grade, 0) / recentGrades.length;

      return earlyAvg < 4.0 && recentAvg >= 5.0;
    });
  }, [performances]);

  // NEW: Subject breadth calculations
  const { subjectCount, hasHighBreadth, hasExcellentBreadth } = useMemo(() => {
    if (performances.length === 0) {
      return { subjectCount: 0, hasHighBreadth: false, hasExcellentBreadth: false };
    }

    // Group by subject
    const bySubject = {};

    performances.forEach(p => {
      if (!p.grade || p.grade === 0 || !p.subject) return;

      if (!bySubject[p.subject]) {
        bySubject[p.subject] = [];
      }
      bySubject[p.subject].push(p.grade);
    });

    const subjectAverages = Object.entries(bySubject).map(([subject, grades]) => ({
      subject,
      average: grades.reduce((sum, g) => sum + g, 0) / grades.length,
      count: grades.length
    }));

    const count = subjectAverages.length;

    // High breadth: 8+ subjects with 4.5+ average
    const highBreadth = subjectAverages.filter(s => s.average >= 4.5).length >= 8;

    // Excellent breadth: 10+ subjects all with 5.0+ average
    const excellentBreadth = count >= 10 && subjectAverages.every(s => s.average >= 5.0);

    return {
      subjectCount: count,
      hasHighBreadth: highBreadth,
      hasExcellentBreadth: excellentBreadth
    };
  }, [performances]);

  // NEW: Calculate engagement score (total activities)
  const engagementScore = useMemo(() => {
    const completedGoalsCount = goals.filter(g => g.is_completed).length;
    const completedChoresCount = stats.completedChores || 0;
    const selfAssessmentCount = selfAssessments.length;

    return completedGoalsCount + completedChoresCount + selfAssessmentCount;
  }, [goals, stats.completedChores, selfAssessments]);

  // NEW: Calculate core subject average (subjects with is_core_subject = true)
  const coreSubjectAverage = useMemo(() => {
    if (performances.length === 0 || subjects.length === 0) return null;

    // Get IDs of core subjects
    const coreSubjectIds = subjects
      .filter(s => s.is_core_subject)
      .map(s => s.id);

    if (coreSubjectIds.length === 0) return null;

    // Get performances for core subjects (support both subject_id and subject fields)
    const corePerformances = performances.filter(p => {
      const subjectId = p.subject_id || p.subject;
      return p.grade && p.grade > 0 && coreSubjectIds.includes(subjectId);
    });

    if (corePerformances.length === 0) return null;

    const total = corePerformances.reduce((sum, p) => sum + p.grade, 0);
    return total / corePerformances.length;
  }, [performances, subjects]);

  // NEW: Count subjects improved by >= 0.5 (same logic as conqueredCount but for subjects)
  const improvedSubjectsCount = useMemo(() => {
    if (performances.length === 0) return 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Group by subject
    const bySubject = {};

    performances.forEach(p => {
      if (!p.grade || p.grade === 0 || !p.subject_id) return;

      const performanceDate = p.date ? new Date(p.date) : null;

      if (!bySubject[p.subject_id]) {
        bySubject[p.subject_id] = {
          recentGrades: [],
          olderGrades: []
        };
      }

      if (performanceDate) {
        if (performanceDate >= thirtyDaysAgo) {
          bySubject[p.subject_id].recentGrades.push(p.grade);
        } else {
          bySubject[p.subject_id].olderGrades.push(p.grade);
        }
      }
    });

    // Count subjects with >= 0.5 improvement
    let count = 0;

    Object.values(bySubject).forEach(data => {
      if (data.recentGrades.length > 0 && data.olderGrades.length > 0) {
        const recentAvg = data.recentGrades.reduce((a, b) => a + b, 0) / data.recentGrades.length;
        const olderAvg = data.olderGrades.reduce((a, b) => a + b, 0) / data.olderGrades.length;
        const improvement = recentAvg - olderAvg;

        if (improvement >= 0.5) {
          count++;
        }
      }
    });

    return count;
  }, [performances]);

  // Helper function to get completed goals
  const completedGoals = useMemo(() => {
    return goals.filter(g => g.is_completed);
  }, [goals]);

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
    subjects,

    // Derived data
    gradeAverage,
    strengths,
    weaknesses,
    conqueredCount,
    competencyData,
    stats,

    // NEW: Achievement-related calculations
    consistencyStreak,
    selfReflectionCount,
    selfAwarenessGap,
    perfectGrades,
    improvementStreak,
    hasMultipleImprovementStreaks,
    hasTransformation,
    subjectCount,
    hasHighBreadth,
    hasExcellentBreadth,
    engagementScore,
    completedGoals,
    completedChores: stats.completedChores,
    coreSubjectAverage,
    improvedSubjectsCount,

    // State
    loading,
    error,
    isStudent,

    // Actions
    refresh: loadData
  };
}

export default useStudentData;
