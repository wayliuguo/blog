// engine.js — mini-lowcode 引擎：协议校验 / 表达式沙箱 / 递归渲染 / 联动清值 / 出码
// 与 lowcode-lab 探针同源：沙箱与渲染逻辑见《渲染引擎》篇，协议校验见《协议与 schema 设计》篇
import { ref } from 'vue'

// ---------- 物料协议：一份描述三用（校验 / 属性面板 / 文档） ----------
export const REGISTRY = {
  Page: { props: {} },
  Banner: {
    props: {
      title: { type: 'string', required: true },
      vip: { type: 'expression', label: '仅会员可见' },
    },
  },
  Text: {
    props: {
      text: { type: 'expression', label: '文本' },
    },
  },
  List: {
    props: {
      title: { type: 'string', label: '标题' },
    },
  },
  Button: {
    props: {
      text: { type: 'string', required: true },
      size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' },
    },
  },
  Input: {
    props: {
      placeholder: { type: 'string' },
      srcType: { type: 'enum', options: ['url', 'upload'], default: 'url' },
      url: { type: 'string', visibleWhen: 'srcType === "url"', label: '图片地址' },
      fileId: { type: 'string', visibleWhen: 'srcType === "upload"', label: '文件 ID' },
    },
  },
}

// ---------- 协议校验：必填 / 枚举 / 未注册，与《协议与 schema 设计》篇同源 ----------
export function validateNode(node, reg = REGISTRY) {
  const meta = reg[node.type]
  if (!meta) return [`未注册组件：${node.type}`]
  const errors = []
  for (const [key, def] of Object.entries(meta.props)) {
    const v = node.props ? node.props[key] : undefined
    if (v === undefined || v === '') {
      if (def.required) errors.push(`${node.id}: ${key} 必填`)
      continue
    }
    if (def.type === 'string' && typeof v !== 'string') errors.push(`${node.id}: ${key} 期望 string`)
    if (def.type === 'enum' && def.values && !def.values.includes(v)) errors.push(`${node.id}: ${key} 不在枚举 [${def.values}] 内`)
  }
  ;(node.children || []).forEach(c => errors.push(...validateNode(c, reg)))
  return errors
}

// ---------- 表达式软沙箱：with + Proxy 挡 window/process（严格模式禁 with，本文件未开） ----------
export function evaluate(expr, scope) {
  const guard = new Proxy(scope, {
    has: () => true,
    get: (t, k) => {
      if (typeof k === 'symbol') return t[k]
      if (!(k in t)) throw new Error(`表达式禁止访问：${String(k)}`)
      return t[k]
    },
  })
  const fn = new Function('__scope', `with (__scope) { return (${expr}); }`)
  return fn(guard)
}

// ---------- 递归渲染：条件剪枝 / 循环展开（容器保留、子项 id 带下标） ----------
export function renderNode(node, scope, stats = { visited: 0 }) {
  stats.visited++
  if (node.when !== undefined && !evaluate(node.when, scope)) return null
  const props = {}
  for (const [k, v] of Object.entries(node.props || {})) props[k] = resolveValue(v, scope)
  if (node.loop !== undefined) {
    const items = evaluate(node.loop, scope) || []
    return {
      id: node.id,
      type: node.type,
      props,
      _loop: node.loop, // 渲染树保留 loop 标记，画布按容器渲染（原始 schema 仍由出码直接读取）
      children: items.flatMap((item, index) =>
        (node.children || [])
          .map(c => renderNode(c, { ...scope, item, index }, stats))
          .filter(Boolean)
          .map(n => ({ ...n, id: `${n.id}#${index}` }))
      ),
    }
  }
  return {
    id: node.id,
    type: node.type,
    props,
    children: (node.children || []).map(c => renderNode(c, scope, stats)).filter(Boolean),
  }
}

function resolveValue(v, scope) {
  if (typeof v === 'string' && /^(state|item|index)\b/.test(v)) return evaluate(v, scope)
  return v
}

// ---------- 属性面板联动：不可见字段连带清值（提交时清洗） ----------
export function normalizeProps(values, type, reg = REGISTRY) {
  const out = {}
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined) continue // 字段描述存在但草稿里无值：不写入，避免出码出现 {undefined}
    const def = (reg[type] && reg[type].props[k]) || {}
    if (def.visibleWhen) {
      const keys = Object.keys(values)
      let ok = false
      try {
        ok = new Function('values', `const { ${keys.join(', ')} } = values; return (${def.visibleWhen});`)(values)
      } catch {
        ok = false
      }
      if (!ok) continue
    }
    out[k] = v
  }
  return out
}

// ---------- 出码：表达式与字面量分道、循环补 key、条件编译三元 ----------
export function serializeProp(v) {
  if (typeof v === 'string' && /^(state|item|index)\b/.test(v)) return `{${v}}`
  if (typeof v === 'string') return JSON.stringify(v)
  return `{${JSON.stringify(v)}}`
}

export function codegen(node, depth = 0) {
  const pad = '  '.repeat(depth)
  const meta = REGISTRY[node.type] || {}
  const props = Object.entries(node.props || {})
    .map(([k, v]) => ` ${k}=${serializeProp(v)}`)
    .join('')
  const children = node.children || []
  let inner = ''
  if (node.loop) {
    const body = children.map(c => codegen({ ...c, props: { key: 'index', ...(c.props || {}) } }, depth + 2)).join('\n')
    inner = `\n${pad}  {${node.loop}.map((item, index) => (\n${body}\n${pad}  ))}\n${pad}`
  } else if (children.length) {
    inner = `\n${children.map(c => codegen(c, depth + 1)).join('\n')}\n${pad}`
  }
  const selfClose = !inner && children.length === 0 && !meta.hasChildren
  if (node.when !== undefined) {
    const body = selfClose ? `${pad}  <${node.type}${props} />` : `${pad}  <${node.type}${props}>${inner}\n${pad}`
    return `${pad}{${node.when} ? (\n${body}\n${pad}  ) : null}`
  }
  if (selfClose) return `${pad}<${node.type}${props} />`
  return `${pad}<${node.type}${props}>${inner}\n${pad}</${node.type}>`
}

// ---------- 撤销重做：快照栈（schema 不可变替换后入栈；current 用 ref 保持响应性） ----------
export function createHistory(initial, limit = 50) {
  const past = []
  const future = []
  const current = ref(initial)
  return {
    get current() {
      return current.value
    },
    commit(next) {
      past.push(current.value)
      if (past.length > limit) past.shift()
      future.length = 0
      current.value = next
    },
    undo() {
      if (!past.length) return false
      future.push(current.value)
      current.value = past.pop()
      return true
    },
    redo() {
      if (!future.length) return false
      past.push(current.value)
      current.value = future.pop()
      return true
    },
    get canUndo() {
      return past.length > 0
    },
    get canRedo() {
      return future.length > 0
    },
  }
}
