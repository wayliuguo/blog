// 被测源码：定时器相关的两个经典工具函数

export function debounce(fn, wait = 300) {
    let timer = null
    return function debounced(...args) {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
            timer = null
            fn.apply(this, args)
        }, wait)
    }
}

export function throttle(fn, wait = 300) {
    let last = 0
    let timer = null
    return function throttled(...args) {
        const now = Date.now()
        const remain = wait - (now - last)
        if (remain <= 0) {
            last = now
            fn.apply(this, args)
        } else if (!timer) {
            timer = setTimeout(() => {
                last = Date.now()
                timer = null
                fn.apply(this, args)
            }, remain)
        }
    }
}
