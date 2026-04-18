import { describe, expect, it } from 'vitest';

import { shouldAttemptSessionRefresh } from './http-auth';

describe('http-auth', () => {
  it('retries once on 401 responses', () => {
    expect(shouldAttemptSessionRefresh(401, false)).toBe(true);
  });

  it('does not retry for non-401 responses', () => {
    expect(shouldAttemptSessionRefresh(403, false)).toBe(false);
    expect(shouldAttemptSessionRefresh(500, false)).toBe(false);
  });

  it('does not retry more than once', () => {
    expect(shouldAttemptSessionRefresh(401, true)).toBe(false);
  });
});
