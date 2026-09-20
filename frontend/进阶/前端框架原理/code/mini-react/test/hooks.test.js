const { test } = require('node:test')
const assert = require('node:assert/strict')

const { h, render, useState, useEffect, host, printTree, printFibers } = require('../src/index')

const textOf = node => {
    if (node.text !== null) return node.text
    for (const child of node.children) {
        const found = textOf(child)
        if (found) return found
    }
    return ''
}

test('useState：初值生效，setState 之后重新渲染', () => {
    let bump
    function Counter() {
        const [count, setCount] = useState(0)
        bump = setCount
        return h('p', null, String(count))
    }

    const container = host.createInstance('div')
    render(h(Counter, null), container, { sync: true })
    assert.equal(textOf(container), '0')

    bump(3)
    assert.equal(textOf(container), '3')
})

test('函数式更新：在队列里基于上一个结果继续算', () => {
    let bump
    function Counter() {
        const [count, setCount] = useState(0)
        bump = setCount
        return h('p', null, String(count))
    }

    const container = host.createInstance('div')
    render(h(Counter, null), container, { sync: true })

    bump(c => c + 1)
    bump(c => c + 1)
    assert.equal(textOf(container), '2')
})

test('useState 支持惰性初值：传函数时只调用一次', () => {
    let calls = 0
    function App() {
        const [value] = useState(() => {
            calls++
            return 'computed'
        })
        return h('p', null, value)
    }

    const container = host.createInstance('div')
    render(h(App, null), container, { sync: true })
    render(h(App, null), container, { sync: true })
    assert.equal(calls, 1)
})

test('useEffect：依赖不变不重复执行', () => {
    const runs = []
    let bump
    function App() {
        const [count, setCount] = useState(0)
        const [other, setOther] = useState('x')
        bump = { count: setCount, other: setOther }
        useEffect(() => {
            runs.push(`count=${count}`)
        }, [count])
        return h('p', null, `${count}${other}`)
    }

    const container = host.createInstance('div')
    render(h(App, null), container, { sync: true })
    assert.deepEqual(runs, ['count=0'])

    bump.other('y') // 只改了 other：count 的依赖没变，effect 不跑
    assert.deepEqual(runs, ['count=0'])

    bump.count(1) // 依赖变了才跑
    assert.deepEqual(runs, ['count=0', 'count=1'])
})

test('useEffect：不传依赖数组时每次渲染都执行', () => {
    let runs = 0
    let bump
    function App() {
        const [count, setCount] = useState(0)
        bump = setCount
        useEffect(() => {
            runs++
        })
        return h('p', null, String(count))
    }

    const container = host.createInstance('div')
    render(h(App, null), container, { sync: true })
    bump(1)
    bump(2)
    assert.equal(runs, 3)
})

test('useEffect：依赖变化时先执行上一轮的清理函数', () => {
    const log = []
    let bump
    function App() {
        const [count, setCount] = useState(0)
        bump = setCount
        useEffect(() => {
            log.push(`effect ${count}`)
            return () => log.push(`cleanup ${count}`)
        }, [count])
        return h('p', null, String(count))
    }

    const container = host.createInstance('div')
    render(h(App, null), container, { sync: true })
    bump(1)
    assert.deepEqual(log, ['effect 0', 'cleanup 0', 'effect 1'])
})

test('组件卸载：整棵子树上的 effect 都会被清理', () => {
    const log = []
    function Child() {
        useEffect(() => {
            log.push('child effect')
            return () => log.push('child cleanup')
        }, [])
        return h('span', null, 'child')
    }

    const container = host.createInstance('div')
    render(h(Child, null), container, { sync: true })
    render(h('p', null, '换成别的'), container, { sync: true })

    assert.deepEqual(log, ['child effect', 'child cleanup'])
    assert.equal(container.children.map(c => c.type).join(','), 'p')
})

test('hooks 顺序错位：放进 if 里会读到别人的状态', () => {
    function Bad({ flag }) {
        if (flag) useState('第一个')
        const [label] = useState('第二个')
        return h('p', null, label)
    }

    const container = host.createInstance('div')
    render(h(Bad, { flag: true }), container, { sync: true })
    assert.equal(textOf(container), '第二个')

    render(h(Bad, { flag: false }), container, { sync: true })
    assert.equal(textOf(container), '第一个', '链表按顺序对号入座，整体错位一格')
})

test('Fiber 树上：组件节点没有 dom，hooks 挂在组件这一层', () => {
    function App() {
        const [value] = useState('v')
        return h('p', null, value)
    }

    const container = host.createInstance('div')
    render(h(App, null), container, { sync: true })

    const tree = printFibers(container)
    assert.equal(tree.includes('App  dom:（无）  hooks:[state="v"]'), true)
    assert.equal(tree.includes('p  dom:<p>'), true)
})
