# 监测点元数据缺失分析与改进方案

## 1. 现状分析

经过对当前系统数据库表结构（`Equipment`, `ThresholdConfig`, `TimeSeriesData`）的分析，以及对比《监测点定义文档》（`monitoring_point_definition.md`），发现系统在监测点元数据管理方面存在以下问题：

### 1.1 当前数据库结构

*   **`equipment` 表**: 仅存储设备层面的基本信息（如 `deviceId`, `deviceName`, `deviceType`），**不包含**该设备下属的监测点信息。
*   **`threshold_configs` 表**: 存储了告警阈值配置，其中包含 `monitoring_point` 字段。
    *   *局限性*: 并非所有监测点都需要配置阈值（例如某些仅做展示的状态指示），因此该表不能作为监测点的全集。
*   **`time_series_data` 表**: 存储实际运行时的监测数据，包含 `monitoring_point` 字段。
    *   *局限性*: 这是业务数据表，非元数据表。要获取某设备的监测点列表，必须通过 `SELECT DISTINCT monitoring_point` 查询，效率低且仅能获取已产生数据的监测点，无法体现“应有但尚未上报”的监测点。

### 1.2 存在的问题

1.  **缺乏元数据单一事实来源（Source of Truth）**: 数据库中没有一张表能直接回答“设备X有哪些监测点？它们的单位是什么？指标类型是什么？”。
2.  **前后端协作依赖文档**: 前端展示界面（如仪表盘）目前可能需要硬编码监测点列表，或依赖不完整的 `ThresholdConfig`，导致与后端逻辑不一致。
3.  **数据验证困难**: 接收 `TimeSeriesData` 时，难以校验上传的 `monitoring_point` 是否为合法定义的点，容易产生脏数据。

## 2. 改进方案建议

建议新增 **`MonitoringPoint` (监测点)** 实体表，作为设备监测点的元数据定义。该表将作为连接设备与实时数据的桥梁，确立监测点的标准定义。

### 2.1 新增实体设计

建议新建 `monitoring-point.entity.ts`，结构如下：

```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { Equipment } from './equipment.entity';
import { MetricType } from './time-series-data.entity'; // 复用现有的指标类型枚举

/**
 * 监测点定义实体
 * 存储设备下属的所有监测点的元数据信息
 */
@Entity('monitoring_points')
@Unique(['equipmentId', 'pointName']) // 同一设备下监测点名称唯一
export class MonitoringPoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 关联设备ID (UUID)
   * 数据库层面存储设备的 UUID 主键
   */
  @Column({ name: 'equipment_id', type: 'varchar', length: 36 })
  @Index()
  equipmentId: string;

  @ManyToOne(() => Equipment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  /**
   * 监测点名称
   * 对应文档中的"监测点名称"，使用中文标识，如 "总电压", "电池温度"
   */
  @Column({ name: 'point_name', length: 100 })
  pointName: string;

  /**
   * 指标类型
   * 复用 MetricType 枚举 (VOLTAGE, TEMPERATURE, SWITCH 等)
   * 对应文档中的数据类型概念，但更具体
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
   * 对应文档中的"说明"
   */
  @Column({ type: 'text', nullable: true })
  description: string;
}
```

### 2.2 字段映射说明

根据用户反馈与现有系统定义，新表字段映射关系如下：

*   **监测点名称 (pointName)**: 直接存储中文名称（如“总电压”）。不需要额外的英文标识符。
*   **指标类型 (metricType)**: 直接使用 `time_series_data.entity.ts` 中定义的 `MetricType` 枚举。
    *   文档中的 `number` 类型根据物理含义映射为 `VOLTAGE`, `CURRENT`, `TEMPERATURE` 等。
    *   文档中的 `boolean` 类型映射为 `SWITCH`。
*   **设备关联 (equipmentId)**: 数据库外键关联 `Equipment` 表的主键 (UUID)。在数据导入或 Seeding 阶段，通过 `device_id` (如 "SYS-BAT-001") 查找对应的 UUID 进行关联。
*   **其他字段**: 移除 `isKeyIndicator` (关键指标) 和 `displayOrder` (显示顺序)，保持元数据轻量化。

## 3. 实施步骤

1.  **创建迁移脚本**: 生成 `monitoring_points` 表的数据库迁移文件。
2.  **数据初始化 (Seeding)**:
    *   依据 `docs/data/monitoring_point_definition.md` 编写 Seed 脚本。
    *   脚本逻辑：
        1.  读取预定义的监测点列表（包含：设备编号 `device_id`, 监测点名称, 指标类型 `MetricType`, 单位, 说明）。
        2.  根据 `device_id` 查询设备表获取设备 UUID。
        3.  将监测点信息写入 `monitoring_points` 表。
3.  **代码更新**:
    *   更新 `EquipmentService`，提供获取设备下所有监测点的接口。
    *   (可选) 更新数据接收逻辑，增加合法性校验。

## 4. 预期收益

1.  **标准化**: 数据库层面确立了监测点的标准定义，不再依赖散落的文档。
2.  **一致性**: `ThresholdConfig`, `TimeSeriesData` 和新的 `MonitoringPoint` 统一使用 `MetricType` 枚举。
3.  **数据完整性**: 明确了每个监测点的所属设备、物理含义（类型）和单位。