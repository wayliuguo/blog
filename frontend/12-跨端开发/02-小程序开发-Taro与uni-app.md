# 小程序开发：Taro 与 uni-app
> 级别：中级

小程序依托微信等宿主平台，以"小包体、快启动、独立生态"著称。本章先讲小程序自身的运行原理，再深入 Taro/uni-app 的编译模型、生命周期与组件差异，最后给出应对多端差异的最佳实践。

按本书四层推进：

- **入门使用**：小程序双线程架构、setData 通信、核心概念（App/Page/WXML/WXSS/分包）；
- **进阶**：setData 性能优化、Taro 与 uni-app 的编译模型、生命周期与组件差异；
- **实战**：多端差异与适配（API 封装层、条件编译、配置驱动）、最佳实践清单；
- **最小实现掌握原理**：到 `code/frontend/12-cross-platform` 运行 `adapt-layer.html`，输入一条 setData DSL，亲眼看"编译/适配层"如何把它翻译成不同平台产物。

## 一、小程序运行原理

### 1. 双线程架构

小程序采用**逻辑层 + 渲染层分离**的架构，而非传统 Web 的单线程 DOM 模型：

- **渲染层**：由宿主提供的 WebView 承载，负责 WXML（结构）与 WXSS（样式）的渲染。
- **逻辑层**：一个独立的 JS 引擎（JavaScriptCore / V8）运行，负责业务逻辑与 setData。

两层之间通过**原生桥**通信。因为渲染层无法直接操作 DOM，所有数据更新都必须通过 `setData` 传到渲染层，这是理解小程序性能的关键。

```js
// 逻辑层 → 渲染层：数据必须走 setData
Page({
  data: { list: [] },
  async onLoad() {
    const res = await fetch('/api/list');
    this.setData({ list: res.data }); // 触发渲染层更新
  },
});
```

### 2. setData 与性能

`setData` 会把整块数据序列化并通过桥传送到渲染层，改一处也会带上整包 diff 数据。高频、大体积的 setData 是小程序卡顿的元凶：

```js
// 反例：高频且大数据量
list.forEach(item => this.setData({ current: item })); // 每帧都在传数据

// 正例：合并更新，按需传增量
this.setData({
  items: partialChangedItems,   // 只传变化的字段
});
```

| setData 优化点 | 说明 |
|----------------|------|
| 减少调用频率 | 合并多次更新为一次 |
| 减少数据体积 | 只传变化字段，不传整个对象 |
| 用局部更新 | 通过数据路径 `obj[`index`]` 定点更新 |
| 避免循环渲染大数据 | 用「增量渲染」或分页加载 |

### 3. 小程序的核心概念

| 概念 | 说明 |
|------|------|
| App/Page/Component | 应用、页面、自定义组件的注册单元 |
| WXML + WXSS | 模板与样式语言，类似 HTML+CSS 但能力受限 |
| app.json / page.json | 全局与页面级配置（路由、窗口、导航） |
| 生命周期 | onLoad/onShow/onReady + 页面隐藏/卸载 |
| 分包加载 | 将业务拆成主包+分包以控制首包体积 |

## 二、Taro 与 uni-app 的编译模型

### 1. 为什么需要编译型框架

原生小程序各写一遍成本高。编译型框架让开发者用 React（Taro）或 Vue（uni-app）写业务，再把**同一份源码编译成各平台的产物文件**（app.json/WXML/WXSS/JS）。

```
源代码(React/Vue + 统一组件)
   │  Taro/uni-app 编译器
   ├──→ 微信小程序产物 (WXML/WXSS/JS)
   ├──→ 支付宝小程序产物
   ├──→ H5 产物 (Vue/React SPA)
   └──→ RN/App 产物（部分方案）
```

### 2. Taro（React 内核）

Taro 3 采用 **React 运行时驱动宿主组件**，把 React 组件树映射到小程序自定义组件：

```tsx
// Taro：React 语法编写小程序
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';

export default function Index() {
  useLoad(() => { console.log('页面加载'); });
  const handleClick = () => Taro.showToast({ title: '点击了', icon: 'success' });
  return (
    <View>
      <Text>首页</Text>
      <Button onClick={handleClick}>点我</Button>
    </View>
  );
}
```

Taro 3 的核心是**所有平台统一为一套 React 组件运行时**，通过不同平台的"宿主组件适配层"落地，从而让用户代码尽量与平台解耦。

### 3. uni-app（Vue 内核）

uni-app 用 Vue 语法编写，同时支持编译到小程序与 App（内置渲染引擎），并可通过条件编译处理平台差异：

```vue
<template>
  <view class="page">
    <text>&#123;&#123; title &#125;&#125;</text>
    <button @click="reload">刷新</button>
  </view>
</template>

<script setup>
import { ref } from 'vue';
const title = ref('uni-app 页面');
const reload = () => { title.value = '已刷新'; };
</script>

<style>
.page { padding: 20rpx; }
</style>
```

> 注意：本站在渲染 markdown 时，模板中出现的 `&#123;&#123; title &#125;&#125;` 等 Vue 插值需写作 escape 后的实体 `&#123;&#123; title &#125;&#125;` 以避免被 VitePress 当作 Vue 模板解析。

### 4. 编译模型对比

| 维度 | Taro | uni-app |
|------|------|---------|
| 语言内核 | React / Vue（内置适配） | Vue |
| 编译目标 | 多小程序 + H5 + RN | 多小程序 + H5 + App |
| 组件模型 | React 组件映射宿主组件 | Vue 组件映射宿主组件 |
| 平台差异化 | 支持 H5 与多端条件编译 | 条件编译 `#ifdef/#endif` |
| 生态 | 京东系组件库、第三方丰富 | DCloud 生态、插件市场 |
| 适用 | React 团队、重小程序 | Vue 团队、需要成，想顺带做 App |

## 三、生命周期与组件

### 1. 生命周期对齐

编译型框架把平台生命周期映射为 Web 框架生命周期的子集：

```
Taro:       useLoad / useShow / useReady / useHide / useUnload
uni-app:    onLoad / onShow / onReady / onHide / onUnload
React 心智: useEffect / useLayoutEffect（近似）
```

```js
// Taro 组合式生命周期
import { useLoad, useShow, useHide } from '@tarojs/taro';
export default function Page() {
  useLoad(() => initData());   // 页面注册
  useShow(() => refresh());    // 页面显示
  useHide(() => cleanup());    // 页面隐藏
}
```

### 2. 组件与渲染优化

小程序自定义组件与自定义组件之间存在通信开销，应尽量把渲染消耗的组件拆分、轻量化：

```jsx
// 业务组件与纯展示组件拆分，控制 setData 范围
import { memo } from 'react';
import { View, Text } from '@tarojs/components';

// memo 减少无关组件重渲染
export const PriceTag = memo(({ price }) => (
  <View><Text>{price}</Text></View>
));
```

| 渲染优化手段 | 作用 |
|--------------|------|
| 组件抽象维度合理 | 缩小 setData 传播范围 |
| 列表用虚拟/增量渲染 | 避免超长列表一次性渲染 |
| 静态内容标记 | 减少 diff 范围 |
| 图片懒加载 + 压缩 | 减少解析与内存占用 |

## 四、多端差异与适配

### 1. 常见差异点

| 差异维度 | 表现 |
|----------|------|
| API 命名 | `wx.xxx` / `my.xxx` / `tt.xxx` 不同 |
| 组件能力 | 部分组件仅某平台支持 |
| 样式单位 | rpx 语义在各端换算略有差异 |
| 分包规则 | 各平台主/分包大小限制不同 |
| 登录/支付 | 各端钱包/账号体系不同 |

### 2. 适配手段

- **API 封装层**：统一 `request`、`login`、`upload` 等接口，内部按平台分发。
- **条件编译**：uni-app 用 `#ifdef MP-WEIXIN`；Taro 可用运行时平台判断。
- **配置驱动**：把端差异收敛到配置表而非散落在业务代码。
- **抽象登录/支付**：通过差量原生能力（原生桥）补齐平台特有能力。

```js
// 平台判断示例：端差异收口到统一层
import Taro from '@tarojs/taro';
const isWeapp = process.env.TARO_ENV === 'weapp';
const isAlipay = process.env.TARO_ENV === 'alipay';
export function pay(order) {
  if (isWeapp) return wxPay(order);
  if (isAlipay) return alipayPay(order);
  return webPay(order);
}
```

## 五、最佳实践

1. **逻辑与 UI 解耦**：业务逻辑抽到共享的 `services`，保持组件纯展示。
2. **统一状态管理**：小程序内使用组件栈对应的状态方案（Taro Redux/MobX，uni-app Pinia/Vuex）。
3. **分包与按需加载**：把非首屏页面拆到分包，控制主包体积。
4. **数据增量更新**：杜绝全量 setData，善用数据路径定点更新。
5. **埋点与监控统一**：在封装层统一上报，避免各平台代码掺杂。
6. **发布前多端回归**：建立各平台真机测试清单，覆盖差异项。

## 六、最小实现：setData DSL 的适配层

到 `code/frontend/12-cross-platform` 运行 `adapt-layer.html`：输入一条统一的 setData DSL，切换"小程序、Web DOM、RN、Flutter"四个平台，观察适配层如何把它翻译成各端产物——小程序走 setData 快照、Web 直接操作 DOM、RN 生成虚拟节点树、Flutter 生成 Widget 描述。这正是本文第 2 节"编译模型"的最小可运行骨架。

> 原理一句话：Taro/uni-app 的编译层本质上就是"把同一套 DSL 翻译成多种目标产物"，业务只碰一种心智，差异被编译/适配收口。

## 面试衔接

本节对应 `90-附录-面试体系` 的「跨端开发」板块（题 117 及追问）：小程序双线程架构、setData 为何慢及优化。做真题自测后，进入下一节 `03-React Native`。