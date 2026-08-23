export const en = {
  common: {
    actions: {
      cancel: 'Cancel',
      close: 'Close',
      confirm: 'Confirm',
      delete: 'Delete',
      install: 'Install app',
      logout: 'Logout',
      save: 'Save',
      submit: 'Submit',
    },
    activeTenant: 'Active tenant: {{tenant}}',
    controlPlane: 'Control plane',
    language: { label: 'Language', select: 'Select language' },
    loading: 'Loading...',
    status: {
      active: 'Active',
      disabled: 'Disabled',
      unavailable: 'Unavailable',
    },
  },
  auth: {
    brand: {
      badge: 'LXP gateway',
      title: 'A clearer path from intent to intelligence.',
      description:
        'A focused workspace for managing model access, credentials, and the systems your team relies on.',
      secureAccess: 'Secure workspace access',
    },
    login: {
      kicker: 'Secure sign in',
      title: 'Welcome back',
      description: 'Sign in to continue to your LXP workspace.',
      failed: 'Login failed',
      genericFailure: 'Unable to authenticate with the current credentials.',
      email: 'Email',
      emailPlaceholder: 'email@domain.com',
      password: 'Password',
      passwordPlaceholder: 'Your password',
      acceptPrefix: 'I accept the',
      terms: 'terms',
      conjunction: 'and',
      privacy: 'privacy policy',
      submit: 'Sign in',
      createAccount: 'Create account',
      registrationDisabled: 'Registration disabled',
      forgotPassword: 'Forgot password',
      recoveryDisabled: 'Recovery disabled',
    },
    session: {
      expired: 'Session expired',
      restoring: 'Restoring secure session...',
      unavailable: 'Session profile unavailable',
    },
    denied: {
      title: 'Restricted surface',
      alertTitle: 'Administrator access required',
      description: 'Your current role does not allow access to this section.',
    },
    roles: {
      superAdmin: 'Super admin',
      tenantAdmin: 'Tenant admin',
      user: 'User',
    },
  },
  navigation: {
    overview: 'Overview',
    providerTokens: 'Provider Tokens',
    profile: 'Profile',
    chatLab: 'Chat Lab',
    imageLab: 'Image Lab',
    videoLab: 'Video Lab',
    evaluationLab: 'Evaluation Lab',
    users: 'Users',
    tenants: 'Tenants',
    analytics: 'Analytics',
    health: 'Health',
    groups: {
      workspace: 'Workspace surface',
      tenantAdmin: 'Tenant administration surface',
      global: 'Global control-plane surface',
    },
    enterpriseControlPlane: 'Enterprise control plane',
    workspaceFallback: 'Workspace',
    gatewayOnline: 'Gateway online',
    gatewayOffline: 'Gateway offline',
    securityTitle: 'Security posture',
    securityDescription:
      'Cookie-only browser auth, encrypted provider secrets, and role-aware navigation.',
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    authenticationRequired: 'Authentication is required. Please sign in.',
    permissionDenied: 'You do not have permission to perform this action.',
    networkUnavailable:
      'The service is unavailable. Check your connection and try again.',
    serverFailure:
      'The server could not complete the request. Please try again.',
    sessionExpired: 'Your session expired. Please sign in again.',
    credentialConflict: 'A credential already exists for this provider.',
    validation: 'Check the highlighted values and try again.',
    route: {
      title: 'Application Error',
      description:
        'The page could not finish loading. This often happens when the local development servers are down or running on unexpected ports.',
      details: 'Details',
      unexpected: 'An unexpected application error occurred.',
      ports:
        'Check that gateway-api is on 3001, admin-api is on 3002, and admin-web is on 3003, then reload the page.',
      return: 'Return to the app entrypoint',
    },
  },
  pages: {
    dashboard: {
      title: 'Overview',
      description:
        'One SPA, role-aware navigation, and a deliberate split between user self-service and administrator controls.',
      session: 'Session',
      authenticated: 'Authenticated',
      unavailable: 'Unavailable',
      authPosture: 'Auth posture',
      cookieOnly: 'Cookie-only',
      gateway: 'Gateway',
      online: 'Online',
      offline: 'Offline',
      roleSurface: 'Role surface',
      superAdminSurface: 'Super admin + tenant + user',
      tenantAdminSurface: 'Tenant admin + user',
      userSurface: 'User only',
      registration: 'Registration',
      enabled: 'Enabled',
      disabled: 'Disabled',
      breakerTitle: 'Gateway circuit breaker is active',
      breakerDescription:
        'User chat traffic should expect a service offline response until an administrator re-enables the gateway.',
    },
    health: {
      title: 'Health',
      description:
        'Operational status view for the two initial planes exposed by the platform.',
      checking: 'Checking...',
      unavailable: 'Unavailable',
      unknown: 'Unknown',
    },
    legal: {
      back: 'Back to login',
      termsKicker: 'Terms',
      termsTitle: 'Terms of service',
      termsDescription:
        'This placeholder page gives the SPA the correct legal navigation surface while the formal legal copy is still being finalized.',
      termsCredential:
        'Use of provider credentials remains subject to platform policy.',
      termsAdmin:
        'Administrative actions are role-bound and auditable by design.',
      termsGateway:
        'Gateway access may be interrupted by a global circuit breaker.',
      privacyKicker: 'Privacy',
      privacyTitle: 'Privacy posture',
      privacyDescription:
        'This placeholder page reflects the initial security direction already baked into the backend: encrypted provider credentials, hashed identity correlation, and cookie-only browser auth.',
      privacySecrets: 'Provider API secrets are encrypted at rest.',
      privacySessions: 'Browser sessions avoid token exposure to JavaScript.',
      privacyIdentity:
        'User identity resolution for gateway traffic relies on emailHash.',
    },
    pending: {
      registrationKicker: 'Registration',
      registrationTitle: 'Create account',
      recoveryKicker: 'Account recovery',
      recoveryTitle: 'Forgot password',
      recoveryDescription:
        'This route is controlled by backend runtime configuration.',
      backendFlow: 'Backend flow pending',
      backendEndpoint: 'Backend endpoint pending',
      registrationPending:
        'Self-registration is enabled by runtime config, but the backend registration workflow still needs to be implemented.',
      recoveryPending:
        'The UI surface is ready, but the password recovery backend flow has not been implemented yet.',
      disabledTitle: 'Disabled by configuration',
      registrationDisabled:
        'Registration is currently disabled for this deployment.',
      recoveryDisabled:
        'Forgot-password is currently disabled for this deployment.',
    },
    providers: {
      title: 'Provider Credentials',
      description:
        'Manage your write-only provider credentials and choose separate default provider/model pairs for gateway chat and gateway image generation/editing.',
      boundaryTitle: 'Boundary reminder',
      boundaryDescription:
        'Administrators may create or reset another user provider credential, but they should only ever see the masked version of another user secret, never the raw token.',
    },
    users: {
      title: 'User Management',
      description:
        'Administrative user controls for search, lifecycle management, role assignment, and password reset workflows.',
      create: 'Create user',
      dependencyTitle: 'Backend dependency',
      dependencyDescription:
        'User listing and basic lifecycle editing are now connected. Role reassignment, pagination, primary-admin transfer, and password reset flow still need deeper backend support.',
    },
    image: {
      title: 'Image Generation Lab',
      description:
        'Generate, edit, save, and reuse images through the gateway-managed image workflow.',
    },
    video: {
      title: 'Video Generation Lab',
      description:
        'Create, poll, ingest, preview, and download gateway-managed video jobs from text or image references.',
    },
  },
} as const;
