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
        nav: [
            {
                text: '文档',
                link: '/article/project/normalizeConfig',
                activeMatch: '/article/'
            },
            {
                text: '工程化',
                link: '/engineer/vscodeDebug',
                activeMatch: '/engineer/'
            },
            {
                text: 'vue',
                link: '/vue/vue3Principle/environment',
                activeMatch: '/vue3Principle/'
            },
            {
                text: '可视化',
                link: '/visualization/basic',
                activeMatch: '/visualization/'
            },
            {
                text: 'node',
                link: '/node/nodeBasic',
                activeMatch: '/node/'
            },
            {
                text: '不止于面试',
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
            '/vue/': [
                {
                    text: 'vue3 原理',
                    items: [
                        {
                            text: '环境搭建',
                            link: '/vue/vue3Principle/environment'
                        },
                        {
                            text: 'reactive依赖收集&触发更新',
                            link: '/vue/vue3Principle/reactive'
                        }
                    ]
                }
            ],
            engineer: [
                {
                    text: 'vscode 调试',
                    link: '/engineer/vscodeDebug'
                }
            ],
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
            '/visualization/': [
                {
                    text: '可视化',
                    items: [
                        {
                            text: '可视化入门',
                            link: '/visualization/basic'
                        },
                        {
                            text: 'canvas 入门',
                            link: '/visualization/canvas'
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
                                    text: 'vsCode配置&Prettier',
                                    link: '/article/project/vsCodeConfigAndPrettier'
                                },
                                {
                                    text: 'husky',
                                    link: '/article/project/huskyUsage'
                                },
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
                                },
                                {
                                    text: '前端模块化规范',
                                    link: '/article/project/moduleStandard'
                                }
                            ]
                        },
                        {
                            text: '轮子原理',
                            items: [
                                {
                                    text: '图片懒加载',
                                    link: '/article/wheel/lazyload'
                                },
                                {
                                    text: '虚拟滚动列表',
                                    link: '/article/wheel/scrollList'
                                }
                            ]
                        },
                        {
                            text: 'vue3 通用组件',
                            items: [
                                {
                                    text: 'Monorepo',
                                    link: '/article/vueComponent/monorepo'
                                },
                                {
                                    text: 'ts 类型约束',
                                    link: '/article/vueComponent/usets '
                                },
                                {
                                    text: 'BEM 规范',
                                    link: '/article/vueComponent/bem'
                                }
                            ]
                        },
                        {
                            text: 'React',
                            items: [
                                {
                                    text: 'react 基础',
                                    link: '/article/react/reactBasic'
                                },
                                {
                                    text: 'react hooks',
                                    link: '/article/react/reactHooks'
                                },
                                {
                                    text: 'react 使用ts指南',
                                    link: '/article/react/reactUseTs'
                                },
                                {
                                    text: 'react 使用css',
                                    link: '/article/react/reactUseCss'
                                },
                                {
                                    text: 'reactRouter',
                                    link: '/article/react/reactRouter'
                                },
                                {
                                    text: 'react 状态管理',
                                    link: '/article/react/reactStateMan'
                                }
                            ]
                        },
                        {
                            text: '常见需求处理',
                            items: [
                                {
                                    text: '二进制',
                                    link: '/article/requirement/binary'
                                },
                                {
                                    text: '文件上传',
                                    link: '/article/requirement/upload'
                                }
                            ]
                        },
                        {
                            text: '沉淀',
                            items: [
                                {
                                    text: 'EventBus 手写',
                                    link: '/article/precipitation/eventbus'
                                }
                            ]
                        },
                        {
                            text: 'vue3',
                            items: [
                                {
                                    text: '手写vue3核心原理',
                                    link: '/article/vue3/vue3stage'
                                },
                                {
                                    text: 'vueUse 源码解析',
                                    link: '/article/vue3/vueuse'
                                }
                            ]
                        },
                        {
                            text: '经验总结',
                            items: [
                                {
                                    text: '职业发展',
                                    link: '/article/method/careeDevelopment'
                                }
                            ]
                        }
                    ]
                }
            ],
            '/interview': [
                {
                    text: '不止于面试',
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
                        },
                        {
                            text: 'vue',
                            link: '/interview/vue'
                        },
                        {
                            text: '代码输出',
                            link: '/interview/codeconsole'
                        },
                        {
                            text: '手写代码',
                            link: '/interview/writecode'
                        },
                        {
                            text: '浏览器原理',
                            link: '/interview/browser'
                        },
                        {
                            text: '计算机网络',
                            link: '/interview/network'
                        },
                        {
                            text: '计算机网络（面试）',
                            link: '/interview/networkinterview'
                        },
                        {
                            text: '微信小程序',
                            link: '/interview/miniwechat'
                        },
                        {
                            text: '性能优化',
                            link: '/interview/performance'
                        },
                        {
                            text: '监控平台',
                            link: '/interview/monitor'
                        },
                        {
                            text: '难点亮点',
                            link: '/interview/lightspot'
                        },
                        {
                            text: '软技能',
                            link: '/interview/softskill'
                        },
                        {
                            text: '面经',
                            link: '/interview/experience'
                        }
                    ]
                }
            ],
            '/alg': [
                {
                    text: '算法',
                    items: [
                        {
                            text: '数组/字符串',
                            link: '/alg/array'
                        },
                        {
                            text: '滑动窗口',
                            link: '/alg/slidewindow'
                        },
                        {
                            text: '哈希表',
                            link: '/alg/hash'
                        },
                        {
                            text: '双指针',
                            link: '/alg/dobulePointer'
                        },
                        {
                            text: '栈',
                            link: '/alg/stack'
                        },
                        {
                            text: '区间',
                            link: '/alg/range'
                        },
                        {
                            text: '链表',
                            link: '/alg/linkedList'
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
