# 模块总结-核心（前端框架-React）

> 精简核心版：按篇分组、抽出高频/重要的知识点——成员丰富的主题展开明细，要点型知识点列清单、点到为止。选点按「面试命中度 / 日常复用度」等维度（见[文档组织规范](../../../文档组织规范.md)）。详细知识树见[《模块总结 · 前端框架-React》](./总结.md)。

## 知识主线（一句话）

React 的主轴是 **Hooks**：01 用 JSX + 组件描述界面并靠 props 单向数据流组织；02 用 useState/useEffect/useRef/useMemo 让组件"活"起来；03 用 react-router 在 SPA 里切换页面；04 用 Context/useReducer/Redux/Zustand 集中管理共享状态；05/06 用 TS 与 CSS 方案把组件写得更规范。六篇串起"用 React 写出可维护的 SPA"的完整路线。

## 高频核心点

### 01 React 核心概念

**JSX**

- **本质**：`React.createElement` 的语法糖，产出 React 元素（`{ type, props, children }` 普通对象）
- **根节点唯一**：外层包 `div` 或 `<></>` Fragment；标签必须闭合（`<input/>`）
- **表达式 `{}`**：可嵌变量/表达式；null/undefined/boolean 渲染为空、对象不能作子元素；`if/else` 不能用 → `&&`/三元/函数封装
- **循环与 key**：`map` 生成列表、每项给唯一稳定 key（业务 ID，非 index、非随机），助 diff 复用
- **属性映射**：`className`→class、`htmlFor`→for、内联 style 必须是驼峰键 JS 对象；`dangerouslySetInnerHTML` 渲染 HTML（默认防 XSS）

**组件与数据流**

- **首字母规则**：小写=HTML 原生元素、大写=React 组件
- **Props 单向数据流**：父传子只读，要改数据由父把处理函数下传；默认值用解构默认参数、`defaultProps` 已废弃
- **合成事件**：React 自定义合成事件+事件委托（委托到最外层元素）；传引用 `onClick={fn}` 而非 `onClick={fn()}`；传参包箭头函数、配 `memo` 用 `useCallback` 稳定引用
- **不可变数据**：不直接改 state、set 一个"新值"（对象用扩展运算符）；只把整个引用替换才触发重渲染；immer 的 `produce` 用可变写法生成新数据

### 02 React Hooks（主轴）

- **useState**：`[值, 更新]` 解构取值；更新异步；函数式更新 `setCount(c=>c+1)` 更可靠；日志未必是最新值
- **useEffect 三合一**：回调在挂载/更新后执行、返回清理函数在卸载前执行；依赖数组 `[]` 只挂载一次、`[deps]` 依赖变化时、不传每次渲染后
- **useRef**：`.current` 可变、变化不触发重渲染（与 useState 本质区别）；绑定 DOM 取值需判空；存"不驱动 UI 的共享数据"与"异步闭包要读的最新值"
- **useMemo / useCallback**：前者缓存计算结果、后者缓存函数引用（useMemo 语法糖）；都是性能优化手段、非语义保证、别默认全用
- **自定义 Hook 正解**：命名 `useXxx`、逻辑复用优于 HOC（HOC 有嵌套地狱/props 透传/命名冲突）；成熟封装可参考 ahooks、react-use
- **三大规则 + 闭包陷阱**：只在顶层、只在组件内、调用顺序一致；异步回调读 state 拿到旧快照 → 用函数式更新或 ref 拿最新值

### 03 React 路由

- **前端路由本质**：JS 拦截 URL 变化→匹配组件→只替换部分内容，不刷新页面
- **hash vs history**：hash 兼容好、无需服务端；history URL 美观、刷新需服务端回落否则 404
- **V6 关键差异**：`Routes` 按路径优先级自动选最具体匹配（V5 `<Switch>` 需手动排序）；传参用 Hook——`useParams`/`useSearchParams`/`useLocation`；导航统一 `useNavigate`
- **三种传参**：params（拼 URL 须声明 `:id`）/ search（查询串）/ state（URL 不含）
- **导航**：`Link`=a 标签；`NavLink` 带 active 高亮；编程式 `useNavigate(路径或 {pathname,search,state})`
- **路由守卫**：无内置守卫 → "条件渲染 + 封装守卫组件（未登录 `navigate('/login',{replace:true})`）"；逻辑收敛到路由配置层
- **懒加载**：`React.lazy`+`Suspense` 动态 import 拆 chunk、按路由按需加载、首屏变小

### 04 状态管理

**Context**

- **注入与读取**：`createContext` + `Provider value` 注入、深层组件 `useContext(Context)` 直接拿、中间组件无需知道
- **边界**：适合主题/语言这类低频全局数据；值变了所有订阅组件全重渲染、不适合频繁变化的大数据

**useReducer**

- **四个概念**：`state` 存数据、`action`（`{type,...}`）、`reducer` 根据 action 生成新 state（不可变、必须返回新对象）、`dispatch` 触发 action
- **局限**：state 无模块化、需结合 useContext 才能跨组件；适合组件内较复杂的状态

**Redux（RTK）**

- **单向数据流**：`dispatch(action)`→store 交 reducer 算新 state→派发给订阅组件重渲染
- **增强**：store 模块化、`useSelector`/`useDispatch` 任意组件取用、DevTools 时间旅行调试
- **实操**：`configureStore` 组合 reducer、`createSlice`+`PayloadAction` 少样板；Redux 适合大型、样板多

**Zustand / MobX**

- **Zustand**：`create` 建 store 返回 Hook、无需 Provider、selector 订阅最小重渲染、适合中小项目
- **MobX**：声明式直接改数据、像 Vue——`state` 可观察 + `action` + `computed` 派生 + `observer` 组件；`makeAutoObservable` 自动标记

### 05 使用 TS

- **props 类型**：`function Component({name}: Props)` 直接标注，或 `React.FC<Props>`（自动补全 children）
- **事件类型**：`ChangeEvent`/`MouseEvent` 等 `场景+Event<T>`，泛型传元素类型决定 `event.target` 取到什么；处理函数用 `ChangeEventHandler<T>` 系列
- **ref 类型**：`useRef<HTMLInputElement>(null)`，`current` 可能 null、取值判空
- **hooks 泛型**：`useState<number>(0)`/`useContext<MyCtxType>(...)`/`useReducer<Reducer,State>(...)`；自定义 hook 出入参各定义类型随 hook 导出
- **type vs interface**：interface 支持声明合并/extends 适合对外结构；type 支持联合/交叉/条件类型适合组合与工具类型

### 06 使用 CSS

- **className 为主**：少用内联 style（量大性能差不可复用）；动态拼接用 `classnames`/`clsx` 可读性好
- **CSS Module**：`xxx.module.css` 类名自动加不重复后缀实现隔离；结合 classnames 用 `styles['list-item']`；支持 `.module.scss`
- **CSS-in-JS**：不是内联 style、会编译成真实 class；`styled-components`（`styled.button<Props>`）动态样式强；styled-jsx Next.js 内置
- **Tailwind**：Utility-first 原子化工具类自由组合、追求效率与风格统一
- **选型**：小项目普通 CSS+className、中大型要隔离用 CSS Module、高度动态用 CSS-in-JS、追求效率统一用 Tailwind

> 答题框架见面试题页；此页只做知识锚点清单。
> 参考：完整版 [总结.md](./总结.md) · 面试题 [面试题.md](./面试题.md)