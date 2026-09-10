/**
 * 为 node/ 下文档注入「配套代码」区块
 *
 * 逻辑：
 *  1. 按 MAP 找到文档 → 示例代码的映射
 *  2. 若文档已有 `## 配套代码` 则跳过
 *  3. 在 `## 参考` 之前插入区块
 *
 * 用法：node inject-code-refs.cjs [--apply]
 */
const fs = require('fs')
const path = require('path')

const ROOT = process.cwd()
const APPLY = process.argv.includes('--apply')
const DOC_ROOT = path.join(ROOT, 'node')

// key: 相对 node/ 的文档路径；items: [相对 code/node 的路径, 说明]
const MAP = {
    '01-认识后端/02-Node.js 是什么.md': {
        items: [['node-basics', '12 个实验脚本，亲手验证 Node.js 的执行模型']],
        note: '本篇是概念篇，没有专属代码。想验证结论，可直接跑上面这套实验。'
    },

    '02-Node.js 基础/01-模块系统与包管理.md': {
        items: [
            ['node-basics/src/01-module-cjs.cjs', 'CommonJS 的 require / module.exports'],
            ['node-basics/src/01-module-esm.mjs', 'ESM 的 import / export 与顶层 await']
        ]
    },
    '02-Node.js 基础/02-异步编程入门.md': {
        items: [
            ['node-basics/src/02-async-serial.js', '串行 await 的耗时叠加'],
            ['node-basics/src/03-async-parallel.js', 'Promise.all 并发后的耗时对比']
        ]
    },
    '02-Node.js 基础/03-事件循环与错误处理.md': {
        items: [
            ['node-basics/src/04-eventloop-order.js', '同步 / nextTick / Promise / timer 的输出顺序'],
            ['node-basics/src/05-microtask-checkpoint.js', '微任务检查点到底什么时候被处理'],
            ['node-basics/src/06-nexttick-starve.js', 'nextTick 递归饿死事件循环']
        ]
    },
    '02-Node.js 基础/04-内置模块与文件操作.md': {
        items: [
            ['node-basics/src/07-buffer.js', 'Buffer 的字节长度与字符长度差异'],
            ['node-basics/src/08-stream-copy.js', 'readFile 与 pipe 复制大文件的差异'],
            ['node-basics/src/09-backpressure.js', '慢速消费触发背压与 drain']
        ]
    },
    '02-Node.js 基础/05-进程与环境.md': {
        items: [
            ['node-basics/src/10-child-process.js', 'spawn / exec / execFile / fork 四者对照'],
            ['node-basics/src/11-worker-thread.js', 'Worker 让 CPU 密集任务不阻塞主线程'],
            ['node-basics/src/12-graceful-shutdown.js', 'SIGTERM 下的优雅关闭']
        ]
    },

    '03-网络编程与实时通信/00-导读-网络层为什么在这里.md': {
        items: [['net-lab', '9 个脚本，从裸 TCP 到 SSE / WebSocket']],
        note: '这一层的概念最适合亲手复现，建议边读边跑。'
    },
    '03-网络编程与实时通信/01-TCP 与 Socket 编程.md': {
        items: [
            ['net-lab/src/01-tcp-server.js', 'net.createServer 与连接、数据事件'],
            ['net-lab/src/02-tcp-client.js', '客户端写入与字节流视角'],
            ['net-lab/src/03-sticky-packet.js', '粘包复现实验'],
            ['net-lab/src/04-protocol-server.js', 'Length(4B) + Body 分包协议服务端'],
            ['net-lab/src/04-protocol-client.js', '自定义协议客户端']
        ]
    },
    '03-网络编程与实时通信/02-HTTP 与 HTTPS 深入.md': {
        items: [
            ['net-lab/src/05-http-server.js', 'node:http 手写最小 Server'],
            ['net-lab/src/06-keepalive.js', 'Keep-Alive 连接复用观测']
        ]
    },
    '03-网络编程与实时通信/03-WebSocket 与 SSE 实时通信.md': {
        items: [
            ['net-lab/src/07-sse.js', 'SSE 服务端推送与流式读取'],
            ['net-lab/src/08-websocket.js', 'WebSocket 与 Ping/Pong 心跳']
        ]
    },

    '04-Express 与 Koa/01-Express 快速入门.md': {
        items: [
            ['express-template', '可直接跑的 Express 项目模板'],
            ['express-template/src/app.js', '中间件与路由的装配方式']
        ]
    },
    '04-Express 与 Koa/02-Koa 快速入门.md': {
        items: [
            ['koa-template', '可直接跑的 Koa 项目模板'],
            ['koa-template/src/middleware/responseTime.js', '洋葱模型中间件']
        ]
    },
    '04-Express 与 Koa/03-Express 项目模板.md': {
        items: [
            ['express-template/src/app.js', '应用入口与中间件注册'],
            ['express-template/src/routes/users.js', '路由分层'],
            ['express-template/src/middleware/auth.js', '鉴权中间件'],
            ['express-template/src/services/userService.js', '服务层与数据访问分离'],
            ['express-template/src/config/database.js', '数据库连接配置']
        ]
    },
    '04-Express 与 Koa/04-Express 源码分析.md': {
        items: [['express-mini/index.js', '200 行还原 Express 核心（中间件链、路由匹配、res 封装）']],
        note: '建议对照本篇的讲解顺序读源码，先看 `app.use`，再看 `next` 递归。'
    },
    '04-Express 与 Koa/05-Koa 项目模板.md': {
        items: [
            ['koa-template/src/app.js', '应用装配与中间件顺序'],
            ['koa-template/src/routes/users.js', '路由定义'],
            ['koa-template/src/utils/redis.js', 'Redis 封装'],
            ['koa-template/src/middleware/errorHandler.js', '统一错误处理']
        ]
    },
    '04-Express 与 Koa/06-Koa 源码分析.md': {
        items: [['koa-mini/index.js', '180 行还原 Koa 洋葱模型（compose / dispatch / ctx）']]
    },

    '05-数据库/01-MySQL 基础.md': {
        items: [
            ['mysql-demo/sql/01-schema.sql', '建库建表与索引设计'],
            ['mysql-demo/src/01-crud.js', 'CRUD 与 affectedRows']
        ]
    },
    '05-数据库/02-MySQL 进阶.md': {
        items: [
            ['mysql-demo/src/03-index.js', '无索引 vs 有索引的耗时对比（10 万行）'],
            ['mysql-demo/src/04-explain.js', 'EXPLAIN 六列读法'],
            ['mysql-demo/sql/03-explain-cases.sql', '10 条典型 SQL 的索引验证清单']
        ]
    },
    '05-数据库/03-MySQL 高级实战.md': {
        items: [
            ['mysql-demo/src/05-transaction.js', '事务的提交与回滚'],
            ['mysql-demo/src/06-oversell.js', '防超卖：先查后改 vs 条件更新'],
            ['mysql-demo/src/07-lock.js', '乐观锁与悲观锁']
        ]
    },
    '05-数据库/04-Node.js 操作 MySQL.md': {
        items: [
            ['mysql-demo/src/db.js', 'mysql2 连接池封装'],
            ['mysql-demo/src/01-crud.js', '参数化查询'],
            ['mysql-demo/src/02-join.js', 'INNER / LEFT JOIN']
        ]
    },

    '06-Redis/01-Redis 基础与数据类型.md': {
        items: [['redis-demo/src/01-data-types.js', '五种数据类型的后端用例']]
    },
    '06-Redis/02-Redis 持久化与淘汰策略.md': {
        items: [['redis-demo/src/02-expire.js', 'TTL、过期行为观察与淘汰策略']]
    },
    '06-Redis/03-Node.js 操作 Redis.md': {
        items: [
            ['redis-demo/src/client.js', 'ioredis 连接封装'],
            ['redis-demo/src/03-cache.js', 'Cache-Aside 读写与命中率']
        ]
    },
    '06-Redis/04-Redis 缓存实战.md': {
        items: [['redis-demo/src/03-cache.js', '穿透 / 击穿 / 雪崩三种防护']]
    },
    '06-Redis/05-Redis 进阶.md': {
        items: [
            ['redis-demo/src/04-lock.js', '分布式锁与 Lua 安全释放'],
            ['redis-demo/src/05-rate-limit.js', '固定窗口 / 滑动窗口 / 令牌桶'],
            ['redis-demo/src/06-rank.js', 'ZSet 排行榜'],
            ['redis-demo/src/07-pubsub.js', 'Pub/Sub 发布订阅']
        ]
    },

    '07-NestJS 入门/00-NestJS 学习地图与边界.md': {
        items: [
            ['nestjs-mini', '600 行还原 NestJS 五大机制，用来理解"框架做了什么"'],
            ['nestjs-template', '真实项目模板，用来对照"生产里长什么样"']
        ]
    },
    '07-NestJS 入门/01-快速上手.md': {
        items: [
            ['nestjs-template', '可直接跑的完整项目'],
            ['nestjs-template/src/main.ts', '应用入口与全局装配']
        ]
    },
    '07-NestJS 入门/02-IOC 与依赖注入.md': {
        items: [
            ['nestjs-mini/index.ts', 'DI 容器的最小实现'],
            ['nestjs-template/src/app.module.ts', '真实模块装配']
        ]
    },
    '07-NestJS 入门/03-模块与提供器.md': {
        items: [
            ['nestjs-mini/index.ts', 'Container 与模块递归收集'],
            ['nestjs-template/src/modules/users/users.module.ts', '业务模块定义'],
            ['nestjs-template/src/shared/redis/redis.module.ts', '共享模块的导出与复用']
        ]
    },
    '07-NestJS 入门/04-控制器与路由.md': {
        items: [
            ['nestjs-template/src/modules/auth/auth.controller.ts', '控制器与参数装饰器'],
            ['nestjs-template/src/modules/health/health.controller.ts', '最简控制器']
        ]
    },
    '07-NestJS 入门/05-请求处理链.md': {
        items: [
            ['nestjs-template/src/modules/auth/guards/jwt-auth.guard.ts', '守卫：能不能进'],
            ['nestjs-template/src/common/interceptors/transform.interceptor.ts', '拦截器：包裹执行'],
            ['nestjs-template/src/common/filters/all-exceptions.filter.ts', '过滤器：处理异常'],
            ['nestjs-template/src/common/dto/api-response.dto.ts', '统一响应结构']
        ]
    },
    '07-NestJS 入门/06-数据库集成.md': {
        items: [
            ['nestjs-template/src/config/database.config.ts', 'TypeORM 连接配置'],
            ['nestjs-template/src/config/configuration.ts', '配置装载与校验'],
            ['nestjs-template/src/modules/users/user.entity.ts', '实体定义']
        ]
    },

    '08-NestJS 进阶/01-自定义装饰器.md': {
        items: [
            ['nestjs-mini/index.ts', '装饰器与元数据的最小实现'],
            ['nestjs-template/src/modules/auth/decorators/public.decorator.ts', '自定义装饰器实战']
        ]
    },
    '08-NestJS 进阶/02-作用域与循环依赖.md': {
        items: [['nestjs-mini/index.ts', '容器构造与依赖解析过程']]
    },
    '08-NestJS 进阶/03-登录注册实战.md': {
        items: [
            ['nestjs-template/src/modules/auth/auth.service.ts', '注册、登录与令牌签发'],
            ['nestjs-template/src/modules/auth/auth.controller.ts', '认证接口'],
            ['nestjs-template/src/modules/auth/dto/login.dto.ts', '入参校验'],
            ['nestjs-template/src/modules/auth/strategies/jwt.strategy.ts', 'JWT 校验策略']
        ]
    },
    '08-NestJS 进阶/05-WebSocket 实时通信.md': {
        items: [['net-lab/src/08-websocket.js', '原生 WebSocket 与心跳（对照 NestJS Gateway）']]
    },
    '08-NestJS 进阶/07-微服务架构.md': {
        items: [['microservice-demo', '微服务通信示例']]
    },
    '08-NestJS 进阶/09-NestJS 源码分析.md': {
        items: [
            ['nestjs-mini/index.ts', '593 行完整最小实现'],
            ['nestjs-mini/README.md', '与真实 NestJS 的能力差异对照']
        ]
    },
    '08-NestJS 进阶/10-NestJS 项目模板.md': {
        items: [
            ['nestjs-template', '完整项目模板'],
            ['nestjs-template/src/app.module.ts', '根模块装配']
        ]
    },
    '08-NestJS 进阶/11-认证进阶-双Token与多设备会话.md': {
        items: [
            ['nestjs-template/src/modules/auth/auth.service.ts', '认证服务（对照本篇的 Prisma 写法）'],
            ['nestjs-template/src/shared/redis/redis.service.ts', '用 Redis 承载会话与吊销']
        ]
    },
    '08-NestJS 进阶/12-IoC 与依赖注入原理.md': {
        items: [
            ['nestjs-mini/index.ts', 'Container 的 collectProviders / resolve 实现'],
            ['nestjs-template/src/app.module.ts', '真实项目里的模块图']
        ]
    },

    '09-部署与工程化/01-环境管理与配置.md': {
        items: [
            ['nestjs-template/src/config/configuration.ts', '配置装载与 Joi 校验'],
            ['nestjs-template/README.md', '环境变量清单与启动步骤']
        ]
    }
}

function buildBlock(items, note) {
    const project = items[0][0].split('/')[0]
    const lines = []
    lines.push('## 配套代码')
    lines.push('')
    lines.push(`本篇的可运行示例在仓库 [\`code/node/${project}\`](../../code/node/${project})。`)
    lines.push('')
    lines.push('| 文件 | 演示什么 |')
    lines.push('| --- | --- |')
    for (const [rel, desc] of items) {
        const name = rel.split('/').pop()
        lines.push(`| [\`${name}\`](../../code/node/${rel}) | ${desc} |`)
    }
    lines.push('')
    if (note) {
        lines.push(note)
        lines.push('')
    }
    const dirItems = items.filter(([rel]) => !rel.includes('/'))
    if (dirItems.length) {
        lines.push(`完整目录与运行方式见 [\`${project}/README.md\`](../../code/node/${project}/README.md)。`)
    } else {
        lines.push(`运行方式见 [\`${project}/README.md\`](../../code/node/${project}/README.md)。`)
    }
    lines.push('')
    lines.push('---')
    lines.push('')
    return lines.join('\n')
}

let injected = 0
let skipped = []
let missing = []

for (const [docRel, cfg] of Object.entries(MAP)) {
    const docPath = path.join(DOC_ROOT, docRel)
    if (!fs.existsSync(docPath)) {
        missing.push(docRel)
        continue
    }
    let text = fs.readFileSync(docPath, 'utf8')
    if (/^## 配套代码\s*$/m.test(text)) {
        skipped.push(docRel)
        continue
    }
    const block = buildBlock(cfg.items, cfg.note)
    const m = text.match(/^## 参考\s*$/m)
    if (m) {
        const at = m.index
        text = text.slice(0, at) + block + text.slice(at)
    } else {
        text = text.replace(/\s*$/, '') + '\n\n' + block
    }
    if (APPLY) fs.writeFileSync(docPath, text, 'utf8')
    injected++
    console.log((APPLY ? '注入 ' : '[试运行] 将注入 ') + docRel + '  ← ' + cfg.items.length + ' 项')
}

console.log('')
console.log(
    '总计：' +
        injected +
        ' 篇' +
        (APPLY ? ' 已写入' : '（试运行）') +
        '，跳过 ' +
        skipped.length +
        ' 篇，文档缺失 ' +
        missing.length +
        ' 篇'
)
if (missing.length) console.log('缺失文档：', missing.join(', '))
if (skipped.length) console.log('已存在跳过：', skipped.join(', '))
