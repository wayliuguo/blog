## 常用命令总结

### 项目初始化与管理

| 命令                      | 作用                     | 示例                   |
| ------------------------- | ------------------------ | ---------------------- |
| `nest new <project-name>` | 创建新的 Nest 项目       | `nest new my-nest-app` |
| `cd <project-name>`       | 进入项目目录             | `cd my-nest-app`       |
| `npm run start:dev`       | 启动开发服务器（热重载） | -                      |
| `npm run build`           | 构建生产环境代码         | -                      |
| `npm run start:prod`      | 运行生产环境代码         | -                      |

### 生成代码（核心功能）

| `nest g module <module-name>`           | 生成模块       | `nest g module users`                              |
| --------------------------------------- | -------------- | -------------------------------------------------- |
| `nest g controller <controller-name>`   | 生成控制器     | `nest g controller users`                          |
| `nest g service <service-name>`         | 生成服务       | `nest g service users`                             |
| `nest g class <class-name> [options]`   | 生成普通类     | `nest g class users/dto/create-user.dto --no-spec` |
| `nest g filter <filter-name>`           | 生成异常过滤器 | `nest g filter common/filters/http-exception`      |
| `nest g pipe <pipe-name>`               | 生成管道       | `nest g pipe common/pipes/validation`              |
| `nest g guard <guard-name>`             | 生成守卫       | `nest g guard common/guards/auth`                  |
| `nest g interceptor <interceptor-name>` | 生成拦截器     | `nest g interceptor common/interceptors/transform` |

**常用选项：**

- `--no-spec`：不生成 `.spec.ts`测试文件。
- `-p` 或 `--project`：指定项目（在 monorepo 模式下）。

### 运行与调试

| `npm run start`       | 启动应用（不热重载）     | -    |
| --------------------- | ------------------------ | ---- |
| `npm run start:dev`   | 启动开发模式（热重载）   | -    |
| `npm run start:debug` | 启动调试模式             | -    |
| `npm test`            | 运行所有测试             | -    |
| `npm run test:watch`  | 运行测试（监听模式）     | -    |
| `npm run test:cov`    | 运行测试并生成覆盖率报告 | -    |
| `npm run test:e2e`    | 运行端到端测试           | -    |

### 构建与部署

| 命令            | 作用                               | 示例 |
| --------------- | ---------------------------------- | ---- |
| `npm run build` | 构建应用，输出到 `dist` 目录       | -    |
| `nest build`    | 与 `npm run build` 相同            | -    |
| `nest info`     | 显示 Nest 项目信息（版本、依赖等） | -    |

### 其他辅助命令

| 命令                 | 作用               | 示例                       |
| -------------------- | ------------------ | -------------------------- |
| `nest update`        | 更新 Nest 相关依赖 | -                          |
| `nest add <package>` | 添加第三方插件     | `nest add @nestjs/swagger` |

## 文档资料
[CLI 命令行—用法](https://nest.nodejs.cn/cli/usages)
