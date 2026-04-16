import {
  ActionIcon,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconBrain, IconMessageCircleBolt, IconSend } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { PageHeader } from '../components/page-header';
import { gatewayApiClient } from '../lib/api-client';
import {
  type StoredConversation,
  loadConversations,
  saveConversation,
} from '../lib/chat-store';
import { useRuntimeConfig } from '../lib/use-runtime-config';

const modelOptions = [
  { value: 'z-ai/glm-4.6', label: 'GLM 4.6' },
  { value: 'z-ai/glm-4.6:thinking', label: 'GLM 4.6 Thinking' },
];

function createConversation(model: string): StoredConversation {
  return {
    id: crypto.randomUUID(),
    title: 'New conversation',
    model,
    providerId: 'nanogpt',
    messages: [],
    updatedAt: new Date().toISOString(),
  };
}

export function ChatPage() {
  const runtimeConfigQuery = useRuntimeConfig();
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('z-ai/glm-4.6:thinking');
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations()
      .then((storedConversations) => {
        setConversations(storedConversations);
        setActiveConversationId(storedConversations[0]?.id ?? null);
      })
      .catch(() => {
        setConversations([]);
      });
  }, []);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ?? null;

  const chatMutation = useMutation({
    mutationFn: async (nextPrompt: string) => {
      const currentConversation = activeConversation ?? createConversation(model);
      const nextConversation: StoredConversation = {
        ...currentConversation,
        model,
        messages: [
          ...currentConversation.messages,
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: nextPrompt,
            createdAt: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
        title: nextPrompt.slice(0, 48) || 'Conversation',
      };

      const response = await gatewayApiClient.chat({
        providerId: 'nanogpt',
        model,
        stream: false,
        messages: nextConversation.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });

      const updatedConversation: StoredConversation = {
        ...nextConversation,
        messages: [
          ...nextConversation.messages,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: response.message.content,
            reasoning: response.message.reasoning,
            createdAt: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };

      await saveConversation(updatedConversation);
      return updatedConversation;
    },
    onSuccess: (updatedConversation) => {
      setPrompt('');
      setConversations((current) => {
        const withoutCurrent = current.filter((entry) => entry.id !== updatedConversation.id);
        return [updatedConversation, ...withoutCurrent];
      });
      setActiveConversationId(updatedConversation.id);
    },
  });

  return (
    <>
      <PageHeader
        title="Chat Lab"
        description="A lightweight provider test surface with local IndexedDB persistence and optional reasoning display when thinking models expose it."
      />

      <Grid>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card className="section-card" h="100%">
            <Group justify="space-between" mb="md">
              <Title order={3}>Local conversations</Title>
              <ActionIcon
                aria-label="Create conversation"
                onClick={() => {
                  const conversation = createConversation(model);
                  setConversations((current) => [conversation, ...current]);
                  setActiveConversationId(conversation.id);
                }}
                variant="light"
              >
                <IconMessageCircleBolt size={18} />
              </ActionIcon>
            </Group>
            <Stack gap="sm">
              {conversations.length === 0 ? (
                <Text c="dimmed" size="sm">
                  No local chat history yet. Conversations are stored only in this browser via IndexedDB.
                </Text>
              ) : (
                conversations.map((conversation) => (
                  <Button
                    key={conversation.id}
                    justify="space-between"
                    onClick={() => setActiveConversationId(conversation.id)}
                    variant={conversation.id === activeConversationId ? 'filled' : 'light'}
                  >
                    {conversation.title}
                  </Button>
                ))
              )}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Card className="section-card">
            <Group justify="space-between" align="start" mb="lg">
              <Stack gap={4}>
                <Title order={3}>Provider test surface</Title>
                <Text c="dimmed" size="sm">
                  Runtime gateway status: {runtimeConfigQuery.data?.gatewayOnline ? 'online' : 'offline'}
                </Text>
              </Stack>
              <Select
                data={modelOptions}
                onChange={(value) => setModel(value ?? 'z-ai/glm-4.6:thinking')}
                value={model}
                w={240}
              />
            </Group>

            <Stack gap="md">
              <div className="chat-scroll">
                {activeConversation?.messages.length ? (
                  activeConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`chat-bubble ${message.role === 'assistant' ? 'assistant' : 'user'}`}
                    >
                      <Group justify="space-between" mb="xs">
                        <Text fw={700} tt="capitalize">
                          {message.role}
                        </Text>
                        {message.reasoning ? (
                          <ThemeIcon color="brass" radius="xl" size="sm" variant="light">
                            <IconBrain size={14} />
                          </ThemeIcon>
                        ) : null}
                      </Group>
                      {message.reasoning && model.includes('thinking') ? (
                        <Card className="reasoning-card" mb="sm" p="sm">
                          <Text size="xs" fw={700} tt="uppercase">
                            Reasoning
                          </Text>
                          <Text size="sm" c="dimmed">
                            {message.reasoning}
                          </Text>
                        </Card>
                      ) : null}
                      <Text>{message.content}</Text>
                    </div>
                  ))
                ) : (
                  <Text c="dimmed" size="sm">
                    Start a conversation to verify provider behavior, model output, and optional thinking traces.
                  </Text>
                )}
                {chatMutation.isPending ? (
                  <Group gap="sm" mt="sm">
                    <Loader color="teal" size="sm" />
                    <Text size="sm" c="dimmed">
                      Waiting for provider response...
                    </Text>
                  </Group>
                ) : null}
              </div>

              <Textarea
                autosize
                minRows={4}
                onChange={(event) => setPrompt(event.currentTarget.value)}
                placeholder="Ask the provider something meaningful..."
                value={prompt}
              />
              <Group justify="space-between">
                <Text c="dimmed" size="sm">
                  Selected provider: NanoGPT
                </Text>
                <Button
                  disabled={!prompt.trim() || !runtimeConfigQuery.data?.gatewayOnline}
                  leftSection={<IconSend size={16} />}
                  loading={chatMutation.isPending}
                  onClick={() => chatMutation.mutate(prompt.trim())}
                >
                  Send
                </Button>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </>
  );
}
