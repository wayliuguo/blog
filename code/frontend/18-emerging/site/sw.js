// sw.js —— 精简 Service Worker：演示 install / activate / fetch 三个生命周期钩子
// 配合 pwa-sw.html 使用。仅演示原理，缓存策略用 Cache First + 更新回填。
const CACHE_NAME = 'emerging-pwa-v1'
const PRECACHE = ['/pwa-sw.html']

// 1) install：预缓存关键资源（页面首次被接管前执行）
self.addEventListener('install', event => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE))
            .catch(() => {})
    )
    // 让新版立即接管，不等旧页面全部关闭
    self.skipWaiting()
})

// 2) activate：清理旧版本缓存，并获取页面控制权
self.addEventListener('activate', event => {
    event.waitUntil(
        caches
            .keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    )
})

// 3) fetch：Cache First —— 先读缓存，未命中再请求网络并回填
self.addEventListener('fetch', event => {
    // 导航请求走网络或兜底，避免整页被缓存策略卡住
    if (event.request.mode === 'navigate') return
    event.respondWith(
        caches.match(event.request).then(hit => {
            if (hit) return hit
            return fetch(event.request).then(resp => {
                if (resp && resp.status === 200) {
                    const clone = resp.clone()
                    caches.open(CACHE_NAME).then(c => c.put(event.request, clone))
                }
                return resp
            })
        })
    )
})
