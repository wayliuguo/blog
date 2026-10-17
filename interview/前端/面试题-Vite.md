# 面试题 · Vite 与 Rollup（全覆盖版）

> 对齐知识体系 frontend/构建体系/（Vite、Rollup）。
> 简历构建口径：熟悉 Vite 项目构建与优化。Webpack 专属概念（loader/plugin 事件流）不在本篇范围，被问就答「生产实践以 Vite/Rollup 为主，webpack 概念层了解」。

## 一、Vite（核心）

**Q1：Vite 为什么快？**
- 开发期原生 ESM 按需编译：请求到哪编译到哪，不整包构建
- 依赖预构建用 esbuild（Go，快一个量级）：CJS 转 ESM + 零散模块合并防瀑布请求
- 生产用 Rollup（Vite 6+ 可选 Rolldown：Rust 版 Rollup，与 esbuild 同作者生态）：成熟 tree-shaking 与产物优化
- 本质：bundleless 开发 vs 全量 bundle——「dev 不打包、build 才打包」的双引擎结构

**Q2：Vite 插件机制？钩子怎么分？**
- 钩子分两类：构建类（resolveId → load → transform，改模块内容）、服务类（config / configureServer / handleHotUpdate）
- 兼容大部分 Rollup 插件钩子（enforce: 'pre'/'post' 控制顺序）

**Q3：HMR 热更新原理？**
- dev server 与浏览器建 WebSocket；文件变化推送模块路径
- 客户端请求该模块最新版本，运行时替换并只重跑受影响边界（vue 组件单文件替换，css 直接换 style 标签）
- 替换失败（改了导出结构等）自动整页刷新兜底
- import.meta.hot API：模块自声明 accept，处理边界（store 模块热替换保持状态）

**Q4：环境变量与模式？**
- .env / .env.development / .env.production 按模式加载；VITE_ 前缀才暴露给客户端——服务端密钥不进前端 bundle 的边界
- import.meta.env 取值；运行时变更配置走后端接口不走构建注入

## 二、Rollup（库打包与 tree-shaking）

**Q5：tree-shaking 原理？**
- 依赖 ESM 静态结构（Rollup 首创）：编译期分析导出引用关系，未引用的导出在压缩阶段删除
- sideEffects 字段标记无副作用模块，防止「有副作用的 import 被误删」；CJS 动态特性摇不动
- 验证方法：analyze-lab 式对照——同一模块改 ESM/CJS 写法看产物体积差

**Q6：Rollup 和 Vite 什么关系？什么时候直接用 Rollup？**
- Vite 生产构建内嵌 Rollup（新版本 Rolldown）；插件钩子互通
- 直接用 Rollup 的场景：打包 npm 库——external 依赖 + 多格式产物（esm/cjs/umd）+ dts 生成，Vite 库模式是它的封装
- CJS 依赖处理：@rollup/plugin-commonjs 把 CJS 转 ESM——「为什么需要它」能讲出 CJS 动态 require 无法静态分析即可

**Q7：external 与 peerDependencies 怎么配合？**
- 库打包把 vue/react 等 external（不打进产物，用方自备）→ package.json 声明 peerDependencies 表达「宿主提供」
- 多格式：esm（现代打包器消费）+ cjs（require 场景）+ exports 字段按条件导出

## 三、产物优化与工程

**Q8：产物优化清单？**
- 分包：路由动态 import + manualChunks（advancedChunks）拆第三方，利用长缓存（内容 hash）
- 按需引入组件库；压缩（esbuild/terser）；小图内联、图片压缩
- 分析工具：rollup-plugin-visualizer 看体积构成再动手

**Q9：构建产物怎么保证质量？**
- 类型检查拆出构建链（dev 不全量 tsc，IDE + 独立 lint 阶段）；体积门禁（插件在生成阶段比对预算超限报错）
- 预览验证：build 后 preview 真实产物跑主流程——「dev 正常 build 白屏」是经典坑（环境变量/动态导入路径差异）

**Q10：Vite 配置里工程规范怎么落地？**
- alias 收敛路径引用；ESLint/Prettier 协作（eslint-config-prettier 防冲突）+ lint-staged + husky pre-commit 卡点
