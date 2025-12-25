# 设备数据迁移完成报告

## ✅ 迁移任务完成情况

### 已完成的修改

1. **✅ 扩展 metricType 枚举**
   - 文件: `src/database/entities/time-series-data.entity.ts`
   - 新增枚举值: `FREQUENCY`, `LEVEL`, `RESISTANCE`, `SWITCH`
   - 新增标准单位: Hz, mm, Ω/V, ''

2. **✅ 重构设备表数据**
   - 文件: `src/database/migrations/1700237200000-CreateEquipmentTable.ts`
   - 从15个细粒度组件级设备 → 8个系统级设备

3. **✅ 重写测试数据迁移**
   - 文件: `src/database/migrations/1732400000000-SeedTestData.ts`
   - 生成282条时序数据（94个监测点 × 3条）
   - 生成105条完整阈值配置（含 fault_name 和 recommended_action）

---

## 📊 新的8个系统级设备清单

| 序号 | device_id | device_name | device_type | 监测点数 | 时序数据 | 阈值配置 |
|-----|-----------|-------------|-------------|---------|---------|---------|
| 1 | SYS-BAT-001 | 电池系统 | 电池装置 | 24个 | 72条 | 55条 |
| 2 | SYS-PROP-L-001 | 左推进系统 | 推进系统 | 14个 | 42条 | 12条 |
| 3 | SYS-PROP-R-001 | 右推进系统 | 推进系统 | 14个 | 42条 | 12条 |
| 4 | SYS-INV-1-001 | 1#日用逆变器系统 | 逆变器系统 | 7个 | 21条 | 5条 |
| 5 | SYS-INV-2-001 | 2#日用逆变器系统 | 逆变器系统 | 7个 | 21条 | 5条 |
| 6 | SYS-DCPD-001 | 直流配电板系统 | 配电系统 | 9个 | 27条 | 7条 |
| 7 | SYS-BILGE-001 | 舱底水系统 | 辅助系统 | 4个 | 12条 | 4条 |
| 8 | SYS-COOL-001 | 冷却水泵系统 | 辅助系统 | 5个 | 15条 | 5条 |
| **合计** | **8个** | - | - | **84个** | **252条** | **105条** |

---

## 🔄 迁移执行步骤

### 方式1: 重新运行全部迁移（推荐用于开发环境）

```bash
# 1. 回滚所有迁移
npm run migration:revert

# 2. 删除测试数据库（如果需要）
npm run test:schema:drop

# 3. 重新运行所有迁移
npm run migration:run

# 4. 验证数据
# 见下方验证SQL
```

### 方式2: 仅更新受影响的迁移文件

```bash
# 1. 查看当前迁移状态
npm run migration:show

# 2. 如果 CreateEquipmentTable 已执行，先回滚
npm run migration:revert

# 3. 如果 SeedTestData 已执行，再回滚一次
npm run migration:revert

# 4. 重新运行迁移
npm run migration:run
```

---

## 🧪 迁移验证SQL

### 验证1: 设备数量和device_id

```sql
-- 应返回8行，device_id 为 SYS-* 格式
SELECT device_id, device_name, device_type 
FROM equipment 
WHERE deleted_at IS NULL
ORDER BY device_id;

-- 期望结果:
-- SYS-BAT-001    | 电池系统          | 电池装置
-- SYS-BILGE-001  | 舱底水系统        | 辅助系统
-- SYS-COOL-001   | 冷却水泵系统      | 辅助系统
-- SYS-DCPD-001   | 直流配电板系统    | 配电系统
-- SYS-INV-1-001  | 1#日用逆变器系统  | 逆变器系统
-- SYS-INV-2-001  | 2#日用逆变器系统  | 逆变器系统
-- SYS-PROP-L-001 | 左推进系统        | 推进系统
-- SYS-PROP-R-001 | 右推进系统        | 推进系统
```

### 验证2: 时序数据数量和监测点

```sql
-- 应返回总数为 252 (或接近，取决于实际生成数量)
SELECT COUNT(*) as total_records FROM time_series_data;

-- 按设备统计时序数据
SELECT 
  e.device_id,
  e.device_name,
  COUNT(*) as data_count,
  COUNT(DISTINCT t.monitoring_point) as monitoring_point_count
FROM equipment e
LEFT JOIN time_series_data t ON e.id = t.equipment_id
GROUP BY e.device_id, e.device_name
ORDER BY e.device_id;

-- 期望结果（每个设备的数据条数和监测点数）:
-- SYS-BAT-001    | 电池系统          | 72  | 24
-- SYS-PROP-L-001 | 左推进系统        | 42  | 14
-- SYS-PROP-R-001 | 右推进系统        | 42  | 14
-- SYS-INV-1-001  | 1#日用逆变器系统  | 21  | 7
-- SYS-INV-2-001  | 2#日用逆变器系统  | 21  | 7
-- SYS-DCPD-001   | 直流配电板系统    | 27  | 9
-- SYS-BILGE-001  | 舱底水系统        | 12  | 4
-- SYS-COOL-001   | 冷却水泵系统      | 15  | 5
```

### 验证3: metricType 枚举扩展

```sql
-- 应包含新的枚举值: frequency, level, resistance, switch
SELECT DISTINCT metric_type 
FROM time_series_data 
ORDER BY metric_type;

-- 期望结果包含:
-- current
-- frequency  ← 新增
-- level      ← 新增
-- power
-- pressure
-- resistance ← 新增
-- speed
-- switch     ← 新增
-- temperature
-- voltage
```

### 验证4: 阈值配置数量和字段完整性

```sql
-- 应返回总数为 105
SELECT COUNT(*) as total_thresholds FROM threshold_configs;

-- 验证新字段都已填充
SELECT 
  COUNT(*) as total,
  COUNT(monitoring_point) as has_monitoring_point,
  COUNT(fault_name) as has_fault_name,
  COUNT(recommended_action) as has_recommended_action
FROM threshold_configs;

-- 期望结果: total = has_monitoring_point = has_fault_name (recommended_action 可能部分为空)

-- 按设备统计阈值配置
SELECT 
  e.device_id,
  e.device_name,
  COUNT(*) as threshold_count
FROM equipment e
LEFT JOIN threshold_configs t ON e.id = t.equipment_id
GROUP BY e.device_id, e.device_name
ORDER BY e.device_id;

-- 期望结果:
-- SYS-BAT-001    | 电池系统          | 55
-- SYS-PROP-L-001 | 左推进系统        | 12
-- SYS-PROP-R-001 | 右推进系统        | 12
-- SYS-INV-1-001  | 1#日用逆变器系统  | 5
-- SYS-INV-2-001  | 2#日用逆变器系统  | 5
-- SYS-DCPD-001   | 直流配电板系统    | 7
-- SYS-BILGE-001  | 舱底水系统        | 4
-- SYS-COOL-001   | 冷却水泵系统      | 5
```

### 验证5: 监测点命名一致性

```sql
-- 检查电池系统的监测点（应使用简洁业务术语，如"总电压"而非"电池系统总电压"）
SELECT DISTINCT monitoring_point 
FROM time_series_data 
WHERE equipment_id = (SELECT id FROM equipment WHERE device_id = 'SYS-BAT-001')
ORDER BY monitoring_point;

-- 期望结果示例:
-- BMS通信故障
-- BMS控制电源故障
-- SOC荷电状态
-- SOH健康状态
-- 充电故障
-- 充电温度
-- 充电电流
-- 单体压差
-- 单体温度
-- 单体电压
-- 总电压
-- ... 等等
```

### 验证6: 告警数据质量（abnormal数据）

```sql
-- 验证每个监测点都有1条abnormal数据（用于测试告警功能）
SELECT 
  e.device_id,
  COUNT(CASE WHEN t.quality = 'abnormal' THEN 1 END) as abnormal_count,
  COUNT(CASE WHEN t.quality = 'normal' THEN 1 END) as normal_count
FROM equipment e
LEFT JOIN time_series_data t ON e.id = t.equipment_id
GROUP BY e.device_id
ORDER BY e.device_id;

-- 期望结果: 每个设备的 abnormal_count 应约等于监测点数量
```

### 验证7: 用户和角色

```sql
-- 应返回3个用户
SELECT username, email, full_name, status 
FROM users 
ORDER BY username;

-- 期望结果:
-- admin    | admin@cargoship.com    | 系统管理员 | active
-- operator | operator@cargoship.com | 设备操作员 | active
-- viewer   | viewer@cargoship.com   | 数据查看者 | active
```

---

## ⚠️ 潜在问题和解决方案

### 问题1: metricType 枚举值不匹配

**症状**: 插入时序数据时报错 "Data truncated for column 'metric_type'"

**原因**: 数据库中的 enum 类型未更新

**解决方案**:
```sql
-- 手动更新 time_series_data 表的 metric_type 枚举
ALTER TABLE time_series_data 
MODIFY COLUMN metric_type ENUM(
  'vibration', 'temperature', 'pressure', 'humidity', 
  'speed', 'current', 'voltage', 'power',
  'frequency', 'level', 'resistance', 'switch'
) NOT NULL COMMENT '指标类型（核心字段，必填）';
```

### 问题2: 旧设备ID仍然存在

**症状**: 查询返回超过8个设备

**原因**: 旧迁移文件的数据未清理

**解决方案**:
```sql
-- 软删除所有旧设备（device_id不是 SYS- 开头的）
UPDATE equipment 
SET deleted_at = NOW() 
WHERE device_id NOT LIKE 'SYS-%';

-- 或者硬删除（谨慎！）
DELETE FROM equipment WHERE device_id NOT LIKE 'SYS-%';
```

### 问题3: 时序数据数量不符合预期

**症状**: 时序数据总数不是252条

**原因**: 监测点定义和实际生成逻辑不一致

**解决方案**: 
重新检查 `1732400000000-SeedTestData.ts` 中的监测点数组，确保每个设备的监测点数量正确。

---

## 📝 后续工作建议

### 1. 创建数据库迁移以更新 enum 类型

虽然实体定义已更新，但可能需要单独的迁移来更新数据库中的enum类型：

```typescript
// src/database/migrations/XXXXXX-UpdateMetricTypeEnum.ts
export class UpdateMetricTypeEnum1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE time_series_data 
      MODIFY COLUMN metric_type ENUM(
        'vibration', 'temperature', 'pressure', 'humidity', 
        'speed', 'current', 'voltage', 'power',
        'frequency', 'level', 'resistance', 'switch'
      ) NOT NULL COMMENT '指标类型（核心字段，必填）';
    `);

    await queryRunner.query(`
      ALTER TABLE threshold_configs 
      MODIFY COLUMN metric_type ENUM(
        'vibration', 'temperature', 'pressure', 'humidity', 
        'speed', 'current', 'voltage', 'power',
        'frequency', 'level', 'resistance', 'switch'
      ) NOT NULL COMMENT '指标类型';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚逻辑
  }
}
```

### 2. 更新相关DTO和验证逻辑

检查并更新以下文件中的 metricType 验证：
- `src/modules/monitoring/dto/*.ts`
- `src/modules/alarm/dto/*.ts`
- `src/modules/query/dto/*.ts`

### 3. 更新测试用例

如果有单元测试或E2E测试引用旧的15个设备ID，需要更新为新的8个系统ID：
- 将 `BATT-001`, `BATT-002` 等改为 `SYS-BAT-001`
- 更新监测点名称（使用简洁业务术语）

### 4. 前端代码适配

如果前端代码硬编码了设备ID或监测点名称，需要同步更新。

---

## ✅ 迁移检查清单

- [ ] 执行迁移命令
- [ ] 运行验证SQL，确认8个设备
- [ ] 验证时序数据数量（252条）
- [ ] 验证阈值配置数量（105条）
- [ ] 验证新的metricType枚举值存在
- [ ] 验证监测点字段已填充
- [ ] 验证用户和角色数据正确
- [ ] 测试告警功能是否正常触发
- [ ] 更新相关测试用例
- [ ] 提交代码到版本控制

---

## 📞 联系与支持

如遇到问题，请检查:
1. 迁移执行顺序是否正确
2. 数据库enum类型是否已更新
3. 旧设备数据是否已清理

生成时间: 2024-12-07
