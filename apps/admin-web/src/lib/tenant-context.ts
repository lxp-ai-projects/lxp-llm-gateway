import type { SessionUser } from './api-client';

function formatTenantLabel(displayName: string, slug: string): string {
  return `${displayName} (${slug})`;
}

export function getActiveTenantLabel(session: SessionUser | null | undefined) {
  const activeTenant = session?.availableTenants?.find(
    (tenant) => tenant.id === session.activeTenantId,
  );

  if (activeTenant) {
    return formatTenantLabel(activeTenant.displayName, activeTenant.slug);
  }

  if (session?.activeTenantSlug) {
    return session.activeTenantSlug;
  }

  return 'Unavailable';
}

export function getTenantOptionLabel(displayName: string, slug: string) {
  return formatTenantLabel(displayName, slug);
}
