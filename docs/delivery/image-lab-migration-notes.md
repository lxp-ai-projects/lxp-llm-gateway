# Image Lab Migration Notes

The Image Lab refactor adds gateway-managed image persistence in `gateway-api`.

## New Tables

- `image_assets`
  - stores gateway-managed uploaded and generated image assets
  - keeps reusable reference content as `data_url`
- `image_jobs`
  - stores image generation and edit job history
- `image_job_results`
  - links a job to one or more stored assets

## Required Runtime Changes

- run SQL migrations or equivalent schema changes for the three new tables before enabling the new Image Lab in shared environments
- ensure `gateway-api` has the same database access already used for `users`, `providers`, and `user_provider_credentials`
- review `GATEWAY_MAX_IMAGE_ASSET_BYTES` if larger generated assets are expected

## Data Flow Changes

- `admin-web` no longer hardcodes image-provider model allowlists
- `admin-web` consumes `/api/v1/images/catalog`
- local uploads are converted to gateway-managed assets before edit requests
- image history is now paginated at 10 jobs per page
- saved generated images remain reusable as reference assets through the gateway

## Backward Compatibility

- existing provider credential flows are unchanged
- existing chat flows are unchanged
- existing `/images/generations` and `/images/edits` routes remain, but responses now include persisted asset metadata when available
