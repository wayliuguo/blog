// 1.给元素缓存一个绑定事件的列表
// 2.如果缓存中没有缓存过的，而且value有值，需要绑定方法并且缓存起来
// 3.以前绑定过，value没有值，需要删除绑定方法与删除缓存
// 4.前后都有，直接改变invoker 中 value 属性指向最新的事件即可
export const patchEvent = (el, key, value) => {
    // 对函数的缓存
    const invokers = el._vei || (el._vei = {})
    // 如果不存在
    const exists = invokers[key]
    if (value && exists) {
        // 需要绑定事件，而且还存在的情况下
        exists.value = value
    } else {
        const eventName = key.slice(2).toLowerCase()
        if (value) {
            // 要绑定事件且以前没有绑定过
            const invoker = (invokers[key] = createInvoker(value))
            el.addEventListener(eventName, invoker)
        } else {
            // 以前绑定过 当时没有value
            el.removeEventListener(eventName, exists)
            invokers[key] = undefined
        }
    }
}

// 一个元素绑定事件 addEventListener(fn1) 切换为 addEventListener(fn2)
// 可以把 value = fn1, @click="value", 后续更改把 value = fn2 即可
function createInvoker(value) {
    // 每次更新事件其实都是更改引用的value即可
    const invoker = e => {
        invoker.value(e)
    }
    invoker.value = value
    return invoker
}
