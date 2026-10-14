// join.cjs — SVG 章最小实现：手写 mini data-join（enter / update / exit）
// D3 data join 的核心机制：把数据数组绑定到节点集合，按 key 分成三类——
//   enter：新数据没有对应节点（要新建）
//   update：已有节点对应新数据（复用并更新属性）
//   exit：旧节点没了数据（要移除）
// 这里用轻量节点对象模拟 DOM，专注「分类与复用」这个机制本身。
'use strict'

// 一个极简的 SVG 节点模拟：够演示 append / setAttr / remove 即可
function createNode(tag) {
  return {
    tag,
    attrs: {},
    parent: null,
    children: [],
    setAttr(k, v) { this.attrs[k] = v },
    appendChild(child) { child.parent = this; this.children.push(child) },
    remove() {
      if (!this.parent) return
      const i = this.parent.children.indexOf(this)
      if (i >= 0) this.parent.children.splice(i, 1)
      this.parent = null
    },
  }
}

// mini data join：nodes 是已有节点数组（每个节点通过 __data__.id 与数据关联）
function join(nodes, data) {
  const byKey = new Map(nodes.map(n => [n.__data__.id, n]))
  const enter = []
  const update = [] // [node, datum] 对
  const exit = []
  const used = new Set()
  for (const d of data) {
    const n = byKey.get(d.id)
    if (n) {
      update.push([n, d])
      used.add(d.id)
    } else {
      enter.push(d)
    }
  }
  for (const n of nodes) {
    if (!used.has(n.__data__.id)) exit.push(n)
  }
  return { enter, update, exit }
}

// apply：把 join 的结果落到容器上——enter 建节点、update 改属性、exit 删节点
// 这一步等价于 D3 的 enter().append().merge(update).attr(...) + exit().remove()
function applyJoin(container, data, render) {
  const { enter, update, exit } = join(container.children, data)
  for (const d of enter) {
    const n = createNode('rect')
    n.__data__ = d
    container.appendChild(n)
    update.push([n, d]) // 新建的节点也要按新数据渲染一次
  }
  for (const n of exit) n.remove()
  for (const [n, d] of update) render(n, d)
  return { enterCount: enter.length, updateCount: update.length, exitCount: exit.length }
}

module.exports = { createNode, join, applyJoin }
