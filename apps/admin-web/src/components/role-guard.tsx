import type { PropsWithChildren } from 'react';

import { RoleGuardDenied } from '../features/auth/components/role-guard-denied';
import { useSession } from '../lib/use-session';

type RoleGuardProps = PropsWithChildren<{
  allowedRoles: string[];
}>;

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const session = useSession().data;
  const currentRoles = session?.roles ?? [];
  const currentGlobalRoles = session?.globalRoles ?? [];
  const authorized = allowedRoles.some(
    (role) => currentRoles.includes(role) || currentGlobalRoles.includes(role),
  );

  if (!authorized) {
    return <RoleGuardDenied />;
  }

  return children;
}
