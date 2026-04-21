import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { ImageGenerationPage } from './image-generation-page';

function buildXaiModels() {
  return [
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
  ];
}

function buildGoogleModels() {
  return [
    {
      id: 'gemini-2.5-flash-image',
      displayName: 'Nano Banana',
      capabilities: {
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportedImageResponseFormats: ['b64_json'],
        supportedImageResolutions: [{ value: '1K', label: '1K' }],
        supportedImageAspectRatios: [
          {
            value: '1:1',
            label: '1:1',
            useCase: 'Square assets and social posts',
          },
          {
            value: '16:9',
            label: '16:9',
            useCase: 'Widescreen and banners',
          },
        ],
      },
    },
    {
      id: 'gemini-3-pro-image-preview',
      displayName: 'Nano Banana Pro',
      capabilities: {
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportedImageResponseFormats: ['b64_json'],
        supportedImageResolutions: [
          { value: '1K', label: '1K' },
          { value: '2K', label: '2K' },
          { value: '4K', label: '4K' },
        ],
        maxReferenceImagesPerRequest: 14,
        supportedImageAspectRatios: [
          {
            value: '1:1',
            label: '1:1',
            useCase: 'Square assets and social posts',
          },
          {
            value: '4:5',
            label: '4:5',
            useCase: 'Tall social formats',
          },
        ],
      },
    },
    {
      id: 'gemini-3.1-flash-image-preview',
      displayName: 'Nano Banana 2',
      capabilities: {
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportedImageResponseFormats: ['b64_json'],
        supportedImageResolutions: [
          { value: '512', label: '512' },
          { value: '1K', label: '1K' },
          { value: '2K', label: '2K' },
          { value: '4K', label: '4K' },
        ],
      },
    },
    {
      id: 'gemini-2.5-pro',
      displayName: 'gemini-2.5-pro',
      capabilities: {
        supportsStreaming: true,
      },
    },
  ];
}

function buildOpenAiModels() {
  return [
    {
      id: 'gpt-image-1.5',
      displayName: 'GPT Image 1.5',
      capabilities: {
        supportsImageGeneration: true,
        supportsImageEditing: false,
        supportedImageResponseFormats: ['url', 'b64_json'],
        supportedImageResolutions: [
          { value: 'auto', label: 'Auto' },
          { value: '1024x1024', label: '1024x1024' },
          { value: '1536x1024', label: '1536x1024' },
          { value: '1024x1536', label: '1024x1536' },
        ],
        supportedImageOutputFormats: [
          { value: 'png', label: 'PNG' },
          { value: 'jpeg', label: 'JPEG' },
          { value: 'webp', label: 'WebP' },
        ],
        supportedImageBackgrounds: [
          { value: 'auto', label: 'Auto' },
          { value: 'opaque', label: 'Opaque' },
          { value: 'transparent', label: 'Transparent' },
        ],
        supportedImageQualities: [
          { value: 'auto', label: 'Auto' },
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ],
        supportedImageInputFidelities: [
          { value: 'low', label: 'Low' },
          { value: 'high', label: 'High' },
        ],
        imageOutputCompressionRange: {
          min: 0,
          max: 100,
          defaultValue: 100,
          step: 1,
        },
      },
    },
    {
      id: 'gpt-image-1',
      displayName: 'GPT Image 1',
      capabilities: {
        supportsImageGeneration: true,
        supportsImageEditing: false,
      },
    },
    {
      id: 'gpt-image-1-mini',
      displayName: 'GPT Image 1 Mini',
      capabilities: {
        supportsImageGeneration: true,
        supportsImageEditing: false,
      },
    },
    {
      id: 'gpt-4.1',
      displayName: 'gpt-4.1',
      capabilities: {
        supportsStreaming: true,
      },
    },
  ];
}

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
  getModelsMock: vi.fn(async (providerId?: string) => ({
    providerId: providerId ?? 'xai',
    models:
      providerId === 'google'
        ? buildGoogleModels()
        : providerId === 'openai'
          ? buildOpenAiModels()
          : buildXaiModels(),
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
      { providerId: 'google', displayName: 'Google Gemini' },
      { providerId: 'nanogpt', displayName: 'NanoGPT' },
      { providerId: 'openai', displayName: 'OpenAI' },
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
  'ImageGenerationPage exposes Google Nano Banana models and allows remote HTTPS reference URLs',
  async () => {
    const user = userEvent.setup();

    renderWithProviders(<ImageGenerationPage />);

    await screen.findByRole('heading', { name: 'Image Generation Lab' });
    fireEvent.click(screen.getByTestId('image-provider-select'));
    await waitFor(() =>
      expect(
        document.querySelector('[role="option"][value="google"]'),
      ).not.toBeNull(),
    );
    fireEvent.click(
      document.querySelector('[role="option"][value="google"]') as Element,
    );

    await waitFor(() => expect(getModelsMock).toHaveBeenCalledWith('google'));

    expect(screen.getByText('Google reference mode')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Google image editing accepts uploaded files, pasted data URLs, and public HTTPS image URLs. Local network, private, or unsupported remote targets are blocked by the gateway.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Grok Imagine Image')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Prompt'), {
      target: { value: 'A clean product shot of a smartwatch' },
    });
    fireEvent.change(screen.getByLabelText('Reference image URL'), {
      target: { value: 'https://example.com/source.png' },
    });
    await user.click(screen.getByTestId('image-add-reference-url'));

    await user.click(screen.getByTestId('image-submit'));

    await waitFor(() => expect(editImageMock).toHaveBeenCalledTimes(1));
    expect(editImageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'google',
        model: 'gemini-2.5-flash-image',
        prompt: 'A clean product shot of a smartwatch',
        responseFormat: 'b64_json',
        resolution: '1K',
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
  },
  10000,
);

test(
  'ImageGenerationPage exposes OpenAI image models and provider-owned image controls',
  async () => {
    const user = userEvent.setup();

    renderWithProviders(<ImageGenerationPage />);

    await screen.findByRole('heading', { name: 'Image Generation Lab' });
    fireEvent.click(screen.getByTestId('image-provider-select'));
    await waitFor(() =>
      expect(
        document.querySelector('[role="option"][value="openai"]'),
      ).not.toBeNull(),
    );
    fireEvent.click(
      document.querySelector('[role="option"][value="openai"]') as Element,
    );

    await waitFor(() => expect(getModelsMock).toHaveBeenCalledWith('openai'));

    expect(screen.queryByText('Aspect ratio')).not.toBeInTheDocument();
    expect(await screen.findByTestId('image-background-select')).toBeInTheDocument();
    expect(screen.getByTestId('image-quality-select')).toBeInTheDocument();
    expect(screen.getByTestId('image-output-format-select')).toBeInTheDocument();
    expect(screen.getByTestId('image-output-compression-input')).toBeInTheDocument();
    expect(screen.getByText(/Editing unavailable/i)).toBeInTheDocument();
    expect(screen.getByTestId('image-add-reference-url')).toBeDisabled();
    expect(screen.getByTestId('image-upload-reference')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Prompt'), {
      target: { value: 'A transparent product shot of a perfume bottle' },
    });
    fireEvent.click(screen.getByTestId('image-background-select'));
    fireEvent.click(
      document.querySelector('[role="option"][value="transparent"]') as Element,
    );
    fireEvent.click(screen.getByTestId('image-quality-select'));
    fireEvent.click(
      document.querySelector('[role="option"][value="high"]') as Element,
    );
    fireEvent.click(screen.getByTestId('image-output-format-select'));
    fireEvent.click(
      document.querySelector('[role="option"][value="webp"]') as Element,
    );
    fireEvent.change(screen.getByTestId('image-output-compression-input'), {
      target: { value: '80' },
    });

    await user.click(screen.getByTestId('image-submit'));

    await waitFor(() => expect(generateImageMock).toHaveBeenCalledTimes(1));
    expect(generateImageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'openai',
        model: 'gpt-image-1.5',
        prompt: 'A transparent product shot of a perfume bottle',
        background: 'transparent',
        quality: 'high',
        outputFormat: 'webp',
        outputCompression: 80,
      }),
    );
  },
  10000,
);

test(
  'ImageGenerationPage disables OpenAI reference-image editing when the model is generation-only',
  async () => {
    const user = userEvent.setup();

    renderWithProviders(<ImageGenerationPage />);

    await screen.findByRole('heading', { name: 'Image Generation Lab' });
    fireEvent.click(screen.getByTestId('image-provider-select'));
    await waitFor(() =>
      expect(
        document.querySelector('[role="option"][value="openai"]'),
      ).not.toBeNull(),
    );
    fireEvent.click(
      document.querySelector('[role="option"][value="openai"]') as Element,
    );

    await waitFor(() => expect(getModelsMock).toHaveBeenCalledWith('openai'));
    expect(await screen.findByText(/Editing unavailable/i)).toBeInTheDocument();
    expect(screen.getByTestId('image-add-reference-url')).toBeDisabled();
    expect(screen.getByTestId('image-upload-reference')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Prompt'), {
      target: { value: 'Keep the subject and replace the background' },
    });
    await user.click(screen.getByTestId('image-submit'));

    await waitFor(() => expect(generateImageMock).toHaveBeenCalledTimes(1));
    expect(editImageMock).not.toHaveBeenCalled();
    expect(screen.getByText(/generation only in the gateway/i)).toBeInTheDocument();
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
