# 货船管理系统 - 后端

基于 NestJS、TypeORM 和 MySQL 构建的船舶机舱智能管理综合后端系统。

## 功能特性

- **身份验证与授权**: 基于 JWT 的身份验证，支持 RBAC（基于角色的访问控制）
- **设备管理**: 船舶设备的 CRUD 操作，支持软删除
- **实时监控**: 来自设备传感器的时序数据采集和存储
- **阈值配置**: 可配置的告警阈值，自动生成告警
- **健康评估**: 基于历史监测数据的自动健康报告
- **文件导入**: 从 Excel/CSV 文件批量导入历史数据
- **高级查询**: 多维度数据查询和统计分析
- **WebSocket 支持**: 实时告警通知和状态更新
- **审计日志**: 完整的系统操作审计追踪

## 技术栈

- **框架**: NestJS 11.x
- **语言**: TypeScript 5.x
- **数据库**: MySQL 8.0+
- **ORM**: TypeORM 0.3.x
- **身份验证**: Passport.js + JWT
- **实时通信**: Socket.io
- **验证**: class-validator + class-transformer
- **测试**: Jest + Supertest

## 前置要求

- Node.js 18.x 或 20.x LTS
- MySQL 8.0+
- Redis（可选，用于队列处理）
- npm 8.x+

## 安装

### 1. 克隆仓库

```bash
git clone <repository-url>
cd cargo-ships-backend
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件并配置数据库连接和其他设置：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=cargo_ships_db

JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
```

### 4. 创建数据库

```bash
mysql -u root -p
CREATE DATABASE cargo_ships_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. 运行迁移

```bash
npm run migration:run
```

## 运行应用

### 开发模式

```bash
npm run start:dev
```

API 将在 `http://localhost:3000` 可用

### 生产模式

```bash
npm run build
npm run start:prod
```

### 调试模式

```bash
npm run start:debug
```

## 数据库迁移

### 生成新迁移

```bash
npm run migration:generate -- -n MigrationName
```

### 创建空迁移

```bash
npm run migration:create -- MigrationName
```

### 运行迁移

```bash
npm run migration:run
```

### 回滚最后一次迁移

```bash
npm run migration:revert
```

### 显示迁移状态

```bash
npm run migration:show
```

## 数据填充

### 填充客户规则

系统包含一个脚本，可以从客户文档自动填充阈值配置：

```bash
npm run seed:customer-rules
```

此脚本功能：
- 从 `docs/data/*.md` 客户文档解析监测规则
- 提取监测点、阈值、故障名称和建议措施
- 自动映射到数据库中的设备 ID
- 为所有监测点插入阈值配置

**配置选项：**

- **清空现有规则**: 在环境变量中设置 `CLEAR_EXISTING_RULES=true` 可在填充前删除所有现有阈值
- **数据库连接**: 使用与主应用程序相同的数据库配置（来自 `.env`）

**示例输出：**

```
🚀 开始填充客户规则...
📡 正在连接数据库...
✅ 数据库连接成功
📦 正在加载设备数据...
✅ 已加载 8 个设备
📄 正在解析客户文档...
📖 解析文件: 电池装置监测报警表汇总.md
📖 解析文件: 左右推进装置监测报警表汇总.md
📖 解析文件: 1#+2#逆变器监测报警表汇总.md
📖 解析文件: 直流配电板+舱底水系统+冷却水泵系统监测报警表汇总.md
✅ 共解析 150+ 条规则
🔍 正在验证规则...
✅ 规则验证通过
💾 正在插入规则到数据库...
✅ 成功插入 150+ 条规则
```

**客户文档位置：** `docs/data/`

脚本智能处理以下情况：
- 多设备配置（左/右推进装置、1#/2#逆变器）
- 不同故障等级（1级、2级、3级）映射到严重程度
- 各种指标类型（电压、电流、温度等）
- 基于故障名称检测上限/下限
- 二进制故障状态的开关值

## 测试

### 运行单元测试

```bash
npm run test
```

### 以监视模式运行测试

```bash
npm run test:watch
```

### 运行测试覆盖率

```bash
npm run test:cov
```

### 运行 E2E 测试

```bash
npm run test:e2e
```

## 项目结构

有关项目组织的详细信息，请参阅 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)。

```
src/
├── config/          # 配置模块
├── common/          # 共享工具（守卫、拦截器、装饰器）
├── database/        # 实体、迁移、种子数据
├── modules/         # 功能模块
│   ├── auth/
│   ├── users/
│   ├── equipment/
│   ├── monitoring/
│   └── ...
├── app.module.ts
└── main.ts
```

## API 文档

API 文档将在以下位置提供：
- Swagger UI: `http://localhost:3000/api/docs`（待实现）
- OpenAPI JSON: `http://localhost:3000/api/docs-json`

## 架构决策

### TypeScript 算法集成

系统使用基于 TypeScript 的算法，而不是外部 Python 服务，遵循简单性和快速迭代的原则。所有健康评估和诊断算法都直接在 NestJS 服务层实现。

### WebSocket 房间机制

实时通知使用 Socket.io 房间实现：
- **权限隔离**: 用户只接收他们有权访问的设备告警
- **性能优化**: 定向广播而非全局通知
- **设备分组**: 订阅特定设备更新

### 时序数据存储

时序监测数据使用 MySQL 分区策略：
- 按月分区以实现高效查询
- 自动分区管理
- 针对时间范围查询建立索引

## 配置

所有配置通过环境变量和集中配置文件管理：

- `src/config/app.config.ts` - 应用设置
- `src/config/database.config.ts` - 数据库连接
- `src/config/jwt.config.ts` - 身份验证
- `src/config/websocket.config.ts` - WebSocket 设置
- `src/config/redis.config.ts` - 队列配置
- `src/config/upload.config.ts` - 文件上传设置

## 开发工作流

1. 从 `main` 创建功能分支
2. 在 `src/modules/feature-name/` 中实现功能
3. 编写单元测试（同位置的 `*.spec.ts` 文件）
4. 根据需要创建数据库迁移
5. 更新文档
6. 提交拉取请求

## 代码风格

项目使用：
- ESLint 进行代码检查
- Prettier 进行代码格式化

```bash
npm run lint        # 检查 lint 错误
npm run format      # 使用 Prettier 格式化代码
```

## 安全性

- 所有密码使用 bcrypt 加密
- JWT 令牌实现无状态身份验证
- RBAC 实现细粒度访问控制
- 使用 DTO 对所有端点进行输入验证
- 通过 TypeORM 防止 SQL 注入
- CORS 配置用于前端集成

## 性能考虑

- 数据库连接池（10 个连接）
- 通过适当索引优化查询
- 大数据集分页
- 缓存策略（待使用 Redis 实现）
- 基于 WebSocket 房间的广播

## 故障排除

### 数据库连接错误

- 验证 MySQL 是否正在运行
- 检查 `.env` 中的凭据
- 确保数据库存在
- 检查防火墙设置

### 迁移错误

- 确保数据库可访问
- 检查迁移文件的语法错误
- 验证 `data-source.ts` 中的 TypeORM 配置

### 端口已被占用

```bash
# 查找占用端口 3000 的进程
lsof -i :3000

# 终止进程
kill -9 <PID>
```

## 相关文档

- [项目规范](../../specs/001-core-api-models/spec.md)
- [数据模型设计](../../specs/001-core-api-models/data-model.md)
- [实施计划](../../specs/001-core-api-models/plan.md)
- [任务清单](../../specs/001-core-api-models/tasks.md)
- [研究决策](../../specs/001-core-api-models/research.md)

## 许可证

UNLICENSED - 私有项目

## 支持

如有问题或疑问，请联系开发团队。
