/**
 * 流式渲染：不等整棵树都好了再发，而是「能发的先发」。
 *
 * 两个约定撑起全部机制：
 *   1. 边界（Await）处先发一段兜底，占住位置
 *   2. 数据到齐后，把真内容装进 <template> 发过去，再用 __fill() 原位替换
 * 于是 260ms 的慢数据不再挡住 5ms 就能出的壳 —— 这是流式最实在的收益。
 *
 * 边界是并行的：谁先好谁先补位，所以补位顺序可以与页面顺序不同。
 */
import { escapeHtml, renderToString, attrsToString } from './render-string.mjs'
import { resolve } from './vdom.mjs'

const VOID = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
])

const AWAIT = { name: 'Await' } // 特殊节点的 type 标记，不参与普通组件求值
export const Await = props => ({ type: AWAIT, props, children: [] })

/** 页面 head 里必须带上的运行时代码：把 template 里的内容原位填回去 */
export const STREAM_RUNTIME = `<script>
window.__chunks = []
window.__fill = function (id) {
    var tpl = document.getElementById('t-' + id)
    var slot = document.getElementById('s-' + id)
    slot.replaceWith(tpl.content)
    tpl.remove()
    document.currentScript.remove()
    window.__chunks.push({ name: id, at: Math.round(performance.now() * 10) / 10 })
}
</script>`

/** 每段前面插一个自删脚本：它同时是浏览器侧的到达时间戳、Node 侧的切分标记 */
export const marker = name =>
    `<script>(function(){window.__chunks=window.__chunks||[];window.__chunks.push({name:${JSON.stringify(
        name
    )},at:Math.round(performance.now()*10)/10});document.currentScript.remove()})()</script>`

const fill = (id, html) =>
    `<template id="t-${id}">${html}</template><script>window.__fill(${JSON.stringify(id)})</script>`

/** 同步走一遍树，遇到边界就登记一个 task 并继续往下走（不阻塞后面的内容） */
function walk(vnode, write, tasks) {
    if (vnode == null || vnode === false) return
    if (Array.isArray(vnode)) {
        for (const child of vnode) walk(child, write, tasks)
        return
    }
    if (typeof vnode === 'string' || typeof vnode === 'number') {
        write(escapeHtml(vnode))
        return
    }
    const { type, props, children } = vnode
    if (type === AWAIT) {
        write(`<div id="s-${props.id}">${renderToString(props.fallback)}</div>`)
        const task = { id: props.id, render: props.render }
        // 立刻发起，promise 带上 task 身份，下面按「谁先完成」排序时不会认错
        task.promise = props.data().then(value => ({ task, value }))
        tasks.push(task)
        return
    }
    if (typeof type === 'function') {
        walk(resolve(vnode), write, tasks)
        return
    }
    write(`<${type}${attrsToString(props)}>`)
    if (VOID.has(type)) return
    for (const child of children) walk(child, write, tasks)
    write(`</${type}>`)
}

/**
 * 逐段产出：第一段是「边界之前的所有内容」，之后每段是一个边界的补位。
 * 生成器把「什么时候发」交给调用方，所以 Node 服务端和离线快照能用同一份实现。
 */
export async function* renderSections(root) {
    let buffer = ''
    const tasks = []
    walk(root, s => (buffer += s), tasks)
    yield { name: 'shell', html: buffer }

    let remaining = tasks.slice()
    while (remaining.length) {
        const done = await Promise.race(remaining.map(t => t.promise))
        const task = done.task
        remaining = remaining.filter(t => t !== task)
        yield { name: `${task.id}:fill`, html: fill(task.id, renderToString(task.render(done.value))) }
    }
}

/** 把流收干成一段字符串：拿到的是「壳 + 占位 + template + 补位脚本」的全量字节，用于体积对比 */
export async function renderAll(root) {
    let html = ''
    for await (const segment of renderSections(root)) html += segment.html
    return html
}
