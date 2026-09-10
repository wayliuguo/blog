# AI 绘图与 AI 代码编辑器（入门→进阶→实战→最小实现原理）

> 级别：高级
> 本文按本书主线四层推进：入门理解文生图的异步任务模型、进阶掌握编辑器补全与 diff 应用、实战梳理协同与冲突处理、最小实现到 `code/frontend/18-emerging` 的 `ai-fe.html` 看浏览器推理概念。所有原理自足可懂，思路推演即可理解。

AI 前端两条最重的落地方向是**文生图/图生图**和**AI 代码编辑器**。前者考验异步任务编排（图像生成通常需数秒到数十秒），后者考验实时性极高的流式补全与 diff 应用、光标定位。此外，让大模型（图像/文本）直接在浏览器端用 WebGPU 推理，正成为新的前沿。本文从前端工程视角拆解这两类产品的核心机制，并给出浏览器端推理的可行路径。

## 一、AI 绘图前端集成

### 1. 文生图的异步任务模型

图像生成是**长耗时、无顺序保证**的任务，前端绝不能同步等结果，而应采用"提交任务 → 轮询/回调 → 展示结果"的模型：

```
提交提示词 ──▶ 返回 taskId ──▶ 轮询/SSE 查进度 ──▶ 拿到图片 URL ──▶ 前端渲染
```

### 2. 三种拿结果的方案对比

| 方案 | 实现 | 优点 | 缺点 |
| ---- | ---- | ---- | ---- |
| 短轮询 | 定时 GET 任务状态 | 简单通用 | 延迟高、浪费请求 |
| SSE 回调 | 服务端单向推送进度/结果 | 准实时、轻量 | 单向、需保持连接 |
| WebSocket 回调 | 双向实时通道 | 可双向交互、进度精细 | 较复杂 |

```js
// 轮询版本（示意）
async function submitAndWait(prompt) {
  const { taskId } = await fetch('/api/ai/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  }).then(r => r.json());

  while (true) {
    await sleep(2000);
    const { status, url } = await fetch(`/api/ai/task/${taskId}`).then(r => r.json());
    if (status === 'done') return url;
    if (status === 'failed') throw new Error('生成失败');
  }
}
```

> 生产环境更推荐 SSE 或 WebSocket：多图批量生成、生成中预览、逐条进度都可实时呈现。

### 3. 图生图（img2img）与前端预处理

图生图需要把用户上传的图片送到服务端，通常要先做**压缩、裁剪、转 Base64/Blob、生成落盘 URL**：

```js
async function toDataURL(file) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = await createImageBitmap(file);
  // 压缩到 512 内，控制体积
  const scale = Math.min(1, 512 / Math.max(img.width, img.height));
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}
```

### 4. 生成结果的前端处理

- 提供下载、重试、参数复刻（把 prompt/seed 回填到输入框）。
- 做**结果缓存**（prompt + 参数 hash 作 key），长图史轻量展示用缩略图懒加载。
- 涉及版权/内容审核时，前端做基础关键词拦截 + 后端强校验。

## 二、AI 代码编辑器核心

### 1. 整体架构：LSP-ish + 补全管线

AI 补全的核心链路是：**获取光标上下文 → 发送预测请求 → 流式接收补全 → diff 应用 → 光标定位 → 手动/自动接受**。

```
获取上下文 ──▶ 构造请求 ──▶ 流式补齐 ──▶ diff 应用 ──▶ 光标定位
（光标前/后代码）            （token级）  （minimal edits）
```

### 2. 补全的上下文组装

```js
function buildContext(cm, cursor) {
  const before = cm.getRange(0, cursor);          // 光标前内容
  const after = cm.getRange(cursor, cm.len());    // 光标后内容
  return { before, after, language: cm.language, cursor };
}
```

### 3. 流式补全与"幽灵文本"（ghost text）

编辑器用**幽灵文本**这种非实体的方式来展示候选补全，避免真实改动文档：

```js
// CodeMirror 6 的 tooltip 幽灵文本示意
const ghost = EditorView.decorations.of(
  Decoration.widget({
    widget: new GhostWidget(predictedText),
    side: 1,
    replaceParent: false,
  }).range(cursor)
);
```

### 4. diff 应用：把大段补全转成最小编辑

整段替换会很激进（覆盖用户刚写的内容），常用 **最长公共子序列（LCS）/ Myers diff** 提取增量，仅应用变化部分：

```
原文档:  const a = compute(a,
补全后:  const a = compute(add(a), x);
diff  → 仅插入 "add(" 与 "), x"
```

### 5. 光标定位与接受/拒绝

- 用户按 `Tab` 接受补全 → 定位到语义后的位置。
- 按 `Esc` 拒绝 → 恢复原文。
- 接受时应把"下一次建议的位置"同步给引擎，实现连跳。

```js
// 接受补全后按 anchor 设置光标
editor.dispatch(acceptChanges(ghost));
editor.setCursor(anchorPos);
```

## 三、协同与冲突

### 1. AI 编辑 vs 用户编辑并存

用户边输入、AI 边补全，会发生**并发编辑**。基本原则：**补全仅落到未发生冲突的区域**。

| 情况 | 策略 |
| ---- | ---- |
| 用户改动了开始符附近 | 忽略过期补全 |
| 用户改动与补全不重叠 | 正常应用 |
| 用户输入与补全重叠 | 丢弃补全、重新请求 |

### 2. 版本与撤销

- 每次应用/接受生成**一个可撤销的编辑单元**（`undoable()`），用户可 Ctrl+Z 回退 AI 改动。
- 与协同（CRDT/OT）框架集成时，AI 补全作为普通编辑操作参与合并。

## 四、浏览器端推理：WebGPU + Transformers.js

### 1. 为什么要把推理搬到浏览器

- **隐私**：图片/代码不出本机。
- **零部署延迟**：无需等服务端排队。
- **离线**：可离线使用轻量模型。
- 代价：受客户端算力与内存限制，适合中小模型。

### 2. Transformers.js 接入

```js
import { pipeline, env } from '@xenova/transformers';

env.allowRemoteModels = true;

async function run() {
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  const out = await extractor('前端嵌入示例', { pooling: 'mean', normalize: true });
  console.log(out.data.length); // 384 维向量
}
```

### 3. WebGPU 加速推理

- 图像/视频模型（YOLO、检测）可用 `onnxruntime-web` + WebGPU 后端在浏览器跑。
- 相比 CPU(wasm) 后端，WebGPU 后端吞吐显著更高，GPU 显存紧张时开销在量化模型上更可控。

| 后端 | 适用 | 性能 |
| ---- | ---- | ---- |
| WASM(CPU) | 通用兼容 | 较慢 |
| WebGPU(GPU) | 现代浏览器、GPU 可用 | 快数倍到十几倍 |
| WebGL(兼容) | 无 WebGPU 时降级 | 中 |

## 最小实现：用 Demo 验证原理

到 `code/frontend/18-emerging` 启动后打开 `ai-fe.html`：下拉可见浏览器跑模型的三种后端（WebNN / ONNX-WASM / WebGPU），并用预训练常量模拟"文字分类"的假推理，演示模型输入如何映射到分类输出——这正是本节"浏览器端推理"的最小形态。

> 原理一句话：浏览器推理的本质是"权重匹配特征 + 归一化得分"，离线用常量也能把这条链路跑通；真实场景只是把权重交给 ONNX/WebGPU 在显卡上算更快的同一件事。

## 面试衔接

本节对应 `90-附录-面试体系` 的「游戏与新兴方向（129-135）」板块：AI 绘图异步编排、AI 代码编辑器 diff 应用与冲突处理、浏览器端推理。做真题自测后，进入下一节 `05-AI组件与Agent网页端`。