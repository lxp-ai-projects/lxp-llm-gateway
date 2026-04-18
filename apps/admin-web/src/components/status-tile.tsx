import { Badge, Card, Group, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

type StatusTileProps = {
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'warning';
  icon?: ReactNode;
};

export function StatusTile({
  label,
  value,
  tone = 'neutral',
  icon,
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
        </Stack>
        <Badge color={badgeColor} variant="light">
          {icon ?? 'live'}
        </Badge>
      </Group>
    </Card>
  );
}
