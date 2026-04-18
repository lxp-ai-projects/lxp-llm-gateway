import { Button, Group, Stack, Text, Textarea } from '@mantine/core';

type ChatSystemPromptPanelProps = {
  isDirty: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
  onSave: () => void;
  systemPrompt: string;
};

export function ChatSystemPromptPanel({
  isDirty,
  onChange,
  onReset,
  onSave,
  systemPrompt,
}: ChatSystemPromptPanelProps) {
  return (
    <Stack gap="md">
      <Text c="dimmed" size="sm">
        Use this for test-time steering only. It is persisted per local
        conversation and prepended as a `system` message before the chat
        history.
      </Text>
      <Textarea
        autosize
        data-testid="chat-system-prompt-input"
        label="System prompt"
        maxRows={18}
        minRows={8}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder="I am a helpful assistant."
        value={systemPrompt}
      />
      <Group justify="space-between">
        <Text c="dimmed" size="sm">
          Default: helpful assistant with application guardrails.
        </Text>
        <Group>
          <Button
            data-testid="chat-system-prompt-reset"
            onClick={onReset}
            variant="light"
          >
            Reset to default
          </Button>
          <Button
            data-testid="chat-system-prompt-save"
            disabled={!isDirty}
            onClick={onSave}
          >
            Save prompt
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
