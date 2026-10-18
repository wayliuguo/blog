# 面试题 · Vite

> 对齐知识体系 frontend/构建体系/Vite.md。
> 简历构建口径：熟悉 Vite 项目构建与优化。Webpack 专属概念（loader/plugin 事件流）不在本篇范围，被问就答「生产实践以 Vite/Rollup 为主，webpack 概念层了解」。

## 一、原理与心智模型

### 1. Vite 为什么快？dev server 启动的完整流程？

**结论：核心是「双引擎」结构——dev 不打包（原生 ESM 按需编译，请求到哪编译到哪），build 才打包（Rollup/Rolldown 深度优化）；再加 esbuild 预构建依赖，冷启动与项目体积解耦。**

- dev 引擎：浏览器原生 ESM 请求模块，dev server 只编译被请求的文件——启动快、HMR 粒度细
- 预构建引擎：依赖包用 esbuild（Go，比 JS 工具链快一个量级）提前处理
- build 引擎：生产用 Rollup（新版本可选 Rolldown）——成熟 tree-shaking 与产物优化
- 启动完整流程

```
1. 读取 vite.config，合并默认配置与 .env
2. 扫描源码 import，esbuild 预构建依赖（或命中缓存）
3. 启动 http server + WebSocket，注册中间件（模块转换、静态资源、HMR）
4. 浏览器请求 index.html → 解析 <script type="module"> → 逐个请求模块
5. 每个请求经过插件 transform 后返回——「请求到哪编译到哪」
```

- 本质一句话：「bundleless 开发 vs 全量 bundle」——快来自「dev 不做不需要的事」，不是「同样的活干得快」
- 追问：为什么 dev 可以不打包而生产必须打？
  - dev 只服务一个正在开发的浏览器会话，按需编译延迟可接受；生产要面对全部用户的网络瀑布与兼容性——必须全量 bundle + 优化（见第 3 题）

### 2. 依赖预构建是什么？什么时候触发？CJS/ESM 混用怎么处理？

**结论：esbuild 把 node_modules 里的第三方依赖提前转换——CJS/UMD 转 ESM + 把零散小模块合并成单文件防请求瀑布；结果缓存在 node_modules/.vite，命中缓存就跳过。CJS 依赖统一在预构建层转 ESM，扫描发现不了的用 optimizeDeps.include 显式声明。**

- 三个目的
  - 兼容：很多依赖是 CJS/UMD，浏览器 ESM 加载不了——统一转 ESM
  - 减请求：lodash 这类几百个子模块的包不合并，页面打开就是几百个请求瀑布
  - 快：esbuild 是 Go 写的，预构建秒级完成
- 触发时机：首次启动（无缓存）；lockfile 变化；vite.config 相关配置变化；手动 `--force`
- 配置：`optimizeDeps.include` 强制预构建（动态 import 的依赖、扫描发现不了的）、`exclude` 排除（保持源码形态）
- CJS/ESM 混用的分层处理
  - 依赖（node_modules）：预构建统一转 ESM——主流场景都在这层解决
  - 源码里的特殊依赖：`optimizeDeps.include: ['某cjs包']` 强制走预构建
  - `exclude` 的依赖：保持源码形态，需要该包自身提供 ESM 入口，否则报错
- 追问：二次启动为什么明显更快？缓存什么时候失效？
  - 二次快：命中 `.vite` 缓存跳过预构建 + 浏览器对依赖模块有强缓存——「冷启动慢、二次快」是设计行为
  - 失效：lockfile 变化、影响预构建的 config 变化、`--force`、缓存目录被清——保守但正确，因为 CJS 互操作结果与具体版本强相关

### 3. dev 快 ≠ 生产快：为什么生产还要打包？

**结论：dev 的按需服务只对「单会话开发」成立；生产要服务全部用户，必须解决请求瀑布、兼容性和产物体积——所以 build 走全量 bundle（Rollup/Rolldown），且「dev 正常 build 白屏」是经典差异坑。**

- 生产必须打包的三个理由
  - 请求瀑布：成百上千个 ESM 请求即使 HTTP/2 也有排队与解析开销
  - 兼容性：按 build.target 转译目标浏览器
  - 产物优化：tree-shaking、压缩、分包、内容 hash——dev 全没有
- dev / prod 行为差异的经典坑
  - 环境变量注入时机不同（`import.meta.env` 替换策略）
  - 动态 import 路径在 bundle 后的解析差异
  - 预构建源码形态差异（CJS 互操作）
- 规避：build 后 `preview` 起真实产物跑主流程——发布前必做
- 追问：为什么不干脆 dev 也全量 bundle？
  - 那就是回退到 Webpack 的启动模型——项目越大启动越慢，Vite 的核心价值就没了

## 二、HMR

### 4. HMR 热更新的完整原理？和 Webpack 的 HMR 区别？

**结论：server 监听文件变化，经 WebSocket 推送受影响模块，浏览器请求新版本并在运行时替换；替换沿 import 链向上冒泡找 accept 边界，找不到或替换失败就整页刷新兜底。与 Webpack 的差异根源是 bundleless vs bundle——Vite 推模块路径按需拉新，Webpack 推新 chunk。**

- 完整链路

```
文件变化 → server 编译该模块 → WebSocket 推送 { path, timestamp }
→ client 请求最新版本模块 → 执行模块自声明的 accept 回调完成替换
→ 该模块没 accept？沿 import 链向上找 accept 边界
→ 找不到边界 / 替换抛错 → full reload 兜底
```

- 不同资源的粒度：CSS 直接换 style 标签；Vue 单文件组件由插件精确到 template / script / style 分块替换
- 与 Webpack HMR 对比

| 维度 | Vite HMR | Webpack HMR |
| --- | --- | --- |
| 更新粒度 | 单模块（ESM 精确替换） | 重新编译该模块 + 受影响依赖链 |
| 速度与项目规模 | 无衰减（只处理改动文件） | 依赖链越长越慢 |
| 通信 | WebSocket 推模块路径 | WebSocket 推新 chunk hash |
| 极端兜底 | 替换失败整页刷新 | 同样可能整页刷新 |

- 追问：为什么改了 store 模块整页刷新了？
  - store 模块通常被多处引用且无 accept 边界；要保状态需自己写 accept + dispose + data 迁移（见下一题）。整页刷新不是 bug——HMR 的正确性优先于热度

### 5. import.meta.hot 能做什么？举例。

**结论：模块级的热替换控制接口——accept 声明可替换、dispose 清副作用、data 保状态；最典型应用是 store / 全局单例的热替换保状态。**

```js
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    newModule.applyState(import.meta.hot.data.state)
  })
  import.meta.hot.dispose(() => { clearInterval(timer) })
  import.meta.hot.data.state = currentState
}
```

- 四个 API
  - `accept`：模块自声明「我能被热替换」
  - `dispose`：声明替换前要清理的副作用（定时器、事件监听）
  - `data`：跨更新保存状态（热替换时把旧状态带给新模块）
  - `decline`：声明「我无法热替换」→ 直接走刷新
- 三个典型场景
  - store 模块：替换后恢复旧状态，页面不重置
  - 定时器 / 事件监听：dispose 里清理，防重复注册
  - 不可热替换的模块：decline 明确拒绝，避免半替换状态
- 追问：`import.meta.hot` 判断存在有什么讲究？
  - 生产构建没有这个对象——包在 if 里，构建器可直接摇掉这块代码

## 三、插件机制

### 6. Vite 插件的钩子体系？和 Rollup 插件什么关系？

**结论：两类钩子——通用钩子（与 Rollup 兼容，管模块内容：resolveId → load → transform → renderChunk）和 Vite 专有钩子（管开发服务：config、configureServer、hotUpdate 等）；`enforce: 'pre' / 'post'` 控制相对内置插件的顺序。Vite 兼容大部分 Rollup 插件，但 dev server 能力不通用。**

| 类别 | 代表钩子 | 管什么 |
| --- | --- | --- |
| 通用（Rollup 兼容） | resolveId / load / transform / renderChunk | 模块的定位、内容、转换、产物加工 |
| Vite 专有 | config / configureServer / hotUpdate / transformIndexHtml | 配置修改、dev 中间件、热更新、HTML 注入 |

- 三部曲分工纪律
  - resolveId：把 import 路径解析成真实或虚拟模块 id（别名、虚拟模块都在这）
  - load：按 id 返回内容（读盘、生成虚拟模块代码）
  - transform：对内容做转译（TS、Vue SFC、替换代码）
- enforce 顺序：pre → 核心（vite 内置）→ normal → post；Rollup 侧同义的 `order` 字段
- 通用性边界
  - 通用：只声明通用钩子的插件，两边都能跑（官方 `@rollup/plugin-*` 大多可直接用于 Vite）
  - 不通用：Vite 专有钩子在 Rollup 下被忽略；框架插件（@vitejs/plugin-vue）是 Vite 专属
- 追问：为什么改别人产出的内容用 transform 而不是 load？
  - load 在 transform 之前——load 阶段拿到的还是原始内容；要基于上游插件的产物做处理必须在 transform

### 7. 写一个 Vite 插件的真实套路？虚拟模块解决什么问题？

**结论：绝大多数需求落在三种形态——虚拟模块（resolveId + load 造出磁盘上不存在的模块）、内容替换（transform）、产物加工（renderChunk / generateBundle）；识别需求属于哪种，套模板即可。**

- 三种形态模板

```js
// 虚拟模块：resolveId 造 id + load 给代码
{
  name: 'virtual-env',
  resolveId(id) { if (id === 'virtual:env') return '\0virtual:env' },
  load(id) { if (id === '\0virtual:env') return `export const version = '1.0.0'` }
}
// 内容替换：transform 里改代码
{
  name: 'drop-console',
  transform(code, id) {
    if (!id.includes('src/')) return null
    return code.replace(/console\.log\([^)]*\);?/g, '')
  }
}
// 产物门禁：生成阶段比对预算
{
  name: 'size-gate',
  renderChunk(code, chunk) {
    if (chunk.fileName.includes('vendor') && code.length > 500 * 1024) {
      throw new Error('vendor 超过 500KB 预算')
    }
    return null
  }
}
```

- `\0` 前缀惯例：虚拟模块 id 加空字节前缀，防止与其他真实文件 / 插件冲突
- 虚拟模块 vs define：define 是文本替换（编译期常量），虚拟模块是完整模块（可导出函数、可 import 别的模块）——典型用途：注入版本号、聚合统一出口
- 追问：剔除 console 为什么要在 transform 而不是压缩阶段？
  - 可以在压缩阶段（esbuild drop 配置更彻底）——但插件形态可控（按目录、按规则），两者是「通用配置 vs 定制规则」的关系

## 四、配置与工程

### 8. 环境变量与模式怎么用？安全边界在哪？

**结论：.env 家族按模式加载（development / production / 自定义），只有 `VITE_` 前缀的变量注入客户端——这就是安全边界：服务端密钥绝不带 VITE_ 前缀。**

- 三层文件：`.env`（全模式）→ `.env.development` / `.env.production` → `.env.local`（本地覆盖，git 忽略）
- 取值：源码里 `import.meta.env.X`；非 `VITE_` 前缀不暴露（防密钥泄漏进 bundle）
- 运行时配置不走构建注入：发布后要改的配置（接口地址、开关）走后端接口拉取——构建期注入意味着改一个字要重新发版
- 追问：为什么运行时变更不走环境变量？
  - 构建注入是编译期写死进 bundle 的——改配置 = 重新构建发版；运行时配置的正确来源是接口或远程配置中心

### 9. 代码分割怎么设计？

**结论：路由级动态 import 是主刀（时序优化），manualChunks 按变动频率分桶是缓存优化——业务代码频繁变、第三方框架稳定，分开放才能让二次访问命中长缓存。**

- 两层分割
  - 路由级：动态 import 天然按页分 chunk——首屏只拉当前页
  - 依赖层：manualChunks（新版本 advancedChunks）把稳定依赖拆 vendor——业务改动不击穿 vendor 的内容 hash
- 长缓存的前提：内容 hash——vendor 不变则文件名不变，强缓存持续命中
- 注意点：分割解决「首屏拉太多」，但过度分割会请求碎片化——配合空闲预取
- 追问：把所有第三方拆进一个 vendor 一定好吗？
  - 不一定——一个 1MB 的 vendor 意味着任何依赖升级全体失效；按「变动频率一致」分桶更优

### 10. 怎么保证构建产物的质量？

**结论：三道关——类型检查拆出构建链（dev 不全量 tsc）、体积门禁插件卡预算、preview 预览验证真实产物；dev 能跑不等于产物能上线。**

- 类型检查：vite dev/esbuild 只转译不检查——IDE + 独立的 `tsc --noEmit` / vue-tsc 阶段兜住
- 体积门禁：插件在生成阶段比对预算超限报错（见 Rollup 篇 size-gate）——防「优化完三个月长回来」
- preview 验证：build 后起 preview 服务跑主流程——专治「dev 正常 build 白屏」（环境变量、动态导入路径、预构建差异）
- 追问：为什么 esbuild 转译 TS 不做类型检查？
  - 类型检查是全程序分析，慢；esbuild 追求转译吞吐——职责拆开：转译求快，检查单独跑

## 五、与 Webpack 对比

### 11. Vite 和 Webpack 的核心差异？什么场景还选 Webpack？Vite 有哪些缺点？

**结论：本质差异是「bundleless 开发 vs 全量打包」——由此派生启动、HMR、配置复杂度的全面差异；生产两者都打包，Vite 用 Rollup/Rolldown。仍选 Webpack 的四类场景都源于 Vite 的现代浏览器前提与生态边界。**

| 维度 | Vite | Webpack |
| --- | --- | --- |
| dev 形态 | 原生 ESM 按需 serve | 全量构建成 bundle 再 serve |
| 冷启动 | 与项目体积基本无关 | 全量建依赖图，越大越慢 |
| HMR | 单模块替换，无衰减 | 依赖链重编译，越大越慢 |
| 配置 | 零配置起步，内置常用处理 | loader / plugin 需手动配 |
| 生产 | Rollup / Rolldown 打包 | 自研全功能打包 |
| 兼容性 | 面向现代浏览器（target 可调） | 可打 IE11（babel + polyfill） |
| 生态 | 快速成熟 | 最成熟（老项目 / 微前端沉淀深） |

- 仍选 Webpack 的四类场景
  - IE11：Vite 面向 ESM 浏览器，补到 IE 代价极高（官方已放弃）
  - 老 CJS 生态：大量依赖 Webpack 专属 loader / 插件的存量项目，迁移成本大于收益
  - 模块联邦：Webpack 5 的微前端方案，Vite 生态里是别的实现路径（已有成熟方案的项目不动）
  - Node 端 / 特殊环境打包：Webpack 的 target 与插件更全
- Vite 的缺点与规避

| 缺点 | 规避 |
| --- | --- |
| 首次预构建延迟、依赖变化触发重跑 | 锁定依赖版本、命中缓存、冷启动任务放 CI 预热 |
| dev 正常 build 白屏（行为差异） | build 后 preview 跑主流程，发布前必做 |
| 不支持旧浏览器 | build.target 明确目标；绕不开就换工具 |
| CJS 依赖报错 | optimizeDeps.include 强制预构建 |

- 追问：这些缺点里哪个最容易在生产翻车？
  - dev / prod 不一致——因为 dev 阶段完全无感；流程上强制 preview 验证是唯一可靠防线

## 六、生态与进阶

### 12. Rolldown 是什么？Vite 为什么要自研打包内核？

**结论：Rolldown 是 Rust 写的、API 兼容 Rollup 的打包器——Vite 团队用它统一双引擎（取代 esbuild + Rollup 两个依赖），目标是 dev / build 同一套内核、性能再上台阶。**

- 动机：dev 用 esbuild、build 用 Rollup 的双依赖结构有行为差异（转译能力、插件支持）——统一内核消灭差异
- 兼容策略：钩子 API 对齐 Rollup，存量插件与知识迁移成本低
- 版本口径：Vite 6+ 可选启用，逐步过渡；面试讲清「为什么统一」比背版本号重要
- 追问：统一内核后 esbuild 就被淘汰了吗？
  - esbuild 仍是压缩等环节的主力；淘汰的是「dev/build 用两套内核」的结构性不一致

### 13. Vite 的库模式（lib mode）和直接用 Rollup 什么关系？

**结论：Vite 库模式是 Rollup 的封装（预置入口、多格式、dts 协作）——简单库开箱即用；需要精细控制（多入口、复杂 external、插件流水线）时直接用 Rollup。**

- 库模式：`build.lib` 配置入口与格式名，底层还是 Rollup 打包——适合中小组件库
- 直接 Rollup：完整配置 external / 多格式 / exports / 自定义插件——组件库、工具库的精细方案（见 Rollup 篇）
- 选型经验：一个入口 + 双格式 → 库模式；多入口 + 类型产物 + CI 门禁 → Rollup
- 追问：库模式能加自定义 Rollup 插件吗？
  - 能——plugins 数组通吃，因为底层就是 Rollup

## 七、场景题

### 14. 项目冷启动很慢、二次启动很快，什么原因？

**结论：这是 Vite 的设计行为——首次要预构建依赖（esbuild 全量处理）且浏览器无缓存；二次命中 `.vite` 缓存 + 浏览器强缓存，只剩源码按需编译。**

- 首次慢的组成：依赖预构建 + 首屏按需编译链 + 无缓存全量请求
- 二次快的组成：预构建缓存命中 + 浏览器对依赖模块强缓存（304 或直接内存）
- 优化方向：CI 预热缓存、收敛依赖版本减少失效、首屏模块合理分割减少首次编译链
- 追问：如果二次启动也变慢了，查什么？
  - 缓存被反复失效（lockfile/config 频繁变化）或缓存目录被清理工具误删——回到预构建失效排查链（一.2）

### 15. 改了一行代码，页面整页刷新了，为什么？

**结论：HMR 没找到 accept 边界或判定无法热替换——沿 import 链冒泡到根都没有模块自接受，就 full reload 兜底；常见于改了被多处引用的非组件模块、或改了导出结构。**

- 常见触发
  - 模块无 accept 且无人代接受（store、工具、配置模块）
  - 修改了模块的导出结构（新增/删除导出）——下游引用关系变了，热替换不可靠
  - 改了非模块文件（html、插件注入内容）
- 解决：模块内 `import.meta.hot.accept` 自接受 + dispose/data 处理状态；组件类交给框架插件边界
- 追问：整页刷新是 bug 吗？
  - 不是——HMR 的正确性优先于热度：替换不了就刷新，宁可慢也不给错状态

### 16. 场景：新装一个依赖是 CJS 格式，dev 报错「does not provide an export named 'default'」，怎么办？

**结论：该依赖没被预构建成 ESM——`optimizeDeps.include` 强制纳入预构建；仍不行检查 exclude 配置与该包是否有 ESM 入口。**

- 排查链
  - 是否被 `optimizeDeps.exclude` 排除了（exclude 的保持源码形态，CJS 直接报错）
  - 是否是动态 import（扫描发现不了）→ include 显式声明
  - 包自身提供 ESM 入口吗（package.json module/exports 字段）——都没有只能靠预构建互操作
- 顺带确认：lockfile 提交、`--force` 后复现一次再下结论（缓存脏数据会伪装成包的问题）
- 追问：为什么预构建能解决而浏览器原生不行？
  - 浏览器只认 ESM 语法；CJS 的 require 是运行时函数调用——必须构建期转成静态 import/export
