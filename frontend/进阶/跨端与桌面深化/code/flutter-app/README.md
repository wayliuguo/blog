# flutter-app：Flutter 订单工作台

跨端板块「Flutter.md」配套实战工程。**完整代码交付，本仓库未实跑**（见下方实跑分级）。

## 实跑分级（正文 5.2 的约定）

| 层级 | 本仓库验证状态 |
|---|---|
| Dart 源码 | ✅ 完整可编译（SDK >= 3.3，使用 switch 表达式等 3.x 语法） |
| 构建产物 | ⚠️ 未实跑——需要 Flutter SDK + Android SDK，本机未配置 |

## 环境配置（配好后即可实跑）

1. **装 Flutter SDK**：<https://docs.flutter.dev/get-started/install/windows>，解压后把 `flutter/bin` 加入 PATH。
2. **Android 工具链**：装 Android Studio（含 Android SDK + 平台工具），接受许可：
   ```cmd
   flutter doctor --android-licenses
   ```
3. **自检**：
   ```cmd
   flutter doctor
   ```
   四项全绿（Flutter / Android toolchain / Chrome / Android Studio）即可开发调试。
4. **跑起来**：
   ```cmd
   flutter pub get
   flutter run                 :: 选设备（Windows 桌面 / Chrome / Android 模拟器）
   flutter build apk           :: 出 Android 安装包
   ```

> Chrome 路线零 Android 依赖：`flutter run -d chrome` 直接把同一份 Dart 代码编译到 Web（CanvasKit 渲染），验证 UI 逻辑足够。

## 结构

```
pubspec.yaml       依赖声明（flutter_lints 静态检查）
lib/main.dart      全部代码：Order 模型（switch 表达式状态机）+ ListView.builder 列表
test/              （可自行加 widget_test：官方模板默认有计数器测试，需替换）
```

## 正文对照点

- `setState` + 不可变列表重建 vs React/Vue 的响应式（正文 2.3）
- `ListView.builder` 惰性构建 vs FlatList / DOM 复用
- Dart switch 表达式穷举约束 vs TS 可辨识联合
- Widget 树 / Element 树 / RenderObject 树三层（正文 2.3 进阶）
