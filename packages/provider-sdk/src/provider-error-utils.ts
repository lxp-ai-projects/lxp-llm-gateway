export async function buildProviderHttpError(
  prefix: string,
  response: Response,
  options?: {
    rateLimitFormatter?: (errorText: string, response: Response) => string | null;
  },
): Promise<Error> {
  const errorText = await response.text();
  const formattedRateLimitMessage =
    response.status === 429
      ? options?.rateLimitFormatter?.(errorText, response) ?? null
      : null;

  return new Error(
    formattedRateLimitMessage ??
      `${prefix} failed with status ${response.status}: ${errorText}`,
  );
}

export function formatGoogleGeminiRateLimitError(errorText: string) {
  try {
    const payload = JSON.parse(errorText) as {
      error?: {
        message?: string;
        status?: string;
        details?: Array<{
          ['@type']?: string;
          retryDelay?: string;
          links?: Array<{ url?: string }>;
        }>;
      };
    };
    const error = payload.error;
    if (!error) {
      return `Google Gemini quota exceeded. ${errorText}`;
    }

    const retryDelay = error.details?.find(
      (detail) => detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo',
    )?.retryDelay;
    const helpUrl =
      error.details
        ?.find((detail) => detail['@type'] === 'type.googleapis.com/google.rpc.Help')
        ?.links?.[0]?.url ?? 'https://ai.google.dev/gemini-api/docs/rate-limits';
    const firstLine = error.message
      ?.split('\n')
      .map((line) => line.trim())
      .filter(Boolean)[0];

    return `Google Gemini quota exceeded (${error.status ?? 'RESOURCE_EXHAUSTED'}). ${firstLine ?? 'Check your plan, billing, and current usage.'}${retryDelay ? ` Retry in ${retryDelay}.` : ''} Rate limits: ${helpUrl}`;
  } catch {
    return `Google Gemini quota exceeded. ${errorText}`;
  }
}
