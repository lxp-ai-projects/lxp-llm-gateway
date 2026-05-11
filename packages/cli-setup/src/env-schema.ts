export type SetupEnvValues = Record<string, string>;

export type SetupAction =
  | 'keep-existing'
  | 'fill-missing'
  | 'rotate-setup-token'
  | 'overwrite-all';

export const ROOT_ENV_PATH = '.env';
export const ROOT_ENV_EXAMPLE_PATH = '.env.example';

export const REQUIRED_ENV_KEYS = [
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_NAME',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'REDIS_URL',
  'ADMIN_WEB_ORIGIN',
  'VITE_ADMIN_API_URL',
  'VITE_GATEWAY_API_URL',
  'LXP_PUBLIC_APP_URL',
  'LXP_ADMIN_API_URL',
  'LXP_GATEWAY_API_URL',
  'LXP_ENCRYPTION_MASTER_KEY',
  'LXP_EMAIL_LOOKUP_KEY',
  'LXP_ENCRYPTION_KEY_VERSION',
  'LXP_COOKIE_SECRET',
  'LXP_JWT_PRIVATE_KEY',
  'LXP_SETUP_TOKEN_HASH',
] as const;

export const OPTIONAL_ENV_KEYS = [
  'LXP_REQUEST_BODY_LIMIT',
  'LXP_OPENAI_COMPAT_API_KEY',
  'LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL',
  'LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED',
  'LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER',
  'LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADERS',
  'LXP_OPENAI_COMPAT_DEBUG',
  'NANOGPT_BASE_URL',
] as const;

export type SetupInitAnswers = {
  publicAppUrl: string;
  adminApiUrl: string;
  gatewayApiUrl: string;
  databaseHost: string;
  databasePort: string;
  databaseName: string;
  databaseUser: string;
  databasePassword: string;
  redisUrl: string;
  requestBodyLimit: string;
  openAiCompatApiKey: string;
  openAiCompatDefaultUserEmail: string;
  enableTrustedIdentity: boolean;
};

export const DEFAULT_SETUP_ANSWERS: SetupInitAnswers = {
  publicAppUrl: 'http://localhost:3003',
  adminApiUrl: 'http://localhost:3002',
  gatewayApiUrl: 'http://localhost:3001',
  databaseHost: 'localhost',
  databasePort: '5432',
  databaseName: 'lxp_gateway',
  databaseUser: 'lxp_gateway',
  databasePassword: 'change-me',
  redisUrl: 'redis://localhost:6379',
  requestBodyLimit: '10mb',
  openAiCompatApiKey: 'change-me',
  openAiCompatDefaultUserEmail: 'patrick@example.com',
  enableTrustedIdentity: false,
};

