import { beforeEach, expect, test, vi } from 'vitest';

import { createClientId } from './id';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('createClientId uses crypto.randomUUID when available', () => {
  const randomUuidMock = vi.fn(() => 'uuid-value');
  vi.stubGlobal('crypto', {
    randomUUID: randomUuidMock,
    getRandomValues: vi.fn(),
  });

  expect(createClientId()).toBe('uuid-value');
  expect(randomUuidMock).toHaveBeenCalled();
});

test('createClientId falls back to random hex segments when randomUUID is unavailable', () => {
  const getRandomValuesMock = vi.fn((bytes: Uint8Array) => {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = index;
    }
    return bytes;
  });

  vi.stubGlobal('crypto', {
    getRandomValues: getRandomValuesMock,
  });

  expect(createClientId()).toBe('00010203-0001-0001-0001-000102030405');
  expect(getRandomValuesMock).toHaveBeenCalledTimes(5);
});
