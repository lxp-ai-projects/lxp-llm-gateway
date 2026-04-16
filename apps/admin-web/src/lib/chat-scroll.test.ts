import { describe, expect, it } from 'vitest';

import { scrollChatToBottom, shouldStickToBottom } from './chat-scroll';

describe('chat-scroll', () => {
  it('keeps auto-scroll enabled when the reader is near the bottom', () => {
    expect(shouldStickToBottom(452, 500, 980)).toBe(true);
    expect(shouldStickToBottom(430, 500, 970)).toBe(true);
  });

  it('disables auto-scroll when the reader scrolls meaningfully above the bottom', () => {
    expect(shouldStickToBottom(300, 500, 980)).toBe(false);
  });

  it('scrolls the container to the latest message', () => {
    const container = {
      scrollTop: 120,
      scrollHeight: 900,
    };

    scrollChatToBottom(container);

    expect(container.scrollTop).toBe(900);
  });
});
