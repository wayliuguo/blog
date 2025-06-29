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
        },
        // 添加 outline 配置以显示三级标题
        outline: {
            // level: [2, 3], // 显示 h2 和 h3 标题
            // 或者使用 'deep' 显示所有深度的标题
            level: 'deep', // 显示所有深度的标题
            label: '目录' // 可选：修改右侧大纲的标题文本
        }
    }
}
