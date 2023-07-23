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
        footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © 202-present WELL'
        },
        nav: [
            { text: '指南', link: '/guide/quickStart', activeMatch: '/guide/' },
            {
                text: '文档',
                link: '/article/projectConfig',
                activeMatch: '/article/'
            }
        ],
        sidebar: {
            '/guide/': [
                {
                    text: '指南',
                    items: [{ text: '快速开始', link: '/guide/quickStart' }]
                }
            ],
            '/article/': [
                {
                    text: '文档',
                    items: [{ text: '项目配置', link: '/article/projectConfig' }]
                }
            ]
        }
    }
}
