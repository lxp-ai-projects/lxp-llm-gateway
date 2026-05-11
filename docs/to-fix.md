Verify each finding against current code. Fix only still-valid issues, skip the
rest with a brief reason, keep changes minimal, and validate.

In `@packages/provider-xai/src/video/api-client.ts` around lines 70 - 76,
downloadVideoContent currently accepts any URL and forwards provider auth
headers via resolveHeaders to fetchWithTimeout, risking SSRF and credential
leakage; fix by validating and constraining the url parameter (allow only https,
enforce a whitelist of trusted hostnames or require provider-owned artifact
URLs, and reject URLs resolving to private/internal IP ranges), and stop
forwarding sensitive headers—change downloadVideoContent to strip provider auth
headers (or use a minimal safe header set) before calling fetchWithTimeout, or
route downloads through a trusted proxy/relay that injects credentials
server-side; reference downloadVideoContent, fetchWithTimeout, resolveHeaders,
and ProviderExecutionContext when implementing these checks and header
filtering.

==

Verify each finding against current code. Fix only still-valid issues, skip the
rest with a brief reason, keep changes minimal, and validate.

In `@packages/domain/src/index.ts` at line 171, The domain package isn't compiled
so downstream imports like export * from './media-generation.js' can't be
resolved; build the package before publishing or importing by ensuring
packages/domain has a proper "build" script that runs tsc (emits to dist/) and
that the root workspace build or CI pipeline invokes that build prior to other
packages; update the root "build" script or monorepo task runner to run the
domain package build (or add it as a prebuild dependency) so that dist/ exists
and the export in packages/domain/src/index.ts can be resolved.
