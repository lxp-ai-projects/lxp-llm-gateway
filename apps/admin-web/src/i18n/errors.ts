import i18n from './index';

type ApiError = Error & { code?: string; status?: number };

const errorCodeKeys: Record<string, string> = {
  PROVIDER_CREDENTIAL_CONFLICT: 'credentialConflict',
  credential_already_exists: 'credentialConflict',
  SESSION_EXPIRED: 'sessionExpired',
  VALIDATION_ERROR: 'validation',
};

export function getLocalizedErrorMessage(
  error: unknown,
  fallbackKey = 'generic',
): string {
  const apiError = error as Partial<ApiError> | null;
  const codeKey = apiError?.code ? errorCodeKeys[apiError.code] : undefined;
  if (codeKey) return i18n.t(`errors:${codeKey}`);
  if (apiError?.status === 401) return i18n.t('errors:authenticationRequired');
  if (apiError?.status === 403) return i18n.t('errors:permissionDenied');
  if (apiError?.status && apiError.status >= 500)
    return i18n.t('errors:serverFailure');
  if (
    error instanceof Error &&
    /fetch|network|unavailable/i.test(error.message)
  )
    return i18n.t('errors:networkUnavailable');
  return i18n.t(`errors:${fallbackKey}`);
}
