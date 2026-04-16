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
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconActivityHeartbeat,
  IconBolt,
  IconChartBar,
  IconKey,
  IconLogout,
  IconMessageCircleCog,
  IconShield,
  IconUserCircle,
  IconUsers,
} from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NavLink as RouterNavLink, Outlet, useNavigate } from 'react-router-dom';

import { adminApiClient } from '../lib/api-client';
import { useRuntimeConfig } from '../lib/use-runtime-config';
import { useSession } from '../lib/use-session';

type NavigationItem = {
  label: string;
  to: string;
  icon: typeof IconBolt;
  adminOnly?: boolean;
};

const navigationItems: NavigationItem[] = [
  { label: 'Overview', to: '/app', icon: IconBolt },
  { label: 'Provider Tokens', to: '/app/providers', icon: IconKey },
  { label: 'Profile', to: '/app/profile', icon: IconUserCircle },
  { label: 'Chat Lab', to: '/app/chat', icon: IconMessageCircleCog },
  { label: 'Users', to: '/app/admin/users', icon: IconUsers, adminOnly: true },
  { label: 'Analytics', to: '/app/admin/analytics', icon: IconChartBar, adminOnly: true },
  { label: 'Health', to: '/app/admin/health', icon: IconActivityHeartbeat, adminOnly: true },
];

export function AppShellLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionQuery = useSession();
  const runtimeConfigQuery = useRuntimeConfig();
  const logoutMutation = useMutation({
    mutationFn: () => adminApiClient.logout(),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate('/login');
    },
  });

  const currentUser = sessionQuery.data;
  const isAdmin = currentUser?.roles.includes('admin') ?? false;
  const availableItems = navigationItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <AppShell
      header={{ height: 72 }}
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header className="glass-panel shell-header">
        <Group h="100%" px="lg" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Box>
              <Text fw={700}>lxp-llm-gateway</Text>
              <Text size="sm" c="dimmed">
                Enterprise control plane
              </Text>
            </Box>
          </Group>
          <Group gap="sm">
            <Badge
              color={runtimeConfigQuery.data?.gatewayOnline ? 'moss' : 'red'}
              variant="light"
            >
              {runtimeConfigQuery.data?.gatewayOnline ? 'Gateway online' : 'Gateway offline'}
            </Badge>
            <Badge color={isAdmin ? 'ink' : 'teal'} variant="filled">
              {isAdmin ? 'Admin' : 'User'}
            </Badge>
            <Button
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
          </Stack>
        </AppShell.Section>

        <Divider my="md" />

        <AppShell.Section grow component={ScrollArea}>
          <Stack gap="xs">
            {availableItems.map((item) => (
              <NavLink
                key={item.to}
                component={RouterNavLink}
                description={item.adminOnly ? 'Administrator surface' : 'Workspace surface'}
                label={item.label}
                leftSection={<item.icon size={18} stroke={1.8} />}
                onClick={close}
                to={item.to}
              />
            ))}
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
              Cookie-only browser auth, encrypted provider secrets, and role-aware navigation.
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
