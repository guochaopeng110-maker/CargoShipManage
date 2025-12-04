# Project Structure

This document describes the directory structure and organization of the Cargo Ships Backend project.

## Directory Overview

```
cargo-ships-backend/
├── src/
│   ├── config/              # Configuration modules
│   │   ├── app.config.ts           # Application settings
│   │   ├── database.config.ts      # Database connection config
│   │   ├── jwt.config.ts           # JWT authentication config
│   │   ├── websocket.config.ts     # WebSocket config
│   │   ├── redis.config.ts         # Redis config (for Bull Queue)
│   │   └── upload.config.ts        # File upload config
│   │
│   ├── common/              # Shared utilities and components
│   │   ├── decorators/      # Custom decorators (@Roles, @Permissions, etc.)
│   │   ├── filters/         # Exception filters (global error handling)
│   │   ├── guards/          # Auth guards (JWT, RBAC)
│   │   ├── interceptors/    # Request/response interceptors (logging, transform)
│   │   ├── pipes/           # Validation pipes
│   │   └── utils/           # Utility functions
│   │
│   ├── database/            # Database related files
│   │   ├── entities/        # TypeORM entities (*.entity.ts)
│   │   ├── migrations/      # Database migrations
│   │   └── seeds/           # Database seeders
│   │
│   ├── modules/             # Feature modules
│   │   ├── auth/            # Authentication & Authorization
│   │   ├── users/           # User management
│   │   ├── equipment/       # Equipment management
│   │   ├── monitoring/      # Time-series data monitoring
│   │   ├── thresholds/      # Threshold configuration
│   │   ├── alarms/          # Alarm records
│   │   ├── health-reports/  # Health assessment reports
│   │   ├── import/          # File import functionality
│   │   ├── query/           # Query and statistics
│   │   └── websocket/       # WebSocket gateway
│   │
│   ├── app.module.ts        # Root application module
│   ├── app.controller.ts    # Root controller
│   ├── app.service.ts       # Root service
│   └── main.ts              # Application entry point
│
├── test/                    # E2E tests
├── data-source.ts           # TypeORM DataSource for migrations
├── .env                     # Environment variables (not in git)
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── .dockerignore            # Docker ignore rules
├── nest-cli.json            # NestJS CLI configuration
├── package.json             # NPM dependencies
├── tsconfig.json            # TypeScript compiler config
└── README.md                # Project documentation
```

## Module Structure

Each feature module follows this structure:

```
modules/feature-name/
├── dto/                     # Data Transfer Objects
│   ├── create-feature.dto.ts
│   ├── update-feature.dto.ts
│   └── query-feature.dto.ts
├── entities/                # TypeORM entities
│   └── feature.entity.ts
├── feature.controller.ts    # HTTP endpoints
├── feature.service.ts       # Business logic
├── feature.module.ts        # Module definition
└── feature.controller.spec.ts  # Unit tests
```

## Configuration Management

- All configuration is centralized in `src/config/`
- Environment-specific configs use `.env.{environment}` files
- ConfigModule is globally available
- Type-safe access via ConfigService

## Database Management

### Entities
- Located in `src/database/entities/`
- Use TypeORM decorators
- Follow naming convention: `*.entity.ts`

### Migrations
- Generated using TypeORM CLI
- Located in `src/database/migrations/`
- Run with: `npm run migration:run`
- Create with: `npm run migration:generate -- -n MigrationName`

### Seeds
- Located in `src/database/seeds/`
- Used for initial data population
- Run manually or in CI/CD pipeline

## Common Components

### Decorators
- `@Roles()` - RBAC role checking
- `@Permissions()` - Fine-grained permission checking
- `@CurrentUser()` - Extract current user from request

### Guards
- `JwtAuthGuard` - JWT token validation
- `RolesGuard` - Role-based access control
- `PermissionsGuard` - Permission-based access control

### Filters
- `HttpExceptionFilter` - Global HTTP exception handling
- `TypeOrmExceptionFilter` - Database error handling

### Interceptors
- `LoggingInterceptor` - Request/response logging
- `TransformInterceptor` - Response data transformation
- `TimeoutInterceptor` - Request timeout handling

### Pipes
- `ValidationPipe` - DTO validation (global)
- `ParseIntPipe` - Integer parsing
- `ParseUUIDPipe` - UUID validation

## Naming Conventions

### Files
- Controllers: `*.controller.ts`
- Services: `*.service.ts`
- Modules: `*.module.ts`
- Entities: `*.entity.ts`
- DTOs: `*.dto.ts`
- Guards: `*.guard.ts`
- Interceptors: `*.interceptor.ts`
- Filters: `*.filter.ts`

### Classes
- Use PascalCase
- Suffix with type: `UserController`, `UserService`

### Variables/Functions
- Use camelCase
- Be descriptive: `findActiveUsers()`, `calculateHealthScore()`

## Testing Structure

### Unit Tests
- Co-located with source files: `*.spec.ts`
- Test individual components in isolation
- Mock dependencies

### E2E Tests
- Located in `test/` directory
- Test complete user flows
- Use real database (test environment)

## Development Workflow

1. Create feature branch from `main`
2. Implement feature in `src/modules/feature-name/`
3. Create migrations if schema changes
4. Write unit tests
5. Write E2E tests for critical flows
6. Update documentation
7. Create pull request

## Build and Deployment

### Development
```bash
npm run start:dev
```

### Production Build
```bash
npm run build
npm run start:prod
```

### Docker
```bash
docker build -t cargo-ships-backend .
docker run -p 3000:3000 cargo-ships-backend
```

## Environment Variables

See `.env.example` for all available configuration options.

Required variables:
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`

Optional variables:
- `NODE_ENV` (default: development)
- `PORT` (default: 3000)
- `LOG_LEVEL` (default: debug)

## Dependencies

### Production
- `@nestjs/core` - NestJS framework
- `@nestjs/typeorm` - TypeORM integration
- `typeorm` - ORM
- `mysql2` - MySQL driver
- `@nestjs/passport`, `passport`, `passport-jwt` - Authentication
- `@nestjs/jwt` - JWT handling
- `@nestjs/websockets`, `socket.io` - WebSocket support
- `class-validator`, `class-transformer` - DTO validation

### Development
- `@nestjs/cli` - CLI tools
- `@nestjs/testing` - Testing utilities
- `jest` - Test framework
- `typescript` - TypeScript compiler

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Project Specification](../../specs/001-core-api-models/spec.md)
- [Data Model Design](../../specs/001-core-api-models/data-model.md)
- [Implementation Plan](../../specs/001-core-api-models/plan.md)
