import { Button, Group, Loader, Text, Textarea } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import type { CSSProperties, KeyboardEvent } from 'react';

type ChatComposerProps = {
  composerViewportStyle: Pick<CSSProperties, 'left' | 'width'>;
  disabled: boolean;
  isStreaming: boolean;
  onPromptChange: (value: string) => void;
  onPromptSubmit: () => void;
  prompt: string;
};

export function ChatComposer({
  composerViewportStyle,
  disabled,
  isStreaming,
  onPromptChange,
  onPromptSubmit,
  prompt,
}: ChatComposerProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onPromptSubmit();
    }
  }

  return (
    <div className="chat-composer-shell" style={composerViewportStyle}>
      <div className="chat-composer-card">
        <Textarea
          autosize
          className="chat-composer-input"
          data-testid="chat-composer-input"
          maxRows={10}
          minRows={1}
          onChange={(event) => onPromptChange(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the provider something meaningful..."
          value={prompt}
        />
        <Group className="chat-composer-footer" justify="space-between" gap="sm">
          <Group gap="sm">
            <Text c="dimmed" size="sm">
              Selected provider: NanoGPT
            </Text>
            {isStreaming ? (
              <Group gap={6}>
                <Loader color="teal" size="xs" />
                <Text c="dimmed" size="sm">
                  Streaming response...
                </Text>
              </Group>
            ) : null}
          </Group>
          <Button
            data-testid="chat-send-button"
            disabled={disabled}
            leftSection={<IconSend size={16} />}
            loading={isStreaming}
            onClick={onPromptSubmit}
          >
            Send
          </Button>
        </Group>
      </div>
    </div>
  );
}
