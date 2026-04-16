import {
  Alert,
  Anchor,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconLockPassword } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { adminApiClient } from '../lib/api-client';
import { useRuntimeConfig } from '../lib/use-runtime-config';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const runtimeConfigQuery = useRuntimeConfig();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const loginMutation = useMutation({
    mutationFn: () => adminApiClient.login({ email, password }),
    onSuccess: async (session) => {
      queryClient.setQueryData(['session'], session);
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate((location.state as { from?: string } | null)?.from ?? '/app');
    },
  });

  return (
    <div className="auth-page">
      <Container size={1180}>
        <div className="auth-grid">
          <Card className="hero-card auth-story">
            <Stack gap="xl">
              <div>
                <Text className="page-kicker">Secure control plane</Text>
                <Title order={1}>Operate the gateway without softening the security posture.</Title>
                <Text c="dimmed" mt="md" size="lg">
                  Role-aware navigation, encrypted provider secrets, and browser auth carried entirely by
                  `HttpOnly` cookies.
                </Text>
              </div>
              <div className="hero-highlight">
                <Text fw={700}>Phase 1 experience</Text>
                <Text c="dimmed" mt="xs">
                  Admins see operational controls and user management. Standard users see only what they need
                  to manage provider access and validate model behavior.
                </Text>
              </div>
            </Stack>
          </Card>

          <Card className="hero-card auth-form-card">
            <Stack gap="lg">
              <div>
                <Text className="page-kicker">Login</Text>
                <Title order={2}>Welcome back</Title>
              </div>

              {loginMutation.isError ? (
                <Alert color="red" icon={<IconAlertCircle size={18} />} title="Login failed">
                  {loginMutation.error instanceof Error
                    ? loginMutation.error.message
                    : 'Unable to authenticate with the current credentials.'}
                </Alert>
              ) : null}

              <TextInput
                label="Email"
                onChange={(event) => setEmail(event.currentTarget.value)}
                placeholder="patrick@example.com"
                value={email}
              />
              <PasswordInput
                label="Password"
                onChange={(event) => setPassword(event.currentTarget.value)}
                placeholder="Your password"
                value={password}
              />
              <Checkbox
                checked={acceptedPolicies}
                label={
                  <Text size="sm">
                    I accept the <Anchor component={Link} to="/terms">terms</Anchor> and{' '}
                    <Anchor component={Link} to="/privacy">privacy policy</Anchor>.
                  </Text>
                }
                onChange={(event) => setAcceptedPolicies(event.currentTarget.checked)}
              />
              <Button
                disabled={!acceptedPolicies || !email || !password}
                leftSection={<IconLockPassword size={16} />}
                loading={loginMutation.isPending}
                onClick={() => loginMutation.mutate()}
                size="md"
              >
                Sign in
              </Button>

              <Group className="auth-links-row" justify="space-between">
                {runtimeConfigQuery.data?.registrationEnabled ? (
                  <Anchor component={Link} to="/register">
                    Create account
                  </Anchor>
                ) : (
                  <Text c="dimmed" size="sm">
                    Registration disabled
                  </Text>
                )}
                {runtimeConfigQuery.data?.forgotPasswordEnabled ? (
                  <Anchor component={Link} to="/forgot-password">
                    Forgot password
                  </Anchor>
                ) : (
                  <Text c="dimmed" size="sm">
                    Recovery disabled
                  </Text>
                )}
              </Group>
            </Stack>
          </Card>
        </div>
      </Container>
    </div>
  );
}
