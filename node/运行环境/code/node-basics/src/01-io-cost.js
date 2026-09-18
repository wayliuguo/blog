// 01 一次请求的耗时账：墙上时间(wall time) vs CPU 时间
// 对应文档《Node.js 是什么：一笔 I/O 密集型服务的耗时账》
// 这一段在演示：一个接口里绝大多数时间在“等”（等数据库 / 等下游 / 等第三方 API），
// 真正 CPU 执行 JS 只有几毫秒。我们用 setTimeout + Promise 模拟这些等待，
// 用 process.hrtime.bigint() 量墙上时间、用 process.cpuUsage() 量 CPU 时间。

// SCALE 缩放系数：真实总等待约 2165ms（30+100+2000+5+30），演示按 1/4 缩放，避免读者干等 2 秒
// 想看真实时长，把 SCALE 改成 1 即可（总耗时约 2.2 秒）。
const SCALE = 0.25

// 真实各段耗时(ms)。演示时实际等待 = ms * SCALE
const REAL_STAGES = [
    { name: '查询数据库', ms: 30 },
    { name: '调用下游服务', ms: 100 },
    { name: '请求第三方 API', ms: 2000 },
    { name: '查询缓存', ms: 5 },
    { name: '写库', ms: 30 }
]

// 模拟一段 I/O 等待（Promise + setTimeout）。setTimeout 挂起期间 CPU 几乎不工作
function wait(realMs) {
    return new Promise(resolve => setTimeout(resolve, realMs * SCALE))
}

// 模拟该阶段真正执行的 JS（解析参数、拼装响应等），让 CPU 时间可见（约几毫秒）
function cpuWork() {
    let acc = 0
    for (let i = 0; i < 3e6; i += 1) acc += Math.sqrt(i) * 0.5
    return acc
}

// 简单固定列宽打印对照表
function printRow(cols) {
    console.log(cols.map((c, i) => String(c).padEnd([18, 14, 14][i] || 14)).join(' | '))
}

;(async () => {
    // 进程级计时起点：墙上时间用 hrtime.bigint()，CPU 时间用 cpuUsage（返回微秒）
    const startWall = process.hrtime.bigint()
    const startCpu = process.cpuUsage()

    const rows = []
    for (const s of REAL_STAGES) {
        const t0 = process.hrtime.bigint()
        await wait(s.ms) // 这一段在演示：当前阶段是“纯等待”，不消耗 CPU
        cpuWork() // 这一段在演示：等待结束后，真正执行 JS 只有几毫秒
        const t1 = process.hrtime.bigint()
        const demoMs = Number(t1 - t0) / 1e6
        rows.push({ name: s.name, real: s.ms, demo: demoMs })
    }

    const endWall = process.hrtime.bigint()
    const endCpu = process.cpuUsage(startCpu) // 与 startCpu 做差，得到区间 CPU 用量
    const totalWallMs = Number(endWall - startWall) / 1e6
    const totalCpuMs = (endCpu.user + endCpu.system) / 1000 // 微秒 → 毫秒

    console.log('阶段 | 真实耗时(ms) | 演示耗时(ms)')
    console.log('-'.repeat(48))
    for (const r of rows) {
        printRow([r.name, r.real, r.demo.toFixed(1)])
    }
    console.log('-'.repeat(48))
    console.log(`总墙上时间   : ${totalWallMs.toFixed(1)} ms  （真实约 ${(totalWallMs / SCALE).toFixed(0)} ms）`)
    console.log(`CPU 实际占用 : ${totalCpuMs.toFixed(2)} ms`)
    const ratio = totalWallMs > 0 ? (totalCpuMs / totalWallMs) * 100 : 0
    console.log(`CPU / 墙上   : ${ratio.toFixed(2)} %`)
    console.log('\n结论：等待占绝大多数，CPU 真正执行 JS 只有几毫秒 —— 这正是 Node 适合 I/O 密集服务的根因。')
})()
