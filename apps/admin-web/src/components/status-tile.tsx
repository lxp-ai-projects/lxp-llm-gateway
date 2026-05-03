import { Badge, Card, Group, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

type StatusTileProps = {
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'warning';
  icon?: ReactNode;
  description?: string;
};

export function StatusTile({
  label,
  value,
  tone = 'neutral',
  icon,
  description,
}: StatusTileProps) {
  const badgeColor =
    tone === 'good' ? 'moss' : tone === 'warning' ? 'yellow' : 'ink';

  return (
    <Card className="status-tile">
      <Group justify="space-between" align="start">
        <Stack gap={6}>
          <Text size="sm" c="dimmed">
            {label}
          </Text>
          <Text fw={700} size="xl">
            {value}
          </Text>
          {description ? (
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          ) : null}
        </Stack>
        <Badge color={badgeColor} variant="light">
          {icon ?? 'live'}
        </Badge>
      </Group>
    </Card>
  );
}
