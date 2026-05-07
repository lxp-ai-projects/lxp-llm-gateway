# ADR-009: Asynchronous Video Generation Foundation

## Status

Accepted

## Decision

The provider seam expands from image-only generation workflows toward a reusable media-generation foundation.

The first new capability is asynchronous video generation.

`gateway-api` must continue to depend on `packages/provider-sdk`, not on provider-specific video implementations.

The first video provider will be `packages/provider-openrouter`.

The first MVP is image-to-video first, while remaining text-to-video compatible at the contract and provider-seam level.

The shared seam now needs explicit video-generation contracts for:

- request normalization
- provider video catalog listing
- asynchronous job submission
- job status polling
- result download

The initial application posture is:

- treat video generation as an asynchronous job from day one
- use normalized statuses of `queued`, `running`, `succeeded`, `failed`, and `cancelled`
- persist media-generation job metadata in application-owned tables
- persist media asset metadata in application-owned tables
- store generated video files in dedicated object or file storage, not in Postgres
- keep only metadata, storage keys, and retrieval references in the database
- never expose provider-owned artifact URLs to the frontend as durable application references
- ingest successful provider outputs into configured application storage before exposing them to the frontend
- make job submission, polling, ingestion, and ledger writes idempotent from the gateway perspective
- treat cancellation as a normalized gateway status, with provider-side cancellation remaining best-effort and provider-dependent
- use bounded retry, exponential backoff, and terminal-state protection for polling and ingestion flows

The current `image_assets`, `image_jobs`, and `image_job_results` remain valid Phase 1 image-specific structures.

The next persistence direction is a generalized application-layer media model centered on:

- `media_generation_jobs`
- `media_assets`

The frontend direction is also incremental:

- stabilize backend video contracts first
- then extract reusable `Media Generation` UI components from the existing Image Lab
- only after that, add a `Video Lab` to the workspace experience

## Rationale

- video generation is materially different from image generation because the happy path is job-based, not request-response
- OpenRouter video already exposes a normalized asynchronous API with model discovery, capabilities, duration, aspect ratio, resolution, frame-image support, and pricing metadata
- OpenRouter video is a good MVP fit because it proves image-to-video first while preserving text-to-video compatibility in the same provider seam
- introducing video directly behind `provider-sdk` preserves the gateway seam and avoids leaking provider-specific video endpoints into `gateway-api`
- keeping asset persistence in the application layer preserves the existing boundary where providers own upstream communication and the gateway owns history, storage policy, and tenancy concerns
- storing videos outside Postgres is required for operational safety and aligns with the desired persistence rule
- provider artifact URLs are often temporary, provider-scoped, or governed by provider-native access controls, so the application must ingest them before treating them as durable assets
- idempotent submission and retry rules are required to avoid duplicate provider jobs, duplicate ingestion, and duplicate billable usage records
- a media-oriented contract foundation lets the platform grow toward image, video, and later audio without cloning one-off application flows

## Consequences

- `packages/domain`, `packages/contracts`, and `packages/provider-sdk` gain video-generation contracts before the full runtime implementation lands
- provider capabilities become broader than chat plus image, while remaining explicit and capability-oriented
- application policies and usage telemetry must expand from `image` toward `video` without introducing provider-specific branching
- the video job lifecycle must be tenant-scoped, idempotent, and auditable
- tenant policy and model-access rules must gain video-aware limits such as:
  - allowed models
  - max concurrent jobs
  - max duration
  - max resolution
  - cost caps
  - BYOK or fallback behavior
- the OpenRouter provider package should follow the same internal decomposition used for image providers:
  - catalog
  - model policy
  - transport client
  - request mapper
  - response mapper
  - job service or services
- the first MVP must prove the full pipeline end to end:
  - upload image
  - submit video job
  - poll status
  - ingest provider artifact into application storage
  - preview or download result through application-owned asset references
  - retain history
  - write ledger entries

## Operational Requirements

- video job submission must be idempotent from the gateway perspective
- the application layer should generate and persist an internal media job before submitting to the provider
- provider submission retries must not create duplicate upstream jobs when a provider job id has already been recorded
- retries, polling, and result ingestion must not create duplicate provider jobs or duplicate billable usage records
- polling must use bounded retry, exponential backoff, and terminal-state protection
- once a job reaches a terminal state, later pollers or retries must not regress it into a non-terminal state
- successful provider outputs must be ingested into configured application storage before the frontend receives a durable asset reference
- provider-owned artifact URLs may be used only as transient ingestion inputs, not as long-lived application references
- cancellation is a normalized gateway status; provider-side cancellation may be best-effort depending on provider support

## Non-Goals

This decision does not require:

- implementing every planned video provider at once
- unifying image persistence immediately into the future media tables
- adding audio generation before there is a concrete provider-backed use case
