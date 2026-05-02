import type { AuthenticatedUser } from './auth.types';

export type RequestWithAuthUser = {
  authUser?: AuthenticatedUser;
  authAccessToken?: string;
};
