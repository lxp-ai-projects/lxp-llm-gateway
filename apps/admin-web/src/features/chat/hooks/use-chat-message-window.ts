import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type UIEvent,
} from 'react';

import {
  scrollChatToBottom,
  shouldStickToBottom,
} from '../../../lib/chat-scroll';
import {
  canLoadNextChatPage,
  canLoadPreviousChatPage,
  CHAT_WINDOW_SCROLL_THRESHOLD_PX,
  createInitialChatWindow,
  loadNextChatPage,
  loadPreviousChatPage,
  syncChatWindow,
  type ChatMessageWindow,
} from '../../../lib/chat-window';
import type { StoredConversation } from '../../../lib/chat-store';

type UseChatMessageWindowOptions = {
  activeConversation: StoredConversation | null;
  isStreaming: boolean;
};

export function useChatMessageWindow({
  activeConversation,
  isStreaming,
}: UseChatMessageWindowOptions) {
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [messageWindow, setMessageWindow] = useState<ChatMessageWindow>({
    start: 0,
    end: 0,
  });
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingAutoScrollFrameRef = useRef<number | null>(null);
  const pendingWindowShiftRef = useRef<null | {
    scrollHeight: number;
    scrollTop: number;
  }>(null);

  useEffect(() => {
    setMessageWindow(
      createInitialChatWindow(activeConversation?.messages.length ?? 0),
    );
  }, [activeConversation?.id]);

  useEffect(() => {
    setMessageWindow((current) =>
      syncChatWindow(current, activeConversation?.messages.length ?? 0, {
        followTail: autoScrollEnabled || isStreaming,
      }),
    );
  }, [activeConversation?.messages.length, autoScrollEnabled, isStreaming]);

  useLayoutEffect(() => {
    const container = chatScrollRef.current;
    if (!container || !autoScrollEnabled) {
      return;
    }

    if (pendingAutoScrollFrameRef.current !== null) {
      cancelAnimationFrame(pendingAutoScrollFrameRef.current);
    }

    pendingAutoScrollFrameRef.current = requestAnimationFrame(() => {
      scrollChatToBottom(container);
      pendingAutoScrollFrameRef.current = null;
    });

    return () => {
      if (pendingAutoScrollFrameRef.current !== null) {
        cancelAnimationFrame(pendingAutoScrollFrameRef.current);
        pendingAutoScrollFrameRef.current = null;
      }
    };
  }, [activeConversation?.messages, autoScrollEnabled, isStreaming]);

  useLayoutEffect(() => {
    const container = chatScrollRef.current;
    const pendingShift = pendingWindowShiftRef.current;

    if (!container || !pendingShift) {
      return;
    }

    container.scrollTop =
      pendingShift.scrollTop +
      (container.scrollHeight - pendingShift.scrollHeight);
    pendingWindowShiftRef.current = null;
  }, [messageWindow.start, messageWindow.end]);

  const renderedMessages = activeConversation
    ? activeConversation.messages.slice(messageWindow.start, messageWindow.end)
    : [];
  const hiddenMessageCountAbove = activeConversation ? messageWindow.start : 0;
  const hiddenMessageCountBelow = activeConversation
    ? Math.max(0, activeConversation.messages.length - messageWindow.end)
    : 0;

  function loadEarlierMessages(): void {
    if (!activeConversation || !canLoadPreviousChatPage(messageWindow)) {
      return;
    }

    const target = chatScrollRef.current;
    if (target) {
      setAutoScrollEnabled(false);
      pendingWindowShiftRef.current = {
        scrollHeight: target.scrollHeight,
        scrollTop: target.scrollTop,
      };
    }

    setMessageWindow((current) =>
      loadPreviousChatPage(current, activeConversation.messages.length),
    );
  }

  function loadNewerMessages(): void {
    if (
      !activeConversation ||
      !canLoadNextChatPage(messageWindow, activeConversation.messages.length)
    ) {
      return;
    }

    const target = chatScrollRef.current;
    if (target) {
      setAutoScrollEnabled(false);
      pendingWindowShiftRef.current = {
        scrollHeight: target.scrollHeight,
        scrollTop: target.scrollTop,
      };
    }

    setMessageWindow((current) =>
      loadNextChatPage(current, activeConversation.messages.length),
    );
  }

  function handleScroll(event: UIEvent<HTMLDivElement>): void {
    const target = event.currentTarget;

    if (
      activeConversation &&
      target.scrollTop <= CHAT_WINDOW_SCROLL_THRESHOLD_PX &&
      canLoadPreviousChatPage(messageWindow)
    ) {
      loadEarlierMessages();
      return;
    }

    if (
      activeConversation &&
      target.scrollHeight - (target.scrollTop + target.clientHeight) <=
        CHAT_WINDOW_SCROLL_THRESHOLD_PX &&
      canLoadNextChatPage(messageWindow, activeConversation.messages.length)
    ) {
      loadNewerMessages();
      return;
    }

    setAutoScrollEnabled(
      shouldStickToBottom(
        target.scrollTop,
        target.clientHeight,
        target.scrollHeight,
      ),
    );
  }

  return {
    chatScrollRef,
    hiddenMessageCountAbove,
    hiddenMessageCountBelow,
    loadEarlierMessages,
    loadNewerMessages,
    renderedMessages,
    setAutoScrollEnabled,
    handleScroll,
  };
}
