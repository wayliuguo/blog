# mini-vue 分层拆分与交互 demo 设计

- 日期：2026-10-22
- 状态：已确认（用户逐项确认：先 Vue3 后其它 / 交互页面为主 / script 标签加载 / 方案 A）
- 范围：本次只做 Vue3 原理篇；Pinia / Router 后续阶段复用同一模式，本次不动

## 1. 背景与目标

现状：`frontend/vue/code/vue3/mini-vue.html`（52KB）是单文件自包含——实现 + 控制台 demo + 断点入口混在一个文件里，「层级」只靠文件内分区注释表达；`Vue Router 原理.md` / `Vue3 状态管理原理与实现.md` 同模式。

目标：

1. mini-vue 以纯 JS 实现，**像 Vue3 一样分编译 / 运行时 / 响应式层级**（独立文件，对应源码包结构）
2. **多个不同主题的 demo HTML** 各自通过 `<script>` 引入 mini-vue，对各个原理做**交互式演示**（可视化 + 调用日志 + 可断点）
3. 文档 `Vue3 原理.md` 配套更新：引用指向新文件、每个关键函数补「输入 / 输出 / 处理过程」表、配套代码节重写
4. 功能覆盖与现有文档对齐，不缩减（现有文档的机制 mini-vue 拆分版都要有对应实现）

## 2. 文件组织（方案 A）

```
frontend/vue/code/vue3/
├── mini-vue/
│   ├── shared.js          # ShapeFlags、isObject/isArray/isString/isFunction/hasChanged/extend
│   ├── reactivity.js      # reactive / ref / effect / computed / watch（track/trigger/依赖清理）
│   ├── compiler-core.js   # parse → transform → generate（模板 → render 函数，静态标记）
│   ├── runtime-core.js    # h / createVNode / shapeFlag / patch / keyed diff / 组件实例化 / 生命周期 / props / slots / provide-inject / queueJob 批处理
│   └── index.js           # 聚合：createApp 入口，按依赖顺序挂 window.MiniVue
└── demos/
    ├── demo-reactivity.html
    ├── demo-compiler.html
    ├── demo-runtime.html
    └── demo-app.html
```

- 旧 `mini-vue.html` 删除（被新结构完整替代）
- 加载方式：demo 用多个 `<script>` 标签按序引入 `shared → reactivity → compiler-core → runtime-core → index`，保持「双击直接打开」零依赖体验（不用 ES module，避免 file:// CORS 限制）
- 全局命名空间：`window.MiniVue = { reactive, ref, effect, computed, watch, compile, h, createApp, ... }`
- 每个 JS 文件头注释标明：对应 Vue3 源码哪个包、被谁依赖、依赖谁——文档一.1 的模块协作关系直接体现在文件结构上（`reactivity` 零依赖；`runtime-core` 依赖 `reactivity` + `shared`；`compiler-core` 依赖 `shared`；`index` 串全部）

## 3. 层级拆分的功能映射（与现有 mini-vue.html 对齐）

| 新文件 | 收编现有分区 | 必须覆盖的机制（对应 Vue3 原理.md 章节） |
| --- | --- | --- |
| shared.js | ① shared | ShapeFlags 位标记（4.3）、类型判断工具（3.10） |
| reactivity.js | ② 响应式核心 | reactive 惰性深度代理（3.1）、track（3.2）、trigger（3.3）、ReactiveEffect + effect 栈 + cleanup（3.4）、ref（3.5）、computed 脏标记（3.7）、watch（3.8） |
| compiler-core.js | ⑥ 编译模块 | parse 模板 → AST（2.2）、transform 静态标记（2.3）、generate → new Function render |
| runtime-core.js | ③④⑤ 运行时各分区 | h/createVNode（4.2）、shapeFlag 判定（4.3）、组件实例化与 setup（4.4）、mount/patch/unmount（4.5）、keyed diff 头尾同步五步（4.6）、生命周期（4.7）、props/slots（4.8）、provide/inject（4.9）、queueJob 批处理（正文 1.2 协作） |
| index.js | 组装 | createApp：compiler + runtime + reactivity 三层串联（即一.1 协作关系的可运行证明） |

拆分纪律：代码以现有 mini-vue.html 为基线**搬运重组 + 分区注释保留**（断点提示不丢），只做文件边界的最小调整，不重写实现逻辑；demo 需要而现有实现没有的少量缺口（如 watch 若缺）补齐。

## 4. demo 设计（交互页面为主）

每个 demo 三合一：交互操作 → 可视效果 + 关键函数调用日志 → 可 F12 断点；页面按演示步骤分区；顶部保留「建议断点」提示条；日志区打印内部函数调用（track / trigger / patch / queueJob 等）。

| demo | 对应文档章节 | 交互区块 |
| --- | --- | --- |
| demo-reactivity.html | 三、响应式系统 3.1~3.9 | 改 reactive 状态看 track/trigger 日志与页面联动；分支切换看 cleanup；computed 缓存命中/失效计数；ref 区块；watch 区块 |
| demo-compiler.html | 二、编译原理 2.2~2.3 | textarea 输入模板（预置插值/指令/静态节点）→「编译」→ 逐步展示 AST JSON → transform 后标记 → generate 代码 →「执行」挂载 |
| demo-runtime.html | 四、运行时原理 4.2~4.6 | 左右两列 VNode 树「旧/新」→「diff」逐步日志展示 patch 判定与 keyedChildren 五步；有 key / 无 key 对比区 |
| demo-app.html | 四.4 / 4.7~4.9 + 一.1 | 计数器（+1 看组件更新、连点 3 次看 queueJob 只渲一次）；todo 列表（增删改走 keyed diff）；生命周期时间线；卸载/重挂；provide/inject 区块 |

## 5. 文档配套（Vue3 原理.md）

1. 篇首声明改写：从「自包含调试入口」改为「分层实现 `mini-vue/` + 交互 `demos/`」，附文件依赖关系
2. 全部「摘自 mini-vue.html」引用按新路径更新（`> 摘自 ./code/vue3/mini-vue/reactivity.js` 等，按机制归属文件）
3. **关键函数流水线呈现（新增核心诉求，替代 I/O 表）**：每个模块章（编译 / 响应式 / 运行时）开头给一张 **ASCII 数据流总纲图**——展示「输入 ⇒ 关键函数链 ⇒ 中间产物 ⇒ … ⇒ 最终输出」，图上标注每一步进出的数据形态；正文各机制节保留「摘自」代码，代码后用紧凑注释块（非表格）标注该函数的输入 / 输出 / 过程。编译章示例：

   ```
   '<div>{{ msg }}</div>'            模板字符串（编译输入）
           │
           ▼
       parse(template) ──────────► AST
           │                       { type: 'Element', tag: 'div',
           │                         children: [ { type: 'Interpolation', ... } ] }
           ▼
       transform(ast) ───────────► 标记后的 AST
           │                       静态节点提升、动态插值打 patchFlag
           ▼
       generate(ast) ────────────► render 代码字符串
           │                       "const { toDisplayString: ... } = ..."
           ▼
       new Function(code) ───────► 可执行 render 函数
           │
           ▼
       render() ─────────────────► VNode 树（交给运行时 patch）
   ```

   正文函数注释块示例：

   ```
   track(target, key)
     输入: target 目标对象、key 属性名
     输出: void（副作用：activeEffect 进入该 key 的 dep）
     过程: targetMap → depsMap → dep.add(activeEffect)，并反向记录到 effect.deps（供 cleanup）
   ```

4. 篇末「配套代码」节重写：文件清单表 + demo ↔ 章节对照表
5. 「总结.md」第 4 节配套路径同步更新

## 6. 验证方式

- 4 个 demo 逐个浏览器打开实测：交互按钮生效、日志输出正确、无控制台报错
- 三件套校验：`check-links.cjs` → `check-sidebar-coverage.cjs` → VitePress 构建
- `check-code-sync.cjs` 如有 vue 模块映射需同步更新

## 7. 不做的事（YAGNI）

- 不引入打包工具、TypeScript、ES module import（保持零依赖、双击打开）
- 不动 Pinia / Router 两篇（后续阶段同模式处理：`mini-pinia/` 依赖 `mini-vue/reactivity.js`、`mini-router/` 独立实现 + 各自 demo + 文档配套）
- 不扩充 mini-vue 功能面（transition / teleport / suspense 等不进范围）
- 不改 Vue3 原理.md 正文的知识叙述结构（只动配套引用与新增 I/O 表）
