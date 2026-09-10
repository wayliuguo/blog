# React Native 深入
> 级别：中级→高级

React Native 用 React 描述 UI，通过桥与原生线程通信，映射为 iOS/Android 原生控件，兼顾前端开发效率与接近原生的体验。本章从架构原理切入，重点拆解旧桥时代的痛点与 **New Architecture（Fabric / TurboModule / Bridgeless）** 的演进，并给出样式系统、性能与热更新的实践认知。

按本书四层推进：

- **入门使用**：RN 整体运行模型（JS 线程 + 原生线程 + 桥）、从虚拟 DOM 到原生控件；
- **进阶**：旧桥痛点、Fabric / TurboModule / Bridgeless、样式系统与布局适配；
- **实战**：性能优化、热更新与发布（CodePush）实践；
- **最小实现掌握原理**：到 `code/frontend/12-cross-platform` 运行 `render-models.html`，用表格快照对比 RN 与 Flutter/Taro/uni-app 的渲染路径，并用简化桥接器看"JS 意图 → 原生映射"如何分发。

## 一、RN 架构与原理

### 1. 整体运行模型

RN 在运行时存在两种线程分工：

- **JS 线程**：运行 React 逻辑，维护组件树与状态，不触碰 DOM。
- **原生线程**：由 iOS/Android 原生控件组成 UI，由原生模块提供能力。

二者通过"桥"（Bridge）交换消息。JS 侧把虚拟节点（Shadow Tree）序列化后发给原生，原生据此创建/更新真实原生控件。

```
React 组件树 (JS 线程)
   │  diff → 生成 Shadow Tree
   ▼
Bridge (序列化消息队列)
   ▼
原生 UI 线程 → 创建原生控件 (UIView / Android View)
```

### 2. 从虚拟 DOM 到原生

RN 并没有 DOM。React 渲染得到的是组件意图（host component 描述的树），通过 **Fabric**（New Architecture 的 UI 渲染器）把这些意图直接量化到原生视图：

```tsx
// JS 声明的组件 → 原生 View 层级
import { Text, View, StyleSheet } from 'react-native';
export default function Card({ title }) {
  return (
    <View style={styles.card}>
      <Text>{title}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { padding: 12, backgroundColor: '#fff', borderRadius: 8 },
});
```

关键点是：**渲染发生在原生线程**，JS 只做可共享的逻辑计算与 diff。因此 RN 的核心矛盾在于 JS 与原生之间"通信的开销与同步粒度"。

## 二、旧架构的痛点

### 1. Bridge 的瓶颈

旧架构的 Bridge 是一条异步、批量、单向的队列：

- **异步抓取**：JS 与原生之间消息按批次传递，存在延迟。
- **非阻塞但难同步**：某些原生能力需要同步响应时无法保证。
- **启动与内存**：JS 与桥的初始化成本高，大量传递数据时内存和耗时明显。
- **更新扩散**：频繁状态更新会产生大量桥消息，影响流畅度。

```js
// 旧桥下常见痛点：需要频繁与原生交互时，异步沟通造成卡顿
const result = await NativeModules.MyModule.doHeavyTask(); // 一次往返开销大
```

### 2. 为什么需要重写

New Architecture 针对上述问题做了三件事：**把 UI 渲染做成同步、把原生模块做成可同步调用、去掉桥的中间开销**，于是诞生了 Fabric、TurboModule 与 Bridgeless。

## 三、New Architecture：Fabric / TurboModule / Bridgeless

### 1. Fabric——新的渲染器

Fabric 把 React 树的更新直接调度到原生，支持**同步渲染**，CG 由原生线程持有并复用节点，减少不必要的重建。它让 update 走 `commit/commitMount` 生命周期，与 React 的 `concurrent` 机制对齐，从而在并发渲染、中断/恢复上有更好表现。

```
React → ReactFabric Host Component
   ├── 同步 commit
   └── 原生视图接收 props/events（减少桥传递）
```

并发特性（如可中断渲染、优先级）在 Fabric 下更可控，因为渲染命中路由到了原生而非受制于异步桥。

### 2. TurboModule——原生模块的进化

TurboModule 替代旧的 `NativeModules` 注册/调用方式，核心是**懒加载 + 更高效的 JSI 调用**：

- 模块按需加载，缩短启动时间。
- 数据以二进制/usertype 直接传递，避免高频序列化。
- 支持部分同步调用，降低往返开销。

```ts
// 声明类型化的原生模块（TurboModule 风格）
export interface Spec extends TurboModule {
  getNativeId(): string;
  setModeAsync(mode: 'fast' | 'eco'): Promise<void>;
}
export default TurboModuleRegistry.getEnforcing<Spec>('DeviceModule');
```

### 3. Bridgeless——去掉 Bridge

在 Bridgeless 模式下，RN 运行时不再以"异步桥"作为 JS 与原生默认通信层，而是直接通过 **JSI**（JavaScript Interface）交互。JSI 提供一个同步、类型化的 C++ 接口供 JS 调用原生能力，替代了桥的序列化队列：

- 减少启动初始化（不再组装可配置版桥）。
- 直接互操作，性能与可控性显著提升。
- 是 TurboModule 与 Fabric 得以协同的基础。

| 对比项 | 旧 Bridge | New Architecture |
|--------|-----------|------------------|
| 通信方式 | 异步批量队列 | JSI 同步/类型化 |
| UI 渲染 | 异步、整批更新 | Fabric 同步 commit |
| 原生模块 | 集中注册、整包 | TurboModule 懒加载 |
| 启动成本 | 高（初始化桥） | 低（Bridgeless） |
| 并发支持 | 弱 | 对齐 React concurrent |

## 四、样式系统

### 1. 与 CSS 的异同

RN 样式是跑在原生侧的：没有全局样式表、没有选择器，样式以内联对象或 `StyleSheet.create` 形式声明，单位是密度无关的点/逻 unit，而非 px。

```tsx
import { StyleSheet, Text } from 'react-native';
export default function Greeting() {
  return (
    <Text style={styles.message}>hello</Text>
  );
}
const styles = StyleSheet.create({
  message: { fontSize: 20, color: '#333', fontFamily: 'System' },
});
```

| 维度 | CSS 经验 | RN 实践差异 |
|------|----------|-------------|
| 布局引擎 | Flexbox（部分浏览器） | 统一用 flexbox |
| 选择器 | 标签/类/ID | 无选择器，inline 样式 |
| 尺寸 | px/rem/vw | 严格按数值/逻辑单位 |
| 全局 | 样式表 | 需自行组合 style 数组 |
| 继承 | 部分属性继承 | 基本不继承 |

### 2. 布局与适配

RN 的 flexbox 默认 `flexDirection: 'column'`（与 Web 的 row 不同），需要刻意注意跨平台差异。多端适配常用：

- `PixelRatio` / `Dimensions` 计算逻辑单位与像素比。
- 组件样式数组合并（`[base, extra]`）以复用样式。
- 平台选择：`Platform.select` / `.ios`/`.android` 后缀。

```tsx
import { Platform, StyleSheet } from 'react-native';
const styles = StyleSheet.create({
  btn: { padding: Platform.select({ ios: 14, android: 12 }) },
});
```

## 五、性能与热更新

### 1. 性能关注点

| 方向 | 手段 |
|------|------|
| 渲染频率 | 避免无意义 setState；用 `React.memo`/`useMemo` |
| 列表 | 用 `FlatList`/`SectionList` 虚拟化，避免 ScrollView 渲染全部 |
| 图片 | 适当尺寸、缓存、`resizeMode` |
| JS 线程 | 慢操作放原生或异步，避免阻塞 JS 线程 |
| 启动 | 懒加载 JS Bundle、减少 init 模块 |

```tsx
// FlatList：虚拟化长列表，按需渲染可视区
import { FlatList } from 'react-native';
<FlatList
  data={items}
  keyExtractor={i => i.id}
  renderItem={({ item }) => <Row item={item} />}
  initialNumToRender={10}
/>;
```

### 2. 热更新与发布

- **开发热重载**：仅替换 JS 段，原生 UI 不变，适合开发态。
- **发版热更新**：通过 **CodePush** 等方案把新的 JS Bundle 动态推送，绕过应用市场审核更新 JS 层逻辑。
- 注意：原生侧能力变更（新增原生模块）仍需要正规发版。

热更新本质是"更新 JS Bundle"，适用于逻辑与降级调速，但不应滥用绕过合规/审核流程。

## 六、与跨端方案对比

| 维度 | RN | Flutter | 小程序 |
|------|-----|---------|--------|
| 语言 | JS/TS | Dart | JS + WXML |
| 渲染 | 原生控件 | 自绘 GPU | WebView+宿主组件 |
| 桥/通信 | JSI | AOT 原生 | setData 桥 |
| 一致性 | 平台差异中 | 极高 | 依宿主 |
| 学习成本 | 中（React 基础） | 中高（Dart） | 低 |
| 适用 | 前端团队、工具/中大型 App | 视觉一致、高性能 App | 微信生态 |

## 七、最小实现：RN 渲染模型与桥接

到 `code/frontend/12-cross-platform` 运行 `render-models.html`：看表格快照中 RN 走"原生渲染映射 + 桥"，再点开"简化桥接器"，切到 `native`（RN 风格）平台，观察统一接口 `bridge.render` 如何内部把"JS 意图"分发成原生控件渲染——这正是本文「JS 线程 / 原生线程 / 桥」的最小演示。

> 原理一句话：RN 的本质是"JS 描述意图 + 桥/JSI 通信 + 原生控件渲染"，编译与桥接层把同一套逻辑翻译给各原生端。

## 面试衔接

本节对应 `90-附录-面试体系` 的「跨端开发」板块（题 116 及追问）：RN 与 Flutter 渲染原理差异、New Architecture（Fabric/TurboModule/JSI）解决什么。做真题自测后，进入下一节 `04-Flutter`。