/**
 * 测试辅助：给宿主操作装一个记录器
 *
 * 断言"这一轮到底改了什么"最直接的办法，就是数宿主操作。
 * 用可开关的 sink 而不是"装/卸钩子"，避免测试失败时把钩子留在全局。
 */

const { host } = require('../src/index')

let sink = null
const raw = { ...host }

function poke(entry) {
    if (sink) sink.push(entry)
}

function nodeName(node) {
    return node.text !== null ? `"${node.text}"` : `<${node.type}>`
}

host.createInstance = (type) => {
    poke(`create <${type}>`)
    return raw.createInstance(type)
}
host.createTextInstance = (text) => {
    poke(`createText "${text}"`)
    return raw.createTextInstance(text)
}
host.appendChild = (parent, child) => {
    poke(`append ${nodeName(child)} → ${nodeName(parent)}`)
    return raw.appendChild(parent, child)
}
host.insertBefore = (parent, child, before) => {
    poke(`insert ${nodeName(child)} before ${nodeName(before)}`)
    return raw.insertBefore(parent, child, before)
}
host.removeChild = (parent, child) => {
    poke(`remove ${nodeName(child)} from ${nodeName(parent)}`)
    return raw.removeChild(parent, child)
}
host.setProperty = (node, name, value) => {
    if (name === 'nodeValue') poke(`${nodeName(node)}.nodeValue = "${value}"`)
    return raw.setProperty(node, name, value)
}

function recordOps() {
    const ops = []
    return {
        ops,
        start: () => {
            sink = ops
        },
        stop: () => {
            sink = null
        }
    }
}

module.exports = { recordOps, nodeName }
