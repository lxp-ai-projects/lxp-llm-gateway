# Query Files

These `.http` files are intended for local manual testing from an editor or HTTP client that supports the HTTP file format.

## Suggested Order

1. Run `admin-api.http` to create a user.
2. Copy the returned user `id`.
3. Set `@userId` in `provider-credentials.http`.
4. Set `@providerApiToken` in `provider-credentials.http`.
5. Store the NanoGPT credential.
6. Set the same `@userId` in `gateway-api.http`.
7. Run the chat request.

## Files

- `admin-api.http`
- `provider-credentials.http`
- `gateway-api.http`

## Notes

- Do not save real API tokens into committed files.
- Keep local token values in your editor session or untracked local copies only.
