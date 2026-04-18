import { Group, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description: string;
  aside?: ReactNode;
};

export function PageHeader({ title, description, aside }: PageHeaderProps) {
  return (
    <Group align="end" justify="space-between" mb="lg" className="page-header">
      <Stack gap={4} className="page-header-copy">
        <Text className="page-kicker">Control plane</Text>
        <Title order={1}>{title}</Title>
        <Text c="dimmed" maw={720}>
          {description}
        </Text>
      </Stack>
      {aside ? <div className="page-header-aside">{aside}</div> : null}
    </Group>
  );
}
