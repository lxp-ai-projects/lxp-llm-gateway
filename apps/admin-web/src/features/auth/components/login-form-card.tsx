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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('auth');
  return (
    <Card
      className="auth-form-card"
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Stack gap="lg">
        <div>
          <Text className="auth-form-kicker">{t('login.kicker')}</Text>
          <Title order={2}>{t('login.title')}</Title>
          <Text c="dimmed" mt="xs">
            {t('login.description')}
          </Text>
        </div>

        {loginErrorMessage ? (
          <Alert
            color="red"
            icon={<IconAlertCircle size={18} />}
            title={t('login.failed')}
          >
            {loginErrorMessage}
          </Alert>
        ) : null}

        {sessionTimeoutMessage ? (
          <Alert
            color="amber"
            icon={<IconAlertCircle size={18} />}
            title={t('session.expired')}
          >
            {sessionTimeoutMessage}
          </Alert>
        ) : null}

        <TextInput
          data-testid="auth-login-email"
          label={t('login.email')}
          onChange={(event) => onEmailChange(event.currentTarget.value)}
          placeholder={t('login.emailPlaceholder')}
          value={email}
        />
        <PasswordInput
          data-testid="auth-login-password"
          label={t('login.password')}
          onChange={(event) => onPasswordChange(event.currentTarget.value)}
          placeholder={t('login.passwordPlaceholder')}
          value={password}
        />
        <Checkbox
          checked={acceptedPolicies}
          label={
            <Text size="sm">
              {t('login.acceptPrefix')}{' '}
              <Anchor component={Link} to="/terms">
                {t('login.terms')}
              </Anchor>{' '}
              {t('login.conjunction')}{' '}
              <Anchor component={Link} to="/privacy">
                {t('login.privacy')}
              </Anchor>
              .
            </Text>
          }
          onChange={(event) =>
            onAcceptedPoliciesChange(event.currentTarget.checked)
          }
        />
        <Button
          data-testid="auth-login-submit"
          disabled={!acceptedPolicies || !email || !password}
          leftSection={<IconLockPassword size={16} />}
          loading={isPending}
          size="md"
          type="submit"
        >
          {t('login.submit')}
        </Button>

        <Group className="auth-links-row" justify="space-between">
          {registrationEnabled ? (
            <Anchor component={Link} to="/register">
              {t('login.createAccount')}
            </Anchor>
          ) : (
            <Text c="dimmed" size="sm">
              {t('login.registrationDisabled')}
            </Text>
          )}
          {forgotPasswordEnabled ? (
            <Anchor component={Link} to="/forgot-password">
              {t('login.forgotPassword')}
            </Anchor>
          ) : (
            <Text c="dimmed" size="sm">
              {t('login.recoveryDisabled')}
            </Text>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
