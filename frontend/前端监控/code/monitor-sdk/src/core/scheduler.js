// 输入：队列的取/还/长度、通道的 send、定稿与持久化回调
// 输出：可被内核触发的调度器
// 过程：notify 判定满量 → 否则排一个空闲任务；定时器兜底；hidden/pagehide 先定稿再 drain
export function createScheduler(opts) {
    let flushing = false
    let pending = null
    let idleHandle = null
    let stopped = false
    const win = window
    /** 空闲触发口：requestIdleCallback 优先，降级 setTimeout（不超过 2s，兜住不支持空闲回调的浏览器） */
    function scheduleIdle() {
        if (idleHandle !== null || stopped) return
        if (typeof win.requestIdleCallback === 'function') {
            idleHandle = win.requestIdleCallback(
                () => {
                    idleHandle = null
                    void flush('idle')
                },
                { timeout: opts.idleTimeout }
            )
        } else {
            idleHandle = window.setTimeout(
                () => {
                    idleHandle = null
                    void flush('idle')
                },
                Math.min(opts.idleTimeout, 2000)
            )
        }
    }
    /** 撤销空闲任务：flush 开始前与 stop 时调用，防止撞车 */
    function cancelIdle() {
        if (idleHandle === null) return
        if (typeof win.cancelIdleCallback === 'function') win.cancelIdleCallback(idleHandle)
        else clearTimeout(idleHandle)
        idleHandle = null
    }
    // 输入：触发原因
    // 输出：本次是否全部送达
    // 过程：hidden/pagehide 先 finalize（性能终值入队）→ 循环按 batchSize 取 → 失败回灌并落盘 → 收尾
    async function flush(reason) {
        if (flushing) return pending ?? false
        flushing = true
        cancelIdle()
        const task = (async () => {
            let ok = true
            let count = 0
            if (reason === 'hidden' || reason === 'pagehide') opts.finalize()
            let batch = opts.take(opts.batchSize)
            while (batch.length) {
                count += batch.length
                const sent = await opts.send(batch)
                if (!sent) {
                    ok = false
                    // 送不出去的事件不能凭空消失：回队首 + 落盘，下次启动补发
                    opts.putBack(batch)
                    opts.persist(batch)
                    break
                }
                batch = opts.take(opts.batchSize)
            }
            opts.onFlush(reason, count, ok)
            return ok
        })()
        pending = task
        try {
            return await task
        } finally {
            flushing = false
            pending = null
        }
    }
    /** 每条事件入队后都会调 notify：只有它决定"现在发还是等" */
    function notify() {
        if (stopped) return
        // 满量走 batch，未满量等空闲：两条路都只调用同一条 drain，不复制发送逻辑
        if (opts.size() >= opts.batchSize) void flush('batch')
        else scheduleIdle()
    }
    const timer = window.setInterval(
        () => {
            void flush('interval')
        },
        Math.max(1000, opts.flushInterval)
    )
    const onVisible = () => {
        if (document.visibilityState === 'hidden') void flush('hidden')
    }
    const onPageHide = () => {
        void flush('pagehide')
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pagehide', onPageHide)
    return {
        notify,
        flush,
        stop() {
            stopped = true
            cancelIdle()
            clearInterval(timer)
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener('pagehide', onPageHide)
        }
    }
}
