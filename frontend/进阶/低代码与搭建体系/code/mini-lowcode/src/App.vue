<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { defaultSchema, initialState } from './schema.js'
import { REGISTRY, validateNode, renderNode, normalizeProps, codegen, createHistory } from './engine.js'

const history = createHistory(defaultSchema)
const schema = computed(() => history.current)
const state = reactive(JSON.parse(JSON.stringify(initialState)))
const errors = ref([])
const selectedId = ref('banner')

// 画布树：schema + state → 渲染树（每次全量；真实平台按脏子树增量，见《渲染引擎》篇三）
const canvas = ref(null)
function repaint() {
  errors.value = validateNode(schema.value)
  canvas.value = renderNode(schema.value, { state })
}
watch(schema, repaint, { immediate: true, deep: true })

const stats = computed(() => {
  const s = { visited: 0 }
  renderNode(schema.value, { state }, s)
  return s
})

const code = computed(() => codegen(schema.value))

// ---------- 属性面板 ----------
const selected = computed(() => {
  let hit = null
  ;(function walk(n) {
    if (n.id === selectedId.value) hit = n
    ;(n.children || []).forEach(walk)
  })(schema.value)
  return hit
})
const propFields = computed(() => {
  const type = selected.value && selected.value.type
  return type && REGISTRY[type] ? Object.entries(REGISTRY[type].props) : []
})
const draft = ref({})
watch(selected, sel => {
  draft.value = { ...(sel ? sel.props : {}) }
}, { immediate: true })

function commitProps() {
  const node = selected.value
  if (!node) return
  const cleaned = normalizeProps(draft.value, node.type)
  // 不可见字段连带清值后，还要把「被清掉」的字段从节点上真正移除
  const next = JSON.parse(JSON.stringify(schema.value))
  let target = null
  ;(function walk(n) {
    if (n.id === node.id) target = n
    ;(n.children || []).forEach(walk)
  })(next)
  if (target) target.props = cleaned
  history.commit(next)
}

// ---------- 结构操作：新增 / 删除（拖拽落点与环检测见《编辑器与出码》篇探针） ----------
function addNode(type) {
  let n = 1
  const ids = new Set()
  ;(function walk(node) {
    ids.add(node.id)
    ;(node.children || []).forEach(walk)
  })(schema.value)
  while (ids.has(`${type.toLowerCase()}${n}`)) n++
  const next = JSON.parse(JSON.stringify(schema.value))
  next.children.push({ id: `${type.toLowerCase()}${n}`, type, props: {} })
  history.commit(next)
}
function removeNode(id) {
  const next = JSON.parse(JSON.stringify(schema.value))
  next.children = next.children.filter(c => c.id !== id)
  history.commit(next)
}
</script>

<template>
  <div class="layout">
    <header class="bar">
      <strong>mini-lowcode</strong>
      <span class="hint">schema 驱动 · 表达式沙箱 · 联动清值 · 出码</span>
      <span class="ops">
        <button :disabled="!history.canUndo" @click="history.undo()">撤销</button>
        <button :disabled="!history.canRedo" @click="history.redo()">重做</button>
        <select @change="addNode($event.target.value); $event.target.value = ''">
          <option value="" disabled selected>+ 添加物料</option>
          <option v-for="(meta, type) in REGISTRY" :key="type" :value="type">{{ type }}</option>
        </select>
      </span>
    </header>

    <main class="cols">
      <section class="canvas">
        <div class="panel-title">画布（点击选中 · {{ stats.visited }} 节点渲染）</div>
        <div v-if="errors.length" class="errors">
          <div v-for="e in errors" :key="e" class="err">{{ e }}</div>
        </div>
        <template v-if="canvas">
          <div
            v-for="child in canvas.children"
            :key="child.id"
            class="node"
            :class="{ selected: child.id === selectedId }"
            @click="selectedId = child.id"
          >
            <span class="tag">{{ child.type }}</span>
            <template v-if="child.type === 'Banner'">
              <div class="banner">{{ child.props.title }} <em v-if="child.props.vip">VIP 专属</em></div>
            </template>
            <template v-else-if="child._loop">
              <div class="list-title">{{ child.props.title }}</div>
              <div v-for="c in child.children" :key="c.id" class="list-item">{{ c.props.text }}</div>
            </template>
            <template v-else-if="child.type === 'Input'">
              <input class="fake-input" :placeholder="child.props.placeholder" disabled />
              <div v-if="child.props.url" class="mini">url: {{ child.props.url }}</div>
              <div v-else-if="child.props.fileId" class="mini">fileId: {{ child.props.fileId }}</div>
            </template>
            <template v-else-if="child.type === 'Button'">
              <button class="fake-btn" :class="'size-' + (child.props.size || 'md')">{{ child.props.text }}</button>
            </template>
            <template v-else-if="child.type === 'Text'">
              {{ child.props.text }}
            </template>
            <button class="del" title="删除" @click.stop="removeNode(child.id)">×</button>
          </div>
        </template>
      </section>

      <section class="props">
        <div class="panel-title">属性面板（{{ selected ? selected.type : '未选中' }}）</div>
        <template v-if="selected">
          <label v-for="[key, def] in propFields" :key="key" class="field">
            <span class="field-name">{{ def.label || key }}<em v-if="def.required">*</em></span>
            <select v-if="def.type === 'enum'" v-model="draft[key]">
              <option v-for="v in def.values || def.options" :key="v" :value="v">{{ v }}</option>
            </select>
            <input v-else v-model="draft[key]" :placeholder="key" />
            <small v-if="def.visibleWhen" class="dep">联动：{{ def.visibleWhen }}</small>
          </label>
          <button class="apply" @click="commitProps">应用（不可见字段连带清值）</button>
        </template>
        <p v-else class="hint">点击画布中的节点</p>
      </section>

      <section class="code">
        <div class="panel-title">出码预览（表达式 {} / 字面量 "" / 循环自动补 key）</div>
        <pre>{{ code }}</pre>
      </section>
    </main>
  </div>
</template>

<style>
* { box-sizing: border-box; margin: 0; }
body { font: 13px/1.6 'Segoe UI', 'Microsoft YaHei', sans-serif; background: #f0f2f5; }
.layout { display: flex; flex-direction: column; height: 100vh; }
.bar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: #1f2937; color: #fff; }
.bar .hint { color: #9ca3af; }
.bar .ops { margin-left: auto; display: flex; gap: 8px; }
.bar button { cursor: pointer; }
.cols { flex: 1; display: grid; grid-template-columns: 1fr 280px 1fr; gap: 12px; padding: 12px; min-height: 0; }
.cols section { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; overflow: auto; }
.panel-title { font-weight: 600; margin-bottom: 10px; color: #374151; }
.node { position: relative; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; cursor: pointer; }
.node.selected { border-color: #2563eb; box-shadow: 0 0 0 2px #bfdbfe; }
.node .tag { position: absolute; top: -9px; left: 8px; background: #64748b; color: #fff; font-size: 11px; padding: 0 6px; border-radius: 3px; }
.node .del { position: absolute; top: 4px; right: 4px; border: none; background: transparent; color: #94a3b8; cursor: pointer; }
.banner { background: linear-gradient(90deg, #6366f1, #a855f7); color: #fff; padding: 14px; border-radius: 6px; font-size: 16px; }
.banner em { font-size: 12px; background: rgba(255, 255, 255, 0.25); padding: 1px 6px; border-radius: 3px; }
.list-title { font-weight: 600; margin-bottom: 4px; }
.list-item { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
.fake-input { width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; }
.mini { color: #9ca3af; font-size: 12px; margin-top: 2px; }
.fake-btn { border: none; background: #2563eb; color: #fff; border-radius: 6px; cursor: pointer; }
.size-sm { padding: 4px 10px; }
.size-md { padding: 6px 16px; }
.size-lg { padding: 9px 24px; font-size: 15px; }
.errors { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 6px; padding: 6px 10px; margin-bottom: 8px; }
.props .field { display: block; margin-bottom: 10px; }
.field-name { display: block; color: #4b5563; margin-bottom: 2px; }
.field-name em { color: #ef4444; }
.field input, .field select { width: 100%; padding: 5px 8px; border: 1px solid #d1d5db; border-radius: 6px; }
.field .dep { color: #9ca3af; }
.apply { width: 100%; padding: 7px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
.code pre { font: 12px/1.5 Consolas, monospace; background: #0f172a; color: #e2e8f0; padding: 10px; border-radius: 6px; white-space: pre-wrap; }
</style>
