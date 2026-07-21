import { Injectable } from '@nestjs/common';
import type { Request } from 'express';

/** Normalizes only DNS hostnames; IP literals and wildcards are deliberately unsupported. */
export function normalizePublicHostname(value: string): string | null {
  const candidate = value.trim().toLowerCase().replace(/\.$/, '');
  const hostname = candidate.startsWith('[')
    ? ''
    : candidate.replace(/:\d+$/, '');

  if (
    !hostname ||
    hostname.length > 253 ||
    hostname.includes('*') ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
      hostname,
    )
  ) {
    return null;
  }

  return hostname;
}

@Injectable()
export class TenantPublicHostResolverService {
  resolveRequestHostname(request: Request): string | null {
    const forwardedHost = request.header('x-forwarded-host');
    const configuredTrustProxy = process.env.LXP_TRUST_PROXY === 'true';
    const rawHost = configuredTrustProxy && forwardedHost
      ? forwardedHost.split(',')[0]
      : request.header('host');

    return rawHost ? normalizePublicHostname(rawHost) : null;
  }
}
