import { Group, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description: string;
  aside?: ReactNode;
};

export function PageHeader({ title, description, aside }: PageHeaderProps) {
  return (
    <Group align="end" justify="space-between" mb="lg">
      <Stack gap={4}>
        <Text className="page-kicker">Control plane</Text>
        <Title order={1}>{title}</Title>
        <Text c="dimmed" maw={720}>
          {description}
        </Text>
      </Stack>
      {aside}
    </Group>
  );
}
