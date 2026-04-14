# Query Files

These `.http` files are intended for local manual testing from an editor or HTTP client that supports the HTTP file format.

## Environment Files

- `http-client.env.json`: committed non-secret values such as local base URLs
- `http-client.private.env.json`: uncommitted private values such as API tokens

Use the `dev` environment when running the requests locally.

## Suggested Order

1. Run `admin-api.http` to create a user.
2. Copy the returned user `id`.
3. Set `userId` in `http-client.private.env.json`.
4. Set `providerApiToken` in `http-client.private.env.json`.
5. Store the NanoGPT credential.
6. Keep the same `userId` in `http-client.private.env.json`.
7. Run the chat request.

## Files

- `admin-api.http`
- `provider-credentials.http`
- `gateway-api.http`

## Notes

- Do not save real API tokens into committed files.
- `http-client.private.env.json` is intended for local-only values and is ignored by Git.
