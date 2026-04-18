export const CHAT_WINDOW_PAGE_SIZE = 10;
export const CHAT_WINDOW_MAX_RENDERED = 40;
export const CHAT_WINDOW_SCROLL_THRESHOLD_PX = 96;

export type ChatMessageWindow = {
  start: number;
  end: number;
};

export function createInitialChatWindow(
  totalMessages: number,
): ChatMessageWindow {
  const end = Math.max(totalMessages, 0);
  const start = Math.max(0, end - CHAT_WINDOW_PAGE_SIZE);

  return { start, end };
}

export function syncChatWindow(
  window: ChatMessageWindow,
  totalMessages: number,
  options?: { followTail?: boolean },
): ChatMessageWindow {
  if (options?.followTail) {
    return createInitialChatWindow(totalMessages);
  }

  const boundedEnd = Math.min(window.end, totalMessages);
  const visibleCount = Math.max(
    0,
    Math.min(window.end - window.start, CHAT_WINDOW_MAX_RENDERED),
  );
  const boundedStart = Math.max(
    0,
    Math.min(window.start, Math.max(0, boundedEnd - visibleCount)),
  );

  if (boundedEnd <= boundedStart) {
    return createInitialChatWindow(totalMessages);
  }

  return { start: boundedStart, end: boundedEnd };
}

export function canLoadPreviousChatPage(window: ChatMessageWindow): boolean {
  return window.start > 0;
}

export function canLoadNextChatPage(
  window: ChatMessageWindow,
  totalMessages: number,
): boolean {
  return window.end < totalMessages;
}

export function loadPreviousChatPage(
  window: ChatMessageWindow,
  totalMessages: number,
): ChatMessageWindow {
  const nextStart = Math.max(0, window.start - CHAT_WINDOW_PAGE_SIZE);
  let nextEnd = window.end;

  if (nextEnd - nextStart > CHAT_WINDOW_MAX_RENDERED) {
    nextEnd = Math.min(totalMessages, nextStart + CHAT_WINDOW_MAX_RENDERED);
  }

  return { start: nextStart, end: nextEnd };
}

export function loadNextChatPage(
  window: ChatMessageWindow,
  totalMessages: number,
): ChatMessageWindow {
  const nextEnd = Math.min(totalMessages, window.end + CHAT_WINDOW_PAGE_SIZE);
  let nextStart = window.start;

  if (nextEnd - nextStart > CHAT_WINDOW_MAX_RENDERED) {
    nextStart = Math.max(0, nextEnd - CHAT_WINDOW_MAX_RENDERED);
  }

  return { start: nextStart, end: nextEnd };
}
