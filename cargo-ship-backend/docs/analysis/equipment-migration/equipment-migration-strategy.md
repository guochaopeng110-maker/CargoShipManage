# 设备数据迁移策略讨论

## 背景

根据 `docs/data/` 目录下的业务需求文档，系统需要从细粒度的组件级设备管理转向系统级设备管理。

## 新的8个系统级设备

基于业务文档分析，确定以下8个系统级设备：

| 序号 | 设备编号 | 设备名称 | 设备类型 | 监测点数量 | 来源文档 |
|------|----------|----------|----------|------------|----------|
| 1 | SYS-BAT-001 | 电池系统 | 电池装置 | 24个 | 电池装置监测报警表汇总.md |
| 2 | SYS-PROP-L-001 | 左推进系统 | 推进系统 | 15个 | 左右推进装置监测报警表汇总.md |
| 3 | SYS-PROP-R-001 | 右推进系统 | 推进系统 | 15个 | 左右推进装置监测报警表汇总.md |
| 4 | SYS-INV-1-001 | 1#日用逆变器系统 | 逆变器系统 | 10个 | 1#+2#逆变器监测报警表汇总.md |
| 5 | SYS-INV-2-001 | 2#日用逆变器系统 | 逆变器系统 | 10个 | 1#+2#逆变器监测报警表汇总.md |
| 6 | SYS-DCPD-001 | 直流配电板系统 | 配电系统 | 11个 | 直流配电板+舱底水系统+冷却水泵系统监测报警表汇总.md |
| 7 | SYS-BILGE-001 | 舱底水系统 | 辅助系统 | 4个 | 直流配电板+舱底水系统+冷却水泵系统监测报警表汇总.md |
| 8 | SYS-COOL-001 | 冷却水泵系统 | 辅助系统 | 5个 | 直流配电板+舱底水系统+冷却水泵系统监测报警表汇总.md |

**总计**: 8个系统，94个监测点

## 迁移步骤建议

### 步骤1: 创建新设备记录

创建一个新的迁移文件来插入8个系统级设备：

```typescript
// src/database/migrations/XXXXXX-CreateSystemLevelEquipment.ts

export class CreateSystemLevelEquipment1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO equipment (id, device_id, device_name, device_type, status, description) VALUES
      ('${uuid()}', 'SYS-BAT-001', '电池系统', '电池装置', 'normal', '锂电池能源管理系统，包含BMS及所有电池单元'),
      ('${uuid()}', 'SYS-PROP-L-001', '左推进系统', '推进系统', 'normal', '左侧推进电机及其逆变控制系统'),
      ('${uuid()}', 'SYS-PROP-R-001', '右推进系统', '推进系统', 'normal', '右侧推进电机及其逆变控制系统'),
      ('${uuid()}', 'SYS-INV-1-001', '1#日用逆变器系统', '逆变器系统', 'normal', '1号日用逆变器及配套设备'),
      ('${uuid()}', 'SYS-INV-2-001', '2#日用逆变器系统', '逆变器系统', 'normal', '2号日用逆变器及配套设备'),
      ('${uuid()}', 'SYS-DCPD-001', '直流配电板系统', '配电系统', 'normal', '直流母排配电及保护系统'),
      ('${uuid()}', 'SYS-BILGE-001', '舱底水系统', '辅助系统', 'normal', '舱底水集水井及排水系统'),
      ('${uuid()}', 'SYS-COOL-001', '冷却水泵系统', '辅助系统', 'normal', '冷却水循环泵及管路系统');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM equipment WHERE device_id IN (
        'SYS-BAT-001', 'SYS-PROP-L-001', 'SYS-PROP-R-001', 
        'SYS-INV-1-001', 'SYS-INV-2-001', 'SYS-DCPD-001', 
        'SYS-BILGE-001', 'SYS-COOL-001'
      );
    `);
  }
}
```

### 步骤2: 数据关联迁移处理

**关键决策点需要讨论**：

#### 选项A: 清空历史数据（推荐用于开发/测试环境）

**优点**:
- ✅ 简单直接，无数据映射复杂性
- ✅ 保证数据一致性
- ✅ 适合项目早期阶段

**缺点**:
- ⚠️ 丢失所有历史监测数据和告警记录

**实施方式**:
```typescript
// 1. 清空关联表数据
await queryRunner.query(`DELETE FROM time_series_data;`);
await queryRunner.query(`DELETE FROM threshold_configs;`);
await queryRunner.query(`DELETE FROM alarm_records;`);

// 2. 软删除旧设备记录
await queryRunner.query(`
  UPDATE equipment 
  SET deleted_at = NOW() 
  WHERE device_id NOT IN ('SYS-BAT-001', 'SYS-PROP-L-001', ...);
`);
```

#### 选项B: 数据映射迁移（适合生产环境）

**优点**:
- ✅ 保留历史数据
- ✅ 数据连续性

**缺点**:
- ⚠️ 需要建立组件→系统的映射规则
- ⚠️ 迁移脚本复杂度高
- ⚠️ 需要仔细验证数据完整性

**实施方式**:
```typescript
// 创建映射表
const componentToSystemMap = {
  // 电池相关组件 -> 电池系统
  'BAT-001': 'SYS-BAT-001',  // 1#电池组
  'BAT-002': 'SYS-BAT-001',  // 2#电池组
  'BMS-001': 'SYS-BAT-001',  // BMS控制器
  
  // 左推进相关 -> 左推进系统
  'MOTOR-L-001': 'SYS-PROP-L-001',  // 左推进电机
  'INV-L-001': 'SYS-PROP-L-001',    // 左推进逆变器
  
  // 右推进相关 -> 右推进系统
  'MOTOR-R-001': 'SYS-PROP-R-001',
  'INV-R-001': 'SYS-PROP-R-001',
  
  // ... 其他映射
};

// 更新time_series_data的equipment_id
for (const [oldId, newId] of Object.entries(componentToSystemMap)) {
  await queryRunner.query(`
    UPDATE time_series_data 
    SET equipment_id = (SELECT id FROM equipment WHERE device_id = '${newId}')
    WHERE equipment_id = (SELECT id FROM equipment WHERE device_id = '${oldId}');
  `);
}

// 类似处理threshold_configs和alarm_records
```

### 步骤3: 监测点字段填充

由于新增了 `monitoring_point` 字段，历史数据需要填充该字段：

**策略1**: 基于 `metricType` 进行启发式推断
```typescript
// 示例：电压类型可能对应多个监测点
UPDATE time_series_data 
SET monitoring_point = '总电压'  
WHERE equipment_id = (SELECT id FROM equipment WHERE device_id = 'SYS-BAT-001')
  AND metric_type = 'voltage'
  AND monitoring_point IS NULL
  AND value > 500;  -- 启发式：高于500V的可能是总电压

UPDATE time_series_data 
SET monitoring_point = '单体电压'  
WHERE equipment_id = (SELECT id FROM equipment WHERE device_id = 'SYS-BAT-001')
  AND metric_type = 'voltage'
  AND monitoring_point IS NULL
  AND value BETWEEN 2 AND 4;  -- 单体电压范围2-4V
```

**策略2**: 标记为"未分类"，等待后续手动分类或丢弃
```typescript
UPDATE time_series_data 
SET monitoring_point = '历史数据-未分类'  
WHERE monitoring_point IS NULL;
```

## 待讨论的问题

### 问题1: 您当前环境是开发测试还是已有生产数据？

- [ ] **开发/测试环境** → 建议选项A（清空历史数据）
- [ ] **生产环境/有重要历史数据** → 需要选项B（数据映射迁移）

### 问题2: 如果需要保留历史数据，组件到系统的映射规则是什么？

需要您提供或确认：
- 当前数据库中实际存在哪些旧设备记录（device_id列表）
- 每个旧设备应该映射到8个新系统中的哪一个

我可以帮您执行查询来列出当前数据库中的设备清单。

### 问题3: 历史监测数据的monitoring_point字段如何处理？

- [ ] **选项A**: 使用启发式规则自动填充（可能不准确）
- [ ] **选项B**: 标记为"未分类"，仅用于历史查询参考
- [ ] **选项C**: 直接丢弃历史time_series_data，仅保留设备和阈值配置

### 问题4: 迁移时机

- [ ] 在开发环境完成所有测试后一次性迁移
- [ ] 分阶段迁移：先schema变更，再数据迁移，最后清理

## 下一步行动

请您回答上述4个问题，我将据此：

1. 生成精确的迁移脚本
2. 创建验证查询来确保数据完整性
3. 提供回滚方案
4. 更新相关测试数据和文档

## 附录：设备编号命名规范

建议的系统级设备编号格式：
```
SYS-{类别缩写}-{序号}

示例：
- SYS-BAT-001: 电池系统
- SYS-PROP-L-001: 左推进系统
- SYS-DCPD-001: 直流配电板系统
```

**类别缩写对照表**:
- BAT: Battery (电池)
- PROP: Propulsion (推进)
- INV: Inverter (逆变器)
- DCPD: DC Power Distribution (直流配电)
- BILGE: Bilge Water (舱底水)
- COOL: Cooling (冷却)
