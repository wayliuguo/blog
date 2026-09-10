# Flutter 深入
> 级别：中级→高级

Flutter 采用 Dart 语言与自绘引擎，不依赖宿主原生控件，而是由 GPU 直接合成界面，因而拥有跨端一致的渲染与稳定流畅的动画。本章围绕 Flutter/Dart 基础、Widget 树、Skia/Impeller 渲染原理与常用状态管理方案展开，并在最后与 RN 做体系化对比。

按本书四层推进：

- **入门使用**：Dart 基础、Widget / Element / RenderObject 三层、StatefulWidget 状态；
- **进阶**：Skia 与 Impeller 自绘引擎、渲染流程与性能、状态管理（Provider / Bloc / Riverpod）；
- **实战**：与 RN 体系化对比、针对业务的自绘 vs 原生映射判断；
- **最小实现掌握原理**：到 `code/frontend/12-cross-platform` 运行 `render-models.html`，对比自绘引擎（Flutter）与原生映射（RN）两条渲染路径，看"自绘为何跨端一致"的模型差异。

## 一、Flutter 与 Dart 基础

### 1. 为什么是 Dart

Dart 被选中的原因并非偶然：

- **AOT + 即时编译**：移动端走 AOT 编译为机器码，启动快、性能稳定；开发态可 JIT 热重载。
- **类 C 语法 + 强类型**：前端/Java 背景上手平滑。
- **独立运行时**：不绑定 JS 引擎，渲染与逻辑可紧耦合。
- **Isolate 并发模型**：通过 isolate 之间消息传递实现并行，避免共享内存竞态。

```dart
// Dart 基础：强类型、命名参数、不可变对象
class User {
  final String name;
  final int age;
  const User(this.name, this.age);
}

void main() {
  const u = User('Alice', 28); // const 构造 → 编译期常量
  print('${u.name}, ${u.age}');
}
```

### 2. 异步模型

Dart 是单线程事件循环 + `async/await`，配合 `Future` 与 `Stream`：

```dart
Future<String> fetchUser(int id) async {
  await Future.delayed(Duration(milliseconds: 100)); // IO/Delayed
  return 'user-$id';
}

void main() async {
  final name = await fetchUser(1);
  print('loaded: $name');
}
```

## 二、Widget 树

### 1. Widget / Element / RenderObject 三层

Flutter 的核心是三层分离：

- **Widget**：UI 的不可变声明（描述"长什么样"）。
- **Element**：Widget 在树中的实例化，维护生命周期与属主关系。
- **RenderObject**：真正负责布局与绘制的对象。

```
Widget 树 (不可变声明)
   │  重建
   ▼
Element 树 (复用与 diff)
   │
   ▼
RenderObject 树 (负责布局/绘制/交互)
   │
   ▼
GPU 合成 → 屏幕
```

理解这一层是进阶关键：Widget 重建是廉价的（只是描述变化），真正的开销在 RenderObject 的布局与绘制，因此优化重心在于减少不必要的 rebuild 传导到 RenderObject。

```dart
// StatelessWidget 与 StatefulWidget
class Counter extends StatefulWidget {
  const Counter({super.key});
  @override
  State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _n = 0;
  @override
  Widget build(BuildContext context) {
    return TextButton(onPressed: () => setState(() => _n++), child: Text('$_n'));
  }
}
```

### 2. 分层与组合

Flutter 以 **组合** 而非继承复用 UI。渲染单元被拆成 `Container`、`Row`、`Column`、`Stack`、`ListView` 等小部件，按需叠加出复杂界面：

| Widget | 作用 |
|--------|------|
| Container | 尺寸/背景/边距的容器 |
| Row / Column | 水平/垂直弹性布局 |
| Stack | 层叠定位 |
| ListView | 滚动列表（懒加载） |
| Expanded / Flexible | flex 分配剩余空间 |

## 三、自绘引擎与渲染原理

### 1. Skia 与 Impeller

- **Skia**：传统 Flutter 的图形引擎。问题在于着色器编译（首次运行可能卡顿）、平台 GPU 差异。
- **Impeller**：新一代引擎。直接把渲染 API 编译为机器码的着色器，规避热编译卡顿，在各平台的着色器一致性更好，获得更稳定的帧率。

```
Dart 组件 → 布局 → 绘制指令 (Canvas)
   │
   ▼
图形引擎 (Skia / Impeller)
   │
   ▼
GPU 光栅化 → 屏幕
```

Flutter 之所以"一致"，是因为 UI 由引擎直接绘制，不受各平台原生控件外观差异影响——KS 正是依赖这一特性做到像素级统一。

### 2. 渲染流程与性能

绘制采用 **layer-based** 机制，配合：

- **RepaintBoundary**：隔离局部重绘，避免整页重绘。
- **const 构造**：让 Widget 在重建时可被复用，减少 diff 成本。
- **列表虚拟化**：ListView 只构建可视区。

```dart
// 用 const 降低重建成本
return const Icon(Icons.star, color: Colors.amber);

// 用 RepaintBoundary 隔离高频动画区域
RepaintBoundary(
  child: AnimatedContainer(duration: const Duration(milliseconds: 200), ...),
);
```

| 优化点 | 目标 |
|--------|------|
| const 构造 | 减少 rebuild 成本 |
| 拆分 build | 减少无谓重建传导 |
| RepaintBoundary | 限制局部重绘 |
| saveLayer 慎用 | 避免额外离屏合成 |
| 图片整包缓存 | 避免重复解码 |

## 四、状态管理

### 1. Provider

官方推荐的简单方案，基于 `InheritedWidget`，依赖注入 + 响应式：

```dart
// Provider 依赖注入
runApp(Provider<CounterModel>(
  create: (_) => CounterModel(),
  child: MaterialApp(home: MyHome()),
));
```
```dart
// 消费状态
final model = context.watch<CounterModel>();
```

### 2. Bloc

以事件驱动、单向数据流为特征的方案，适合大型项目，其核心是 `Event` 与 `State` 的映射：

```dart
// Bloc：UI 派发事件，Bloc 响应并发出新 State
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);
  void increment() => emit(state + 1);
}
```

结构清晰、可测试性好，但模板代码与心智成本相对高。

### 3. Riverpod

Provider 的加强版，编译期安全、可组合、内置异步处理，当前社区热度较高：

```dart
final counterProvider = StateProvider<int>((ref) => 0);
// 使用
final value = ref.watch(counterProvider);
```

| 方案 | 复杂度 | 适用 | 特点 |
|------|--------|------|------|
| Provider | 低 | 中小项目 | 简单、基于 InheritedWidget |
| Bloc | 中高 | 大型/业务复杂 | 事件驱动、单向数据流 |
| Riverpod | 中 | 通用/工程化 | 编译期安全、贴合 async |

## 五、与 RN 对比

| 维度 | Flutter | RN |
|------|---------|-----|
| 语言 | Dart | JS/TS |
| 渲染路径 | 自绘 GPU（Skia/Impeller） | 映射原生控件 |
| 与原生交互 | MethodChannel / FFI | JSI / NativeModules |
| 一致性 | 极高 | 平台差异中 |
| 启动速度 | AOT 快 | 依赖 JS 引擎初始化 |
| 动画性能 | 引擎绘制，流畅 | 依赖原生控件性能 |
| 学习曲线 | 中高（Dart+自绘） | 中（React 基础） |
| 热更新 | 开发态热重载；发版热更新受限 | JS bundle 可热更新 |

二者的本质差异是"自绘一切"与"复用原生控件"。自绘带来一致性与可控动画，但包体积更大、与原生 UI 融合需额外工作；RN 复用原生则贴近系统体验，但渲染一致性与动画性能取决于原生与桥。思考哪个适合自身业务，是最常被考察的判断题。

## 六、最小实现：自绘 vs 原生映射

到 `code/frontend/12-cross-platform` 运行 `render-models.html`：表格快照中 Flutter 走"自绘引擎（Skia/Impeller）GPU 绘制"，点开 Flutter 标签看完整流程链；再切到"自绘引擎"桥接平台，看统一接口如何把指令翻译成引擎描述——与 RN 的"原生映射"形成对照，理解自绘为何跨端一致。

> 原理一句话：Flutter 用自绘引擎直接绘制 UI，不依赖宿主原生控件，因此各端像素级一致、动画稳定，代价是包体偏大且与原生融合需额外工作。

## 面试衔接

本节对应 `90-附录-面试体系` 的「跨端开发」板块（题 116 及追问）：Flutter 自绘原理、为何选 Dart、与 RN 的渲染模型权衡。做真题自测后，进入下一节 `05-跨端渲染原理与性能优化`。