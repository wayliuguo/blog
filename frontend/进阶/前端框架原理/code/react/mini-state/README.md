# mini-state

React 侧两条状态管理路线的同一份最小实现 + 绑定层，零依赖、可运行、可计数：

```
reducer + dispatch（mini-redux）→ setState + 选择器（mini-zustand）→ 绑定层（useSelector / useStore）
```

目标不是"复刻 Redux / Zustand"，而是回答一个能数出来的问题：**状态变了之后，到底有多少个组件真的重渲染？** 两条路线的差别不在 API 长相，而在"这个判断在哪一层做"。

## 运行

```bash
npm run step:reducer    # 不可变更新：为什么必须返回新对象、原地改为什么没人收到通知
npm run step:selector   # 选择器 + 引用相等：谁该重渲染、新对象选择器怎么把这一关弄丢
npm run step:binding    # 绑定层：useSelector / useStore 跑在假渲染器上的重渲染计数
npm test                # 14 个单测（node:test，零依赖）
```

## 脚本 × 篇目对照

| 命令 | 覆盖现象 | 关键实测 |
| ---- | ---- | ---- |
| `step:reducer` | reducer 纯函数、`combineReducers` 的引用短路、原地改的后果 | 改 `cart.items` 后根引用与 `cart` 切片都换新、`user` 切片原样带过；不认领的 action 返回**原引用**；原地改 → 通知 0 次 |
| `step:selector` | 选择器 + 引用相等把重渲染收敛到 1 个组件 | 挂载 1/1/1，改 `cart.items` 后 1/2/1；赋同值 → store 层通知 **0** 次；选择器返回新对象 → 无关更新也重渲染（3 次），`shallowEqual` 拦下（0 次） |
| `step:binding` | Redux 绑定（Provider/useSelector/useDispatch）与 Zustand 绑定（useStore）在假渲染器上的重渲染次数 | 改 `cart.items` → 只有订阅它的组件重渲染；不认领的 action → 0 重渲染；赋同值 → 0 重渲染；新对象选择器 → 3 次 vs `shallowEqual` 1 次 |
| `npm test` | 上述行为固化成 14 条断言 | 14 passed |

## 目录

```
src/
├── redux-like.js    createStore（dispatch + subscribe）+ combineReducers（逐片比较后短路）
├── zustand-like.js  create（setState 浅合并 + 逐键 Object.is）
├── harness.js       订阅式渲染器：subscribeWithSelector / mount / shallowEqual
├── binding.js       Redux 绑定（Provider/useSelector/useDispatch）与 Zustand 绑定（useStore）
├── demo.js          两条路线共用的状态与三个订阅切片的组件
└── index.js         对外出口
steps/               三个可单跑的观察脚本
test/                redux / zustand / binding 三份单测
```

## 与真实库的差距（有意省略）

- **Redux 侧**：没有中间件（`applyMiddleware`）、没有 `createSlice` / `configureStore`、没有 `immer` 的"写法可变但产出不可变"、没有 DevTools 时间旅行
- **Zustand 侧**：没有 `persist` / `devtools` 中间件、没有 `useSyncExternalStore`（真实 React 用它拿"撕裂安全"的订阅）、没有 selector 的记忆化
- **绑定层**：`useSelector` / `useStore` 跑在假渲染器（`mount`）上，等价真实框架里"订阅 + 选择器 + 引用相等"的位置；真实 React 多出来的是调度、渲染树与 DOM 比对

省略的这些都是在同一套骨架上加的一层：中间件是"包一层 dispatch"，`immer` 是"用 Proxy 记录改动再产出新对象"，`useSyncExternalStore` 换的是订阅的取值时机。核心那三个判断——**新引用算不算变了、切片相等要不要跳过、谁该重渲染**——都在上面的代码里。

## 已知取舍

- **`dispatch` 一律通知**：忠实照搬 Redux（订阅回调不判断"这次更新跟谁有关"），收敛责任交给选择器；这样才看得出"选择器"这一层到底在省什么。
- **`setState` 只做一层比较**：`{ cart: { items: 1 } }` 每次都是新对象，即使内容相同也算变了（现实里由 `immer` / 手写 `Object.is` 逐字段比较解决）。
- **`mount` 是一个假组件**：它只有"订阅 + 选择器 + 渲染计数"三件事，用来把重渲染次数数出来；真实框架多出来的是调度、渲染树与 DOM 比对。
- **`shallowEqual` 不递归**：只比一层键值，这正是它与深比较的分界，也是"选择器要返回扁平对象"这条最佳实践的由来。
