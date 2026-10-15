import { defineConfig } from 'vitest/config'

// 单独一份配置：跑"断言更强"的那套用例，用来对比同一份被测代码的覆盖率数字
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/coverage-strict/**/*.test.js'],
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
