// 从 @nestjs/common 包中导入 Injectable 装饰器。
import { Injectable } from '@nestjs/common';

/**
 * @Injectable() 装饰器将 AppService 类标记为一个“提供者 (Provider)”。
 * 提供者是 NestJS 的一个基本概念，可以被注入到其他类（如控制器、其他服务）中。
 * 这使得 NestJS 的依赖注入系统能够管理这个类的生命周期和依赖关系。
 */
@Injectable()
export class AppService {
  /**
   * 一个简单的业务逻辑方法。
   * 在这个初始示例中，它不执行复杂的操作，只是返回一个固定的字符串。
   * 在实际应用中，服务类的方法会包含核心的业务逻辑，
   * 例如从数据库读取数据、调用外部 API、进行计算等。
   * @returns 返回一个 'Hello World!' 字符串。
   */
  getHello(): string {
    return 'Hello World!';
  }
}
