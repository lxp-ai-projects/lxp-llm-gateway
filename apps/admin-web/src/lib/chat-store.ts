export type StoredConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  createdAt: string;
};

export type StoredConversation = {
  id: string;
  ownerUserUuid?: string;
  tenantId?: string;
  title: string;
  model: string;
  providerId: string;
  systemPrompt?: string;
  messages: StoredConversationMessage[];
  updatedAt: string;
};

const databaseName = 'lxp-admin-web';
const databaseVersion = 2;
const storeName = 'chat-conversations';

export type ConversationScope = {
  userUuid: string;
  tenantId: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadConversations(
  scope: ConversationScope,
): Promise<StoredConversation[]> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).getAll();

    request.onsuccess = () => {
      const result = (request.result as StoredConversation[])
        .filter(
          (conversation) =>
            conversation.ownerUserUuid === scope.userUuid &&
            conversation.tenantId === scope.tenantId,
        )
        .sort(
        (left, right) => right.updatedAt.localeCompare(left.updatedAt),
      );
      resolve(result);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveConversation(
  conversation: StoredConversation,
): Promise<void> {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(conversation);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).delete(conversationId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
