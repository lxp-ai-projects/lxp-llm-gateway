import { useTranslation } from 'react-i18next';
import {
  Accordion,
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Modal,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useState } from 'react';

import { formatDateTime } from '../../../i18n/format';
import { getLocalizedErrorMessage } from '../../../i18n/errors';
import { copyText } from '../../../lib/copy-text';
import type { ReturnTypeUseImageLab } from '../use-image-lab.types';

export function ImageHistoryPanel({
  imageLab,
}: {
  imageLab: ReturnTypeUseImageLab;
}) {
  const { t } = useTranslation('image');
  const history = imageLab.history;
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const isSmallViewport = useMediaQuery('(max-width: 48em)');
  const isHistoryLoading = imageLab.historyQuery.isPending;

  return (
    <>
      <Modal
        centered
        fullScreen={isSmallViewport}
        onClose={() => setSelectedImage(null)}
        opened={selectedImage !== null}
        size={isSmallViewport ? '100%' : 'calc(100vw - 8rem)'}
        title={t('imageHistoryPanel.fullSizePreview')}
      >
        {selectedImage ? (
          <Image
            alt={selectedImage.alt}
            data-testid="history-preview-image"
            fit="contain"
            mah={
              isSmallViewport ? 'calc(100vh - 10rem)' : 'calc(100vh - 14rem)'
            }
            src={selectedImage.src}
          />
        ) : null}
      </Modal>
      <Card className="section-card">
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={3}>{t('imageHistoryPanel.generatedHistory')}</Title>
            <Text c="dimmed" size="sm">
              {t('imageHistoryPanel.10ItemsPerPage')}
            </Text>
          </Group>

          {isHistoryLoading ? (
            <Stack gap="sm">
              {Array.from({ length: 3 }, (_, index) => (
                <Card
                  key={`history-skeleton-${index}`}
                  className="image-history-card"
                  data-testid={`history-skeleton-${index}`}
                  withBorder
                >
                  <Stack gap="sm">
                    <Group align="flex-start" gap="md" wrap="nowrap">
                      <Skeleton height={88} radius="md" width={88} />
                      <Stack
                        className="image-history-summary"
                        gap={8}
                        style={{ flex: 1 }}
                      >
                        <Skeleton height={20} radius="sm" width="38%" />
                        <Skeleton height={18} radius="sm" width="24%" />
                        <Skeleton height={16} radius="sm" width="100%" />
                        <Skeleton height={16} radius="sm" width="92%" />
                      </Stack>
                    </Group>
                    <Group gap="xs">
                      <Skeleton height={30} radius="xl" width={154} />
                      <Skeleton height={30} radius="xl" width={132} />
                      <Skeleton height={30} radius="xl" width={60} />
                    </Group>
                  </Stack>
                </Card>
              ))}
            </Stack>
          ) : !history?.items.length ? (
            <Alert color="gray" title={t('imageHistoryPanel.noHistoryYet')}>
              {t('imageHistoryPanel.generatedAndEditedJobsWillAppearHere')}
            </Alert>
          ) : (
            <Stack gap="sm">
              {history.items.map((item) => {
                const primaryImage = item.images[0];
                const primarySrc = primaryImage
                  ? imageLab.mediaUrl(primaryImage.contentUrl)
                  : null;
                const primaryAlt = primaryImage?.label ?? 'History asset';

                return (
                  <Card key={item.id} className="image-history-card" withBorder>
                    <Stack gap="sm">
                      <Accordion
                        chevronPosition="right"
                        defaultValue={null}
                        variant="separated"
                      >
                        <Accordion.Item value={item.id}>
                          <Accordion.Control
                            data-testid={`history-accordion-${item.id}`}
                          >
                            <Group align="flex-start" gap="md" wrap="nowrap">
                              {primaryImage ? (
                                <Image
                                  alt={primaryAlt}
                                  className="image-history-thumbnail"
                                  data-testid={`history-image-${primaryImage.id}`}
                                  h={88}
                                  radius="md"
                                  src={primarySrc}
                                  w={88}
                                />
                              ) : null}
                              <Stack className="image-history-summary" gap={4}>
                                <Text fw={600} size="sm">
                                  {item.providerId} / {item.model}
                                </Text>
                                <Text c="dimmed" size="sm">
                                  {formatDateTime(item.createdAt)}
                                </Text>
                                <Text c="dimmed" lineClamp={2} size="sm">
                                  {item.prompt}
                                </Text>
                              </Stack>
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Stack gap="md">
                              <Stack gap={4}>
                                <Text fw={600} size="sm">
                                  {t('imageHistoryPanel.prompt')}
                                </Text>
                                <Text size="sm">{item.prompt}</Text>
                                <Button
                                  onClick={async () => {
                                    try {
                                      await copyText(item.prompt);
                                      setCopiedPromptId(item.id);
                                      setCopyError(null);
                                    } catch (error) {
                                      setCopyError(
                                        getLocalizedErrorMessage(error),
                                      );
                                    }
                                  }}
                                  size="compact-sm"
                                  variant="light"
                                >
                                  {copiedPromptId === item.id
                                    ? t('imageHistoryPanel.copiedPrompt')
                                    : t('imageHistoryPanel.copyPrompt')}
                                </Button>
                                {copyError ? (
                                  <Alert
                                    color="red"
                                    title={t(
                                      'imageHistoryPanel.copyUnavailable',
                                    )}
                                  >
                                    {copyError}
                                  </Alert>
                                ) : null}
                              </Stack>

                              <Stack gap={4}>
                                <Text fw={600} size="sm">
                                  {t('imageHistoryPanel.referenceAssetsUsed')}
                                </Text>
                                <Text c="dimmed" size="sm">
                                  {t(
                                    'imageHistoryPanel.notCapturedInTheCurrentHistoryPayload',
                                  )}
                                </Text>
                              </Stack>

                              <Stack gap={4}>
                                <Text fw={600} size="sm">
                                  {t('imageHistoryPanel.generationOptions')}
                                </Text>
                                <Group gap="xs">
                                  <Badge variant="light">{item.mode}</Badge>
                                  <Badge variant="light">
                                    {item.providerId}
                                  </Badge>
                                  <Badge variant="light">{item.model}</Badge>
                                </Group>
                              </Stack>

                              <Stack gap={4}>
                                <Text fw={600} size="sm">
                                  {t(
                                    'imageHistoryPanel.providerResponseMetadata',
                                  )}
                                </Text>
                                {item.providerMetadata ||
                                item.images.some(
                                  (image) => image.providerMetadata,
                                ) ? (
                                  <Stack gap="xs">
                                    {item.providerMetadata ? (
                                      <MetadataCard
                                        label={t(
                                          'imageHistoryPanel.jobMetadata',
                                        )}
                                        value={item.providerMetadata}
                                      />
                                    ) : null}
                                    {item.images.map((image) =>
                                      image.providerMetadata ? (
                                        <MetadataCard
                                          key={`${image.id}-provider-metadata`}
                                          label={image.label ?? image.id}
                                          value={image.providerMetadata}
                                        />
                                      ) : null,
                                    )}
                                  </Stack>
                                ) : (
                                  <Text c="dimmed" size="sm">
                                    {t(
                                      'imageHistoryPanel.notCapturedInTheCurrentHistoryPayload',
                                    )}
                                  </Text>
                                )}
                              </Stack>

                              <Stack gap="xs">
                                <Text fw={600} size="sm">
                                  {t('imageHistoryPanel.resultURLStorageInfo')}
                                </Text>
                                {item.images.map((image) => (
                                  <Card
                                    key={image.id}
                                    className="image-history-detail-card"
                                    withBorder
                                  >
                                    <Stack gap={4}>
                                      <Text fw={500} size="sm">
                                        {image.label ?? image.id}
                                      </Text>
                                      <Text c="dimmed" size="sm">
                                        {t('imageHistoryPanel.assetID')}
                                        {image.id}
                                      </Text>
                                      <Text c="dimmed" size="sm">
                                        {t('imageHistoryPanel.mimeType')}
                                        {image.mimeType}
                                      </Text>
                                      <Text c="dimmed" size="sm">
                                        {t('imageHistoryPanel.sourceType')}
                                        {t(
                                          `imageHistoryPanel.sourceTypes.${image.sourceType}`,
                                        )}
                                      </Text>
                                      <Text c="dimmed" size="sm">
                                        {t('imageHistoryPanel.saved')}
                                        {image.saved
                                          ? t('imageHistoryPanel.yes')
                                          : t('imageHistoryPanel.no')}
                                      </Text>
                                      <Anchor
                                        href={
                                          imageLab.mediaUrl(image.contentUrl) ??
                                          image.contentUrl
                                        }
                                        size="sm"
                                        target="_blank"
                                      >
                                        {t('imageHistoryPanel.openStoredAsset')}
                                      </Anchor>
                                      {image.revisedPrompt ? (
                                        <Text c="dimmed" size="sm">
                                          {t('imageHistoryPanel.revisedPrompt')}
                                          {image.revisedPrompt}
                                        </Text>
                                      ) : null}
                                    </Stack>
                                  </Card>
                                ))}
                              </Stack>
                            </Stack>
                          </Accordion.Panel>
                        </Accordion.Item>
                      </Accordion>

                      {primaryImage ? (
                        <Group gap="xs">
                          <Button
                            data-testid={`history-use-${primaryImage.id}`}
                            onClick={() =>
                              imageLab.addReferenceAsset(primaryImage)
                            }
                            size="compact-sm"
                            variant="light"
                          >
                            {t('imageHistoryPanel.useAsReference')}
                          </Button>
                          <Button
                            data-testid={`history-view-${primaryImage.id}`}
                            onClick={() =>
                              setSelectedImage({
                                src: primarySrc ?? '',
                                alt: primaryAlt,
                              })
                            }
                            size="compact-sm"
                            variant="default"
                          >
                            {t('imageHistoryPanel.viewFullSize')}
                          </Button>
                          <Button
                            onClick={() =>
                              imageLab.saveMutation.mutate({
                                assetId: primaryImage.id,
                                saved: !primaryImage.saved,
                              })
                            }
                            size="compact-sm"
                            variant="default"
                          >
                            {primaryImage.saved
                              ? t('imageHistoryPanel.savedAction')
                              : t('imageHistoryPanel.saveAction')}
                          </Button>
                        </Group>
                      ) : null}
                    </Stack>
                  </Card>
                );
              })}
            </Stack>
          )}

          <Group justify="space-between">
            <Button
              disabled={!history || history.page <= 1}
              onClick={() =>
                imageLab.setHistoryPage((current) => Math.max(1, current - 1))
              }
              variant="default"
            >
              {t('imageHistoryPanel.previous')}
            </Button>
            <Text c="dimmed" size="sm">
              {t('imageHistoryPanel.page')}
              {history?.page ?? 1} / {history?.totalPages ?? 1}
            </Text>
            <Button
              disabled={!history || history.page >= history.totalPages}
              onClick={() => imageLab.setHistoryPage((current) => current + 1)}
              variant="default"
            >
              {t('imageHistoryPanel.next')}
            </Button>
          </Group>
        </Stack>
      </Card>
    </>
  );
}

function MetadataCard({
  label,
  value,
}: {
  label: string;
  value: Record<string, unknown>;
}) {
  return (
    <Card className="image-history-detail-card" withBorder>
      <Stack gap={4}>
        <Text fw={500} size="sm">
          {label}
        </Text>
        <Text className="image-history-metadata" component="pre" size="xs">
          {JSON.stringify(value, null, 2)}
        </Text>
      </Stack>
    </Card>
  );
}
