# rn-app：React Native 订单工作台

跨端板块「React Native.md」配套实战工程。同一订单业务（列表 + 详情 + 状态推进），RN 0.73 + FlatList + 不可变状态更新。

## 实跑分级（正文 5.2 的约定）

| 层级 | 本仓库验证状态 |
|---|---|
| JS 层（组件/状态/样式） | ✅ `npm run bundle` 走 Metro 全量编译，产出 `index.android.bundle` |
| 设备层（渲染/手势/原生模块） | ⚠️ 需要 Android Studio / Xcode 真机环境，本仓库不验证 |

## 跑起来

```cmd
npm install
npm run bundle
```

`npm run bundle` 是**不需要任何移动端环境**的验证手段：Metro 会完成依赖解析 → Babel/SWC 转换 → 打包合并，产出 `.build/index.android.bundle`。编译通过 = JS 层代码在 RN 运行时契约下成立。

要渲染到设备：

```cmd
npm run android   :: 需要 ANDROID_HOME + 模拟器/真机
npm run ios       :: 仅 macOS + Xcode
npm run start     :: 只起 Metro dev server，配合已装 app 的设备热更新
```

## 结构

```
index.js            入口注册（AppRegistry.registerComponent）
App.tsx             FlatList 列表 + 详情面板 + 状态推进
src/data.ts         数据源（与 web 侧订单同构，方便三端对照）
babel.config.js     @react-native/babel-preset（JSX/TS/Flow 全开）
metro.config.js     默认配置 + 扩展位
```

## 正文对照点

- `FlatList` 虚拟化 vs web 的 DOM 复用（正文 2.2）
- `StyleSheet.create` 与 web CSS 的差异（无级联、无继承祖先选择器）
- `Pressable` 触摸反馈 vs web click 事件
