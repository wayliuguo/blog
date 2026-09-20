/**
 * 第 4 步：hooks 是挂在 Fiber 上的链表，按调用顺序存取
 *
 * 覆盖四件事：state 更新、effect 的执行与清理、批处理、顺序错位。
 *
 * 运行：npm run step:hooks
 */
const { h, render, useState, useEffect, printFibers, printTree, host } = require('../src/index')

const log = []
let bump

function Counter({ step }) {
    const [count, setCount] = useState(0)
    bump = setCount

    useEffect(() => {
        log.push(`effect   count=${count}`) // 首次渲染后、count 变化后执行
        return () => log.push(`cleanup  count=${count}`) // 依赖变化或卸载时先清理
    }, [count])

    return h('p', null, `count = ${count}，步长 ${step}`)
}

// 取出容器里第一个文本节点，方便读结果
function textOf(node) {
    if (node.text !== null) return node.text
    for (const child of node.children) {
        const found = textOf(child)
        if (found) return found
    }
    return ''
}

const tick = () => new Promise(resolve => setTimeout(resolve, 10))

async function main() {
    // ---------- 1 ----------
    const container = host.createInstance('div')
    console.log('==== 1. 首次渲染：useState 初值 + effect 执行 ====')
    render(h(Counter, { step: 1 }), container, { sync: true })
    console.log(printTree(container))
    console.log('effect 日志：', JSON.stringify(log))

    // ---------- 2 ----------
    console.log('\n==== 2. 同步模式：连续两次 setState ====')
    log.length = 0
    bump(5) // 直接设为 5
    bump(c => c + 1) // 函数式更新：基于队列里的上一个结果继续算
    console.log('结果：', textOf(container))
    console.log('effect 日志：', JSON.stringify(log))
    console.log('→ 函数式更新读到的是队列里的前一个结果（5 → 6），不是渲染时的旧值；')
    console.log('  同步模式下每次 setState 立刻渲染一轮，所以日志里有两组 cleanup/effect。')

    // ---------- 3 ----------
    console.log('\n==== 3. 默认（异步）调度：同一轮里的两次 setState 被合并 ====')
    const box = host.createInstance('div')
    log.length = 0
    render(h(Counter, { step: 1 }), box) // 不传 sync：交给 requestIdleCallback 切片
    await tick()
    log.length = 0
    bump(c => c + 1)
    bump(c => c + 1)
    await tick()
    console.log('结果：', textOf(box))
    console.log('effect 日志：', JSON.stringify(log))
    console.log('→ 两次更新进了同一个队列，重渲染只发生一次，effect 也只按最终值跑一次。')

    // ---------- 4 ----------
    console.log('\n==== 4. 组件被卸载 ====')
    log.length = 0
    render(h('div', null, '已卸载'), box, { sync: true })
    console.log('effect 日志：', JSON.stringify(log))
    console.log('→ 卸载时执行清理函数，定时器/订阅这类副作用才不会泄漏')

    // ---------- 5 ----------
    console.log('\n==== 5. 再挂回来，看 Fiber 树与 hooks 链表 ====')
    render(h(Counter, { step: 2 }), box, { sync: true })
    console.log(printFibers(box))
    console.log('→ ROOT 与 Counter 都没有自己的 dom（它们是"逻辑节点"），hooks 挂在 Counter 这一层。')

    // ---------- 6 ----------
    console.log('\n==== 6. 反例：useState 放进 if，状态会串位 ====')
    function Bad({ flag }) {
        if (flag) useState('只在 flag=true 时读一次')
        const [label] = useState('本来应该是我')
        return h('p', null, `拿到的是：${label}`)
    }

    const bad = host.createInstance('div')
    render(h(Bad, { flag: true }), bad, { sync: true })
    console.log('flag=true  →', textOf(bad))
    render(h(Bad, { flag: false }), bad, { sync: true })
    console.log('flag=false →', textOf(bad))
    console.log('→ 第二个 useState 读到了链表上"第 0 个"旧节点，状态整体错位一格。')
    console.log('  规则不是"React 要求你写在顶层"，而是"链表只能按顺序对上号"。')
}

main()
