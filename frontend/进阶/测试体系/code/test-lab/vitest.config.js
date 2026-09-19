import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        // 默认跑在 node 环境；需要 DOM 的用例在文件首行加 // @vitest-environment jsdom
        environment: 'node',
        // coverage-strict 故意放着失败用例（演示"同样的覆盖率、断言更强就暴露 bug"），不进默认套件
        include: ['src/**/*.test.{js,jsx}', '!src/coverage-strict/**'],
        // 让 JSX 走 automatic runtime，省掉每个文件手写 import React
        esbuild: {
            jsx: 'automatic'
        },
        coverage: {
            provider: 'v8',
            include: ['src/coverage-demo/checkout.js'],
            reporter: ['text'],
            thresholds: {
                lines: 80,
                branches: 70,
                functions: 80,
                statements: 80
            }
        }
    }
})
