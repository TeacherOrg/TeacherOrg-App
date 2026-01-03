import React from 'react';
import { useSearchParams } from 'react-router-dom';
import StudentDashboard from '@/components/student-dashboard/StudentDashboard';
import pb from '@/api/pb';

/**
 * Page wrapper for the Student Dashboard
 * - Students: Shows their own dashboard
 * - Teachers: Can view a specific student's dashboard via ?studentId=xxx
 */
export default function StudentDashboardPage() {
  const [searchParams] = useSearchParams();
  const studentIdParam = searchParams.get('studentId');

  const currentUser = pb.authStore.model;
  const isStudent = currentUser?.role === 'student';

  // Students always see their own dashboard
  // Teachers can specify a studentId in the URL
  const studentId = isStudent ? null : studentIdParam;

  return <StudentDashboard studentId={studentId} />;
}
