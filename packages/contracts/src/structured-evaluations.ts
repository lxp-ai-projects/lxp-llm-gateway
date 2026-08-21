export const EVALUATION_SCHEMA_VERSION = '1' as const;
export const PGS_GROUNDING_PROFILE_ID = 'pgs-grounding-v1' as const;
export const EVALUATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/u;

export const EVALUATION_ERROR_CODES = [
  'invalid_evaluation_input',
  'unsupported_evaluation_schema',
  'unknown_evaluation_profile',
  'evaluation_profile_unavailable',
  'evaluation_service_identity_unavailable',
  'evaluation_service_authentication_failed',
  'evaluation_service_forbidden',
  'evaluation_provider_credential_unavailable',
  'evaluation_model_forbidden',
  'evaluation_rate_limited',
  'evaluation_timeout',
  'evaluation_provider_authentication_failed',
  'evaluation_provider_unavailable',
  'evaluation_invalid_output',
] as const;

export type EvaluationErrorCode = (typeof EVALUATION_ERROR_CODES)[number];

export const PGS_GROUNDING_DIMENSIONS = [
  'REALITY_FRAMING',
  'AUTONOMY',
  'SOCIAL_BALANCE',
  'EXCLUSIVITY',
  'CONTINUITY_TOLERANCE',
  'METAPHYSICAL_CERTAINTY',
  'FUNCTIONAL_IMPACT',
  'EMOTIONAL_REGULATION',
] as const;

export const EVALUATION_PROFILES = [
  {
    profileId: PGS_GROUNDING_PROFILE_ID,
    profileVersion: '1',
    schemaVersion: EVALUATION_SCHEMA_VERSION,
    displayName: 'PGS grounding evidence',
    description:
      'Produces structured grounding evidence for downstream interpretation. It does not make policy or capability decisions.',
    inputKind: 'pgs-grounding',
  },
] as const;

export type PgsGroundingDimension = (typeof PGS_GROUNDING_DIMENSIONS)[number];
export type PgsSignalDirection = 'PROTECTIVE' | 'CONCERN' | 'CRITICAL';
export type PgsSignalSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PgsSignalDefinition = {
  id: string;
  version: number;
  code: string;
  direction: PgsSignalDirection;
  severity: PgsSignalSeverity;
  dimensions: PgsGroundingDimension[];
};

export type PgsGroundingInput = {
  questionVersionId: string;
  rubric: { id: string; version: number; guidance: string };
  answerText: string;
  evidenceReference: {
    kind: 'ASSESSMENT_ANSWER';
    referenceId: string;
  };
  allowedSignals: PgsSignalDefinition[];
};

export type PgsGroundingEvidence = {
  observations: Array<{ signal: PgsSignalDefinition; confidence: number }>;
  ambiguity: {
    score: number;
    reasons: Array<'INSUFFICIENT_CONTEXT' | 'MIXED_FRAMING' | 'LOW_CONFIDENCE'>;
  };
  contradiction: { detected: boolean };
  followUpRecommended: boolean;
};

export type EvaluationProfileMetadata = (typeof EVALUATION_PROFILES)[number];

export type EvaluationProfileReadiness = {
  profileConfigured: boolean;
  providerId: string | null;
  model: string | null;
  tenantProviderEnabled: boolean;
  modelAllowed: boolean;
  credentialPath: 'tenant' | 'platform' | null;
  ready: boolean;
  reason: string | null;
};

export type EvaluationProfileSummary = EvaluationProfileMetadata & {
  readiness: EvaluationProfileReadiness;
};

export type EvaluationProbeRequest = {
  profileId: typeof PGS_GROUNDING_PROFILE_ID;
  input: PgsGroundingInput;
};

export type EvaluationResult = {
  schemaVersion: typeof EVALUATION_SCHEMA_VERSION;
  profileId: typeof PGS_GROUNDING_PROFILE_ID;
  profileVersion: '1';
  evaluationId: string;
  evidence: PgsGroundingEvidence;
};

export type EvaluationProbeResult = EvaluationResult & {
  latencyMs: number;
  timestamp: string;
  requestId: string;
};

export class InvalidEvaluationInputError extends Error {}
export class InvalidEvaluationResultError extends Error {}

export function assertPgsGroundingInput(
  candidate: unknown,
): asserts candidate is PgsGroundingInput {
  if (
    byteLength(candidate) > 64 * 1024 ||
    !isStrictRecord(candidate, [
      'questionVersionId',
      'rubric',
      'answerText',
      'evidenceReference',
      'allowedSignals',
    ]) ||
    !isBoundedString(candidate.questionVersionId, 1, 128) ||
    !isStrictRecord(candidate.rubric, ['id', 'version', 'guidance']) ||
    !isBoundedString(candidate.rubric.id, 1, 128) ||
    !isPositiveSafeInteger(candidate.rubric.version) ||
    !isBoundedString(candidate.rubric.guidance, 1, 8_000) ||
    typeof candidate.answerText !== 'string' ||
    candidate.answerText.length > 10_000 ||
    !isStrictRecord(candidate.evidenceReference, ['kind', 'referenceId']) ||
    candidate.evidenceReference.kind !== 'ASSESSMENT_ANSWER' ||
    !isBoundedString(candidate.evidenceReference.referenceId, 1, 200) ||
    !/^[A-Za-z0-9._:@-]+$/u.test(candidate.evidenceReference.referenceId) ||
    !Array.isArray(candidate.allowedSignals) ||
    candidate.allowedSignals.length > 64
  ) {
    throw new InvalidEvaluationInputError();
  }

  for (const signal of candidate.allowedSignals) assertSignal(signal);
  if (
    new Set(candidate.allowedSignals.map((signal) => signal.id)).size !==
    candidate.allowedSignals.length
  ) {
    throw new InvalidEvaluationInputError();
  }
}

export function assertEvaluationResult(
  candidate: unknown,
): asserts candidate is EvaluationResult {
  if (
    !isStrictRecord(candidate, [
      'schemaVersion',
      'profileId',
      'profileVersion',
      'evaluationId',
      'evidence',
    ]) ||
    candidate.schemaVersion !== EVALUATION_SCHEMA_VERSION ||
    candidate.profileId !== PGS_GROUNDING_PROFILE_ID ||
    candidate.profileVersion !== '1' ||
    typeof candidate.evaluationId !== 'string' ||
    !EVALUATION_ID_PATTERN.test(candidate.evaluationId) ||
    !isGroundingEvidence(candidate.evidence)
  ) {
    throw new InvalidEvaluationResultError();
  }
}

function isGroundingEvidence(candidate: unknown): candidate is PgsGroundingEvidence {
  if (
    !isStrictRecord(candidate, [
      'observations',
      'ambiguity',
      'contradiction',
      'followUpRecommended',
    ]) ||
    !Array.isArray(candidate.observations) ||
    candidate.observations.length > 64 ||
    !isStrictRecord(candidate.ambiguity, ['score', 'reasons']) ||
    !isConfidence(candidate.ambiguity.score) ||
    !Array.isArray(candidate.ambiguity.reasons) ||
    candidate.ambiguity.reasons.length > 3 ||
    candidate.ambiguity.reasons.some(
      (reason) =>
        !['INSUFFICIENT_CONTEXT', 'MIXED_FRAMING', 'LOW_CONFIDENCE'].includes(
          reason as string,
        ),
    ) ||
    new Set(candidate.ambiguity.reasons).size !== candidate.ambiguity.reasons.length ||
    !isStrictRecord(candidate.contradiction, ['detected']) ||
    typeof candidate.contradiction.detected !== 'boolean' ||
    typeof candidate.followUpRecommended !== 'boolean'
  ) {
    return false;
  }

  const signalIds = new Set<string>();
  for (const observation of candidate.observations) {
    if (
      !isStrictRecord(observation, ['signal', 'confidence']) ||
      !isConfidence(observation.confidence) ||
      !isSignal(observation.signal) ||
      signalIds.has(observation.signal.id)
    ) {
      return false;
    }
    signalIds.add(observation.signal.id);
  }
  return true;
}

function isSignal(candidate: unknown): candidate is PgsSignalDefinition {
  try {
    assertSignal(candidate);
    return true;
  } catch {
    return false;
  }
}

function isConfidence(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function assertSignal(
  candidate: unknown,
): asserts candidate is PgsSignalDefinition {
  if (
    !isStrictRecord(candidate, [
      'id',
      'version',
      'code',
      'direction',
      'severity',
      'dimensions',
    ]) ||
    !isBoundedString(candidate.id, 1, 128) ||
    !isPositiveSafeInteger(candidate.version) ||
    typeof candidate.code !== 'string' ||
    !/^[A-Z][A-Z0-9_]{1,79}$/u.test(candidate.code) ||
    !['PROTECTIVE', 'CONCERN', 'CRITICAL'].includes(
      candidate.direction as string,
    ) ||
    !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(
      candidate.severity as string,
    ) ||
    !Array.isArray(candidate.dimensions) ||
    candidate.dimensions.length < 1 ||
    candidate.dimensions.length > PGS_GROUNDING_DIMENSIONS.length ||
    candidate.dimensions.some(
      (dimension) => !PGS_GROUNDING_DIMENSIONS.includes(dimension as never),
    ) ||
    new Set(candidate.dimensions).size !== candidate.dimensions.length
  ) {
    throw new InvalidEvaluationInputError();
  }
}

function isStrictRecord<const T extends readonly string[]>(
  candidate: unknown,
  keys: T,
): candidate is Record<T[number], unknown> {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return false;
  }
  const actual = Object.keys(candidate).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function isBoundedString(
  value: unknown,
  minimum: number,
  maximum: number,
): value is string {
  return (
    typeof value === 'string' &&
    value.length >= minimum &&
    value.length <= maximum
  );
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1;
}

function byteLength(candidate: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(candidate)).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}
