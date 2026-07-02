export const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 300_000;

export function shouldFlagMissingAssistantContent(content: string): boolean {
  return content.trim().length === 0;
}

export function isTruncatedAssistantFinishReason(
  finishReason: string | null | undefined,
): boolean {
  if (!finishReason) {
    return false;
  }

  const normalizedFinishReason = finishReason.trim().toLowerCase();
  return (
    normalizedFinishReason === 'length' ||
    normalizedFinishReason === 'max_tokens' ||
    normalizedFinishReason === 'max_output_tokens'
  );
}
