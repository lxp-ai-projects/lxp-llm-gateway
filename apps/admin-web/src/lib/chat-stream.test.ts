import { describe, expect, it } from 'vitest';

import {
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
  shouldFlagMissingAssistantContent,
} from './chat-stream';

describe('chat-stream', () => {
  it('uses a 24 second inactivity timeout by default', () => {
    expect(DEFAULT_STREAM_IDLE_TIMEOUT_MS).toBe(24_000);
  });

  it('flags empty assistant content as anomalous', () => {
    expect(shouldFlagMissingAssistantContent('')).toBe(true);
    expect(shouldFlagMissingAssistantContent('   \n')).toBe(true);
  });

  it('accepts non-empty assistant content', () => {
    expect(shouldFlagMissingAssistantContent('Hello there')).toBe(false);
  });
});
