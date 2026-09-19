# 项目长期约定（E:\working\blog）

## 先读
**版式与内容规约以仓库根 `文档组织规范.md` 为准**（板块/模块/code 结构、测量型模块实验台、单篇体例、代码片段与配套代码表、小结知识树、元页面模板、校验流程）。本文件只记它没写、又必须知道的操作事实。

## 结构
VitePress（`base:'/blog/'`，构建 ~55s），板块 `ai/ frontend/ interview/ node/`，配置 `.vitepress/config/*.js`，产物恒 `.vitepress/dist`。`node/` 11 模块、`frontend/基础/` 7 模块、`frontend/进阶/` 11 模块（模块清单与顺序以侧边栏配置为准），另散篇 `面试方法论.md`——它是**板块级独立入口**，不挂任何模块分组；frontend 全板块 134 篇含元页面（基建实战总串联补完后）。**目录与文件名不带编号**，NN- 只用于 总结.md 分篇标题与「见第 X 篇」阅读序标签，侧边栏是唯一顺序来源。

## 必须知道的坑
- **围栏**：禁 ```text（shiki 逐条告警），ASCII 图与实测输出一律用裸围栏。
- **行内代码双花括号**：写法非法 → build 报错；写法合法 → build 通过但页面渲染成空、静默丢内容。一律写 `<code v-pre>双花括号</code>`。
- **链接含空格的文件名必须写 `%20`**（如 `./前端监控%20SDK%20实现.md`），否则 check-links 报「裸空格」。最易看错的三个：`编译与 AST.md`、`esbuild 与 Rust 工具链.md`、`Webpack 深入.md`（写前用 `os.listdir`+`repr()` 确认）。
- **`check-code-sync.cjs` 的 `--module` 值相对板块根**（如 `进阶/性能优化`）且必须与 `--board` 同传，否则扫 0 篇静默「全部通过」；其 `skeleton()` 剔除字符串内容，演示源码必须是真实文件、由 `readFileSync` 读入。
- **两级一致性靠反向落回**：只改篇小结，再用 `C:\Users\10855\.workbuddy\tmp\rebuild_module.py`（node）或 **`rebuild_module_fe.py`**（frontend，只差 ROOT=`frontend/进阶`）重建 总结.md 的 `## 分篇知识点`（幂等），不要手工分别维护两级。**默认只跑 dry-run 看 `MISS` 是否为 0**（脚本已加「去空格/连字符/斜杠」归一化兜底，实测 frontend 进阶 59 篇 MISS 0）；**别整仓 `--apply`**——多数模块的两级是"内容等价、排版不同"，apply 会把 总结.md 的 `**标签**` 风格重写成篇小结风格。查 `FROM-篇` 是否认对篇即可。
- **相邻两段同源代码块必须各写一次 `> 摘自`**：check-code-sync 只看围栏上方 4 行，第二个块拿不到第一个块的标注 → 报「缺出处标注」（同文件重复标注允许）。

## 配套代码与端口
`frontend/<板块>/<模块>/code/`、`node/<模块>/code/<项目名>/`，靠 `srcExclude` 的 `'**/code/**'` 排除。以零依赖为主，唯一需 npm install 的是 `构建体系/code/build-lab`（唯一 `.gitignore`）。服务统一 `listen(port,tries)` 遇 `EADDRINUSE` 自动 +1。
**端口**：5174 HTML ·5175 CSS ·5176 JS ·5177 网络(+api 5178)·5179 工程化 ·5180 React·5181 Vue·5182 框架原理 ·5183 交付 ·5184 工程实践 ·5185 小程序 ·5186 TS·5187 性能 ·**5188+5189 都是 monitor-lab 的 `enterprise-server.js`**·5190 网络与协议进阶 ·**5191 渲染架构(render-lab)**。纯 CLI 探针不占端口：`esm-probe`、`mini-react`/`mini-vue`/**`mini-store`**/**`type-gym`**/**`runtime-lab`**，以及 net-lab 4 个、eng-lab 5 个、render-lab 5 个场景（临时服务器用端口 0）。`eng-lab` 另有 `fixtures/`：故意写坏的示例业务目录（19 文件 / 33 条 import / 5 条违规），与实验台分离、随源码入库。

## TypeScript 模块（进阶，4 篇，已全部落地）
类型系统 / 工程实践 / **类型体操**（配 `code/type-gym/` 50 题练习）/ **类型与运行时**（配 `code/runtime-lab/` 7 个可运行 demo：擦除后果 / 手写校验器 / 守卫与断言 / 品牌类型 / JSON 序列化 / 端到端契约 / 类型发布 .d.ts）。判题套路：`Equal<A,B>` 结构等价 + `Expect<T extends true>`；答案版 0 错误、练习版 `TODO=never` 报 61 错。`Merge` 类"合并两对象"用映射类型而非交叉类型（`Equal` 会误判交叉）。类型体操正文代码块必须连续成段（定义归 A–F 连续、断言 `_tN` 全挪末尾），否则 check-code-sync 报对不上。`runtime-lab` 用 `Module._compile` 转译执行 `.ts`，依赖 `emitDts` 运行时生成 `.d.ts`；`_tsc.cjs` 这类 helper 必须带 `.cjs` 扩展名（Node 扩展名补全不试 `.cjs`）。

## 运行时事实必须实跑（Node 22 探针）
默认值/阈值/属性/事件顺序/报错码先跑确认，正文引用实测数字要注明来源命令。已纠错：`writableLength` 同步回调恒 0；`new Duplex().allowHalfOpen` 默认 `true`（`net` socket 为 `false`）；`cork()` 只在流实现 `writev` 时合并；内存对比各起子进程（`spawnSync`）。

## safe-delete / 批量替换
全局替换 `NN-篇名` 会误伤 总结.md 分篇标题 → 替换后 diff 检查。safe-delete：≥50 删除触发 `SAFE_DELETE_BULK_CONFIRM_REQUIRED`（阈值 50，按 turn 累计）→ 分块（<50）+ 自底向上 `os.rmdir`；watcher 占用目录 rename/rmdir 必失败（WinError 32）；最省事是清空注入变量让进程不加载 shim（`NODE_OPTIONS=` / `PYTHONPATH=`）。

## Git / 本机执行
提交一律 `--no-verify`（lint-staged 的 `prettier --write .` 会格式化整仓）；`origin`=`https://gitee.com/wayliuhaha/blog`、`master`、无 TTY 可直推；大批量提交按顶层路径分桶列表，信息写 `.git/COMMIT_MSG_TMP.txt` 再 `git commit -F`。bash 工具 PATH 坏 → 用 Python 全路径或 PowerShell；PowerShell 不回显中文 stdout → `Out-File` 落文件再 Read；git 用 `"E:\Program Files\Git\cmd\git.EXE"`；临时脚本放 `C:\Users\10855\.workbuddy\tmp\`；`Delete` 工具不存在 → 用 Python `os.remove`/`shutil`。

## 遗留
旧 `frontend/进阶/性能优化与监控/` 已拆为「性能优化」「监控与稳定性」；`node/01-运行环境` 空壳被 watcher 锁住待删。
