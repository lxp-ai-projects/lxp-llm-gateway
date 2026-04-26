import type {
  CanonicalImageProviderCatalog,
  ImageModelDescriptor,
} from '@lxp/provider-sdk';

import type { NanoGptImageModelRecord } from './api-client.js';

const NANO_GPT_MULTI_IMAGE_MODELS = new Set([
  'flux-kontext',
  'flux-kontext/dev',
  'gpt-4o-image',
  'gpt-image-1',
]);

export function buildNanoGptImageCatalog(input: {
  subscriptionModels: NanoGptImageModelRecord[];
  paidModels: NanoGptImageModelRecord[];
  allModels?: NanoGptImageModelRecord[];
}): CanonicalImageProviderCatalog {
  const mergedModels = new Map<string, NanoGptImageModelRecord>();
  const subscriptionModelIds = new Set<string>(
    input.subscriptionModels.map((model) => model.id),
  );
  const paidModelIds = new Set<string>(input.paidModels.map((model) => model.id));

  for (const model of input.allModels ?? []) {
    mergedModels.set(model.id, model);
  }

  for (const model of input.subscriptionModels) {
    mergedModels.set(model.id, model);
  }

  for (const model of input.paidModels) {
    mergedModels.set(model.id, model);
  }

  const models = Array.from(mergedModels.values())
    .filter((model) => model.category === 'image' || model.capabilities?.image_generation)
    .map((model) =>
      toImageModelDescriptor(
        model,
        paidModelIds.has(model.id) && !subscriptionModelIds.has(model.id),
      ),
    );

  return {
    providerId: 'nanogpt',
    defaultModelId:
      models.find((model) => !model.capabilities.requiresPaidAccess)?.id ??
      models[0]?.id ??
      null,
    models,
  };
}

function toImageModelDescriptor(
  model: NanoGptImageModelRecord,
  requiresPaidAccess: boolean,
): ImageModelDescriptor {
  const resolutions = model.supported_parameters?.resolutions ?? [];
  const maxImages =
    model.supported_parameters?.fixed_image_count ??
    model.supported_parameters?.max_images;
  const supportsEditing = Boolean(
    model.capabilities?.image_to_image || model.capabilities?.inpainting,
  );

  return {
    id: model.id,
    displayName: model.name ?? model.id,
    lifecycleStatus: resolveLifecycleStatus(model),
    capabilities: {
      supportsStreaming: false,
      supportsImageGeneration: model.capabilities?.image_generation ?? true,
      supportsImageEditing: supportsEditing,
      requiresPaidAccess,
      supportedImageResponseFormats: ['url', 'b64_json'],
      supportedImageResolutions: resolutions.map((resolution) => ({
        value: resolution,
        label: resolution,
      })),
      ...(typeof maxImages === 'number'
        ? { maxGeneratedImagesPerRequest: maxImages }
        : {}),
      ...(supportsEditing
        ? {
            maxReferenceImagesPerRequest: NANO_GPT_MULTI_IMAGE_MODELS.has(model.id)
              ? 5
              : 1,
          }
        : {}),
      imageDefaults: {
        responseFormat: 'b64_json',
        resolution: resolutions[0],
        imageCount: model.supported_parameters?.fixed_image_count ?? 1,
      },
    },
  };
}

function resolveLifecycleStatus(
  model: NanoGptImageModelRecord,
): ImageModelDescriptor['lifecycleStatus'] {
  if (model.tags?.includes('preview')) {
    return 'preview';
  }

  if (model.tags?.includes('deprecated')) {
    return 'deprecated';
  }

  return 'active';
}
