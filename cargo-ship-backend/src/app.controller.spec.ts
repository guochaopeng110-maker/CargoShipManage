// 导入 NestJS 的测试相关模块，以及需要测试的控制器和服务。
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * `describe` 函数用于创建一个测试套件 (Test Suite)，它将一组相关的测试用例组织在一起。
 * 第一个参数是测试套件的名称，通常是被测试的类或模块的名称，如此处的 'AppController'。
 */
describe('AppController', () => {
  // 声明一个变量 `appController`，用于在各个测试用例中访问 AppController 的实例。
  let appController: AppController;

  /**
   * `beforeEach` 是一个钩子函数 (Hook)，它在当前测试套件中的每个测试用例 (`it` block) 运行之前都会执行一次。
   * 这对于避免在每个测试用例中重复编写初始化代码非常有用。
   */
  beforeEach(async () => {
    // `Test.createTestingModule()` 创建一个轻量级的 NestJS 模块，专门用于测试。
    // 这个测试模块模拟了真实的 NestJS 应用环境。
    const app: TestingModule = await Test.createTestingModule({
      // `controllers` 数组中列出了我们想要测试的控制器。
      // 测试模块会负责实例化这个控制器。
      controllers: [AppController],
      // `providers` 数组中列出了控制器所依赖的服务。
      // NestJS 的依赖注入系统会在这里创建 AppService 的实例并注入到 AppController 中。
      // **注意**: 在这个简单的测试中，我们提供了真实的 `AppService`。
      // 在更复杂的应用中，为了实现“单元测试”的隔离性，通常会在这里提供一个 `AppService` 的模拟(Mock)版本，
      // 以避免测试控制器时受到服务内部逻辑（如数据库调用）的影响。
      providers: [AppService],
    }).compile(); // `compile()` 方法编译测试模块，实例化所有组件。

    // `app.get()` 方法从编译好的测试模块中获取一个组件的实例。
    // 这里我们获取 `AppController` 的实例，并赋值给之前声明的 `appController` 变量。
    appController = app.get<AppController>(AppController);
  });

  // 使用 `describe` 也可以嵌套，用于更好地组织测试结构，这里我们为 'root' 路由相关的测试创建一个子分组。
  describe('root', () => {
    /**
     * `it` 函数定义了一个单独的测试用例 (Test Case)。
     * 第一个参数是对这个测试用例的文字描述，应该清晰地说明它要验证的行为。
     * 第二个参数是一个包含测试逻辑的函数。
     */
    it('should return "Hello World!"', () => {
      // `expect` 函数用于创建一个“断言”。它接收一个实际值。
      // `.toBe()` 是一个匹配器 (Matcher)，它检查 `expect` 中的实际值是否严格等于 (`===`) 括号中的期望值。
      // 整行代码的意思是：“期望调用 appController.getHello() 的结果是 'Hello World!'”。
      // 如果结果确实是 'Hello World!'，测试通过；否则，测试失败。
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
