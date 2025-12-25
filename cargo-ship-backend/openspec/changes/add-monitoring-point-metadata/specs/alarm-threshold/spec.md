## ADDED Requirements

### Requirement: 阈值配置监测点校验

系统 MUST 在创建或修改阈值配置时校验 monitoringPoint 字段是否为该设备的有效监测点。

#### Scenario: 创建阈值时校验监测点

- **假设** 设备 "SYS-BAT-001" 的有效监测点包括 "总电压", "充电电流", "SOC"
- **当** 创建阈值配置,equipmentId="SYS-BAT-001", monitoringPoint="总电压", metricType=VOLTAGE, upperLimit=683.1
- **那么** 系统验证 "总电压" 是该设备的有效监测点
- **并且** 阈值配置创建成功

#### Scenario: 拒绝无效监测点的阈值配置

- **假设** 设备 "SYS-BAT-001" 的有效监测点不包括 "油温"
- **当** 创建阈值配置,monitoringPoint="油温"
- **那么** 系统检测到该监测点不在元数据表中
- **并且** 返回 400 错误,错误消息为 "监测点 '油温' 不是设备 SYS-BAT-001 的有效监测点"
- **并且** 阈值配置不被创建

#### Scenario: 修改阈值时重新校验监测点

- **假设** 现有阈值配置关联到设备 "SYS-BAT-001" 的监测点 "总电压"
- **当** 修改阈值配置,将 monitoringPoint 改为 "无效监测点"
- **那么** 系统执行校验
- **并且** 返回 400 错误,拒绝修改

#### Scenario: 校验监测点与指标类型的一致性

- **假设** 监测点 "总电压" 在元数据表中定义为 metricType=VOLTAGE
- **当** 创建阈值配置,monitoringPoint="总电压", metricType=TEMPERATURE (类型不匹配)
- **那么** 系统检测到类型不一致
- **并且** 返回 400 错误,错误消息为 "监测点 '总电压' 的指标类型应为 VOLTAGE,但阈值配置使用 TEMPERATURE"

#### Scenario: 列出设备可用的监测点 (辅助功能)

- **假设** 用户在创建阈值配置时需要知道设备的有效监测点
- **当** 调用 `GET /api/equipment/{id}/monitoring-points` 接口
- **那么** 返回该设备的所有有效监测点列表
- **并且** 前端可以使用该列表填充下拉选择框,避免输入错误
