import { randomUUID } from 'node:crypto';
import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  assertPgsGroundingInput,
  assertEvaluationResult,
  EVALUATION_PROFILES,
  EVALUATION_SCHEMA_VERSION,
  PGS_GROUNDING_PROFILE_ID,
  InvalidEvaluationInputError,
  InvalidEvaluationResultError,
  type EvaluationProbeResult,
  type EvaluationProfileReadiness,
  type EvaluationProfileSummary,
  type EvaluationResult,
} from '@lxp/contracts';

import type { AuthenticatedUser } from '../auth/auth.types';
import type { EvaluationProbeDto } from './dto/evaluation-probe.dto';
import { EvaluationServiceCredentialResolver } from './evaluation-service-credential.resolver';

const DEFAULT_TIMEOUT_MS = 35_000;

@Injectable()
export class EvaluationLabService {
  private readonly logger = new Logger(EvaluationLabService.name);

  constructor(
    private readonly credentials: EvaluationServiceCredentialResolver,
  ) {}

  async listProfiles(actor: AuthenticatedUser): Promise<EvaluationProfileSummary[]> {
    const profile = EVALUATION_PROFILES[0];
    const readiness = await this.readReadiness(actor.activeTenantId).catch(
      (error: unknown): EvaluationProfileReadiness => ({
        profileConfigured: false,
        providerId: null,
        model: null,
        tenantProviderEnabled: false,
        modelAllowed: false,
        credentialPath: null,
        ready: false,
        reason:
          error instanceof HttpException
            ? readErrorCode(error)
            : 'evaluation_gateway_unavailable',
      }),
    );
    return [{ ...profile, readiness }];
  }

  private async readReadiness(
    tenantId: string,
  ): Promise<EvaluationProfileReadiness> {
    const serviceApiKey = this.credentials.resolve(tenantId);
    const response = await fetch(
      `${readGatewayBaseUrl()}/api/v1/evaluations/readiness`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${serviceApiKey}`,
          'Content-Type': 'application/json',
          'X-Lxp-Expected-Tenant-Id': tenantId,
        },
        body: JSON.stringify({
          schemaVersion: EVALUATION_SCHEMA_VERSION,
          profileId: PGS_GROUNDING_PROFILE_ID,
        }),
      },
    );
    const body = await readJson(response);
    if (!response.ok) throw gatewayError(response.status, body);
    if (!isEvaluationReadiness(body)) {
      throw new BadGatewayException('Invalid evaluation readiness response.');
    }
    return body;
  }

  async executeProbe(
    actor: AuthenticatedUser,
    request: EvaluationProbeDto,
    inboundRequestId?: string,
  ): Promise<EvaluationProbeResult> {
    if (request.profileId !== 'pgs-grounding-v1') {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'unknown_evaluation_profile',
        message: 'Unknown evaluation profile.',
      });
    }
    try {
      assertPgsGroundingInput(request.input);
    } catch (error) {
      if (error instanceof InvalidEvaluationInputError) {
        throw new BadRequestException({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'invalid_evaluation_input',
          message: 'Evaluation input does not match the selected profile.',
        });
      }
      throw error;
    }

    const requestId = inboundRequestId ?? randomUUID();
    const startedAt = Date.now();
    this.log('started', actor, request.profileId, requestId);

    try {
      const response = await this.callGateway(
        actor.activeTenantId,
        requestId,
        request,
      );
      const result = await this.readGatewayResult(response);
      const completed: EvaluationProbeResult = {
        ...result,
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        requestId,
      };
      this.log('succeeded', actor, request.profileId, requestId, {
        evaluationId: result.evaluationId,
        latencyMs: completed.latencyMs,
      });
      return completed;
    } catch (error) {
      const normalized = normalizeProbeFailure(error);
      this.log('failed', actor, request.profileId, requestId, {
        resultCategory: readErrorCode(normalized),
        ...readFailureDiagnostics(error),
        latencyMs: Date.now() - startedAt,
      });
      throw normalized;
    }
  }

  private async callGateway(
    tenantId: string,
    requestId: string,
    request: EvaluationProbeDto,
  ): Promise<Response> {
    const serviceApiKey = this.credentials.resolve(tenantId);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), readTimeoutMs());
    try {
      const gatewayUrl = `${readGatewayBaseUrl()}/api/v1/evaluations`;
      this.logger.log({
        event: 'admin.evaluation_probe_gateway',
        status: 'started',
        tenantId,
        requestId,
        method: 'POST',
        path: '/api/v1/evaluations',
      });
      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${serviceApiKey}`,
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
          'X-Lxp-Expected-Tenant-Id': tenantId,
        },
        body: JSON.stringify({
          schemaVersion: EVALUATION_SCHEMA_VERSION,
          profileId: request.profileId,
          input: request.input,
        }),
        signal: controller.signal,
      });
      this.logger.log({
        event: 'admin.evaluation_probe_gateway',
        status: 'received',
        tenantId,
        requestId,
        upstreamStatus: response.status,
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readGatewayResult(
    response: Response,
  ): Promise<EvaluationResult> {
    const body = await readJson(response);
    if (!response.ok) {
      throw gatewayError(response.status, body);
    }
    try {
      assertEvaluationResult(body);
    } catch (error) {
      if (!(error instanceof InvalidEvaluationResultError)) throw error;
      throw new BadGatewayException({
        statusCode: HttpStatus.BAD_GATEWAY,
        code: 'evaluation_invalid_output',
        message:
          'The Gateway returned an invalid structured evaluation result.',
      });
    }
    return body;
  }

  private log(
    status: string,
    actor: AuthenticatedUser,
    profileId: string,
    requestId: string,
    metadata: Record<string, unknown> = {},
  ) {
    this.logger.log({
      event: 'admin.evaluation_probe',
      status,
      operatorUserUuid: actor.userUuid,
      tenantId: actor.activeTenantId,
      profileId,
      requestId,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }
}

function readGatewayBaseUrl(): string {
  return (
    process.env.GATEWAY_API_URL?.trim() || 'http://127.0.0.1:3001'
  ).replace(/\/$/u, '');
}

function readTimeoutMs(): number {
  const parsed = Number(process.env.LXP_ADMIN_EVALUATION_TIMEOUT_MS);
  return Number.isSafeInteger(parsed) && parsed >= 1_000 && parsed <= 60_000
    ? parsed
    : DEFAULT_TIMEOUT_MS;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return JSON.parse(await response.text()) as unknown;
  } catch {
    return null;
  }
}

function gatewayError(status: number, body: unknown): HttpException {
  const code =
    isRecord(body) && typeof body.code === 'string'
      ? body.code
      : `gateway_http_${status}`;
  const safe = SAFE_GATEWAY_ERRORS[code];
  if (safe)
    return new GatewayProbeException(
      { statusCode: status, code, message: safe },
      status,
      {
        upstreamStatus: status,
        upstreamCode: code,
        failureCause: code,
      },
    );
  if (status === 401) {
    return new GatewayProbeException(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        code: 'evaluation_service_authentication_failed',
        message: 'The Gateway rejected the evaluation service identity.',
      },
      HttpStatus.BAD_GATEWAY,
      {
        upstreamStatus: status,
        failureCause: 'service_identity_rejected',
      },
    );
  }
  if (status === 403) {
    return new GatewayProbeException(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        code: 'evaluation_service_forbidden',
        message:
          'The evaluation service identity is not permitted to invoke this profile.',
      },
      HttpStatus.BAD_GATEWAY,
      {
        upstreamStatus: status,
        failureCause: classifyGatewayForbidden(body),
      },
    );
  }
  return new GatewayProbeException(
    {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'evaluation_provider_unavailable',
      message: 'The configured evaluator is unavailable.',
    },
    HttpStatus.SERVICE_UNAVAILABLE,
    {
      upstreamStatus: status,
      failureCause: 'unclassified_gateway_failure',
    },
  );
}

type FailureDiagnostics = Readonly<{
  upstreamStatus: number;
  upstreamCode?: string;
  failureCause: string;
}>;

class GatewayProbeException extends HttpException {
  constructor(
    response: Record<string, unknown>,
    status: number,
    readonly diagnostics: FailureDiagnostics,
  ) {
    super(response, status);
  }
}

function readFailureDiagnostics(
  error: unknown,
): FailureDiagnostics | Record<string, never> {
  if (error instanceof GatewayProbeException) return error.diagnostics;
  if (error instanceof HttpException) {
    return {
      upstreamStatus: error.getStatus(),
      failureCause: readErrorCode(error),
    };
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      upstreamStatus: HttpStatus.GATEWAY_TIMEOUT,
      failureCause: 'gateway_timeout',
    };
  }
  if (error instanceof Error) {
    return {
      upstreamStatus: HttpStatus.SERVICE_UNAVAILABLE,
      failureCause: 'gateway_fetch_failed',
    };
  }
  return {};
}

function classifyGatewayForbidden(body: unknown): string {
  const message =
    isRecord(body) && typeof body.message === 'string'
      ? body.message.toLowerCase()
      : '';
  if (
    /missing the required scope\s+["']?evaluation:invoke["']?/u.test(message)
  ) {
    return 'missing_evaluation_invoke_scope';
  }
  if (message.includes('no active credential path is configured')) {
    return 'provider_credential_unavailable';
  }
  if (message.includes('is denied for tenant')) {
    return 'evaluator_model_denied_by_tenant_policy';
  }
  return 'gateway_forbidden';
}

const SAFE_GATEWAY_ERRORS: Record<string, string> = {
  evaluation_service_forbidden:
    'The evaluation service identity lacks evaluation:invoke.',
  evaluation_provider_credential_unavailable:
    'No tenant or permitted platform credential is configured for the selected evaluator provider.',
  evaluation_model_forbidden:
    'The selected evaluator model is denied by the tenant model-access policy.',
  evaluation_rate_limited: 'The configured evaluator is rate limited.',
  evaluation_timeout: 'The evaluation timed out.',
  evaluation_provider_authentication_failed:
    'The evaluator provider rejected its configured credentials.',
  evaluation_provider_unavailable:
    'The configured evaluator provider is temporarily unavailable.',
  evaluation_invalid_output:
    'The provider returned output that did not satisfy the structured evidence schema.',
};

function normalizeProbeFailure(error: unknown): HttpException {
  if (error instanceof HttpException) return error;
  if (error instanceof Error && error.name === 'AbortError') {
    return new GatewayTimeoutException({
      statusCode: HttpStatus.GATEWAY_TIMEOUT,
      code: 'evaluation_timeout',
      message: 'The evaluation timed out.',
    });
  }
  return new ServiceUnavailableException({
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'evaluation_provider_unavailable',
    message: 'The configured evaluator provider is temporarily unavailable.',
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEvaluationReadiness(
  value: unknown,
): value is EvaluationProfileReadiness {
  return (
    isRecord(value) &&
    typeof value.profileConfigured === 'boolean' &&
    (typeof value.providerId === 'string' || value.providerId === null) &&
    (typeof value.model === 'string' || value.model === null) &&
    typeof value.tenantProviderEnabled === 'boolean' &&
    typeof value.modelAllowed === 'boolean' &&
    (value.credentialPath === 'tenant' ||
      value.credentialPath === 'platform' ||
      value.credentialPath === null) &&
    typeof value.ready === 'boolean' &&
    (typeof value.reason === 'string' || value.reason === null)
  );
}

function readErrorCode(error: HttpException): string {
  const response = error.getResponse();
  return isRecord(response) && typeof response.code === 'string'
    ? response.code
    : `http_${error.getStatus()}`;
}
