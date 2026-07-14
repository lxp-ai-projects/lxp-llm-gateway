# Laurie Codex Task — PR 1 — Change Own Password From Profile

## Repository

`lxp-ai-projects/lxp-llm-gateway`

## Branch

```bash
feature/user-profile-registration
```

## Goal

Add the missing self-service password change feature from:

```text
/app/profile
```

This PR must allow an authenticated user to change their own password by providing:

* current password
* new password
* confirm new password

Keep the scope narrow. Do not implement admin reset password, registration, tenant foundation, forgot password, password history, or force password change in this PR.

---

## Current State

The repo already has:

* `apps/admin-api` using NestJS
* `apps/admin-web` using React/Vite/Mantine/TanStack Query
* auth routes under `apps/admin-api/src/auth`
* global API prefix `/api/v1`
* cookie-based access token support
* `AccessTokenGuard`
* `AuthService`
* `PasswordService`
* `UserEntity.passwordHash`
* `/app/profile` route in the frontend
* a profile placeholder mentioning future password change support

Use the existing architecture. Do not introduce a new hashing library or a new authentication mechanism.

---

## Backend Implementation

### Add DTO

Create a DTO under `apps/admin-api/src/auth/dto`, for example:

```ts
export class ChangeOwnPasswordDto {
  currentPassword!: string;
  newPassword!: string;
  confirmNewPassword!: string;
}
```

Use `class-validator` decorators consistent with the project.

Recommended validation:

* all fields required
* all fields strings
* new password has a reasonable minimum length
* new password has a reasonable maximum length

The confirmation match can be validated in the service if there is no existing custom validator pattern.

---

### Add Controller Endpoint

In `AuthController`, add:

```http
POST /api/v1/auth/me/change-password
```

Controller shape:

```ts
@Post('me/change-password')
@UseGuards(AccessTokenGuard)
async changeOwnPassword(
  @Req() request: Request & RequestWithAuthUser,
  @Res({ passthrough: true }) response: Response,
  @Body() payload: ChangeOwnPasswordDto,
): Promise<{ message: string }> {
  const result = await this.authService.changeOwnPassword(
    request.authUser!,
    payload,
    request.authAccessToken!,
  );
  this.authCookieService.setAccessTokenCookie(
    response,
    result.accessToken,
    this.accessTokenCookieMaxAgeMs,
  );
  this.authCookieService.setRefreshTokenCookie(
    response,
    result.refreshToken,
    this.refreshTokenCookieMaxAgeMs,
  );
  return { message: 'Password changed successfully.' };
}
```

Use the existing request/auth typing pattern in the repo.

---

### Add AuthService Method

Add a method similar to:

```ts
async changeOwnPassword(
  authUser: Pick<AuthenticatedUser, 'userId' | 'activeTenantId'>,
  payload: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  },
  accessToken: string,
): Promise<TokenPair>
```

Behavior:

1. Verify the current access token and reject blacklisted or password-invalidated sessions.
2. Load the current user from the database using the authenticated user identity.
3. Reject if the user no longer exists or is not active.
4. Verify `currentPassword` using the existing `PasswordService.verifyPassword`.
5. Reject if the current password is invalid, confirmation does not match, or the new password matches the current password.
6. Hash and save the updated `passwordHash` using the existing `PasswordService.hashPassword`.
7. Invalidate the user's existing access and refresh sessions.
8. Resolve the authenticated session's active tenant and issue a rotated `TokenPair` for the current `sessionId`, keeping the user signed in.

Do not use bcrypt. Do not create another password encoder. Reuse the existing Argon2-backed `PasswordService`.

---

### Error Handling

Use Nest exceptions consistent with the current codebase.

Recommended user-facing messages:

* `Current password is invalid.`
* `New password confirmation does not match.`
* `New password must be different from the current password.`
* `Password changed successfully.`

Do not leak password hashes, token details, or low-level auth internals.

---

## Frontend Implementation

### Add API Client Method

In `apps/admin-web/src/lib/admin-api-client.ts`, add a method to `adminApiClient`:

```ts
async changeOwnPassword(payload: ChangeOwnPasswordInput): Promise<{ message: string }> {
  return request<{ message: string }>(
    `${adminApiUrl}/api/v1/auth/me/change-password`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}
```

Add the matching type in `api-client.types.ts`:

```ts
export type ChangeOwnPasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};
```

Follow the existing client/request pattern. Do not call `fetch` directly from the page component.

---

### Update Profile Page

In `apps/admin-web/src/pages/profile-page.tsx`, keep the existing profile/session display and add a password/security section.

Recommended UI section:

```text
Security
Change password
```

Fields:

* Current password
* New password
* Confirm new password

Use Mantine components consistent with the page style.

Expected UX:

* submit disabled while saving
* client-side validation for confirmation mismatch
* success alert after save
* error alert on API failure
* clear all password fields after success
* do not clear fields after failure
* use password autocomplete attributes:

  * `current-password`
  * `new-password`
  * `new-password`

Do not expose raw unsafe backend details if the error is too technical.

---

## Frontend Tests

Update `apps/admin-web/src/pages/profile-page.test.tsx`.

Existing tests currently expect the placeholder text. Replace or adjust that expectation.

Add tests for:

1. Profile page renders current session details.
2. Profile page renders password change fields.
3. Confirmation mismatch prevents API call and displays validation feedback.
4. Successful submit calls `adminApiClient.changeOwnPassword` with the expected payload.
5. Successful submit clears password fields and shows success feedback.
6. Failed submit shows an error and keeps the form values.

Use the project’s existing test utilities and mocking style.

---

## Backend Tests

Add tests for `AuthService.changeOwnPassword`.

Required cases:

1. Authenticated active user can change password with a valid current password.
2. Invalid current password rejects and does not save.
3. Confirmation mismatch rejects and does not save.
4. New password same as current password rejects and does not save.
5. Missing user rejects.
6. Disabled user rejects.

Add controller tests too if the repo already has a clear controller test pattern for auth. If not, service-level tests are required and controller coverage can be added minimally.

---

## Acceptance Criteria

* `/app/profile` allows an authenticated user to change their own password.
* The endpoint is protected by `AccessTokenGuard`.
* The backend verifies the current password before saving a new one.
* The backend uses the existing `PasswordService`.
* The backend updates only `UserEntity.passwordHash`.
* No database migration is introduced.
* No admin reset password logic is changed.
* No registration logic is changed.
* The user remains logged in after a successful password change.
* Frontend success and error states are handled cleanly.
* Backend tests pass.
* Frontend tests pass.
* Existing login, refresh, logout, and `/auth/me` behavior remain unchanged.

## Verification Commands

Run the standard checks from the repo root:

```bash
pnpm lint
pnpm test
pnpm build
```
