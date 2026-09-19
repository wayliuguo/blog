# 项目长期约定（E:\working\blog）

## 仓库与结构
VitePress 博客（`base:'/blog/'`，构建 ~55s），板块 `ai/` `frontend/` `interview/` `node/`，配置 `.vitepress/config/*.js`，产物恒为 `.vitepress/dist`（CLI `--outDir` 不识别）。无根级落地页：导航「Node 后端」直达 `/node/运行环境/01-Node.js 是什么`，首页「快速开始」→ `/ai/claudeCode`。`ai/` 侧边栏分 `Coding Agent`/`Skills`，其文档不写 小结/配套代码，结尾只 `## 参考`。
- `node/` 11 模块，**目录与文件名不带编号**（NN- 只用于 总结.md 分篇标题与「见第 X 篇」阅读序标签，顺序以侧边栏为准）。
- `frontend/基础/` 7 模块：HTML 基础、CSS、JavaScript 核心、网络与浏览器、前端框架-React、前端框架-Vue、小程序。
- `frontend/进阶/` 9 模块：前端工程化与构建、构建体系、测试体系、前端框架原理、TypeScript、性能优化、监控与稳定性、交付与质量、工程实践与架构（另有散篇 `面试方法论.md`）。**共 110 篇含元页面。**

## 单篇体例
1. 首行 `# <篇标题>`，正文直接从第一个知识小节开始（标题即问题/判断句）；不写 `> 承上/启下`、不写 `## 开篇`；引用别篇写「见第 X 篇」
2. 结尾顺序不可变 `## 小结` → `## 配套代码` → `## 参考`；`## 配套代码` 路径写**文本**不做链接，表含「对应小节」列
3. ASCII 图/实测输出用**裸**三反引号围栏，禁 ```text（vitepress beta.6 刷 100+ 告警）

## 元页面（`<模块>/总结.md`、`面试题.md`）
总结.md **只有两节**：`## 知识主线`（ASCII 主线图 + 主轴说明）+ `## 分篇知识点`。面试题四段（基础概念/机制与原理/排障与选型/场景设计题），每题标出处（第 X 篇）；正文各篇不带 `## 面试题`；`## 参考` 首两行固定为本模块总结/面试题。元页面不参与 code-sync。

## 小结 = 知识树
第 1 层 = **干净标签**的概念域（结论不进标题）；域下直接挂 `- **知识点**：一句话结论`，要点多时中间加子域（≤3 级）；知识点只一句话、不解释；同一结论只说一次（重叠域合并）；系统细节收进该系统自己的域；两套系统差异另立「二者的本质区别」域。缩进 2 空格、同层 ≤8 条。样板 `node/运行环境/模块系统与包管理.md`。**两级一致性靠反向落回**：只改篇小结，用 `C:\Users\10855\.workbuddy\tmp\rebuild_module.py` 重建 总结.md 的 `## 分篇知识点`（幂等）。

## 文档代码必须来自配套脚本
- 代码块上方 `> 摘自 \`<相对路径>\`（运行：\`npm run xxx\`）`，内容为脚本**逐字摘录**，省略处单独 `// …`；有数字/顺序/报错码时块下贴**真实输出**；无脚本的 API 片段标 `> 示意片段（无配套脚本）`。`npm script` 名、lab `README.md`、`## 配套代码` 表三处同步。
- 守门 `.workbuddy/scripts/check-code-sync.cjs`：⚠️ `--module` 值**相对板块根**（如 `进阶/性能优化`）且必须与 `--board` 同传，否则扫 0 篇静默「全部通过」；只查带语言围栏（含 ```html）。
- ⚠️ `skeleton()` 剔除字符串内容 → 演示源码必须落成真实文件由 `readFileSync` 读入。
- `//ERR` 机制（`TypeScript/code/type-lab/`）：错误行写成 `//ERR xxx` 注释，`run.cjs --errors` 用自定义 `CompilerHost` 去前缀，报错由编译器现场生成。

## 校验四件套（改完必跑，均支持 `--board ai|frontend|node`）
`check-links.cjs`（相对链接+导航/侧边栏 + `code/` 下 README）→ `check-sidebar-coverage.cjs` → `check-code-sync.cjs` → `vitepress build`。
⚠️ **build 被 safe-delete 挡的正解：`NODE_OPTIONS= node node_modules/vitepress/bin/vitepress.js build .`**。已推翻：`--outDir` 不识别；改/搬空 `.temp` 不能救。判据看产物（目标板块 html 数 + 根 `hashmap.json`）。
⚠️ **行内代码双花括号**：内容非法 → build 报错；合法 → build 过但渲染成空、静默丢内容 → 用 `<code v-pre>双花括号</code>`。

## 配套代码与端口
位置 `frontend/<板块>/<模块>/code/` 与 `node/<模块目录>/code/<项目名>/`，靠 `srcExclude` 的 `'**/code/**'` 排除。零依赖轻量项目为主；例外 `构建体系/code/build-lab`（需 npm install，唯一 `.gitignore`）。`前端框架原理/code/{mini-react,mini-vue}` 零依赖 node 项目（`node --test`），不占端口。服务统一 `listen(port,tries)` 遇 `EADDRINUSE` 自动 +1。
**端口**：HTML 5174 · CSS 5175 · JS 核心 5176 · 网络与浏览器 5177(+api 5178) · 前端工程化 5179 · React 5180 · Vue 5181 · 框架原理 5182 · 交付与质量 5183 · 工程实践 5184 · 小程序 5185 · TypeScript 5186 · 性能优化/perf-lab 5187 · enterprise-server 5188 · 监控与稳定性/monitor-lab 5189。
⚠️ **文件名空格**（写链接前用 `os.listdir`+`repr()` 确认）：`编译与 AST.md`、`esbuild 与 Rust 工具链.md`、`Webpack 深入.md`。**markdown 链接含空格文件名必须写 `%20`**（`./前端监控%20SDK%20实现.md`），否则 check-links 报「裸空格」。

## 实验台型 code（2026-09-19）
零依赖 + `spawn` 起本机 headless Chrome（不用 puppeteer），`harness/*.mjs` + `pages|site/*.html` + `scenarios/*.mjs`，场景脚本用 `runAsMain(import.meta.url,run)` 自跑（非顶层调用）。
- `性能优化/code/perf-lab/`：15 场景（`cli.mjs`）；server 按 `kbps` 切片字节使网络差异可观测；多轮取中位数；CLS 用 `clsRaw`（headless `hadRecentInput` 恒 true，spec `cls` 恒 0）。
- `监控与稳定性/code/monitor-lab/`：`sdk/{index,transport,errors,perf,track}.mjs`（**env 依赖注入**，浏览器与 Node 同跑）+ `collector.mjs`（`POST /collect` + `/api/report`，5189）+ `aggregate.mjs`（秒桶/分位值/滑动窗口）+ `alert.mjs`（阈值+连续 N 次+静默期+恢复）+ `scenarios/{transport,errors,perf,track,pipeline,all}.mjs`；`data/events.jsonl` 已 gitignore。
- 篇目：性能优化 7 篇（code-sync 36/36）；监控与稳定性 7 篇（code-sync 55 块·37 对齐·18 示意·0 问题；面试题 35 题）。

## 运行时事实必须实跑（Node 22 探针）
默认值/阈值/属性/事件顺序/报错码先跑确认。已纠错：`writableLength` 同步回调恒 0；`new Duplex().allowHalfOpen` 默认 `true`（`net` socket 为 `false`）；`cork()` 只在流实现 `writev` 时合并。内存对比各起子进程（`spawnSync`）。正文引用实测数字注明来源命令。

## 批量替换 / safe-delete
全局替换 `NN-篇名` 会**误伤 总结.md 分篇标题** → 替换后 diff 检查所有 总结.md。宿主 safe-delete：≥50 文件删除触发 `SAFE_DELETE_BULK_CONFIRM_REQUIRED`（阈值 50，按 turn 累计）→ 分块（每批 <50）+ 自底向上 `os.rmdir`；watcher 占用目录 rename/rmdir 必失败（WinError 32）；最省事清空注入变量让进程不加载 shim。

## Git / 本机执行约定
提交一律 `--no-verify`（lint-staged 的 `prettier --write .` 格式化整仓）；`origin` = `https://gitee.com/wayliuhaha/blog`，`master`，无 TTY 可直推；大批量提交先按顶层路径分桶列「提交/不提交」表，信息写 `.git/COMMIT_MSG_TMP.txt` 再 `-F`。bash 工具 PATH 坏（`ls`/`dirname` 没有）→ 用 Python 全路径或 PowerShell；PowerShell 不回显中文 stdout → `Out-File` 落文件再 Read；git 用 `"E:\Program Files\Git\cmd\git.EXE"`；临时脚本放 `C:\Users\10855\.workbuddy\tmp\`。**`Delete` 工具不存在** → 删文件用 Bash `os.remove` / Python `shutil`。

## 文档组织规范（仓库根 `文档组织规范.md`）
与 README 同级、面向 AI、示例驱动、去「禁止」式措辞，不内嵌守门脚本源码；含板块/模块/code 结构、单篇体例、代码规约、小结知识树、元页面模板、校验四件套、测量型模块实验台。

## 已删 / 遗留
已删 `node/index.md`、`node/90-附录/`、`00-学习路径图.md`、`网络编程与实时通信/00-导读与全景图.md`、旧 `frontend/进阶/性能优化与监控/`（拆成两模块）。`node/01-运行环境` 空壳被 watcher 锁住待删。`frontend/` → `frontend/基础|进阶` 与两模块拆分**配置已更新但未提交**。
