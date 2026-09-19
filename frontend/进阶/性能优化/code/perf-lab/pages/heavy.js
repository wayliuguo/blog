/**
 * 一段纯计算的热点函数：主线程版与 Worker 版共用同一份实现
 * 页面里用 <script src="./heavy.js"> 引入，Worker 里用 importScripts 引入
 */
self.heavyTask = function heavyTask(rounds) {
    let hash = 0
    for (let i = 0; i < rounds; i++) hash = (hash * 31 + i) % 2147483647
    return hash
}
