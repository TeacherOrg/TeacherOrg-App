import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import pb from '@/api/pb';
import CalendarLoader from '@/components/ui/CalendarLoader';

export default function ProtectedRoute({ children }) {
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      // Auth-Check
      if (!pb.authStore.isValid || !pb.authStore.model) {
        navigate('/login', { replace: true });
        return false;
      }

      // Verifizierungs-Check
      if (!pb.authStore.model.verified) {
        pb.authStore.clear();
        navigate('/login', { replace: true });
        return false;
      }

      // Rollen-Check: teacher und student erlaubt
      const allowedRoles = ['teacher', 'student'];
      if (!allowedRoles.includes(pb.authStore.model.role)) {
        pb.authStore.clear();
        navigate('/login', { replace: true });
        return false;
      }

      // Route-Einschränkungen für Schüler
      const STUDENT_ALLOWED_ROUTES = ['/timetable', '/student-dashboard', '/'];
      if (pb.authStore.model.role === 'student') {
        const currentPath = location.pathname.toLowerCase();
        const isAllowed = STUDENT_ALLOWED_ROUTES.some(route =>
          currentPath === route || currentPath.startsWith(route + '/')
        );

        if (!isAllowed) {
          navigate('/student-dashboard', { replace: true });
          return false;
        }
      }

      setIsChecking(false);
      return true;
    };

    checkAuth();

    // Listener für Auth-Änderungen
    const unsubscribe = pb.authStore.onChange(() => {
      if (!pb.authStore.isValid) {
        navigate('/login', { replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate, location.pathname]);

  // Loading-State während Auth-Check
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-925 dark:to-slate-950 flex items-center justify-center">
        <CalendarLoader />
      </div>
    );
  }

  // Wenn Auth valide: Kinder rendern
  if (!pb.authStore.isValid || !pb.authStore.model) {
    return null;
  }

  return children;
}
