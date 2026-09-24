# 项目长期约定（E:\working\blog）

## 先读
**版式与内容规约以 `文档组织规范/` 目录为准**（`readme.md` 是索引，细则在 `reference/*.md`：板块与配套代码、单篇体例、代码片段与配套代码表、模块总结、模块面试题、改动后的校验；测量型模块实验台在「板块与配套代码」篇）。本文件只记它没写、又必须知道的操作事实。

## 长节体例（2026-09-24 第三轮定稿，取代「五段骨架」与「总览 → 手段」两版）
长节（多子层、多手段）= **三层钻取 + 标题即结论**（规约见 `reference/单篇体例.md` 的「长节：标题就是结论，证据跟在结论下」）：
`## 章`（定位句 + 章级结构化表达〔指标构成 ASCII 按需 + 「子层 / 服务哪一段 / 手段清单」表〕）→ `### X.Y 子层`（定位句 + 结构化表达〔判断表 / 清单 / ASCII 按需〕）→ 每手段一个 `#### X`（列表给要点，证据直接跟在下面）。
- **不再有「总览」这个中间标题**（BLUF 里的多余可见标签）；**不用** `总纲/结论/观点或佐证/注意事项/事项` 五段；**不强制贴「解析/佐证」标签**——列表项本身就是判据，代码块 / 读数表 / 补充说明直接跟其后；注意事项并入该手段的列表项，不单开一节。
- 选形按信息形态：并列对比→表格；并列条目 / 先后次序→有序或无序列表；结构流程说不清→ASCII（**按需，不是每层必备**）。
- 证据（读数表 / 代码块）**逐字保留**（check-code-sync 按字符比对）。范例：`frontend/进阶/性能优化/性能优化体系与指标.md`。

## 结构
VitePress（`base:'/blog/'`），板块 `ai/ frontend/ interview/ node/`，配置 `.vitepress/config/*.js`，产物恒 `.vitepress/dist`（**base 只影响 URL，dist 目录不带 `blog/` 前缀**）。`node/` 11 模块、`frontend/基础/` 8 模块、`frontend/进阶/` 19 模块（**全部落地，无占位**：微前端 5、可视化与图形 5、浏览器底层与 V8 4、跨端与桌面深化 4、AI 前端工程 4、低代码与搭建 4、复杂交互与编辑器 4、研发平台与效能 3、工程素养 3），另散篇 `面试方法论.md` 为板块级独立入口，frontend 全板块 198 篇含元页面。**目录与文件名不带编号**，NN- 只用于 总结.md 分篇标题与「见第 X 篇」阅读序标签，**侧边栏是唯一顺序来源**。
- **性能优化模块（2 篇，2026-09-24 第三轮定稿）**：`性能优化体系与指标.md` 为 **6 章**：一、指标体系〔1.1 核心指标 / 1.2 辅助指标 / 1.3 排障主线表〕／二、口径与工具〔2.1 口径 / 2.2 工具；**由原 §1.4 拆出独立成章**〕／三、加载层 LCP〔3.1 网络层 / 3.2 构建与产物层 / 3.3 资源层 / 3.4 感知层〕／四、运行层 INP〔4.1~4.4〕／五、视觉层 CLS〔5.1~5.4〕／六、收口〔6.1~6.3〕。配套 `性能优化实战.md`（实验台手册）+ 总结 / 面试题。
  - **开头不写引言陈述**；全篇主线 = **1.3 那张「核心指标｜先看哪个辅助指标｜异常信号｜归属层｜层内定位什么｜优化方案」索引表**；每个指标必须标「英文全称 + 中文含义」（如 `FCP (First Contentful Paint)(首次内容绘制)`）。
  - 现场侧（RUM 采集 / 看板 / 告警）归「监控与稳定性」模块，两模块在 **体系篇 6.3 / 实战篇 / `性能与体验监控.md`** 建接口。跨模块引用**不带小节号**（写「篇的网络层／篇的加载层」）。
  - 历史（已作废，别再找）：旧「一、四步主线」「三、第二步·定位」两章、《性能优化分层手段》独立篇，以及 8 篇旧文（总纲与指标量化 / 加载性能与 LCP / 交互性能与 INP / 视觉稳定与 CLS / 性能优化闭环 / 优化手段速查 / Vue SPA 性能实战 / 性能优化分层手段）均已删或并入。

## 必须知道的坑
- **围栏**：`text`/`ejs`/`plaintext` 会 shiki 告警（`txt` 是别名不告警），ASCII 图、模板示例、实测输出一律用裸围栏。
- **行内代码双花括号**：一律写 `<code v-pre>双花括号</code>`（写法非法→build 报错；写法合法→build 通过但页面渲染成空、静默丢内容）。
- **链接含空格的文件名必须写 `%20`**（如 `./前端监控%20SDK%20实现.md`），否则 check-links 报「裸空格」。最易看错三个：`编译与 AST.md`、`esbuild 与 Rust 工具链.md`、`Webpack 深入.md`（写前用 `os.listdir`+`repr()` 确认）。
- **`check-code-sync.cjs`**：`--module` 相对板块根（如 `进阶/性能优化`）且必须与 `--board` 同传，否则扫 0 篇静默「全部通过」；`skeleton()` 剔除字符串内容与全部空白（缩进 / 空行不影响），比对是去空白后 `includes` 连续子串——**引用块中间漏行必挂**。演示源码必须真实文件、由 `readFileSync` 读入。**三个校验脚本在 `.workbuddy/scripts/`**：`check-code-sync.cjs` / `check-links.cjs` / `check-sidebar-coverage.cjs`。
- **相邻两段同源代码块必须各写一次 `> 摘自`**：脚本只看围栏上方 4 行，第二个块拿不到第一个块的标注 → 报「缺出处标注」（同文件重复标注、跨篇引用同一文件都允许）。
- **`> 摘自 <path>` 的脚本必须出现在该篇 `## 配套代码` 表里**（`tablePaths()` 只认第一列含 `/` 的行）。**文档代码块比源码多一个尾逗号 / 少一行也挂**（骨架里逗号是有效字符）——实测踩到：正文 `maxQueue: 100,`（源码 `maxQueue: 100`）报「代码对不上」。
- **两级一致性（脚本已失效）**：`frontend/进阶/*/总结.md` 现为「`## 大纲`（`- **N. 章**` + `  - N.N 知识域`）+ 同号正文 `## N` / `### N.N`」，**大纲与正文标题必须一一对应、两级都手工改**（规约见 `reference/模块总结.md`）。`tmp/rebuild_module*.py` 是给旧版「`## 分篇知识点`」写的，对该目录 19 个模块直接报「无 ## 分篇知识点」并跳过——**别再用**。
- **新增知识域要同时动三处**：篇正文 → 总结.md `## 大纲` 加一行 → 同号正文加 `### N.N`（插中间要顺移后面所有编号）。面试题.md 可不跟进（中途插题会让其后 Q 号全部重编）。

## 配套代码与端口
`frontend/<板块>/<模块>/code/`、`node/<模块>/code/<项目名>/`，靠 `srcExclude` 的 `'**/code/**'` 排除。以零依赖为主，需 `npm install` 的是 `构建体系/code/build-lab` 与 `进阶/性能优化/code/perf-lab`（各有 `.gitignore`）。服务统一 `listen(port,tries)` 遇 `EADDRINUSE` 自动 +1。
- **实验台两种合规形态**（规约见 `reference/板块与配套代码.md`）：① `scenarios/*` 一场景一脚本 + `cli.mjs` 分发 + 每场景一条 npm script（monitor-lab / net-lab / eng-lab）；② **单入口 + 真实构建工具工程**（perf-lab；选 ② 时 README 必须给「实验 ↔ 篇目小节」对照表）。
- **perf-lab = 两个独立 vite 工程 + 一份共享源码 + 纯手动对照（2026-09-24 第五轮定型）**：`apps/before`（入口 `raw.html` + `memory.html`，四视图静态 import）与 `apps/after`（入口 `index.html`，动态 import），业务源码**唯一一份**在 `shared/`（两边 `resolve.alias['@lab']`）；根 `package.json` 用 `workspaces: ["apps/*"]`。只有 `dev:before`/`dev:after`/`build:before`/`build:after`/`build`/`preview:*` 脚本，**没有 `lab` 命令、没有 `harness/` 目录、没有 `pages/` 与 `src/`**。`npm run build` 两工程各自独立出 `dist-before/` 与 `dist-after/`（已 gitignore）。手动 `dev:before`（5187/raw.html）· `dev:after`（5193/index.html），实验靠 DevTools Slow 3G 限速 + 页面内 `lab.js` 读数。**改 lab 源码或加 `shared/public/lab-assets/` 资源后必须手动 `npm run build` 重出 dist**（文档站不会替你重建）。已作废：`dist-raw/`·`dist-opt/`·`--mode raw/opt`·「一个工程两个入口」。
- **perf-lab 12 个实验**：8 个基础 case（nav/agg/scroll/images/cls/cache/memory）+ 4 个页面内对照（`?act=rerender` 配 `key=idx|id`/`sink=0|1`、`banner` 配 `reserve=0|1`、`font` 配 `sz=0|1`、`anim` 配 `anim=top|transform`），全由 `App.vue` 的 `drive()` 按 `location.search` 的 `?act=` 触发；**`?act=` 必须在 `#` 之前**（`#/list?act=x` 会静默失效——关键坑）。读数挂 `window.__spa.exp[act]()`；`lab.js` 用 `PerformanceObserver`（paint/LCP/layout-shift/longtask）+ `getEntriesByType('resource').transferSize`，`Lab.finish()` 把 payload 打到 console。**CLS 一律报 4 位小数**（`Math.round(v*10000)/10000`）。
- 参考体积（2026-09-23 基准）：`raw-*.js 73.45 kB`（gzip 30.17）/ `optimized-*.js 56.80 kB`（gzip 23.12）/ `ReportView 8.41` / `ListView 5.45` / `DetailView 3.90` / `index.html 2.82`。**vite 4 构建日志的 kB = `code.length / 1000`（十进制、按 UTF-16 字符数）**，别写成 1024 进制。
- **端口**：5174 HTML ·5175 CSS ·5176 JS ·5177 网络(+api 5178)·5179 工程化 ·5180 React·5181 Vue·5182 框架原理 ·5183 交付 ·5184 工程实践 ·5185 小程序 ·5186 TS·**5187 性能 dev:before** ·**5188+5189 monitor-lab `enterprise-server.js`**·5190 网络与协议进阶 ·**5191 渲染架构(render-lab)**·**5193 性能 dev:after**。纯 CLI 探针不占端口：`esm-probe`、`mini-react`/`mini-vue`/`mini-store`/`type-gym`/`runtime-lab`/`sandbox-lab`/`mf-demo`/`mini-micro`/`viz-lab`/`screen-lab`/`v8-lab`，以及 net-lab 4 个、eng-lab 5 个、render-lab 5 个场景（临时服务器用端口 0）。`eng-lab/fixtures/`：故意写坏的示例业务目录（19 文件 / 33 条 import / 5 条违规），随源码入库。

## TypeScript 模块（进阶，4 篇，已全部落地）
类型系统 / 工程实践 / **类型体操**（配 `code/type-gym/` 50 题）/ **类型与运行时**（配 `code/runtime-lab/` 7 个 demo）。判题套路：`Equal<A,B>` 结构等价 + `Expect<T extends true>`；答案版 0 错误、练习版 `TODO=never` 报 61 错。`Merge` 类「合并两对象」用映射类型而非交叉类型（`Equal` 会误判交叉）。类型体操正文代码块必须连续成段（定义归 A–F 连续、断言 `_tN` 全挪末尾），否则 check-code-sync 报对不上。`runtime-lab` 用 `Module._compile` 转译执行 `.ts`，依赖 `emitDts` 运行时生成 `.d.ts`；`_tsc.cjs` 这类 helper 必须带 `.cjs` 扩展名（Node 扩展名补全不试 `.cjs`）。

## 运行时事实必须实跑（Node 22 探针）
默认值 / 阈值 / 属性 / 事件顺序 / 报错码先跑确认，正文引用实测数字要注明来源命令。已纠错：`writableLength` 同步回调恒 0；`new Duplex().allowHalfOpen` 默认 `true`（`net` socket 为 `false`）；`cork()` 只在流实现 `writev` 时合并；内存对比各起子进程（`spawnSync`）。

## safe-delete / 批量替换
全局替换 `NN-篇名` 会误伤 总结.md 分篇标题 → 替换后 diff 检查。safe-delete：≥50 删除触发 `SAFE_DELETE_BULK_CONFIRM_REQUIRED`（阈值 50，按 turn 累计）→ 分块（<50）+ 自底向上 `os.rmdir`；watcher 占用目录 rename/rmdir 必失败（WinError 32）；最省事是清空注入变量让进程不加载 shim（`NODE_OPTIONS=` / `PYTHONPATH=`）。

## Git / 本机执行
提交一律 `--no-verify`（lint-staged 的 `prettier --write .` 会格式化整仓）；`origin`=`https://gitee.com/wayliuhaha/blog`、`master`、无 TTY 可直推；大批量提交按顶层路径分桶列表，信息写 `.git/COMMIT_MSG_TMP.txt` 再 `git commit -F`。bash 工具 PATH 坏 → 用 Python 全路径或 PowerShell；PowerShell 不回显中文 stdout → `Out-File` 落文件再 Read；git 用 `"E:\Program Files\Git\cmd\git.EXE"`；临时脚本放 `C:\Users\10855\.workbuddy\tmp\`；`Delete` 工具不存在 → 用 Python `os.remove`/`shutil`。
- **`vitepress build` 要给足超时**：实测 63~267s（沙箱内波动大），用 python `subprocess` 前台跑会被宿主 SIGTERM 截断（dist 只写一半却仍返回输出）→ **一律 `run_in_background` + 重定向日志文件**。**跑完必须另存新日志文件名**——复读上一次日志会把旧的 `build complete` 当成本次成功（已踩）；确认方式：`dist/.../X.html` 的 mtime 要晚于对应 `.md`。命令：`NODE_OPTIONS= node node_modules/vitepress/bin/vitepress.js build .`（`NODE_OPTIONS=` 清空同时绕开 safe-delete shim）。
- **起 build 前必须把所有 md 改完**：VitePress 启动时就把 md 全量读进内存，落在「build 启动之后」的编辑**不会进产物**。确认落地不能只看 exit 0 / `build complete`，要 `grep` 产物里的新字符串。

## 遗留
旧 `frontend/进阶/性能优化与监控/` 已拆为「性能优化」「监控与稳定性」；`node/01-运行环境` 空壳被 watcher 锁住待删。
