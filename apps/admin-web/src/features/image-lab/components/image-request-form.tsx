import {
  Alert,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { IconSparkles, IconTrash, IconUpload } from '@tabler/icons-react';

import type { ReturnTypeUseImageLab } from '../use-image-lab.types';

export function ImageRequestForm({
  imageLab,
}: {
  imageLab: ReturnTypeUseImageLab;
}) {
  const capabilities = imageLab.selectedModel?.capabilities;
  const aspectRatios = capabilities?.supportedImageAspectRatios ?? [];
  const responseFormats = capabilities?.supportedImageResponseFormats ?? [];
  const resolutions = capabilities?.supportedImageResolutions ?? [];
  const backgrounds = capabilities?.supportedImageBackgrounds ?? [];
  const qualities = capabilities?.supportedImageQualities ?? [];
  const outputFormats = capabilities?.supportedImageOutputFormats ?? [];
  const inputFidelities = capabilities?.supportedImageInputFidelities ?? [];
  const outputCompressionRange = capabilities?.imageOutputCompressionRange;
  const maxGeneratedImagesPerRequest = capabilities?.maxGeneratedImagesPerRequest ?? 1;

  return (
    <Card className="section-card">
      <Stack gap="md">
        <Title order={3}>Image request</Title>

        <Select
          data={imageLab.providers.map((provider) => ({
            value: provider.providerId,
            label: provider.displayName,
          }))}
          data-testid="image-provider-select"
          label="Provider"
          onChange={(value) => {
            imageLab.setProviderId(value ?? '');
            imageLab.setModelId('');
            imageLab.setPrompt('');
          }}
          value={imageLab.providerId}
        />

        <Select
          data={imageLab.models.map((model) => ({
            value: model.id,
            label: model.displayName,
          }))}
          data-testid="image-model-select"
          label="Model"
          onChange={(value) => imageLab.setModelId(value ?? '')}
          value={imageLab.modelId}
        />

        <Textarea
          autosize
          data-testid="image-prompt-input"
          label="Prompt"
          minRows={5}
          onChange={(event) => imageLab.setPrompt(event.currentTarget.value)}
          value={imageLab.prompt}
        />

        <Group grow align="start">
          {aspectRatios.length ? (
            <Select
              data={aspectRatios.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              data-testid="image-aspect-ratio-select"
              label="Aspect ratio"
              onChange={(value) => imageLab.setAspectRatio(value ?? '')}
              value={imageLab.aspectRatio}
            />
          ) : null}
          {responseFormats.length ? (
            <Select
              data={responseFormats.map((format) => ({
                value: format,
                label: format === 'b64_json' ? 'Base64' : 'Hosted URL',
              }))}
              data-testid="image-response-format-select"
              label="Response format"
              onChange={(value) =>
                imageLab.setResponseFormat((value as 'url' | 'b64_json') ?? 'b64_json')
              }
              value={imageLab.responseFormat}
            />
          ) : null}
          <Select
            data={buildImageCountOptions(maxGeneratedImagesPerRequest)}
            data-testid="image-count-select"
            label="Count"
            onChange={(value) => imageLab.setImageCount(value ?? '1')}
            value={imageLab.imageCount}
          />
        </Group>

        <Group grow align="start">
          {resolutions.length ? (
            <Select
              data={resolutions}
              data-testid="image-resolution-select"
              label="Resolution"
              onChange={(value) => imageLab.setResolution(value ?? '')}
              value={imageLab.resolution}
            />
          ) : null}
          {backgrounds.length ? (
            <Select
              data={backgrounds}
              data-testid="image-background-select"
              label="Background"
              onChange={(value) => imageLab.setBackground(value ?? '')}
              value={imageLab.background}
            />
          ) : null}
          {qualities.length ? (
            <Select
              data={qualities}
              data-testid="image-quality-select"
              label="Quality"
              onChange={(value) => imageLab.setQuality(value ?? '')}
              value={imageLab.quality}
            />
          ) : null}
        </Group>

        <Group grow align="start">
          {outputFormats.length ? (
            <Select
              data={outputFormats}
              data-testid="image-output-format-select"
              label="Output format"
              onChange={(value) => imageLab.setOutputFormat(value ?? '')}
              value={imageLab.outputFormat}
            />
          ) : null}
          {outputCompressionRange ? (
            <NumberInput
              data-testid="image-output-compression-input"
              label="Compression"
              min={outputCompressionRange.min}
              max={outputCompressionRange.max}
              step={outputCompressionRange.step ?? 1}
              onChange={(value) =>
                imageLab.setOutputCompression(
                  typeof value === 'number' ? value : '',
                )
              }
              value={imageLab.outputCompression}
            />
          ) : null}
          {imageLab.references.length > 0 && inputFidelities.length ? (
            <Select
              data={inputFidelities.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              data-testid="image-input-fidelity-select"
              label="Input fidelity"
              onChange={(value) => imageLab.setInputFidelity(value ?? '')}
              value={imageLab.inputFidelity}
            />
          ) : null}
        </Group>

        <Alert color="blue" title="Reference assets">
          Upload through the gateway, paste a public image URL, or reuse images
          from history. One or more references switches the request into edit mode
          when the selected model supports editing.
        </Alert>

        {!imageLab.supportsImageEditing ? (
          <Alert color="yellow" title="Editing unavailable">
            This model currently supports generation only.
          </Alert>
        ) : null}

        <Group align="end">
          <TextInput
            className="image-reference-url"
            data-testid="image-reference-url-input"
            label="Reference image URL"
            onChange={(event) => imageLab.setReferenceUrl(event.currentTarget.value)}
            placeholder="https://example.com/source.png"
            value={imageLab.referenceUrl}
          />
          <Button
            data-testid="image-add-reference-url"
            disabled={imageLab.references.length >= imageLab.maxReferenceImages}
            onClick={imageLab.addReferenceUrl}
            variant="light"
          >
            Add URL
          </Button>
        </Group>

        <Group>
          <Button
            data-testid="image-upload-reference"
            disabled={imageLab.references.length >= imageLab.maxReferenceImages}
            leftSection={<IconUpload size={16} />}
            onClick={() => imageLab.fileInputRef.current?.click()}
            variant="light"
          >
            Upload image
          </Button>
          <Text c="dimmed" size="sm">
            Uploaded files become gateway-managed reference assets.
          </Text>
        </Group>

        {imageLab.references.length ? (
          <Stack gap="xs">
            {imageLab.references.map((reference) => (
              <Group key={reference.id} justify="space-between" wrap="nowrap">
                <Text lineClamp={1} size="sm">
                  {reference.label}
                </Text>
                <Button
                  aria-label={`Remove ${reference.label}`}
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => imageLab.removeReference(reference.id)}
                  size="xs"
                  variant="subtle"
                >
                  Remove
                </Button>
              </Group>
            ))}
          </Stack>
        ) : null}

        {imageLab.requestError ? (
          <Alert color="red" title="Image request failed">
            {imageLab.requestError}
          </Alert>
        ) : null}

        <Button
          data-testid="image-submit"
          leftSection={<IconSparkles size={16} />}
          loading={imageLab.generateMutation.isPending}
          onClick={() => imageLab.generateMutation.mutate()}
        >
          {imageLab.canEdit ? 'Edit image' : 'Generate image'}
        </Button>
      </Stack>
    </Card>
  );
}

function buildImageCountOptions(maxGeneratedImagesPerRequest: number) {
  return Array.from(
    { length: Math.max(1, Math.min(maxGeneratedImagesPerRequest, 10)) },
    (_, index) => {
      const value = String(index + 1);
      return {
        value,
        label: index === 0 ? '1 image' : `${value} images`,
      };
    },
  );
}
