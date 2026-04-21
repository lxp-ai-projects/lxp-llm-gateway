import { Grid } from '@mantine/core';

import { PageHeader } from '../components/page-header';
import { ImageHistoryPanel } from '../features/image-lab/components/image-history-panel';
import { ImageRequestForm } from '../features/image-lab/components/image-request-form';
import { ImageResultsPanel } from '../features/image-lab/components/image-results-panel';
import { useImageLab } from '../features/image-lab/use-image-lab';

export function ImageGenerationPage() {
  const imageLab = useImageLab();

  return (
    <>
      <input
        ref={imageLab.fileInputRef}
        accept="image/*"
        hidden
        multiple
        onChange={(event) => {
          void imageLab.handleFileSelection(event.currentTarget.files);
          event.currentTarget.value = '';
        }}
        type="file"
      />
      <PageHeader
        title="Image Generation Lab"
        description="Generate, edit, save, and reuse images through the gateway-managed image workflow."
      />

      <Grid>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <ImageRequestForm imageLab={imageLab} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <ImageResultsPanel imageLab={imageLab} />
        </Grid.Col>
        <Grid.Col span={12}>
          <ImageHistoryPanel imageLab={imageLab} />
        </Grid.Col>
      </Grid>
    </>
  );
}
