export type ConversationTransferMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  createdAt: string;
};

export type ConversationTransferConversation = {
  id: string;
  title: string;
  model: string;
  providerId: string;
  systemPrompt?: string;
  messages: ConversationTransferMessage[];
  updatedAt: string;
};

export type ConversationTransferDocument = {
  format: 'lxp-chat-conversation';
  version: 1;
  exportedAt: string;
  conversation: ConversationTransferConversation;
};
