// ============================================================
// mini-router/history —— history 抽象：memory / hash / web 三模式同一套接口
// 对应真实包：vue-router 的 history（源码 packages/vue-router/src/history/ 下的
// memory.ts、hash.ts、html5.ts）
// 依赖：无；被 router.js 依赖（router 只依赖 location / push / replace / go / listen 接口）
// 覆盖机制（对应《Vue Router 原理》三、history 抽象）：
//   memory 用数组模拟会话栈（demo / 测试用，不碰地址栏）、
//   hash 改 location.hash 靠 hashchange、web 用 pushState / popstate；
//   关键约定：push / replace 是程序化跳转，保持静默（router 守卫通过后自己同步状态）；
//   只有 go（前进 / 后退）这类非程序跳转才 fire 通知 router
// ★ 建议断点：memory 的 push（静默）与 go（fire 通知）——体会「程序化跳转静默」的设计；
//   hash / web 两个工厂只在真实浏览器环境里调用（用到 window / location / history 全局）
// ============================================================

/**
 * 创建 memory 模式的 history：URL 存在内存数组里，不碰地址栏（demo / 测试用）。
 * 过程：维护 stack + index 两个变量模拟浏览器会话历史；push 截断前进分支、
 * replace 原位覆盖、go 移动下标并 fire 通知；push / replace 静默（不通知），
 * 只有 go（前进 / 后退）通过 fire 通知所有 listen 回调。
 * @returns {{ mode: 'memory', location: string, push: Function, replace: Function, go: Function, listen: Function }}
 *   三模式统一接口（location 为 getter，返回当前栈顶地址）
 * @example const h = createMemoryHistory(); h.location → '/'；h.push('/about') 后 h.location → '/about'
 * @example h.push('/user/7'); h.go(-1) → location 回到 '/about'，且 listen 回调被触发一次（push 则不会）
 */
function createMemoryHistory() {
    let stack = ['/']
    let index = 0
    const listeners = new Set()
    const fire = () => listeners.forEach(fn => fn(stack[index]))

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
        }
    }
}

/**
 * 创建 hash 模式的 history：URL 放在 location.hash（# 后面），服务器无需任何配置。
 * 过程：push 直接改 location.hash，浏览器随即派发 hashchange 事件 → fire → 通知
 * router；replace 用 location.replace 避免多留一条历史；go 委托给浏览器 history.go。
 * @returns {{ mode: 'hash', location: string, push: Function, replace: Function, go: Function, listen: Function }}
 *   三模式统一接口（location 返回 # 后面的部分，没有 # 时为 '/'）
 * @example const h = createWebHashHistory(); h.push('/about') → 地址栏变成 ...#/about，hashchange → fire → listen 回调收到 '/about'
 */
function createWebHashHistory() {
    const listeners = new Set()
    const fire = () => listeners.forEach(fn => fn(location.hash.slice(1) || '/'))
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
        go: delta => history.go(delta),
        listen(fn) {
            listeners.add(fn)
            return () => listeners.delete(fn)
        }
    }
}

/**
 * 创建 web（HTML5 History）模式的 history：URL 就是真实路径，服务器需兜底到 index.html。
 * 过程：push / replace 用 pushState / replaceState 改地址栏——它们不会触发 popstate，
 * 所以 router 要在守卫通过后自己同步状态；popstate 监听只为浏览器前进 / 后退服务。
 * @returns {{ mode: 'web', location: string, push: Function, replace: Function, go: Function, listen: Function }}
 *   三模式统一接口（location = pathname + search）
 * @example const h = createWebHistory(); h.push('/about') → 地址栏变成 .../about 但 popstate 不触发（静默）；按返回键才触发 popstate → fire
 */
function createWebHistory() {
    const listeners = new Set()
    const fire = () => listeners.forEach(fn => fn(location.pathname + location.search))
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
        go: delta => history.go(delta),
        listen(fn) {
            listeners.add(fn)
            return () => listeners.delete(fn)
        }
    }
}
