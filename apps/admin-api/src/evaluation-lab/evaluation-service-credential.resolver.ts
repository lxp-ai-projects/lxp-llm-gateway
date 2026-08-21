import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

export abstract class EvaluationServiceCredentialResolver {
  abstract resolve(tenantId: string): string;
}

@Injectable()
export class EnvironmentEvaluationServiceCredentialResolver extends EvaluationServiceCredentialResolver {
  resolve(tenantId: string): string {
    const raw = process.env.LXP_ADMIN_EVALUATION_API_KEYS_JSON?.trim();
    if (!raw) throw serviceIdentityUnavailable();
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isRecord(parsed)) throw serviceIdentityUnavailable();
      const key = parsed[tenantId];
      if (typeof key !== 'string' || !key.trim()) {
        throw serviceIdentityUnavailable();
      }
      return key.trim();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw serviceIdentityUnavailable();
    }
  }
}

function serviceIdentityUnavailable() {
  return new ServiceUnavailableException({
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'evaluation_service_identity_unavailable',
    message: 'Evaluation probes are not configured for the active tenant.',
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
