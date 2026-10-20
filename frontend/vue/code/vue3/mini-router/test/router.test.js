const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createMemoryHistory } = require('../src/history')
const { createRouter } = require('../src/router')
const { effect } = require('../src/reactivity')

function makeRouter() {
    const history = createMemoryHistory()
    const router = createRouter({
        history,
        routes: [
            { path: '/', component: { name: 'Home' } },
            { path: '/about', component: { name: 'About' } },
            { path: '/user/:id', component: { name: 'User' } },
        ],
    })
    return { history, router }
}

test('memory history：push / replace / 后退前进与栈截断', () => {
    const { history, router } = makeRouter()
    router.push('/about')
    router.push('/user/7')
    router.back()
    assert.equal(history.location, '/about')
    router.push('/home2')
    router.push('/user/9')
    assert.equal(history.location, '/user/9')
    router.replace('/about')
    assert.equal(history.location, '/about')
})

test('重复导航被忽略', async () => {
    const { router } = makeRouter()
    await router.push('/about')
    assert.equal(await router.push('/about'), false)
    assert.equal(router.currentRoute.value.path, '/about')
})

test('currentRoute 变化唤醒视图 effect，未匹配渲染为空', async () => {
    const { router } = makeRouter()
    let renders = 0
    let view = null
    effect(() => {
        renders++
        view = router.resolveView(0)
    })
    assert.equal(view.name, 'Home')
    const before = renders
    await router.push('/about')
    assert.equal(renders, before + 1)
    assert.equal(view.name, 'About')
    await router.push('/nope')
    assert.equal(view, null)
    assert.equal(router.currentRoute.value.matched.length, 0)
})

test('resolveView 按深度取嵌套组件', async () => {
    const history = createMemoryHistory()
    const router = createRouter({
        history,
        routes: [
            {
                path: '/settings',
                component: { name: 'Settings' },
                children: [{ path: 'profile', component: { name: 'Profile' } }],
            },
        ],
    })
    await router.push('/settings/profile')
    assert.equal(router.resolveView(0).name, 'Settings')
    assert.equal(router.resolveView(1).name, 'Profile')
    assert.equal(router.resolveView(2), null)
})
