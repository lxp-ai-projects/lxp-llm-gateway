import { Alert, Button, Card, Center, Container, Stack, Text, Title } from '@mantine/core';
import { IconUserOff } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { useRuntimeConfig } from '../lib/use-runtime-config';

export function RegistrationPage() {
  const runtimeConfigQuery = useRuntimeConfig();

  return (
    <Center mih="100vh" px="md">
      <Container size={520} w="100%">
        <Card className="hero-card">
          <Stack gap="lg">
            <div>
              <Text className="page-kicker">Registration</Text>
              <Title order={1}>Create account</Title>
            </div>
            {runtimeConfigQuery.data?.registrationEnabled ? (
              <Alert color="blue" title="Backend flow pending">
                Self-registration is enabled by runtime config, but the backend registration workflow still
                needs to be implemented.
              </Alert>
            ) : (
              <Alert color="red" icon={<IconUserOff size={18} />} title="Disabled by configuration">
                Registration is currently disabled for this deployment.
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
