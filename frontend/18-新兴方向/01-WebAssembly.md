# WebAssembly 与前端高性能计算（入门→进阶→实战→最小实现原理）

> 级别：高级
> 本文按本书主线四层推进：入门理解 Wasm 是什么为什么、进阶掌握编译加载链路与 wasm-bindgen 使用、实战分析应用场景与交互细节、最小实现到 `code/frontend/18-emerging` 看 wat 格式与概念可视化，用 demo 直观理解为什么 Wasm 接近原生速度。所有原理自足可懂，不依赖特殊实验环境。

WebAssembly（简称 Wasm）是一种面向浏览器的低层字节码格式，让网页能以接近原生的速度运行 C、C++、Rust 等编译型语言的代码。它并非要替代 JavaScript，而是作为 JS 的性能补充，把 CPU 密集型的计算任务从解释执行中解放出来。本文从"为什么需要 Wasm"讲起，覆盖编译与加载流程、与 JS 的交互方式、wasm-bindgen 与 Rust 入门、真实应用场景，以及 WASI 与未来趋势。

## 一、WebAssembly 是什么

### 1. 一句话定义

WebAssembly 是一种**可移植、体积紧凑、加载极快**的字节码格式，定义了标准的二进制格式（`.wasm`）与对应的人类可读文本格式（`.wat`），并作为浏览器中的一种执行单元，以接近原生的速度运行。

```text
更高层语言(C/C++/Rust/Go)  ──编译──▶   .wasm 二进制字节码  ──实例化──▶  浏览器沙箱执行
```

| 维度 | JavaScript | WebAssembly |
| ---- | ---- | ---- |
| 执行方式 | 解释执行 + JIT | AOT 编译为机器码，接近原生 |
| 类型 | 动态类型 | 静态类型（i32/i64/f32/f64 等） |
| 内存 | 堆由引擎管理 | 显式线性内存（Linear Memory），可共享 |
| 适用 | 通用逻辑、DOM、事件、UI | CPU 密集计算、图形、加密、编解码 |
| 兼容 | 全部现代浏览器 | 全部现代浏览器均已支持 |
| 大小 | 大 | 二进制体积小，加载快 |

### 2. 它为什么重要：三大动因

- **性能**：计算密集任务（图像处理、音视频编解码、哈希、渲染）用 JS 写性能有限，Wasm 可达接近原生的效率。
- **复用存量代码**：大量成熟的 C/++/Rust 库（ffmpeg、zlib、libjpeg、SQLite）可以直接编译进浏览器，不必重写。
- **超越浏览器**：通过 WASI，Wasm 可以运行在服务端、边缘节点、插件系统里，成为真正的"一次编译，处处运行"的格式。

### 3. 与 "asm.js" 的关系

在 Wasm 之前，Emscripten 团队提出 **asm.js**——用 JS 子集（带注解的算术严格模式）表达可被预言式优化的计算代码。Wasm 是 asm.js 演进的"原生字节码"形态，更紧凑、加载更快、收益确定。

## 二、编译与加载流程

### 1. 从源码到字节码到运行

```
源文件(.rs/.c/.cpp)  -->  clang/rustc  -->  .wat(文本)  -->  .wasm(二进制)  --> 浏览器加载执行
                                              ^                                    |
                                              └────── 可直接 human 查看/调试 ──────┘
```

- **.wat**：WebAssembly Text Format，人类可读文本，类似汇编助记符视角。
- **.wasm**：实际分发的二进制格式，浏览器直接执行。
- **指挥官工具**：`wat2wasm` 把文本转二进制，`wasm2wat` 反向操作（来自 wabt 工具链）。

### 2. 一个最小的 wat 例子

```wat
(module
  (func $add (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.add)
  (export "add" (func $add)))
```

### 3. 加载与实例化的三阶段

```js
// 1. fetch 二进制
const bytes = await fetch('./add.wasm').then(r => r.arrayBuffer());

// 2. 编译（可缓存 WebAssembly.Module，避免重复编译）
const module = await WebAssembly.compile(bytes);

// 3. 实例化，得到可调用对象
const instance = await WebAssembly.instantiate(module);
console.log(instance.exports.add(2, 3)); // 5
```

更简洁的一步式 API：

```js
const { instance, module } = await WebAssembly.instantiateStreaming(
  fetch('./add.wasm')   // 流式编译，边下载边编译，加载更快
);
```

### 4. 加载性能对比

| 加载方式 | 是否有 Streaming | 体验 |
| ---- | ---- | ---- |
| `WebAssembly.compile(bytes)` | 否，等完整下载 | 简单但慢 |
| `WebAssembly.compileStreaming()` | 是 | 推荐的编译路径 |
| `WebAssembly.instantiateStreaming()` | 是 | 最常用，一步到位 |

> 建议始终优先使用 `instantiateStreaming`，大幅缩短首屏可用时间。

## 三、wasm-bindgen 与 Rust 入门

### 1. 为什么选 Rust 组合

- Rust 无 GC、内存安全、无运行时依赖，生成的 Wasm 体积小、性能好。
- 官方工具链成熟：`wasm-pack`、`wasm-bindgen`、`cargo` 一站式体验。
- 类型安全：通过 `wasm-bindgen` 自动生成 JS 与 Rust 之间的胶水绑定。

### 2. 环境搭建

```bash
# 安装 rust 工具链
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 添加浏览器目标
rustup target add wasm32-unknown-unknown

# 安装打包工具
cargo install wasm-pack
```

### 3. 编写一个 Rust 模块

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}
```

### 4. 打包并在 JS 中使用

```bash
wasm-pack build --target web
```

```js
import init, { fibonacci, greet } from '../pkg/your_crate.js';

await init();          // 初始化 wasm 模块
console.log(fibonacci(20)); // 6765
console.log(greet('前端')); // Hello, 前端!
```

### 5. 关键概念表

| wasm-bindgen 特性 | 说明 |
| ---- | ---- |
| `#[wasm_bindgen]` | 标注可被导出的函数/结构体 |
| 字符串 | JS `String` ↔ Rust `String` 自动转换 |
| 数组/向量 | 通过 `js_sys::Array` 或共享内存 `Vec<u8>` |
| `#[wasm_bindgen(js_name = ...)]` | 自定义导出到 JS 的名字 |
| `Closure` | 允许把 Rust 回调交给 JS 事件系统 |

## 四、应用场景

### 1. 典型应用全景

| 领域 | 代表库/产品 | Wasm 作用 |
| ---- | ---- | ---- |
| 图片处理 | Sharp 浏览器版、Canvas 滤镜 | 像素级算法提速 |
| 音视频解码 | ffmpeg.wasm | 在浏览器解码/转码音视频 |
| 编辑器 | Monaco/CodeMirror、LSP 相关 | 解析、高亮、大文件处理 |
| 加密 | WebCrypto 无法覆盖时的纯 Wasm 实现 | 哈希/加解密 |
| 数据库 | sqlite wasm | 在浏览器跑 SQLite |
| 游戏/物理 | Unity/Box2D | 高帧率物理模拟 |
| 压缩/解压 | zlib、lz4 | 数据处理性能 |

### 2. 一个图片模糊处理的伪代码

```js
import init, { blur } from './image_wasm.js';
await init();

const raw = new Uint8Array(imageData.data);   // RGBA 像素
const out = blur(raw, width, height, radius); // Rust 侧循环卷积
// 把 out 写回 canvas 即可
```

## 五、与 JavaScript 交互细节

### 1. 内存模型

Wasm 拥有自己的一块**线性内存**（`WebAssembly.Memory`），JS 通过 `instance.exports.memory.buffer` 构造 `Uint8Array` 来读写，避免大数据逐拷贝：

```js
const mem = new Uint8Array(instance.exports.memory.buffer);
// 在 mem 中填入参数区域，然后调用 wasm 函数，最后读结果
```

### 2. 数据传递的选择

| 数据量 | 推荐方式 | 说明 |
| ---- | ---- | ---- |
| 小（数字/布尔） | 直接作为参数 | 零拷贝最省事 |
| 中（字符串/数组） | wasm-bindgen 胶水 | 框架自动分配与转换 |
| 大（图像/媒体流） | 共享 Memory buffer | 避免多次复制 |

### 3. 限制与开销

- 每次 JS↔Wasm 调用都有边界开销，**太细粒度的调用会抵消性能收益**。
- 建议批量：一次调用处理一大片数据，而非一元素一调用。
- 不能直接从 Wasm 操作 DOM，必须经由 JS 桥接。

## 六、WASI 与未来

### 1. WASI 是什么

**WASI**（WebAssembly System Interface）是标准化的系统接口层，让 Wasm 能访问文件系统、网络、时钟、环境变量等操作系统能力。结合 Wasmtime、WasmEdge 等运行时，Wasm 可以脱离浏览器跑在**服务端、边缘、物联网**设备上。

```
+----------------------+
|  应用 (Rust/C/Go)     |
+----------------------+
|  WASM 字节码 (与运行平台无关) |
+----------------------+
|  WASI (标准系统接口)   |
+----------------------+
|  宿主运行时/Host OS    |
+----------------------+
```

### 2. 相关里程碑

- **Component Model**：让不同语言的 Wasm 模块能像 npm 包一样互操作。
- **Wit（Wasm Interface Type）**：描述接口的语言无关 IDL。
- **WasmGC**：支持垃圾回收，便于把更多语言（含高阶语言）带入 Wasm。
- **SIMD / Threads**：已被广泛支持，进一步提升计算能力。

### 3. Wasm 与前端未来的关系

Wasm 不会取代 JS，而是与 JS 协同：**JS 负责 UI 与交互，Wasm 负责重计算**。像 edge functions（Vercel/Cloudflare Workers/Rust）、浏览器内大模型推理（配合 WebGPU）等新方向，都以 Wasm 为核心承载层。理解 Wasm 与 JS 的分工边界，是进阶前端工程师触达高性能计算领域的关键。

## 最小实现：用 Demo 验证原理

到 `code/frontend/18-emerging` 启动后打开 `wasm-note.html`：即可对照 JS 与 Wasm 的执行方式差异、看清「源码 → .wat → .wasm → 实例化」的编译链路，并看到一个最小 `add` 的 wat 文本示例。

> 原理一句话：Wasm 在下载时被一次性地编译成机器码，之后每次调用都接近原生，这正是它比逐行解释 + JIT 的 JS 更快的原因——JS 负责 UI 与交互，Wasm 负责重计算，二者协同。

## 面试衔接

本节对应 `90-附录-面试体系` 的「游戏与新兴方向（129-135）」板块：WebAssembly 是什么、和 JS 的关系、加载流程与 `.wat`/`.wasm`。做真题自测后，进入下一节 `02-PWA渐进式网页应用`。