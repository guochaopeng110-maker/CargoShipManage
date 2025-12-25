## ADDED Requirements

### Requirement: 监测点元数据管理

系统 MUST 提供监测点元数据的存储和查询能力,定义每个设备系统下的标准监测点集合。

#### Scenario: 创建监测点元数据

- **假设** 存在设备 "SYS-BAT-001" (电池装置系统)
- **当** 为该设备创建监测点元数据,包含 pointName="总电压", metricType=VOLTAGE, unit="V", description="电池系统总电压监测"
- **那么** 监测点记录成功保存到 `monitoring_points` 表
- **并且** 监测点与设备建立关联关系
- **并且** 该监测点成为该设备的有效监测点之一

#### Scenario: 查询设备的所有监测点

- **假设** 设备 "SYS-BAT-001" 已定义 5 个监测点: "总电压", "充电电流", "放电电流", "最高单体温度", "SOC"
- **当** 调用 `GET /api/equipment/{id}/monitoring-points` 接口
- **那么** 返回该设备的所有监测点列表
- **并且** 每个监测点包含 id, pointName, metricType, unit, description 字段
- **并且** 响应格式符合标准列表响应格式 (包含 items, total, page, pageSize)

#### Scenario: 监测点名称唯一性约束

- **假设** 设备 "SYS-BAT-001" 已存在监测点 "总电压"
- **当** 尝试为同一设备再次创建名为 "总电压" 的监测点时
- **那么** 操作失败并返回唯一性约束错误
- **并且** 错误消息提示 "该设备下已存在同名监测点"

#### Scenario: 级联删除监测点

- **假设** 设备 "SYS-BAT-001" 有 5 个关联的监测点
- **当** 删除该设备时
- **那么** 所有关联的监测点自动被删除
- **并且** 数据库通过外键级联约束 (ON DELETE CASCADE) 自动处理

#### Scenario: 按监测点类型筛选

- **假设** 设备有多种类型的监测点 (VOLTAGE, TEMPERATURE, CURRENT)
- **当** 查询时指定 metricType=VOLTAGE 筛选条件
- **那么** 仅返回类型为 VOLTAGE 的监测点
- **并且** 结果包含 "总电压", "单体电压" 等电压类监测点

### Requirement: Equipment 实体关联增强

系统 MUST 在 Equipment 实体中添加与 MonitoringPoint 的一对多关联,支持级联查询。

#### Scenario: Equipment 实体包含 monitoringPoints 关联

- **假设** 使用 TypeORM 查询设备实体
- **当** 使用 relations: ['monitoringPoints'] 选项查询时
- **那么** 返回的设备对象包含 monitoringPoints 数组
- **并且** 数组中包含该设备的所有监测点记录

#### Scenario: 通过设备直接访问监测点

- **假设** 已加载包含监测点关联的设备对象
- **当** 访问 `equipment.monitoringPoints` 属性时
- **那么** 获得该设备的监测点数组
- **并且** 无需额外的数据库查询 (已预加载)
