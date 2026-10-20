// history 抽象：把「URL 在哪、怎么改、变了通知谁」收口成三个模式统一的接口。
// 约定：push/replace 是程序化跳转、保持静默，由 router 在守卫通过后统一同步状态；
// listen 只为「非程序跳转的 URL 变化」服务（back/forward、popstate、hashchange）。
// Node 实测用 memory；hash / web 两个模式只在浏览器里生效（见 README 已知取舍）。
function createMemoryHistory() {
    let stack = ['/']
    let index = 0
    const listeners = new Set()
    const fire = () => listeners.forEach((fn) => fn(stack[index]))

    return {
        mode: 'memory',
        get location() {
            return stack[index]
        },
        push(loc) {
            stack = stack.slice(0, index + 1) // 中途后退过再 push，截断前进分支（与浏览器行为一致）
            stack.push(loc)
            index++
        },
        replace(loc) {
            stack[index] = loc
        },
        go(delta) {
            const next = index + delta
            if (next < 0 || next >= stack.length) return
            index = next
            fire() // 只有前进/后退通知 router
        },
        listen(fn) {
            listeners.add(fn)
            return () => listeners.delete(fn)
        },
    }
}

function createWebHashHistory() {
    const listeners = new Set()
    const fire = () => listeners.forEach((fn) => fn(location.hash.slice(1) || '/'))
    window.addEventListener('hashchange', fire)
    return {
        mode: 'hash',
        get location() {
            return location.hash.slice(1) || '/'
        },
        push(loc) {
            location.hash = loc // 触发 hashchange → fire → 通知 router
        },
        replace(loc) {
            location.replace(`#${loc}`)
        },
        go: (delta) => history.go(delta),
        listen(fn) {
            listeners.add(fn)
            return () => listeners.delete(fn)
        },
    }
}

function createWebHistory() {
    const listeners = new Set()
    const fire = () => listeners.forEach((fn) => fn(location.pathname + location.search))
    window.addEventListener('popstate', fire) // 只有前进/后退会触发；pushState 不触发
    return {
        mode: 'web',
        get location() {
            return location.pathname + location.search
        },
        push(loc) {
            history.pushState({}, '', loc) // 不触发 popstate，router 需手动同步状态
        },
        replace(loc) {
            history.replaceState({}, '', loc)
        },
        go: (delta) => history.go(delta),
        listen(fn) {
            listeners.add(fn)
            return () => listeners.delete(fn)
        },
    }
}

module.exports = { createMemoryHistory, createWebHashHistory, createWebHistory }
