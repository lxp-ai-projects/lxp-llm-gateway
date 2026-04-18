import {
  Alert,
  Anchor,
  Button,
  Card,
  Checkbox,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconLockPassword } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

type LoginFormCardProps = {
  acceptedPolicies: boolean;
  email: string;
  forgotPasswordEnabled: boolean;
  isPending: boolean;
  loginErrorMessage: string | null;
  onAcceptedPoliciesChange: (value: boolean) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  password: string;
  registrationEnabled: boolean;
  sessionTimeoutMessage: string | null;
};

export function LoginFormCard({
  acceptedPolicies,
  email,
  forgotPasswordEnabled,
  isPending,
  loginErrorMessage,
  onAcceptedPoliciesChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  password,
  registrationEnabled,
  sessionTimeoutMessage,
}: LoginFormCardProps) {
  return (
    <Card className="hero-card auth-form-card">
      <Stack gap="lg">
        <div>
          <Text className="page-kicker">Login</Text>
          <Title order={2}>Welcome back</Title>
        </div>

        {loginErrorMessage ? (
          <Alert color="red" icon={<IconAlertCircle size={18} />} title="Login failed">
            {loginErrorMessage}
          </Alert>
        ) : null}

        {sessionTimeoutMessage ? (
          <Alert color="amber" icon={<IconAlertCircle size={18} />} title="Session expired">
            {sessionTimeoutMessage}
          </Alert>
        ) : null}

        <TextInput
          data-testid="auth-login-email"
          label="Email"
          onChange={(event) => onEmailChange(event.currentTarget.value)}
          placeholder="patrick@example.com"
          value={email}
        />
        <PasswordInput
          data-testid="auth-login-password"
          label="Password"
          onChange={(event) => onPasswordChange(event.currentTarget.value)}
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
          onChange={(event) => onAcceptedPoliciesChange(event.currentTarget.checked)}
        />
        <Button
          data-testid="auth-login-submit"
          disabled={!acceptedPolicies || !email || !password}
          leftSection={<IconLockPassword size={16} />}
          loading={isPending}
          onClick={onSubmit}
          size="md"
        >
          Sign in
        </Button>

        <Group className="auth-links-row" justify="space-between">
          {registrationEnabled ? (
            <Anchor component={Link} to="/register">
              Create account
            </Anchor>
          ) : (
            <Text c="dimmed" size="sm">
              Registration disabled
            </Text>
          )}
          {forgotPasswordEnabled ? (
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
  );
}
