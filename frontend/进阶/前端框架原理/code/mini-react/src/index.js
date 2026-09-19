/**
 * mini-react 的对外出口
 *
 * createElement 的用法与 React 一致：JSX 编译后调用的就是它。
 * 脚本里没有 JSX 编译器，所以直接手写 createElement（或下面这个 h 简写）。
 */

const { createElement, createTextElement, Fragment, TEXT_ELEMENT } = require('./element')
const { render, flushWork, workLoop, identityOf } = require('./reconciler')
const { useState, useEffect } = require('./hooks')
const { host, printTree, TEXT_NODE } = require('./host')
const { state } = require('./internal')

// 手写 JSX 太啰嗦，给个 h 简写：h('ul', null, ...items.map(...))
const h = createElement

// 把某个容器上的 Fiber 树打印出来：看清"组件没有 DOM"与"hooks 挂在谁身上"
function printFibers(container, indent = 0) {
    return dump(state.roots.get(container) || null, indent)
}

function dump(fiber, indent) {
    if (!fiber) return ''
    const lines = []
    for (let f = fiber; f; f = f.sibling) {
        const name =
            f.type === 'ROOT' ? 'ROOT' : typeof f.type === 'function' ? f.type.name : String(f.type)
        let dom = '（无）'
        if (f.dom) dom = f.dom.type === TEXT_NODE ? `"${f.dom.text}"` : `<${f.dom.type}>`
        const hooks = (f.hooks || [])
            .map((hk) => (hk.fn ? 'effect' : `state=${JSON.stringify(hk.state)}`))
            .join(', ')
        lines.push(`${'  '.repeat(indent)}- ${name}  dom:${dom}${hooks ? `  hooks:[${hooks}]` : ''}`)
        const child = dump(f.child, indent + 1)
        if (child) lines.push(child)
    }
    return lines.join('\n')
}

module.exports = {
    createElement,
    createTextElement,
    h,
    Fragment,
    TEXT_ELEMENT,
    render,
    flushWork,
    workLoop,
    useState,
    useEffect,
    host,
    printTree,
    printFibers,
    identityOf,
    state
}
