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
            {
                text: '指南',
                link: '/guide/quickStart',
                activeMatch: '/guide/'
            },
            {
                text: '文档',
                link: '/article/project/normalizeConfig',
                activeMatch: '/article/'
            },
            {
                text: '面试',
                link: '/interview/css',
                activeMatch: '/interview/'
            },
            {
                text: '算法',
                link: '/alg/array',
                activeMatch: '/alg/'
            }
        ],
        sidebar: {
            '/guide/': [
                {
                    text: '指南',
                    items: [
                        {
                            text: '快速开始',
                            link: '/guide/quickStart'
                        }
                    ]
                }
            ],
            '/article/': [
                {
                    text: '文档',
                    items: [
                        {
                            text: '项目工程化',
                            items: [
                                {
                                    text: '规范化配置',
                                    link: '/article/project/normalizeConfig'
                                },
                                {
                                    text: '打包工具-webpack',
                                    link: '/article/project/webpackConfig'
                                },
                                {
                                    text: 'rollup&webpack',
                                    link: '/article/project/rollup&vite'
                                }
                            ]
                        }
                    ]
                }
            ],
            '/interview': [
                {
                    text: '面试',
                    items: [
                        {
                            text: 'css',
                            link: '/interview/css'
                        },
                        {
                            text: 'html',
                            link: '/interview/html'
                        },
                        {
                            text: 'javascript',
                            link: '/interview/javascript'
                        },
                        {
                            text: 'typescript',
                            link: '/interview/typescript'
                        }
                    ]
                }
            ],
            '/alg': [
                {
                    text: '算法',
                    items: [
                        {
                            text: '数组',
                            link: '/alg/array'
                        },
                        {
                            text: '排序算法',
                            link: '/alg/sorting'
                        }
                    ]
                }
            ]
        }
    }
}
