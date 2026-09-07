export default [
    {
        text: '学习路径',
        link: '/node/index'
    },
    {
        text: '第一阶段：认识后端',
        collapsed: false,
        items: [
            { text: '01-后端在做什么', link: '/node/01-认识后端/01-后端在做什么' },
            { text: '02-Node.js 是什么', link: '/node/01-认识后端/02-Node.js 是什么' }
        ]
    },
    {
        text: '第二阶段：Node.js 基础',
        collapsed: false,
        items: [
            { text: '01-模块系统与包管理', link: '/node/02-Node.js 基础/01-模块系统与包管理' },
            { text: '02-异步编程入门', link: '/node/02-Node.js 基础/02-异步编程入门' },
            { text: '03-事件循环与错误处理', link: '/node/02-Node.js 基础/03-事件循环与错误处理' },
            { text: '04-内置模块与文件操作', link: '/node/02-Node.js 基础/04-内置模块与文件操作' },
            { text: '05-进程与环境', link: '/node/02-Node.js 基础/05-进程与环境' }
        ]
    },
    {
        text: '第三阶段：Express 与 Koa',
        collapsed: false,
        items: [
            { text: '01-Express 快速入门', link: '/node/03-Express 与 Koa/01-Express 快速入门' },
            { text: '02-Koa 快速入门', link: '/node/03-Express 与 Koa/02-Koa 快速入门' },
            { text: '03-Express 项目模板', link: '/node/03-Express 与 Koa/03-Express 项目模板' },
            { text: '04-Express 源码分析', link: '/node/03-Express 与 Koa/04-Express 源码分析' },
            { text: '05-Koa 项目模板', link: '/node/03-Express 与 Koa/05-Koa 项目模板' },
            { text: '06-Koa 源码分析', link: '/node/03-Express 与 Koa/06-Koa 源码分析' }
        ]
    },
    {
        text: '第四阶段：数据库',
        collapsed: false,
        items: [
            { text: '01-MySQL 基础', link: '/node/04-数据库/01-MySQL 基础' },
            { text: '02-MySQL 进阶', link: '/node/04-数据库/02-MySQL 进阶' },
            { text: '03-Node.js 操作 MySQL', link: '/node/04-数据库/03-Node.js 操作 MySQL' },
            { text: '04-MongoDB 入门', link: '/node/04-数据库/04-MongoDB 入门' },
            { text: '05-MongoDB 进阶', link: '/node/04-数据库/05-MongoDB 进阶' }
        ]
    },
    {
        text: '第五阶段：Redis',
        collapsed: false,
        items: [
            { text: '01-Redis 基础与数据类型', link: '/node/05-Redis/01-Redis 基础与数据类型' },
            { text: '02-Redis 持久化与淘汰策略', link: '/node/05-Redis/02-Redis 持久化与淘汰策略' },
            { text: '03-Node.js 操作 Redis', link: '/node/05-Redis/03-Node.js 操作 Redis' },
            { text: '04-Redis 缓存实战', link: '/node/05-Redis/04-Redis 缓存实战' },
            { text: '05-Redis 进阶', link: '/node/05-Redis/05-Redis 进阶' }
        ]
    },
    {
        text: '第六阶段：NestJS 入门',
        collapsed: false,
        items: [
            { text: '01-快速上手', link: '/node/06-NestJS 入门/01-快速上手' },
            { text: '02-IOC 与依赖注入', link: '/node/06-NestJS 入门/02-IOC 与依赖注入' },
            { text: '03-模块与提供器', link: '/node/06-NestJS 入门/03-模块与提供器' },
            { text: '04-控制器与路由', link: '/node/06-NestJS 入门/04-控制器与路由' },
            { text: '05-请求处理链', link: '/node/06-NestJS 入门/05-请求处理链' },
            { text: '06-数据库集成', link: '/node/06-NestJS 入门/06-数据库集成' }
        ]
    },
    {
        text: '第七阶段：NestJS 进阶',
        collapsed: true,
        items: [
            { text: '01-管道与校验', link: '/node/07-NestJS 进阶/01-管道与校验' },
            { text: '02-拦截器与过滤器', link: '/node/07-NestJS 进阶/02-拦截器与过滤器' },
            { text: '03-自定义装饰器', link: '/node/07-NestJS 进阶/03-自定义装饰器' },
            { text: '04-作用域与循环依赖', link: '/node/07-NestJS 进阶/04-作用域与循环依赖' },
            { text: '05-登录注册实战', link: '/node/07-NestJS 进阶/05-登录注册实战' }
        ]
    },
    {
        text: '第八阶段：部署与工程化',
        collapsed: true,
        items: [
            { text: '01-Docker 部署', link: '/node/08-部署与工程化/01-Docker 部署' },
            { text: '02-PM2 进程管理', link: '/node/08-部署与工程化/02-PM2 进程管理' },
            { text: '03-环境管理与日志', link: '/node/08-部署与工程化/03-环境管理与日志' }
        ]
    },
    {
        text: '第九阶段：脚手架开发',
        collapsed: true,
        items: [{ text: '01-脚手架开发入门', link: '/node/09-脚手架开发/01-脚手架开发入门' }]
    },
    {
        text: '第十阶段：进阶主题',
        collapsed: true,
        items: [
            { text: '01-消息队列', link: '/node/10-进阶主题/01-消息队列' },
            { text: '02-性能优化', link: '/node/10-进阶主题/02-性能优化' },
            { text: '03-安全', link: '/node/10-进阶主题/03-安全' },
            { text: '04-测试', link: '/node/10-进阶主题/04-测试' },
            { text: '05-设计模式', link: '/node/10-进阶主题/05-设计模式' },
            { text: '06-系统设计', link: '/node/10-进阶主题/06-系统设计' },
            { text: '07-Git 与协作', link: '/node/10-进阶主题/07-Git 与协作' }
        ]
    },
    {
        text: '附录',
        collapsed: true,
        items: [
            { text: '01-面试自测题（纯题目）', link: '/node/90-附录/01-面试自测题' },
            { text: '02-学习路径图', link: '/node/90-附录/02-学习路径图' },
            { text: '03-答案-初级篇', link: '/node/90-附录/03-答案-初级' },
            { text: '04-答案-中级篇', link: '/node/90-附录/04-答案-中级' },
            { text: '05-答案-高级篇', link: '/node/90-附录/05-答案-高级' },
            { text: '06-场景设计题', link: '/node/90-附录/06-场景设计题' },
            { text: '07-面试方法论', link: '/node/90-附录/07-面试方法论' },
            { text: '08-自测记录表', link: '/node/90-附录/08-自测记录表' }
        ]
    }
]
