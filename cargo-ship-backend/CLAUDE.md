<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cargo Ships Management System Backend** - A comprehensive NestJS-based backend for intelligent engine room management on cargo ships. Features JWT authentication with RBAC, real-time monitoring, threshold-based alerting, health assessments, and WebSocket notifications.

**Tech Stack**: NestJS 11.x, TypeORM 0.3.x, MySQL 8.0+, TypeScript 5.x, Socket.io, Jest

## Essential Commands

### Development
```bash
npm run start:dev          # Development mode with hot reload
npm run start:debug        # Debug mode with inspector
npm run build              # Build for production
npm run start:prod         # Run production build
```

### Testing
```bash
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Generate coverage report
npm run test:e2e           # Run all E2E tests
npm run test:e2e -- test/alarm/threshold-crud.e2e-spec.ts  # Run specific E2E test
```

### Database Migrations
```bash
npm run migration:generate -- -n MigrationName  # Generate migration from entity changes
npm run migration:run                            # Run pending migrations
npm run migration:revert                         # Revert last migration
npm run migration:show                           # Show migration status
```

### Test Database Operations
```bash
npm run test:migration:run       # Run migrations on test database
npm run test:schema:drop         # Drop test database schema
```

### Code Quality
```bash
npm run lint               # Run ESLint with auto-fix
npm run format             # Format code with Prettier
```

## Architecture & Key Patterns

### Module Organization

The application follows NestJS feature module pattern:

```
src/modules/
├── auth/          # JWT authentication, login, token refresh, audit logging
├── equipment/     # Equipment CRUD, status management
├── monitoring/    # Time-series data collection and storage
├── alarm/         # Threshold configuration and alarm record management
├── report/        # Health assessment reports
├── import/        # Batch data import from Excel/CSV
├── query/         # Advanced querying and data export
└── websocket/     # Real-time notifications via Socket.io
```

Each module is self-contained with:
- **Controller**: HTTP endpoints with guards (JWT, Permissions, Roles)
- **Service**: Business logic and database operations
- **DTOs**: Request validation using class-validator
- **Entities**: TypeORM entities (in `src/database/entities/`)

### Global Configuration

**All modules use global guards/filters/interceptors** registered in `app.module.ts`:
- `JwtAuthGuard`: JWT authentication (global, skip with `@Public()` decorator)
- `HttpExceptionFilter`: Unified error response format
- `PerformanceInterceptor`: Request performance logging

### Authentication & Authorization

**Three-tier security model**:
1. **JWT Authentication**: Global guard, use `@Public()` to skip
2. **Permissions**: Resource-action pairs (e.g., `device:create`, `alert:read`)
3. **Roles**: Three roles with different permission sets:
   - `administrator`: Full access (35 permissions)
   - `operator`: Equipment and monitoring operations (16 permissions)
   - `viewer`: Read-only access (4 permissions)

**Controller method example**:
```typescript
@Post('thresholds')
@Permissions('alert:create')
@Roles('administrator', 'operator')
async createThreshold(@Body() dto: CreateThresholdDto) {
  // Only admins and operators with alert:create permission can access
}
```

### API Response Structure

**Standard response format** (defined in controllers):
```typescript
{
  code: 200,              // Business code (200 = success)
  message: '操作成功',
  data: {...},            // Actual data
  timestamp: 1234567890   // Unix timestamp
}
```

**HTTP Status Codes**:
- `POST` operations return `201 Created` by default (NestJS behavior)
- Other operations return `200 OK`
- Use `@HttpCode()` decorator to override

### Database Entities & Relationships

**Core entities** (all in `src/database/entities/`):
- `User` ↔ `Role` (many-to-many via `user_roles`)
- `Role` ↔ `Permission` (many-to-many via `role_permissions`)
- `Equipment`: Ship equipment with soft delete support
- `TimeSeriesData`: Monitoring data with equipment FK (cascade delete)
- `ThresholdConfig`: Alarm thresholds with equipment FK (cascade delete)
- `AlarmRecord`: Alarm events linked to threshold and equipment
- `HealthReport`: AI-generated health assessments
- `ImportRecord`: Batch import tracking
- `AuditLog`: Complete audit trail

**Soft delete**: Equipment uses `deletedAt` for soft delete. Always use `find()` (excludes soft-deleted) or `find({ withDeleted: true })` (includes soft-deleted).

### WebSocket Architecture

**Socket.io rooms for targeted broadcasting**:
- Permission isolation: Users only receive alerts for equipment they can access
- Device grouping: Subscribe to specific equipment updates (e.g., `equipment:${id}`)
- Room naming convention: `user:${userId}`, `equipment:${equipmentId}`, `role:${roleName}`

**Real-time events**:
- `alarm:new`: New alarm triggered
- `alarm:update`: Alarm status changed
- `alarm:count:update`: Alarm count statistics
- `equipment:status`: Equipment status changed

## Testing Patterns

### E2E Testing Best Practices

**Critical pattern**: Use direct database operations for test data setup, NOT API calls.

**❌ Wrong** (creates dependency chain):
```typescript
beforeEach(async () => {
  // Creates device via API - test fails if equipment API is broken
  const response = await request(app).post('/equipment').send({...});
  testEquipmentId = response.body.data.id;
});
```

**✅ Correct** (isolated, fast, reliable):
```typescript
beforeEach(async () => {
  await dbHelper.clearAllTables();
  await userFactory.initializeRolesAndPermissions();
  await userFactory.createAllTestUsers();
  
  // Get tokens via API (required for auth)
  const adminLogin = await request(app).post('/auth/login').send({...});
  adminToken = adminLogin.body.accessToken;
  
  // Create equipment directly in database (test data setup)
  const equipmentRepo = dataSource.getRepository(Equipment);
  const equipment = equipmentRepo.create({...TestEquipment.battery1});
  const savedEquipment = await equipmentRepo.save(equipment);
  testEquipmentId = savedEquipment.id;
});
```

### Test File Structure

**Required setup** in all E2E tests:
```typescript
import { DataSource } from 'typeorm';
import { Equipment } from '../../src/database/entities';

let app: INestApplication;
let dbHelper: DatabaseHelper;
let dataSource: DataSource;  // ← Required for direct DB access
let adminToken: string;

beforeAll(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  
  app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  
  await app.init();
  dbHelper = new DatabaseHelper();
  dataSource = dbHelper.getDataSource();  // ← Get dataSource reference
  userFactory.setDataSource(dataSource);
});
```

### Test Helpers & Factories

**DatabaseHelper** (`test/helpers/database.helper.ts`):
- `clearAllTables()`: Clean all tables except permissions/roles
- `getRepository<T>(entity)`: Get TypeORM repository
- `initializeTestUsers()`: Create admin, operator, viewer
- `createEquipment()`, `createMonitoringData()`, etc.

**User Factory** (`test/factories/user.factory.ts`):
- `TEST_USERS`: Predefined test users (admin, operator, viewer)
- `initializeRolesAndPermissions()`: Set up 35 permissions and 3 roles
- `createAllTestUsers()`: Create all test users

**Equipment Factory** (`test/factories/equipment.factory.ts`):
- `TestEquipment`: 15 predefined test devices (battery1, motorLeft, etc.)
- `ALL_EQUIPMENT`: Array of all test equipment

### HTTP Status Code Expectations

**Critical**: Match NestJS default behavior in tests:
```typescript
// POST operations
await request(app).post('/api/thresholds').send(dto).expect(201);  // ✅ Correct

// GET/PUT/DELETE operations
await request(app).get('/api/thresholds').expect(200);   // ✅ Correct
await request(app).put('/api/thresholds/:id').expect(200);
await request(app).delete('/api/thresholds/:id').expect(200);
```

### Validation Error Testing

**Distinguish between format errors (400) and not-found errors (404)**:
```typescript
// Format validation error (400)
it('should reject invalid UUID format', async () => {
  const dto = { equipmentId: 'invalid-uuid' };  // Not a valid UUID
  await request(app).post('/api/thresholds').send(dto).expect(400);
});

// Resource not found error (404)
it('should reject non-existent equipment', async () => {
  const dto = { equipmentId: '00000000-0000-0000-0000-000000000000' };  // Valid UUID
  await request(app).post('/api/thresholds').send(dto).expect(404);
});
```

## Common Patterns & Conventions

### DTO Validation

**Always validate at boundaries** using class-validator:
```typescript
export class CreateThresholdDto {
  @IsNotEmpty()
  @IsUUID('4')
  equipmentId: string;
  
  @IsEnum(MetricType)
  metricType: MetricType;
  
  @IsOptional()
  @IsNumber()
  upperLimit?: number;
  
  @ValidateIf(o => !o.upperLimit && !o.lowerLimit)
  @IsNotEmpty({ message: 'At least one limit must be set' })
  _validateLimits?: any;
}
```

### Service Layer Error Handling

**Throw NestJS exceptions** in services:
```typescript
async findOne(id: string): Promise<ThresholdConfig> {
  const threshold = await this.repository.findOne({ where: { id } });
  if (!threshold) {
    throw new NotFoundException(`阈值配置不存在: ${id}`);
  }
  return threshold;
}
```

### Audit Logging

**Use AuditService** for all state-changing operations:
```typescript
async create(dto: CreateDto, userId: string): Promise<Entity> {
  const entity = await this.repository.save(dto);
  
  await this.auditService.log({
    userId,
    action: AuditAction.CREATE,
    resource: 'equipment',
    resourceId: entity.id,
    details: `创建设备：${entity.deviceName}`,
  });
  
  return entity;
}
```

### Pagination Pattern

**Standard pagination response**:
```typescript
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// In service
async findAll(queryDto: QueryDto): Promise<PaginatedResult<Entity>> {
  const { page = 1, pageSize = 20 } = queryDto;
  const [items, total] = await this.repository.findAndCount({
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
```

## Configuration Files

- `.env`: Environment variables (DB credentials, JWT secrets)
- `src/config/*.config.ts`: Typed configuration modules
- `data-source.ts`: TypeORM DataSource for migrations
- `test-data-source.ts`: Separate DataSource for testing
- `test/jest-e2e.json`: E2E test configuration

## Important Notes

### TypeScript-First Philosophy

All business logic (including health assessment algorithms) is implemented in TypeScript, not external services. This enables rapid iteration and simplifies deployment.

### Time-Series Data Strategy

Monthly partitions on `time_series_data` table for efficient querying. Automated partition management ensures performance as data grows.

### Permission System

**35 total permissions** across 9 resources (device, monitoring, alert, report, import, export, user, role, audit). Permission definitions are in `test/factories/user.factory.ts` and match entity enums.

### Database Naming Conventions

- Tables: snake_case (e.g., `time_series_data`, `alarm_records`)
- Columns: snake_case (e.g., `equipment_id`, `created_at`)
- TypeORM automatically maps camelCase entity properties to snake_case columns

## Troubleshooting

### Test Failures Due to Missing API Endpoints

If E2E tests fail with 404 on GET/:id endpoints, check if the controller has both list and detail endpoints:
```typescript
@Get('thresholds')        // List endpoint
async findAll() {...}

@Get('thresholds/:id')    // Detail endpoint - often forgotten
async findOne(@Param('id', ParseUUIDPipe) id: string) {...}
```

### Test Data Not Isolated

If tests fail intermittently, check `beforeEach` cleanup:
```typescript
beforeEach(async () => {
  await dbHelper.clearAllTables();  // ← Must be first
  await userFactory.initializeRolesAndPermissions();
  // ... rest of setup
});
```

### HTTP Status Code Mismatches

NestJS POST operations default to 201 Created. Tests must expect 201, not 200.

### Foreign Key Violations

When creating test data, ensure parent entities exist first:
```typescript
// 1. Create equipment first
const equipment = await equipmentRepo.save({...});

// 2. Then create threshold referencing equipment
const threshold = await thresholdRepo.save({
  equipmentId: equipment.id,  // ← Must reference existing equipment
  ...
});
```
