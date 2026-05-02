import { Badge, Group, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description: string;
  aside?: ReactNode;
  context?: string | null;
};

export function PageHeader({
  title,
  description,
  aside,
  context,
}: PageHeaderProps) {
  return (
    <Group align="end" justify="space-between" mb="lg" className="page-header">
      <Stack gap={4} className="page-header-copy">
        <Text className="page-kicker">Control plane</Text>
        <Title order={1}>{title}</Title>
        <Text c="dimmed" maw={720}>
          {description}
        </Text>
      </Stack>
      {aside || context ? (
        <Stack gap="xs" align="flex-end" className="page-header-aside">
          {context ? (
            <Badge variant="outline" color="ink">
              Active tenant: {context}
            </Badge>
          ) : null}
          {aside ? <div>{aside}</div> : null}
        </Stack>
      ) : null}
    </Group>
  );
}
