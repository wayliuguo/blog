// Vite：一个统计"转换了多少模块"的插件
// 用来证明：dev 只转换被请求到的模块，build 转换全部模块
export function transformCounter() {
    const seen = new Set()
    let command = 'serve'
    return {
        name: 'transform-counter',
        configResolved(config) {
            command = config.command // serve | build
        },
        transform(code, id) {
            if (!id.includes('/vite-lab/src/') && !id.includes('\\vite-lab\\src\\')) return null
            seen.add(id.split(/[\\/]/).pop())
            return null
        },
        buildEnd() {
            const label = command === 'serve' ? 'dev（只转被请求的）' : 'build（全量）'
            console.log(`  [${label}] 已转换的源码模块:`, [...seen].join(', ') || '(无)')
        }
    }
}
