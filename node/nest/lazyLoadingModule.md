## 理解懒加载模块

默认情况下，`NestJS` 应用启动时会**预先加载（Eager Load）** 所有模块。虽然这对大多数应用没问题，但在模块数量多或资源受限的环境中，这会显著增加启动时间。

懒加载的核心机制由 `LazyModuleLoader`类（从 `@nestjs/core`包导入）提供。它让你能在需要时再加载模块，并会缓存已加载的模块，后续请求会非常快

```
// 示例：LazyModuleLoader 的基本使用方式[6](@ref)
@Injectable()
export class CatsService {
  constructor(private lazyModuleLoader: LazyModuleLoader) {} // 注入 LazyModuleLoader

  async doSomething() {
    const { LazyModule } = await import('./lazy.module'); // 动态导入模块
    const moduleRef = await this.lazyModuleLoader.load(() => LazyModule); // 加载模块

    const { LazyService } = await import('./lazy.service'); // 动态导入提供者
    const lazyService = moduleRef.get(LazyService); // 从模块引用中获取服务实例
    return lazyService.doSomething();
  }
}
```

**实现懒加载的步骤：**

1. **注入 `LazyModuleLoader`** 在你的服务（Service）或控制器（Controller）的构造函数中注入 `LazyModuleLoader`。
2. **动态导入模块** 使用 JavaScript 的动态 `import()`语法来导入目标模块。**重要**：为确保兼容性（尤其是使用 Webpack 时），建议在 `tsconfig.json`中设置 `"module": "esnext"`和 `"moduleResolution": "node"`。
3. **加载模块并获取提供者** 调用 `this.lazyModuleLoader.load(() => LazyModule)`来加载模块。该方法返回一个**模块引用（Module Reference）**，然后你可以通过 `moduleRef.get(Provider)`方法获取模块内注册的任意提供者（如 Service）的实例。



## 重要限制与注意事项

实现懒加载时，务必了解以下关键限制：

| 特性                      | 是否支持懒加载？ | 说明                                            |
| ------------------------- | ---------------- | ----------------------------------------------- |
| **Providers, Services**   | ✅ **支持**       | 这是懒加载最主要的应用场景。                    |
| **Controllers** (HTTP)    | ❌ **不支持**     | 应用启动后无法再注册新的路由。                  |
| **GraphQL Resolvers**     | ❌ **不支持**     | 模式生成需要所有解析器预先加载。                |
| **Microservice Gateways** | ❌ **不支持**     | 消息订阅需要在连接建立前完成。                  |
| **全局模块**              | ❌ **避免**       | 懒加载模块不应注册为全局模块。                  |
| **生命周期钩子**          | ❌ **不触发**     | 懒加载模块中的 `onModuleInit`等钩子不会被调用。 |

此外，注意 `LazyModuleLoader`在**非严格模式（strict: false）** 下的行为：它可能会在整个应用范围内查找提供者，导致同名提供者被意外覆盖。建议为不同模块的提供者使用唯一的 Token，或保持严格模式启用。

## 适用场景与最佳实践

### **典型应用场景** 

- **无服务器函数（Serverless Lambdas）**：为减少冷启动时间，只加载处理当前请求所必需的模块。 
- **工作者（Workers）或 CRON 作业**：根据任务类型或输入参数，动态加载不同的业务逻辑模块。 
- **Webhooks**：根据事件类型懒加载相应的处理模块。

### **性能优化组合拳** 

懒加载常与其他优化技术结合使用： 

- **使用 Fastify 适配器**：替代默认的 Express 适配器，可获得更佳的基础性能。 
- **代码打包（Bundling）**：使用 Webpack 等工具将代码打包成单个文件，减少文件 I/O 开销。
-  **避免同步耗时操作**：在构造函数或模块初始化阶段避免执行繁重的同步任务。