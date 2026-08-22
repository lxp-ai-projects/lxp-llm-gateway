import { Grid } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '../components/page-header';
import { ImageHistoryPanel } from '../features/image-lab/components/image-history-panel';
import { ImageRequestForm } from '../features/image-lab/components/image-request-form';
import { ImageResultsPanel } from '../features/image-lab/components/image-results-panel';
import { useImageLab } from '../features/image-lab/use-image-lab';

export function ImageGenerationPage() {
  const { t } = useTranslation('pages');
  const imageLab = useImageLab();

  return (
    <>
      <input
        id="image-reference-upload-input"
        ref={imageLab.fileInputRef}
        accept="image/*"
        data-testid="image-reference-upload-input"
        hidden
        multiple
        onChange={(event) => {
          void imageLab.handleFileSelection(event.currentTarget.files);
          event.currentTarget.value = '';
        }}
        type="file"
      />
      <PageHeader
        title={t('image.title')}
        description={t('image.description')}
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
