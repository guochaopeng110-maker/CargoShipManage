# 监测点元数据管理系统设计方案

## 1. 背景与问题分析

### 1.1 现状
当前系统数据库中缺乏“设备监测点”的元数据定义表。
- **Equipment表**: 仅管理设备级信息（如设备编号、名称）。
- **ThresholdConfig表**: 虽有 `monitoring_point` 字段，但仅覆盖了有告警阈值的点，不全。
- **TimeSeriesData表**: 仅存储运行数据，无法作为元数据的“单一事实来源”。

### 1.2 问题
- **前端展示受限**: 前端无法动态获取某设备应有哪些监测点，需硬编码。
- **数据校验缺失**: 无法校验上报数据的监测点名称是否合法。
- **一致性风险**: 各模块（导入、告警、实时数据）对监测点的定义可能产生偏差。

## 2. 数据库设计方案

新增 **`MonitoringPoint`** 实体，作为系统监测点的标准定义。

### 2.1 实体定义 (`src/database/entities/monitoring-point.entity.ts`)

```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { Equipment } from './equipment.entity';
import { MetricType } from './time-series-data.entity';

/**
 * 监测点定义实体
 * 存储设备下属的所有监测点的元数据信息
 */
@Entity('monitoring_points')
@Unique(['equipmentId', 'pointName']) // 约束：同一设备下监测点名称唯一
export class MonitoringPoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 关联设备ID (UUID)
   */
  @Column({ name: 'equipment_id', type: 'varchar', length: 36 })
  @Index()
  equipmentId: string;

  @ManyToOne(() => Equipment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  /**
   * 监测点名称
   * 使用中文标识，如 "总电压", "电池温度"
   */
  @Column({ name: 'point_name', length: 100 })
  pointName: string;

  /**
   * 指标类型
   * 复用 MetricType 枚举 (VOLTAGE, TEMPERATURE, SWITCH 等)
   */
  @Column({
    name: 'metric_type',
    type: 'enum',
    enum: MetricType,
    comment: '指标类型，对应 MetricType 枚举'
  })
  metricType: MetricType;

  /**
   * 单位
   * 如: V, A, °C, %, kΩ
   */
  @Column({ length: 20, nullable: true })
  unit: string;

  /**
   * 说明/描述
   */
  @Column({ type: 'text', nullable: true })
  description: string;
}
```

### 2.2 字段设计决策
1.  **数据类型**: 复用系统现有的 `MetricType` 枚举，统一物理含义标准。
2.  **标识符**: 仅使用**中文名称** (`pointName`) 作为业务标识，不增加英文 Key。
3.  **设备关联**: 数据库存储 UUID 外键。
4.  **精简设计**: 移除“关键指标”、“显示顺序”等非核心元数据字段。

## 3. 数据初始化 (Seeding)

需编写 Seed 脚本，将文档 `docs/data/monitoring_point_definition.md` 中的定义同步到数据库。

**逻辑流程**:
1.  解析文档或预设的 JSON 配置（包含 `device_id`, `pointName`, `metricType`, `unit`）。
2.  根据 `device_id` (如 "SYS-BAT-001") 查询 `equipment` 表，获取对应的 UUID。
3.  如果设备存在，则创建或更新 `MonitoringPoint` 记录。

## 4. 系统服务改造影响分析

引入该表后，**必须**对以下所有模块进行更新，以确保系统闭环管理：

### 4.1 设备模块 (Equipment Module) - [必须]
*   **Service**: 新增 `getMonitoringPoints(equipmentId)` 方法。
*   **Controller**: 新增接口 `GET /equipments/:id/monitoring-points`。
*   **Entity**: 在 `Equipment` 实体中增加 `@OneToMany` 关联，方便级联查询。
*   **作用**: 作为元数据的**读取入口**，供前端动态渲染设备详情页的仪表盘或列表，彻底消除前端硬编码。

### 4.2 监测模块 (Monitoring Module) - [必须]
*   **Service**: 在处理 `TimeSeriesData` 上报时，增加逻辑校验上报的 `monitoring_point` 是否在元数据表中存在。
*   **功能增强**: 若上报数据缺失单位，**必须**自动从元数据表中补全，确保入库数据的完整性和规范性。
*   **作用**: 作为数据的**写入防线**，防止未定义的脏数据进入系统。

### 4.3 导入模块 (Import Module) - [必须]
*   **Service**: 导入历史数据 Excel 时，**必须**校验表头中的监测点名称是否与 `MonitoringPoint` 表中的定义匹配。
*   **功能增强**: 根据元数据表动态生成“数据导入模板”，确保用户下载的模板与系统当前定义实时一致。
*   **作用**: 确保批量导入的数据与系统元数据定义保持强一致性。

### 4.4 告警模块 (Alarm Module) - [必须]
*   **Service**: 创建或修改 `ThresholdConfig` 时，**必须**校验 `monitoring_point` 字段值是否为该设备下的有效监测点。
*   **作用**: 确保告警配置建立在真实存在的监测点之上，避免无效配置。

## 5. 接口与 Swagger 变更分析

### 5.1 Swagger 定义变更
由于引入了新的 API 接口和实体，`swagger.json` 将发生以下变化：
1.  **新增路径**: 增加 `/api/equipment/{id}/monitoring-points` 的 Path 定义。
2.  **新增 Schema**: 增加 `MonitoringPoint` 实体的 Schema 定义。
3.  **现有接口影响**: 原有的设备查询接口 (`GET /api/equipment/*`) 保持不变，不会破坏现有契约。

### 5.2 前端代码生成影响
前端使用 `openapi-typescript-codegen` 生成代码时：
*   **Service**: 会自动生成新的 `EquipmentService.getEquipmentMonitoringPoints()` 方法（或类似命名）。
*   **Models**: 会自动生成 `MonitoringPoint` 类型定义。
*   **兼容性**: 由于是**增量更新**（Additive Change），不会导致现有前端代码编译失败。但在功能实现上，前端需要主动切换调用新接口来获取监测点列表，替代原有的硬编码逻辑。

### 5.3 实施建议
建议在后端完成开发并更新 Swagger 后，通知前端开发人员重新运行代码生成脚本，并基于新生成的 Service 方法进行仪表盘和详情页的重构。