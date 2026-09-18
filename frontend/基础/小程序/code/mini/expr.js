/**
 * {{ }} 表达式的求值器（演示用）
 *
 * 规则：WXML 的 `{{ }}` 里只能放**一个表达式**——运算、三元、成员访问、方法调用都可以，
 * 但不能出现语句（var / if / for / return …）、不能带分号、不能写赋值。
 * 真实的小程序编译器会把表达式编译成渲染函数后执行；这里为了把「能不能写」这条规则
 * 跑出来，先用一组禁用词做静态检查，再用 Function + with 求值。
 */
const BANNED = [
    {
        re: /\b(?:var|let|const|function|return|if|else|for|while|do|switch|case|break|continue|new|class|try|catch|throw|await|yield|async|delete)\b/,
        why: '语句关键字'
    },
    { re: /;/, why: '分号（说明写成了多条语句）' },
    { re: /(?:^|[^=!<>+\-*\/%&|^])=(?!=|>)/, why: '赋值号（WXML 表达式里不允许赋值）' },
    { re: /=>/, why: '箭头函数（逻辑要放到 WXS 或逻辑层）' },
    { re: /\b(?:console|window|document|wx|this)\b/, why: '宿主对象（WXML 的求值环境里不存在）' }
]

/** 静态检查一段表达式源码，返回 null 或「为什么不行」 */
function reject(expr) {
    for (const rule of BANNED) {
        if (rule.re.test(expr)) return rule.why
    }
    return null
}

/**
 * 求值。抛错时带上原始表达式，方便把编译期报错原样贴进文档。
 * 注意：`with` + `new Function` 只是演示用的实现，不要照搬进生产。
 */
function evaluate(expr, data) {
    const src = String(expr).trim()
    const bad = reject(src)
    if (bad) throw new Error(`表达式不支持「${bad}」：{{ ${src} }}`)
    let fn
    try {
        fn = new Function('__data__', `with (__data__) { return (${src}) }`)
    } catch (e) {
        throw new Error(`表达式语法错误：{{ ${src} }} —— ${e.message}`)
    }
    try {
        return fn(data)
    } catch (e) {
        // WXML 里访问不存在的字段不会抛错，只会得到 undefined；这里把 ReferenceError 转成 undefined
        if (e instanceof ReferenceError) return undefined
        throw new Error(`表达式求值失败：{{ ${src} }} —— ${e.message}`)
    }
}

/** 值 → 插值后的文本：null / undefined / false 都渲染成空串（与 WXML 一致） */
function stringify(value) {
    if (value === null || value === undefined || value === false) return ''
    return String(value)
}

module.exports = { evaluate, stringify, reject }
