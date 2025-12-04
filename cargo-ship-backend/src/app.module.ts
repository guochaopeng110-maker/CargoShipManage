// 核心模块装饰器，以及配置、数据库、核心令牌等相关的类和函数
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// 应用层的主要控制器和服务
import { AppController } from './app.controller';
import { AppService } from './app.service';

// 导入应用的所有功能模块
import { AuthModule } from './modules/auth/auth.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { AlarmModule } from './modules/alarm/alarm.module';
import { ReportModule } from './modules/report/report.module';
import { ImportModule } from './modules/import/import.module';
import { QueryModule } from './modules/query/query.module';
import { WebsocketModule } from './modules/websocket/websocket.module';

// 导入公共模块，提供通用功能
import { CommonModule } from './common/common.module';

// 导入全局使用的守卫、过滤器和拦截器
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';

// 导入所有自定义配置文件
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import websocketConfig from './config/websocket.config';
import redisConfig from './config/redis.config';
import uploadConfig from './config/upload.config';

/**
 * @Module() 装饰器用于定义一个模块。
 * AppModule 是应用的根模块，它负责组织和集成应用的所有部分。
 */
@Module({
  // `imports` 数组：列出了当前模块所依赖的其他模块。
  imports: [
    // 全局配置模块 (ConfigModule)
    ConfigModule.forRoot({
      isGlobal: true, // 设置为全局模块，这样在任何模块中都可以注入 ConfigService，无需在每个模块中单独导入。
      load: [
        // 加载自定义的配置文件。这些文件导出一个返回配置对象的函数。
        appConfig,
        databaseConfig,
        jwtConfig,
        websocketConfig,
        redisConfig,
        uploadConfig,
      ],
      // 指定环境变量文件的加载路径顺序。NestJS会从左到右查找，并使用第一个找到的文件。
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`, // 例如 .env.production 或 .env.development
        '.env.local', // 本地环境变量覆盖
        '.env', // 默认环境变量
      ],
      cache: true, // 启用配置缓存，提高性能。
      expandVariables: true, // 启用环境变量的变量扩展 (例如, DB_HOST=${APP_HOST})。
    }),

    // 数据库模块 (TypeOrmModule)，用于与数据库交互。
    TypeOrmModule.forRootAsync({
      // 异步配置，允许我们先加载配置 (ConfigModule) 再设置数据库连接。
      inject: [ConfigService], // 注入 ConfigService，以便在 useFactory 中使用。
      useFactory: (configService: ConfigService) => {
        // useFactory 是一个工厂函数，它返回数据库的配置对象。
        // 我们从 ConfigService 中获取键为 'database' 的配置。
        const dbConfig = configService.get('database');
        return dbConfig || {}; // 返回数据库配置，如果找不到则返回空对象。
      },
    }),

    // 应用的功能模块 (Feature Modules)
    AuthModule, // 认证与授权模块
    EquipmentModule, // 设备管理模块
    MonitoringModule, // 数据监控模块
    AlarmModule, // 告警管理模块
    ReportModule, // 报告生成模块
    ImportModule, // 数据导入模块
    QueryModule, // 数据查询与导出模块
    WebsocketModule, // WebSocket实时推送模块
    CommonModule, // 公共模块：提供如性能监控和缓存服务等通用功能
  ],
  // `controllers` 数组：定义了该模块负责实例化的控制器。
  controllers: [AppController], // AppController 通常用于处理根路径的请求或应用级的路由。
  // `providers` 数组：定义了可被注入到模块内其他组件（如控制器、其他服务）的服务。
  providers: [
    AppService, // AppService 提供 AppController 使用的业务逻辑。
    {
      // 全局守卫 (Global Guard)
      // 使用 APP_GUARD 令牌，将 JwtAuthGuard 注册为全局守卫。
      // 这意味着应用中的每一个路由默认都会受到 JWT 身份验证的保护。
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      // 全局过滤器 (Global Filter)
      // 使用 APP_FILTER 令牌，将 HttpExceptionFilter 注册为全局异常过滤器。
      // 它会捕获应用中所有未处理的 HTTP 异常，并以统一格式返回给客户端。
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      // 全局拦截器 (Global Interceptor)
      // 使用 APP_INTERCEPTOR 令牌，将 PerformanceInterceptor 注册为全局拦截器。
      // 它会拦截所有请求，用于记录性能日志或执行其他横切关注点。
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
})
export class AppModule {}
