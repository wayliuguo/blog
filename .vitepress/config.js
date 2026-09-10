import frontend from './config/frontend'
import nav from './config/nav'
import interview from './config/interview'
import alg from './config/alg'
import node from './config/node'
import ai from './config/ai'

module.exports = {
    title: "well's blog",
    description: "well's blog",
    base: '/blog/',
    // code/ 下是配套示例代码，不是站点页面，排除出页面集合
    srcExclude: ['**/node_modules/**', '**/dist/**', 'code/**'],
    themeConfig: {
        lastUpdated: '最后更新时间',
        docsDir: 'docs',
        editLinks: true,
        editLinkText: '编辑此网站',
        repo: 'https://gitee.com/wayliuhaha/blog',
        nav: nav,
        sidebar: {
            '/frontend/': frontend,
            '/node/': node,
            '/interview': interview,
            '/alg': alg,
            '/ai': ai
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
