import { Container } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { LoginFormCard } from '../features/auth/components/login-form-card';
import { LoginHeroCard } from '../features/auth/components/login-hero-card';
import {
  adminApiClient,
  SESSION_TIMEOUT_MESSAGE_STORAGE_KEY,
} from '../lib/api-client';
import { useRuntimeConfig } from '../lib/use-runtime-config';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const runtimeConfigQuery = useRuntimeConfig();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [sessionTimeoutMessage, setSessionTimeoutMessage] = useState<
    string | null
  >(null);

  useEffect(() => {
    const message = window.sessionStorage.getItem(
      SESSION_TIMEOUT_MESSAGE_STORAGE_KEY,
    );
    if (!message) {
      return;
    }

    setSessionTimeoutMessage(message);
    window.sessionStorage.removeItem(SESSION_TIMEOUT_MESSAGE_STORAGE_KEY);
  }, []);

  function clearSessionTimeoutMessage() {
    setSessionTimeoutMessage(null);
  }

  function handleEmailChange(value: string) {
    clearSessionTimeoutMessage();
    setEmail(value);
  }

  function handlePasswordChange(value: string) {
    clearSessionTimeoutMessage();
    setPassword(value);
  }

  function handleAcceptedPoliciesChange(value: boolean) {
    clearSessionTimeoutMessage();
    setAcceptedPolicies(value);
  }

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
          <LoginHeroCard />
          <LoginFormCard
            acceptedPolicies={acceptedPolicies}
            email={email}
            forgotPasswordEnabled={Boolean(
              runtimeConfigQuery.data?.forgotPasswordEnabled,
            )}
            isPending={loginMutation.isPending}
            loginErrorMessage={
              loginMutation.isError
                ? loginMutation.error instanceof Error
                  ? loginMutation.error.message
                  : 'Unable to authenticate with the current credentials.'
                : null
            }
            onAcceptedPoliciesChange={handleAcceptedPoliciesChange}
            onEmailChange={handleEmailChange}
            onPasswordChange={handlePasswordChange}
            onSubmit={() => loginMutation.mutate()}
            password={password}
            registrationEnabled={Boolean(
              runtimeConfigQuery.data?.registrationEnabled,
            )}
            sessionTimeoutMessage={sessionTimeoutMessage}
          />
        </div>
      </Container>
    </div>
  );
}
