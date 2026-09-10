# React 状态管理

React 的组件会有自己的内部状态，但当应用变复杂（如问卷编辑器、购物车、用户信息在多处共享）时，仅仅靠组件的 `useState` 已经无法满足"跨组件、跨层级地共享和同步数据"的需求。数据被分散在多个组件里会带来维护灾难，于是产生了**状态管理**的概念：把数据放到一个集中的地方统一管理与分发。本文覆盖为何需要状态管理、Context、useReducer、Redux、MobX、Zustand 简要以及如何选型，帮助你建立 React 状态管理的完整知识框架。

> 级别：中级→高级

按本书四层推进：

- **入门使用**：状态提升的局限、Context 跨层传值、useReducer（state + action + reducer + dispatch）；
- **进阶**：Redux 单向数据流 / 模块化 / DevTools / RTK + TS、MobX 声明式、Zustand 轻量；
- **实战**：用 Redux 管理用户信息并联动路由权限，落地"选型"一节；
- **最小实现掌握原理**：到 `code/frontend/07-react` 运行 `hooks-demo.html`，理解状态管理本质——"集中存一份数据 + 变了通知订阅方重新渲染"。

## 为何需要状态管理

### 状态提升的局限

面对一个复杂页面，我们通常会把页面**拆分为多个 UI 组件**。起初数据保存在**顶级组件**，通过 `props` 层层传递到下级组件——这就是"状态提升（State Lifting）"。

```jsx
// 数据在父组件，通过 props 传给子组件
function Parent() {
  const [name, setName] = useState('')
  return <Form name={name} onNameChange={setName} />
}
```

这种方式能解决一部分问题，但存在明显缺陷：

- 页面越复杂，props 传递链越长，中途的组件不得不在自己并不关心的数据上"接盘"。
- 数据只由顶级组件持有，同级或深层组件想读取、修改都很别扭。
- 跨页面共享数据（如登录用户信息）根本无法通过状态提升实现。

提升示意图：`数据保存在顶级组件 → via props → 下发到各子组件`。

### 什么时候需要状态管理

当情况继续复杂——例如问卷编辑器（问题增删、拖拽排序、答案回填，涉及多个模块联动），光靠状态提升已经无法满足。此时需要把数据放在一个**集中的第三方（Store）**，让任何组件都能读取与更新，且保持数据流清晰可控。

状态管理示意图：`组件A / 组件B / 组件C → 集中的 Store（单一数据源）`。

React 中常见的状态管理方式：

- React 自带的 `Context`、`useReducer`
- 第三方库 `Redux`
- 第三方库 `MobX`、`Zustand`

## Context

`Context` 用于**跨层级传递数据**，而不像 `props` 那样一层层传，类似于 Vue 的 `provide/inject`。典型场景：切换主题、切换语言等"全局但低频变化"的数据。

### createContext 与注入

通过 `createContext` 创建 context，并在组件上方用 `Context.Provider` 指定值。

```tsx
// contextDemo/index.tsx
import { FC, createContext, useState } from 'react'
import Toolbar from './Toolbar'

const themes = {
  light: { fore: '#000', background: '#eee' },
  dark: { fore: '#fff', background: '#222' }
}

// 通过 createContext 创建 context
export const ThemeContext = createContext(themes.light)

const ContextDemo: FC = () => {
  const [theme, setTheme] = useState(themes.light)
  const toDark = () => {
    setTheme(themes.dark)
  }
  return (
    // 在组件上方使用 Context.Provider 指定 context 的值
    <ThemeContext.Provider value={theme}>
      <div>
        <span>Context Demo</span>
        <button onClick={toDark}>dark</button>
      </div>
      <Toolbar />
    </ThemeContext.Provider>
  )
}

export default ContextDemo
```

要点：
- 通过 `createContext` 创建 context 对象。
- 在组件上方使用 `Context.Provider` 指定注入的值。
- 提供 `toDark` 方法用于改变注入的 context 的值。
- 在 `Context.Provider` 包裹下调用 `Toolbar` 组件。

### 跨层级传递

中间的 `Toolbar` 组件完全不需要知道 theme 的存在，它只是继续渲染子组件，真正的使用者是更深的 `ThemeButton`——这就体现了跨层级的优势。

```tsx
// contextDemo/Toolbar.tsx
import { FC } from 'react'
import ThemeButton from './ThemeButton'

const Toolbar: FC = () => {
  return (
    <>
      <button>Toolbar</button>
      <div>
        <ThemeButton />
      </div>
    </>
  )
}

export default Toolbar
```

### useContext 获取值

深层组件通过 `useContext` 拿到注入的值。

```tsx
// contextDemo/ThemeButton.tsx
import { FC, useContext } from 'react'
import { ThemeContext } from './index'

const ThemeButton: FC = () => {
  // 通过 useContext 获取 context 提供的值
  const theme = useContext(ThemeContext)
  // 根据 theme 设置 button 样式
  const style = {
    color: theme.fore,
    background: theme.background
  }
  return (
    <>
      <button style={style}>theme button</button>
    </>
  )
}

export default ThemeButton
```

小结：Context 适合共享"低频、全局"的数据（主题、语言、用户信息），但更新的数据会让所有消费该 context 的组件重渲染，因此**不适合频繁变化的大数据**，也不具备跨模块的组织能力。

## useReducer

### 背景

`useReducer` 有两个定位：

- 它是 `useState` 的**代替方案**：数据简单时用 `useState`，数据结构较复杂时考虑 `useReducer`。
- 它**参考了 Redux 的设计**，是"简化版的 Redux"。

### 概念

`useReducer` 引入了四个核心概念：

- `state`（或 store）：存储数据。
- `action`：动作，格式如 `{ type: 'xxx', ... }`。
- `reducer`：根据 action 生成新 state —— **不可变数据**（每次都返回新对象，不能直接修改原对象）。
- `dispatch`：触发 action，是唯一更新 state 的方式。

```tsx
import { useReducer } from 'react'

type State = { count: number }
type Action = { type: 'increment' } | { type: 'decrement' | 'reset' }

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 } // 返回新对象，不可变
    case 'decrement':
      return { count: state.count - 1 }
    default:
      return state
  }
}

const Counter = () => {
  const [state, dispatch] = useReducer(reducer, { count: 0 })
  return (
    <>
      <p>{state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
    </>
  )
}
```

> PS：在 React 环境下，永远不能忘记 **不可变数据** 原则。

### 局限

- `state` 与 `dispatch` **没有模块化**，数据混在一起，难以组织，不适合复杂项目。
- 需要**结合 `useContext`** 才能实现跨组件通讯，否则仍局限于单组件内部。
- 但**简单项目**用它处理复杂一点的组件状态是完全够用的。

## Redux

Redux 是 React 最出名的状态管理工具，它把 `useReducer` 的"state + action + reducer + dispatch"思想推广到全局，并解决了"模块化、跨组件取用、可调试"的问题。

### 核心概念

Redux 与 `useReducer` 的概念一致：

- `state` / `store`：存储数据。
- `action`：一个动作，格式如 `{ type: 'xxx', ... }`。
- `reducer`：根据 action 生成新 state（**不可变数据**）。
- `dispatch`：触发 action。

但 Redux 与 `useReducer` 相比有明显增强：

- `store` **可拆分模块**，不同领域的数据各自独立。
- 可通过 **Hook（如 `useSelector`、`useDispatch`）** 在任意组件获取 state 与 dispatch。
- 有强大的**开发者工具（DevTools）**，可回放每一步 dispatch。

### 单项数据流工作流

Redux 采用严格的**单向数据流**：

```
UI 组件  --dispatch(action)-->  Store
                                ├─ reducer(state, action) 计算新 state
                                └─ 新 state 派发给订阅的组件
UI 组件  --读取最新 state-->    重渲染
```

流程归纳：
1. 组件通过 `dispatch(action)` 发出一个动作。
2. `Store` 把当前 `state` 与 `action` 交给对应的 `reducer`。
3. `reducer` 返回一个**新的 state**（纯函数，不改原对象）。
4. 新 state 被保存到 store，所有订阅它的组件重新渲染。

（参考官方单向数据流动图：`cn.redux.js.org/tutorials/fundamentals/part-2-concepts-data-flow/`）

### 核心组成

**Action**：描述"发生了什么事"的普通对象。

```ts
// action
{ type: 'user/login', payload: { username: '张三' } }
```

**Reducer**：一个纯函数，入参是旧 state 与 action，返回新 state。**不可变**——绝不能直接 `push`、`arr[i] = x`，必须构造新对象/数组。

```ts
const initialState = { username: '' }

const userReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'user/login':
      return { ...state, username: action.payload.username }
    case 'user/logout':
      return { ...state, username: '' }
    default:
      return state
  }
}
```

**Store**：把 reducer 组合起来生成的单一数据源。用 `configureStore`（RTK）或 `createStore` 创建，并支持中间件处理异步。

```ts
// src/store/store.ts
import { configureStore } from '@reduxjs/toolkit'
import userReducer from './userReducer'

const store = configureStore({
  reducer: {
    user: userReducer, // 可挂多个模块化 reducer
  },
})
```

### 与 TypeScript 结合

使用 Redux Toolkit（RTK）时，通常配合 TS 一并使用：

```ts
// 用 createSlice 生成 reducer 与 action
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UserState { username: string }
const initialState: UserState = { username: '' }

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    login(state, action: PayloadAction<string>) {
      state.username = action.payload
    },
    logout(state) {
      state.username = ''
    },
  },
})

export const { login, logout } = userSlice.actions
export default userSlice.reducer
```

在组件中通过 Hook 读取与派发：

```tsx
import { useSelector, useDispatch } from 'react-redux'

const username = useSelector((state) => state.user.username)
const dispatch = useDispatch()
dispatch(login('张三'))
```

### 实战：用 Redux 管理用户信息

这是状态管理最典型的落地场景。整体步骤：

1. **创建 store 与 reducer**：新建 `src/store/store.ts` 和 `src/store/userReducer.ts`，把用户信息的读写收敛到 redux。
2. **对外提供 Hook 封装**：
   - 新建 `hooks/useGetUserInfo.ts`：从 store 读取用户信息。
   - 新建 `hooks/useLoadUserData.ts`：使用 `loginReducer`，通过 `useSelect` 依据 `username` 判断是否已登录；`UserInfo` 组件不再直接调用 service，改用 `useGetUserInfo`。
3. **应用到组件**：
   - `UserInfo` 组件：使用 `logoutReducer`，通过 `useSelect` 根据是否有用户名决定显示"用户信息"还是"登录"入口。
   - 头像 `Logo` 组件：根据 `username` 判断登录后的链接地址。
4. **路由权限联动**：新建 `hooks/useNavPage` 执行跳转逻辑，在 `MainLayout`、`QuestionLayout` 中接入，未登录时跳转登录页（呼应路由守卫）。

### 开发者工具

Redux 提供了 Chrome 的 Redux DevTools 扩展，可以看到**每一步 dispatch 导致的 state 变化**，时间旅行式调试，开发排查非常方便。

https://chromewebstore.google.com/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd

## MobX

MobX 与 Redux 的理念不同，它可以通过**声明式**的方式来修改数据，像 Vue；不需要像 React + Redux 那样用纯函数和不可变值。

### 基本概念

MobX 的核心三要素（详见 `zh.mobx.js.org/the-gist-of-mobx.html`）：

- `state`：数据（可观察对象）。
- `action`：动作，可以修改 state（允许 `arr.push` 这种直接修改）。
- `derivation`：派生，包括三类：
  - `computed`：根据 state 计算出的派生值。
  - `observer`：监听变化、包裹的 React 组件，state 变了组件自动重渲染。
  - `autorun`：监听变化，自动执行副作用，类似于 Vue 的 `watch`。

```tsx
import { makeAutoObservable } from 'mobx'
import { observer } from 'mobx-react-lite'

class TodoStore {
  list: string[] = []
  constructor() {
    makeAutoObservable(this)
  }
  add(todo: string) {
    this.list.push(todo) // 直接修改，MobX 自动追踪
  }
  get count() { // computed：派生值
    return this.list.length
  }
}

const TodoView = observer(() => {
  // ...通过观测 store 自动更新
})
```

### 使用建议

- **尽量使用 `computed`**：想根据当前 state 生成一个值，`computed` 是首选。刚接触 MobX 时容易过度使用 reaction，黄金法则是——需要基于 state 生成值时总用 `computed`。
- `computed` **必须是纯函数**；而 `action` 可以修改 state。
- `computed` 采用**惰性求值**：会缓存输出，只有当其依赖的可观察对象改变时才重新计算；不被任何值观察时会暂时停用，因此性能很好。
- MobX v6 默认已**去掉装饰器语法**，以兼容更多环境，推荐直接用 `makeAutoObservable`。

MobX 同样遵循单数据流原则（参考 `zh.mobx.js.org/the-gist-of-mobx.html#原则`）。

## Zustand 简要

Zustand 是近年非常流行的轻量级状态管理库，体积小、无样板代码，使用上接近"裸的 store + Hook"。

- **极简 API**：`create` 直接创建 store，返回一个 Hook。
- **无需 Provider 包裹**：自带订阅机制，组件直接调用即取到状态。
- 支持选择器避免多余重渲染，天然契合 React 并发特性。

```ts
import { create } from 'zustand'

interface BearStore {
  bears: number
  increase: (n: number) => void
}

const useBearStore = create<BearStore>((set) => ({
  bears: 0,
  increase: (n) => set((state) => ({ bears: state.bears + n })),
}))

// 组件中直接使用
const bears = useBearStore((s) => s.bears)
const increase = useBearStore((s) => s.increase)
```

适合中小型项目，想要"低心智负担、少样板"时首选。

## 如何选型

| 方案 | 适用场景 | 特点 |
| --- | --- | --- |
| Context | 低频、全局的少量数据（主题、语言） | React 内置，无依赖，但高频更新性能差 |
| useReducer + Context | 组件内状态复杂、或中小型应用简单跨组件 | 无额外依赖，够用但不支持模块化 |
| Redux | 大型复杂应用、强可预测性与统一规范 | 生态成熟、DevTools 强大、样板多 |
| MobX | 偏好声明式、喜欢像 Vue 一样直接改数据 | 上手快、灵活，但约束少 |
| Zustand | 中小型项目、想轻量且少样板 | API 极简、体积小、性能好 |

**选型建议**：
- 简单页面：优先 `useState` / `Context`。
- 存在较多共享的复杂业务状态：考虑 Redux（规范、可预测）或 Zustand（轻量）。
- 喜欢 Vue 式的响应式体验：选 MobX。
- 无论是哪种，都要牢记 **不可变数据** 与 **单一数据源（Single Source of Truth）** 的原则，才能写出可维护的状态管理代码。

## 最小实现：状态管理的本质是"单一数据源 + 变更通知"

无论 Context、Redux 还是 Zustand，原理都可归纳为：把数据放到一个集中处，谁要读就去取，数据一变就通知所有依赖它的组件重新渲染。到 `code/frontend/07-react` 运行 `hooks-demo.html`，体会"状态改一下、界面自动跟着变"的订阅-通知雏形。原理一句话：状态管理 = 单一数据源 + 发布订阅（变了通知订阅者）。

## 面试衔接

本节对应 `90-附录-面试体系` 的「状态管理」板块：Context vs Redux、useReducer vs Redux、Redux 单向数据流与不可变数据、MobX 与 Zustand 选型。做真题自测后，进入下一节 `05-React 使用 TypeScript`。