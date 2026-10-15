/**
 * DOM 事件：事件对象、委托、解绑与自定义事件
 * 页面里所有"点击"都用 dispatchEvent 程序化触发，因此在无头浏览器里也能稳定复现，
 * 探针输出就是真实的事件对象内容（不是文字描述）。
 */
const lines = []
const log = line => lines.push(line)

/* ------------------------------------------------------------------ ① 事件对象 */
const card = document.getElementById('evt-card')
const chip = card.querySelector('.chip')

card.addEventListener('click', e => {
    log(
        '① 点在 .chip 上：e.target = ' +
            e.target.className +
            '（真实目标），e.currentTarget = ' +
            e.currentTarget.id +
            '（挂着监听器的那个）'
    )
})
chip.dispatchEvent(new MouseEvent('click', { bubbles: true }))

/* ------------------------------------------------------------------ ② 事件委托 */
const list = document.getElementById('delegated')
const handled = []

list.addEventListener('click', e => {
    const li = e.target.closest('li')
    if (!li) return
    handled.push(li.dataset.id)
})

// 已有的 3 项
list.querySelectorAll('li').forEach(li => li.dispatchEvent(new MouseEvent('click', { bubbles: true })))

// 动态新增的项：没有重新绑任何监听器
const fresh = document.createElement('li')
fresh.dataset.id = 'dyn'
fresh.textContent = '动态新增的项'
list.appendChild(fresh)
fresh.dispatchEvent(new MouseEvent('click', { bubbles: true }))

log('② 委托在 ul 上只注册了 1 个监听器，处理了 ' + handled.length + ' 次点击：' + handled.join(', '))
log('   最后一项是插入 DOM 后才被点击的，没有重新绑监听器也照样命中')

/* ------------------------------------------------------------------ ③ 解绑三招 */
const onceBtn = document.getElementById('once-btn')
let onceCount = 0
onceBtn.addEventListener(
    'click',
    () => {
        onceCount++
    },
    { once: true }
)
onceBtn.click()
onceBtn.click()
onceBtn.click()
log('③ { once: true }：连点 3 次，回调实际执行 ' + onceCount + ' 次')

const signalBtn = document.getElementById('signal-btn')
const ac = new AbortController()
let sigCount = 0
signalBtn.addEventListener(
    'click',
    () => {
        sigCount++
    },
    { signal: ac.signal }
)
signalBtn.click()
ac.abort()
signalBtn.click()
log('③ AbortController.signal：abort 前后各点 1 次，回调实际执行 ' + sigCount + ' 次（一次性解绑整组监听）')

/* ------------------------------------------------------------------ ④ 自定义事件 */
const toolbar = document.getElementById('toolbar')
const received = []
toolbar.addEventListener('cart:add', e => received.push(e.detail.id))

document.getElementById('add-btn').addEventListener('click', function () {
    this.dispatchEvent(new CustomEvent('cart:add', { detail: { id: 42 }, bubbles: true }))
})
document.getElementById('add-btn').click()
log('④ 按钮派发 CustomEvent("cart:add")，祖先 #toolbar 收到 detail.id = ' + received.join(', '))

/* ------------------------------------------------------------------ ⑤ 程序化事件 */
let keyboard = '(未触发)'
document.addEventListener('keydown', e => {
    if (e.key === 'Enter') keyboard = 'Enter'
})
document.getElementById('search-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
log('⑤ 用 new KeyboardEvent("keydown", { key: "Enter" }) 模拟回车，document 上的监听收到 key = ' + keyboard)

document.getElementById('probe').textContent = lines.join('\n')
