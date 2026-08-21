import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Grid,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { IconClipboard, IconFlask, IconPlayerPlay } from '@tabler/icons-react';
import type {
  EvaluationProbeResult,
  EvaluationProfileReadiness,
  PgsGroundingInput,
} from '@lxp/contracts';

import { PageHeader } from '../components/page-header';
import { getEvaluationLabCopy } from '../features/evaluation-lab/evaluation-lab.copy';
import {
  clonePresetInput,
  EVALUATION_PRESETS,
} from '../features/evaluation-lab/evaluation-presets';
import { adminApiClient } from '../lib/admin-api-client';
import type { ParsedApiError } from '../lib/api-base';
import { copyText } from '../lib/copy-text';
import { getActiveTenantLabel } from '../lib/tenant-context';
import { useSession } from '../lib/use-session';

export function EvaluationLabPage() {
  const labels = getEvaluationLabCopy(navigator.language);
  const session = useSession();
  const [presetId, setPresetId] = useState(EVALUATION_PRESETS[0].id);
  const [input, setInput] = useState<PgsGroundingInput>(() =>
    clonePresetInput(EVALUATION_PRESETS[0].input),
  );
  const [copyError, setCopyError] = useState(false);
  const profiles = useQuery({
    queryKey: ['evaluation-profiles'],
    queryFn: () => adminApiClient.getEvaluationProfiles(),
    retry: false,
  });
  const [profileId, setProfileId] = useState('pgs-grounding-v1');
  const probe = useMutation({
    mutationFn: () =>
      adminApiClient.executeEvaluationProbe({
        profileId: 'pgs-grounding-v1',
        input,
      }),
  });
  const selectedProfile = profiles.data?.find(
    (profile) => profile.profileId === profileId,
  );

  function applyPreset(nextPresetId: string | null) {
    const preset = EVALUATION_PRESETS.find(({ id }) => id === nextPresetId);
    if (!preset) return;
    setPresetId(preset.id);
    setInput(clonePresetInput(preset.input));
  }

  async function copyResult() {
    if (!probe.data) return;
    setCopyError(false);
    try {
      await copyText(JSON.stringify(probe.data, null, 2));
    } catch {
      setCopyError(true);
    }
  }

  return (
    <>
      <PageHeader
        title={labels.title}
        description="Exercise server-controlled structured evaluation profiles through the real tenant-aware Gateway pipeline."
        context={getActiveTenantLabel(session.data)}
      />

      <Alert color="blue" icon={<IconFlask size={18} />} mb="lg">
        Evaluation results are structured evidence produced by the Gateway.
        Downstream services such as PGS remain responsible for policy and
        capability decisions. In local development, this request goes through
        Admin API on port 3002 to Gateway API on port 3001; it does not call the
        PGS application on port 3004.
      </Alert>

      <Grid align="stretch">
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Card h="100%" withBorder>
            <Stack gap="md">
              <Title order={2}>{labels.input}</Title>
              {profiles.isError ? (
                <Alert color="red" title="Profiles unavailable">
                  Evaluation profile metadata could not be loaded.
                </Alert>
              ) : null}
              <Select
                label={labels.profile}
                description={selectedProfile?.description}
                data={(profiles.data ?? []).map((profile) => ({
                  value: profile.profileId,
                  label: `${profile.displayName} (${profile.profileId})`,
                }))}
                disabled={profiles.isPending || probe.isPending}
                value={profileId}
                onChange={(value) => value && setProfileId(value)}
                required
              />
              {selectedProfile ? (
                <Stack gap="xs">
                  <Group gap="xs">
                    <Badge>Schema {selectedProfile.schemaVersion}</Badge>
                    <Badge variant="light">
                      Profile v{selectedProfile.profileVersion}
                    </Badge>
                    <Badge
                      color={
                        selectedProfile.readiness.ready ? 'green' : 'orange'
                      }
                    >
                      {selectedProfile.readiness.ready ? 'Ready' : 'Not ready'}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    Provider:{' '}
                    {selectedProfile.readiness.providerId ?? 'not configured'} ·
                    Model: {selectedProfile.readiness.model ?? 'not configured'}{' '}
                    · Credential:{' '}
                    {selectedProfile.readiness.credentialPath ?? 'unavailable'}
                  </Text>
                  {!selectedProfile.readiness.ready ? (
                    <Alert color="orange" title="Profile preflight failed">
                      {getReadinessFailureMessage(
                        selectedProfile.readiness,
                        navigator.language,
                      )}
                    </Alert>
                  ) : null}
                </Stack>
              ) : null}
              <Select
                label={labels.preset}
                description="Presets populate test data; they do not prescribe an expected policy outcome."
                data={EVALUATION_PRESETS.map((preset) => ({
                  value: preset.id,
                  label: preset.label,
                }))}
                disabled={probe.isPending}
                value={presetId}
                onChange={applyPreset}
              />
              <TextInput
                label="Question version ID"
                value={input.questionVersionId}
                onChange={(event) =>
                  setInput({
                    ...input,
                    questionVersionId: event.currentTarget.value,
                  })
                }
                required
              />
              <Grid>
                <Grid.Col span={{ base: 12, sm: 8 }}>
                  <TextInput
                    label="Rubric ID"
                    value={input.rubric.id}
                    onChange={(event) =>
                      setInput({
                        ...input,
                        rubric: {
                          ...input.rubric,
                          id: event.currentTarget.value,
                        },
                      })
                    }
                    required
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <NumberInput
                    label="Rubric version"
                    min={1}
                    value={input.rubric.version}
                    onChange={(value) =>
                      setInput({
                        ...input,
                        rubric: {
                          ...input.rubric,
                          version: typeof value === 'number' ? value : 1,
                        },
                      })
                    }
                    required
                  />
                </Grid.Col>
              </Grid>
              <Textarea
                label="Rubric guidance"
                minRows={3}
                maxLength={8000}
                value={input.rubric.guidance}
                onChange={(event) =>
                  setInput({
                    ...input,
                    rubric: {
                      ...input.rubric,
                      guidance: event.currentTarget.value,
                    },
                  })
                }
                required
              />
              <Textarea
                label="Candidate / observable content"
                description="This test content may be sent to the evaluator model configured for the active tenant."
                minRows={7}
                maxLength={10000}
                value={input.answerText}
                onChange={(event) =>
                  setInput({ ...input, answerText: event.currentTarget.value })
                }
                required
              />
              <TextInput
                label="Evidence reference"
                value={input.evidenceReference.referenceId}
                onChange={(event) =>
                  setInput({
                    ...input,
                    evidenceReference: {
                      kind: 'ASSESSMENT_ANSWER',
                      referenceId: event.currentTarget.value,
                    },
                  })
                }
                required
              />
              <Paper p="sm" withBorder>
                <Text fw={600} size="sm" mb="xs">
                  Allowed observable dimensions
                </Text>
                <Group gap="xs">
                  {Array.from(
                    new Set(
                      input.allowedSignals.flatMap(
                        (signal) => signal.dimensions,
                      ),
                    ),
                  ).map((dimension) => (
                    <Badge key={dimension} variant="outline">
                      {dimension}
                    </Badge>
                  ))}
                </Group>
              </Paper>
              <Button
                leftSection={<IconPlayerPlay size={17} />}
                loading={probe.isPending}
                disabled={
                  !selectedProfile ||
                  !selectedProfile.readiness.ready ||
                  !input.answerText.trim()
                }
                onClick={() => probe.mutate()}
              >
                {labels.run}
              </Button>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Card h="100%" withBorder>
            <Stack gap="md">
              <Title order={2}>{labels.result}</Title>
              {probe.isIdle ? (
                <Text c="dimmed">
                  Select a profile and run an evaluation to inspect structured
                  evidence.
                </Text>
              ) : null}
              {probe.isError ? (
                <ProbeError error={probe.error} labels={labels} />
              ) : null}
              {probe.data ? (
                <ResultPanel
                  labels={labels}
                  result={probe.data}
                  onCopy={copyResult}
                />
              ) : null}
              {copyError ? (
                <Alert color="red" title="Copy unavailable">
                  The sanitized result could not be copied.
                </Alert>
              ) : null}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </>
  );
}

function getReadinessFailureMessage(
  readiness: EvaluationProfileReadiness,
  language?: string,
): string {
  const provider = readiness.providerId ?? 'configured provider';
  const isFrench = language?.toLowerCase().startsWith('fr');

  if (readiness.reason === 'provider_credential_unavailable') {
    return isFrench
      ? `Aucun credential de portee tenant n'est configure pour ${provider}. Ajoutez-le sous Tenants > Provider Configurations > ${provider} > Tenant provider credential. Le fournisseur est celui du profil d'evaluation. "Provider Tokens" gere seulement les credentials personnels et ne s'applique pas a cette identite de service.`
      : `No tenant-scoped ${provider} credential is configured. Add one under Tenants > Provider Configurations > ${provider} > Tenant provider credential. The provider is selected by the evaluation profile. "Provider Tokens" manages personal credentials only and does not apply to this service identity.`;
  }
  if (readiness.reason === 'tenant_provider_disabled') {
    return isFrench
      ? `Le fournisseur ${provider} est desactive pour ce tenant. Activez-le sous Tenants > Provider Configurations > ${provider}.`
      : `Provider ${provider} is disabled for this tenant. Enable it under Tenants > Provider Configurations > ${provider}.`;
  }
  if (readiness.reason === 'model_not_allowed') {
    return isFrench
      ? `Le modele ${readiness.model ?? 'configure'} est refuse par la politique du tenant. Verifiez Tenants > Model Access Rules.`
      : `Model ${readiness.model ?? 'configured'} is denied by tenant policy. Review Tenants > Model Access Rules.`;
  }
  if (readiness.reason === 'evaluation_service_identity_unavailable') {
    return isFrench
      ? "L'Admin API n'a pas de cle d'integration d'evaluation pour ce tenant. Verifiez LXP_ADMIN_EVALUATION_API_KEYS_JSON dans apps/admin-api/.env."
      : 'Admin API has no evaluation integration key for this tenant. Check LXP_ADMIN_EVALUATION_API_KEYS_JSON in apps/admin-api/.env.';
  }
  if (readiness.reason === 'evaluation_profile_unavailable') {
    return isFrench
      ? "Le profil n'est pas configure dans apps/gateway-api/.env. Verifiez LXP_EVALUATION_PGS_GROUNDING_PROVIDER et LXP_EVALUATION_PGS_GROUNDING_MODEL."
      : 'The profile is not configured in apps/gateway-api/.env. Check LXP_EVALUATION_PGS_GROUNDING_PROVIDER and LXP_EVALUATION_PGS_GROUNDING_MODEL.';
  }

  return readiness.reason ?? 'The evaluator profile is not ready.';
}

function ResultPanel({
  labels,
  result,
  onCopy,
}: {
  labels: ReturnType<typeof getEvaluationLabCopy>;
  result: EvaluationProbeResult;
  onCopy(): void;
}) {
  return (
    <Stack gap="md">
      <Group gap="xs">
        <Badge color="teal">Succeeded</Badge>
        <Badge variant="outline">{result.profileId}</Badge>
        <Badge variant="outline">v{result.profileVersion}</Badge>
      </Group>
      <Grid>
        <Grid.Col span={6}>
          <Text size="xs" c="dimmed">
            {labels.latency}
          </Text>
          <Text fw={600}>{result.latencyMs} ms</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <Text size="xs" c="dimmed">
            Schema version
          </Text>
          <Text fw={600}>{result.schemaVersion}</Text>
        </Grid.Col>
        <Grid.Col span={12}>
          <Text size="xs" c="dimmed">
            {labels.evaluationId}
          </Text>
          <Code>{result.evaluationId}</Code>
        </Grid.Col>
        <Grid.Col span={12}>
          <Text size="xs" c="dimmed">
            Request / correlation ID
          </Text>
          <Code>{result.requestId}</Code>
        </Grid.Col>
        <Grid.Col span={12}>
          <Text size="xs" c="dimmed">
            Timestamp
          </Text>
          <Text>{result.timestamp}</Text>
        </Grid.Col>
      </Grid>
      <Title order={3}>{labels.evidence}</Title>
      {result.evidence.observations.length ? (
        result.evidence.observations.map(({ signal, confidence }) => (
          <Paper key={signal.id} p="sm" withBorder>
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Text fw={600}>{signal.code}</Text>
                <Group gap="xs">
                  <Badge variant="light">{signal.direction}</Badge>
                  <Badge
                    color={
                      signal.severity === 'HIGH' ||
                      signal.severity === 'CRITICAL'
                        ? 'red'
                        : 'teal'
                    }
                  >
                    {signal.severity}
                  </Badge>
                </Group>
              </Stack>
              <Text fw={700}>{Math.round(confidence * 100)}%</Text>
            </Group>
          </Paper>
        ))
      ) : (
        <Text c="dimmed">No observable signals were returned.</Text>
      )}
      <Grid>
        <Grid.Col span={6}>
          <Text size="sm" c="dimmed">
            Ambiguity
          </Text>
          <Text fw={600}>
            {Math.round(result.evidence.ambiguity.score * 100)}%
          </Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <Text size="sm" c="dimmed">
            Contradiction detected
          </Text>
          <Text fw={600}>
            {result.evidence.contradiction.detected ? 'Yes' : 'No'}
          </Text>
        </Grid.Col>
        <Grid.Col span={12}>
          <Text size="sm" c="dimmed">
            Follow-up recommended
          </Text>
          <Text fw={600}>
            {result.evidence.followUpRecommended ? 'Yes' : 'No'}
          </Text>
        </Grid.Col>
      </Grid>
      <Button
        variant="light"
        leftSection={<IconClipboard size={16} />}
        onClick={onCopy}
      >
        Copy sanitized result
      </Button>
      <Accordion variant="contained">
        <Accordion.Item value="raw">
          <Accordion.Control>Raw sanitized response</Accordion.Control>
          <Accordion.Panel>
            <Code block>{JSON.stringify(result, null, 2)}</Code>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

function ProbeError({
  error,
  labels,
}: {
  error: Error;
  labels: ReturnType<typeof getEvaluationLabCopy>;
}) {
  const apiError = error as Error & Partial<ParsedApiError>;
  const copyByCode: Record<string, string> = {
    evaluation_timeout: labels.timeout,
    evaluation_provider_unavailable: labels.unavailable,
    evaluation_provider_authentication_failed:
      'The evaluator provider rejected its configured credentials.',
    evaluation_rate_limited: 'The configured evaluator is rate limited.',
    evaluation_invalid_output: labels.invalidOutput,
    invalid_evaluation_input:
      'The evaluation input does not match the selected profile.',
    unknown_evaluation_profile:
      'The selected evaluation profile is not available.',
    unsupported_evaluation_schema_version:
      'The evaluation schema version is not supported.',
    evaluation_service_identity_unavailable:
      'Evaluation probes are not configured for the active tenant. Provision an integration key with evaluation:invoke, then map the tenant UUID to that key in LXP_ADMIN_EVALUATION_API_KEYS_JSON and restart Admin API.',
    evaluation_service_authentication_failed:
      'The Gateway rejected the configured evaluation service identity.',
    evaluation_service_forbidden:
      'The evaluation service identity lacks evaluation:invoke.',
    evaluation_provider_credential_unavailable:
      'No active tenant credential is configured for the selected evaluator provider. Add one under Tenants > Provider Configurations.',
    evaluation_model_forbidden:
      'The selected evaluator model is denied by the tenant model-access policy.',
  };
  const message =
    (apiError.code && copyByCode[apiError.code]) ||
    (apiError.status === 401 || apiError.status === 403
      ? labels.unauthorized
      : 'The evaluation probe failed unexpectedly.');
  return (
    <Alert color="red" title="Evaluation failed">
      {message}
    </Alert>
  );
}
