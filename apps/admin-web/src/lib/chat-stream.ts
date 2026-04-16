export const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 24_000;

export function shouldFlagMissingAssistantContent(content: string): boolean {
  return content.trim().length === 0;
}
