import {
  canLoadNextChatPage,
  canLoadPreviousChatPage,
  CHAT_WINDOW_MAX_RENDERED,
  createInitialChatWindow,
  loadNextChatPage,
  loadPreviousChatPage,
  syncChatWindow,
} from './chat-window';

describe('chat-window', () => {
  it('starts with only the last 10 messages visible', () => {
    expect(createInitialChatWindow(37)).toEqual({ start: 27, end: 37 });
    expect(createInitialChatWindow(6)).toEqual({ start: 0, end: 6 });
  });

  it('loads previous pages and keeps the rendered window bounded', () => {
    let window = createInitialChatWindow(100);

    window = loadPreviousChatPage(window, 100);
    expect(window).toEqual({ start: 80, end: 100 });

    window = loadPreviousChatPage(window, 100);
    window = loadPreviousChatPage(window, 100);
    window = loadPreviousChatPage(window, 100);

    expect(window.end - window.start).toBe(CHAT_WINDOW_MAX_RENDERED);
    expect(window).toEqual({ start: 50, end: 90 });
  });

  it('loads next pages and keeps the rendered window bounded', () => {
    let window = { start: 50, end: 90 };

    window = loadNextChatPage(window, 100);
    expect(window).toEqual({ start: 60, end: 100 });
  });

  it('reports when previous and next pages are available', () => {
    expect(canLoadPreviousChatPage({ start: 0, end: 10 })).toBe(false);
    expect(canLoadPreviousChatPage({ start: 10, end: 20 })).toBe(true);
    expect(canLoadNextChatPage({ start: 0, end: 10 }, 10)).toBe(false);
    expect(canLoadNextChatPage({ start: 0, end: 10 }, 25)).toBe(true);
  });

  it('syncs the existing window after conversation edits or truncation', () => {
    expect(syncChatWindow({ start: 20, end: 40 }, 24)).toEqual({ start: 4, end: 24 });
    expect(syncChatWindow({ start: 20, end: 40 }, 24, { followTail: true })).toEqual({
      start: 14,
      end: 24,
    });
  });
});
