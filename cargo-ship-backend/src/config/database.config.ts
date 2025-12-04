/**
 * 数据库配置文件
 *
 * 描述：定义TypeORM数据库连接配置
 *
 * 数据库：MySQL 5.7+
 * ORM：TypeORM
 *
 * 配置项：
 * - 数据库连接信息
 * - 实体和迁移路径
 * - 同步和日志选项
 * - 连接池配置
 *
 * 环境变量：
 * - DB_HOST: 数据库主机地址
 * - DB_PORT: 数据库端口
 * - DB_USERNAME: 数据库用户名
 * - DB_PASSWORD: 数据库密码
 * - DB_DATABASE: 数据库名称
 * - DB_SYNCHRONIZE: 是否自动同步表结构
 * - DB_LOGGING: 是否启用SQL日志
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { registerAs } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

/**
 * 数据库配置命名空间
 *
 * 使用方式：
 * - TypeOrmModule.forRootAsync({
 *     useFactory: (configService: ConfigService) =>
 *       configService.get('database')
 *   })
 *
 * @returns TypeORM数据源配置
 */
export default registerAs(
  'database',
  (): DataSourceOptions => ({
    /**
     * 数据库类型
     *
     * 固定值：mysql
     * 支持MySQL 5.7及以上版本
     */
    type: 'mysql',

    /**
     * 数据库主机地址
     *
     * 默认值：localhost
     * 环境变量：DB_HOST
     *
     * @example
     * // 本地开发
     * DB_HOST=localhost
     *
     * // 生产环境
     * DB_HOST=mysql.example.com
     *
     * // Docker环境
     * DB_HOST=mysql_container
     */
    host: process.env.DB_HOST || 'localhost',

    /**
     * 数据库端口
     *
     * 默认值：3306（MySQL默认端口）
     * 环境变量：DB_PORT
     */
    port: parseInt(process.env.DB_PORT || '3306', 10) || 3306,

    /**
     * 数据库用户名
     *
     * 默认值：root
     * 环境变量：DB_USERNAME
     *
     * 安全建议：
     * - 生产环境不要使用root用户
     * - 创建专用数据库用户，仅授予必要权限
     */
    username: process.env.DB_USERNAME || 'root',

    /**
     * 数据库密码
     *
     * 默认值：''（空密码）
     * 环境变量：DB_PASSWORD
     *
     * 安全建议：
     * - 生产环境必须设置强密码
     * - 密码存储在.env文件中，不要提交到版本控制
     */
    password: process.env.DB_PASSWORD || '',

    /**
     * 数据库名称
     *
     * 默认值：cargo_ships_db
     * 环境变量：DB_DATABASE
     *
     * 说明：
     * - 数据库需要提前创建
     * - 字符集：utf8mb4
     * - 排序规则：utf8mb4_unicode_ci
     */
    database: process.env.DB_DATABASE || 'cargo_ships_db',

    /**
     * 实体类文件路径
     *
     * 说明：
     * - 自动加载所有.entity.ts文件
     * - 支持TypeScript和编译后的JavaScript
     */
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],

    /**
     * 数据库迁移文件路径
     *
     * 说明：
     * - 存放数据库迁移脚本
     * - 用于版本化管理数据库结构变更
     */
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],

    /**
     * 自动同步数据库表结构
     *
     * 默认值：false
     * 环境变量：DB_SYNCHRONIZE
     *
     * 警告：
     * - 开发环境可以设置为true（方便调试）
     * - 生产环境必须设置为false（防止数据丢失）
     * - 生产环境使用migration管理表结构
     *
     * @example
     * // 开发环境
     * DB_SYNCHRONIZE=true
     *
     * // 生产环境
     * DB_SYNCHRONIZE=false
     */
    synchronize: process.env.DB_SYNCHRONIZE === 'true' || false,

    /**
     * 启用SQL查询日志
     *
     * 默认值：false
     * 环境变量：DB_LOGGING
     *
     * 说明：
     * - true: 在控制台打印所有SQL查询
     * - false: 不打印SQL日志
     * - 开发环境建议开启，生产环境建议关闭
     *
     * @example
     * // 开发环境（调试SQL）
     * DB_LOGGING=true
     *
     * // 生产环境（性能优化）
     * DB_LOGGING=false
     */
    logging: process.env.DB_LOGGING === 'true' || false,

    /**
     * 数据库时区
     *
     * 固定值：+00:00（UTC时区）
     *
     * 说明：
     * - 统一使用UTC时区存储时间
     * - 前端根据用户时区显示
     */
    timezone: '+00:00',

    /**
     * 数据库字符集
     *
     * 固定值：utf8mb4
     *
     * 说明：
     * - 支持存储emoji表情符号
     * - 支持所有Unicode字符
     */
    charset: 'utf8mb4',

    /**
     * 额外的数据库配置
     *
     * 连接池配置：
     * - connectionLimit: 最大连接数（默认10）
     *
     * 说明：
     * - 连接池可以提高性能
     * - 根据服务器资源和并发量调整
     */
    extra: {
      connectionLimit: 10,
    },
  }),
);
