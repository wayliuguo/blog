# webpack 篇精简与生产化改造 · 设计文档

- 日期：2026-09-30
- 范围：`frontend/进阶/构建体系/webpack.md` + `frontend/进阶/构建体系/code/build-lab/webpack-lab/`
- 选定方案：**方案 B（教学保留型）** + 命令收敛为 **2 个**

## 一、背景与目标

当前 `webpack.md` 是 13 节长文，配套 `webpack-lab/` 有 17 个零件文件、5 个入口目录、7 个实验脚本，用 `--env` 在一份配置里切换 5 种场景。问题是：

- 场景太多（官方插件组 / drop / minihtml / debug / spa），主线被稀释；
- 多入口（`main` + `pageB`）是为了演示 common chunk，但与"生产单入口"的真实形态不符；
- loader / plugin 虽是手写的，但零散挂在顶层目录，没有形成"常见生产 loader / plugin 的手写替代"这条主线；
- 调试依赖 `DebugProbePlugin` + 专门的 debug 脚本，多了一层概念。

改造目标：

1. 命令收敛为 2 个：`webpack:build`（生产构建）、`webpack:build:preview`（生产构建 + 预览）；
2. 配置按生产来写：单入口、contenthash、splitChunks、压缩、抽 CSS、生成 HTML；
3. **重点**：用**手写实现**替代生产常见 loader（`css-loader`）与常见 plugin（`HtmlWebpackPlugin` / `MiniCssExtractPlugin` / `TerserPlugin`）；
4. 调试只留一份 `launch.json`，删掉 `DebugProbePlugin`，断点直接打在自己写的 loader / plugin 上；
5. 保留 `min-webpack`（约百行最小 webpack）作为"看懂执行流程"的收尾。

### 决策变更记录

- 初始需求为 3 个命令（含 `webpack:dev` 做 dev 构建 + 预览）。评审中决定**去掉 `webpack:dev`**：本模块只讲生产配置，不需要 dev 模式。
- 连带地，dev 专用的 CSS 注入链路（手写 `style-loader`）失去执行入口，决定**一并删除**；`style-loader` 的原理与适用场景改为在文档中用一段文字 + 一张对照表说明（见 4.1）。

### 不做的事

- 不提供开发模式（无 HMR、无 development 构建），`mode` 恒为 `production`；
- 不引入 TypeScript / Babel loader（本模块的 loader 主线是 CSS 链）；
- 不保留 hooks 探针脚本、缓存实验、drop 插件、官方插件组场景、spa/prod/pit 三个演示入口目录；
- 不改动 `build-lab` 下其它 lab（`rollup-lab` / `esbuild-lab` / `vite-lab` / `mini-bundler` 等）的脚本与代码。

## 二、两个命令

`code/build-lab/package.json` 的 `scripts` 最终形态（webpack 相关部分）：

```json
"webpack:build":         "webpack --config webpack-lab/webpack.config.cjs",
"webpack:build:preview": "webpack serve --config webpack-lab/webpack.config.cjs",
"mini:webpack":          "node webpack-lab/min-webpack/bundle.cjs"
```

语义：

| 命令 | 做什么 | 产物 | 服务 |
| --- | --- | --- | --- |
| `webpack:build` | production 构建，写盘 | `webpack-lab/dist/` | 无 |
| `webpack:build:preview` | production 构建 + 起 dev-server 预览真实产物 | 写盘 + 内存 | 端口 5180，自动打开浏览器 |
| `mini:webpack` | 运行约百行最小 webpack（保留） | 控制台输出 | 无 |

**不传任何 `--env` 参数**——配置本身就是一份生产配置，两个命令的差别只在于是否被 dev-server 包一层。

## 三、配置分流：一份配置跑两个命令

`webpack-cli` 会自动往 `env` 注入 `WEBPACK_SERVE` / `WEBPACK_BUILD`，因此不需要任何自定义环境变量约定：

```js
module.exports = (env = {}) => {
    const isServe = env.WEBPACK_SERVE === true   // webpack serve 时由 webpack-cli 注入
    const isPreview = isServe                    // 本模块唯一的 serve 场景就是预览
    ...
}
```

| 命令 | `env` 实际取值 | mode | devServer |
| --- | --- | --- | --- |
| `webpack:build` | `{ WEBPACK_BUILD: true }` | production | 不挂 |
| `webpack:build:preview` | `{ WEBPACK_SERVE: true }` | production | `writeToDisk: true`，服务真实产物 |

`devServer` 配置（仅 preview 挂载）：

```js
devServer: {
    port: 5180,
    open: true,
    hot: false,
    static: { directory: path.join(ROOT, 'dist'), watch: false },
    devMiddleware: { writeToDisk: true }
}
```

`build:preview` 自包含（自己编译、自己写盘、自己起服务），不依赖先执行过 `build`。

## 四、手写 loader（2 个）

目录：`webpack-lab/loaders/`

| 文件 | 替代官方 | 实现要点 |
| --- | --- | --- |
| `css-loader.cjs` | `css-loader` | 解析 CSS 文本：递归内联 `@import`、把 `url()` 重写为 `require()`；最终 `module.exports` 出 CSS 字符串。**输入字符串、输出 JS 代码字符串**这一本质在此最直观 |
| `extract-css-loader.cjs` | `mini-css-extract-plugin.loader` | **pitch 阶段**把 CSS 文本登记到 compilation 级 registry（`this._compilation` 上的 Map），并返回一个占位模块，供 plugin 在 `processAssets` 汇总。因为前一环 `css-loader` 产出的是 JS 代码而非 CSS 文本，必须用 pitch 拿 `remainingRequest` 去 `require` 才能真正取到文本 |

CSS 规则（只有一条，恒为生产链路）：

```js
{
    test: /\.css$/,
    use: [
        path.join(ROOT, 'loaders/extract-css-loader.cjs'),
        path.join(ROOT, 'loaders/css-loader.cjs')
    ]
}
```

### 4.1 style-loader 的说明方式（不提供文件）

文档用一段文字 + 一张对照表讲清"为什么生产用抽离而不是注入"，不保留 `style-loader.cjs`：

| | `style-loader`（运行时注入 `<style>`） | `extract-css-loader`（抽成独立 `.css`） |
| --- | --- | --- |
| 原理 | CSS 文本进 JS bundle，运行时 `document.head.appendChild(<style>)` | CSS 进单独文件，HTML 里 `<link rel=stylesheet>` |
| 生产可用 | 可以（与 `mode` 无绑定） | 默认选择 |
| 代价 | CSS 要等 JS 执行才生效（FOUC 风险）；CSS 混在 JS 里、拿不到独立 `contenthash`；无法 `<link rel=preload>`；严格 CSP 下 `style-src` 需放行 inline | 无这些代价 |

要点：`style-loader` 并非 dev 专属，它在微前端沙箱、Web Components / Shadow DOM、单文件产物等场景同样用于生产；两条链路互斥，同一 `.css` 规则只能二选一。

## 五、手写 plugin（3 个）

目录：`webpack-lab/plugins/`

| 文件 | 替代官方 | 挂载点与做法 |
| --- | --- | --- |
| `mini-html-plugin.cjs` | `HtmlWebpackPlugin` | `processAssets`（`PROCESS_ASSETS_STAGE_SUMMARIZE`）：遍历 `compilation.assets`，按后缀收集 `.js` / `.css`，拼出 `<script>` / `<link>` 后 `emitAsset('index.html', RawSource)`。**不写死文件名**，hash 变了自动跟着变 |
| `mini-css-extract-plugin.cjs` | `MiniCssExtractPlugin` | `processAssets`：读取 registry 汇总 CSS 文本，`emitAsset('[name].[contenthash:8].css', RawSource)`。体现"loader 管单模块、plugin 管汇总成产物"的两段式 |
| `mini-terser-plugin.cjs` | `TerserPlugin` | `processAssets`（`PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE`）：直接调用 `terser` 压缩 `.js` 产物，用 `updateAsset` 覆盖；`extractComments: false` |

三个插件都遵守同一条纪律：**产出新文件用 `compilation.emitAsset`，不用 `fs.writeFileSync`**（否则不参与 `clean`、不进 stats、不跟随 watch）。

## 六、代码分割与压缩

- `optimization.runtimeChunk: 'single'`：运行时单独成文件，业务 chunk 的 hash 不因运行时变化而全部失效；
- `optimization.splitChunks`：保留 `vendors`（`test: /node_modules/`，`priority: 10`）与 `common`（`minChunks: 2`，`priority: 5`）两条 cacheGroup，作为生产标配写法；
- 单入口下用**动态 `import('./lazy.js')`** 产生独立 chunk，演示"路由级懒加载"这一最自然的分割方式；
- 压缩由手写 `mini-terser-plugin.cjs` 完成（`minimize: true` + 该插件作为 `minimizer`）。

## 七、目录结构（改造后）

```
webpack-lab/
  webpack.config.cjs              # 唯一配置，build / preview 靠 WEBPACK_SERVE 分流
  loaders/
    css-loader.cjs                # 手写 css-loader
    extract-css-loader.cjs        # 手写 mini-css-extract loader（pitch）
  plugins/
    mini-html-plugin.cjs          # 手写 HtmlWebpackPlugin
    mini-css-extract-plugin.cjs   # 手写 MiniCssExtractPlugin
    mini-terser-plugin.cjs        # 手写 TerserPlugin
  src/
    index.js                      # 单入口
    lazy.js                       # 动态 import → 独立 chunk
    style.css                     # CSS 链路输入（含 @import / url() 以便演示）
  min-webpack/                    # 保留：约百行最小 webpack
    bundle.cjs
    src/entry.js
    src/greet.js
  dist/                           # 产物（gitignore）
```

`code/build-lab/.vscode/launch.json`（独立一份，作用于 build-lab 目录）。

## 八、调试：只留 launch.json，删掉 DebugProbePlugin

**结论：`program` 可以走 npm 命令。** 用 `runtimeExecutable` + `runtimeArgs` 即可：

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "调试 webpack 构建",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "webpack:build"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

位置：`code/build-lab/.vscode/launch.json`（用户确认"单独一份，对应 code 目录"）。`cwd` 用 `${workspaceFolder}`，即以 `build-lab` 为工作区根打开时可直接 F5。

为什么不需要 `DebugProbePlugin`：断点直接打在 `loaders/*.cjs`、`plugins/*.cjs`、`webpack.config.cjs` 里就能命中——它们是我们自己的源码，不是 `node_modules`。`DebugProbePlugin` 原本只为让 webpack 内部钩子也能停住而存在，与"调试我们自己的代码"无关。

注意事项写入文档：

- 调试用 `webpack:build`（单次执行、进程会退出）；`webpack:build:preview` 会起常驻服务，不适合打断点；
- 用 npm 方式时若断点不命中，退回到 `program` 直指 `node_modules/webpack-cli/bin/cli.js`（`args` 带 `--config`）这一备用写法；
- 若以仓库根为工作区打开 VS Code，嵌套的 `.vscode/launch.json` 不生效，需把这段配置合并进根配置。

## 九、文档改造

`webpack.md` 由 13 节压缩为 **8 节 + 配套代码/参考**：

| 新节 | 来源 | 处理 |
| --- | --- | --- |
| 一、五个对象：webpack 的心智模型 | 原第一节 | 保留 |
| 二、生产配置全览（单入口） | 原第二节 | 改写为单入口生产配置 |
| 三、手写 loader：css-loader / extract-css-loader | 原第三节 | 改写为重点；含 4.1 的 `style-loader` 对照说明 |
| 四、手写 plugin：Html / CssExtract / Terser | 原第四、十一节 | 合并扩写为重点，**并入精简版主干钩子速查表 + stage 顺序表** |
| 五、代码分割与压缩 | 原第五、七节 | 精简合并 |
| 六、两个命令与预览 | 原第十节 | 改写 |
| 七、断点调试 | 原第九节 | 改写为"只留 launch.json" |
| 八、min-webpack：约百行看懂执行流程 | 原第十三节 | **保留**（方案 B） |
| 配套代码 / 参考 | 原有 | 按新文件表重写 |

删除内容：钩子全景大图（245 次触发）、各阶段数据变化表、缓存实验（原六）、运行时代价（原七）、drop 插件（原十二）、官方插件思想独立节（原十一，合并进新第四节）。

> 注：新第四节的钩子速查表为**静态参考表**（webpack 5 主干钩子 + stage 常量），不再声明"可用 `npm run webpack:hooks` 复现"——因为探针脚本 `hooks-probe.cjs` 在本轮被删除。

## 十、删除清单

**目录 / 文件**

- `webpack-lab/spa-app/`、`webpack-lab/prod-app/`、`webpack-lab/pit-app/`
- `webpack-lab/split.cjs`、`webpack-lab/cache.cjs`、`webpack-lab/one-cache.cjs`
- `webpack-lab/hooks-probe.cjs`
- `webpack-lab/debug-launch.json`（由 `code/build-lab/.vscode/launch.json` 取代）
- `webpack-lab/drop-assets-plugin.cjs`、`webpack-lab/drop-test-mock-plugin.cjs`
- `webpack-lab/webpack.cache.config.cjs`
- `webpack-lab/emit-list-plugin.cjs`、`webpack-lab/mini-html-plugin.cjs`、`webpack-lab/txt-loader.cjs`（顶层旧位置，功能由 `loaders/` 与 `plugins/` 下的新文件承担）
- `webpack-lab/src/pageB.js`、`webpack-lab/src/heavy.js`、`webpack-lab/src/shared.js`、`webpack-lab/src/note.txt`
- `webpack-lab/dist/` 下的旧产物（构建时由 `output.clean` 覆盖）

**例外（方案 B 保留）**

- `webpack-lab/min-webpack/`（`bundle.cjs` + `src/entry.js` + `src/greet.js`）与其脚本 `mini:webpack` **不删**。

**package.json scripts 删除**

共 8 项：`webpack:prod`、`webpack:drop`、`webpack:minihtml`、`webpack:debug`、`webpack:split`、`webpack:cache`、`webpack:hooks`、`webpack:hooks:prod`。

**依赖变更**

- 新增 `webpack-dev-server`（当前未安装，`^5`）；
- 新增显式 `terser`（当前仅为 `terser-webpack-plugin` 的传递依赖，手写插件直接 `require('terser')`，应显式声明）；
- 保留 `webpack`、`webpack-cli`；
- `css-loader`、`mini-css-extract-plugin`、`html-webpack-plugin`、`terser-webpack-plugin`、`copy-webpack-plugin` 在 webpack 篇不再被引用，但其它 lab 可能仍依赖（需在实现时核对后再决定是否移除）。

## 十一、验收标准

1. `cd code/build-lab && npm install` 后，以下命令全部跑通：
   - `npm run webpack:build` → `webpack-lab/dist/` 出现 `index.html`、`main.[hash].js`、`[hash].css`、独立 `runtime.[hash].js` 与懒加载 chunk，JS 已压缩；
   - `npm run webpack:build:preview` → 起服务于 5180，浏览器打开后页面与 `build` 产物一致；
   - `npm run mini:webpack` → 输出 `entry 用到: hello min-webpack`。
2. `dist/index.html` 中的 `<script>` / `<link>` 引用的是**带 hash 的真实文件名**（由 `MiniHtmlPlugin` 现读 assets 生成）。
3. `dist/` 中的 `.js` 体积明显小于未压缩版本（验证手写 Terser 插件生效）。
4. VS Code 以 `code/build-lab` 为工作区时，F5 选中"调试 webpack 构建"能在 `plugins/mini-html-plugin.cjs` 的 `processAssets` 回调内命中断点。
5. `npm run webpack:build` 的 stats 中不再出现 `pageB` / `shared` / `heavy` / `note.txt` 等已删模块。
6. `webpack.md` 中不再出现已删除脚本名（`webpack:dev` / `webpack:prod` / `webpack:drop` / `webpack:minihtml` / `webpack:debug` / `webpack:split` / `webpack:cache` / `webpack:hooks`）。
7. `frontend/进阶/构建体系/总结.md`、`面试题.md` 及 `.workbuddy/scripts/` 下与 webpack 相关的引用同步更新，`node .workbuddy/scripts/check-code-sync.cjs` 通过。

## 十二、风险与取舍

| 风险 | 说明 | 应对 |
| --- | --- | --- |
| 没有开发模式 | 无 HMR、无 development 构建；改代码要重新 `webpack:build` | 这是本轮明确取舍，在文档开头说明定位（讲生产配置） |
| 手写 extract 必须用 pitch | 按普通 loader 写就拿不到上一环的 CSS 文本 | 文档明确讲清 pitch 的 `remainingRequest` 机制 |
| 手写 extract 的 chunk 归属 | 官方实现按 chunk 分别输出 CSS；教学版简化为按入口汇总一个 CSS 文件 | 在文档中标注这是简化，并说明真实实现如何按 chunk 关联 |
| `webpack-dev-server` 版本兼容 | 需与 `webpack@5` / `webpack-cli@5` 匹配 | 安装 `webpack-dev-server@^5` |
| 移除生产插件依赖 | `css-loader` 等包可能被其它 lab 引用 | 实现时先全局检索引用，确认无引用再移除 |
| 删除旧文件影响其它文档 | `总结.md` / `面试题.md` / 校验脚本可能引用旧脚本名 | 验收标准第 7 条覆盖 |
| 端口冲突 | 5180 可能与本地其它服务冲突 | 以启动日志为准；冲突时改 `devServer.port` |