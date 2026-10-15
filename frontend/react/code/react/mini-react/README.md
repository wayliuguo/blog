# mini-react

一个能跑通的 React 最小实现，零依赖、约 400 行：

```
createElement（虚拟 DOM）→ host（宿主抽象）→ reconciler（Fiber 树 / diff / 两阶段提交）→ hooks（链表）
```

目标不是"复刻 React"，而是把 React 高级篇里那几句话（render/commit 两阶段、Fiber 链表、双缓存、时间切片、Hooks 按调用顺序存取）落到可以单步观察的代码上。

## 运行

```bash
npm run step:element   # createElement 产出的是什么
npm run step:mount     # 首次渲染到宿主节点
npm run step:keyed     # 有 key / 无 key 的 diff 对照（数宿主操作）
npm run step:hooks     # state 更新、effect 时机、批处理、顺序错位
npm run step:slice     # 时间切片实测：片数、最长阻塞
npm test               # 26 个单测（node:test，零依赖）
```

## 脚本 × 篇目对照

| 命令 | 覆盖现象 | 关键实测 |
| ---- | ---- | ---- |
| `step:element` | children 进 `props.children`、文本被包成节点、`key` 不污染 props | `1+1` 变成文本节点 `"2"`；`Fragment` 是 Symbol |
| `step:mount` | 函数组件与 Fragment 不产生 DOM | 两个 `span` 直接挂在容器下 |
| `step:keyed` | 删掉列表第一项 | 无 key：3 次宿主操作（1 删 + 2 就地改写）；有 key：1 次 |
| `step:hooks` | 更新队列、effect 清理、批处理 | 同步模式两次 `setState` = 两轮 effect；异步调度合并成一轮 |
| `step:slice` | 时间切片 | 4000 项列表（8002 个宿主节点）：最长阻塞 18.1 ms → 5.8 ms，11 片 |
| `npm test` | 上述行为全部固化成断言 | 26 passed |

## 目录

```
src/
├── element.js      createElement / Fragment / TEXT_ELEMENT
├── host.js         宿主抽象：6 个操作 + Node 用假 DOM + printTree
├── internal.js     渲染器状态（roots / wipRoot / nextUnitOfWork）与重渲染调度
├── reconciler.js   Fiber 链表、workLoop 时间切片、diff、commit
├── hooks.js        useState / useEffect / runEffects / runCleanups
└── index.js        对外出口 + printFibers
steps/              五个可单跑的观察脚本
test/               element / render / diff / hooks 四组单测（helper.js 记录宿主操作）
```

## 与真实 React 的差距（有意省略）

- **事件系统**：没有合成事件与事件委托，`onClick` 只是被写进 attrs
- **优先级调度**：只有"时间切片 + 切到底"，没有 Lane 模型与 `startTransition`
- **组件能力**：没有 Context、ref / forwardRef、memo / useMemo / useCallback / useReducer、错误边界、Suspense
- **其他**：没有服务端渲染、没有 `StrictMode` 双调用、没有 `setState` 的浅比较跳过

这些省略不会影响上面那几个核心结论，但会让"把这份代码改成生产可用"变成另一件事。

## 已知取舍

- **同步模式 vs 异步模式**：`render(el, container, { sync: true })` 一次跑完，脚本与测试用它才可复现；默认走 `requestIdleCallback`，此时同一轮里的多次 `setState` 会被合并成一次渲染。
- **`manual: true`**：渲染器不自己调度，由调用方驱动 `workLoop(deadline)`，用来观察切片行为（见 `step:slice`）。
- **假 DOM**：Node 里没有 DOM，`host.js` 内置一个只有"元素节点 + 文本节点"的最小实现。渲染器只依赖那 6 个操作，所以换成浏览器 DOM 只是 `host` 换一份实现。
