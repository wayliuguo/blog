/**
 * 第 5 步：把响应式接进渲染 —— 组件、批量更新、卸载
 *
 * 前面几层在这里合上了：组件 render 里读到的响应式数据，会让"这个组件的渲染 effect"
 * 成为它的依赖；数据一变，渲染 effect 被唤醒，但**不是立刻渲染**，而是排进微任务队列。
 *
 * 运行：npm run step:component
 */
require('../test/fake-dom')

const { h, createApp, render, nextTick } = require('../src/runtime-dom')
const { ref, computed } = require('../src/reactivity')
const { printDom } = require('../test/fake-dom')

let renders = 0

const Counter = {
    props: { label: String },
    setup(props) {
        const count = ref(0)
        const double = computed(() => count.value * 2)
        return { count, double, inc: () => count.value++ }
    },
    render() {
        renders++
        return h('div', { class: 'counter' }, [
            h('span', null, `${this.label}：count=${this.count}，double=${this.double}`),
            h('button', { onClick: this.inc }, '+1')
        ])
    }
}

async function main() {
    const container = document.createElement('div')
    const vm = createApp(Counter, { label: '计数器' }).mount(container)

    // 取 counter 里那个 <span> 的文本，读起来比整棵 DOM 树方便
    const counterText = el => el.childNodes[0].childNodes[0].textContent

    console.log('==== 1. 挂载：setup 返回值 + props 都能在 render 里通过 this 访问 ====')
    console.log(printDom(container))

    console.log('\n==== 2. 点击按钮：事件 -> 改状态 -> DOM 更新（但不在同一个 tick）====')
    const button = container.childNodes[0].childNodes[1]
    const before = renders
    button.dispatch('click')
    console.log(`  点击后：渲染次数 +${renders - before}，DOM 里还是旧文案：「${counterText(container)}」`)
    await nextTick()
    console.log(`  await nextTick() 之后：渲染次数 +${renders - before}`)
    console.log(`  DOM 变成「${counterText(container)}」`)

    console.log('\n==== 3. 同一个 tick 改三次，只渲染一次（批处理）====')
    const before3 = renders
    vm.count = 1
    vm.count = 2
    vm.count = 3 // 三次都只是把同一个 job 排进队列
    console.log(`  三次赋值后立刻看：渲染次数 +${renders - before3}，DOM 仍是「${counterText(container)}」`)
    await nextTick()
    console.log(`  await nextTick() 之后：渲染次数 +${renders - before3}`)
    console.log(`  DOM 变成「${counterText(container)}」`)
    console.log('  → 同一个 job 在队列里只会出现一次，所以三次修改只换来一次渲染')

    console.log('\n==== 4. props 是只读的：子组件改父组件传下来的值会被告警 ====')
    const warnings = []
    const rawWarn = console.warn
    console.warn = (...args) => warnings.push(args.join(' '))

    const Rude = {
        props: { title: String },
        setup(props) {
            props.title = '我要改' // 只读代理会拦下来
            return () => h('p', null, props.title)
        }
    }
    const box = document.createElement('div')
    createApp(Rude, { title: '父组件给的' }).mount(box)
    console.warn = rawWarn
    console.log('  控制台告警：', warnings.length ? warnings[0] : '（没有触发）')
    console.log(`  界面没被改动，还是「${box.childNodes[0].textContent}」`)

    console.log('\n==== 5. 子组件只在 props 变化时才重渲染 ====')
    let childRenders = 0
    const Child = {
        props: { label: String },
        setup(props) {
            return () => {
                childRenders++
                return h('span', null, props.label)
            }
        }
    }
    const Parent = {
        setup() {
            const n = ref(0)
            return { n }
        },
        render() {
            return h('div', null, [h(Child, { label: '固定不变' }), h('b', null, `父组件 n=${this.n}`)])
        }
    }

    const stage = document.createElement('div')
    const parentVm = createApp(Parent).mount(stage)
    const childBefore = childRenders
    parentVm.n++ // 只改父组件的状态
    await nextTick()
    console.log(
        `  父组件重新渲染后：子组件渲染次数 +${childRenders - childBefore}，父组件文案「${
            stage.childNodes[0].childNodes[1].textContent
        }」`
    )
    console.log('  → 子组件的 props 与插槽都没变，跳过一次没有意义的子渲染')

    console.log('\n==== 6. 卸载：渲染 effect 必须被停掉 ====')
    const before6 = renders
    render(null, container) // 整棵树卸载
    vm.count = 100 // 状态还能改（对象还活着），但已经没人听
    await nextTick()
    console.log(`  卸载后改状态：渲染次数 +${renders - before6}（0 = effect 已被 stop，不会泄漏）`)

    console.log('\n---- 结论 ----')
    console.log('1. 组件的 render 被包成一个 effect：它读到的响应式数据就是它的依赖。')
    console.log('2. 数据变化只把 job 排进微任务队列，所以"改三次状态渲染一次"，DOM 更新在 nextTick 之后。')
    console.log('3. props 是 shallowReadonly：能阻止子组件改父值，又不影响父组件更新时传新值。')
    console.log('4. 卸载时 stop 渲染 effect：不清干净的话，组件已经不在界面上了，更新还会继续来。')
}

main()
