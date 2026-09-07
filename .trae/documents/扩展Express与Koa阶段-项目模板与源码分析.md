# 扩展 Express 与 Koa 阶段：项目模板 + 源码分析

## Context

当前第三阶段 "Express 与 Koa" 只有两个入门文件（快速入门），缺乏项目配置模板和源码分析内容。用户希望补充：
1. **基础项目配置模板** — 标准化的项目结构、配置、错误处理、路由分层
2. **源码分析（最小实现）** — 用最简代码实现 Express/Koa 核心机制，帮助理解框架原理

## 计划

### 新增文件（2个）

**1. `03-Express 项目模板与源码分析.md`**
- 上半部分：Express 项目模板
  - 目录结构（routes/、middleware/、config/、app.js）
  - 中间件组合（cors、logger、error handler、JSON body parser）
  - 路由分层（users、products 模块示例）
  - 统一错误处理
  - 配置管理（环境变量 + config 模块）
- 下半部分：源码分析 - 最小实现
  - 路由注册与匹配（methods + URL pattern）
  - 中间件链（线性 next() 执行）
  - res.json / res.send / res.status 实现
  - 完整最小实现代码（约 80 行）
- 对比：最小实现 vs 生产级 Express

**2. `04-Koa 项目模板与源码分析.md`**
- 上半部分：Koa 项目模板
  - 目录结构
  - 常用中间件组合（@koa/router、koa-body、koa-static、koa-cors）
  - 路由分层 + 错误处理
  - 洋葱模型下的请求前后处理（日志耗时、事务）
- 下半部分：源码分析 - 最小实现
  - 洋葱模型中间件链（compose 函数）
  - ctx 封装（request/response 委托）
  - 异步中间件组合
  - 完整最小实现代码（约 80 行）
- 对比：最小实现 vs 生产级 Koa

### 修改文件

**3. 侧边栏配置** `.vitepress/config/node.js`
- 第三阶段 items 末尾添加 2 个新文件

**4. 学习路径索引** `node/index.md`
- 第三阶段表格末尾添加 2 行

**5. 学习路径图** `node/90-附录/02-学习路径图.md`
- 第 2 周学习内容表格新增 2 个文件

**6. 链接修复**
- `02-Koa 快速入门.md` 的下一篇链接改为 `./03-Express 项目模板与源码分析`
- `03-Express 项目模板与源码分析.md` 的下一篇链接为 `./04-Koa 项目模板与源码分析`
- `04-Koa 项目模板与源码分析.md` 的下一篇链接为 `../04-数据库/01-MySQL 基础`

### 验证

- 运行 `npx vitepress build .` 确认构建无错误
- 检查所有链接跳转正确