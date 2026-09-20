// model.cjs — 编辑器内核探针：位置映射 / 选区归一化 / 操作合并
'use strict'
const assert = require('node:assert')

// ---------- 场景一：位置映射——别人的编辑进来，我的光标该去哪 ----------
// 编辑器里所有「光标乱跳」的 bug 都出在这一步：文档变了，位置必须跟着变。
function transformPosition(pos, op) {
    if (op.type === 'insert') {
        // 规则：插入点在光标之前（或正好在光标处且光标要留在原字符前）→ 光标右移
        return pos <= op.at ? pos : pos + op.text.length
    }
    // delete：光标在区间左侧不动，右侧左移，区间内被拉到区间起点
    if (pos <= op.at) return pos
    if (pos >= op.at + op.len) return pos - op.len
    return op.at
}

{
    const doc = 'hello world'
    assert.equal(transformPosition(0, { type: 'insert', at: 0, text: 'x' }), 0, '光标在最左，头部插入不影响它')
    assert.equal(transformPosition(5, { type: 'insert', at: 0, text: 'xy' }), 7, '插入点在光标左侧 → 右移 2')
    assert.equal(transformPosition(5, { type: 'insert', at: 5, text: 'xy' }), 5, '正好插在光标处 → 光标停在原字符前')
    assert.equal(transformPosition(5, { type: 'insert', at: 9, text: 'xy' }), 5, '插入点在光标右侧 → 不动')
    assert.equal(transformPosition(2, { type: 'delete', at: 5, len: 3 }), 2)
    assert.equal(transformPosition(8, { type: 'delete', at: 5, len: 3 }), 5)
    assert.equal(transformPosition(6, { type: 'delete', at: 5, len: 3 }), 5, '光标在被删区间内 → 拉到区间起点')
    console.log('[1] 位置映射：插入按左右分治、删除按三段（左不动 / 右左移 / 区间内拉回起点）')
}

// ---------- 场景二：选区归一化——anchor/head 无序，跨块要收敛 ----------
// 用户可以从右往左拖，选区必须归一化成「起点 ≤ 终点」；块索引越界要裁剪而不是抛错。
const doc = [
    { id: 'b1', text: '标题' },
    { id: 'b2', text: '第一段' },
    { id: 'b3', text: '第二段' }
]

function normalizeSelection(sel, blocks) {
    let { anchorBlock, anchorOffset, headBlock, headOffset } = sel
    anchorBlock = Math.max(0, Math.min(anchorBlock, blocks.length - 1))
    headBlock = Math.max(0, Math.min(headBlock, blocks.length - 1))
    anchorOffset = Math.max(0, Math.min(anchorOffset, blocks[anchorBlock].text.length))
    headOffset = Math.max(0, Math.min(headOffset, blocks[headBlock].text.length))
    let forward = true
    if (anchorBlock > headBlock || (anchorBlock === headBlock && anchorOffset > headOffset)) {
        // 反向拖选：整体交换，而不是只换 offset
        ;[anchorBlock, headBlock] = [headBlock, anchorBlock]
        ;[anchorOffset, headOffset] = [headOffset, anchorOffset]
        forward = false
    }
    return { anchorBlock, anchorOffset, headBlock, headOffset, forward }
}

{
    const s1 = normalizeSelection({ anchorBlock: 2, anchorOffset: 1, headBlock: 0, headOffset: 2 }, doc)
    assert.deepEqual(s1, { anchorBlock: 0, anchorOffset: 2, headBlock: 2, headOffset: 1, forward: false })
    const s2 = normalizeSelection({ anchorBlock: 0, anchorOffset: 2, headBlock: 2, headOffset: 1 }, doc)
    assert.deepEqual(s2, { anchorBlock: 0, anchorOffset: 2, headBlock: 2, headOffset: 1, forward: true })
    const s3 = normalizeSelection({ anchorBlock: 0, anchorOffset: 99, headBlock: 9, headOffset: 0 }, doc)
    assert.deepEqual(
        s3,
        { anchorBlock: 0, anchorOffset: 2, headBlock: 2, headOffset: 0, forward: true },
        '越界裁剪到块末尾'
    )
    console.log('[2] 选区归一化：反向拖选整体交换并标记 forward=false；越界 offset 与块索引裁剪到合法范围')
}

// ---------- 场景三：操作合并——否则历史栈会被每个字符撑爆 ----------
// 连续输入不合并，打一句话就是几十条 op：撤销要按几十次，协同要传几十条消息。
function tryMerge(prev, next) {
    if (!prev || !next) return null
    if (prev.type !== 'insert' || next.type !== 'insert') return null
    if (prev.at + prev.text.length !== next.at) return null // 位置必须相接
    if (prev.client !== next.client) return null // 不同人的输入不合并（合并会破坏 OT 的因果）
    return { type: 'insert', at: prev.at, text: prev.text + next.text, client: prev.client }
}

{
    assert.deepEqual(
        tryMerge(
            { type: 'insert', at: 0, text: 'he', client: 'A' },
            { type: 'insert', at: 2, text: 'llo', client: 'A' }
        ),
        {
            type: 'insert',
            at: 0,
            text: 'hello',
            client: 'A'
        }
    )
    assert.equal(
        tryMerge({ type: 'insert', at: 0, text: 'he', client: 'A' }, { type: 'insert', at: 5, text: 'x', client: 'A' }),
        null,
        '位置不相接 → 不合并'
    )
    assert.equal(
        tryMerge({ type: 'insert', at: 0, text: 'he', client: 'A' }, { type: 'insert', at: 2, text: 'x', client: 'B' }),
        null,
        '不同客户端 → 不合并'
    )

    // 模拟一次输入：逐字符进来，历史里最终只留 1 条
    let history = []
    for (const ch of ['h', 'e', 'l', 'l', 'o']) {
        const op = {
            type: 'insert',
            at: history.length ? history[history.length - 1].at + history[history.length - 1].text.length : 0,
            text: ch,
            client: 'A'
        }
        const merged = tryMerge(history[history.length - 1], op)
        if (merged) history[history.length - 1] = merged
        else history.push(op)
    }
    assert.equal(history.length, 1)
    assert.equal(history[0].text, 'hello')
    console.log('[3] 操作合并：逐字符输入 5 次 → 历史只剩 1 条 op；跨客户端与不相接位置不合并')
}

console.log('model.cjs 全部通过')
