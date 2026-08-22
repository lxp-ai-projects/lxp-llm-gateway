import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  EVALUATION_ID_PATTERN,
  type GatewayChatRequest,
} from '@lxp/contracts';

import type { GatewayIntegrationClientAuthContext } from '../auth/auth.types';
import { GatewayService } from '../gateway/gateway.service';
import { IntegrationClientScopeService } from '../gateway/integration-client-scope.service';
import { ProviderCredentialUnavailableException } from '../gateway/provider-credential.service';
import { ModelAccessPolicyException } from '../gateway/tenant-model-access-rule.service';
import type { EvaluationRequestDto } from './dto/evaluation-request.dto';
import type { EvaluationReadinessRequestDto } from './dto/evaluation-readiness-request.dto';
import { EvaluationProfileRegistry } from './evaluation-profile.registry';

class EvaluationTimeoutError extends Error {}

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    private readonly profiles: EvaluationProfileRegistry,
    private readonly gatewayService: GatewayService,
    private readonly scopes: IntegrationClientScopeService,
  ) {}

  async readiness(
    request: EvaluationReadinessRequestDto,
    authContext: GatewayIntegrationClientAuthContext,
  ) {
    this.scopes.assertScope(authContext, 'evaluation:invoke');
    try {
      const profile = this.profiles.resolve(
        request.schemaVersion,
        request.profileId,
      );
      return this.gatewayService.getEvaluationReadiness(
        profile.providerId,
        profile.model,
        authContext,
      );
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        return {
          profileConfigured: false,
          providerId: null,
          model: null,
          tenantProviderEnabled: false,
          modelAllowed: false,
          credentialPath: null,
          ready: false,
          reason: 'profile_not_configured',
        };
      }
      throw error;
    }
  }

  async evaluate(
    request: EvaluationRequestDto,
    authContext: GatewayIntegrationClientAuthContext,
  ) {
    this.scopes.assertScope(authContext, 'evaluation:invoke');
    const profile = this.profiles.resolve(
      request.schemaVersion,
      request.profileId,
    );
    const input = profile.validateInput(request.input);
    const startedAt = Date.now();
    this.log('started', {
      tenantId: authContext.activeTenantId,
      serviceIdentity: authContext.integrationClientId,
      profileId: profile.id,
      profileVersion: profile.version,
      providerId: profile.providerId,
      model: profile.model,
      schemaVersion: request.schemaVersion,
    });

    let response;
    try {
      const providerRequest: GatewayChatRequest = {
        providerId: profile.providerId,
        model: profile.model,
        maxOutputTokens: profile.maxOutputTokens,
        outputFormat: 'json',
        stream: false,
        messages: [
          { role: 'system', content: profile.systemInstructions },
          { role: 'user', content: JSON.stringify(input) },
        ],
      };
      response = await withTimeout(
        (signal) =>
          this.gatewayService.evaluateProfileChat(
            providerRequest,
            authContext,
            signal,
          ),
        profile.timeoutMs,
      );
    } catch (error) {
      const normalized = normalizeEvaluationFailure(error);
      this.log('failed', {
        tenantId: authContext.activeTenantId,
        serviceIdentity: authContext.integrationClientId,
        profileId: profile.id,
        profileVersion: profile.version,
        providerId: profile.providerId,
        model: profile.model,
        schemaVersion: request.schemaVersion,
        latencyMs: Date.now() - startedAt,
        failureCategory: failureCategory(normalized),
      });
      throw normalized;
    }

    let evidence;
    try {
      if (!EVALUATION_ID_PATTERN.test(response.requestId)) {
        throw new Error('Invalid evaluation identifier.');
      }
      evidence = profile.parseEvidence(response.message.content, input);
    } catch {
      const error = new BadGatewayException({
        statusCode: HttpStatus.BAD_GATEWAY,
        code: 'evaluation_invalid_output',
        message: 'The evaluator returned invalid structured evidence.',
      });
      this.log('failed', {
        requestId: response.requestId,
        tenantId: authContext.activeTenantId,
        serviceIdentity: authContext.integrationClientId,
        profileId: profile.id,
        profileVersion: profile.version,
        providerId: profile.providerId,
        model: profile.model,
        schemaVersion: request.schemaVersion,
        latencyMs: Date.now() - startedAt,
        failureCategory: 'invalid_output',
      });
      throw error;
    }

    this.log('succeeded', {
      requestId: response.requestId,
      tenantId: authContext.activeTenantId,
      serviceIdentity: authContext.integrationClientId,
      profileId: profile.id,
      profileVersion: profile.version,
      providerId: profile.providerId,
      model: profile.model,
      schemaVersion: request.schemaVersion,
      latencyMs: Date.now() - startedAt,
    });
    return {
      schemaVersion: '1' as const,
      profileId: profile.id,
      profileVersion: profile.version,
      evaluationId: response.requestId,
      evidence,
    };
  }

  private log(status: string, metadata: Record<string, unknown>): void {
    this.logger.log(
      JSON.stringify({
        event: 'gateway.evaluation',
        status,
        ...metadata,
      }),
    );
  }
}

async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          const timeoutError = new EvaluationTimeoutError();
          controller.abort(timeoutError);
          reject(timeoutError);
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new EvaluationTimeoutError();
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function normalizeEvaluationFailure(error: unknown): HttpException {
  if (error instanceof EvaluationTimeoutError) {
    return new GatewayTimeoutException({
      statusCode: HttpStatus.GATEWAY_TIMEOUT,
      code: 'evaluation_timeout',
      message: 'The evaluator timed out.',
    });
  }
  if (error instanceof ProviderCredentialUnavailableException) {
    return new ServiceUnavailableException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'evaluation_provider_credential_unavailable',
      message:
        'No credential is configured for the selected evaluator provider in this tenant.',
    });
  }
  if (error instanceof ModelAccessPolicyException) {
    return new HttpException(
      {
        statusCode: HttpStatus.FORBIDDEN,
        code: 'evaluation_model_forbidden',
        message:
          'The selected evaluator model is denied by the tenant model-access policy.',
      },
      HttpStatus.FORBIDDEN,
    );
  }
  if (
    error instanceof HttpException &&
    error.getStatus() !== HttpStatus.BAD_GATEWAY
  ) {
    return error;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (/status 429|rate limit|quota exceeded/.test(message)) {
    return new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'evaluation_rate_limited',
        message: 'The evaluator is rate limited.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  if (/status 401|status 403|credential|api key/.test(message)) {
    return new BadGatewayException({
      statusCode: HttpStatus.BAD_GATEWAY,
      code: 'evaluation_provider_authentication_failed',
      message: 'The evaluator provider rejected its configured credentials.',
    });
  }
  if (/timed out|timeout|aborted/.test(message)) {
    return new GatewayTimeoutException({
      statusCode: HttpStatus.GATEWAY_TIMEOUT,
      code: 'evaluation_timeout',
      message: 'The evaluator timed out.',
    });
  }
  return new ServiceUnavailableException({
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'evaluation_provider_unavailable',
    message: 'The evaluator provider is unavailable.',
  });
}

function failureCategory(error: HttpException): string {
  const response = error.getResponse();
  if (response && typeof response === 'object' && 'code' in response) {
    const code = (response as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return `http_${error.getStatus()}`;
}
