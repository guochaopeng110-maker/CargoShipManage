# Swagger/OpenAPI 最佳实践指南

## 目录

1. [概述](#概述)
2. [实体类装饰器规范](#实体类装饰器规范)
3. [控制器响应装饰器规范](#控制器响应装饰器规范)
4. [列表接口特殊要求](#列表接口特殊要求)
5. [常见问题和解决方案](#常见问题和解决方案)
6. [完整示例](#完整示例)

---

## 概述

本文档定义了在 Cargo Ships Management System 项目中使用 Swagger/OpenAPI 的最佳实践。遵循这些规范可以确保：

- ✅ 生成完整准确的 API 文档
- ✅ 前端能够自动生成类型定义
- ✅ `items` 数组元素类型正确引用实体而非 `any`
- ✅ 所有字段都有清晰的描述和示例

---

## 实体类装饰器规范

### 基本原则

**所有公开的实体字段都必须添加 `@ApiProperty` 或 `@ApiPropertyOptional` 装饰器。**

### 必填字段

使用 `@ApiProperty()` 装饰器标注必填字段：

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('equipment')
export class Equipment {
  @ApiProperty({
    description: '设备唯一ID（UUID格式）',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: String,
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: '设备编号（唯一标识）',
    example: 'SYS-BAT-001',
    type: String,
    maxLength: 50,
  })
  @Column({ name: 'device_id', unique: true, length: 50 })
  deviceId: string;

  @ApiProperty({
    description: '设备名称',
    example: '左推进电机',
    type: String,
    maxLength: 100,
  })
  @Column({ name: 'device_name', length: 100 })
  deviceName: string;
}
```

### 可选字段

使用 `@ApiPropertyOptional()` 装饰器标注可选字段：

```typescript
@ApiPropertyOptional({
  description: '设备型号',
  example: 'PM-1500-400V',
  type: String,
  maxLength: 100,
})
@Column({ length: 100, nullable: true })
model: string;

@ApiPropertyOptional({
  description: '制造商',
  example: '某电机制造商',
  type: String,
  maxLength: 100,
})
@Column({ length: 100, nullable: true })
manufacturer: string;
```

### 枚举字段

枚举字段必须指定 `enum` 和 `enumName` 选项：

```typescript
export enum EquipmentStatus {
  NORMAL = 'normal',
  WARNING = 'warning',
  FAULT = 'fault',
  OFFLINE = 'offline',
}

@ApiProperty({
  description: '设备当前运行状态',
  enum: EquipmentStatus,
  enumName: 'EquipmentStatus',  // ⚠️ 重要：必须指定 enumName
  example: EquipmentStatus.NORMAL,
  default: EquipmentStatus.NORMAL,
})
@Column({
  type: 'enum',
  enum: EquipmentStatus,
  default: EquipmentStatus.NORMAL,
})
status: EquipmentStatus;
```

### 日期字段

日期字段应包含示例值和类型说明：

```typescript
@ApiProperty({
  description: '记录创建时间',
  example: '2025-01-01T10:00:00.000Z',
  type: Date,
})
@CreateDateColumn({ name: 'created_at' })
createdAt: Date;

@ApiPropertyOptional({
  description: '投产日期',
  example: '2024-02-01',
  type: Date,
})
@Column({ name: 'commission_date', type: 'date', nullable: true })
commissionDate: Date;
```

### 数值字段

数值字段应包含合理的示例值和范围约束：

```typescript
@ApiProperty({
  description: '健康评分（0-100分）',
  example: 85.75,
  type: Number,
  minimum: 0,
  maximum: 100,
})
@Column({
  name: 'health_score',
  type: 'decimal',
  precision: 5,
  scale: 2,
})
healthScore: number;
```

### 关联字段

关联字段必须使用函数形式指定类型，避免循环依赖：

```typescript
@ApiPropertyOptional({
  description: '关联的设备实体',
  type: () => Equipment,  // ⚠️ 使用函数形式避免循环依赖
})
@ManyToOne(() => Equipment, { nullable: true })
@JoinColumn({ name: 'equipment_id' })
equipment: Equipment;
```

### JSON 字段

JSON 字段需要定义嵌套类型：

```typescript
// 先定义嵌套类型
export class UptimeStats {
  @ApiProperty({
    description: '总时长（毫秒）',
    example: 3600000,
    type: Number,
  })
  totalDuration: number;

  @ApiProperty({
    description: '运行时长（毫秒）',
    example: 3000000,
    type: Number,
  })
  runningDuration: number;
}

// 在实体中使用
@ApiExtraModels(UptimeStats)  // ⚠️ 必须注册嵌套类型
@Entity('health_reports')
export class HealthReport {
  @ApiPropertyOptional({
    type: UptimeStats,
    description: '运行时间统计（JSON格式）',
  })
  @Column({ name: 'uptime_stats', type: 'json', nullable: true })
  uptimeStats: UptimeStats;
}
```

### 敏感字段

敏感字段应使用 `@Exclude()` 排除，且不添加 `@ApiProperty`：

```typescript
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @ApiProperty({
    description: '用户名',
    example: 'admin',
  })
  @Column({ unique: true })
  username: string;

  // ❌ 不要添加 @ApiProperty
  @Exclude()  // ✅ 使用 @Exclude() 在响应中隐藏
  @Column()
  password: string;
}
```

---

## 控制器响应装饰器规范

### 单个实体响应

对于返回单个实体的接口，直接使用 `type` 参数：

```typescript
@Get(':id')
@ApiOkResponse({
  description: '查询成功，返回设备详细信息',
  type: Equipment,  // ✅ 简单明了
})
async findOne(@Param('id') id: string) {
  const equipment = await this.equipmentService.findOne(id);
  return {
    code: 200,
    message: '查询成功',
    data: equipment,
    timestamp: Date.now(),
  };
}
```

### 列表响应（重要）

**列表接口必须使用显式的 schema 定义，不能使用泛型 DTO。**

**⚠️ 关键要求：必须在控制器类上添加 `@ApiExtraModels` 装饰器！**

❌ **错误做法**（会导致 `items` 类型为 `any`）：

```typescript
@Get()
@ApiOkResponse({
  description: '查询成功',
  type: PaginatedResponseDto,  // ❌ 不要使用泛型 DTO
})
async findAll() { ... }
```

✅ **正确做法**（显式定义 schema + 注册实体）：

```typescript
import { ApiTags, ApiExtraModels, ApiOkResponse } from '@nestjs/swagger';
import { Equipment } from '../../database/entities/equipment.entity';

@ApiTags('设备管理')
@ApiExtraModels(Equipment)  // ⚠️ 关键：必须显式注册实体，否则前端代码生成会失败
@Controller('api/equipment')
export class EquipmentController {
  @Get()
  @ApiOkResponse({
    description: '成功获取设备列表',
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
              items: { $ref: '#/components/schemas/Equipment' }  // ✅ 引用已注册的实体
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
  async findAll(@Query() queryDto: QueryEquipmentDto) {
    const result = await this.equipmentService.findAll(queryDto);
    return {
      code: 200,
      message: '查询成功',
      data: {
        items: result.data,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
      timestamp: Date.now(),
    };
  }
}
}
```

### 自定义响应

对于非标准响应格式，使用 `schema` 定义：

```typescript
@Get('statistics')
@ApiOkResponse({
  description: '查询成功，返回设备状态统计数据',
  schema: {
    type: 'object',
    properties: {
      code: { type: 'number', example: 200 },
      message: { type: 'string', example: '查询成功' },
      data: {
        type: 'object',
        properties: {
          total: { type: 'number', example: 100 },
          normal: { type: 'number', example: 70 },
          warning: { type: 'number', example: 15 },
          fault: { type: 'number', example: 10 },
          offline: { type: 'number', example: 5 },
        }
      },
      timestamp: { type: 'number' }
    }
  }
})
async getStatistics() { ... }
```

---

## 列表接口特殊要求

### 标准格式

所有列表接口必须遵循以下格式：

```typescript
{
  code: 200,
  message: '查询成功',
  data: {
    items: T[],          // 实际数据数组
    total: number,       // 总记录数
    page: number,        // 当前页码（从1开始）
    pageSize: number,    // 每页大小
    totalPages: number   // 总页数
  },
  timestamp: number
}
```

### Service 层实现

```typescript
async findAll(queryDto: QueryDto): Promise<{
  data: Entity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { page = 1, pageSize = 20 } = queryDto;
  
  const [data, total] = await this.repository.findAndCount({
    skip: (page - 1) * pageSize,
    take: pageSize,
    order: { createdAt: 'DESC' },
  });
  
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),  // ⚠️ 必须计算 totalPages
  };
}
```

### Controller 层实现

```typescript
@Get()
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
            items: { $ref: '#/components/schemas/EntityName' }
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
async findAll(@Query() queryDto: QueryDto) {
  const result = await this.service.findAll(queryDto);
  
  return {
    code: 200,
    message: '查询成功',
    data: {
      items: result.data,      // ⚠️ 注意字段名映射
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    },
    timestamp: Date.now(),
  };
}
```

---

## 常见问题和解决方案

### 问题1: 前端代码生成报错 "Missing $ref pointer"

**错误信息**：
```
MissingPointerError: Missing $ref pointer "#/components/schemas/TimeSeriesData". 
Token "TimeSeriesData" does not exist.
```

**原因**：在 `@ApiOkResponse` 中使用了 `$ref` 引用实体，但该实体未通过 `@ApiExtraModels` 注册到 Swagger schemas。

**解决方案**：
```typescript
import { ApiTags, ApiExtraModels } from '@nestjs/swagger';
import { TimeSeriesData } from '../../database/entities/time-series-data.entity';

@ApiTags('监测数据')
@ApiExtraModels(TimeSeriesData)  // ✅ 必须显式注册
@Controller('api/monitoring')
export class MonitoringController {
  @Get('data')
  @ApiOkResponse({
    schema: {
      // ...
      items: {
        type: 'array',
        items: { $ref: '#/components/schemas/TimeSeriesData' }  // 现在可以正确引用
      }
    }
  })
  async queryData() { ... }
}
```

**规则**：所有在列表响应的 `$ref` 中引用的实体，都必须在控制器类上通过 `@ApiExtraModels` 显式注册。

---

### 问题2: `items` 数组类型为 `any` 或 `unknown`

**原因**：使用了泛型 DTO 或未正确引用实体 schema

**解决方案**：
```typescript
// ❌ 错误
items: { type: 'array' }

// ✅ 正确
items: {
  type: 'array',
  items: { $ref: '#/components/schemas/Equipment' }
}
```

### 问题3: 枚举值未在 Swagger 中显示

**原因**：未指定 `enumName`

**解决方案**：
```typescript
@ApiProperty({
  enum: EquipmentStatus,
  enumName: 'EquipmentStatus',  // ⚠️ 必须添加
  example: EquipmentStatus.NORMAL,
})
status: EquipmentStatus;
```

### 问题4: 嵌套对象未正确显示

**原因**：未使用 `@ApiExtraModels` 注册嵌套类型

**解决方案**：
```typescript
@ApiExtraModels(UptimeStats, TrendAnalysis)  // ✅ 注册所有嵌套类型
@Entity('health_reports')
export class HealthReport {
  @ApiPropertyOptional({
    type: UptimeStats,
  })
  uptimeStats: UptimeStats;
}
```

### 问题5: 关联实体导致循环依赖错误

**原因**：直接引用实体类型

**解决方案**：
```typescript
// ❌ 错误
@ApiProperty({ type: Equipment })
equipment: Equipment;

// ✅ 正确
@ApiProperty({ type: () => Equipment })  // 使用函数形式
equipment: Equipment;
```

### 问题6: 分页字段缺失

**原因**：Service 层未返回完整分页信息

**解决方案**：
```typescript
// ✅ 确保返回所有必需字段
return {
  data,
  total,
  page,
  pageSize,
  totalPages: Math.ceil(total / pageSize),  // 不要忘记计算 totalPages
};
```

---

## 完整示例

### 实体定义示例

```typescript
// src/database/entities/equipment.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export enum EquipmentStatus {
  NORMAL = 'normal',
  WARNING = 'warning',
  FAULT = 'fault',
  OFFLINE = 'offline',
}

@Entity('equipment')
export class Equipment {
  @ApiProperty({
    description: '设备唯一ID（UUID格式）',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: String,
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: '设备编号（唯一标识）',
    example: 'SYS-BAT-001',
    type: String,
    maxLength: 50,
  })
  @Column({ name: 'device_id', unique: true, length: 50 })
  deviceId: string;

  @ApiProperty({
    description: '设备名称',
    example: '左推进电机',
    type: String,
    maxLength: 100,
  })
  @Column({ name: 'device_name', length: 100 })
  deviceName: string;

  @ApiProperty({
    description: '设备类型',
    example: '推进电机',
    type: String,
    maxLength: 50,
  })
  @Column({ name: 'device_type', length: 50 })
  deviceType: string;

  @ApiProperty({
    description: '设备当前运行状态',
    enum: EquipmentStatus,
    enumName: 'EquipmentStatus',
    example: EquipmentStatus.NORMAL,
    default: EquipmentStatus.NORMAL,
  })
  @Column({
    type: 'enum',
    enum: EquipmentStatus,
    default: EquipmentStatus.NORMAL,
  })
  status: EquipmentStatus;

  @ApiProperty({
    description: '记录创建时间',
    example: '2025-01-01T10:00:00.000Z',
    type: Date,
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiPropertyOptional({
    description: '软删除时间（非空表示已删除）',
    example: null,
    type: Date,
  })
  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
```

### Controller 定义示例

```typescript
// src/modules/equipment/equipment.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { QueryEquipmentDto } from './dto/query-equipment.dto';

@ApiTags('设备管理')
@Controller('api/equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  @ApiOperation({
    summary: '查询设备列表',
    description: '分页查询设备列表，支持按类型、状态和关键词进行筛选',
  })
  @ApiOkResponse({
    description: '成功获取设备列表',
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
              items: { $ref: '#/components/schemas/Equipment' }
            },
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 10 }
          }
        },
        timestamp: { type: 'number', example: 1734567890123 }
      }
    }
  })
  async findAll(@Query() queryDto: QueryEquipmentDto) {
    const result = await this.equipmentService.findAll(queryDto);

    return {
      code: 200,
      message: '查询成功',
      data: {
        items: result.data,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
      timestamp: Date.now(),
    };
  }
}
```

### Service 定义示例

```typescript
// src/modules/equipment/equipment.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from '../../database/entities/equipment.entity';
import { QueryEquipmentDto } from './dto/query-equipment.dto';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
  ) {}

  async findAll(queryDto: QueryEquipmentDto): Promise<{
    data: Equipment[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page = 1, pageSize = 10, deviceType, status, keyword } = queryDto;

    const queryBuilder = this.equipmentRepository.createQueryBuilder('equipment');

    if (deviceType) {
      queryBuilder.andWhere('equipment.deviceType = :deviceType', { deviceType });
    }

    if (status) {
      queryBuilder.andWhere('equipment.status = :status', { status });
    }

    if (keyword) {
      queryBuilder.andWhere(
        '(equipment.deviceId LIKE :keyword OR equipment.deviceName LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    queryBuilder.orderBy('equipment.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * pageSize).take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }
}
```

---

## 检查清单

在提交代码前，请确认：

- [ ] 所有实体公开字段都有 `@ApiProperty` 或 `@ApiPropertyOptional` 装饰器
- [ ] 枚举字段指定了 `enum` 和 `enumName`
- [ ] 关联字段使用函数形式 `type: () => Entity`
- [ ] JSON 字段的嵌套类型已通过 `@ApiExtraModels` 注册
- [ ] 敏感字段使用 `@Exclude()` 且未添加 `@ApiProperty`
- [ ] 列表接口使用显式 schema 定义而非泛型 DTO
- [ ] `items` 数组正确引用实体 schema (`$ref: '#/components/schemas/EntityName'`)
- [ ] 所有分页字段 (`items`, `total`, `page`, `pageSize`, `totalPages`) 都在 `data` 对象内
- [ ] Service 层正确计算并返回 `totalPages`
- [ ] 测试生成的 swagger.json 文件，确认类型定义正确

---

## 参考资料

- [NestJS OpenAPI 官方文档](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI Specification 3.0](https://swagger.io/specification/)
- [CLAUDE.md - API Response Structure](../CLAUDE.md#api-response-structure)
