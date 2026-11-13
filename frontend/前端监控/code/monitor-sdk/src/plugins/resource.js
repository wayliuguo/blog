// 输入：无配置
// 输出：资源插件（error 捕获 + resource timing 聚合，finalize 出耗时终值）
// 过程：失败看 error 事件、耗时看 PerformanceObserver('resource')，两路共享同一份闭包状态
export function createResourcePlugin() {
    // 汇总状态放在插件闭包里：setup 采集、finalize 出终值，两个生命周期要共享同一份数据
    let total = 0
    let count = 0
    const slowest = []
    return {
        name: 'resource',
        setup(ctx) {
            // 输入：一个资源 error 事件
            // 输出：resource 事件（只要加载失败，不要脚本错误）
            // 过程：target.tagName 判资源类型 → 取 currentSrc/src/href → emit
            const onError = event => {
                try {
                    const target = event.target
                    if (!target || !target.tagName) return
                    const tag = target.tagName.toLowerCase()
                    const url = target.currentSrc || target.src || target.href || ''
                    ctx.emit({
                        type: 'resource',
                        subtype: 'load-error',
                        message: `资源加载失败 ${tag} ${url}`,
                        data: { tag, url: url.slice(0, 500) }
                    })
                } catch {
                    /* 静默 */
                }
            }
            // 资源错误不冒泡，只在捕获阶段拿得到
            window.addEventListener('error', onError, true)
            // 资源耗时：只留 Top5 慢资源，全量条目在采集端聚合即可
            let observer = null
            try {
                observer = new PerformanceObserver(list => {
                    for (const entry of list.getEntries()) {
                        const duration = Math.round(entry.duration)
                        total += duration
                        count += 1
                        slowest.push({ url: entry.name.slice(0, 300), duration, type: entry.initiatorType })
                        slowest.sort((a, b) => b.duration - a.duration)
                        if (slowest.length > 5) slowest.length = 5
                    }
                })
                observer.observe({ type: 'resource', buffered: true })
            } catch {
                /* 不支持 resource timing 就只保留加载失败能力 */
            }
            return () => {
                window.removeEventListener('error', onError, true)
                observer?.disconnect()
            }
        },
        finalize(ctx) {
            if (!count) return
            ctx.emit({
                type: 'resource',
                subtype: 'timing',
                message: `资源耗时汇总 ${count} 条`,
                data: { url: '', count, total, slowest: slowest.slice() }
            })
        }
    }
}
