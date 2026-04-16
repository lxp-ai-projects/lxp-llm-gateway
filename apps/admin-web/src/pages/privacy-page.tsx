import { Button, Card, Center, Container, List, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';

export function PrivacyPage() {
  return (
    <Center mih="100vh" px="md">
      <Container size={720} w="100%">
        <Card className="hero-card">
          <Stack gap="lg">
            <div>
              <Text className="page-kicker">Privacy</Text>
              <Title order={1}>Privacy posture</Title>
            </div>
            <Text c="dimmed">
              This placeholder page reflects the initial security direction already baked into the backend:
              encrypted provider credentials, hashed identity correlation, and cookie-only browser auth.
            </Text>
            <List spacing="sm">
              <List.Item>Provider API secrets are encrypted at rest.</List.Item>
              <List.Item>Browser sessions avoid token exposure to JavaScript.</List.Item>
              <List.Item>User identity resolution for gateway traffic relies on `emailHash`.</List.Item>
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
