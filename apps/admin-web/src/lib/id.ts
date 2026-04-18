function randomHexSegment(length: number): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

export function createClientId(): string {
  if (typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return [
    randomHexSegment(4),
    randomHexSegment(2),
    randomHexSegment(2),
    randomHexSegment(2),
    randomHexSegment(6),
  ].join('-');
}
