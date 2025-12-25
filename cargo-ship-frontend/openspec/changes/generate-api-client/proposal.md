# Change: Generate API Client

## Why
The current manual service files (e.g., `alarms-service.ts`) are error-prone and require dual maintenance. We need to establish `docs/data/http-api.json` as the single source of truth and automate client generation to ensure strict type safety and synchronization with the backend.

## What Changes
- **Tooling**: Introduce `openapi-typescript-codegen` to generate TypeScript clients from OpenAPI v3.
- **Workflow**: Add `npm run generate:api` script for on-demand generation.
- **Codebase**:
    -   Create `src/services/api` as the home for generated code.
    -   Mark manual service files for deprecation and removal.

## Impact
- **Specs**: Adding `api-client` capability.
- **Code**:
    -   New directory: `src/services/api` (gitignored).
    -   Existing components: Will need refactoring to import from `src/services/api`.
