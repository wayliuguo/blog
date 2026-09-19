/**
 * 场景 C：切片上传、断点续传与秒传
 * 起一个临时服务端（内存存储 + 每片 120ms 模拟耗时），客户端按切片上传协议跑四组对照：
 *   1) 串行 vs 并发 3 的耗时，以及服务端观测到的真实并发峰值
 *   2) 传到一半"掉线"，重新进入流程时只补缺失分片
 *   3) 同一份文件第二次上传 → 秒传，传输字节为 0
 *   4) 缺分片时服务端拒绝合并；齐了以后按 sha256 校验完整性
 */
import crypto from 'node:crypto'
import { startServer, readBody, json } from '../harness/server.mjs'
import { createPool } from '../harness/pool.mjs'
import { table, title, section, ms, bytes, sleep, num } from '../harness/table.mjs'

const PART_LATENCY = 120 // 每片在服务端停留的时间，用来放大串行与并发的差异
const FILE_SIZE = 5 * 1024 * 1024
const CHUNK_SIZE = 1024 * 1024

/** 用固定种子的伪随机生成文件内容，保证每次运行的哈希一致，正文数字可复现 */
function makeFile(size) {
    const buf = Buffer.alloc(size)
    let seed = 20260919
    for (let i = 0; i < size; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        buf[i] = seed & 0xff
    }
    return buf
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

function makeServer() {
    const jobs = new Map() // uploadId -> { size, chunkSize, fileHash, parts: Map<index, Buffer> }
    const byHash = new Map() // fileHash -> uploadId
    const stats = { parts: 0, bytes: 0, active: 0, peak: 0, merges: 0 }

    async function handler(req, res) {
        const url = new URL(req.url, 'http://local')

        if (url.pathname === '/api/upload/init') {
            const body = JSON.parse((await readBody(req)).toString() || '{}')
            const known = byHash.get(body.fileHash)
            if (known && jobs.get(known).parts.size === Math.ceil(body.size / body.chunkSize)) {
                return json(res, { exists: true, uploadId: known, received: [...jobs.get(known).parts.keys()] })
            }
            const uploadId = known || 'up_' + crypto.randomBytes(4).toString('hex')
            if (!known) {
                jobs.set(uploadId, { ...body, parts: new Map() })
                byHash.set(body.fileHash, uploadId)
            }
            return json(res, { exists: false, uploadId, received: [...jobs.get(uploadId).parts.keys()] })
        }

        if (url.pathname === '/api/upload/part') {
            const job = jobs.get(url.searchParams.get('uploadId'))
            const index = Number(url.searchParams.get('index'))
            const buf = await readBody(req)
            stats.active++
            stats.peak = Math.max(stats.peak, stats.active)
            await sleep(PART_LATENCY) // 模拟落盘/转存耗时，让并发在这里体现出来
            if (!job.parts.has(index)) {
                job.parts.set(index, buf)
                stats.parts++
                stats.bytes += buf.length
            }
            stats.active--
            return json(res, { ok: true, index, received: job.parts.size })
        }

        if (url.pathname === '/api/upload/status') {
            const job = jobs.get(url.searchParams.get('uploadId'))
            const total = Math.ceil(job.size / job.chunkSize)
            const received = [...job.parts.keys()].sort((a, b) => a - b)
            return json(res, {
                received,
                missing: Array.from({ length: total }, (_, i) => i).filter((i) => !job.parts.has(i))
            })
        }

        if (url.pathname === '/api/upload/complete') {
            const job = jobs.get(url.searchParams.get('uploadId'))
            const total = Math.ceil(job.size / job.chunkSize)
            const missing = Array.from({ length: total }, (_, i) => i).filter((i) => !job.parts.has(i))
            if (missing.length) return json(res, { ok: false, missing }, 400)
            const hash = crypto.createHash('sha256')
            let size = 0
            for (let i = 0; i < total; i++) {
                hash.update(job.parts.get(i))
                size += job.parts.get(i).length
            }
            stats.merges++
            return json(res, { ok: true, bytes: size, sha256: hash.digest('hex') })
        }

        if (url.pathname === '/api/stats') return json(res, { ...stats })
        if (url.pathname === '/api/stats/reset') {
            stats.peak = 0 // 只重置峰值，累计量保持
            return json(res, { ok: true })
        }
        return json(res, { error: 'not found' }, 404)
    }

    return { handler, jobs, byHash, stats }
}

export default async function run() {
    const file = makeFile(FILE_SIZE)
    const fileHash = sha256(file)
    const parts = []
    for (let offset = 0; offset < file.length; offset += CHUNK_SIZE) {
        parts.push(file.subarray(offset, offset + CHUNK_SIZE))
    }

    const { handler, stats } = makeServer()
    const server = await startServer(handler)
    console.log(title('实验设置'))
    console.log(`文件 ${bytes(file.length)}，切片 ${bytes(CHUNK_SIZE)} → ${parts.length} 片，每片服务端耗时约 ${PART_LATENCY} ms`)
    console.log(`文件指纹 sha256=${fileHash.slice(0, 16)}…`)

    const put = async (uploadId, index) => {
        const res = await fetch(`${server.base}/api/upload/part?uploadId=${uploadId}&index=${index}`, {
            method: 'POST',
            body: parts[index]
        })
        return res.json()
    }

    // —— 1. 串行 vs 并发
    const timingRows = []
    for (const limit of [1, 3]) {
        await fetch(`${server.base}/api/stats/reset`, { method: 'POST' })
        const init = await fetch(`${server.base}/api/upload/init`, {
            method: 'POST',
            body: JSON.stringify({
                size: file.length,
                chunkSize: CHUNK_SIZE,
                fileHash: limit === 1 ? fileHash : fileHash + '-twin'
            })
        }).then((r) => r.json())
        const uploadId = init.uploadId

        const pool = createPool(limit)
        const started = performance.now()
        await pool.runAll(parts.map((_, i) => () => put(uploadId, i)))
        const elapsed = performance.now() - started
        timingRows.push([
            limit === 1 ? '串行（1 片）' : `并发（${limit} 片）`,
            ms(elapsed),
            pool.peak,
            stats.peak
        ])
    }
    console.log(section('一、串行与并发的对照'))
    console.log(table(['上传方式', '客户端耗时', '客户端并发峰值', '服务端观测并发峰值'], timingRows))
    console.log(`\n${parts.length} 片 × ${PART_LATENCY}ms 顺序执行是 ${parts.length * PART_LATENCY}ms 量级；`)
    console.log('把并发提到 3，总耗时被压到两轮 —— 但并发不是越高越好：')
    console.log('浏览器对同域 HTTP/1.1 默认 6 条连接，切片并发通常取 3~4，留出带宽给页面自身请求。')

    // —— 2. 断点续传
    console.log(section('二、断点续传：传到一半掉线，重连只补缺的片'))
    const partial = await fetch(`${server.base}/api/upload/init`, {
        method: 'POST',
        body: JSON.stringify({ size: file.length, chunkSize: CHUNK_SIZE, fileHash: fileHash + '-break' })
    }).then((r) => r.json())
    const poolBreak = createPool(3)
    await poolBreak.runAll([0, 1, 2].map((i) => () => put(partial.uploadId, i))) // 只传 3 片，模拟断线
    const status1 = await fetch(`${server.base}/api/upload/status?uploadId=${partial.uploadId}`).then((r) => r.json())
    console.log(`掉线时已传 [${status1.received.join(', ')}]，缺 [${status1.missing.join(', ')}]`)
    const restarted = await fetch(`${server.base}/api/upload/init`, {
        method: 'POST',
        body: JSON.stringify({ size: file.length, chunkSize: CHUNK_SIZE, fileHash: fileHash + '-break' })
    }).then((r) => r.json())
    const total = parts.length
    const stillMissing = Array.from({ length: total }, (_, i) => i).filter((i) => !restarted.received.includes(i))
    const poolRest = createPool(3)
    const startedRest = performance.now()
    await poolRest.runAll(stillMissing.map((i) => () => put(restarted.uploadId, i)))
    const restCost = performance.now() - startedRest
    console.log(
        `重连后 init 返回 received=[${restarted.received.join(', ')}]，按总量 ${total} 片推出还缺 [${stillMissing.join(', ')}]；` +
            `这一轮只发了 ${stillMissing.length} 片、耗时 ${ms(restCost)}，若从头重传要发 ${total} 片`
    )

    // —— 3. 秒传
    console.log(section('三、秒传：同一份文件第二次上传'))
    const complete1 = await fetch(`${server.base}/api/upload/complete?uploadId=${partial.uploadId}`, {
        method: 'POST'
    }).then((r) => r.json())
    const again = await fetch(`${server.base}/api/upload/init`, {
        method: 'POST',
        body: JSON.stringify({ size: file.length, chunkSize: CHUNK_SIZE, fileHash: fileHash + '-break' })
    }).then((r) => r.json())
    console.log(
        table(
            ['轮次', 'init 返回', '后续要发的分片', '实际传输字节'],
            [
                ['首次', 'exists=false', `${parts.length} 片`, bytes(file.length)],
                ['再次', `exists=${again.exists}`, again.exists ? '0 片' : '—', again.exists ? '0 B' : '—']
            ]
        )
    )
    console.log(
        `服务端本次运行累计收到 ${stats.parts} 个分片、${bytes(stats.bytes)}、完成 ${stats.merges} 次合并（含上面的对照组）。`
    )
    console.log('秒传省掉的是"整份文件"的传输，代价是客户端得先算完文件指纹。')

    // —— 4. 完整性
    console.log(section('四、完整性：缺片不许合并，齐了要能验出哈希'))
    const missingJob = await fetch(`${server.base}/api/upload/init`, {
        method: 'POST',
        body: JSON.stringify({ size: file.length, chunkSize: CHUNK_SIZE, fileHash: fileHash + '-gap' })
    }).then((r) => r.json())
    await put(missingJob.uploadId, 0)
    const badRes = await fetch(`${server.base}/api/upload/complete?uploadId=${missingJob.uploadId}`, { method: 'POST' })
    const badBody = await badRes.json()
    console.log(`只传了 1 片就请求合并 → HTTP ${badRes.status}，服务端返回 missing=[${badBody.missing.join(', ')}]`)

    console.log(
        table(
            ['校验项', '值'],
            [
                ['客户端文件 sha256', fileHash.slice(0, 32) + '…'],
                ['服务端合并后 sha256', String(complete1.sha256).slice(0, 32) + '…'],
                ['是否一致', complete1.sha256 === fileHash ? '一致' : '不一致'],
                ['合并后字节', bytes(complete1.bytes)]
            ]
        )
    )

    // —— 5. 指纹计算的代价
    console.log(section('五、客户端算指纹的代价（为什么要放 Worker）'))
    const hashRows = []
    for (const mb of [5, 50]) {
        const buf = makeFile(mb * 1024 * 1024)
        const t0 = performance.now()
        sha256(buf)
        hashRows.push([`${mb} MB`, num(performance.now() - t0, 0) + ' ms'])
    }
    console.log(table(['文件大小', '同步计算 sha256 耗时'], hashRows))
    console.log(`主线程一次性算完 50MB 要 ${hashRows[1][1]}，这期间页面完全不能交互 —— 所以浏览器里用`)
    console.log('Web Worker（或 crypto.subtle 的分片摘要）把计算挪出主线程，Node 侧对应 worker_threads。')

    await server.close()
    console.log(section('读法'))
    console.log('- 断点续传的前提是"分片可寻址且可重复提交"，所以服务端必须幂等：同一 index 重复到达只记一次')
    console.log('- 秒传的判据是文件指纹而非文件名，改一个字节指纹就变，所以它不会误合并')
    console.log('- 进度条要按"已确认分片数"聚合，而不是按"已发出字节数"—— 发出不等于落盘')
}
