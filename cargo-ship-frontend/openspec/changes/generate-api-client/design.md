# Design: API Client Generation

## Architecture
The solution introduces a build-time dependency `openapi-typescript-codegen` to bridge the gap between backend API definitions (OpenAPI v3) and frontend consumption.

-   **Input**: `docs/data/http-api.json` (OpenAPI v3 Specification).
-   **Transformation**: `openapi-typescript-codegen` processes the JSON.
-   **Output**: `src/services/api` containing:
    -   `index.ts`: Aggregated exports.
    -   `services/`: Individual service classes (e.g., `DefaultService.ts` or named services if tags are used).
    -   `models/`: TypeScript interfaces/types matching backend DTOs.
    -   `core/`: Base HTTP request handling (fetch/axios adapter).

## Integration Strategy

### 1. Dependency
We will use `openapi-typescript-codegen` as a `devDependency` because the code generation happens during development/build, not runtime.

### 2. Scripting
A new npm script `generate:api` will be added:
```json
"scripts": {
  "generate:api": "openapi -i docs/data/http-api.json -o src/services/api -c axios"
}
```
*Note: We need to decide on the HTTP client (fetch vs axios). The project currently uses `fetch` or `axios`? I will default to `fetch` or check existing usage pattern. Project uses `services/*` which likely wrap fetch. I'll perform a quick search for `axios` in `package.json` later to confirm. If not present, I'll use `fetch` (default).*
*Wait, `package.json` checked earlier: `axios` is NOT in dependencies. `fetch` is safer.*

### 3. Verification & CI
To ensure the client is up-to-date, we can optionally add a step in CI to check if regeneration produces disjoints, but for now, we rely on manual `npm run generate:api` when API specs change.

## Migration (Refactoring)
The migration will be iterative:
1.  **Generate** the client alongside existing services.
2.  **Pick** a service (e.g., `AlarmsService`).
3.  **Replace** calls in components (e.g., `useAlarmsStore`).
4.  **Delete** the manual `alarms-service.ts`.
5.  Repeat.

## Alternatives Considered
-   `orval`: Powerful but more complex config.
-   `typescript-fetch-api-client`: Older validation.
-   `openapi-typescript`: Generates *types only*, not the client code. We want a full client to replace service files, so `openapi-typescript-codegen` is preferred for generating methods.
