/**
 * 一个能记录"同时活跃数峰值"的并发池。
 * 串行就是 limit=1 的特例，所以上传、请求两处场景共用它。
 */
export function createPool(limit) {
    let active = 0
    let peak = 0
    const queue = []

    function pump() {
        while (active < limit && queue.length) {
            const { task, resolve, reject } = queue.shift()
            active++
            peak = Math.max(peak, active)
            Promise.resolve()
                .then(task)
                .then(
                    value => {
                        active--
                        resolve(value)
                        pump()
                    },
                    err => {
                        active--
                        reject(err)
                        pump()
                    }
                )
        }
    }

    return {
        /** 把任务丢进池子，返回它的结果 Promise */
        run(task) {
            return new Promise((resolve, reject) => {
                queue.push({ task, resolve, reject })
                pump()
            })
        },
        runAll(tasks) {
            return Promise.all(tasks.map(t => this.run(t)))
        },
        get peak() {
            return peak
        },
        get max() {
            return limit
        }
    }
}

/** 简易信号量，用来在同一时刻只放行一个"写"操作 */
export function createLock() {
    let tail = Promise.resolve()
    return task => {
        const result = tail.then(task, task)
        tail = result.catch(() => {})
        return result
    }
}
