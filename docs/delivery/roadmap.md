# Delivery Roadmap

## Phase 1: Foundation

- root monorepo configuration
- documentation foundation
- app and package scaffolds
- local Docker Compose for Redis or Valkey
- initial OpenAPI placeholder
- lint, build, and test scripts

## Phase 2: Provider Path

- provider SDK contract implementation
- NanoGPT adapter implementation
- minimal chat flow through `gateway-api`
- initial gateway normalization

## Phase 3: Admin Control Plane

- admin authentication
- provider credential management
- basic settings management
- admin web integration

## Phase 4: Hardening

- contract testing
- stronger security controls
- CI refinement
- observability and operational readiness

## Open WebUI Hardening Backlog

See also [open-webui-hardening-plan.md](open-webui-hardening-plan.md) for implementation order and acceptance criteria.

### Gateway API

- add an explicit trusted-internal mode for the OpenAI-compatible facade
- reject or ignore forwarded identity headers unless the request arrives from a trusted integration path
- keep usage tracking and audit attribution tied to the resolved gateway user
- ensure compatibility-key authentication is treated as service-to-service auth, not as end-user auth
- document and, where needed, enforce that public callers cannot use trusted identity correlation

### Infrastructure

- place Open WebUI behind a reverse proxy or trusted ingress boundary in deployed environments
- strip user identity headers at the public edge
- inject trusted identity headers only from the reverse proxy or trusted Open WebUI deployment
- keep Open WebUI to gateway traffic internal when possible
- keep the compatibility key in infrastructure secret management and rotate it like any other service secret

### Open WebUI Deployment Posture

- keep Open WebUI as a UI client only
- keep BYOK provider credentials in `admin-api` and `gateway-api`, never in Open WebUI
- treat `BYPASS_MODEL_ACCESS_CONTROL=true` as a deliberate integration choice, not a generic default for public deployments
- prefer OIDC or proxy-auth backed identity before forwarding user correlation headers in production
- keep the strengthened identity path documented in ADRs and integration guides so future deploys do not treat the plain forwarded email header as the final target

### Documentation

- keep local development mode and production trusted mode documented separately
- maintain the Open WebUI threat model alongside the setup guide
- keep the provider seam guidance explicit so the OpenAI-compatible facade does not leak into provider packages
