# React Native

## 一、入门：心智模型迁移

### 1.1 你已经会什么，缺什么

RN 不是「移动端网页」，是 **React 的宿主替换**：组件模型、Hooks、状态管理原样保留，被替换的只有渲染层与样式层。

| Web 里你会的 | RN 里的对应 | 迁移要点 |
| --- | --- | --- |
| `<div>` / `<span>` | `<View>` / `<Text>` | 文字**必须**包在 Text 里，裸文本直接报错 |
| `<img>` | `<Image source={...}>` | 网络图必须写死宽高，没有自动布局 |
| `<button onClick>` | `<Pressable onPress>` | 触摸有按压反馈状态，不是简单的 click |
| `<ul>/<li>` + 手写分页 | `<FlatList>` | 内置虚拟化、懒加载，没有它长列表必卡 |
| CSS / Tailwind | `StyleSheet.create` | **没有级联、没有后代选择器**；flex 默认纵向 |
| `fetch` / axios | `fetch`（对齐 whatwg 标准） | 请求层可直接复用 |
| vue-router / react-router | React Navigation | 路由即栈，页面有转场动画概念 |

### 1.2 上手：rn-app 最小可跑

`code/rn-app` 是完整工程（RN 0.73 + TypeScript）。**验证 JS 层不需要任何移动端环境**——Metro 全量编译通过即代表组件代码在 RN 运行时契约下成立：

```cmd
cd frontend/进阶/跨端与桌面深化/code/rn-app
npm install
npm run bundle
```

实测输出（Node 22，本机实跑）：

> 摘自 `./code/rn-app/README.md`

```md
`npm run bundle` 是**不需要任何移动端环境**的验证手段：Metro 会完成依赖解析 → Babel/SWC 转换 → 打包合并，产出 `.build/index.android.bundle`。编译通过 = JS 层代码在 RN 运行时契约下成立。
```

实测产物：`.build/index.android.bundle` 842,905 字节（minified），订单工作台组件码完整在内。要看真机渲染再走 `npm run android`（需 Android Studio + 模拟器，设备层不在本仓库验证范围，见工程 README 实跑分级表）。

## 二、进阶：通信模型的演进是理解 RN 的主线

### 2.1 老 Bridge：异步消息 + JSON 序列化

RN 老架构（0.68 之前）的 Bridge 是「消息总线」：JS 侧拿不到 Native 对象，只能把调用打包成**可序列化的消息**丢进队列。用探针把这条链路模拟出来：

> 摘自 `./code/cross-lab/jsi.cjs`

```js
// JS 侧拿不到 Native 对象，只能发一条可序列化的消息：
// stringify（JS 出口）→ parse（Native 入口）→ 执行 → 结果再走一遍反方向。
function createLegacyBridge(native) {
    let nextId = 1
    return {
        invoke(module, method, params) {
            const payload = JSON.stringify({ id: nextId++, module, method, params })
            const decoded = JSON.parse(payload) // 模拟 Native 侧反序列化
            const result = native[module][method](decoded.params)
            return Promise.resolve(JSON.parse(JSON.stringify(result))) // 结果回程再编解码
        }
    }
}
```

序列化不只是慢，还会**丢信息**——JSON 只认六种值：

> 摘自 `./code/cross-lab/jsi.cjs`

```js
const src = { when: new Date(0), fn: () => 1, ok: 1 }
const viaBridge = JSON.parse(JSON.stringify(src))
assert.equal(typeof viaBridge.when, 'string', 'Date 经 JSON 退化为字符串')
assert.ok(!('fn' in viaBridge), '函数被 JSON 静默丢弃')
```

这解释了老架构的一批「做不到」：`measure` 这类需要**同步返回**布局的 API 无法实现（消息是异步的）；回调函数传不过去（序列化丢弃）；大批量数据滚动时通信拥堵（每帧都在排队过桥）。

### 2.2 新架构 JSI：把「消息」变成「调用」

JSI（JavaScript Interface）换了一个思路：不传消息了，让 JS **直接持有 Native 对象的引用**。JSI 是一层 C++ 抽象，向下适配任意 JS 引擎（Hermes / JSC / V8），向上把 Native 能力注册成 host object——JS 调用它就是一次同步的 C++ 直通调用，零序列化：

> 摘自 `./code/cross-lab/jsi.cjs`

```js
// JS 侧直接持有 Native 对象的代理（JSI::HostObject），
// 方法调用是同步的 C++ 直通调用，参数按原样传递，零序列化。
function createJsiBinding(native) {
    return new Proxy(native, {
        get(target, module) {
            return target[module] // 直接是 Native 侧函数引用
        }
    })
}
```

两种模型的实测差距（`node ./code/cross-lab/jsi.cjs`，2 万次「读设备信息」调用）：

> 摘自 `./code/cross-lab/jsi.cjs`

```js

        console.log(
            `探针二  : ${N} 次调用 —— bridge ${bridgeMs.toFixed(1)}ms vs jsi ${jsiMs.toFixed(1)}ms（${(
                bridgeMs / jsiMs
            ).toFixed(0)}×）`
        )
```

实测（本机最近一轮）：bridge 235.4ms vs jsi 2.2ms，**约 105 倍**（读数随机器波动，本仓库早期一轮为 58 倍，量级稳定在两位数倍）。差距来自三处：两次 JSON 往返、Promise 包装、消息队列排队。JSI 直通后，同步 API（同步测量布局、同步取值）成为可能，列表滚动这类高频通信也不再拥堵。

新架构另外两块：**TurboModules**（Native 模块按需初始化，不再启动时全量注册）与 **Fabric**（渲染器支持同步渲染与优先级调度）。三者共用 JSI 这一个底座。

### 2.3 Hermes：引擎层为什么也要换

RN 默认引擎从 JSC 换成 Hermes，收益点与跨端场景强绑定：**字节码预编译**（构建期把 JS 编成 bytecode，启动省掉解析）、**按需编译**、更紧凑的内存布局。对应到工程：RN 的 release 构建产物是 `.hbc` 字节码而不是 JS 源码——这是「动态化」能力的基础设施（下发字节码而非源码）。

## 三、实战：订单工作台（rn-app 走读）

同一份订单业务（列表 + 详情 + 状态推进），看 RN 写法与 web 的关键差异：

**FlatList 与虚拟化**——列表必须用 FlatList 而不是 `.map` 生成一堆 View：

> 摘自 `./code/rn-app/App.tsx`

```tsx
<FlatList
    style={styles.list}
    data={orders}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => (
        <Pressable
            style={[styles.item, item.id === selectedId && styles.itemActive]}
            onPress={() => onPress(item.id)}
        >
            <Text>
                #{item.id} {item.title} ¥{item.amount}
            </Text>
            <Text style={styles.status}>{STATUS_CN[item.status]}</Text>
        </Pressable>
    )}
/>
```

FlatList 只渲染视口内条目（外加若干屏的预渲染窗口），滚动时回收复用——这是 web 端「无限 DOM 节点」给不了的能力，也是 RN 列表性能的底线。

**状态更新与 web 完全同构**——不可变更新：

> 摘自 `./code/rn-app/App.tsx`

```tsx
const onAdvance = useCallback((id: string) => {
    // 不可变更新：RN 状态管理与 web 端 React 完全同构
    setOrders((prev) => prev.map((o) => (o.id === id ? advance(o) : o)))
}, [])
```

**样式即对象**——没有级联，数组写法表示合并（后面的优先）：

> 摘自 `./code/rn-app/App.tsx`

```tsx
const styles = StyleSheet.create({
    root: { flex: 1, padding: 16, paddingTop: 48 },
    // …
    item: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eaeef2' },
    itemActive: { backgroundColor: '#eef5ff' },
    // …
    btn: { backgroundColor: '#0969da', borderRadius: 6, padding: 10, alignItems: 'center', marginTop: 16 },
    // …
})
```

没有级联、没有后代选择器——所有布局显式声明；数组写法（`[styles.item, ...]`）表示按序合并、后者优先。

## 四、最小实现：40 行写一个「原生映射器」

RN 的本质不是「跑网页」，而是：**JS 维护一棵描述树，每次渲染 diff 出最小指令集，由 Native 应用到真实控件**。用探针把这条契约跑通（`node ./code/cross-lab/mapper.cjs`）：

> 摘自 `./code/cross-lab/mapper.cjs`

```js
// ── 映射器：diff 描述树与已挂载树，产出最小指令集 ─────────────
// 真实 RN 里这段逻辑在 Fabric 的 C++ 渲染器中；这里用几十行呈现其契约。
// mounted 节点携带已挂载的子树，实现跨帧对位比较。
function diffAndApply(host, parentId, element, mounted) {
    if (!mounted) {
        const id = host.create(element.type, parentId)
        host.update(id, element.props)
        const node = { id, type: element.type, props: { ...element.props }, children: [] }
        for (const child of element.children) node.children.push(diffAndApply(host, id, child, null))
        return node
    }
    if (mounted.type !== element.type) {
        host.remove(mounted.id) // 类型变化：整棵子树重建（React 的 remount 语义）
        return diffAndApply(host, parentId, element, null)
    }
    // 同类型：只下发改动的 props
    const changed = {}
    for (const [k, v] of Object.entries(element.props)) {
        if (mounted.props[k] !== v) changed[k] = v
    }
    if (Object.keys(changed).length) host.update(mounted.id, changed)
    mounted.props = { ...element.props }
    // 子级按位对齐：少则删，多则建，等则递归
    const next = element.children
    while (mounted.children.length > next.length) host.remove(mounted.children.pop().id)
    mounted.children = next.map((child, i) =>
        diffAndApply(host, mounted.id, child, mounted.children[i] ?? null)
    )
    return mounted
}
```

实测三帧（本机实跑）：

> 摘自 `./code/cross-lab/mapper.cjs`

```js
console.log(`探针一  : 首帧 ${firstOps} 条指令（整树创建）· 第二帧 1 条指令（单点更新）· 第三帧 类型变化触发子树重建`)
console.log('RN 原生映射器契约成立：JS 重渲染 ≠ 重建原生控件，diff 后只下发改动的最小指令集')
```

实测输出：首帧 6 条指令（整树创建：3 CREATE + 3 UPDATE）· 第二帧 **1 条指令**（单点更新 ¥399→¥429）· 第三帧类型变化触发 REMOVE + CREATE。这就是「JS 每帧重渲染但原生层不重建」的原理基础——**JS 重渲染的代价被 diff 吸收在 JS 侧，原生层只收最小指令集**。

## 五、对比与边界

| 维度 | 判断 |
| --- | --- |
| 选它的理由 | React 栈团队零成本迁移；热更新可行（CodePush 系，走 JS/字节码下发）；生态成熟 |
| 不选的理由 | 体验上限是「接近原生」不是原生；重图形动效（复杂转场/游戏化 UI）弱于 Flutter |
| 高频坑 | 通信数据量（老 Bridge 心智要丢掉，但过桥成本仍在）；版本升级跨度大（新架构迁移）；原生模块需要双端各配一套 |

与 [Flutter](./Flutter.md) 的分工：**团队栈决定下限，体验要求决定上限**。React 栈 + 常规列表类 App 选 RN 几乎不亏；UI 一致性是硬指标（品牌动效、复杂自定义绘制）再考虑 Flutter 的自绘成本。

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/rn-app/App.tsx` | 订单工作台：FlatList + 详情 + 状态推进 | 三 |
| `./code/rn-app/src/data.ts` | 订单数据源（与三端同构） | 三 |
| `./code/cross-lab/jsi.cjs` | Bridge/JSI 两种通信模型基准 | 二 |
| `./code/cross-lab/mapper.cjs` | 原生映射器最小实现（diff → 指令集） | 四 |
| `./code/cross-lab/twin.cjs` | 小程序双线程 setData（Hybrid 篇引用） | — |
| `./code/cross-lab/webview.cjs` | 预热池 / 离线包（Hybrid 篇引用） | — |
| `./code/cross-lab/bridge.cjs` | 桥协议 / 回调表 / 批量 / 白名单（Hybrid 篇引用） | — |
| `./code/cross-lab/electron.cjs` | IPC / contextBridge / 更新状态机（Electron 篇引用） | — |
| `./code/cross-lab/three-trees.cjs` | Flutter 三棵树（Flutter 篇引用） | — |
| `./code/cross-lab/run.cjs` | 总入口：依次执行七探针 | 全篇 |

## 参考

- 本模块总结：[总结](./总结.md)
- 上一篇：[跨端渲染架构全景](./跨端渲染架构全景.md)
- 下一篇：[Flutter](./Flutter.md)
- 参考：[React Native 新架构](https://reactnative.dev/architecture/overview) · [JSI 设计文档](https://github.com/reactnative/react-native/blob/main/packages/react-native/ReactCommon/jsi/jsi/jsi.h) · [Hermes 引擎](https://hermesengine.dev/)
