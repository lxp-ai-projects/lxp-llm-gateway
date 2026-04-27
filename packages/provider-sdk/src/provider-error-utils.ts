export async function buildProviderHttpError(
  prefix: string,
  response: Response,
  options?: {
    rateLimitFormatter?: (errorText: string, response: Response) => string | null;
    serverErrorFormatter?: (errorText: string, response: Response) => string | null;
  },
): Promise<Error> {
  const errorText = await response.text();
  const formattedRateLimitMessage =
    response.status === 429
      ? options?.rateLimitFormatter?.(errorText, response) ?? null
      : null;
  const formattedServerErrorMessage =
    response.status >= 500
      ? options?.serverErrorFormatter?.(errorText, response) ?? null
      : null;

  return new Error(
    formattedRateLimitMessage ??
      formattedServerErrorMessage ??
      `${prefix} failed with status ${response.status}: ${errorText}`,
  );
}

export async function buildProviderImageHttpError(
  providerLabel: string,
  operation: string,
  response: Response,
  options?: {
    rateLimitFormatter?: (errorText: string, response: Response) => string | null;
    clientErrorFormatter?: (errorText: string, response: Response) => string | null;
  },
): Promise<Error> {
  const errorText = await response.text();
  const formattedRateLimitMessage =
    response.status === 429
      ? options?.rateLimitFormatter?.(errorText, response) ?? null
      : null;
  const formattedClientErrorMessage =
    response.status >= 400 && response.status < 500 && response.status !== 429
      ? options?.clientErrorFormatter?.(errorText, response) ?? null
      : null;

  const genericClientErrorMessage =
    response.status >= 400 && response.status < 500
      ? 'the provider rejected the request. Check the model and image inputs.'
      : 'the provider returned an unexpected error.';

  return new Error(
    `${providerLabel} ${operation} failed with status ${response.status}: ${
      formattedRateLimitMessage ??
      formattedClientErrorMessage ??
      genericClientErrorMessage
    }`,
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

export function formatGoogleGeminiTemporaryUnavailableError(
  errorText: string,
  response: Response,
) {
  try {
    const payload = JSON.parse(errorText) as {
      error?: {
        code?: number;
        message?: string;
        status?: string;
      };
    };
    const error = payload.error;

    if (
      response.status !== 503 &&
      error?.status !== 'UNAVAILABLE' &&
      error?.code !== 503
    ) {
      return null;
    }

    const firstLine = error?.message
      ?.split('\n')
      .map((line) => line.trim())
      .filter(Boolean)[0];

    return `Google Gemini is temporarily unavailable due to high demand${error?.status ? ` (${error.status})` : ''}. ${firstLine ?? 'Please try again in a few moments.'}`;
  } catch {
    if (response.status !== 503) {
      return null;
    }

    return 'Google Gemini is temporarily unavailable due to high demand. Please try again in a few moments.';
  }
}

export function formatOpenAiRateLimitError(errorText: string) {
  try {
    const payload = JSON.parse(errorText) as {
      error?: {
        message?: string;
        type?: string;
      };
    };
    const error = payload.error;

    if (!error?.message) {
      return `OpenAI rate limit exceeded. ${errorText}`;
    }

    return `OpenAI rate limit exceeded${error.type ? ` (${error.type})` : ''}. ${error.message}`;
  } catch {
    return `OpenAI rate limit exceeded. ${errorText}`;
  }
}

export function formatXAiImageClientError(errorText: string) {
  try {
    const payload = JSON.parse(errorText) as {
      code?: string;
      error?: string;
      message?: string;
    };
    const reason = payload.error ?? payload.message;

    if (!reason) {
      return `xAI rejected the request. ${errorText}`;
    }

    if (payload.code) {
      return `${payload.code}. ${reason}`;
    }

    return reason;
  } catch {
    return `xAI rejected the request. ${errorText}`;
  }
}
