import { useEffect } from 'react';
import { useRouter } from 'next/router';
import pb from '@/api/pb';

const AuthGuard = ({ children }) => {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
        console.log('AuthGuard: isValid?', pb.authStore.isValid);
        console.log('AuthGuard: model?', pb.authStore.model);
        console.log('AuthGuard: verified?', pb.authStore.model?.verified);
        console.log('AuthGuard: role?', pb.authStore.model?.role);
                if (!pb.authStore.isValid || !pb.authStore.model) {
        // Kein gültiger User – leite zu Login
        router.push('/login?error=invalid_auth');
        } else if (!pb.authStore.model.verified) {
            
        // User nicht verifiziert – logout und zu Login
        pb.authStore.clear();
        router.push('/login?error=verification_required');
        } else if (pb.authStore.model.role !== 'teacher') {
        pb.authStore.clear();
        router.push('/login?error=invalid_role');
        }
    };

    checkAuth();

    // Optional: Listener für Auth-Changes
    const unsubscribe = pb.authStore.onChange(checkAuth);
    return () => unsubscribe();
    }, [router]);

  if (!pb.authStore.isValid || !pb.authStore.model || !pb.authStore.model.verified) {
    return <div>Lade... (oder redirect)</div>; // Placeholder während Check
  }

  return children;
};

export default AuthGuard;