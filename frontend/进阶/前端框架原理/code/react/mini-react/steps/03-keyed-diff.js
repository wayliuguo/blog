/**
 * 第 3 步：diff —— 同样是"删掉第一项"，有 key 和没 key 的差别
 *
 * 做法：给 host 的每个操作套一层记录器，把这一轮真实发生的宿主操作打出来。
 * 数字不会骗人：没 key 时 React 是"就地改写 + 删末尾"，DOM 上的输入框/焦点会跟着错位。
 *
 * 运行：npm run step:keyed
 */
const { h, render, host, printTree } = require('../src/index')

// ---------- 给宿主操作装一个记录器 ----------
const ops = []
function record(label, detail) {
    ops.push(detail === undefined ? label : `${label} ${detail}`)
}

function nodeName(node) {
    return node.type === '#text' ? `文本"${node.text}"` : `<${node.type}>`
}

function instrument() {
    const raw = { ...host }

    host.createInstance = type => {
        record('createInstance', `<${type}>`)
        return raw.createInstance(type)
    }
    host.createTextInstance = text => {
        record('createTextInstance', `"${text}"`)
        return raw.createTextInstance(text)
    }
    host.appendChild = (parent, child) => {
        record('appendChild', `${nodeName(child)} → ${nodeName(parent)}`)
        return raw.appendChild(parent, child)
    }
    host.insertBefore = (parent, child, before) => {
        record('insertBefore', `${nodeName(child)} → ${nodeName(parent)}（插在 ${nodeName(before)} 前）`)
        return raw.insertBefore(parent, child, before)
    }
    host.removeChild = (parent, child) => {
        record('removeChild', `${nodeName(child)} ← ${nodeName(parent)}`)
        return raw.removeChild(parent, child)
    }
    host.setProperty = (node, name, value) => {
        if (name === 'nodeValue') record('setProperty', `${nodeName(node)}.nodeValue = "${value}"`)
        return raw.setProperty(node, name, value)
    }
}

// ---------- 两个相同结构的列表，只差有没有 key ----------
const fruits = [
    { id: 'a', name: '苹果' },
    { id: 'b', name: '香蕉' },
    { id: 'c', name: '橘子' }
]

// 无 key：只能按下标对号入座
const noKey = items => h('ul', null, ...items.map(it => h('li', null, it.name)))
// 有 key：身份跟着数据走
const withKey = items => h('ul', null, ...items.map(it => h('li', { key: it.id }, it.name)))

function run(label, factory) {
    const container = host.createInstance('div')
    ops.length = 0
    render(factory(fruits), container, { sync: true })
    ops.length = 0 // 首屏挂载的操作不参与对比

    // 删掉第一项：苹果下架
    render(factory(fruits.slice(1)), container, { sync: true })

    console.log(`\n---- ${label}：删掉「苹果」----`)
    ops.forEach((op, i) => console.log(`  ${i + 1}. ${op}`))
    console.log('  DOM 结果：')
    console.log(
        printTree(container)
            .split('\n')
            .map(line => '    ' + line)
            .join('\n')
    )
    return ops.length
}

instrument()
console.log('==== 删掉列表第一项，看宿主操作 ====')
const a = run('无 key（按下标匹配）', noKey)
const b = run('有 key（按身份匹配）', withKey)

console.log('\n---- 结论 ----')
console.log(`无 key：${a} 次宿主操作；有 key：${b} 次`)
console.log('无 key 时，剩下的元素被"就地改写"成新文案，末尾多出来的节点才被删掉。')
console.log('真实页面上，被改写的那个 <li> 内部的输入框内容、焦点、组件状态都会串位。')
