# wasm-infer — 端侧 WASM 推理最小实现（AI 前端工程 · 端侧推理与 WASM 篇实战）

wat 手写推理内核 → wabt.js 编译 → Node/浏览器同款 WebAssembly API 加载执行。模型是 4 维特征线性打分器（5 个参数），但它完整演示端侧推理三段骨架：**装载权重到共享内存 → 调 wasm 前向 → 读结果做后处理（softmax）**。

## 跑起来

```cmd
cd code\wasm-infer
npm install          :: 只装 wabt（wat→wasm 编译器）
npm start            :: = build.mjs（wat 编译出 score.wasm，129 字节）+ infer.mjs（推理）
```

## 实验 ↔ 篇目对照表

| 实验点 | 代码位置 | 对应篇目小节 |
| --- | --- | --- |
| wat 内核（循环 + f32 运算 + 共享内存往返） | `wat/score.wat` | WASM 是内核：手工字节码的可读版 |
| 权重装载 / 特征写入 / 结果读回（共享内存布局） | `infer.mjs` | 模型加载与推理骨架 |
| 模型输出 → 概率（softmax/sigmoid 后处理） | `infer.mjs` predict | 内存预算之外的推理后处理 |
| JS 复算对照（防内核写错） | `infer.mjs` jsScore | 验证纪律 |
| 分片加载 / KV cache 预算 / 主线程阻塞（探针） | `../ai-lab/wasm.cjs` | 端侧篇二、四、五节 |

## 验证记录（2026-10-14）

- wabt 编译产出 `score.wasm` 129 字节；三组样本 wasm 读数与 JS 复算逐位一致（1.5100 / 0.2300 / -1.3500），P(转化) 81.9% / 55.7% / 20.6%。
