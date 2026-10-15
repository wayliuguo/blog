# mini-vue

一个能跑通的 Vue3 最小实现，零依赖、约 1100 行：

```
reactivity（Proxy + track/trigger）→ runtime-core（vnode / scheduler / renderer / component）→ runtime-dom（宿主操作）
```

目标不是"复刻 Vue3"，而是把 Vue3 原理篇里那几句话（三层依赖表、惰性深度代理、computed 的脏标记、`createRenderer` 注入宿主操作、shapeFlag 位运算分发、头尾同步的列表 diff、scheduler 微任务批量更新）落到可以单步观察的代码上。

## 运行

```bash
npm run step:reactivity   # 依赖收集与触发、惰性深度代理、增删属性
npm run step:effect       # scheduler、分支依赖清理、stop、computed 惰性
npm run step:renderer     # 两个宿主（假 DOM / 字符串）跑同一份 render
npm run step:diff         # 有 key / 无 key 的宿主操作次数对照
npm run step:component    # 挂载、批处理、只读 props、跳过子渲染、卸载
npm test                  # 26 个单测（node:test，零依赖）
```

## 脚本 × 篇目对照

| 命令 | 覆盖现象 | 关键实测 |
| ---- | ---- | ---- |
| `step:reactivity` | 依赖只认"读过"、惰性深度代理、属性增删与数组下标 | 改没人读过的属性：0 次触发；dep 是 Set，一个属性可被多个 effect 依赖 |
| `step:effect` | scheduler 排期、分支切换清理、`stop`、computed 惰性 | 改三次 count → 队列攒 3 个 job；改旧分支属性 0 次触发；computed getter 只在被读时重算 |
| `step:renderer` | 平台无关：假 DOM 与字符串宿主 | 9 个宿主操作调用次数逐项相同（createElement 3 / setElementText 2 / insert 3 / patchProp 1） |
| `step:diff` | 删首项、纯重排 | 无 key 5 次（4 改写 + 1 删）vs 有 key 1 次；纯重排无 key 6 次全改写 vs 有 key 3 次全搬移 |
| `step:component` | 渲染 effect + 微任务批处理、props 只读、卸载 stop | 同一 tick 改三次 → 渲染 1 次，DOM 在 `nextTick` 之后才变 |
| `npm test` | 上述行为全部固化成断言 | 26 passed |

## 目录

```
src/
├── shared/index.js            类型判断 + ShapeFlags
├── reactivity/
│   ├── effect.js              ReactiveEffect / effect / track / trigger / stop
│   ├── reactive.js            reactive / readonly / shallowReadonly（含代理缓存）
│   ├── ref.js                 RefImpl / ref / unref / proxyRefs
│   ├── computed.js            脏标记 + scheduler 实现的惰性 computed
│   └── index.js               出口
├── runtime-core/
│   ├── vnode.js               createVNode / h / Text / Fragment / normalizeVNode
│   ├── scheduler.js           queueJob / flushJobs / nextTick（微任务批处理）
│   ├── renderer.js            createRenderer：patch 分发 / 列表 diff / 组件挂载卸载
│   ├── component.js           组件实例、setup 代理、渲染 effect
│   ├── componentProps.js      props 浅只读、attrs 分流、slots 归一
│   └── index.js               出口
└── runtime-dom/
    ├── nodeOps.js             真实 DOM 的 8 个宿主操作
    ├── patchProp.js           事件 / property / attribute 三种属性写法
    └── index.js               createRenderer({ ...nodeOps, patchProp }) + createApp
steps/                         五个可单跑的观察脚本
test/                          reactivity / renderer / diff 三组单测 + fake-dom.js
```

## 与真实 Vue3 的差距（有意省略）

- **编译层完全没有**：没有模板解析、没有静态标记 / PatchFlags、没有 `<script setup>` 与 scoped 样式——这一份吃的是编译产物（render 函数与 VNode）
- **diff 收尾优化**：没有最长递增子序列（导致搬移次数偏多）、没有静态提升 / 事件缓存、没有 patchFlag 驱动的定向更新
- **组件能力**：没有生命周期钩子注册、没有 provide / inject、没有 `instance.mounted` 这类回调数组
- **响应式 API**：没有 `shallowReactive` / `toRaw` / `markRaw` / `watch` / `watchEffect` / `effectScope`，`computed` 不支持 setter
- **其他**：没有 Teleport / Suspense / KeepAlive、没有 SSR 水合、`flushJobs` 未按组件 id 排序

这些省略不影响上面那几条核心结论，但会让"把这份代码改成生产可用"变成另一件事。

## 已知取舍

- **假 DOM**：Node 里没有 DOM，`test/fake-dom.js` 内置一个最小实现（元素 + 文本 + 注释 + 事件 + textContent）。`nodeOps` 一行都不用改，所以同一份 `runtime-dom` 既跑在浏览器也跑在单测里。
- **Fragment 用两个空文本节点当锚点**：所以"顶层直接渲染数组"时，容器里会多出两个 `#text` 锚点；断言时按 `type !== '#text'` 过滤即可。
- **`key` 必须归一成 `null`**：写成 `props ? props.key : null` 时，有 props 无 key 的节点 `key` 是 `undefined`，`null !== undefined` 会让 `isSameVNodeType` 判成不同类型，更新退化为整棵重建。
- **教学用的调试出口**：`describeDeps()` / `resetDebug()` 依赖 `debugRegistry` 这份强引用（WeakMap 无法遍历），只为把依赖表打印出来，生产实现不需要。
