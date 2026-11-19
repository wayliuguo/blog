# 模块系统与包管理

《模块系统与包管理》配套实验代码：CommonJS / ES Module 的本质特征与模块缓存。

对应博客：`node/运行环境/模块系统与包管理.md`。

## 结构：一个特性一个子文件夹

每个子文件夹自包含（自带被导入的 `counter` 模块），互不引用，可单独运行：

```
src/
├── value-copy/       # 特性：CommonJS 导出的是「值的拷贝」（快照）
│   ├── counter.cjs       # 被导入方：module.exports 导出
│   └── value-copy.cjs    # 入口：内外视角对比读 count
├── live-binding/     # 特性：ESM 导出的是「活绑定」（实时同步）
│   ├── counter.mjs       # 被导入方：export 导出
│   └── live-binding.mjs  # 入口：内外视角对比读 count
└── module-cache/     # 特性：模块缓存，同一个文件只执行一次
    ├── counter.cjs       # 被导入方：加载时打印一行日志
    └── module-cache.cjs  # 入口：三次 require + require.cache + 删缓存
```

## 环境要求

- 本目录 `package.json` 设了 `"type": "commonjs"`，所以 `.js` / `.cjs` 文件按 CommonJS 解析
- 单文件用 ESM 的，单独用 `.mjs`（如 `live-binding/live-binding.mjs`）
- 全部使用 Node 内置模块，**无第三方依赖**，无需 `npm install`

## 运行与预期输出

| 特性 | 命令 | 预期输出要点 |
| --- | --- | --- |
| 值的拷贝 | `npm run value-copy` | 外部 `count` 停在 0，内部 `peek()` 是 1 —— 外部看到的是导出那一刻的快照 |
| 活绑定 | `npm run live-binding` | 外部 `count` 实时变成 1 —— 导出的是活绑定，不是快照 |
| 模块缓存 | `npm run cache` | 三次 `require` 两两 `===` 全为 `true`；`require.cache` 里只有 1 条记录；删缓存后再 `require` 得到新对象，模块体日志第二次出现 |

## 为什么值得跑一遍

- `value-copy` / `live-binding` 这一对把「值拷贝 vs 活绑定」压到最小：同样的计数器、同样的 `inc()`，外部读到的结果一个是 0 一个是 1；
- `module-cache` 解释了为什么同一个模块顶层代码不会重复执行、循环依赖里为什么会拿到「半成品」。

本目录所有脚本不写任何文件到磁盘，也不安装任何依赖。
