// Worker 线程：引入同一份热点函数，算完把结果回传
importScripts('./heavy.js')

self.onmessage = (e) => {
    const started = Date.now()
    const result = self.heavyTask(e.data)
    self.postMessage({ result, workerMs: Date.now() - started })
}
