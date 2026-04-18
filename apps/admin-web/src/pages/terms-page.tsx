import {
  Button,
  Card,
  Center,
  Container,
  List,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { Link } from 'react-router-dom';

export function TermsPage() {
  return (
    <Center mih="100vh" px="md">
      <Container size={720} w="100%">
        <Card className="hero-card">
          <Stack gap="lg">
            <div>
              <Text className="page-kicker">Terms</Text>
              <Title order={1}>Terms of service</Title>
            </div>
            <Text c="dimmed">
              This placeholder page gives the SPA the correct legal navigation
              surface while the formal legal copy is still being finalized.
            </Text>
            <List spacing="sm">
              <List.Item>
                Use of provider credentials remains subject to platform policy.
              </List.Item>
              <List.Item>
                Administrative actions are role-bound and auditable by design.
              </List.Item>
              <List.Item>
                Gateway access may be interrupted by a global circuit breaker.
              </List.Item>
            </List>
            <Button component={Link} to="/login" variant="light">
              Back to login
            </Button>
          </Stack>
        </Card>
      </Container>
    </Center>
  );
}
