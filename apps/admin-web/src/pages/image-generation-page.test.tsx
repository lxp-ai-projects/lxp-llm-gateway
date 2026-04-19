import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { ImageGenerationPage } from './image-generation-page';

const {
  editImageMock,
  generateImageMock,
  getModelsMock,
  getOwnProviderSettingsMock,
  getRuntimeConfigMock,
} = vi.hoisted(() => ({
  editImageMock: vi.fn(async () => ({
    requestId: 'request-edit-1',
    providerId: 'xai',
    model: 'grok-imagine-image',
    images: [{ b64Json: 'edited-image', revisedPrompt: 'edited prompt' }],
  })),
  generateImageMock: vi.fn(async () => ({
    requestId: 'request-generate-1',
    providerId: 'xai',
    model: 'grok-imagine-image',
    images: [
      {
        url: 'https://cdn.x.ai/generated.jpg',
        revisedPrompt: 'generated prompt',
      },
    ],
  })),
  getModelsMock: vi.fn(async () => ({
    providerId: 'xai',
    models: [
      {
        id: 'grok-imagine-image',
        displayName: 'Grok Imagine Image',
        capabilities: {
          supportsImageGeneration: true,
          supportsImageEditing: true,
          supportedImageResponseFormats: ['url', 'b64_json'],
          maxGeneratedImagesPerRequest: 4,
          maxReferenceImagesPerRequest: 5,
          supportedImageAspectRatios: [
            {
              value: 'auto',
              label: 'Auto',
              useCase: 'Model auto-selects the best ratio for the prompt.',
            },
            {
              value: '1:1',
              label: '1:1',
              useCase: 'Social media, thumbnails',
            },
            {
              value: '19.5:9',
              label: '19.5:9',
              useCase: 'Modern smartphone displays',
            },
          ],
        },
      },
      {
        id: 'grok-imagine-image-pro',
        displayName: 'Grok Imagine Image Pro',
        capabilities: {
          supportsImageGeneration: true,
          supportsImageEditing: true,
          supportedImageResponseFormats: ['url', 'b64_json'],
          maxGeneratedImagesPerRequest: 4,
          maxReferenceImagesPerRequest: 5,
          supportedImageAspectRatios: [
            {
              value: 'auto',
              label: 'Auto',
              useCase: 'Model auto-selects the best ratio for the prompt.',
            },
            {
              value: '1:1',
              label: '1:1',
              useCase: 'Social media, thumbnails',
            },
            {
              value: '19.5:9',
              label: '19.5:9',
              useCase: 'Modern smartphone displays',
            },
          ],
        },
      },
      {
        id: 'grok-imagine-video',
        displayName: 'grok-imagine-video',
        capabilities: {
          supportsStreaming: true,
        },
      },
      {
        id: 'grok-image',
        displayName: 'Grok Image',
        capabilities: {
          supportsImageGeneration: true,
        },
      },
    ],
  })),
  getOwnProviderSettingsMock: vi.fn(async () => ({
    userUuid: 'user-1',
    defaultProviderId: 'xai',
    defaultModel: 'grok-imagine-image',
  })),
  getRuntimeConfigMock: vi.fn(async () => ({
    registrationEnabled: true,
    forgotPasswordEnabled: true,
    gatewayOnline: true,
    supportedProviders: [
      { providerId: 'nanogpt', displayName: 'NanoGPT' },
      { providerId: 'xai', displayName: 'xAI Grok' },
    ],
  })),
}));

vi.mock('../lib/api-client', () => ({
  adminApiClient: {
    getOwnProviderSettings: getOwnProviderSettingsMock,
    getRuntimeConfig: getRuntimeConfigMock,
  },
  gatewayApiClient: {
    getModels: getModelsMock,
    generateImage: generateImageMock,
    editImage: editImageMock,
  },
}));

beforeEach(() => {
  editImageMock.mockClear();
  generateImageMock.mockClear();
  getModelsMock.mockClear();
  getOwnProviderSettingsMock.mockClear();
  getRuntimeConfigMock.mockClear();
});

test(
  'ImageGenerationPage submits a generation request without references',
  async () => {
    const user = userEvent.setup();

    renderWithProviders(<ImageGenerationPage />);

    await screen.findByRole('heading', { name: 'Image Generation Lab' });

    fireEvent.change(screen.getByLabelText('Prompt'), {
      target: { value: 'A chrome hummingbird hovering over a flower' },
    });
    await user.click(screen.getByTestId('image-submit'));

    await waitFor(() => expect(generateImageMock).toHaveBeenCalledTimes(1));

    expect(generateImageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'xai',
        model: 'grok-imagine-image',
        prompt: 'A chrome hummingbird hovering over a flower',
        responseFormat: 'url',
      }),
    );
    expect(editImageMock).not.toHaveBeenCalled();
    expect(await screen.findByTestId('image-result-0')).toBeInTheDocument();
    expect(getModelsMock).toHaveBeenCalledWith('xai');
    expect(screen.queryByText('Grok Image')).not.toBeInTheDocument();
  },
  10000,
);

test(
  'ImageGenerationPage switches to edit mode when a reference URL is added',
  async () => {
    const user = userEvent.setup();

    renderWithProviders(<ImageGenerationPage />);

    await screen.findByRole('heading', { name: 'Image Generation Lab' });

    fireEvent.change(screen.getByLabelText('Prompt'), {
      target: { value: 'Turn this into a cinematic still' },
    });
    fireEvent.change(screen.getByLabelText('Reference image URL'), {
      target: { value: 'https://example.com/source.png' },
    });
    await user.click(screen.getByTestId('image-add-reference-url'));
    await user.click(screen.getByTestId('image-submit'));

    await waitFor(() => expect(editImageMock).toHaveBeenCalledTimes(1));

    expect(editImageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'xai',
        model: 'grok-imagine-image',
        prompt: 'Turn this into a cinematic still',
        responseFormat: 'url',
        images: [
          {
            type: 'image_url',
            url: 'https://example.com/source.png',
            mimeType: undefined,
          },
        ],
      }),
    );
    expect(generateImageMock).not.toHaveBeenCalled();
    expect(screen.getByText('Aspect ratio')).toBeInTheDocument();
    expect(screen.queryByText('Supported aspect ratios')).not.toBeInTheDocument();
    expect(screen.queryByText('Social media, thumbnails')).not.toBeInTheDocument();
  },
  10000,
);
