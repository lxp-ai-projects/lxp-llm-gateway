import { Alert, Button, Card, Center, Container, Stack, Text, Title } from '@mantine/core';
import { IconMailOff } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { useRuntimeConfig } from '../lib/use-runtime-config';

export function ForgotPasswordPage() {
  const runtimeConfigQuery = useRuntimeConfig();

  return (
    <Center mih="100vh" px="md">
      <Container size={520} w="100%">
        <Card className="hero-card">
          <Stack gap="lg">
            <div>
              <Text className="page-kicker">Account recovery</Text>
              <Title order={1}>Forgot password</Title>
              <Text c="dimmed" mt="sm">
                This route is controlled by backend runtime configuration.
              </Text>
            </div>
            {runtimeConfigQuery.data?.forgotPasswordEnabled ? (
              <Alert color="blue" title="Backend endpoint pending">
                The UI surface is ready, but the password recovery backend flow has not been implemented yet.
              </Alert>
            ) : (
              <Alert color="red" icon={<IconMailOff size={18} />} title="Disabled by configuration">
                Forgot-password is currently disabled for this deployment.
              </Alert>
            )}
            <Button component={Link} to="/login" variant="light">
              Back to login
            </Button>
          </Stack>
        </Card>
      </Container>
    </Center>
  );
}
