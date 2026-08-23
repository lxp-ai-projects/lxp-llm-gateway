import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('chat');
  return (
    <Stack gap="md">
      <Text c="dimmed" size="sm">
        {t('chatSystemPromptPanel.useThisForTestTimeSteeringOnly')}
      </Text>
      <Textarea
        autosize
        data-testid="chat-system-prompt-input"
        label={t('chatSystemPromptPanel.systemPrompt')}
        maxRows={18}
        minRows={8}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={t('chatSystemPromptPanel.iAmAHelpfulAssistant')}
        value={systemPrompt}
      />
      <Group justify="space-between">
        <Text c="dimmed" size="sm">
          {t(
            'chatSystemPromptPanel.defaultHelpfulAssistantWithApplicationGuardrails',
          )}
        </Text>
        <Group>
          <Button
            data-testid="chat-system-prompt-reset"
            onClick={onReset}
            variant="light"
          >
            {t('chatSystemPromptPanel.resetToDefault')}
          </Button>
          <Button
            data-testid="chat-system-prompt-save"
            disabled={!isDirty}
            onClick={onSave}
          >
            {t('chatSystemPromptPanel.savePrompt')}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
