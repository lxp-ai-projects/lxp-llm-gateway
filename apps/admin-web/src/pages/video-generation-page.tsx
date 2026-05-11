import { Grid } from '@mantine/core';

import { PageHeader } from '../components/page-header';
import { VideoHistoryPanel } from '../features/video-lab/components/video-history-panel';
import { VideoRequestForm } from '../features/video-lab/components/video-request-form';
import { VideoResultsPanel } from '../features/video-lab/components/video-results-panel';
import { useVideoLab } from '../features/video-lab/use-video-lab';

export function VideoGenerationPage() {
  const videoLab = useVideoLab();

  return (
    <>
      <input
        id="video-reference-upload-input"
        ref={videoLab.fileInputRef}
        accept="image/*"
        data-testid="video-reference-upload-input"
        hidden
        onChange={(event) => {
          void videoLab.handleFileSelection(event.currentTarget.files);
          event.currentTarget.value = '';
        }}
        type="file"
      />
      <PageHeader
        title="Video Generation Lab"
        description="Create, poll, ingest, preview, and download gateway-managed video jobs from text or image references."
      />

      <Grid>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <VideoRequestForm videoLab={videoLab} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <VideoResultsPanel videoLab={videoLab} />
        </Grid.Col>
        <Grid.Col span={12}>
          <VideoHistoryPanel videoLab={videoLab} />
        </Grid.Col>
      </Grid>
    </>
  );
}
