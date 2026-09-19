/**
 * 第 4 步：列表 diff 实测 —— 有 key / 无 key 各改了多少次宿主节点
 *
 * 用真实 nodeOps（跑在假 DOM 上），给每个操作装记录器，把"这一轮到底改了什么"打出来。
 *
 * 运行：npm run step:diff
 */
const { createRenderer, h } = require('../src/runtime-core')
const { nodeOps } = require('../src/runtime-dom/nodeOps')
const { patchProp } = require('../src/runtime-dom/patchProp')
const { document, printDom, recordNodeOps } = require('../test/fake-dom')

// 每个 <li> 上挂一个 data-id：无 key 时"就地改写"会把它也一起改掉，看得见
const noKey = (items) => h('ul', null, items.map((it) => h('li', { 'data-id': it.id }, it.name)))
const withKey = (items) =>
    h('ul', null, items.map((it) => h('li', { key: it.id, 'data-id': it.id }, it.name)))

const fruits = [
    { id: 'a', name: '苹果' },
    { id: 'b', name: '香蕉' },
    { id: 'c', name: '橘子' }
]

// 记录器要装在传给 createRenderer 的那份操作上（renderer 会把它拷走）
const hostOptions = { ...nodeOps, patchProp }
const ops = recordNodeOps(hostOptions)
const { render } = createRenderer(hostOptions)

function run(title, scene) {
    const container = document.createElement('div')
    render(scene.before, container)
    ops.length = 0 // 首屏挂载不计入对比

    render(scene.after, container)

    console.log(`\n---- ${title} ----`)
    console.log(`  场景：${scene.desc}`)
    console.log(`  宿主操作 ${ops.length} 次：`)
    for (const line of ops) console.log(`    · ${line}`)
    console.log('  DOM：')
    console.log(
        printDom(container)
            .split('\n')
            .map((l) => '    ' + l)
            .join('\n')
    )
    return ops.length
}

console.log('==== 场景一：删掉列表第一项 ====')

const delNoKey = run('无 key', {
    desc: '[苹果, 香蕉, 橘子] → [香蕉, 橘子]',
    before: noKey(fruits),
    after: noKey(fruits.slice(1))
})
const delKey = run('有 key', {
    desc: '[苹果, 香蕉, 橘子] → [香蕉, 橘子]',
    before: withKey(fruits),
    after: withKey(fruits.slice(1))
})

console.log('\n==== 场景二：把最后一项移到最前（纯重排）====')

const reorder = [fruits[2], fruits[0], fruits[1]]
const mvNoKey = run('无 key', {
    desc: '[苹果, 香蕉, 橘子] → [橘子, 苹果, 香蕉]',
    before: noKey(fruits),
    after: noKey(reorder)
})
const mvKey = run('有 key', {
    desc: '[苹果, 香蕉, 橘子] → [橘子, 苹果, 香蕉]',
    before: withKey(fruits),
    after: withKey(reorder)
})

console.log('\n==== 两次场景汇总 ====')
console.log('  场景                    无 key   有 key')
console.log(`  删掉第一项              ${String(delNoKey).padStart(5)}   ${String(delKey).padStart(6)}`)
console.log(`  最后一项移到最前        ${String(mvNoKey).padStart(5)}   ${String(mvKey).padStart(6)}`)

console.log('\n---- 结论 ----')
console.log('1. 有 key 时 diff 走的是「头尾同步 + 中间按 key 配对」，能识别"节点只是换了位置"，')
console.log('   于是搬移节点而不是改写内容；无 key 只能按下标对号入座，剩下的都是"就地改写"。')
console.log('2. 纯重排时无 key 的 DOM 结果"看起来是对的"——因为内容是按位置重写的。')
console.log('   真正出事的是节点上有状态的时候：输入框内容、焦点、组件内部状态都留在原节点上。')
console.log('3. 有 key 的重排也不是零成本：真实 Vue 会先算最长递增子序列，跳过本来就在正确位置的节点；')
console.log('   本实现为了好读，简化成"从后往前逐个插"，所以搬运次数会多几次。')
