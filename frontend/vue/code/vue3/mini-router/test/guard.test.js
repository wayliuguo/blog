const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createMemoryHistory } = require('../src/history')
const { createRouter } = require('../src/router')

function makeRouter(loggedIn) {
    const history = createMemoryHistory()
    const router = createRouter({
        history,
        routes: [
            { path: '/', component: { name: 'Home' } },
            { path: '/login', component: { name: 'Login' } },
            {
                path: '/admin',
                component: { name: 'Admin' },
                beforeEnter: () => record.push('beforeEnter'),
                children: [{ path: 'profile', component: { name: 'Profile' } }],
            },
        ],
    })
    const record = []
    router.beforeEach((to) => {
        record.push(`beforeEach:${to.path}`)
        if (to.path.startsWith('/admin') && !loggedIn) return { path: '/login' }
    })
    const after = []
    router.afterEach((to) => after.push(to.path))
    return { history, router, record, after }
}

test('beforeEach 返回 false → URL 与状态都不动', async () => {
    const { history, router } = makeRouter(true)
    router.beforeEach((to) => (to.path === '/forbidden' ? false : undefined))
    await router.push('/forbidden')
    assert.equal(history.location, '/')
    assert.equal(router.currentRoute.value.path, '/')
})

test('未登录访问 /admin → 重定向 /login，afterEach 只记最终落地路由', async () => {
    const { router, record, after } = makeRouter(false)
    await router.push('/admin/profile')
    assert.equal(router.currentRoute.value.path, '/login')
    assert.ok(record.includes('beforeEach:/admin/profile'))
    assert.ok(record.includes('beforeEach:/login'))
    assert.deepEqual(after, ['/login']) // /admin/profile 未落地，没有 afterEach
})

test('登录后守卫顺序：beforeEach → beforeEnter → afterEach', async () => {
    const { router, record, after } = makeRouter(true)
    await router.push('/admin/profile')
    assert.equal(router.currentRoute.value.path, '/admin/profile')
    const iBefore = record.findIndex((s) => s === 'beforeEach:/admin/profile')
    const iEnter = record.indexOf('beforeEnter')
    assert.ok(iBefore > -1 && iEnter > iBefore, 'beforeEnter 在 beforeEach 之后')
    assert.deepEqual(after, ['/admin/profile'])
})
