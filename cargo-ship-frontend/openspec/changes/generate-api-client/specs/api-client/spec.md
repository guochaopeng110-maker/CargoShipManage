# Spec: API Client Generation

## ADDED Requirements

### Requirement: API Client Generation script
The project MUST provide a script method to generate the TypeScript API client from `docs/data/http-api.json`.

#### Scenario: Execution
- **Given** the file `docs/data/http-api.json` exists
- **When** `npm run generate:api` is executed
- **Then** a strictly typed API client is generated in `src/services/api`

### Requirement: Code Isolation
Generated code MUST be placed in `src/services/api` and SHOULD be treated as read-only by developers.

#### Scenario: Output Directory structure
- **Given** the generation script has run
- **Then** `src/services/api` matches the `openapi-typescript-codegen` structure (index, services, models)

### Requirement: Type Safety
The client MUST export parsing/validation types matching the OpenAPI schema.

#### Scenario: Verify Models
- **Given** a schema `Alarm` in `http-api.json`
- **Then** a TypeScript interface `Alarm` is exported in `src/services/api/models/Alarm.ts` (or equivalent path)

### Requirement: Legacy Service Deprecation
Manual service files (e.g., `src/services/alarms-service.ts`) MUST be replaced by the generated client usage.

#### Scenario: Refactoring usage
- **When** a component needs to access `Alarms`
- **Then** it MUST import from `src/services/api` instead of `alarms-service.ts`
