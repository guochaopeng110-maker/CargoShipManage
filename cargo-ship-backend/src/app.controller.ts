// 从 @nestjs/common 包中导入 Controller 和 Get 装饰器。
import { Controller, Get } from '@nestjs/common';
// 导入 AppService，这是与此控制器关联的服务。
import { AppService } from './app.service';
// 导入 @Public 装饰器，用于将路由标记为公开访问
import { Public } from './common/decorators/public.decorator';

/**
 * @Controller() 装饰器将 AppController 类标记为一个控制器。
 * 控制器负责接收传入的客户端请求，并向客户端返回响应。
 * 括号中的参数是可选的，用于定义一个通用的路由前缀。
 * 例如 `@Controller('app')` 会使得这个控制器下的所有路由都以 `/app` 开头。
 * 此处为空，表示它处理根路径级别的请求。
 */
@Controller()
export class AppController {
  /**
   * 这是控制器的构造函数，它利用了 NestJS 的依赖注入 (Dependency Injection) 功能。
   * `private readonly appService: AppService` 这行代码做了三件事：
   * 1. 声明了一个名为 `appService` 的私有成员变量。
   * 2. `readonly` 表示这个成员变量在初始化后不能被修改。
   * 3. NestJS 会自动查找在 `AppModule` 的 `providers` 中注册的 `AppService` 实例，
   *    并将其“注入”到这个构造函数中，赋值给 `this.appService`。
   * @param appService - 被注入的 AppService 实例。
   */
  constructor(private readonly appService: AppService) {}

  /**
   * @Get() 装饰器将 `getHello` 方法标记为一个 HTTP GET 请求的处理程序 (Route Handler)。
   * 当服务器收到一个对根路径 (`/`) 的 GET 请求时，这个方法就会被调用。
   * 括号中的参数是可选的，用于定义子路径，例如 `@Get('hello')` 会匹配 `GET /hello`。
   *
   * @returns 它会调用 `appService` 的 `getHello` 方法，并将返回值作为 HTTP 响应的主体发送给客户端。
   */
  @Get()
  @Public() // 将此路由标记为公开访问，绕过全局的 JwtAuthGuard
  getHello(): string {
    return this.appService.getHello();
  }
}
