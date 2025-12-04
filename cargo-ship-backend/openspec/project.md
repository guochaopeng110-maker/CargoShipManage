# Project Context

## Purpose
**TDu Ship Engine Room Equipment Monitoring and Management System** - An intelligent monitoring platform for ship engine room equipment that provides real-time equipment monitoring, predictive maintenance, health assessment, and automated alarm management. The system monitors engine room equipment health, generates diagnostic reports, manages equipment lifecycle, detects anomalies, and supports multi-user access with role-based permissions.

**Core Goals:**
- Monitor ship equipment health and performance in real-time
- Generate intelligent health assessments and diagnostic reports
- Manage equipment lifecycle and maintenance schedules
- Detect anomalies and trigger automated alarms
- Support secure multi-user access with fine-grained permissions

## Tech Stack
- **Backend Framework**: NestJS 11.x
- **Language**: TypeScript 5.7
- **Database**: MySQL 8.0+ with TypeORM 0.3.x
- **Authentication**: JWT with Passport (passport-jwt, passport-local)
- **Real-time Communication**: Socket.io 4.8
- **Testing**: Jest 30.x with ts-jest
- **API Documentation**: Swagger/OpenAPI
- **File Processing**: ExcelJS, PapaParse
- **Password Hashing**: bcrypt
- **Validation**: class-validator, class-transformer

## Project Conventions

### Code Style
- **Language**: TypeScript with strict type checking
- **Naming Conventions**:
  - Classes/Interfaces: PascalCase (`UserService`, `Equipment`)
  - Methods/Properties: camelCase (`findById`, `userName`)
  - Database Tables: snake_case (`user_roles`, `time_series_data`)
  - Files: kebab-case (`auth.service.ts`, `equipment.entity.ts`)
- **Formatting**: Prettier with project configuration
- **Linting**: ESLint with TypeScript support
- **Comments**: Use for complex business logic and algorithms; DB column comments for clarity

### Architecture Patterns
- **Modular Monolith**: Feature-based module organization (AuthModule, EquipmentModule, MonitoringModule, etc.)
- **Layered Architecture**: Controller → Service → Repository pattern
- **Dependency Injection**: Full use of NestJS DI container
- **Global Middleware Stack**:
  - `JwtAuthGuard` (APP_GUARD) - Default authentication for all routes
  - `HttpExceptionFilter` (APP_FILTER) - Unified error response formatting
  - `PerformanceInterceptor` (APP_INTERCEPTOR) - Request/response logging

**Module Structure:**
```
src/modules/[feature-name]/
├── [feature].controller.ts      # API routes with Swagger docs
├── [feature].service.ts         # Business logic
├── [feature].module.ts          # Module registration
├── [feature]-push.service.ts    # WebSocket push logic (where applicable)
├── dto/
│   ├── create-[entity].dto.ts
│   ├── update-[entity].dto.ts
│   ├── query-[entity].dto.ts
│   └── index.ts                 # Barrel export
└── [service].spec.ts            # Unit tests
```

**Common Patterns:**
- Custom decorators in `src/common/decorators/`: `@Public()`, `@CurrentUser()`, `@Roles()`, `@Permissions()`
- Multi-layered guards: JWT Auth → Role Check → Permission Check
- DTOs with barrel exports via `index.ts`
- Soft deletes with `@DeleteDateColumn`
- Automatic timestamps with `@CreateDateColumn` / `@UpdateDateColumn`

### Testing Strategy
- **Framework**: Jest with ts-jest transformer
- **Test Location**: Co-located with source files (`*.spec.ts`)
- **Coverage Goal**: All business logic services, algorithms, and critical paths
- **Test Types**:
  - Unit tests for services and algorithms
  - E2E tests for API endpoints (see `test/jest-e2e.json`)
- **Key Test Areas**:
  - Health assessment algorithms (SOH calculator, health index evaluator, fault diagnostic engine)
  - Authentication and authorization flows
  - Data quality validation
  - Alarm threshold logic
  - File parsing and import logic
- **Commands**:
  - `npm run test` - Run all tests
  - `npm run test:watch` - Watch mode
  - `npm run test:cov` - Coverage report
  - `npm run test:e2e` - E2E tests

### Git Workflow
- **Branching Strategy**: Feature branch workflow
  - `main` - Production-ready code
  - `develop` - Integration branch (if used)
  - `feature/*` - Feature development
  - `bugfix/*` - Bug fixes
- **Commit Conventions**: Descriptive commit messages with context
- **TypeORM Migrations**: Use migration commands (not schema sync) for database changes
  - `npm run migration:generate` - Generate migration from entity changes
  - `npm run migration:run` - Apply migrations
  - `npm run migration:revert` - Rollback last migration

## Domain Context

### Ship Engine Room Equipment Monitoring
This system is designed for **maritime vessel equipment management**, specifically focusing on engine room machinery and critical ship systems.

**Key Domain Concepts:**
- **Equipment**: Physical devices/machinery on the ship (engines, pumps, generators, etc.)
- **Time-series Data**: Sensor readings collected continuously (vibration, temperature, pressure, etc.)
- **Metric Types**: Standardized measurements
  - VIBRATION - Equipment vibration levels
  - TEMPERATURE - Temperature readings
  - PRESSURE - Pressure measurements
  - HUMIDITY - Humidity levels
  - SPEED - Rotational speed
  - CURRENT - Electrical current
  - VOLTAGE - Electrical voltage
  - POWER - Power consumption
- **Equipment Status**: `normal`, `warning`, `fault`, `offline`
- **Data Quality**: `normal`, `abnormal`, `suspicious` (validated during ingestion)
- **Health Assessment**: Composite scoring combining SOH (State-of-Health), trend analysis, and fault diagnostics
- **Risk Levels**: Low/Medium/High based on health score thresholds
- **Alarms**: Threshold-based alerts with configurable bounds per equipment/metric

**Business Rules:**
- Account lockout after 5 failed login attempts (30-minute lockdown)
- Time-series data cascade deletes when equipment is deleted
- Health reports support single equipment or aggregate (multi-equipment) analysis
- Alarm notifications pushed in real-time via WebSocket
- Data quality validation marks abnormal readings but stores them for analysis

## Important Constraints

### Technical Constraints
- **Database**: MySQL 8.0+ required (uses specific features like JSON columns, composite indexes)
- **Timezone**: All timestamps stored in UTC
- **Character Encoding**: UTF8MB4 for international character support
- **Connection Pool**: Limited to 10 database connections
- **File Upload Size**: Configured via `upload.config.ts` (check for specific limits)
- **WebSocket**: Supports both WebSocket and polling transports; message buffer limited to 100 messages

### Security Constraints
- **Authentication**: JWT-based stateless authentication required for all routes (except `@Public()` decorated)
- **Password Policy**: Bcrypt hashing required; no plaintext passwords
- **Role-Based Access Control (RBAC)**: Three-tier system (User → Role → Permission)
- **Audit Logging**: All authentication events and critical operations must be logged
- **Sensitive Data**: Use `@Exclude()` on entity fields that should not be serialized (passwords, tokens)

### Performance Constraints
- **Time-series Queries**: Use composite indexes `(equipmentId, timestamp)` and `(equipmentId, metricType, timestamp)`
- **Batch Operations**: Import operations use transactions with rollback on errors
- **Real-time Push**: WebSocket room-based subscriptions to avoid broadcast storms

### Business Constraints
- **Data Retention**: Historical time-series data must be preserved for trend analysis
- **Maintenance Tracking**: All equipment changes and health assessments must be auditable
- **Multi-tenant Considerations**: User isolation enforced through authentication and RBAC

## External Dependencies

### Required External Services
- **MySQL Database**: Primary data store for all entities and time-series data
- **Redis** (optional): Configured in `redis.config.ts` for caching (if enabled)

### Optional External Services
- **IoT Sensor Systems**: Source of time-series data (integration via API endpoints or file import)
- **Email Service** (future): For alarm notifications and reports
- **SMS/Push Notifications** (future): For critical alarms

### Third-party Libraries
- **TypeORM**: Database ORM with migration support
- **Passport**: Authentication middleware with JWT and Local strategies
- **Socket.io**: Real-time bidirectional event-based communication
- **ExcelJS**: Excel file generation for reports and data export
- **PapaParse**: CSV parsing for file imports
- **Swagger/OpenAPI**: Automatic API documentation generation

### Development Tools
- **NestJS CLI**: Project scaffolding and module generation
- **TypeScript**: Type-safe development with strict mode
- **Jest**: Testing framework with coverage reporting
- **ESLint + Prettier**: Code quality and formatting
