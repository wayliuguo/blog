import engineer from "./config/engineer"
import nav from "./config/nav"
import vue from "./config/vue"
import react from "./config/react"
import visualization from "./config/visualization"
import article from "./config/article"
import interview from "./config/interview"
import alg from "./config/alg"

module.exports = {
    title: "well's blog",
    description: "well's blog",
    base: '/blog/',
    themeConfig: {
        lastUpdated: '最后更新时间',
        docsDir: 'docs',
        editLinks: true,
        editLinkText: '编辑此网站',
        repo: 'https://gitee.com/wayliuhaha/blog',
        nav: nav,
        sidebar: {
            '/vue/': vue,
            '/react/': react,
            '/engineer/': engineer,
            '/node/': [
                {
                    text: 'node 基础',
                    link: '/node/nodeBasic'
                },
                {
                    text: 'mongoDB',
                    link: '/node/mongoDB'
                },
                {
                    text: 'express',
                    link: '/node/express'
                },
                {
                    text: 'koa',
                    link: '/node/koa'
                },
                {
                    text: '脚手架实现原理',
                    link: '/node/cliTheory'
                },
                {
                    text: '脚手架基础',
                    link: '/node/cliBasic'
                },
                {
                    text: 'yargs 框架',
                    link: '/node/yargs'
                },
                {
                    text: 'command 框架',
                    link: '/node/command'
                },
                {
                    text: 'Nest 框架',
                    items: [
                        {
                            text: '快速掌握NestCLI',
                            link: '/node/nest/nestCLI'
                        }
                    ]
                }
            ],
            '/visualization/': visualization,
            '/article/': article,
            '/interview': interview,
            '/alg': alg
        }
    }
}
