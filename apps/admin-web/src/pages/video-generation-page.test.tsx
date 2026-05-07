import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { VIDEO_LAB_DRAFT_STORAGE_KEY } from '../features/video-lab/use-video-lab';
import { renderWithProviders } from '../test/test-utils';
import { VideoGenerationPage } from './video-generation-page';

const {
  cancelVideoJobMock,
  generateVideoMock,
  getImageAssetsMock,
  getVideoCatalogMock,
  getVideoHistoryMock,
  getVideoJobMock,
  uploadImageAssetMock,
} = vi.hoisted(() => ({
  cancelVideoJobMock: vi.fn(async (jobId: string) => ({
    id: jobId,
    requestId: 'request-video-cancelled-1',
    providerId: 'openrouter',
    model: 'openrouter/kling-v1',
    prompt: 'Hold on the lantern in the rain',
    status: 'cancelled' as const,
    createdAt: '2026-05-07T12:00:00.000Z',
    cancelledAt: '2026-05-07T12:01:00.000Z',
    outputs: [],
  })),
  generateVideoMock: vi.fn(async () => ({
    id: 'video-job-1',
    requestId: 'request-video-1',
    providerId: 'openrouter',
    model: 'openrouter/kling-v1',
    prompt: 'Animate the still image with subtle camera drift',
    status: 'queued' as const,
    createdAt: '2026-05-07T12:00:00.000Z',
    outputs: [],
  })),
  getImageAssetsMock: vi.fn(async () => ({
    items: [
      {
        id: 'asset-upload-catalog-1',
        label: 'Storyboard still',
        mimeType: 'image/png',
        contentUrl: '/api/v1/images/assets/asset-upload-catalog-1/content',
        sourceType: 'upload' as const,
        saved: false,
        createdAt: '2026-05-07T11:55:00.000Z',
      },
    ],
  })),
  getVideoCatalogMock: vi.fn(async () => ({
    providers: [
      {
        providerId: 'openrouter',
        displayName: 'OpenRouter',
        defaultModelId: 'openrouter/kling-v1',
        models: [
          {
            id: 'openrouter/kling-v1',
            displayName: 'Kling v1',
            capabilities: {
              supportsVideoGeneration: true,
              supportsVideoReferenceImages: true,
              supportsVideoAudioGeneration: true,
              supportedVideoAspectRatios: [
                { value: '16:9', label: '16:9' },
                { value: '9:16', label: '9:16' },
              ],
              supportedVideoResolutions: [
                { value: '720p', label: '720p' },
                { value: '1080p', label: '1080p' },
              ],
              supportedVideoSizes: [{ value: '1280x720', label: '1280 x 720' }],
              supportedVideoDurations: [
                { value: 5, label: '5 seconds' },
                { value: 10, label: '10 seconds' },
              ],
              maxReferenceImagesPerRequest: 3,
              videoDefaults: {
                durationSeconds: 5,
                aspectRatio: '16:9',
                resolution: '720p',
                size: '1280x720',
                generateAudio: false,
              },
            },
          },
        ],
      },
      {
        providerId: 'xai',
        displayName: 'xAI',
        defaultModelId: 'grok-video-1',
        models: [
          {
            id: 'grok-video-1',
            displayName: 'Grok Video 1',
            capabilities: {
              supportsVideoGeneration: true,
              supportsVideoReferenceImages: false,
              supportedVideoDurations: [{ value: 5, label: '5 seconds' }],
              videoDefaults: {
                durationSeconds: 5,
              },
            },
          },
        ],
      },
    ],
  })),
  getVideoHistoryMock: vi.fn(async (page = 1) => ({
    items: [
      {
        id: `history-video-job-${page}`,
        requestId: `request-history-video-${page}`,
        providerId: 'openrouter',
        model: 'openrouter/kling-v1',
        prompt: `History video prompt ${page}`,
        status: 'succeeded' as const,
        createdAt: '2026-05-07T11:30:00.000Z',
        completedAt: '2026-05-07T11:31:10.000Z',
        durationMs: 70000,
        outputs: [
          {
            assetId: `history-video-asset-${page}`,
            contentUrl: `/api/v1/videos/assets/history-video-asset-${page}/content`,
            mimeType: 'video/mp4',
            width: 1280,
            height: 720,
            durationSeconds: 5,
            byteSize: 1048576,
          },
        ],
      },
    ],
    page,
    pageSize: 10,
    totalItems: 12,
    totalPages: 2,
  })),
  getVideoJobMock: vi.fn(async (jobId: string) => ({
    id: jobId,
    requestId: 'request-video-1',
    providerId: 'openrouter',
    model: 'openrouter/kling-v1',
    prompt: 'Animate the still image with subtle camera drift',
    status: 'succeeded' as const,
    createdAt: '2026-05-07T12:00:00.000Z',
    completedAt: '2026-05-07T12:00:09.000Z',
    durationMs: 9000,
    outputs: [
      {
        assetId: 'video-output-1',
        contentUrl: '/api/v1/videos/assets/video-output-1/content',
        mimeType: 'video/mp4',
        width: 1280,
        height: 720,
        durationSeconds: 5,
        byteSize: 2097152,
      },
    ],
  })),
  uploadImageAssetMock: vi.fn(async () => ({
    asset: {
      id: 'asset-upload-1',
      label: 'upload.png',
      mimeType: 'image/png',
      contentUrl: '/api/v1/images/assets/asset-upload-1/content',
      sourceType: 'upload' as const,
      saved: false,
      createdAt: '2026-05-07T12:00:00.000Z',
    },
  })),
}));

vi.mock('../lib/api-client', async () => {
  const actual = await vi.importActual('../lib/api-client');
  return {
    ...actual,
    gatewayApiClient: {
      getVideoCatalog: getVideoCatalogMock,
      getImageAssets: getImageAssetsMock,
      getVideoHistory: getVideoHistoryMock,
      generateVideo: generateVideoMock,
      getVideoJob: getVideoJobMock,
      cancelVideoJob: cancelVideoJobMock,
      uploadImageAsset: uploadImageAssetMock,
    },
  };
});

beforeEach(() => {
  cancelVideoJobMock.mockClear();
  generateVideoMock.mockClear();
  getImageAssetsMock.mockClear();
  getVideoCatalogMock.mockClear();
  getVideoHistoryMock.mockClear();
  getVideoJobMock.mockClear();
  uploadImageAssetMock.mockClear();
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

test('VideoGenerationPage renders providers, request controls, and history from the backend catalog', async () => {
  renderWithProviders(<VideoGenerationPage />);

  await screen.findByRole('heading', { name: 'Video Generation Lab' });
  await waitFor(() => expect(getVideoCatalogMock).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(getImageAssetsMock).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(getVideoHistoryMock).toHaveBeenCalledTimes(1));

  expect(screen.getByTestId('video-provider-select')).toBeInTheDocument();
  expect(screen.getByTestId('video-model-select')).toBeInTheDocument();
  expect(screen.getByTestId('video-duration-select')).toBeInTheDocument();
  expect(screen.getByText('Video history')).toBeInTheDocument();
  expect(screen.getByText('Storyboard still')).toBeInTheDocument();
});

test('VideoGenerationPage restores the saved draft after a remount-like refresh', async () => {
  window.localStorage.setItem(
    VIDEO_LAB_DRAFT_STORAGE_KEY,
    JSON.stringify({
      providerId: 'openrouter',
      modelId: 'openrouter/kling-v1',
      prompt: 'Return to this cinematic draft later',
      durationSeconds: '10',
      aspectRatio: '9:16',
      resolution: '1080p',
      size: '1280x720',
      generateAudio: true,
      referenceUrl: 'https://example.com/reference-frame.png',
      references: [
        {
          id: 'reference-1',
          kind: 'image_url',
          url: 'https://example.com/reference-frame.png',
          label: 'https://example.com/reference-frame.png',
          previewUrl: 'https://example.com/reference-frame.png',
        },
      ],
    }),
  );

  renderWithProviders(<VideoGenerationPage />);

  await screen.findByRole('heading', { name: 'Video Generation Lab' });
  expect(
    await screen.findByDisplayValue('Return to this cinematic draft later'),
  ).toBeInTheDocument();
  expect(
    screen.getByDisplayValue('https://example.com/reference-frame.png'),
  ).toBeInTheDocument();
  expect(screen.getByText('1 / 3 selected')).toBeInTheDocument();
});

test('VideoGenerationPage submits an image-to-video job using a selected uploaded asset and then shows the ingested result', async () => {
  const user = userEvent.setup();
  renderWithProviders(<VideoGenerationPage />);

  await screen.findByRole('heading', { name: 'Video Generation Lab' });
  const file = new File(['image-bytes'], 'sample.png', { type: 'image/png' });
  await user.upload(screen.getByTestId('video-reference-upload-input'), file);
  await screen.findByText('upload.png');
  fireEvent.change(screen.getByLabelText('Prompt'), {
    target: { value: 'Animate the still image with subtle camera drift' },
  });

  await user.click(screen.getByTestId('video-submit'));

  await waitFor(() =>
    expect(generateVideoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'openrouter',
        model: 'openrouter/kling-v1',
        prompt: 'Animate the still image with subtle camera drift',
        referenceImages: [{ type: 'asset', assetId: 'asset-upload-1' }],
      }),
    ),
  );
  expect(await screen.findAllByText('Output 1')).not.toHaveLength(0);
  expect(document.querySelector('video')).not.toBeNull();
});

test(
  'VideoGenerationPage polls the active job until a terminal succeeded state is returned',
  async () => {
    const user = userEvent.setup();
  getVideoJobMock
    .mockResolvedValueOnce({
      id: 'video-job-1',
      requestId: 'request-video-1',
      providerId: 'openrouter',
      model: 'openrouter/kling-v1',
      prompt: 'Animate the still image with subtle camera drift',
      status: 'running' as const,
      createdAt: '2026-05-07T12:00:00.000Z',
      startedAt: '2026-05-07T12:00:02.000Z',
      outputs: [],
    })
    .mockResolvedValueOnce({
      id: 'video-job-1',
      requestId: 'request-video-1',
      providerId: 'openrouter',
      model: 'openrouter/kling-v1',
      prompt: 'Animate the still image with subtle camera drift',
      status: 'succeeded' as const,
      createdAt: '2026-05-07T12:00:00.000Z',
      completedAt: '2026-05-07T12:00:10.000Z',
      durationMs: 8000,
      outputs: [
        {
          assetId: 'video-output-1',
          contentUrl: '/api/v1/videos/assets/video-output-1/content',
          mimeType: 'video/mp4',
          width: 1280,
          height: 720,
          durationSeconds: 5,
          byteSize: 2097152,
        },
      ],
    });

  renderWithProviders(<VideoGenerationPage />);

  await screen.findByRole('heading', { name: 'Video Generation Lab' });
  fireEvent.change(screen.getByLabelText('Prompt'), {
    target: { value: 'Animate the still image with subtle camera drift' },
  });
  await user.click(screen.getByTestId('video-submit'));

  await waitFor(() => expect(getVideoJobMock).toHaveBeenCalledTimes(1));
  await new Promise((resolve) => window.setTimeout(resolve, 3200));
  await waitFor(() => expect(getVideoJobMock).toHaveBeenCalledTimes(2));
  expect(await screen.findAllByText('Output 1')).not.toHaveLength(0);
  },
  12000,
);

test('VideoGenerationPage cancels a non-terminal job from the results panel', async () => {
  const user = userEvent.setup();
  getVideoJobMock.mockResolvedValueOnce({
    id: 'video-job-1',
    requestId: 'request-video-1',
    providerId: 'openrouter',
    model: 'openrouter/kling-v1',
    prompt: 'Hold on the lantern in the rain',
    status: 'running' as const,
    createdAt: '2026-05-07T12:00:00.000Z',
    startedAt: '2026-05-07T12:00:03.000Z',
    outputs: [],
  });

  renderWithProviders(<VideoGenerationPage />);

  await screen.findByRole('heading', { name: 'Video Generation Lab' });
  fireEvent.change(screen.getByLabelText('Prompt'), {
    target: { value: 'Hold on the lantern in the rain' },
  });
  await user.click(screen.getByTestId('video-submit'));
  await waitFor(() => expect(getVideoJobMock).toHaveBeenCalledTimes(1));

  await user.click(await screen.findByRole('button', { name: 'Cancel job' }));

  await waitFor(() =>
    expect(cancelVideoJobMock).toHaveBeenCalledWith('video-job-1'),
  );
  expect(await screen.findByText('Generation cancelled')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancel job' })).toBeDisabled();
});
