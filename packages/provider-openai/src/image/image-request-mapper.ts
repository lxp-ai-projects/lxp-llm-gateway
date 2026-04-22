import type { GatewayImageGenerationRequest } from '@lxp/contracts';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

export function buildOpenAiImageGenerationBody(
  request: GatewayImageGenerationRequest,
  context: ProviderExecutionContext,
  model: string,
) {
  return {
    model,
    prompt: request.prompt,
    n: request.n,
    size: request.resolution,
    background: request.background,
    quality: request.quality,
    output_format: request.outputFormat,
    output_compression: request.outputCompression,
    user: context.userId,
  };
}
