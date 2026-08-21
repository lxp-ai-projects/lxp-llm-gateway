import type { GatewayServiceAuthContext } from '../auth/auth.types';

export const evaluationAuthContext = {
  userId: null,
  userUuid: null,
  emailHash: null,
  activeTenantId: 'tenant-1',
  activeTenantSlug: 'tenant-one',
  identitySource: 'integration-client-service',
  roles: [],
  globalRoles: [],
  integrationClientId: 'pgs',
  integrationClientScopes: ['evaluation:invoke'],
  defaultProviderId: null,
  defaultModel: null,
  defaultImageProviderId: null,
  defaultImageModel: null,
  integrationClientKeyId: 'api-key-1',
} as GatewayServiceAuthContext;

export const evaluationInput = {
  questionVersionId: 'question-v1',
  rubric: { id: 'rubric-1', version: 1, guidance: 'Assess literal claims.' },
  answerText: 'A warm answer with an unsupported literal soul claim.',
  evidenceReference: {
    kind: 'ASSESSMENT_ANSWER',
    referenceId: 'answer-1',
  },
  allowedSignals: [
    {
      id: 'signal-1',
      version: 1,
      code: 'LITERAL_METAPHYSICAL_ESCALATION',
      direction: 'CRITICAL',
      severity: 'HIGH',
      dimensions: ['METAPHYSICAL_CERTAINTY'],
    },
  ],
};

export const evaluationEvidence = {
  observations: [
    { signal: evaluationInput.allowedSignals[0], confidence: 0.9 },
  ],
  ambiguity: { score: 0.1, reasons: [] },
  contradiction: { detected: false },
  followUpRecommended: false,
};
