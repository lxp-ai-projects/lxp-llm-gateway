# Query Files

These `.http` files are intended for local manual testing from an editor or HTTP client that supports the HTTP file format.

## Environment Files

- `http-client.env.json`: committed non-secret values such as local base URLs
- `http-client.private.env.json`: uncommitted private values such as API tokens

Use the `dev` environment when running the requests locally.

## Suggested Order

1. If the database is empty, run `Bootstrap First Admin` from `admin-api.http` once.
2. Run `auth.http` to log in and capture the issued tokens.
3. Set `accessToken` and `refreshToken` in `http-client.private.env.json`.
4. Run `admin-api.http` to create a user if needed.
5. Copy the returned `userUuid`.
6. Set `userUuid`, `userEmail`, and `userPassword` in `http-client.private.env.json`.
7. Set `providerApiToken` in `http-client.private.env.json`.
8. Store the NanoGPT credential.
9. Run the chat request with the issued access token.

## Files

- `admin-api.http`
- `auth.http`
- `provider-credentials.http`
- `gateway-api.http`

## Notes

- Do not save real API tokens into committed files.
- `http-client.private.env.json` is intended for local-only values and is ignored by Git.
- `gateway-api.http` now authenticates with `Authorization: Bearer {{accessToken}}`.
- `admin-api.http` and `provider-credentials.http` now require an authenticated admin/operator access token.
- `POST /api/v1/bootstrap/admin` is intentionally one-shot and only works before the first user exists.
