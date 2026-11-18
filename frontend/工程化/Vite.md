# Vite

> 三段式：**使用与核心模型 → 插件体系 → 最小实现**。示例是一个真实的 Vue 3 单入口应用——SFC + `vue-router` 路由懒加载；SFC 交给官方 `@vitejs/plugin-vue`，四个手写插件分别对应 `resolveId`/`load`、`configureServer`、`transformIndexHtml`、`generateBundle` 四类钩子。

## 一、使用 & 核心模型

### 1.1 核心设计思想

```
dev   浏览器 import ──请求──> Vite Server ──转译──> 返回 ESM 源码（不打包）
build 从 index.html 入口 ──全量解析──> 依赖图 ──打包 / 分割 / 压缩──> dist
```

| | dev | build |
| --- | --- | --- |
| 引擎 | esbuild（单文件转换）+ 依赖预构建 | Rolldown（兼容 Rollup 配置；8.x 默认） |
| 工作量 | 与「浏览器请求了什么」成正比 | 与项目规模成正比 |
| 产物 | 一个个真实 ESM 请求，不拼 bundle | chunk / asset，与 webpack 同类 |
| 谁在用 | 本地开发 | 上线 |

两句话记住差异：

- **dev 处理的是「被请求到的模块」**。浏览器发一个 URL，server 才读文件、转译、返回；没被请求到的模块一次都不转。`helper.js` 被 `main.js` import 了，但浏览器没请求它之前，server 不会处理它。
- **build 处理的是「整个依赖图」**。从 `index.html` 里的入口出发，全量走 `resolveId → load → transform`，再把图固化成 chunk。本 lab 一次 `npm run build` 实测 `38 modules transformed`。

dev 侧维护的结构叫**模块图**（module graph）：一个 URL 对应一个模块节点，节点上挂 `importers`（谁 import 我）与 `importedModules`（我 import 谁）。它解释了几个反直觉行为：

| 现象 | 原因 |
| --- | --- |
| 冷启动快 | 图只生长到「首屏请求到的那几条边」，其余节点待定 |
| HMR 快 | 只重转变更模块，再逆着 `importers` 找 accept 边界，不碰打包 |
| 源码必须是 ESM | dev 下 import 原样交给浏览器，CJS 必须先预构建 |

还有一个与 webpack 相反的约定：**Vite 的入口写在 HTML 里**。`index.html` 是构建起点，不是产物模板；下面这句就是 entry：

> 摘自 `./code/vite-lab/index.html`

```html
<script type="module" src="/src/main.js"></script>
```

### 1.2 基础使用

初始化一个项目只有两步：装依赖、写配置。

```bash
npm create vite@latest my-app -- --template vue
# 或手工：npm i -D vite @vitejs/plugin-vue
```

配置本身只有五类，与 webpack 的五类一一对应：

| 类别 | Vite 配置 | 对应 webpack |
| --- | --- | --- |
| 入口 | `root` + `index.html` 里的 `<script type="module">` | `entry` |
| 出口 | `build.outDir` / `rollupOptions.output.*FileNames` | `output.path` / `filename` |
| 转换 | 内置（按文件类型自动分流）+ 官方语言插件 | `module.rules` + loader |
| 扩展 | `plugins` | `plugins` |
| 优化 | `build.rollupOptions.output.manualChunks` / `minify` | `optimization` |

> 摘自 `./code/vite-lab/vite.config.mjs`（运行：`npm run build`）

```js
export default defineConfig({
    root: DIR,

    // 环境变量前缀：只有 VITE_ 开头的才会暴露给客户端代码
    envPrefix: 'VITE_',

    define: {
        // 编译期常量，与 webpack DefinePlugin 等价
        __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },

    plugins: [
        // 官方 @vitejs/plugin-vue 编译 .vue 单文件组件；它也是唯一一个非手写插件
        vue(),
        // 顺序即注册顺序；真正的先后由各自的 enforce / order 决定
        miniVirtual(),
        miniHtml({ nonce: 'lab-nonce' }),
        // 只在 dev 生效（插件自己声明了 apply: 'serve'），build 时根本不加载
        miniMock()
    ],

    // 依赖预构建：把 CJS / 碎片化依赖预先转成 ESM 并合并
    optimizeDeps: {
        include: ['magic-string']
    },

    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // 内置 esbuild 压缩；插件一节只保留四个钩子示例，压缩不再手写
        minify: true,
        // 资源内联阈值：小于它的资源内联进 JS
        assetsInlineLimit: 4096,
        // CSS 单独成文件，不走运行时注入
        cssCodeSplit: true,

        rollupOptions: {
            output: {
                // 内容变了文件名才变 → CDN 长缓存
                entryFileNames: 'assets/[name].[hash:8].js',
                chunkFileNames: 'assets/[name].[hash:8].chunk.js',
                assetFileNames: 'assets/[name].[hash:8][extname]',
                // 手动分组：把 node_modules 依赖单独打一个 chunk
                manualChunks(id) {
                    if (id.includes('node_modules')) return 'vendor'
                    return null
                }
            },
            // 挂在 output 上的插件：产物生成后称重，并落一份清单
            plugins: [miniSizeGate({ limitKb: 60, manifest: 'build-manifest.json' })]
        }
    }
})
```

五个路径 / 出口项要分清：

| 配置 | 默认值 | 作用 |
| --- | --- | --- |
| `root` | `process.cwd()` | 项目根；`index.html`、`.env*`、`public/` 都相对它解析 |
| `base` | `'/'` | 公共路径前缀，dev 与 build 都生效；部署到子目录时改成 `'/blog/'` |
| `publicDir` | `'public'` | 原样复制到产物根，用 `/logo.svg` 引用，不参与构建 |
| `build.outDir` | `'dist'` | 产物目录，相对 `root` |
| `build.rollupOptions` | `{}` | 直接透传给 Rollup / Rolldown：`input`、`output`、`plugins` 都在这里 |

`define` 替换的是**代码文本**，值必须 `JSON.stringify`——不加引号会被当成标识符而报错，这一点与 webpack 的 `DefinePlugin` 完全一样。

#### 环境变量

```
.env                  所有模式都加载
.env.development      只在 dev 加载
.env.production       只在 build 加载
.env.local            本地覆盖，通常 gitignore
.env.[mode].local     优先级最高
```

同一变量在多份文件里出现时，**mode 专属 > 通用，`.local` > 非 `.local`**；已经存在的进程环境变量优先级最高。

`import.meta.env` 与 `process.env` 的区别：

| | `import.meta.env`（Vite） | `process.env`（webpack / Node） |
| --- | --- | --- |
| 暴露范围 | 只有 `envPrefix`（默认 `VITE_`）开头的变量 | `DefinePlugin` 显式定义的才有 |
| 注入方式 | dev 注入一行对象；build **静态替换成字面量** | 同样是编译期文本替换 |
| 运行时读取 | 不支持（构建期已定死） | 不支持（同理） |
| 动态拼接 | `import.meta.env[key]` 替换不了 | `process.env[key]` 同理替换不了 |

三条规则：

1. **前缀是闸门**，防止把数据库密码打进前端产物。
2. **替换是字面量内联**，所以 `if (import.meta.env.PROD) {...}` 的假分支能被压缩器删掉。
3. **不能动态拼接 key**，构建期不知道 `key` 是什么。

本 lab 的 `.env` 写 `VITE_APP_NAME=vite-lab-dev`，`.env.production` 写 `vite-lab-prod`。dev 下请求 `/src/main.js`，server 返回的第一行就是注入的环境对象：

```
import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false,
  "VITE_API_BASE": "http://localhost:3000", "VITE_APP_NAME": "vite-lab-dev"};
```

build 后产物里则是一个字面量（生产构建取了 `.env.production`）：

```
={name:`vite-lab`,mode:`production`},j=`vite-lab-prod`,M=!0,…
```

`j` 是 `appName`，`M` 是 `inProd = true`——全部在构建期定死。

#### 静态资源

| 写法 | 得到什么 | 典型用途 |
| --- | --- | --- |
| `import logo from './logo.svg'` | 一个 URL（小文件可能变 data URL） | 常规图片、字体 |
| `import logoUrl from './logo.svg?url'` | 始终是 URL，不受内联阈值影响 | 需要真实 URL 的场景 |
| `import text from './shader.glsl?raw'` | 文件内容字符串 | 着色器、模板、LICENSE |
| `import css from './a.css?inline'` | CSS 文本，不注入 `<style>` | 需要自己控制插入时机 |
| `import big from './big.png?no-inline'` | 强制不内联 | 调试内联阈值 |
| `/logo.svg`（放在 `public/`） | 原样复制的 URL | 不参与构建的静态文件 |

是否内联由 `build.assetsInlineLimit` 决定（默认 4096 字节）；`?inline` / `?no-inline` 可以显式覆盖它。

#### CSS

| 需求 | 写法 | 说明 |
| --- | --- | --- |
| 普通 CSS | `import './style.css'` | 产物里抽成独立 `.css` |
| CSS Modules | `import s from './a.module.css'` | `s.className` 是哈希后的类名 |
| Sass / Less | 装 `sass` / `less` 后直接 import `.scss` / `.less` | 预处理由对应编译器完成 |
| PostCSS | 根目录 `postcss.config.js` | 自动作用于所有 CSS |
| CSS 字符串 | `import css from './a.css?inline'` | 不注入，返回文本 |
| 按 chunk 拆分 | `build.cssCodeSplit: true`（默认） | 异步 chunk 的 CSS 随 chunk 加载 |

`.vue` 的编译不在内置转换里，必须装 `@vitejs/plugin-vue`——所谓「配置全手写」针对的是产物收尾，不是语言编译。

### 1.3 工程化 & 性能

#### 预构建（`optimizeDeps`）

**为什么需要预构建**：`node_modules` 里的包大量是 CommonJS，浏览器不认；即使是 ESM，一个包也可能拆成几百个小文件，浏览器逐个请求会形成请求瀑布。预构建把依赖提前转成**单个 ESM 文件**并合并，一次解决两件事。

产物落在 `node_modules/.vite/deps/`，并带一份元数据：

> 摘自 `./code/vite-lab/node_modules/.vite/deps/_metadata.json`（运行：`npm run dev`）

```json
{
  "hash": "a06f9a76",
  "optimized": {
    "magic-string": { "src": "../../magic-string/dist/magic-string.es.mjs", "file": "magic-string.js" },
    "vue-router": { "src": "../../vue-router/dist/vue-router.mjs", "file": "vue-router.js" },
    "vue": { "src": "../../vue/dist/vue.runtime.esm-bundler.js", "file": "vue.js" }
  }
}
```

dev 下 `main.js` 的 import 会被改写成预构建产物：

```
import { createApp } from "/node_modules/.vite/deps/vue.js?v=13a1fdef"
import MagicString from "/node_modules/.vite/deps/magic-string.js?v=13a1fdef"
```

三个开关：

- `optimizeDeps.include`：显式声明要预构建的依赖。动态 import、插件内部引入的依赖可能扫不到，提前写死可以避免 dev 中途重新预构建并刷新页面（本 lab 显式加了 `magic-string`）。
- `optimizeDeps.exclude`：排除某个包。常见于本地 workspace 包——被预构建成一个文件后，这个节点对编辑不再敏感。
- `optimizeDeps.force` / `--force`：忽略缓存重新预构建。改完 `vite.config` 里依赖相关配置后用它。

#### HMR

HMR 的原理仍然是「模块粒度 = 文件粒度」：服务端只重转变更模块，再通过 WebSocket 告诉浏览器重新发一个 ESM 请求，不需要重新打包，所以更新耗时与项目规模无关。

模块自己声明接受更新，冒泡才会停在这一层：

```js
// 只在 dev 存在；build 时整段是死代码，会被摇掉
if (import.meta.hot) {
    import.meta.hot.accept(newModule => {
        // 用新模块替换旧模块，不刷新页面
    })
    import.meta.hot.dispose(data => {
        // 清理定时器 / 事件监听
    })
}
```

没有 `accept` 边界时会向上冒泡到 import 它的模块；一路冒泡不到就整页刷新。`import.meta.hot.invalidate()` 可以主动放弃当前模块、继续向上冒泡。

#### 构建优化

- **代码分割**：`build.rollupOptions.output.manualChunks` 按模块 id 分组；路由表里的 `() => import()` 自动切 chunk。
- **tree-shaking**：Rollup / Rolldown 的能力，前提是 ESM；包自己的 `sideEffects` 声明决定「没被引用的模块能不能整块删」。
- **压缩**：`build.minify` 默认 `'esbuild'`；要更激进的压缩可换 `'terser'`（需装 `terser`）。
- **兼容**：`build.target` 默认按浏览器基线（`baseline-widely-available`），要兼容旧浏览器时显式写 `es2015` / `es2017` 等。
- **资源内联**：`build.assetsInlineLimit` 控制小文件是否变 data URL。
- **CSS 拆分**：`build.cssCodeSplit` 让异步 chunk 的 CSS 随 chunk 加载。

`manualChunks` 只接受函数形式（Rolldown 下写对象会报 `Invalid type: Expected Function but received Object`）：

> 摘自 `./code/vite-lab/vite.config.mjs`（运行：`npm run build`）

```js
manualChunks(id) {
    if (id.includes('node_modules')) return 'vendor'
    return null
}
```

路由级懒加载是最自然的分割点：

> 摘自 `./code/vite-lab/src/router.js`（运行：`npm run build`）

```js
const routes = [
    { path: '/', name: 'home', component: () => import('./views/Home.vue') },
    { path: '/about', name: 'about', component: () => import('./views/About.vue') }
]
```

一次 `npm run build` 的产物（按 gzip 排序，来自 `dist/build-manifest.json`）：

```
assets/vendor.DsOb2RQy.chunk.js  chunk  raw 106176B  gzip  38898B   ← node_modules
assets/index.DBSKlWm-.js         chunk  raw   3509B  gzip   1797B   ← 入口
assets/Home.k5xB5yNE.chunk.js    chunk  raw    703B  gzip    552B   ← 路由懒加载：Home.vue
assets/About.C2uZzM78.chunk.js   chunk  raw    411B  gzip    350B   ← 路由懒加载：About.vue
index.html                       asset  raw    549B  gzip    341B
assets/index.Ci2kpolT.css        asset  raw    420B  gzip    262B   ← style.css + SFC 样式
assets/Home.CqUoZoTO.css         asset  raw     99B  gzip    109B   ← Home.vue 的 <style scoped>
合计 gzip 42309B，预算 60KB —— 通过
```

`vendor` 的 hash 稳定就能长缓存；两个路由视图只在导航到对应路径时才下载；CSS 有独立 hash，也随 HTML 并行加载。

三个命令共用同一份配置：

| 命令 | 做什么 | 服务 / 产物 |
| --- | --- | --- |
| `npm run dev` | 起 dev server，按请求即时转换 | 端口 5182 |
| `npm run build` | production 构建，写盘 | `dist/` |
| `npm run preview` | 先 `vite build`，再起纯静态服务预览真实产物 | 端口 5181 |

`vite preview` **不是 dev server**：没有 HMR、不做任何转换，它服务的就是 `build` 写盘的 `dist/`——预览到的和要上线的完全一致。

## 二、插件体系

### 2.1 插件结构

一个插件就是一个对象；唯一必填字段是 `name`，其余全是钩子：

```ts
type Plugin = {
  name: string
  // Vite 专属（dev server 阶段）
  configureServer(server): void
  configurePreviewServer(server): void
  transformIndexHtml(html, ctx)
  // 通用（dev + build 都执行，来自 Rollup / Rolldown）
  options, buildStart, resolveId, load, transform, buildEnd
  // 输出阶段（只有 build 才有）
  renderChunk, generateBundle
}
```

Vite 的钩子有**两条正交的轴**：**归属**（通用还是 Vite 专有）与**生效端**（dev / build / 两者 / preview）。判「能不能换个工具复用」看归属，判「什么时候触发」看生效端。

#### 通用钩子（Rollup / Rolldown 兼容）

| 钩子 | 参数 | 生效端 | 此刻能看到 | 本篇谁在用 |
| --- | --- | --- | --- | --- |
| `buildStart` | `(options)` | 两者 | 已解析的 options | — |
| `resolveId` | `(source, importer)` | 两者 | 说明符、importer | `mini-virtual` |
| `load` | `(id)` | 两者 | 已解析的 id | `mini-virtual` |
| `transform` | `(code, id)` | 两者 | 源码 + id | —（原理见 3.2） |
| `buildEnd` | `(error?)` | 两者 | 构建结束 / 报错 | — |
| `renderChunk` | `(code, chunk)` | **build** | 已生成的 chunk 代码 | —（分工见 2.4） |
| `generateBundle` | `(options, bundle)` | **build** | 完整 bundle | `mini-size-gate` |
| `closeBundle` | `()` | **build** | 已写盘的产物 | — |

#### Vite 专有钩子

| 钩子 | 参数 | 生效端 | 用途 | 本篇谁在用 |
| --- | --- | --- | --- | --- |
| `config` | `(config, env)` | 两者 | 改配置（返回 partial） | — |
| `configResolved` | `(config)` | 两者 | 读最终配置 | `mini-virtual`（缓存 `mode`） |
| `configureServer` | `(server)` | **dev** | 加中间件、WebSocket | `mini-mock` |
| `configurePreviewServer` | `(server)` | **preview** | 预览期中间件 | — |
| `transformIndexHtml` | `(html, ctx)` | 两者 | 改 HTML（build 侧有 `ctx.bundle`） | `mini-html` |
| `hotUpdate` | `(ctx)` | **dev** | 热更新时介入模块集合 | —（原理见 1.3） |

三条读表纪律：

1. **「两端都跑」不等于「含义相同」**。`resolveId` / `load` / `transform` 在 dev 只处理被请求到的模块，在 build 处理整张依赖图。
2. **不是所有钩子都会在你的项目里跑**。`configurePreviewServer` 只在 `vite preview` 时触发；表里的空行也是信息。
3. **钩子不触发先查 `apply`**。`apply: 'serve'` 的插件在 build 里根本不加载。

### 2.2 顺序与门禁

webpack 用 `stage` 数值给同一阶段内的插件排序；Vite 没有这类数字，排序分三层：

| 层 | 手段 | 作用范围 | 例子 |
| --- | --- | --- | --- |
| 1 | 不用排 | 跨钩子 | `resolveId → load → transform` 天然有先后 |
| 2 | `enforce: 'pre' \| 'normal' \| 'post'` | **跨插件、同一个钩子** | 想抢在内置转换前看源码就用 `pre` |
| 3 | `order: 'pre' \| 'normal' \| 'post'` | **同插件、同一钩子的多个 handler** | `mini-html` 的 `transformIndexHtml: { order: 'post', handler }` |

官方顺序链：

```
alias → pre → vite core → normal → vite build → post → vite build post
```

一句话对照：**webpack 的 `stage` 是全局数值，Vite 的是分层相对顺序**。`stage` 能表达「我排在 3000 和 4000 之间」，Vite 只能表达「我在内置之前 / 之后」。

门禁一律用 `apply`，不要在钩子里判 `command`：

```js
// build 才加载；dev 下这个插件根本不存在
{ name: 'my-plugin', apply: 'build', transform(code, id) { /* … */ } }
```

写成钩子体内 `if (command === 'build')`，插件在另一端仍会被加载、`config` 仍会被调用，只是钩子体不干活。

### 2.3 插件实战：四个钩子各写一个

四个插件覆盖四类最常用的钩子。先给一个最小骨架——**插件的全部接口就是「返回一个对象，在对象上挂钩子」**：

```js
export default function myPlugin(options = {}) {
    return {
        name: 'my-plugin',      // 唯一必填，且要唯一
        apply: 'build',        // dev / build 门禁
        enforce: 'pre',        // 跨插件排序
        transform(code, id) {
            if (!id.endsWith('.js')) return null // 返回 null = 不处理
            return { code: code.replace(/console\.log\([^)]*\)/g, '') }
        }
    }
}
```

#### 2.3.1 `mini-virtual`：`resolveId` + `load`

源码里 `import { BUILD_INFO } from 'virtual:build-info'`，磁盘上没有这个文件。虚拟模块靠两个钩子配合：`resolveId` 认领说明符、`load` 提供内容。

> 摘自 `./code/vite-lab/plugins/mini-virtual.mjs`（运行：`npm run build`）

```js
export default function miniVirtual() {
    const VIRTUAL_ID = 'virtual:build-info'
    const RESOLVED_ID = '\0' + VIRTUAL_ID

    // configResolved 能读到最终配置；把 mode 缓存下来，load 时注入字面量
    let mode = 'production'

    return {
        name: 'mini-virtual',

        configResolved(config) {
            mode = config.mode
        },

        resolveId(source) {
            if (source === VIRTUAL_ID) return RESOLVED_ID
            return null // 返回 null = 这个模块我不管，交给链上的下一个插件
        },

        load(id) {
            if (id !== RESOLVED_ID) return null
            // 这里返回的就是"模块源码"，它会像真实文件一样被后续插件 transform
            return `export const BUILD_INFO = { name: 'vite-lab', mode: ${JSON.stringify(mode)} }\n`
        }
    }
}
```

三个关键点：

1. **虚拟 id 用 `\0` 打头**。这是社区约定，表示「不是真实路径」，避免后续插件或解析器再去磁盘找它。
2. **`resolveId` 返回 `null` 表示「我不处理」**，把说明符交还给插件链。
3. **`load` 返回的字符串就是源码**，它会继续流经后续 `transform`，也能被 tree-shaking。

dev 下同样有效：请求 `virtual:build-info` 会走一遍 `resolveId → load → transform`，URL 被编码成 `/@id/__x00__virtual:build-info`。

#### 2.3.2 `mini-mock`：`configureServer`

页面里 `fetch('/api/user')`，请求由中间件直接应答，背后没有真实后端。插件声明 `apply: 'serve'`，build 时根本不加载。

> 摘自 `./code/vite-lab/plugins/mini-mock.mjs`（运行：`npm run dev`）

```js
export default function miniMock(options = {}) {
    const data = options.data || {
        '/api/user': { id: 1, name: 'vite-lab', role: 'admin' },
        '/api/pages': [
            { path: '/', title: '首页' },
            { path: '/about', title: '关于' }
        ]
    }

    return {
        name: 'mini-mock',
        apply: 'serve',

        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url?.split('?')[0]
                if (!url?.startsWith('/api/')) return next()

                const hit = data[url]
                res.statusCode = hit ? 200 : 404
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify(hit || { error: 'mock 未定义该接口' }))
                console.log(`  [mini-mock] ${req.method} ${url} → ${res.statusCode}`)
            })

            // 返回的函数排在 Vite 内置中间件之后，适合做收尾动作（这里打印注册表）
            return () => {
                const routes = Object.keys(data)
                console.log(`  [mini-mock] 已注册 ${routes.length} 条 mock 路由：${routes.join(', ')}`)
            }
        }
    }
}
```

两个要点：

1. **中间件有两种挂法，差别是「排在内置中间件之前还是之后」**。直接 `server.middlewares.use()` 是立刻挂；`return () => {...}` 是交给 Vite 等内置中间件装完再调用。
2. **这个差别有后果**：`/api/*` 的 404 必须放在靠前那个中间件里。写到返回的函数里，浏览器发来的 `/api/nope` 带 `Accept: text/html`，会被更靠前的 HTML 回退先吞成 `index.html`（状态码 200）。

实测（`npm run dev`，另开终端发请求）：

```
  [mini-mock] 已注册 2 条 mock 路由：/api/user, /api/pages
  [mini-mock] GET /api/user → 200
  [mini-mock] GET /api/nope → 404
```

```
$ curl http://localhost:5182/api/user
{"id":1,"name":"vite-lab","role":"admin"}
```

#### 2.3.3 `mini-html`：`transformIndexHtml`

`apply: 'build'` + `order: 'post'`，保证只在构建期、且在其它 HTML 变换之后执行。

> 摘自 `./code/vite-lab/plugins/mini-html.mjs`（运行：`npm run build`）

```js
export default function miniHtml(options = {}) {
    const nonce = options.nonce || 'lab-nonce'

    return {
        name: 'mini-html',
        apply: 'build',

        transformIndexHtml: {
            order: 'post',
            handler(html, ctx) {
                // ctx.bundle 只有构建期才有：里面是「文件名 → 产物」的映射
                const entry = Object.values(ctx.bundle).find(o => o.type === 'chunk' && o.isEntry)

                // Vite 默认已经注入过 modulepreload，不查重会让同一个 chunk 被请求两次
                const deps = entry?.imports || []
                const missing = deps.filter(f => !html.includes(`href="/${f}"`))
                const preloads = missing
                    .map(f => `<link rel="modulepreload" href="/${f}" nonce="${nonce}">`)
                    .join('\n    ')

                const withNonce = html.replace(/<script /g, `<script nonce="${nonce}" `)
                console.log(
                    `  [mini-html] 入口依赖 ${deps.length} 条，Vite 已注入 ${deps.length - missing.length} 条，补 ${
                        missing.length
                    } 条；脚本加 nonce="${nonce}"`
                )

                return preloads ? withNonce.replace('</head>', `    ${preloads}\n  </head>`) : withNonce
            }
        }
    }
}
```

**「补 0 条」是本段最有价值的读数**：Vite 默认已经注入了 `modulepreload`，自研插件不查重就会让同一个 chunk 被请求两次。

```
  [mini-html] 入口依赖 1 条，Vite 已注入 1 条，补 0 条；脚本加 nonce="lab-nonce"
```

生成的 `dist/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>vite-lab 生产构建</title>
      <script nonce="lab-nonce" type="module" crossorigin src="/assets/index.DBSKlWm-.js"></script>
      <link rel="modulepreload" crossorigin href="/assets/vendor.DsOb2RQy.chunk.js">
      <link rel="stylesheet" crossorigin href="/assets/index.Ci2kpolT.css">
    </head>
```

`<script>` / `<link>` 引用的是**现读出来的最终文件名**——hash 变了它自动跟着变，所以从不手写 `<script src="app.js">`。

#### 2.3.4 `mini-size-gate`：`generateBundle`

`generateBundle` 是「已生成、未写盘」的唯一安全窗口：此时能读到最终代码，也能增删产物。

> 摘自 `./code/vite-lab/plugins/mini-size-gate.mjs`（运行：`npm run build`）

```js
import zlib from 'node:zlib'

export default function miniSizeGate({ limitKb = Infinity, manifest = 'build-manifest.json' } = {}) {
    return {
        name: 'mini-size-gate',

        generateBundle(_options, bundle) {
            const rows = []
            for (const [fileName, item] of Object.entries(bundle)) {
                const source = item.type === 'chunk' ? item.code : item.source
                rows.push({
                    fileName,
                    type: item.type,
                    raw: Buffer.byteLength(source),
                    gzip: zlib.gzipSync(Buffer.from(source)).length
                })
            }
            rows.sort((a, b) => b.gzip - a.gzip)

            console.log('  ---- 产物清单（按 gzip 排序）----')
            for (const r of rows) {
                console.log(
                    `    ${r.fileName.padEnd(32)} ${r.type.padEnd(6)} raw ${String(r.raw).padStart(6)}B  gzip ${String(
                        r.gzip
                    ).padStart(6)}B`
                )
            }

            // emitFile：额外产出一个清单文件（走 asset 通道，不占 chunk）
            this.emitFile({
                type: 'asset',
                fileName: manifest,
                source: JSON.stringify(rows, null, 2)
            })

            const over = rows.filter(r => r.gzip > limitKb * 1024)
            if (over.length) {
                this.error(`产物超预算：${over.map(r => `${r.fileName} gzip ${r.gzip}B > ${limitKb}KB`).join('；')}`)
            }
            console.log(`    合计 gzip ${rows.reduce((s, r) => s + r.gzip, 0)}B，预算 ${limitKb}KB —— 通过`)
        }
    }
}
```

三个设计点：

1. **量 gzip 而不是 raw**。浏览器拿到的都是压缩后的字节，raw 与 gzip 差 3 倍很常见。
2. **产出清单而不是只打印**。构建日志会丢，`build-manifest.json` 会进 CI 产物；下次体积涨了，diff 两份清单就知道是哪个 chunk 涨的。
3. **`this.error` 让插件从「报告」变成「门禁」**。CI 里的非零退出码就是靠它。

实测读数见 1.3 的产物清单；阈值 60KB 是「挡住继续膨胀」，不是脱离技术栈的绝对值。

### 2.4 三个钩子的分工纪律

build 侧最后三道工序该挂在哪，是实操里最容易选错的：

| 想干的事 | 用哪个钩子 | 为什么是它 |
| --- | --- | --- |
| 改 chunk 代码（压缩、替换常量） | `renderChunk` | 代码已生成、hash 未算、未写盘 |
| 增删产物、改文件名、产出清单 | `generateBundle` | 「已生成、未写盘」的唯一安全窗口 |
| 改 HTML | `transformIndexHtml` | 只有它拿得到 `ctx.bundle`（build 侧） |
| 按源码逐模块改写 | `transform` | 拿得到 `code` 与 `id`，拿不到 bundle |

一句话：**改代码在 `renderChunk`，动产物结构在 `generateBundle`，改 HTML 在 `transformIndexHtml`**。删一个 chunk 时还要留意它的引用边，否则别的 chunk 会指向一个不存在的文件。

本篇插件与生态插件的对照：

| lab 插件 | 挂的钩子 | 对应的真实插件 | 什么时候直接用现成的 |
| --- | --- | --- | --- |
| `mini-virtual` | `resolveId` + `load` | `vite-plugin-virtual` | 只是要个虚拟常量，用现成的更省 |
| `mini-mock` | `configureServer` | `vite-plugin-mock` | 要延时 / 分页 / 数据文件，用现成的 |
| `mini-html` | `transformIndexHtml` | `vite-plugin-html` | 要 EJS 模板 / 多页注入，用现成的 |
| `mini-size-gate` | `generateBundle` | `size-limit` | 门禁要接 CI 报告，现成的更全 |

一条总纲：**语言编译一律用官方（`@vitejs/plugin-vue`）；产物收尾才值得自己写；生态里已有成熟插件时优先用现成的。**

## 三、最小实现：mini-vite

`mini-vite` 是**独立项目**（`code/mini-vite/`，与 vite-lab 平级；唯一依赖 `acorn`），`npm run mini` 跑一段 build，不需要浏览器、也不需要真实项目。

它复刻的不是「另一个打包器」，而是**插件容器如何按钩子语义调用插件**：从入口全量建图 → 拓扑排序 → 拼成一个文件。

| 文件 | 承担的概念 | 对应真实 Vite |
| --- | --- | --- |
| `index.mjs` | 入口：跑一段 build，打印钩子触发次数 | — |
| `lib/hook.mjs` | 极简 tapable：`call` / `first` / `pipe` 三种调用约定 | `getSortedPluginHooks` |
| `lib/plugin-container.mjs` | 插件容器：`config` → `apply` 过滤 → `enforce`/`order` 排序 → 注册 → 分发 | `pluginContainer.ts` |
| `lib/resolve.mjs` | 说明符 → id（相对 / 裸导入 / 虚拟模块） | `vite:resolve` |
| `lib/module-graph.mjs` | 模块图：`imports` / `importers` + 拓扑排序 | `moduleGraph.ts` |
| `lib/transform.mjs` | import-analysis：acorn 解析 import → 记图 | `vite:import-analysis` |
| `lib/build.mjs` | build 引擎：全量建图 + 打包（scope hoisting 极简版） | Rollup / Rolldown |
| `lib/emit.mjs` | 产物：`generateBundle` → 写盘 → HTML → `closeBundle` | `generateBundle` / `closeBundle` |
| `plugins/` | 4 个示例插件（`mini-virtual` / `mini-banner` / `mini-report` / `mini-html`） | — |

**读法（由内向外）**：先看 `lib/hook.mjs`（钩子怎么被调用）与 `lib/plugin-container.mjs`（插件怎么被过滤、排序、注册）；再看 `lib/build.mjs`，它只是「在什么时机调用容器」。

### 3.1 插件容器：过滤、排序、注册

容器按顺序做四件事：跑 `config` / `configResolved`、按 `apply` 过滤、把每个钩子收集成有序数组、暴露分发方法。**排序只在这一处**——主键 `enforce`、次键 `order`、末键注册顺序兜底：

> 摘自 `./code/mini-vite/lib/plugin-container.mjs`（运行：`npm run mini`）

```js
    // ---- 3. apply 过滤 ----
    const activePlugins = rawPlugins.filter(p => applyMatches(p, command, mode))

    // ---- 4. 每个钩子收集成一个有序 Hook ----
    //    排序：主键 enforce（跨插件），次键 order（同一钩子内），末键注册顺序（稳定）
    const hooks = {}
    for (const name of RUN_HOOKS) {
        const entries = []
        activePlugins.forEach((plugin, index) => {
            const entry = hookEntry(plugin, name)
            if (!entry) return
            entries.push({
                plugin,
                fn: entry.fn,
                tier: TIER[plugin.enforce] ?? TIER.normal,
                order: TIER[entry.order] ?? TIER.normal,
                index
            })
        })
        entries.sort((a, b) => a.tier - b.tier || a.order - b.order || a.index - b.index)

        const hook = new Hook()
        for (const e of entries) {
            const ctx = context(e.plugin)
            hook.tap(e.plugin.name, (...args) => e.fn.apply(ctx, args))
        }
        hooks[name] = hook
    }
```

`apply` 过滤把不匹配当前 `command` 的插件剔除——本实现只跑 build，所以 `apply: 'serve'` 的插件不参与；真实 Vite 在 dev 下则反过来。`config` / `configResolved` 在过滤之前跑，这也解释了「漏写 `apply` 的插件，`config` 仍会被调用」。

### 3.2 钩子的三种调用约定

容器把钩子按语义分成三类，`lib/hook.mjs` 各给一个方法——这就是「钩子怎么被调用」的全部：

> 摘自 `./code/mini-vite/lib/hook.mjs`（运行：`npm run mini`）

```js
export class Hook {
    constructor() {
        this.taps = []
    }

    tap(name, fn) {
        this.taps.push({ name, fn })
    }

    async call(...args) {
        for (const t of this.taps) await t.fn(...args)
    }

    async first(...args) {
        for (const t of this.taps) {
            const result = await t.fn(...args)
            if (result != null) return result
        }
        return null
    }

    async pipe(seed, ...rest) {
        let current = seed
        for (const t of this.taps) {
            const result = await t.fn(current, ...rest)
            if (result != null) current = result
        }
        return current
    }
}
```

| 约定 | 行为 | 用在哪些钩子 |
| --- | --- | --- |
| `call` | 依次 `await`，忽略返回值 | `buildStart` / `buildEnd` / `closeBundle` / `generateBundle` |
| `first` | 依次 `await`，第一个非空结果即返回 | `resolveId` / `load` |
| `pipe` | 上一个的返回值喂给下一个 | `transform` / `renderChunk` / `transformIndexHtml` |

`transform` 钩子在本实现里只「解析说明符 + 记图」，不改代码——`lib/transform.mjs` 用 acorn 解析静态 `import` / `export ... from`，把说明符交给容器的 `resolveId`，再把依赖写进模块图，供 build 做拓扑排序。

### 3.3 build 引擎：全量建图 + 拼成一个文件

从入口出发把整张图走一遍，再按拓扑序把各模块摊平进一个作用域——删掉 import 语句、去掉 export 关键字，即「scope hoisting 极简版」：

> 摘自 `./code/mini-vite/lib/build.mjs`（运行：`npm run mini`）

```js
    // 全量建图：从入口出发，把整张依赖图（可达模块）都走一遍
    async function visit(id) {
        if (visited.has(id)) return
        visited.add(id)
        const code = await container.load(id)
        if (code == null) throw new Error(`无法加载 ${id}`)
        codeById.set(id, await container.transform(code, id))
        moduleGraph.markTransformed(id)
        for (const dep of moduleGraph.get(id)?.imports ?? []) await visit(dep)
    }
    await visit(entry)

    // 拓扑排序：依赖在前、入口在后
    const order = moduleGraph.topoSort([entry])
    const parts = order.map(id => `// ---- ${label(id, root)} ----\n${flatten(codeById.get(id), id)}`)
    let code = parts.join('\n\n') + '\n'

    const chunk = { type: 'chunk', fileName: 'assets/index.js', isEntry: true, modules: order }
    code = await container.renderChunk(code, chunk, { format: 'es' })

    await container.buildEnd()
    return { code, chunk, entry, order }
```

`flatten` 用 acorn 扫描顶层语句：`ImportDeclaration` 整条删掉，`ExportNamedDeclaration` 只删 `export ` 关键字或整条导出列表；`export default` 明确报错——真正的作用域分析超出最小实现。真实 Rollup / Rolldown 还会做重命名、作用域分析与 tree-shaking，这里只保留「打包 = 建图 + 拓扑 + 拼接」。

### 3.4 一次运行的读数

`npm run mini` 跑一段 build：建图 → 打包 → 执行产物 → 打印钩子触发次数。

```
=== build 引擎：一次走完整张模块图，拼成一个文件 ===
  [mini-virtual] config：command=build mode=production
  [mini-virtual] configResolved：缓存 mode=production
  [mini-banner] renderChunk：给产物加 banner
  [mini-report] generateBundle：输出目录 …/mini-vite/dist
    - assets/index.js  611 B
  [mini-html] transformIndexHtml：ctx.bundle=true
  参与打包的模块 6 个：src/deep2.js → src/deep.js → src/helper.js → \0deps:tiny-lib → \0virtual:build-info → src/main.js
  产物 assets/index.js：611 B
  执行产物（node dist/assets/index.js）：
    hi, mini-vite! (deep:deep2)
    hello from tiny-lib
    mode = production

=== 钩子调用（一次构建）===
  钩子                build
  config              1
  configResolved      1
  buildStart          1
  resolveId           5
  load                6
  transform           6
  renderChunk         1
  generateBundle      1
  closeBundle         1
  transformIndexHtml  1
  buildEnd            1
```

这张表同时落地三件事：

- **通用钩子在 build 下都跑一遍**：`resolveId` 5 次、`load` / `transform` 各 6 次——整张图 6 个模块（4 个磁盘文件 + 1 个裸导入占位 `\0deps:tiny-lib` + 1 个虚拟模块 `\0virtual:build-info`）。
- **输出阶段钩子各 1 次**：`renderChunk` / `generateBundle` / `closeBundle` / `transformIndexHtml`。
- **产物真的能执行**：拼接后的文件用子进程 `node dist/assets/index.js` 跑通。

对照真实 Vite，这个最小实现已经「骨架齐全」：插件容器（过滤 / 排序 / 注册 / 分发）、三种调用约定、虚拟模块、模块图与拓扑排序。Vite 真身叠加的，是内置插件链、HMR 的 accept 边界、依赖预构建的缓存、以及 Rolldown 生产引擎——**机制没变，只是把每一步做重、做对、做成可插拔**。

## 配套代码

本篇示例来自 `code/vite-lab`（独立 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/vite-lab/package.json` | 三个命令：`dev` / `build` / `preview` | 1.3 |
| `./code/vite-lab/vite.config.mjs` | **唯一配置**：入口 / hash / 四个手写插件 / manualChunks | 1.2、2.3 |
| `./code/vite-lab/index.html` | 入口（Vite 的 entry 写在 HTML 里） | 1.1 |
| `./code/vite-lab/src/main.js` | 环境变量、虚拟模块、真实 npm 依赖 | 1.2、2.3 |
| `./code/vite-lab/src/App.vue`、`src/views/`、`src/components/` | SFC 根组件 + 两个路由视图 + 卡片组件 | 1.3 |
| `./code/vite-lab/src/router.js` | 路由表：`() => import()` 路由级懒加载 | 1.3 |
| `./code/vite-lab/src/style.css`、`base.css`、`helper.js` | 样式（`@import`）与工具函数样本 | 1.2、1.3 |
| `./code/vite-lab/.env`、`.env.production` | 环境变量（`VITE_APP_NAME`） | 1.2 |
| `./code/vite-lab/plugins/mini-virtual.mjs` | 虚拟模块（`resolveId` + `load`） | 2.3.1 |
| `./code/vite-lab/plugins/mini-mock.mjs` | dev 期 mock API（`configureServer`） | 2.3.2 |
| `./code/vite-lab/plugins/mini-html.mjs` | HTML 收尾（`transformIndexHtml`） | 2.3.3 |
| `./code/vite-lab/plugins/mini-size-gate.mjs` | 体积门禁 + 清单（`generateBundle`） | 2.3.4 |
| `./code/mini-vite/index.mjs` | 单 build 引擎入口：建图打包 + 钩子触发次数 | 三 |
| `./code/mini-vite/lib/` | `hook` / `plugin-container` / `resolve` / `module-graph` / `transform` / `build` / `emit` | 三 |
| `./code/mini-vite/plugins/` | 4 个示例插件 | 三 |
| `./code/mini-vite/src/` | 演示源码（main / helper / deep / deep2） | 三 |

运行：`cd code/vite-lab && npm install`，然后 `npm run dev`（5182）、`npm run build`、`npm run preview`（5181）。

`mini-vite` 是独立项目：`cd code/mini-vite && npm install && npm run mini`。

## 参考

- 本模块总结：[总结](./总结.md)
- 相关篇：[Webpack](./webpack.md)
- [Vite 官方文档](https://vite.dev/)
- [Vite 插件 API](https://vite.dev/guide/api-plugin.html)
