import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { ImageGenerationPage } from './image-generation-page';

const {
  deleteImageAssetMock,
  editImageMock,
  getImageAssetsMock,
  generateImageMock,
  getImageCatalogMock,
  getImageHistoryMock,
  writeClipboardTextMock,
  setImageAssetSavedMock,
  updateImageAssetMock,
  uploadImageAssetMock,
} = vi.hoisted(() => ({
  deleteImageAssetMock: vi.fn(async () => ({ deleted: true as const })),
  editImageMock: vi.fn(async () => ({
    requestId: 'request-edit-1',
    jobId: 'job-edit-1',
    providerId: 'xai',
    model: 'grok-imagine-image',
    images: [
      {
        assetId: 'asset-edit-1',
        contentUrl: '/api/v1/images/assets/asset-edit-1/content',
        b64Json: 'edited-image',
        saved: false,
      },
    ],
  })),
  generateImageMock: vi.fn(async () => ({
    requestId: 'request-generate-1',
    jobId: 'job-generate-1',
    providerId: 'xai',
    model: 'grok-imagine-image',
    images: [
      {
        assetId: 'asset-result-1',
        contentUrl: '/api/v1/images/assets/asset-result-1/content',
        url: 'https://cdn.example.com/generated.jpg',
        saved: false,
      },
    ],
  })),
  getImageCatalogMock: vi.fn(async () => ({
    providers: [
      {
        providerId: 'openai',
        displayName: 'OpenAI',
        defaultModelId: 'gpt-image-2',
        models: [
          {
            id: 'gpt-image-2',
            displayName: 'GPT Image 2',
            capabilities: {
              supportsImageGeneration: true,
              supportsImageEditing: false,
              supportedImageResponseFormats: ['b64_json'],
              supportedImageResolutions: [{ value: '1024x1024', label: '1024x1024' }],
              supportedImageBackgrounds: [{ value: 'auto', label: 'Auto' }],
              supportedImageModerations: [
                { value: 'auto', label: 'Auto' },
                { value: 'low', label: 'Low' },
              ],
              imageDefaults: {
                responseFormat: 'b64_json',
                resolution: '1024x1024',
                background: 'auto',
                moderation: 'auto',
                imageCount: 1,
              },
            },
          },
        ],
      },
      {
        providerId: 'xai',
        displayName: 'xAI Grok',
        defaultModelId: 'grok-imagine-image',
        models: [
          {
            id: 'grok-imagine-image',
            displayName: 'Grok Imagine Image',
            capabilities: {
              supportsImageGeneration: true,
              supportsImageEditing: true,
              supportedImageResponseFormats: ['url', 'b64_json'],
              supportedImageAspectRatios: [
                { value: 'auto', label: 'Auto' },
                { value: '1:1', label: '1:1' },
              ],
              maxGeneratedImagesPerRequest: 4,
              maxReferenceImagesPerRequest: 5,
              imageDefaults: {
                aspectRatio: 'auto',
                responseFormat: 'url',
                imageCount: 1,
              },
            },
          },
        ],
      },
      {
        providerId: 'nanogpt',
        displayName: 'NanoGPT',
        defaultModelId: 'hidream',
        models: [
          {
            id: 'gpt-image-1',
            displayName: 'GPT Image 1',
            capabilities: {
              supportsImageGeneration: true,
              supportsImageEditing: true,
              requiresPaidAccess: true,
              supportedImageResponseFormats: ['b64_json'],
              supportedImageResolutions: [
                { value: 'auto', label: 'Auto' },
                { value: '1024x1024', label: '1024x1024' },
                { value: '1536x1024', label: '1536x1024' },
                { value: '1024x1536', label: '1024x1536' },
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
              supportedImageModerations: [
                { value: 'auto', label: 'Auto' },
                { value: 'low', label: 'Low' },
              ],
              supportedImageOutputFormats: ['png', 'jpeg', 'webp'],
              supportedImageInputFidelities: [
                { value: 'low', label: 'Low' },
                { value: 'high', label: 'High' },
              ],
              imageOutputCompressionRange: {
                min: 0,
                max: 100,
                step: 1,
              },
              maxGeneratedImagesPerRequest: 10,
              maxReferenceImagesPerRequest: 16,
              imageDefaults: {
                responseFormat: 'b64_json',
                resolution: '1024x1024',
                background: 'auto',
                quality: 'auto',
                moderation: 'auto',
                outputFormat: 'png',
                outputCompression: 100,
                inputFidelity: 'low',
                imageCount: 1,
              },
            },
          },
          {
            id: 'hidream',
            displayName: 'HiDream',
            capabilities: {
              supportsImageGeneration: true,
              supportsImageEditing: false,
              requiresPaidAccess: false,
              supportedImageResponseFormats: ['url', 'b64_json'],
              supportedImageResolutions: [{ value: '1024x1024', label: '1024x1024' }],
              maxGeneratedImagesPerRequest: 4,
              imageDefaults: {
                responseFormat: 'b64_json',
                resolution: '1024x1024',
                imageCount: 1,
              },
            },
          },
          {
            id: 'wan-2.7-image-pro',
            displayName: 'Wan 2.7 Image Pro',
            capabilities: {
              supportsImageGeneration: true,
              supportsImageEditing: true,
              requiresPaidAccess: false,
              supportedImageResponseFormats: ['url', 'b64_json'],
              supportedImageResolutions: [
                { value: '1K', label: '1K' },
                { value: '2K', label: '2K' },
                { value: '4K', label: '4K' },
              ],
              maxGeneratedImagesPerRequest: 4,
              maxReferenceImagesPerRequest: 9,
              imageDefaults: {
                responseFormat: 'b64_json',
                resolution: '2K',
                imageCount: 1,
              },
              imageGenerationOptions: {
                supportedImageResolutions: [
                  { value: '1K', label: '1K' },
                  { value: '2K', label: '2K' },
                  { value: '4K', label: '4K' },
                ],
                imageDefaults: {
                  resolution: '2K',
                },
              },
              imageEditOptions: {
                supportedImageResolutions: [
                  { value: '1K', label: '1K' },
                  { value: '2K', label: '2K' },
                ],
                maxReferenceImagesPerRequest: 9,
                imageDefaults: {
                  resolution: '2K',
                },
              },
            },
          },
        ],
      },
    ],
  })),
  getImageAssetsMock: vi.fn(async () => ({
    items: [
      {
        id: 'asset-upload-catalog-1',
        label: 'Uploaded reference',
        mimeType: 'image/png',
        contentUrl: '/api/v1/images/assets/asset-upload-catalog-1/content',
        sourceType: 'upload',
        saved: false,
        createdAt: '2026-04-21T11:00:00.000Z',
      },
    ],
  })),
  getImageHistoryMock: vi.fn(async (page = 1) => ({
    items: [
      {
        id: `job-history-${page}`,
        requestId: `request-history-${page}`,
        providerId: 'xai',
        model: 'grok-imagine-image',
        prompt: `History prompt ${page}`,
        mode: 'generation',
        createdAt: '2026-04-21T12:00:00.000Z',
        images: [
          {
            id: `asset-history-${page}`,
            label: `History asset ${page}`,
            mimeType: 'image/png',
            contentUrl: `/api/v1/images/assets/asset-history-${page}/content`,
            sourceType: 'generated',
            saved: false,
            createdAt: '2026-04-21T12:00:00.000Z',
          },
        ],
      },
    ],
    page,
    pageSize: 10,
    totalItems: 12,
    totalPages: 2,
  })),
  writeClipboardTextMock: vi.fn(async () => undefined),
  setImageAssetSavedMock: vi.fn(async (assetId: string, saved: boolean) => ({
    asset: {
      id: assetId,
      label: 'Saved asset',
      mimeType: 'image/png',
      contentUrl: `/api/v1/images/assets/${assetId}/content`,
      sourceType: 'generated',
      saved,
      createdAt: '2026-04-21T12:00:00.000Z',
    },
  })),
  updateImageAssetMock: vi.fn(async (assetId: string, payload: { label: string }) => ({
    asset: {
      id: assetId,
      label: payload.label,
      mimeType: 'image/png',
      contentUrl: `/api/v1/images/assets/${assetId}/content`,
      sourceType: 'upload',
      saved: false,
      createdAt: '2026-04-21T11:00:00.000Z',
    },
  })),
  uploadImageAssetMock: vi.fn(async () => ({
    asset: {
      id: 'asset-upload-1',
      label: 'upload.png',
      mimeType: 'image/png',
      contentUrl: '/api/v1/images/assets/asset-upload-1/content',
      sourceType: 'upload',
      saved: false,
      createdAt: '2026-04-21T12:00:00.000Z',
    },
  })),
}));

vi.mock('../lib/api-client', async () => {
  const actual = await vi.importActual('../lib/api-client');
  return {
    ...actual,
    gatewayApiClient: {
      getImageCatalog: getImageCatalogMock,
      getImageAssets: getImageAssetsMock,
      getImageHistory: getImageHistoryMock,
      generateImage: generateImageMock,
      editImage: editImageMock,
      uploadImageAsset: uploadImageAssetMock,
      deleteImageAsset: deleteImageAssetMock,
      updateImageAsset: updateImageAssetMock,
      setImageAssetSaved: setImageAssetSavedMock,
    },
  };
});

beforeEach(() => {
  deleteImageAssetMock.mockClear();
  editImageMock.mockClear();
  getImageAssetsMock.mockClear();
  generateImageMock.mockClear();
  getImageCatalogMock.mockClear();
  getImageHistoryMock.mockClear();
  writeClipboardTextMock.mockClear();
  setImageAssetSavedMock.mockClear();
  updateImageAssetMock.mockClear();
  uploadImageAssetMock.mockClear();

  vi.stubGlobal('navigator', {
    ...navigator,
    clipboard: {
      writeText: writeClipboardTextMock,
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('ImageGenerationPage renders providers and fields from the backend image catalog', async () => {
  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });
  await waitFor(() => expect(getImageCatalogMock).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(getImageAssetsMock).toHaveBeenCalledTimes(1));

  expect(screen.getByTestId('image-provider-select')).toBeInTheDocument();
  expect(screen.getByTestId('image-model-select')).toBeInTheDocument();
  expect(screen.getByTestId('image-response-format-select')).toBeInTheDocument();
  expect(screen.getByTestId('image-moderation-select')).toBeInTheDocument();
  expect(screen.getByText('Generated history')).toBeInTheDocument();
  expect(screen.getByText('10 items per page')).toBeInTheDocument();
});

test('ImageGenerationPage only shows OpenAI moderation for GPT-prefixed OpenAI image models', async () => {
  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });
  await waitFor(() =>
    expect(screen.getByTestId('image-moderation-select')).toBeInTheDocument(),
  );
  expect(screen.getByText('OpenAI moderation')).toBeInTheDocument();

  fireEvent.click(screen.getByTestId('image-provider-select'));
  await waitFor(() =>
    expect(document.querySelector('[role="option"][value="xai"]')).not.toBeNull(),
  );
  fireEvent.click(document.querySelector('[role="option"][value="xai"]') as Element);

  await waitFor(() =>
    expect(screen.queryByTestId('image-moderation-select')).not.toBeInTheDocument(),
  );

  fireEvent.click(screen.getByTestId('image-provider-select'));
  await waitFor(() =>
    expect(document.querySelector('[role="option"][value="openai"]')).not.toBeNull(),
  );
  fireEvent.click(document.querySelector('[role="option"][value="openai"]') as Element);

  await waitFor(() =>
    expect(screen.getByTestId('image-moderation-select')).toBeInTheDocument(),
  );
});

test('ImageGenerationPage generates, saves, and reuses image assets from history', async () => {
  const user = userEvent.setup();
  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });
  fireEvent.change(screen.getByLabelText('Prompt'), {
    target: { value: 'A chrome hummingbird hovering over a flower' },
  });

  await user.click(screen.getByTestId('image-submit'));

  await waitFor(() => expect(generateImageMock).toHaveBeenCalledTimes(1));
  expect(await screen.findByTestId('image-result-0')).toBeInTheDocument();

  await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);
  await waitFor(() =>
    expect(setImageAssetSavedMock).toHaveBeenCalledWith('asset-result-1', true),
  );

  await user.click(await screen.findByTestId('history-use-asset-history-1'));
  expect(screen.getByText('Selected reference (1)')).toBeInTheDocument();
});

test('ImageGenerationPage shows animated loading placeholders while generation is in progress', async () => {
  const user = userEvent.setup();
  let resolveGeneration: ((value: Awaited<ReturnType<typeof generateImageMock>>) => void) | null =
    null;
  generateImageMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveGeneration = resolve;
      }),
  );

  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });
  fireEvent.change(screen.getByLabelText('Prompt'), {
    target: { value: 'A luminous coral reef floating in space' },
  });
  await user.click(screen.getByTestId('image-submit'));

  expect(await screen.findByTestId('image-loading-0')).toBeInTheDocument();

  resolveGeneration?.({
    requestId: 'request-generate-async-1',
    jobId: 'job-generate-async-1',
    providerId: 'xai',
    model: 'grok-imagine-image',
    images: [
      {
        assetId: 'asset-result-async-1',
        contentUrl: '/api/v1/images/assets/asset-result-async-1/content',
        url: 'https://cdn.example.com/generated-async.jpg',
        saved: false,
      },
    ],
  });

  expect(await screen.findByTestId('image-result-0')).toBeInTheDocument();
});

test('ImageGenerationPage paginates history and routes edit mode through asset references', async () => {
  const user = userEvent.setup();
  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });
  await user.click(screen.getByRole('button', { name: 'Next' }));

  await waitFor(() => expect(getImageHistoryMock).toHaveBeenCalledWith(2));

  fireEvent.click(screen.getByTestId('image-provider-select'));
  await waitFor(() =>
    expect(document.querySelector('[role="option"][value="xai"]')).not.toBeNull(),
  );
  fireEvent.click(document.querySelector('[role="option"][value="xai"]') as Element);

  fireEvent.change(screen.getByLabelText('Prompt'), {
    target: { value: 'Turn this into a cinematic still' },
  });
  await user.click(await screen.findByTestId('history-use-asset-history-2'));
  await user.click(screen.getByTestId('image-submit'));

  await waitFor(() => expect(editImageMock).toHaveBeenCalledTimes(1));
  expect(editImageMock).toHaveBeenCalledWith(
    expect.objectContaining({
      providerId: 'xai',
      model: 'grok-imagine-image',
      images: [{ type: 'asset', assetId: 'asset-history-2' }],
    }),
  );
});

test('ImageGenerationPage uploads a local file and adds it as a reference asset', async () => {
  const user = userEvent.setup();
  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });

  const file = new File(['image-bytes'], 'sample.png', { type: 'image/png' });
  await user.upload(screen.getByTestId('image-reference-upload-input'), file);

  await waitFor(() => expect(uploadImageAssetMock).toHaveBeenCalledTimes(1));
  expect(await screen.findByText('upload.png')).toBeInTheDocument();
  expect(await screen.findByAltText('upload.png')).toHaveAttribute(
    'src',
    expect.stringContaining('/api/v1/images/assets/asset-upload-1/content'),
  );
});

test('ImageGenerationPage upload still works when crypto.randomUUID is unavailable', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('crypto', {
    getRandomValues: (bytes: Uint8Array) => {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = index;
      }
      return bytes;
    },
  });

  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });

  const file = new File(['image-bytes'], 'mobile.png', { type: 'image/png' });
  await user.upload(screen.getByTestId('image-reference-upload-input'), file);

  await waitFor(() => expect(uploadImageAssetMock).toHaveBeenCalledTimes(1));
  expect(await screen.findByText('upload.png')).toBeInTheDocument();
});

test('ImageGenerationPage reuses and deletes uploaded reference assets from the catalog', async () => {
  const user = userEvent.setup();
  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });
  await user.click(screen.getByTestId('reference-catalog-open'));
  expect(await screen.findByText('Uploaded reference')).toBeInTheDocument();

  await user.click(
    await screen.findByTestId('reference-catalog-use-asset-upload-catalog-1'),
  );
  expect(await screen.findByText('Selected reference (1)')).toBeInTheDocument();
  await user.click(screen.getByTestId('selected-references-accordion'));
  expect(screen.getAllByAltText('Uploaded reference')[0]).toHaveAttribute(
    'src',
    expect.stringContaining('/api/v1/images/assets/asset-upload-catalog-1/content'),
  );

  await user.click(
    screen.getByTestId('reference-catalog-delete-asset-upload-catalog-1'),
  );
  expect(
    screen.getByTestId('reference-catalog-confirm-delete-asset-upload-catalog-1'),
  ).toBeInTheDocument();
  await user.click(
    screen.getByTestId('reference-catalog-confirm-delete-asset-upload-catalog-1'),
  );
  await waitFor(() =>
    expect(deleteImageAssetMock).toHaveBeenCalledWith('asset-upload-catalog-1'),
  );
});

test('ImageGenerationPage renames uploaded reference assets from the catalog', async () => {
  const user = userEvent.setup();
  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });
  await user.click(screen.getByTestId('reference-catalog-open'));
  const labelInput = await screen.findByTestId(
    'reference-catalog-label-asset-upload-catalog-1',
  );

  await user.clear(labelInput);
  await user.type(labelInput, 'Mood board ref');
  await user.click(
    screen.getByTestId('reference-catalog-rename-asset-upload-catalog-1'),
  );

  await waitFor(() =>
    expect(updateImageAssetMock).toHaveBeenCalledWith('asset-upload-catalog-1', {
      label: 'Mood board ref',
    }),
  );
});

test('ImageGenerationPage filters uploaded reference assets from the catalog', async () => {
  const user = userEvent.setup();
  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });
  await user.click(screen.getByTestId('reference-catalog-open'));
  const searchInput = await screen.findByTestId('reference-catalog-search');
  await user.type(searchInput, 'missing');
  expect(
    screen.getByText('No uploaded references match the current filters.'),
  ).toBeInTheDocument();

  await user.clear(searchInput);
  await user.click(screen.getByTestId('reference-catalog-use-asset-upload-catalog-1'));
  fireEvent.click(screen.getByTestId('reference-catalog-filter'));
  await waitFor(() =>
    expect(document.querySelector('[role="option"][value="selected"]')).not.toBeNull(),
  );
  fireEvent.click(document.querySelector('[role="option"][value="selected"]') as Element);
  expect(screen.getAllByText('Uploaded reference').length).toBeGreaterThan(0);
});

test('ImageGenerationPage hides NanoGPT paid-only models until the toggle is enabled', async () => {
  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });
  fireEvent.click(screen.getByTestId('image-provider-select'));
  await waitFor(() =>
    expect(document.querySelector('[role="option"][value="nanogpt"]')).not.toBeNull(),
  );
  fireEvent.click(document.querySelector('[role="option"][value="nanogpt"]') as Element);

  expect(await screen.findByTestId('nanogpt-paid-models-toggle')).toBeInTheDocument();
  expect(screen.getByDisplayValue('HiDream')).toBeInTheDocument();
  expect(screen.queryByDisplayValue('GPT Image 1')).not.toBeInTheDocument();

  fireEvent.click(screen.getByTestId('nanogpt-paid-models-toggle'));
  await waitFor(() =>
    expect(screen.getByTestId('nanogpt-paid-models-toggle')).toBeChecked(),
  );
  fireEvent.click(screen.getByTestId('image-model-select'));
  await waitFor(() =>
    expect(document.querySelector('[role="option"][value="gpt-image-1"]')).not.toBeNull(),
  );
});

test('ImageGenerationPage sorts NanoGPT image models alphabetically', async () => {
  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });

  fireEvent.click(screen.getByTestId('image-provider-select'));
  await waitFor(() =>
    expect(document.querySelector('[role="option"][value="nanogpt"]')).not.toBeNull(),
  );
  fireEvent.click(document.querySelector('[role="option"][value="nanogpt"]') as Element);

  fireEvent.click(screen.getByTestId('image-model-select'));
  const visibleOptions = Array.from(
    document.querySelectorAll('[role="option"]'),
  ).map((option) => option.textContent?.trim()).filter(Boolean);

  expect(visibleOptions.indexOf('GPT Image 1')).toBeLessThan(
    visibleOptions.indexOf('HiDream'),
  );
});

test('ImageGenerationPage applies mode-specific WAN resolutions when references switch the request to edit mode', async () => {
  const user = userEvent.setup();
  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });

  fireEvent.click(screen.getByTestId('image-provider-select'));
  await waitFor(() =>
    expect(document.querySelector('[role="option"][value="nanogpt"]')).not.toBeNull(),
  );
  fireEvent.click(document.querySelector('[role="option"][value="nanogpt"]') as Element);

  fireEvent.click(screen.getByTestId('image-model-select'));
  await waitFor(() =>
    expect(document.querySelector('[role="option"][value="wan-2.7-image-pro"]')).not.toBeNull(),
  );
  fireEvent.click(
    document.querySelector('[role="option"][value="wan-2.7-image-pro"]') as Element,
  );

  fireEvent.click(screen.getByTestId('image-resolution-select'));
  await waitFor(() =>
    expect(document.querySelector('[role="option"][value="4K"]')).not.toBeNull(),
  );
  fireEvent.click(document.querySelector('[role="option"][value="4K"]') as Element);

  fireEvent.change(screen.getByTestId('image-reference-url-input'), {
    target: { value: 'https://example.com/reference.png' },
  });
  await user.click(screen.getByTestId('image-add-reference-url'));

  fireEvent.click(screen.getByTestId('image-resolution-select'));
  await waitFor(() =>
    expect(document.querySelector('[role="option"][value="4K"]')).toBeNull(),
  );
  expect(document.querySelector('[role="option"][value="2K"]')).not.toBeNull();
});

test('ImageGenerationPage shows OpenAI-aligned GPT image controls for NanoGPT models', async () => {
  const user = userEvent.setup();
  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });

  fireEvent.click(screen.getByTestId('image-provider-select'));
  await waitFor(() =>
    expect(document.querySelector('[role="option"][value="nanogpt"]')).not.toBeNull(),
  );
  fireEvent.click(document.querySelector('[role="option"][value="nanogpt"]') as Element);

  await user.click(screen.getByTestId('nanogpt-paid-models-toggle'));
  fireEvent.click(screen.getByTestId('image-model-select'));
  await waitFor(() =>
    expect(document.querySelector('[role="option"][value="gpt-image-1"]')).not.toBeNull(),
  );
  fireEvent.click(document.querySelector('[role="option"][value="gpt-image-1"]') as Element);

  expect(
    screen.getByText('OpenAI-aligned GPT Image options'),
  ).toBeInTheDocument();
  expect(screen.getByTestId('image-background-select')).toBeInTheDocument();
  expect(screen.getByTestId('image-quality-select')).toBeInTheDocument();
  expect(screen.getByTestId('image-moderation-select')).toBeInTheDocument();
  expect(screen.getByTestId('image-output-format-select')).toBeInTheDocument();
  expect(screen.getByTestId('image-output-compression-input')).toBeInTheDocument();
});

test('ImageGenerationPage opens a responsive full-size history preview', async () => {
  const user = userEvent.setup();
  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });
  await user.click(await screen.findByTestId('history-view-asset-history-1'));

  expect(await screen.findByText('Full-size preview')).toBeInTheDocument();
  expect(await screen.findByTestId('history-preview-image')).toBeInTheDocument();
});

test('ImageGenerationPage copies the expanded history prompt to the clipboard', async () => {
  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });
  const [historySummary] = await screen.findAllByText('History prompt 1');
  const historyControl = historySummary.closest('button');
  expect(historyControl).not.toBeNull();
  fireEvent.click(historyControl as HTMLElement);
  const copyButton = await screen.findByRole('button', {
    name: 'Copy prompt to clipboard',
  });
  fireEvent.click(copyButton);

  await waitFor(() =>
    expect(writeClipboardTextMock).toHaveBeenCalledWith('History prompt 1'),
  );
  expect(screen.getByRole('button', { name: 'Copied prompt' })).toBeInTheDocument();
});

test('ImageGenerationPage renders immediate base64 results with the returned MIME type', async () => {
  const user = userEvent.setup();
  generateImageMock.mockImplementationOnce(async () => ({
    requestId: 'request-generate-webp-1',
    jobId: 'job-generate-webp-1',
    providerId: 'xai',
    model: 'grok-imagine-image',
    images: [
      {
        b64Json: 'webp-image',
        mimeType: 'image/webp',
        saved: false,
      },
    ],
  }));

  renderWithProviders(<ImageGenerationPage />);

  await screen.findByRole('heading', { name: 'Image Generation Lab' });
  fireEvent.change(screen.getByLabelText('Prompt'), {
    target: { value: 'A neon portrait' },
  });

  await user.click(screen.getByTestId('image-submit'));

  const resultImage = await screen.findByAltText('Generated result 1');
  expect(resultImage).toHaveAttribute('src', 'data:image/webp;base64,webp-image');
});
