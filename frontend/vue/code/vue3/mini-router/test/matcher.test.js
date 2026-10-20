const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createRouterMatcher, normalize } = require('../src/matcher')

function makeMatcher() {
    return createRouterMatcher([
        { path: '/', component: { name: 'Home' } },
        { path: '/about', component: { name: 'About' } },
        { path: '/user/:id', component: { name: 'User' } },
        {
            path: '/settings',
            component: { name: 'Settings' },
            children: [
                { path: 'profile', component: { name: 'Profile' } },
                { path: 'notifications', component: { name: 'Notifications' }, meta: { badge: true } },
            ],
        },
    ])
}

test('normalize：去多余斜杠、补前导斜杠', () => {
    assert.equal(normalize('about'), '/about')
    assert.equal(normalize('//a//b//'), '/a/b')
    assert.equal(normalize('/'), '/')
})

test('静态路径与嵌套路由的 matched 链', () => {
    const matcher = makeMatcher()
    assert.equal(matcher.resolve('/about').matched.length, 1)
    const notif = matcher.resolve('/settings/notifications')
    assert.deepEqual(notif.matched.map((r) => r.component.name), ['Settings', 'Notifications'])
    assert.deepEqual(notif.meta, { badge: true })
})

test('动态段参数与 query 解析', () => {
    const matcher = makeMatcher()
    const user = matcher.resolve('/user/42?tab=posts&tab2=a%20b')
    assert.deepEqual(user.params, { id: '42' })
    assert.deepEqual(user.query, { tab: 'posts', tab2: 'a b' })
    assert.equal(user.fullPath, '/user/42?tab=posts&tab2=a%20b')
})

test('未匹配返回空 matched', () => {
    const matcher = makeMatcher()
    assert.deepEqual(matcher.resolve('/nope').matched, [])
})

test('对象形式 resolve 与动态 addRoute', () => {
    const matcher = makeMatcher()
    matcher.addRoute({ path: '/docs/:slug', component: { name: 'Docs' } })
    assert.deepEqual(matcher.resolve({ path: '/docs/mini-router' }).params, { slug: 'mini-router' })
})
