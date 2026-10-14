<script setup>
import { onUnmounted, reactive, ref } from 'vue'
import * as Y from 'yjs'
import { createChannelProvider, tombstoneView } from './doc.js'

// 两个独立 Y.Doc 实例模拟两个客户端（再开一个浏览器 tab，同一 channel 自动入会变成第三端）
function createClient(name, color) {
  const doc = new Y.Doc()
  const ytext = doc.getText('doc')
  const provider = createChannelProvider(doc, 'collab-demo', name)
  const undoManager = new Y.UndoManager(ytext) // 默认只跟踪本地事务（origin null）——撤销语义 = 只撤自己的
  provider.observe()
  // 初始内容只由客户端 A 写入：双端并发写同一句会得到两份（CRDT 对并发插入的正确行为，demo 初始化要避开）
  if (name === 'A' && ytext.length === 0) ytext.insert(0, '协同文档：在此输入文字。')
  const st = reactive({
    name,
    color,
    text: ytext.toString(),
    remoteCursor: null,
    myOps: 0,
    remoteOps: 0,
    tombstones: '',
  })
  const refresh = () => {
    st.text = ytext.toString()
    st.tombstones = tombstoneView(ytext)
  }
  ytext.observe(refresh)
  doc.on('afterTransaction', tr => {
    if (tr.local) st.myOps++
    else st.remoteOps++
  })
  refresh()

  // 编辑 → diff 出最小 insert/delete，写进 ytext（transact 默认 origin=null=本地事务 → provider 广播）
  function onInput(e) {
    const next = e.target.value
    const prev = ytext.toString()
    let p = 0
    while (p < prev.length && p < next.length && prev[p] === next[p]) p++
    let s = 0
    while (
      s < prev.length - p &&
      s < next.length - p &&
      prev[prev.length - 1 - s] === next[next.length - 1 - s]
    )
      s++
    doc.transact(() => {
      const delLen = prev.length - p - s
      if (delLen > 0) ytext.delete(p, delLen)
      const inserted = next.slice(p, next.length - s)
      if (inserted) ytext.insert(p, inserted)
    })
    provider.setCursor(e.target.selectionStart, color)
    st.remoteCursor = null
  }
  return { doc, ytext, provider, undoManager, st, onInput }
}

const A = createClient('A', '#2563eb')
const B = createClient('B', '#16a34a')

// awareness：光标互播（临时状态不进文档——否则每个光标移动都给每个人留墓碑）
A.provider.onCursor(m => (A.st.remoteCursor = m))
B.provider.onCursor(m => (B.st.remoteCursor = m))

function undo(c) {
  c.undoManager.undo()
  note(`${c.st.name} 撤销（只撤自己的编辑，对方的字原地不动）`)
}
function redo(c) {
  c.undoManager.redo()
}
const canUndo = c => c.undoManager.undoStack.length > 0
const canRedo = c => c.undoManager.redoStack.length > 0

const log = ref([])
function note(msg) {
  log.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`)
  if (log.value.length > 8) log.value.pop()
}

onUnmounted(() => {
  A.provider.destroy()
  B.provider.destroy()
})
</script>

<template>
  <div class="layout">
    <header class="bar">
      <strong>collab-app</strong>
      <span class="hint">yjs CRDT · BroadcastChannel 同步 · 撤销只撤自己的 · 墓碑可视化</span>
    </header>
    <main class="cols">
      <section v-for="c in [A, B]" :key="c.st.name" class="client" :style="{ borderColor: c.st.color }">
        <div class="head" :style="{ background: c.st.color }">
          客户端 {{ c.st.name }}
          <span class="ops">
            <button :disabled="!canUndo(c)" @click="undo(c)">撤销</button>
            <button :disabled="!canRedo(c)" @click="redo(c)">重做</button>
          </span>
        </div>
        <textarea
          :value="c.st.text"
          rows="8"
          :style="{ caretColor: c.st.color }"
          @input="c.onInput($event)"
        ></textarea>
        <div class="meta">
          本端事务 {{ c.st.myOps }} · 远端事务 {{ c.st.remoteOps }}
          <span v-if="c.st.remoteCursor" class="cursor-badge" :style="{ color: c.st.remoteCursor.color }">
            {{ c.st.remoteCursor.from === c.st.name ? '自己' : `对方 ${c.st.remoteCursor.from}` }} 光标 @{{ c.st.remoteCursor.pos }}
          </span>
        </div>
        <div class="tomb">
          <div class="tomb-title">Y.Text 字符链表（<s>删除字符成墓碑、仍在文档里</s>）</div>
          <code>{{ c.st.tombstones }}</code>
        </div>
      </section>
    </main>
    <div class="note">
      <strong>实验脚本：</strong>在 A、B 各打几个字 → 两侧实时收敛（CRDT 无中心定序，乱序到达结果一致）；
      A 撤销 → 只回退 A 的输入；删除一段文字 → 墓碑视图里字符仍在（带划线）——「协同文档只增不减」的直观来源。
      再开一个浏览器 tab 访问本页 → 第三个客户端自动入会同步。
    </div>
    <ul class="log">
      <li v-for="(l, i) in log" :key="i">{{ l }}</li>
    </ul>
  </div>
</template>

<style>
* { box-sizing: border-box; margin: 0; }
body { font: 13px/1.6 'Segoe UI', 'Microsoft YaHei', sans-serif; background: #f0f2f5; }
.layout { max-width: 1100px; margin: 0 auto; padding: 12px; }
.bar { display: flex; gap: 12px; align-items: baseline; padding: 10px 14px; background: #1f2937; color: #fff; border-radius: 8px 8px 0 0; }
.bar .hint { color: #9ca3af; font-size: 12px; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.client { background: #fff; border: 2px solid; border-radius: 8px; overflow: hidden; }
.head { color: #fff; padding: 8px 12px; display: flex; align-items: center; }
.head .ops { margin-left: auto; display: flex; gap: 6px; }
textarea { width: 100%; border: none; outline: none; padding: 10px 12px; font: 14px/1.6 inherit; resize: vertical; }
.meta { padding: 6px 12px; color: #6b7280; border-top: 1px solid #f1f5f9; font-size: 12px; }
.cursor-badge { margin-left: 8px; font-weight: 600; }
.tomb { padding: 6px 12px 10px; border-top: 1px solid #f1f5f9; }
.tomb-title { font-size: 12px; color: #9ca3af; margin-bottom: 2px; }
.tomb code { font: 12px/1.5 Consolas, monospace; color: #374151; word-break: break-all; }
.note { margin-top: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; color: #1e40af; }
.log { margin-top: 8px; padding-left: 18px; color: #6b7280; font-size: 12px; min-height: 20px; }
</style>
