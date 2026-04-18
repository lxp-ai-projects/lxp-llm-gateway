import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { AuthGuardLoading } from '../features/auth/components/auth-guard-loading';
import { useSession } from '../lib/use-session';

export function AuthGuard({ children }: PropsWithChildren) {
  const location = useLocation();
  const sessionQuery = useSession();

  if (sessionQuery.isPending) {
    return <AuthGuardLoading />;
  }

  if (!sessionQuery.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
