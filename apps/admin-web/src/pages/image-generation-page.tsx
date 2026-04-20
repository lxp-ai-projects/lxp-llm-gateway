import {
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  HoverCard,
  Image,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import {
  IconInfoCircle,
  IconPhoto,
  IconSparkles,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { PageHeader } from '../components/page-header';
import { gatewayApiClient, adminApiClient } from '../lib/api-client';
import type { GatewayImageReference } from '../lib/api-client';
import type {
  GatewayGeneratedImage,
  ImageAspectRatioOption,
  ImageResolutionOption,
} from '../lib/api-client.types';
import { useRuntimeConfig } from '../lib/use-runtime-config';
import {
  buildDefaultModelOptions,
  buildProviderOptions,
} from '../features/providers/lib/provider-utils';

type ReferenceImageItem = GatewayImageReference & {
  id: string;
  label: string;
};

const IMAGE_PROVIDER_IDS = ['google', 'xai'] as const;
const DEFAULT_IMAGE_MODELS: Record<(typeof IMAGE_PROVIDER_IDS)[number], string> = {
  google: 'gemini-2.5-flash-image',
  xai: 'grok-imagine-image',
};
const ALLOWED_XAI_IMAGE_MODEL_IDS = new Set([
  'grok-imagine-image',
  'grok-imagine-image-pro',
]);
const ALLOWED_GOOGLE_IMAGE_MODEL_IDS = new Set([
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
]);
const RESPONSE_FORMAT_OPTIONS = [
  { value: 'url', label: 'Hosted URL' },
  { value: 'b64_json', label: 'Base64' },
];
const DEFAULT_IMAGE_COUNT_LIMIT = 4;
const DEFAULT_REFERENCE_IMAGE_LIMIT = 5;
const GOOGLE_REFERENCE_IMAGE_NOTE =
  'Google image editing accepts uploaded files, pasted data URLs, and public HTTPS image URLs. Local, private, or unsupported remote targets are blocked by the gateway.';

export function ImageGenerationPage() {
  const runtimeConfigQuery = useRuntimeConfig();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [providerId, setProviderId] = useState('xai');
  const [model, setModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('auto');
  const [responseFormat, setResponseFormat] = useState<'url' | 'b64_json'>(
    'url',
  );
  const [resolution, setResolution] = useState('');
  const [imageCount, setImageCount] = useState('1');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [references, setReferences] = useState<ReferenceImageItem[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [results, setResults] = useState<GatewayGeneratedImage[]>([]);
  const providerSettingsQuery = useQuery({
    queryKey: ['own-provider-settings'],
    queryFn: () => adminApiClient.getOwnProviderSettings(),
  });
  const supportedProviders = runtimeConfigQuery.data?.supportedProviders ?? [];
  const imageProviderOptions = useMemo(
    () =>
      buildProviderOptions(
        supportedProviders.filter((provider) =>
          IMAGE_PROVIDER_IDS.includes(
            provider.providerId as (typeof IMAGE_PROVIDER_IDS)[number],
          ),
        ),
      ),
    [supportedProviders],
  );
  const modelsQuery = useQuery({
    queryKey: ['image-models', providerId],
    queryFn: () => gatewayApiClient.getModels(providerId || undefined),
    enabled: Boolean(providerId),
  });
  const imageCapableModels = useMemo(
    () =>
      (modelsQuery.data?.models ?? []).filter(
        (providerModel) =>
          (providerModel.capabilities?.supportsImageGeneration ||
            providerModel.capabilities?.supportsImageEditing) &&
          (providerId !== 'xai' ||
            ALLOWED_XAI_IMAGE_MODEL_IDS.has(providerModel.id)) &&
          (providerId !== 'google' ||
            ALLOWED_GOOGLE_IMAGE_MODEL_IDS.has(providerModel.id)),
      ),
    [modelsQuery.data?.models, providerId],
  );

  const modelOptions = useMemo(
    () => buildDefaultModelOptions(imageCapableModels),
    [imageCapableModels],
  );

  const selectedModel = useMemo(
    () => imageCapableModels.find((providerModel) => providerModel.id === model),
    [imageCapableModels, model],
  );

  const aspectRatioOptions = useMemo(
    () =>
      buildAspectRatioOptions(
        selectedModel?.capabilities?.supportedImageAspectRatios,
      ),
    [selectedModel?.capabilities?.supportedImageAspectRatios],
  );
  const supportedAspectRatios =
    selectedModel?.capabilities?.supportedImageAspectRatios ?? [];
  const responseFormatOptions = useMemo(
    () =>
      buildResponseFormatOptions(
        selectedModel?.capabilities?.supportedImageResponseFormats,
      ),
    [selectedModel?.capabilities?.supportedImageResponseFormats],
  );
  const resolutionOptions = useMemo(
    () =>
      buildResolutionOptions(
        selectedModel?.capabilities?.supportedImageResolutions,
      ),
    [selectedModel?.capabilities?.supportedImageResolutions],
  );
  const imageCountOptions = useMemo(
    () =>
      buildImageCountOptions(
        selectedModel?.capabilities?.maxGeneratedImagesPerRequest,
      ),
    [selectedModel?.capabilities?.maxGeneratedImagesPerRequest],
  );
  const maxReferenceImages =
    selectedModel?.capabilities?.maxReferenceImagesPerRequest ??
    DEFAULT_REFERENCE_IMAGE_LIMIT;

  useEffect(() => {
    if (providerId) {
      return;
    }

    const defaultProviderId =
      providerSettingsQuery.data?.defaultProviderId &&
      IMAGE_PROVIDER_IDS.includes(
        providerSettingsQuery.data
          .defaultProviderId as (typeof IMAGE_PROVIDER_IDS)[number],
      )
        ? providerSettingsQuery.data.defaultProviderId
        : imageProviderOptions[0]?.value ?? 'xai';
    setProviderId(defaultProviderId);
  }, [imageProviderOptions, providerId, providerSettingsQuery.data?.defaultProviderId]);

  useEffect(() => {
    if (!providerId || model) {
      return;
    }

    const nextModel =
      modelOptions[0]?.value ??
      (providerId && providerId in DEFAULT_IMAGE_MODELS
        ? DEFAULT_IMAGE_MODELS[providerId as keyof typeof DEFAULT_IMAGE_MODELS]
        : '');
    if (nextModel) {
      setModel(nextModel);
    }
  }, [model, modelOptions, providerId]);

  useEffect(() => {
    if (aspectRatioOptions.some((option) => option.value === aspectRatio)) {
      return;
    }

    setAspectRatio(aspectRatioOptions[0]?.value ?? 'auto');
  }, [aspectRatio, aspectRatioOptions]);

  useEffect(() => {
    if (responseFormatOptions.some((option) => option.value === responseFormat)) {
      return;
    }

    setResponseFormat(
      (responseFormatOptions[0]?.value as 'url' | 'b64_json' | undefined) ??
        'url',
    );
  }, [responseFormat, responseFormatOptions]);

  useEffect(() => {
    if (!resolutionOptions.length) {
      if (resolution) {
        setResolution('');
      }
      return;
    }

    if (resolutionOptions.some((option) => option.value === resolution)) {
      return;
    }

    setResolution(resolutionOptions[0]?.value ?? '');
  }, [resolution, resolutionOptions]);

  useEffect(() => {
    if (imageCountOptions.some((option) => option.value === imageCount)) {
      return;
    }

    setImageCount(imageCountOptions[0]?.value ?? '1');
  }, [imageCount, imageCountOptions]);

  const imageMutation = useMutation({
    mutationFn: async () => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        throw new Error('A prompt is required.');
      }

      if (references.length > 0) {
        return gatewayApiClient.editImage({
          providerId,
          model,
          prompt: trimmedPrompt,
          images: references.map((reference) => ({
            type: reference.type,
            url: reference.url,
            mimeType:
              reference.type === 'data_url' ? reference.mimeType : undefined,
          })),
          n: Number(imageCount),
          aspectRatio,
          responseFormat,
          resolution: resolution || undefined,
        });
      }

      return gatewayApiClient.generateImage({
        providerId,
        model,
        prompt: trimmedPrompt,
        n: Number(imageCount),
        aspectRatio,
        responseFormat,
        resolution: resolution || undefined,
      });
    },
    onSuccess: (response) => {
      setRequestError(null);
      setResults(response.images);
    },
    onError: (error) => {
      setResults([]);
      setRequestError(
        error instanceof Error ? error.message : 'The image request failed.',
      );
    },
  });

  const canSubmit =
    Boolean(
      runtimeConfigQuery.data?.gatewayOnline &&
        providerId &&
        model &&
        prompt.trim() &&
        !imageMutation.isPending,
    );

  async function handleFileSelection(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    const newReferences = await Promise.all(
      Array.from(fileList).map(async (file) => {
        const url = await readFileAsDataUrl(file);
        return {
          id: crypto.randomUUID(),
          type: 'data_url' as const,
          url,
          mimeType: file.type || undefined,
          label: file.name,
        };
      }),
    );

    setReferences((current) =>
      [...current, ...newReferences].slice(0, maxReferenceImages),
    );
  }

  function addReferenceUrl() {
    const trimmedUrl = referenceUrl.trim();
    if (!trimmedUrl) {
      return;
    }

    const nextReference: ReferenceImageItem = trimmedUrl.startsWith('data:')
      ? {
          id: crypto.randomUUID(),
          type: 'data_url',
          url: trimmedUrl,
          label: 'Pasted data URL',
        }
      : {
          id: crypto.randomUUID(),
          type: 'image_url',
          url: trimmedUrl,
          label: trimmedUrl,
        };

    setReferences((current) =>
      [...current, nextReference].slice(0, maxReferenceImages),
    );
    setReferenceUrl('');
  }

  function removeReference(referenceId: string) {
    setReferences((current) =>
      current.filter((reference) => reference.id !== referenceId),
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        accept="image/*"
        hidden
        multiple
        onChange={(event) => {
          void handleFileSelection(event.currentTarget.files);
          event.currentTarget.value = '';
        }}
        type="file"
      />
      <PageHeader
        title="Image Generation Lab"
        description="Generate prompt-based images, or attach reference images to run image edits through the gateway seam."
      />

      <Grid>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Stack gap="lg">
            <Card className="section-card">
              <Stack gap="md">
                <Group justify="space-between" align="start">
                  <Stack gap={4}>
                    <Title order={3}>Image request</Title>
                    <Text c="dimmed" size="sm">
                      The current UI exposes providers with shipped image support.
                    </Text>
                  </Stack>
                </Group>

                <Select
                  data={imageProviderOptions}
                  data-testid="image-provider-select"
                  label="Provider"
                  onChange={(value) => {
                    setProviderId(value ?? 'xai');
                    setModel('');
                    setResults([]);
                    setRequestError(null);
                  }}
                  value={providerId}
                />

                <Select
                  data={modelOptions}
                  data-testid="image-model-select"
                  label="Model"
                  onChange={(value) => setModel(value ?? '')}
                  value={model}
                  disabled={!providerId || modelsQuery.isPending || modelsQuery.isError}
                />

                <Textarea
                  autosize
                  data-testid="image-prompt-input"
                  label="Prompt"
                  minRows={5}
                  onChange={(event) => setPrompt(event.currentTarget.value)}
                  placeholder="Describe the image or the edit you want to perform."
                  value={prompt}
                />

                <Group grow align="start">
                  <Select
                    data={aspectRatioOptions}
                    data-testid="image-aspect-ratio-select"
                    label={
                      supportedAspectRatios.length > 1 ? (
                        <HoverCard shadow="md" width={320} withArrow>
                          <HoverCard.Target>
                            <Group
                              gap={6}
                              style={{
                                borderBottom: '1px dotted var(--mantine-color-gray-5)',
                                cursor: 'help',
                                display: 'inline-flex',
                              }}
                              wrap="nowrap"
                            >
                              <Text component="span" fw={500}>
                                Aspect ratio
                              </Text>
                              <IconInfoCircle
                                aria-hidden="true"
                                size={14}
                                stroke={1.8}
                                style={{ color: 'var(--mantine-color-gray-6)' }}
                              />
                            </Group>
                          </HoverCard.Target>
                          <HoverCard.Dropdown>
                            <Stack gap="xs">
                              <Text fw={600} size="sm">
                                Supported ratios
                              </Text>
                              {supportedAspectRatios.map((aspectRatioOption) => (
                                <Group
                                  key={aspectRatioOption.value}
                                  gap="xs"
                                  justify="space-between"
                                  wrap="nowrap"
                                >
                                  <Text fw={600} size="sm">
                                    {aspectRatioOption.label}
                                  </Text>
                                  <Text c="dimmed" size="sm" ta="right">
                                    {aspectRatioOption.useCase ?? 'Provider-defined'}
                                  </Text>
                                </Group>
                              ))}
                            </Stack>
                          </HoverCard.Dropdown>
                        </HoverCard>
                      ) : (
                        'Aspect ratio'
                      )
                    }
                    onChange={(value) => setAspectRatio(value ?? 'auto')}
                    value={aspectRatio}
                  />
                  <Select
                    data={responseFormatOptions}
                    data-testid="image-response-format-select"
                    label="Response format"
                    onChange={(value) =>
                      setResponseFormat((value as 'url' | 'b64_json') ?? 'url')
                    }
                    value={responseFormat}
                  />
                  <Select
                    data={imageCountOptions}
                    data-testid="image-count-select"
                    label="Count"
                    onChange={(value) => setImageCount(value ?? '1')}
                    value={imageCount}
                  />
                </Group>

                {resolutionOptions.length ? (
                  <Select
                    data={resolutionOptions}
                    data-testid="image-resolution-select"
                    label="Resolution"
                    onChange={(value) => setResolution(value ?? '')}
                    value={resolution}
                  />
                ) : null}

                <Alert color="blue" title="Reference images">
                  Add zero images for generation, or one to {maxReferenceImages}{' '}
                  images to switch the request into edit mode.
                </Alert>

                {providerId === 'google' ? (
                  <Alert color="yellow" title="Google reference mode">
                    {GOOGLE_REFERENCE_IMAGE_NOTE}
                  </Alert>
                ) : null}

                <Group align="end">
                  <TextInput
                    className="image-reference-url"
                    data-testid="image-reference-url-input"
                    label="Reference image URL"
                    onChange={(event) => setReferenceUrl(event.currentTarget.value)}
                    placeholder={
                      providerId === 'google'
                        ? 'https://example.com/source.png or data:image/...'
                        : 'https://example.com/source.png or data:image/...'
                    }
                    value={referenceUrl}
                  />
                  <Button
                    data-testid="image-add-reference-url"
                    disabled={references.length >= maxReferenceImages}
                    onClick={addReferenceUrl}
                    variant="light"
                  >
                    Add URL
                  </Button>
                </Group>

                <Group>
                  <Button
                    data-testid="image-upload-reference"
                    disabled={references.length >= maxReferenceImages}
                    leftSection={<IconUpload size={16} />}
                    onClick={() => fileInputRef.current?.click()}
                    variant="light"
                  >
                    Upload image
                  </Button>
                  <Text c="dimmed" size="sm">
                    Up to {maxReferenceImages} references. Uploaded files are sent
                    as data URLs.
                  </Text>
                </Group>

                {references.length ? (
                  <Stack gap="xs">
                    {references.map((reference) => (
                      <Group
                        key={reference.id}
                        className="image-reference-row"
                        justify="space-between"
                        wrap="nowrap"
                      >
                        <Group gap="sm" wrap="nowrap">
                          <Badge
                            color={reference.type === 'data_url' ? 'orange' : 'teal'}
                            variant="light"
                          >
                            {reference.type === 'data_url' ? 'Upload' : 'URL'}
                          </Badge>
                          <Text lineClamp={1} size="sm">
                            {reference.label}
                          </Text>
                        </Group>
                        <Button
                          aria-label={`Remove ${reference.label}`}
                          color="red"
                          data-testid={`image-remove-reference-${reference.id}`}
                          leftSection={<IconTrash size={14} />}
                          onClick={() => removeReference(reference.id)}
                          size="xs"
                          variant="subtle"
                        >
                          Remove
                        </Button>
                      </Group>
                    ))}
                  </Stack>
                ) : null}

                {requestError ? (
                  <Alert color="red" title="Image request failed">
                    {requestError}
                  </Alert>
                ) : null}

                {modelsQuery.isError ? (
                  <Alert color="red" title="Model loading failed">
                    {modelsQuery.error instanceof Error
                      ? modelsQuery.error.message
                      : 'Unable to load image models.'}
                  </Alert>
                ) : null}

                <Button
                  data-testid="image-submit"
                  disabled={!canSubmit}
                  leftSection={<IconSparkles size={16} />}
                  loading={imageMutation.isPending}
                  onClick={() => imageMutation.mutate()}
                >
                  {references.length > 0 ? 'Edit image' : 'Generate image'}
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Card className="section-card">
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={3}>Results</Title>
                <Badge color={references.length > 0 ? 'orange' : 'teal'} variant="light">
                  {references.length > 0 ? 'Edit mode' : 'Generation mode'}
                </Badge>
              </Group>

              {!results.length ? (
                <Alert color="gray" icon={<IconPhoto size={16} />} title="No images yet">
                  Submit a prompt to render image results here.
                </Alert>
              ) : (
                <div className="image-results-grid">
                  {results.map((image, index) => {
                    const src =
                      image.url ??
                      (image.b64Json ? `data:image/png;base64,${image.b64Json}` : '');

                    return (
                      <Card
                        key={`${image.url ?? image.b64Json ?? index}-${index}`}
                        className="image-result-card"
                        data-testid={`image-result-${index}`}
                        padding="sm"
                        radius="lg"
                        withBorder
                      >
                        <Stack gap="sm">
                          {src ? (
                            <Image
                              alt={`Generated result ${index + 1}`}
                              className="image-result-preview"
                              radius="md"
                              src={src}
                            />
                          ) : (
                            <Alert color="yellow" title="No preview available">
                              The gateway returned an image entry without a displayable
                              URL or base64 payload.
                            </Alert>
                          )}

                          <Stack gap={4}>
                            <Text fw={600} size="sm">
                              Result {index + 1}
                            </Text>
                            {image.revisedPrompt ? (
                              <Text c="dimmed" size="sm">
                                Revised prompt: {image.revisedPrompt}
                              </Text>
                            ) : null}
                            {image.url ? (
                              <Text c="dimmed" size="sm">
                                Hosted image URL returned by the provider.
                              </Text>
                            ) : (
                              <Text c="dimmed" size="sm">
                                Base64 image payload returned by the gateway.
                              </Text>
                            )}
                          </Stack>
                        </Stack>
                      </Card>
                    );
                  })}
                </div>
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error(`Unable to read ${file.name} as a data URL.`));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = () => reject(reader.error ?? new Error(`Unable to read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function buildAspectRatioOptions(
  aspectRatios: ImageAspectRatioOption[] | undefined,
) {
  if (!aspectRatios?.length) {
    return [{ value: 'auto', label: 'Auto' }];
  }

  return aspectRatios.map((aspectRatio) => ({
    value: aspectRatio.value,
    label: aspectRatio.label,
  }));
}

function buildResponseFormatOptions(
  responseFormats: Array<'url' | 'b64_json'> | undefined,
) {
  if (!responseFormats?.length) {
    return RESPONSE_FORMAT_OPTIONS;
  }

  return responseFormats.map((responseFormat) => ({
    value: responseFormat,
    label: responseFormat === 'b64_json' ? 'Base64' : 'Hosted URL',
  }));
}

function buildResolutionOptions(
  resolutions: ImageResolutionOption[] | undefined,
) {
  return resolutions ?? [];
}

function buildImageCountOptions(maxGeneratedImagesPerRequest: number | undefined) {
  const maxCount = Math.max(
    1,
    Math.min(maxGeneratedImagesPerRequest ?? DEFAULT_IMAGE_COUNT_LIMIT, 10),
  );

  return Array.from({ length: maxCount }, (_, index) => {
    const value = String(index + 1);
    return {
      value,
      label: index === 0 ? '1 image' : `${value} images`,
    };
  });
}
