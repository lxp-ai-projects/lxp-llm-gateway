import { Buffer } from 'node:buffer';
import * as dns from 'node:dns/promises';
import { isIP } from 'node:net';

import type { GatewayImageReference } from '@lxp/contracts';

export interface ResolvedGatewayImageReference {
  type: 'image_url' | 'data_url';
  url: string;
  mimeType?: string;
}

export interface PublicImageReferencePolicy {
  allowedMimeTypes: ReadonlySet<string>;
  fetchWithTimeout: (
    url: string,
    init: RequestInit,
    timeoutMs: number | null,
  ) => Promise<Response>;
  lookupHostname?: (
    hostname: string,
  ) => Promise<Array<{ address: string; family: number }>>;
  maxBytes: number;
  maxRedirects?: number;
  timeoutMs: number | null;
}

export async function resolveGatewayImageReference(
  image: GatewayImageReference,
  options:
    | {
        mode: 'passthrough-url';
        lookupHostname?: (
          hostname: string,
        ) => Promise<Array<{ address: string; family: number }>>;
      }
    | {
        mode: 'download-to-data-url';
        policy: PublicImageReferencePolicy;
      },
): Promise<ResolvedGatewayImageReference> {
  if (image.type === 'asset') {
    throw new Error(
      'Gateway-managed image assets must be resolved in the application layer before provider dispatch.',
    );
  }

  if (image.type === 'data_url') {
    const parsedDataUrl = parseDataUrlReference(image.url, image.mimeType);
    return {
      type: 'data_url',
      url: image.url,
      mimeType: parsedDataUrl.mimeType,
    };
  }

  const validatedUrl = await validatePublicHttpsImageUrl(
    image.url,
    options.mode === 'passthrough-url'
      ? { lookupHostname: options.lookupHostname }
      : { lookupHostname: options.policy.lookupHostname },
  );

  if (options.mode === 'passthrough-url') {
    return {
      type: 'image_url',
      url: validatedUrl.toString(),
    };
  }

  return fetchPublicImageReferenceAsDataUrl(validatedUrl.toString(), options.policy);
}

export function parseDataUrlReference(dataUrl: string, explicitMimeType?: string) {
  const match = /^data:([^;,]+)?;base64,(.+)$/i.exec(dataUrl);

  if (!match) {
    throw new Error('Image references provided as data URLs must be base64-encoded data URLs.');
  }

  return {
    mimeType: explicitMimeType ?? match[1] ?? 'image/png',
    dataBase64: match[2],
  };
}

export async function validatePublicHttpsImageUrl(
  rawUrl: string,
  options?: {
    lookupHostname?: (
      hostname: string,
    ) => Promise<Array<{ address: string; family: number }>>;
  },
) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error('Image reference URLs must be valid absolute URLs.');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Image reference URLs require HTTPS.');
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('Image reference URLs must not embed credentials.');
  }

  await assertRemoteUrlIsSafe(parsedUrl, options?.lookupHostname);
  return parsedUrl;
}

export async function fetchPublicImageReferenceAsDataUrl(
  rawUrl: string,
  policy: PublicImageReferencePolicy,
): Promise<ResolvedGatewayImageReference> {
  let currentUrl = await validatePublicHttpsImageUrl(rawUrl, {
    lookupHostname: policy.lookupHostname,
  });
  const maxRedirects = policy.maxRedirects ?? 3;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const response = await policy.fetchWithTimeout(
      currentUrl.toString(),
      {
        method: 'GET',
        headers: {
          Accept: Array.from(policy.allowedMimeTypes).join(', '),
        },
        redirect: 'manual',
      },
      policy.timeoutMs,
    );

    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.get('location')
    ) {
      if (redirectCount === maxRedirects) {
        throw new Error('Remote image fetch exceeded redirect limit.');
      }

      currentUrl = await validatePublicHttpsImageUrl(
        new URL(response.headers.get('location')!, currentUrl).toString(),
        {
          lookupHostname: policy.lookupHostname,
        },
      );
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Remote image fetch failed with status ${response.status}${errorText ? `: ${errorText}` : ''}`,
      );
    }

    const mimeType = resolveRemoteImageMimeType(
      response.headers.get('content-type'),
      policy.allowedMimeTypes,
    );
    const contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader && Number(contentLengthHeader) > policy.maxBytes) {
      throw new Error(`Remote image exceeds the ${policy.maxBytes} byte inline limit.`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > policy.maxBytes) {
      throw new Error(`Remote image exceeds the ${policy.maxBytes} byte inline limit.`);
    }

    return {
      type: 'data_url',
      url: `data:${mimeType};base64,${Buffer.from(arrayBuffer).toString('base64')}`,
      mimeType,
    };
  }

  throw new Error('Remote image fetch failed unexpectedly.');
}

async function assertRemoteUrlIsSafe(
  imageUrl: URL,
  lookupHostname: (
    hostname: string,
  ) => Promise<Array<{ address: string; family: number }>> = defaultLookupHostname,
) {
  const hostname = imageUrl.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Image reference URLs cannot target localhost.');
  }

  if (isIP(hostname) && isPrivateOrLocalAddress(hostname)) {
    throw new Error('Image reference URLs cannot target private or local IP ranges.');
  }

  const resolvedAddresses = await lookupHostname(hostname);
  if (!resolvedAddresses.length) {
    throw new Error('Image reference hostname could not be resolved.');
  }

  for (const resolvedAddress of resolvedAddresses) {
    if (isPrivateOrLocalAddress(resolvedAddress.address)) {
      throw new Error(
        'Image reference URLs cannot resolve to private or local IP ranges.',
      );
    }
  }
}

function resolveRemoteImageMimeType(
  contentTypeHeader: string | null,
  allowedMimeTypes: ReadonlySet<string>,
) {
  const mimeType = contentTypeHeader?.split(';', 1)[0]?.trim().toLowerCase();

  if (!mimeType || !allowedMimeTypes.has(mimeType)) {
    throw new Error('Remote image responses must return a supported image MIME type.');
  }

  return mimeType;
}

function isPrivateOrLocalAddress(address: string) {
  const ipVersion = isIP(address);
  if (ipVersion === 4) {
    const octets = address.split('.').map(Number);
    const [first, second] = octets;

    return (
      first === 10 ||
      first === 127 ||
      first === 0 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }

  if (ipVersion === 6) {
    const normalizedAddress = address.toLowerCase();
    return (
      normalizedAddress === '::1' ||
      normalizedAddress === '::' ||
      normalizedAddress.startsWith('fc') ||
      normalizedAddress.startsWith('fd') ||
      normalizedAddress.startsWith('fe80:')
    );
  }

  return false;
}

function defaultLookupHostname(hostname: string) {
  return dns.lookup(hostname, { all: true });
}
