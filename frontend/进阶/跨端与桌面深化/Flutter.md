# Flutter

> **实跑标注**：本篇配套工程 `code/flutter-app` 为完整代码交付，**本机未配置 Flutter SDK，全部 Flutter 侧代码未实跑**（验证方式与环境配置见 §1.3 与工程 README）。原理探针 `three-trees.cjs` 为 Node 实跑。

## 一、入门：心智模型迁移

### 1.1 你已经会什么，缺什么

Flutter 是**自绘引擎**路线：不映射平台控件，自带渲染管线（Skia，新版 Impeller）直接绘制，因此能做到跨平台**像素级一致**。对 web 前端，Flutter 的声明式 UI 心智模型是熟悉的，代价是换语言（Dart）与换渲染观（everything is a widget）。

| Web/React 里你会的 | Flutter 里的对应 | 迁移要点 |
| --- | --- | --- |
| JSX 组件函数 | `Widget` + `build()` | Widget 是**不可变配置**，每帧可整棵重建（廉价，见 §2.1） |
| `useState` | `setState()` + State 类 | 状态住在 StatefulWidget 的 State 里，setState 通知重建 |
| `.map()` 渲染列表 | `ListView.builder` | 惰性构建，对应 FlatList 的虚拟化 |
| CSS flex | Row/Column + `mainAxisAlignment` | flex 概念直通，但写法是嵌套 widget 而非样式表 |
| TypeScript 联合类型 | Dart 枚举 + `switch` 表达式 | **switch 必须穷举**，编译器约束的状态机 |
| npm 生态 | pub.dev | 对应物齐全，数量少一个量级 |

### 1.2 上手最小可跑

`code/flutter-app` 一份文件承载全部业务：`lib/main.dart`——Order 模型 + ListView 列表 + 点按推进状态。

> 摘自 `./code/flutter-app/lib/main.dart`

```dart
class Order {
  const Order({
    required this.id,
    required this.title,
    required this.amount,
    required this.status,
  });

  final String id;
  final String title;
  final double amount;
  final OrderStatus status;

  Order advance() => Order(
        id: id,
        title: title,
        amount: amount,
        // Dart 的枚举切换必须穷举——编译器约束下的状态机
        status: switch (status) {
          OrderStatus.pending => OrderStatus.paid,
          OrderStatus.paid => OrderStatus.shipped,
          OrderStatus.shipped => OrderStatus.shipped,
        },
      );
```

列表页的状态更新——不可变列表重建 + setState，与 React 心智一致：

> 摘自 `./code/flutter-app/lib/main.dart`

```dart
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('订单工作台（Flutter）')),
      body: ListView.builder(
        itemCount: orders.length,
        itemBuilder: (context, index) {
          final o = orders[index];
          return ListTile(
            leading: Text('#${o.id}'),
            title: Text(o.title),
            subtitle: Text('¥${o.amount.toStringAsFixed(0)} · ${o.statusCn}'),
            // 不可变更新 + setState 通知重建：Flutter 状态管理的心智模型
            onTap: () => setState(() {
              orders = [
                for (final item in orders)
                  if (item.id == o.id) item.advance() else item,
              ];
            }),
          );
        },
      ),
    );
  }
```

### 1.3 环境配置（本仓库未实跑，配好后即可验证）

1. **装 Flutter SDK**：官方站下载 Windows 包，解压后把 `flutter/bin` 加入 PATH；
2. **Android 工具链**：装 Android Studio（含 SDK），跑 `flutter doctor --android-licenses` 接受许可；
3. **自检**：`flutter doctor` 四项全绿（Flutter / Android toolchain / Chrome / Android Studio）即可开发；
4. **跑起来**：
   ```cmd
   cd frontend/进阶/跨端与桌面深化/code/flutter-app
   flutter pub get
   flutter run -d chrome   :: 零 Android 依赖：同一份 Dart 代码编译到 Web（CanvasKit 渲染）
   flutter build apk       :: 出 Android 安装包
   ```

> Chrome 路线是**没有移动端环境时的最低成本验证**：UI 逻辑全部可跑，只是渲染引擎从 Impeller 换成 CanvasKit。

## 二、进阶：三棵树是 Flutter 的核心机制

### 2.1 Widget / Element / RenderObject

> 示意片段（无配套脚本）

```
Widget（配置，不可变，每帧可以重建）
  ▼
Element（实例 + 状态，持有生命周期，尽量复用）
  ▼
RenderObject（布局 / 绘制 / 命中测试，最重，跨帧复用）
```

Widget 声明「界面长什么样」，Element 是它在树中的常驻实例（**diff 就发生在这里**——`runtimeType` 与 `key` 都相同则复用），RenderObject 才真正参与布局绘制。声明式 + 不可变 Widget + Element 复用，让「每帧重建 Widget 树」不会引发昂贵的重排——与前端虚拟 DOM 分层同构。

用探针验证这条复用契约（`node ./code/cross-lab/three-trees.cjs`，本机实跑）：

> 摘自 `./code/cross-lab/three-trees.cjs`

```js
// ── 最小挂载器：模拟 build → diff → 复用/创建 ─────────────────
function mount(parentElement, widget) {
    if (!parentElement) {
        const el = new Element(widget)
        el.renderObject = new RenderObject(widget.type)
        return el
    }
    if (Element.canUpdate(parentElement, widget)) {
        parentElement.update(widget) // 复用 Element 与 RenderObject
        return parentElement
    }
    // 类型变了：Element 与 RenderObject 一起重建
    const el = new Element(widget)
    el.renderObject = new RenderObject(widget.type)
    return el
}
```

实测输出：三帧渲染 → Element 复用 1 次 · RenderObject 创建 2 次（类型不变即复用）——**每帧重建 Widget 无成本，代价被 Element diff 与 RenderObject 复用吸收**。

### 2.2 编译模式：JIT 开发期 / AOT 发布期

Dart 双编译模式是 Flutter 开发体验的来源：**开发期 JIT**（热重载毫秒级生效，保留解释执行），**发布期 AOT**（提前编译成机器码，运行时无解释器）。这与 RN 的动态化路线（下发 JS/字节码）形成根本分歧：AOT 产物是平台二进制的一部分，**运行时没有 JS 引擎可承载下发逻辑**——这就是「Flutter 动态化弱」的技术根源。

### 2.3 渲染管线：Impeller 与着色器编译

老管线用 Skia，Android 上首次遇到新着色器要现场编译（jank 的经典来源）。Impeller 在**构建期预编译着色器**，把运行期毛刺消掉。对业务的含义：复杂动效在 Flutter 上可预期性更好，但仍受限于自绘的电量与内存成本。

## 三、实战：flutter-app 走读（代码级）

完整工程在 `code/flutter-app`，两个值得对照的实战点：

**状态机用枚举穷举锁死**——比起 web 端字符串状态，Dart 的 switch 穷举让「加一个状态」变成编译错误驱动：

> 摘自 `./code/flutter-app/lib/main.dart`

```dart
enum OrderStatus { pending, paid, shipped }

const initialOrders = <Order>[
  Order(id: '1001', title: '机械键盘', amount: 399, status: OrderStatus.paid),
  Order(id: '1002', title: '无线鼠标', amount: 199, status: OrderStatus.pending),
  Order(id: '1003', title: '显示器支架', amount: 259, status: OrderStatus.pending),
  Order(id: '1004', title: 'USB-C 扩展坞', amount: 329, status: OrderStatus.shipped),
];
```

**ListView.builder 的惰性契约**——`itemBuilder` 只在条目滚入视口时调用，与 FlatList 的虚拟化同思路；区别是 Flutter 连列表项的复用池都暴露给了开发者（`ListView.builder` 之外的 `sliver` 系列可精细控制）。

## 四、最小实现：60 行模拟三棵树

三棵树的复用契约已经抽成探针 `three-trees.cjs`（原理见 §2.1），这里补齐它的 Native 侧视角——RenderObject 为什么能跨帧复用：

> 摘自 `./code/cross-lab/three-trees.cjs`

```js
// ── Element：Widget 的常驻实例，持有状态与生命周期 ─────────────
class Element {
    constructor(widget) {
        this.widget = widget
        this.renderObject = null
    }
    // Flutter 的 diff 发生在这里：runtimeType 与 key 都相同 → 复用 Element，
    // 只把新 Widget 挂上来（canUpdate 的语义）
    static canUpdate(old, next) {
        return old.widget.type === next.type && old.widget.key === next.key
    }
    update(next) {
        elementReuse++
        this.widget = next // 复用实例，只换配置
    }
}
```

`canUpdate` 这 3 行就是 Flutter diff 的全部判据——比 web 端虚拟 DOM 的 diff 简单得多，因为 Widget 是不可变的，比较只需看类型与 key。实测读数见 §2.1。

## 五、对比与边界

| 维度 | 判断 |
| --- | --- |
| 选它的理由 | 跨平台像素级一致；复杂动效/图形（Impeller 管线）；Dart 强类型穷举约束 |
| 不选的理由 | 包体积大（每端打一个引擎）；动态化弱（无 JS 引擎，热更新受平台政策限制）；换语言成本 |
| 高频坑 | widget 嵌套地狱（用提取 Widget 方法缓解）；`const` 构造器省 rebuild 的细节；平台插件（platform channel）通信也是异步消息模型 |

与 [React Native](./React%20Native.md) 的分工见 RN 篇 §五：**团队栈决定下限，体验要求决定上限**。

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/flutter-app/lib/main.dart` | 订单工作台：模型 + 列表 + 状态推进 | 一、三 |
| `./code/flutter-app/pubspec.yaml` | 依赖声明 | 一 |
| `./code/cross-lab/three-trees.cjs` | 三棵树复用契约探针 | 二、四 |
| `./code/cross-lab/jsi.cjs` | 通信模型基准（RN 篇引用） | — |
| `./code/cross-lab/mapper.cjs` | RN 原生映射器（RN 篇引用） | — |
| `./code/cross-lab/twin.cjs` | 双线程 setData（Hybrid 篇引用） | — |
| `./code/cross-lab/webview.cjs` | 预热池 / 离线包（Hybrid 篇引用） | — |
| `./code/cross-lab/bridge.cjs` | 桥协议（Hybrid 篇引用） | — |
| `./code/cross-lab/electron.cjs` | IPC / contextBridge（Electron 篇引用） | — |
| `./code/cross-lab/run.cjs` | 总入口：依次执行七探针 | 全篇 |

## 参考

- 本模块总结：[总结](./总结.md)
- 上一篇：[React Native](./React%20Native.md)
- 下一篇：[Electron](./Electron.md)
- 参考：[Flutter 架构概览](https://docs.flutter.dev/resources/architectural-overview) · [Impeller](https://docs.flutter.dev/perf/impeller) · [Dart AOT/JIT](https://dart.dev/overview#platform)
