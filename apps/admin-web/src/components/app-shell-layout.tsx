import {
  AppShell,
  Badge,
  Box,
  Burger,
  Button,
  Divider,
  Group,
  NavLink,
  ScrollArea,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useEffect } from 'react';
import {
  IconActivityHeartbeat,
  IconBolt,
  IconChartBar,
  IconKey,
  IconLogout,
  IconMessageCircleCog,
  IconPhoto,
  IconShield,
  IconBuildingEstate,
  IconUserCircle,
  IconUsers,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  NavLink as RouterNavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { adminApiClient, gatewayApiClient } from '../lib/api-client';
import { getActiveTenantLabel, getTenantOptionLabel } from '../lib/tenant-context';
import { useSession } from '../lib/use-session';
import { InstallAppButton } from './install-app-button';

type NavigationItem = {
  label: string;
  to: string;
  icon: typeof IconBolt;
  requiresTenantAdmin?: boolean;
  requiresSuperAdmin?: boolean;
  group: 'workspace' | 'tenant-admin' | 'global-control-plane';
};

const navigationItems: NavigationItem[] = [
  {
    label: 'Overview',
    to: '/app',
    icon: IconBolt,
    group: 'workspace',
  },
  {
    label: 'Provider Tokens',
    to: '/app/providers',
    icon: IconKey,
    group: 'workspace',
  },
  {
    label: 'Profile',
    to: '/app/profile',
    icon: IconUserCircle,
    group: 'workspace',
  },
  {
    label: 'Chat Lab',
    to: '/app/chat',
    icon: IconMessageCircleCog,
    group: 'workspace',
  },
  {
    label: 'Image Lab',
    to: '/app/images',
    icon: IconPhoto,
    group: 'workspace',
  },
  {
    label: 'Users',
    to: '/app/admin/users',
    icon: IconUsers,
    requiresTenantAdmin: true,
    group: 'tenant-admin',
  },
  {
    label: 'Tenants',
    to: '/app/admin/tenants',
    icon: IconBuildingEstate,
    requiresSuperAdmin: true,
    group: 'global-control-plane',
  },
  {
    label: 'Analytics',
    to: '/app/admin/analytics',
    icon: IconChartBar,
    requiresTenantAdmin: true,
    group: 'tenant-admin',
  },
  {
    label: 'Health',
    to: '/app/admin/health',
    icon: IconActivityHeartbeat,
    requiresTenantAdmin: true,
    group: 'tenant-admin',
  },
];

export function AppShellLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionQuery = useSession();
  const gatewayHealthQuery = useQuery({
    queryKey: ['gateway-api-health', 'shell'],
    queryFn: () => gatewayApiClient.getHealth(),
    retry: false,
    refetchInterval: 30000,
  });
  const logoutMutation = useMutation({
    mutationFn: () => adminApiClient.logout(),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate('/login');
    },
  });
  const switchTenantMutation = useMutation({
    mutationFn: (tenantId: string) => adminApiClient.switchActiveTenant(tenantId),
    onSuccess: async (nextSession) => {
      queryClient.setQueryData(['session'], nextSession);
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== 'session',
      });
    },
  });

  const currentUser = sessionQuery.data;
  const isTenantAdmin = currentUser?.roles?.includes('tenant_admin') ?? false;
  const isSuperAdmin =
    currentUser?.globalRoles?.includes('super_admin') ?? false;
  const gatewayOnline = gatewayHealthQuery.data?.status === 'ok';
  const availableTenants = currentUser?.availableTenants ?? [];
  const activeTenantLabel = getActiveTenantLabel(currentUser);
  const tenantOptions = availableTenants.map((tenant) => ({
    value: tenant.id,
    label: getTenantOptionLabel(tenant.displayName, tenant.slug),
    description: tenant.slug,
  }));
  const availableItems = navigationItems.filter(
    (item) =>
      (!item.requiresTenantAdmin || isTenantAdmin || isSuperAdmin) &&
      (!item.requiresSuperAdmin || isSuperAdmin),
  );
  const workspaceItems = availableItems.filter(
    (item) => item.group === 'workspace',
  );
  const tenantAdminItems = availableItems.filter(
    (item) => item.group === 'tenant-admin',
  );
  const globalControlPlaneItems = availableItems.filter(
    (item) => item.group === 'global-control-plane',
  );

  useEffect(() => {
    const scrollTo = window.scrollTo as typeof window.scrollTo & {
      mock?: unknown;
    };

    if (
      typeof scrollTo === 'function' &&
      (scrollTo.mock || !window.navigator.userAgent.toLowerCase().includes('jsdom'))
    ) {
      scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [location.pathname]);

  function isNavigationItemActive(path: string): boolean {
    if (path === '/app') {
      return location.pathname === '/app';
    }

    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  }

  return (
    <AppShell
      header={{ height: 72 }}
      navbar={{
        width: { base: '100%', sm: 280 },
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header className="glass-panel shell-header">
        <Group
          className="shell-header-inner"
          h="100%"
          px="lg"
          justify="space-between"
          wrap="nowrap"
        >
          <Group className="shell-brand-group" gap="sm" wrap="nowrap">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Box className="shell-brand-copy">
              <Text className="shell-title" fw={700}>
                lxp-llm-gateway
              </Text>
              <Text className="shell-subtitle" size="sm" c="dimmed">
                Enterprise control plane
              </Text>
            </Box>
          </Group>
          <Group className="shell-actions" gap="sm" wrap="nowrap">
            <InstallAppButton />
            <Stack className="shell-status-stack" gap={4}>
              <Badge
                className="shell-status-badge"
                color={gatewayOnline ? 'moss' : 'red'}
                variant="light"
              >
                {gatewayOnline ? 'Gateway online' : 'Gateway offline'}
              </Badge>
              <Group className="shell-status-meta" gap={6} wrap="nowrap">
                <Badge className="shell-tenant-badge" variant="outline" color="ink">
                  Active tenant: {activeTenantLabel}
                </Badge>
                <Badge
                  className="shell-role-badge"
                  color={isSuperAdmin ? 'grape' : isTenantAdmin ? 'ink' : 'teal'}
                  variant="filled"
                >
                  {isSuperAdmin ? 'Super admin' : isTenantAdmin ? 'Tenant admin' : 'User'}
                </Badge>
              </Group>
            </Stack>
            <Button
              visibleFrom="sm"
              leftSection={<IconLogout size={16} />}
              onClick={() => logoutMutation.mutate()}
              loading={logoutMutation.isPending}
              variant="subtle"
            >
              Logout
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className="glass-panel shell-navbar" p="md">
        <AppShell.Section>
          <Stack gap="xs">
            <Text fw={700}>{currentUser?.displayName ?? 'Workspace'}</Text>
            <Text size="sm" c="dimmed">
              {currentUser?.email ?? 'Session profile unavailable'}
            </Text>
            <Text size="sm" c="dimmed">
              Active tenant: {activeTenantLabel}
            </Text>
            {tenantOptions.length > 1 ? (
              <Select
                aria-label="Active tenant"
                data={tenantOptions}
                disabled={switchTenantMutation.isPending}
                onChange={(tenantId) => {
                  if (!tenantId || tenantId === currentUser?.activeTenantId) {
                    return;
                  }

                  switchTenantMutation.mutate(tenantId);
                }}
                value={currentUser?.activeTenantId ?? null}
                w="100%"
              />
            ) : null}
          </Stack>
        </AppShell.Section>

        <Divider my="md" />

        <AppShell.Section grow component={ScrollArea}>
          <Stack gap="md">
            <Stack gap="xs">
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                Workspace surface
              </Text>
              {workspaceItems.map((item) => (
                <NavLink
                  active={isNavigationItemActive(item.to)}
                  key={item.to}
                  component={RouterNavLink}
                  description="Workspace surface"
                  label={item.label}
                  leftSection={<item.icon size={18} stroke={1.8} />}
                  end={item.to === '/app'}
                  onClick={close}
                  to={item.to}
                />
              ))}
            </Stack>

            {tenantAdminItems.length ? (
              <Stack gap="xs">
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Tenant administration surface
                </Text>
                {tenantAdminItems.map((item) => (
                  <NavLink
                    active={isNavigationItemActive(item.to)}
                    key={item.to}
                    component={RouterNavLink}
                    description="Tenant administration surface"
                    label={item.label}
                    leftSection={<item.icon size={18} stroke={1.8} />}
                    onClick={close}
                    to={item.to}
                  />
                ))}
              </Stack>
            ) : null}

            {globalControlPlaneItems.length ? (
              <Stack gap="xs">
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Global control-plane surface
                </Text>
                {globalControlPlaneItems.map((item) => (
                  <NavLink
                    active={isNavigationItemActive(item.to)}
                    key={item.to}
                    component={RouterNavLink}
                    description="Global control-plane surface"
                    label={item.label}
                    leftSection={<item.icon size={18} stroke={1.8} />}
                    onClick={close}
                    to={item.to}
                  />
                ))}
              </Stack>
            ) : null}
          </Stack>
        </AppShell.Section>

        <Divider my="md" />

        <AppShell.Section>
          <Stack gap="xs">
            <Group gap="xs">
              <IconShield size={16} />
              <Text size="sm" fw={600}>
                Security posture
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              Cookie-only browser auth, encrypted provider secrets, and
              role-aware navigation.
            </Text>
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
