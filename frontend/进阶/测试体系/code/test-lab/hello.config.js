import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        // 纯逻辑用 node（最快）；需要 DOM 的用例在文件首行加 // @vitest-environment jsdom
        environment: 'node',
        // 决定哪些文件算测试；! 开头的是排除项
        include: ['src/**/*.test.{js,jsx,ts,tsx}']
    }
})
