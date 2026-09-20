/**
 * 实验台 Service Worker：只缓存 /spa/ 与 /vendor/ 下的静态资源
 * 策略是 cache-first：命中就直接用，没命中才走网络并顺手存一份
 */
const CACHE = 'spa-lab-v1'
const SCOPE = /\/(spa|vendor)\//

self.addEventListener('install', event => {
    self.skipWaiting() // 装完立刻接管，不等下一次访问
})

self.addEventListener('activate', event => {
    event.waitUntil(
        caches
            .keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    )
})

self.addEventListener('fetch', event => {
    const req = event.request
    const url = new URL(req.url)
    if (req.method !== 'GET' || url.origin !== self.location.origin) return
    if (!SCOPE.test(url.pathname)) return
    event.respondWith(
        caches.match(req).then(hit => {
            if (hit) return hit
            return fetch(req).then(res => {
                const copy = res.clone()
                caches.open(CACHE).then(c => c.put(req, copy))
                return res
            })
        })
    )
})
