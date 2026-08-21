import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import { adminWebTheme } from '../app/theme';
import { EvaluationLabPage } from './evaluation-lab-page';

const { executeProbeMock, getProfilesMock, useSessionMock } = vi.hoisted(
  () => ({
    executeProbeMock: vi.fn(),
    getProfilesMock: vi.fn(),
    useSessionMock: vi.fn(),
  }),
);

vi.mock('../lib/admin-api-client', () => ({
  adminApiClient: {
    getEvaluationProfiles: getProfilesMock,
    executeEvaluationProbe: executeProbeMock,
  },
}));

vi.mock('../lib/use-session', () => ({ useSession: useSessionMock }));

const result = {
  schemaVersion: '1',
  profileId: 'pgs-grounding-v1',
  profileVersion: '1',
  evaluationId: 'evaluation-123',
  requestId: 'request-456',
  latencyMs: 842,
  timestamp: '2026-08-17T12:00:00.000Z',
  evidence: {
    observations: [
      {
        signal: {
          id: 'signal-1',
          version: 1,
          code: 'REALITY_FRAMING_PRESENT',
          direction: 'PROTECTIVE',
          severity: 'LOW',
          dimensions: ['REALITY_FRAMING'],
        },
        confidence: 0.91,
      },
    ],
    ambiguity: { score: 0.1, reasons: [] },
    contradiction: { detected: false },
    followUpRecommended: false,
  },
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={adminWebTheme}>
        <EvaluationLabPage />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getProfilesMock.mockReset();
  executeProbeMock.mockReset();
  useSessionMock.mockReset();
  getProfilesMock.mockResolvedValue([
    {
      profileId: 'pgs-grounding-v1',
      profileVersion: '1',
      schemaVersion: '1',
      displayName: 'PGS grounding evidence',
      description: 'Structured evidence only.',
      inputKind: 'pgs-grounding',
      readiness: {
        profileConfigured: true,
        providerId: 'openai',
        model: 'gpt-evaluator',
        tenantProviderEnabled: true,
        modelAllowed: true,
        credentialPath: 'tenant',
        ready: true,
        reason: null,
      },
    },
  ]);
  useSessionMock.mockReturnValue({
    data: {
      activeTenantId: 'tenant-1',
      activeTenantSlug: 'tenant-one',
      roles: ['operator'],
      globalRoles: [],
      availableTenants: [
        {
          id: 'tenant-1',
          slug: 'tenant-one',
          displayName: 'Tenant One',
          roles: ['operator'],
          isDirectMember: true,
        },
      ],
    },
  });
});

test('disables evaluation when profile preflight is not ready', async () => {
  getProfilesMock.mockResolvedValueOnce([
    {
      profileId: 'pgs-grounding-v1',
      profileVersion: '1',
      schemaVersion: '1',
      displayName: 'PGS grounding evidence',
      description: 'Structured evidence only.',
      inputKind: 'pgs-grounding',
      readiness: {
        profileConfigured: true,
        providerId: 'openai',
        model: 'gpt-evaluator',
        tenantProviderEnabled: true,
        modelAllowed: true,
        credentialPath: null,
        ready: false,
        reason: 'provider_credential_unavailable',
      },
    },
  ]);

  renderPage();

  expect(await screen.findByText('Not ready')).toBeInTheDocument();
  expect(
    screen.getByText(/No usable openai credential exists for this tenant/),
  ).toBeInTheDocument();
  expect(screen.getByText(/Provider Tokens.*user credential/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Run evaluation' })).toBeDisabled();
});

test('loads the allowlisted profile and exposes no arbitrary execution controls', async () => {
  renderPage();
  expect(
    screen.getByRole('heading', { name: 'Evaluation Lab' }),
  ).toBeInTheDocument();
  expect(await screen.findByText(/PGS grounding evidence/)).toBeInTheDocument();
  expect(
    (
      screen.getByLabelText(
        /Candidate \/ observable content/,
      ) as HTMLTextAreaElement
    ).value,
  ).toContain('digital system');
  for (const forbiddenLabel of [
    'Provider',
    'Model',
    'System prompt',
    'API key',
    'Bearer token',
    'Endpoint URL',
  ]) {
    expect(screen.queryByLabelText(forbiddenLabel)).not.toBeInTheDocument();
  }
  expect(
    screen.getByText(/Downstream services such as PGS remain responsible/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Admin API on port 3002 to Gateway API on port 3001/),
  ).toBeInTheDocument();
});

test('all three presets populate valid candidate content without forcing outcomes', async () => {
  const user = userEvent.setup();
  renderPage();
  await screen.findByText(/PGS grounding evidence/);
  const preset = screen
    .getAllByLabelText('Example / preset')
    .find((element) => element.tagName === 'INPUT')!;
  const answer = screen.getByLabelText(/Candidate \/ observable content/);

  await user.click(preset);
  fireEvent.click(
    document.querySelector('[role="option"][value="metaphysical-escalation"]')!,
  );
  expect((answer as HTMLTextAreaElement).value).toContain('bound by destiny');

  await user.click(preset);
  fireEvent.click(
    document.querySelector('[role="option"][value="fictional-roleplay"]')!,
  );
  expect((answer as HTMLTextAreaElement).value).toContain('fantasy story');

  await user.click(preset);
  fireEvent.click(
    document.querySelector('[role="option"][value="grounded-warmth"]')!,
  );
  expect((answer as HTMLTextAreaElement).value).toContain('digital system');
});

test('submits through Admin API, keeps local pending state and renders evidence metadata', async () => {
  let resolveProbe!: (value: typeof result) => void;
  executeProbeMock.mockReturnValue(
    new Promise<typeof result>((resolve) => {
      resolveProbe = resolve;
    }),
  );
  const user = userEvent.setup();
  renderPage();
  await screen.findByText(/PGS grounding evidence/);

  const run = screen.getByRole('button', { name: 'Run evaluation' });
  await user.click(run);
  expect(run).toBeDisabled();
  expect(
    screen.getByLabelText(/Candidate \/ observable content/),
  ).toBeVisible();
  resolveProbe(result);

  expect(
    await screen.findByText('REALITY_FRAMING_PRESENT'),
  ).toBeInTheDocument();
  expect(screen.getByText('842 ms')).toBeInTheDocument();
  expect(screen.getAllByText('evaluation-123').length).toBeGreaterThan(0);
  expect(screen.getAllByText('request-456').length).toBeGreaterThan(0);
  expect(executeProbeMock).toHaveBeenCalledTimes(1);
  const payload = executeProbeMock.mock.calls[0][0];
  expect(payload).toEqual(
    expect.objectContaining({ profileId: 'pgs-grounding-v1' }),
  );
  expect(payload).not.toHaveProperty('tenantId');
  expect(payload).not.toHaveProperty('provider');
  expect(payload).not.toHaveProperty('model');
});

test('renders normalized authorization and provider errors without raw details', async () => {
  const providerError = Object.assign(
    new Error('raw provider secret response'),
    {
      status: 503,
      code: 'evaluation_provider_unavailable',
    },
  );
  executeProbeMock.mockRejectedValue(providerError);
  renderPage();
  await screen.findByText(/PGS grounding evidence/);
  fireEvent.click(screen.getByRole('button', { name: 'Run evaluation' }));
  expect(
    await screen.findByText(
      'The configured evaluator provider is temporarily unavailable.',
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText(/raw provider secret/)).not.toBeInTheDocument();

  executeProbeMock.mockRejectedValue(
    Object.assign(new Error('raw credential path'), {
      status: 503,
      code: 'evaluation_provider_credential_unavailable',
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Run evaluation' }));
  expect(
    await screen.findByText(
      'No tenant or permitted platform credential is configured for the selected evaluator provider.',
    ),
  ).toBeInTheDocument();
  expect(
    screen.queryByText(
      'The evaluation service identity lacks evaluation:invoke.',
    ),
  ).not.toBeInTheDocument();

  executeProbeMock.mockRejectedValue(
    Object.assign(new Error('forbidden'), { status: 403 }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Run evaluation' }));
  await waitFor(() =>
    expect(
      screen.getByText('You are not authorized to execute evaluation probes.'),
    ).toBeInTheDocument(),
  );
});

test('explains how to configure a missing evaluation service identity', async () => {
  executeProbeMock.mockRejectedValue(
    Object.assign(new Error('not configured'), {
      status: 503,
      code: 'evaluation_service_identity_unavailable',
    }),
  );
  renderPage();
  await screen.findByText(/PGS grounding evidence/);
  fireEvent.click(screen.getByRole('button', { name: 'Run evaluation' }));

  expect(
    await screen.findByText(/LXP_ADMIN_EVALUATION_API_KEYS_JSON/),
  ).toBeInTheDocument();
  expect(screen.getByText(/evaluation:invoke/)).toBeInTheDocument();
});
