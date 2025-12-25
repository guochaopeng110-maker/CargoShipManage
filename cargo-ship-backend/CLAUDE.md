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

**Standard list response format** (all list endpoints MUST use this format):
```typescript
{
  code: 200,
  message: '查询成功',
  data: {
    items: T[],          // Array of actual data items
    total: number,       // Total count of records
    page: number,        // Current page number (starts from 1)
    pageSize: number,    // Number of items per page
    totalPages: number   // Total number of pages (Math.ceil(total / pageSize))
  },
  timestamp: 1734567890123
}
```

**Key points for list responses**:
- ✅ **DO**: Place all pagination fields (`items`, `total`, `page`, `pageSize`, `totalPages`) inside `data` object
- ❌ **DON'T**: Use separate `pagination` object or inconsistent field names like `limit`
- ✅ **DO**: Always calculate and return `totalPages` for frontend pagination controls
- ✅ **DO**: Use Chinese message `'查询成功'` for successful queries
- ✅ **DO**: Include `timestamp` field at root level

**HTTP Status Codes**:
- `POST` operations return `201 Created` by default (NestJS behavior)
- Other operations return `200 OK`
- Use `@HttpCode()` decorator to override

**Swagger Documentation Requirements**:
All list endpoints MUST have explicit `@ApiOkResponse` schema definition:
```typescript
@ApiOkResponse({
  description: '成功获取XXX列表',
  schema: {
    type: 'object',
    properties: {
      code: { type: 'number', example: 200 },
      message: { type: 'string', example: '查询成功' },
      data: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/EntityName' }  // Reference entity schema
          },
          total: { type: 'number', example: 100 },
          page: { type: 'number', example: 1 },
          pageSize: { type: 'number', example: 20 },
          totalPages: { type: 'number', example: 5 }
        }
      },
      timestamp: { type: 'number', example: 1734567890123 }
    }
  }
})

### Database Entities & Relationships

**Core entities** (all in `src/database/entities/`):
- `User` ↔ `Role` (many-to-many via `user_roles`)
- `Role` ↔ `Permission` (many-to-many via `role_permissions`)
- `Equipment`: Ship equipment with soft delete support
- `TimeSeriesData`: Monitoring data with equipment FK (cascade delete)
  - **监测点 (Monitoring Point)**: 业务定义的监测点名称(如"总电压"、"最高单体温度"),用于精确标识时序数据
- `ThresholdConfig`: Alarm thresholds with equipment FK (cascade delete)
  - **监测点 (Monitoring Point)**: 关联到特定监测点,与设备ID组合形成精确的规则匹配
  - **故障名称 (Fault Name)**: 触发阈值时的故障名称(如"总压过压")
  - **处理措施 (Recommended Action)**: 触发告警后应采取的纠正措施
- `AlarmRecord`: Alarm events linked to threshold and equipment
  - **反规范化字段**: 包含 `monitoringPoint`、`faultName`、`recommendedAction` 以保证历史准确性
- `HealthReport`: AI-generated health assessments
- `ImportRecord`: Batch import tracking
- `AuditLog`: Complete audit trail

**Soft delete**: Equipment uses `deletedAt` for soft delete. Always use `find()` (excludes soft-deleted) or `find({ withDeleted: true })` (includes soft-deleted).

### Monitoring Point System

**监测点 (Monitoring Point)** 是系统的核心概念,用于解决单纯使用 `metricType` 无法区分业务含义的问题:

**问题背景**: 
- 物理类型相同但业务含义不同的监测点(如"总电压" vs "单体电压")都是 `voltage` 类型
- 仅用 `metricType` 无法为特定业务监测点配置告警或精确查询数据

**解决方案**:
- 每条时序数据记录包含 `monitoringPoint` 字段,标识具体的业务监测点
- 阈值配置基于 `(equipmentId, monitoringPoint)` 组合进行精确匹配
- 告警触发逻辑使用三元组 `(equipmentId, metricType, monitoringPoint)` 进行规则匹配

**监测点命名约定**:
- 使用适当大写的自然语言中文(如"总电压"、"最高单体温度")
- 名称应与客户需求文档保持一致
- 每个设备类型有其预定义的监测点集合
- 通过应用层验证服务确保监测点名称的一致性

**告警规则完整性**:
- 每个阈值配置必须包含 `monitoringPoint` 和 `faultName`
- `recommendedAction` 是可选的,但推荐填写以指导操作员
- 历史告警记录保留创建时的完整上下文(反规范化设计)

#### 监测点元数据管理

**监测点实体** (`MonitoringPoint`):
- 存储位置: `src/database/entities/monitoring-point.entity.ts`
- 表名: `monitoring_points`
- 关键字段:
  - `equipmentId`: 所属设备UUID (外键,级联删除)
  - `pointName`: 监测点名称 (中文,最大100字符)
  - `metricType`: 指标类型枚举 (voltage, temperature, etc.)
  - `unit`: 测量单位 (可选,用于自动补全)
  - `description`: 监测点描述 (可选)
- 唯一约束: `(equipmentId, pointName)` - 同一设备不能有重名监测点

**监测点种子数据**:
```bash
# 执行监测点种子脚本(幂等操作,可重复运行)
npm run seed:monitoring-points

# 或使用 ts-node 直接运行
npx ts-node scripts/seed-monitoring-points.ts
```

种子脚本会创建 47 个预定义监测点,覆盖 5 个设备系统:
- 电池装置系统 (SYS-BAT-001): 11 个监测点
- 左主机系统 (SYS-ENG-001): 10 个监测点  
- 右主机系统 (SYS-ENG-002): 10 个监测点
- 舵机系统 (SYS-RUD-001): 8 个监测点
- 发电机系统 (SYS-GEN-001): 8 个监测点

#### 监测点校验逻辑

**设备服务方法** (`EquipmentService`):

```typescript
// 1. 获取设备的所有监测点(分页)
const result = await equipmentService.getMonitoringPoints(
  equipmentId,
  { page: 1, pageSize: 20 }
);

// 2. 根据名称获取单个监测点
const point = await equipmentService.getMonitoringPointByName(
  equipmentId,
  '总电压'
);

// 3. 验证监测点有效性(含类型一致性检查)
const validatedPoint = await equipmentService.validateMonitoringPoint(
  equipmentId,
  '总电压',
  MetricType.VOLTAGE  // 可选,提供则校验类型一致性
);

// 4. 批量验证监测点(性能优化,使用缓存)
const validatedPoints = await equipmentService.validateMonitoringPointsBatch(
  equipmentId,
  ['总电压', '单体最高温度', '单体最低温度']
);
```

**校验规则**:
1. 监测点必须在设备元数据中定义
2. 如果提供 `metricType`,则必须与元数据中的类型匹配
3. 校验失败抛出 `NotFoundException` 或 `BadRequestException`

#### 监测点在各模块中的应用

**1. 监测数据模块** (`MonitoringService`):
- **单条数据接收**: 自动校验监测点并补全单位
  ```typescript
  // 如果提供了 monitoringPoint,自动校验并补全 unit
  const data = await monitoringService.receiveMonitoringData({
    equipmentId: 'xxx',
    timestamp: new Date(),
    metricType: MetricType.VOLTAGE,
    monitoringPoint: '总电压',  // 可选但推荐
    value: 650.5,
    // unit: 'V'  // 如果未提供,从监测点元数据自动补全
  });
  ```

- **批量数据接收**: 批量校验并缓存结果
  - 收集所有唯一监测点名称
  - 调用 `validateMonitoringPointsBatch()` 批量校验
  - 缓存校验结果,单条处理时直接使用

**2. 告警阈值模块** (`ThresholdService`):
- **创建阈值配置**: 自动校验监测点
  ```typescript
  const threshold = await thresholdService.create({
    equipmentId: 'xxx',
    metricType: MetricType.VOLTAGE,
    monitoringPoint: '总电压',  // 推荐提供
    faultName: '总压过压',      // 必填
    upperLimit: 700,
    duration: 300000,
    severity: AlarmSeverity.HIGH,
  });
  ```

- **更新阈值配置**: 仅在监测点/指标类型/设备ID变化时校验
  ```typescript
  // 智能校验 - 只校验变化的字段
  await thresholdService.update(thresholdId, {
    monitoringPoint: '单体最高温度',  // 监测点变化,触发校验
  });
  ```

**3. 告警评估逻辑** (`AlarmService`):
- 使用三元组精确匹配: `(equipmentId, metricType, monitoringPoint)`
- 如果时序数据有监测点 → 匹配相同监测点的阈值规则
- 如果时序数据无监测点 → 仅匹配 `monitoringPoint IS NULL` 的规则
- 告警记录反规范化,保留 `monitoringPoint`、`faultName`、`recommendedAction`

**4. 数据导入模块** (`ImportService`):
- **软校验模式**: 校验失败记录警告但不中断导入
  ```typescript
  // 批量导入时的监测点校验流程:
  // 1. 收集所有设备的唯一监测点集合
  // 2. 为每个设备批量校验并缓存结果
  // 3. 单条处理时使用缓存,未定义的监测点记录警告
  // 4. 允许导入,但提示可能影响告警准确性
  ```

- **日志输出**:
  ```
  开始批量校验监测点: 共 2 个设备
  监测点批量校验成功: 设备=SYS-BAT-001, 监测点数=3
  监测点批量校验完成: 尝试=2, 失败=0
  第 15 行: 监测点 '未定义监测点' 未在设备 SYS-BAT-001 的元数据中定义。
  ```

#### 向后兼容策略

系统采用**软校验 + 向后兼容**策略:

1. **监测点为可选字段**: 
   - 时序数据、阈值配置均可不提供监测点
   - 不提供时记录警告,但允许操作

2. **降级处理**:
   - 监测服务: 未提供监测点时记录警告,使用默认单位
   - 阈值服务: 未提供监测点时记录警告,继续创建
   - 导入服务: 监测点校验失败时记录警告,继续导入

3. **告警匹配兼容**:
   - 新数据(有监测点) + 新规则(有监测点) → 精确匹配 ✅
   - 新数据(有监测点) + 旧规则(无监测点) → 不匹配 ❌
   - 旧数据(无监测点) + 新规则(有监测点) → 不匹配 ❌  
   - 旧数据(无监测点) + 旧规则(无监测点) → 匹配 ✅

**最佳实践**:
- ✅ 新数据必须提供 `monitoringPoint`
- ✅ 新阈值配置必须提供 `monitoringPoint` 和 `faultName`
- ✅ 定期审查并补充缺失的监测点元数据
- ✅ 导入历史数据后检查警告日志,补充监测点定义

### WebSocket Architecture

**Socket.io rooms for targeted broadcasting**:
- Permission isolation: Users only receive alerts for equipment they can access
- Device grouping: Subscribe to specific equipment updates (e.g., `equipment:${id}`)
- Room naming convention: `user:${userId}`, `equipment:${equipmentId}`, `role:${roleName}`

**Real-time events (v2.0.0 - Simplified)**:
- `alarm:push`: Unified alarm event (replaces `alarm:new` and `alarm:update`)
  - Pushes both new alarms and status updates
  - Includes full business context: `monitoringPoint`, `faultName`, `recommendedAction`
  - Severity-based routing: Critical/High alarms → admin + operator roles
- `alarm:batch`: Batch alarm push (replaces `alarm:historical-batch`)
  - Used for historical data import
  - Pushes to admin and operator roles only
- `monitoring:new-data`: Unified monitoring data (replaces `equipment:data:realtime` and `import:latest-data`)
  - Real-time sensor data
  - Manual entry data
  - Latest data point after batch import
- `equipment:health:update`: Device health score updates
- `equipment:health:warning`: Low health score alerts (< 60)

**Deprecated events (removed in v2.0.0)**:
- ~~`alarm:new`~~ → Use `alarm:push`
- ~~`alarm:update`~~ → Use `alarm:push`
- ~~`alarm:count:update`~~ → Use API polling or active query
- ~~`user:online/offline`~~ → Removed, use API polling if needed
- ~~`equipment:status:*`~~ → Removed, use API polling
- ~~`equipment:update/created/deleted`~~ → Removed, refresh after user actions
- ~~`equipment:data:realtime`~~ → Use `monitoring:new-data`
- ~~`import:latest-data`~~ → Use `monitoring:new-data`

**Migration strategy**: For non-critical updates (device status, user presence), clients should use:
1. Active refresh after user operations
2. Polling at appropriate intervals (30-60 seconds)
3. This reduces WebSocket overhead and simplifies the architecture

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
  
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  monitoringPoint: string;  // 监测点名称,必填
  
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  faultName: string;  // 故障名称,必填
  
  @IsOptional()
  @IsString()
  recommendedAction?: string;  // 处理措施,可选
  
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

## Data Import Module

### Overview

The Import module (`src/modules/import/`) handles batch importing of time-series data from Excel, CSV, and JSON files. It includes **automatic alarm retrospection** and **real-time WebSocket data push** after import completion.

### Key Features

#### 1. **File Format Support**
- **Excel** (.xlsx): Recommended for large datasets
- **CSV**: Simple text format, good compatibility
- **JSON**: For API integration

Download standard templates via: `GET /api/imports/template/{format}`

#### 2. **Monitoring Point Field (监测点)**

**Critical for accurate alarm triggering**: The `monitoringPoint` field is used to precisely identify business monitoring points.

**Why it matters:**
- Physical types like `voltage` or `temperature` are too generic
- Different monitoring points (e.g., "总电压" vs "单体电压") need different alarm rules
- Alarm matching uses the triple `(equipmentId, metricType, monitoringPoint)`

**Usage:**
- **Required**: Strongly recommended to fill
- **Format**: Chinese business name, max 100 characters
- **Examples**: "总电压", "单体最高温度", "左主机转速"
- **Backward compatible**: If not provided, only generic rules (with `monitoringPoint IS NULL`) will match

**Naming conventions:**
- Use appropriate capitalized natural Chinese
- Match names in customer requirement documents
- Each equipment type has a predefined set of monitoring points
- Validation is enforced at the application layer

#### 3. **Automatic Alarm Retrospection**

After data import, the system automatically evaluates alarm thresholds for all imported data:

**Process:**
1. Transaction commits time-series data
2. For each saved record, call `AlarmService.evaluateThresholds(data)`
3. Create `AlarmRecord` entries for triggered thresholds
4. Use original data timestamp (not current time) for `triggeredAt`

**Error handling:**
- Best-effort mode: Single evaluation failure doesn't affect other data
- All errors are logged with details (equipment ID, monitoring point, error message)
- Import succeeds even if all alarm evaluations fail

**Logging:**
```
开始对 1000 条导入数据进行告警回溯评估...
告警回溯评估完成: 总数据=1000, 成功评估=998, 触发告警=15, 评估失败=2
```

#### 4. **Real-Time Data Push via WebSocket**

After import, the latest data for each equipment is pushed to subscribed clients:

**Process:**
1. Group saved data by `equipmentId`
2. Identify the latest record (max `timestamp`) for each equipment
3. Push to equipment-specific rooms via `WebsocketGateway.sendToEquipment(equipmentId, 'import:latest-data', data)`

**WebSocket event:**
- Event name: `import:latest-data`
- Room: `equipment:{equipmentId}`
- Message format:
  ```json
  {
    "id": 123,
    "equipmentId": "SYS-BAT-001",
    "timestamp": "2025-01-01T10:00:00.000Z",
    "metricType": "voltage",
    "monitoringPoint": "总电压",
    "value": 650.5,
    "unit": "V",
    "quality": "normal",
    "source": "file-import"
  }
  ```

**Error handling:**
- Push failures don't affect import success
- All errors are logged
- Clients can manually refresh if push fails

**Logging:**
```
开始为导入记录 xxx 推送最新数据 (共 1000 条数据)...
识别到 3 个设备的最新数据
最新数据推送完成: 导入记录=xxx, 推送设备数=3, 成功=3, 失败=0
```

### Import Flow

```
1. Upload file → FileParserService.parse{Excel|CSV|JSON}()
2. Create ImportRecord (status: PENDING)
3. User confirms → executeImport()
4. Save data in transaction
5. ✨ Evaluate alarms (for each record)
6. ✨ Push latest data to WebSocket (per equipment)
7. Update ImportRecord (status: COMPLETED/PARTIAL/FAILED)
```

### API Endpoints

- `POST /api/imports/upload` - Upload and preview
- `POST /api/imports/upload-and-import` - Upload and import immediately (recommended)
- `GET /api/imports/template/{format}` - Download standard template
- `GET /api/imports` - Query import records
- `GET /api/imports/:id` - Get import details
- `DELETE /api/imports/:id` - Delete import record

### File Structure

**Standard template columns:**

| 设备ID | 时间戳 | 监测点 | 指标类型 | 数值 | 单位 | 数据质量 |
|--------|--------|--------|----------|------|------|----------|
| SYS-BAT-001 | 2025-01-01 10:00:00 | 总电压 | 电压 | 650.5 | V | 正常 |
| SYS-BAT-001 | 2025-01-01 10:00:00 | 单体最高温度 | 温度 | 45.2 | ℃ | 正常 |

**Required fields:**
- 设备ID (equipmentId): Equipment identifier
- 时间戳 (timestamp): YYYY-MM-DD HH:mm:ss format
- 指标类型 (metricType): Metric type (voltage, temperature, etc.)
- 数值 (value): Numeric value

**Optional but strongly recommended:**
- 监测点 (monitoringPoint): Business monitoring point name

**Other optional fields:**
- 单位 (unit): Unit of measurement
- 数据质量 (quality): Data quality (normal, abnormal, suspicious)

### Best Practices

1. **Always include monitoring point**: Ensures accurate alarm matching
2. **Use standard templates**: Download via API to avoid format errors
3. **Validate before import**: Use upload endpoint to preview data
4. **Monitor logs**: Check alarm evaluation and push success rates
5. **Handle large files**: System supports batch processing (1000 records per batch)

## Customer Rules Seeding

### 客户规则填充脚本

**脚本位置**: `scripts/seed-customer-rules.ts`

**用途**: 自动解析 `docs/data/` 目录中的客户需求文档,并将监控规则填充到 `threshold_configs` 表中。

**运行方式**:
```bash
# 使用 ts-node 运行脚本
npx ts-node scripts/seed-customer-rules.ts

# 或添加到 package.json 的 scripts 中
npm run seed:customer-rules
```

**脚本功能**:
1. 解析客户文档中的监测点、阈值、故障名称和处理措施
2. 验证设备ID和监测点的有效性
3. 批量插入阈值配置(幂等操作,可重复运行)
4. 提供详细的日志和错误报告

**数据来源**: 
- 电池装置系统: `docs/data/电池装置系统监测数据及故障阈值.md`
- 推进系统: `docs/data/推进系统监测数据及故障阈值.md`
- 其他系统: 按需添加文档和解析逻辑

**注意事项**:
- 脚本是幂等的,重复运行会更新现有规则
- 运行前确保数据库连接配置正确
- 建议在测试环境中先验证脚本输出
- 脚本会自动跳过不存在的设备,并记录警告

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
