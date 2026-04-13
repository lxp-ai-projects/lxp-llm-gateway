# lxp-llm-gateway

Multi-provider LLM gateway monorepo.

## Current State

This repository currently contains:

- foundational documentation
- a minimal monorepo workspace
- NestJS API applications
- a React 19 + Vite admin application
- provider seam packages
- a first NanoGPT provider placeholder

## Structure

- `apps/gateway-api`: data-plane gateway
- `apps/admin-api`: control-plane API
- `apps/admin-web`: admin interface
- `packages/contracts`: transport contracts
- `packages/domain`: framework-agnostic domain types
- `packages/provider-sdk`: provider adapter seam
- `packages/provider-nanogpt`: NanoGPT implementation placeholder

## Selected Stack

- APIs: NestJS
- Frontend: React 19, Vite, React Router DOM, TanStack Query
- Workspace: pnpm, turbo, TypeScript

## Next Steps

- install dependencies with `pnpm install`
- validate the workspace with `pnpm build`
- refine OpenAPI contracts
- build the first end-to-end NanoGPT flow
