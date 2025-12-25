# Tasks

- [x] Install dependencies
    - [x] `npm install -D openapi-typescript-codegen`
- [x] Configure generation script
    - [x] Add `"generate:api": "openapi --input ./docs/data/http-api.json --output ./src/services/api --client fetch"` to `package.json`
- [x] Generate Initial Client
    - [x] Run `npm run generate:api`
    - [x] Update `.gitignore` to include `src/services/api` (if chosen to be ignored) OR commit it.
        - *Decision*: Since user said "code isolation... and be ignored by .gitignore", I will add it to `.gitignore`.
- [x] Verify Generation
    - [x] Check `src/services/api/index.ts` exists.
    - [x] Check `src/services/api/models` contains expected types.
- [x] Demonstration Migration (Proof of Concept)
    - [x] Migrate one small service (e.g. `SystemState` or `Alarms`) to use the generated client.
    - [x] Verify the application still works.
- [x] Cleanup
    - [x] Remove the manual service file that was migrated.
