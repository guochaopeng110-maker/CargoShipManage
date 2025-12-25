// 从 @nestjs/core 包中导入 NestFactory，它是创建 NestJS 应用实例的核心工厂类。
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor } from '@nestjs/common';
// 导入应用的根模块 AppModule。AppModule 是整个应用的起点，它组织和管理着应用的所有其他模块。
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';

/**
 * 应用程序的启动函数 (Bootstrap Function)。
 * 这是一个异步函数，负责初始化和启动 NestJS 应用。
 */
async function bootstrap() {
  // 使用 NestFactory.create() 方法创建一个 NestJS 应用实例。
  // 它将根模块 AppModule作为参数，NestJS 会基于这个模块来解析整个应用的依赖关系图，
  // 并实例化所有的控制器（Controllers）、服务（Providers）等。
  // 'app' 是 INestApplication 接口的实例，代表了整个应用程序。
  const app = await NestFactory.create(AppModule);

  // 启动跨域
  app.enableCors();

  // 启用全局序列化拦截器，自动排除实体中标记为 @Exclude() 的敏感字段
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // --- Swagger (OpenAPI) 配置开始 ---
  const config = new DocumentBuilder()
    .setTitle('TDuCargoShipsManagement API')
    .setDescription('船舶机舱设备监测管理系统 API 文档')
    .setVersion('1.0')
    .addBearerAuth() // 为需要 JWT 认证的接口添加锁图标
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // 将生成的 OpenAPI 规范写入到项目根目录的 swagger.json 文件
  fs.writeFileSync('./swagger.json', JSON.stringify(document, null, 2));

  // 设置 Swagger UI 的访问路径
  SwaggerModule.setup('api-docs', app, document);
  // --- Swagger (OpenAPI) 配置结束 ---

  // 启动应用，使其开始监听传入的 HTTP 请求。
  // app.listen() 会启动底层的 HTTP 服务器（默认为 Express）。
  // 监听的端口从环境变量 `process.env.PORT` 中获取，如果未定义，则默认使用 3000 端口。
  await app.listen(process.env.PORT ?? 3000);
}

// 调用 bootstrap 函数来启动应用程序。
// 使用 `void` 操作符来表明我们有意忽略 `bootstrap` 函数返回的 Promise，
// 因为在这里我们不需要对其进行进一步处理。
void bootstrap();
