export default [
    {
        text: '模块一 · 运行环境',
        collapsed: false,
        items: [
            { text: 'Node.js 是什么', link: '/node/01-运行环境/01-Node.js 是什么' },
            { text: '模块系统与包管理', link: '/node/01-运行环境/02-模块系统与包管理' },
            { text: '事件循环：六个阶段与微任务', link: '/node/01-运行环境/03-事件循环：六个阶段与微任务' },
            { text: '异步编程与事件驱动', link: '/node/01-运行环境/04-异步编程与事件驱动' },
            { text: 'Buffer 与 Stream', link: '/node/01-运行环境/05-Buffer 与 Stream' },
            { text: '进程线程与优雅退出', link: '/node/01-运行环境/06-进程线程与优雅退出' },
            { text: '运行机制收束', link: '/node/01-运行环境/07-运行机制收束' },
            { text: '模块总结（运行环境）', link: '/node/01-运行环境/总结' },
            { text: '模块面试题（运行环境）', link: '/node/01-运行环境/面试题' }
        ]
    },
    {
        text: '模块二 · 网络底层',
        collapsed: false,
        items: [
            { text: '导读与全景图', link: '/node/03-网络编程与实时通信/00-导读与全景图' },
            { text: 'TCP 与 Socket 编程', link: '/node/03-网络编程与实时通信/01-TCP 与 Socket 编程' },
            { text: 'HTTP 与 HTTPS 深入', link: '/node/03-网络编程与实时通信/02-HTTP 与 HTTPS 深入' },
            { text: 'WebSocket 与 SSE 实时通信', link: '/node/03-网络编程与实时通信/03-WebSocket 与 SSE 实时通信' },
            { text: '一次请求完整经历了什么', link: '/node/03-网络编程与实时通信/04-一次请求完整经历了什么' },
            { text: '模块总结（网络底层）', link: '/node/03-网络编程与实时通信/总结' },
            { text: '模块面试题（网络底层）', link: '/node/03-网络编程与实时通信/面试题' }
        ]
    },
    {
        text: '模块三 · Web 框架基础',
        collapsed: false,
        items: [
            { text: 'Express 快速入门', link: '/node/04-Express 与 Koa/01-Express 快速入门' },
            { text: 'Koa 快速入门', link: '/node/04-Express 与 Koa/02-Koa 快速入门' },
            { text: 'Express 项目模板', link: '/node/04-Express 与 Koa/03-Express 项目模板' },
            { text: 'Express 源码分析', link: '/node/04-Express 与 Koa/04-Express 源码分析' },
            { text: 'Koa 项目模板', link: '/node/04-Express 与 Koa/05-Koa 项目模板' },
            { text: 'Koa 源码分析', link: '/node/04-Express 与 Koa/06-Koa 源码分析' },
            { text: '模块总结（Web 框架基础）', link: '/node/04-Express 与 Koa/总结' },
            { text: '模块面试题（Web 框架基础）', link: '/node/04-Express 与 Koa/面试题' }
        ]
    },
    {
        text: '模块四 · 数据与缓存',
        collapsed: false,
        items: [
            {
                text: '数据库',
                collapsed: false,
                items: [
                    { text: 'MySQL 基础', link: '/node/05-数据库/01-MySQL 基础' },
                    { text: 'MySQL 进阶', link: '/node/05-数据库/02-MySQL 进阶' },
                    { text: 'MySQL 高级实战', link: '/node/05-数据库/03-MySQL%20高级实战' },
                    { text: 'Node.js 操作 MySQL', link: '/node/05-数据库/04-Node.js 操作 MySQL' },
                    { text: 'MongoDB 入门', link: '/node/05-数据库/05-MongoDB 入门' },
                    { text: 'MongoDB 进阶', link: '/node/05-数据库/06-MongoDB 进阶' },
                    { text: 'PostgreSQL 与 pgvector', link: '/node/05-数据库/07-PostgreSQL 与 pgvector' }
                ]
            },
            {
                text: 'Redis',
                collapsed: false,
                items: [
                    { text: 'Redis 基础与数据类型', link: '/node/06-Redis/01-Redis 基础与数据类型' },
                    { text: 'Redis 持久化与淘汰策略', link: '/node/06-Redis/02-Redis 持久化与淘汰策略' },
                    { text: 'Node.js 操作 Redis', link: '/node/06-Redis/03-Node.js 操作 Redis' },
                    { text: 'Redis 缓存实战', link: '/node/06-Redis/04-Redis 缓存实战' },
                    { text: 'Redis 进阶', link: '/node/06-Redis/05-Redis 进阶' }
                ]
            },
            { text: '模块总结（数据与缓存）', link: '/node/05-数据库/总结' },
            { text: '模块面试题（数据与缓存）', link: '/node/05-数据库/面试题' }
        ]
    },
    {
        text: '模块五 · 后端架构',
        collapsed: false,
        items: [
            {
                text: 'NestJS 入门',
                collapsed: false,
                items: [
                    { text: 'NestJS 学习地图与边界', link: '/node/07-NestJS 入门/00-NestJS 学习地图与边界' },
                    { text: '快速上手', link: '/node/07-NestJS 入门/01-快速上手' },
                    { text: 'IOC 与依赖注入', link: '/node/07-NestJS 入门/02-IOC 与依赖注入' },
                    { text: '模块与提供器', link: '/node/07-NestJS 入门/03-模块与提供器' },
                    { text: '控制器与路由', link: '/node/07-NestJS 入门/04-控制器与路由' },
                    { text: '请求处理链', link: '/node/07-NestJS 入门/05-请求处理链' },
                    { text: '数据库集成', link: '/node/07-NestJS 入门/06-数据库集成' }
                ]
            },
            {
                text: 'NestJS 进阶',
                collapsed: true,
                items: [
                    { text: '自定义装饰器', link: '/node/08-NestJS 进阶/01-自定义装饰器' },
                    { text: '作用域与循环依赖', link: '/node/08-NestJS 进阶/02-作用域与循环依赖' },
                    { text: '登录注册实战', link: '/node/08-NestJS 进阶/03-登录注册实战' },
                    { text: '文件上传实战', link: '/node/08-NestJS 进阶/04-文件上传实战' },
                    { text: 'WebSocket 实时通信', link: '/node/08-NestJS 进阶/05-WebSocket 实时通信' },
                    { text: '定时任务与队列', link: '/node/08-NestJS 进阶/06-定时任务与队列' },
                    { text: '微服务架构', link: '/node/08-NestJS 进阶/07-微服务架构' },
                    { text: '切换Fastify平台', link: '/node/08-NestJS 进阶/08-切换Fastify平台' },
                    { text: 'NestJS 源码分析', link: '/node/08-NestJS 进阶/09-NestJS 源码分析' },
                    { text: 'NestJS 项目模板', link: '/node/08-NestJS 进阶/10-NestJS 项目模板' },
                    {
                        text: '认证进阶-双Token与多设备会话',
                        link: '/node/08-NestJS 进阶/11-认证进阶-双Token与多设备会话'
                    },
                    { text: 'IoC 与依赖注入原理', link: '/node/08-NestJS 进阶/12-IoC 与依赖注入原理' }
                ]
            },
            { text: '模块总结（后端架构）', link: '/node/07-NestJS 入门/总结' },
            { text: '模块面试题（后端架构）', link: '/node/07-NestJS 入门/面试题' }
        ]
    },
    {
        text: '模块六 · 工程化与拓展',
        collapsed: true,
        items: [
            {
                text: '部署与工程化',
                collapsed: true,
                items: [
                    { text: '环境管理与配置', link: '/node/09-部署与工程化/01-环境管理与配置' },
                    { text: '日志体系', link: '/node/09-部署与工程化/02-日志体系' },
                    { text: 'PM2 进程管理', link: '/node/09-部署与工程化/03-PM2 进程管理' },
                    { text: 'Docker 容器化', link: '/node/09-部署与工程化/04-Docker 容器化' },
                    { text: 'Docker Compose 编排', link: '/node/09-部署与工程化/05-Docker Compose 编排' },
                    { text: 'Nginx 反向代理与网关', link: '/node/09-部署与工程化/06-Nginx 反向代理与网关' },
                    { text: '数据库迁移与发布', link: '/node/09-部署与工程化/07-数据库迁移与发布' },
                    { text: '生产部署实战', link: '/node/09-部署与工程化/08-生产部署实战' },
                    { text: 'CI-CD 自动化部署', link: '/node/09-部署与工程化/09-CI-CD 自动化部署' }
                ]
            },
            {
                text: '脚手架开发',
                collapsed: true,
                items: [{ text: '脚手架开发入门', link: '/node/10-脚手架开发/01-脚手架开发入门' }]
            },
            {
                text: '进阶主题',
                collapsed: true,
                items: [
                    { text: '消息队列', link: '/node/11-进阶主题/01-消息队列' },
                    { text: '性能优化', link: '/node/11-进阶主题/02-性能优化' },
                    { text: '安全', link: '/node/11-进阶主题/03-安全' },
                    { text: '测试', link: '/node/11-进阶主题/04-测试' },
                    { text: '设计模式', link: '/node/11-进阶主题/05-设计模式' },
                    { text: '系统设计', link: '/node/11-进阶主题/06-系统设计' },
                    { text: 'Git 与协作', link: '/node/11-进阶主题/07-Git 与协作' }
                ]
            },
            { text: '模块总结（工程化与拓展）', link: '/node/09-部署与工程化/总结' },
            { text: '模块面试题（工程化与拓展）', link: '/node/09-部署与工程化/面试题' }
        ]
    },
    {
        text: '面试方法论',
        collapsed: true,
        items: [{ text: '面试方法论', link: '/node/12-面试方法论/01-面试方法论' }]
    }
]
