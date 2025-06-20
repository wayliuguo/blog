import engineer from "./config/engineer"
import nav from "./config/nav"
import vue from "./config/vue"
import react from "./config/react"
import visualization from "./config/visualization"
import article from "./config/article"
import interview from "./config/interview"
import alg from "./config/alg"
import node from './config/node'

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
            '/node/': node,
            '/visualization/': visualization,
            '/article/': article,
            '/interview': interview,
            '/alg': alg
        }
    }
}
