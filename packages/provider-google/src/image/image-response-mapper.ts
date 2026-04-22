import type {
  GatewayGeneratedImage,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

export interface GoogleGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
    };
  }>;
  modelVersion?: string;
  promptFeedback?: {
    blockReason?: string;
    [key: string]: unknown;
  };
  responseId?: string;
  usageMetadata?: Record<string, unknown>;
}

export function mapGoogleGenerateContentResponse(
  requestedModel: string,
  context: ProviderExecutionContext,
  payload: GoogleGenerateContentResponse,
): GatewayImageGenerationResponse {
  const images: GatewayGeneratedImage[] = [];
  const textOutputs: string[] = [];

  for (const candidate of payload.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData?.data) {
        images.push({
          b64Json: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        });
        continue;
      }

      if (part.text) {
        textOutputs.push(part.text);
      }
    }
  }

  if (!images.length) {
    throw new Error(
      payload.promptFeedback?.blockReason
        ? `Google Gemini image request was blocked: ${payload.promptFeedback.blockReason}.`
        : 'Google Gemini did not return any image data.',
    );
  }

  return {
    requestId: context.requestId,
    providerId: 'google',
    model: requestedModel,
    images,
    providerMetadata: {
      modelVersion: payload.modelVersion,
      responseId: payload.responseId,
      promptFeedback: payload.promptFeedback,
      textOutputs,
      usageMetadata: payload.usageMetadata,
    },
  };
}
