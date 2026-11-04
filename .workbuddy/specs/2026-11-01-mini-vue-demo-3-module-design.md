# mini-vue demo 三模块收敛 + lib CDN 风格增强 设计文档

日期：2026-11-01
状态：已确认（用户逐点确认：一个组件内全都要 / lib 增强 @click / lib 增强 v-for+:key / 文档合并为 3 章）

## 一、目标

demo 目录从 5 个分链路 demo 收敛为 3 个模块：

```
mini-vue/
├── lib/                      # 增强（见三）
│   ├── compiler-core.js      # @click / v-for / :key
│   └── index.js              # 浏览器装配层：mount 选择器、in-DOM 模板、app.unmount()
│                             # （runtime-core 保持平台无关，不引入 document 依赖）
└── demo/
    ├── demo-compiler.html    # 不变
    ├── demo-reactivity.html  # 不变
    ├── demo-app.html         # 新增：整体运行（CDN 风格）
    └── demo-mount / demo-diff / demo-unmount  # 删除
```

动机：整体运行 demo 要模拟 Vue 官网 CDN 的使用方式——HTML 里直接写模板，JS 里 `createApp({...}).mount('#app')`。

## 二、demo-app.html 设计

### 2.1 组件代码（页面加载即挂载）

```html
<div id="app">
  <p>{{ message }}</p>
  <p>count = {{ count }}</p>
  <button @click="increment">count + 1</button>
  <ul>
    <li v-for="t in todos" :key="t.id">{{ t.text }}</li>
  </ul>
</div>
<script>
  const { createApp, ref } = MiniVue

  createApp({
    setup() {
      const message = ref('Hello vue!')
      const count = ref(0)
      const todos = ref([
        { id: 1, text: 'a' },
        { id: 2, text: 'b' },
        { id: 3, text: 'c' }
      ])
      const increment = () => count.value++
      return { message, count, todos, increment }
    }
  }).mount('#app')
</script>
```

要点：
- 全局名保持 `window.MiniVue`（不冒充真 Vue），解构写法与官网一致
- `mount('#app')`：字符串选择器 → `document.querySelector`；容器 `innerHTML` 编译为模板后清空容器
- `{{ }}` 插值、静态属性走现有编译器能力，无需改动

### 2.2 页面层交互按钮（不在组件内，卸载后仍可用）

| 按钮 | 触发链路 | 实现方式 |
|------|---------|---------|
| 改 message | 响应式 → patchFlag=1 文本更新 | 实例代理 `message.value = ...` |
| 一次改三项 | **批处理**：同一 tick 3 次写入 → 3 次 queueJob → 去重 1 job → flushJobs 1 次 | 同时改 message、count、删一项 |
| 删首项 / 删中间项 | keyed diff（按 id 配对，LIS 最小移动） | `todos.value.splice(...)` |
| 卸载 | unmounted 钩子 + 渲染 effect stop + DOM 摘除 | `app.unmount()`（lib 新增） |
| 重挂 | 完整重新走 mount 链路 | 重新 `createApp({...}).mount('#app')` |

- 渲染区旁保留简要断点标注（模板编译时机、subTree、diff 配对、卸载钩子顺序），风格与现有 demo 一致
- 无启动按钮：页面加载即挂载（延续上一轮「加载即渲染」的约定）

## 三、lib 增强（4 处）

运行时层核实结论：`createVNode` 已提取 `props.key` → `vnode.key`，`patchProp` 已支持 `on*` 事件绑定——**diff 与事件绑定运行时无需改动**，增强全部收敛在编译器与 mount 入口。

### 3.1 mount 选择器支持（index.js 装配层）

- index.js 用包装层替代直接暴露 runtime-core 的 `createApp`：`mount(rootContainer)` 入口字符串 → `document.querySelector(container)`；元素原样使用
- runtime-core 保持平台无关（不出现 `document`），选择器解析属浏览器宿主职责（同真实 Vue 的 runtime-dom 职责划分）
- JSDoc 示例同步更新

### 3.2 in-DOM 模板（index.js 装配层）

- 组件既无 `render` 也无 `template` 时，取容器 `innerHTML` → `compile()` → 生成 render → **清空容器**（同 Vue 行为）
- `compile()` 返回 `{ ast, code, render }`，`render(h, toDisplayString, ctx)` 产物是 VNode 数组；适配层包装为组件 render：单根取 `[0]`，多根包 `Fragment`
- 模板来源与编译时机在 demo 断点标注中体现

### 3.3 compiler-core.js：@click / v-for / :key

- `@click="increment"` → props 增 `onClick: () => ctx.increment()`（parseAttrs 识别 `@xxx` / `v-on:xxx`，generate 生成事件表达式）
- `v-for="t in todos"` → `...ctx.todos.map(t => h("li", {...}, ...))`（parse 识别指令、generate 生成 map 展开；指令不落 attrs）
- `:key="t.id"` → `{ key: t.id }`（动态属性绑定 `:xxx` / `v-bind:xxx`，值按表达式生成）
- **作用域规则**：编译器维护「循环变量集合」，生成表达式时循环变量走裸引用，其余标识符走 `ctx.` 前缀（与现有插值规则一致）
- 表达式支持范围：简单表达式（方法调用、成员/自增、属性访问），与现有插值的 `ctx.` 前缀改写同一套逻辑
- 每个函数补 JSDoc（作用 / 参数 / 输入输出示例），风格与 lib 现有注释一致

### 3.4 createApp 返回 `{ mount, unmount }`（index.js 装配层）

- `unmount()`：对根组件调内部 `unmount(vnode, true)`（unmounted 钩子 → effect.stop → DOM 摘除）
- 重挂 = 重新 `createApp().mount()`，天然走完整链路

### 3.5 patchKeyedChildren 补全 LIS（runtime-core.js）

现状：五步框架完整（头尾同步 / 新增 / 删除 / key 索引增删判定 / 锚点插入），但中间乱序段是「从后往前逐个 insert」的简化版，缺最长递增子序列——面试核心考点。

补全为真实 Vue 同款：

- `getSequence(nums)`：O(n log n) 贪心 + 二分 + 前驱回溯的 LIS（返回递增下标序列），独立函数 + 完整 JSDoc
- 第 5 步改造：
  1. 建 `keyToNewIndexMap`（已有）
  2. 遍历旧中间段：查表 → `newIndexToOldIndexMap` source 数组（查不到记 0，待挂载）+ 计 moved 标记
  3. source 全 0 段先 mount 新增节点（从后往前）
  4. moved 时算 `getSequence(source)`，LIS 命中的节点原地不动，其余节点按新列表从后往前 `hostInsert`
- 效果：`abcde → bace` 这类乱序只移动必须动的节点，宿主操作数最小
- 4.6 节文档同步更新（简化版描述 → LIS 版 + source 数组/LIS 计算过程实例）

## 四、文档《Vue3 原理.md》

- 「五、关键执行链路」**合并为 3 章**：
  - 5.1 编译链路（不变）
  - 5.2 响应式链路（不变）
  - 5.3 整体运行链路（原 5.3 挂载 + 5.4 diff + 5.5 卸载合并重排）
- 5.3 保留原实例走读的真实输入/输出块，按 demo-app 交互顺序重排：
  1. `mount('#app')` + innerHTML 编译产物（新增步骤：容器模板 → compile → render）
  2. setupState / subTree 真实 dump
  3. 改 message 的 patchFlag 更新
  4. 批处理：一次改三项的 queueJob 调用次数 / 去重 / flush 次数 dump
  5. 删项的四步 diff 手推 + source 数组 / LIS 结果 / 宿主操作序列
  6. 卸载钩子顺序 + 依赖清空 + 死写证据
- 全文同步：章首映射表（3 行）、断点建议、4.5/4.6/4.7 的 demo 入口指向 demo-app.html、4.6 节 diff 算法描述（简化版 → LIS 版）、措辞（加载即渲染、单组件全链路）

## 五、验证清单

1. `sync-doc-excerpts` dry-run：lib 改动后摘录同步（--apply 写回，确认干净）
2. 链接检查：demo 文件删增影响的文档链接（含 4.5/4.6/4.7、五章、总结.md）
3. 侧边栏覆盖检查
4. 3 个 demo：vm 冒烟（node vm + DOM 桩）→ 8899 浏览器实测（注意 -c-1、URL 不带 /frontend/vue/ 前缀）
5. VitePress 构建回归

## 六、不做的事

- 不增强 `v-if` / `v-model` / 组件指令等（demo 用不到）
- 不改 demo-compiler.html / demo-reactivity.html
- 全局名不改成 `Vue`
- 不新增目录结构约定之外的文件
