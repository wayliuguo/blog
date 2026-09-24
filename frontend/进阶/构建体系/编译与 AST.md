# 编译与 AST

## 一、编译器只做三件事

```
源码文本 ──parse──> AST ──transform──> 新 AST ──generate──> 新源码文本
```

- **parse（解析）**：字符串 → 树。先分词（tokenize），再按语法规则组装成树。
- **transform（转换）**：遍历树，增删改节点。这是所有插件干活的阶段。
- **generate（生成）**：树 → 字符串。负责缩进、分号、sourcemap 映射。

关键点：**AST 和源码文本是两份数据**。改了 AST 不会自动同步回文本，必须走 generate。这个常识能省掉很多"我明明改了节点怎么没生效"的困惑。

## 二、AST 长什么样

拿一段最普通的代码看看解析结果：

> 摘自 `./code/build-lab/ast-lab/parse.cjs`（运行：`npm run ast`）

```js
const code = `
const x = 1
function add(a, b = 2) {
  return a + b + x
}
export default add
`

const ast = parse(code, { sourceType: 'module' })
```

实测输出（节选，已去掉位置信息）：

```
---- 程序结构 ----
根节点类型: VariableDeclaration, FunctionDeclaration, ExportDefaultDeclaration

---- 第一个语句的节点（去掉 loc 后）----
{
  "type": "VariableDeclaration",
  "declarations": [
    {
      "type": "VariableDeclarator",
      "id": { "type": "Identifier", "name": "x" },
      "init": { "type": "NumericLiteral", "value": 1 }
    }
  ],
  "kind": "const"
}

---- 遍历：收集所有 Identifier ----
x, add, a, b
```

三个要记住的事实：

1. **顶层是 `Program`，语句在 `program.body` 数组里**——它对应"文件"这个概念。
2. **`type` 决定了一个节点有哪些字段**。`VariableDeclaration` 有 `kind`（const/let/var）和 `declarations`；`NumericLiteral` 有 `value`。查字段靠 [AST 规范](https://github.com/estree/estree)或 astexplorer.net，不靠猜。
3. **`b = 2` 这个默认值没有出现在 Identifier 列表里**——因为它是 `AssignmentPattern` 的 `right`，而 `b` 在 `left`。收集"所有 Identifier"这种朴素遍历会漏掉上下文信息，真实插件要用带路径的遍历器（见第四节）。

## 三、手工遍历 vs 遍历器

先写一个 15 行的朴素遍历，感受一下它能做什么、不能做什么：

> 摘自 `./code/build-lab/ast-lab/parse.cjs`（运行：`npm run ast`）

```js
const names = []
const walk = node => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(walk)
    if (node.type === 'Identifier' && !names.includes(node.name)) names.push(node.name)
    for (const key of Object.keys(node)) {
        if (key === 'loc') continue
        walk(node[key])
    }
}
walk(ast)
```

它只能"看"。要做增删改，需要**路径（Path）**：路径不只是节点，还带着父节点、兄弟节点、作用域和一堆操作方法（`replaceWith` / `remove` / `insertBefore`…）。Babel 的 `traverse` 提供的就是路径。

## 四、transform：改树

一个能立刻理解的转换：**生产环境移除 `console.log`**。

> 摘自 `./code/build-lab/ast-lab/transform.cjs`（运行：`npm run ast`）

```js
traverse(ast, {
    CallExpression(path) {
        const callee = path.node.callee
        const isConsoleLog =
            t.isMemberExpression(callee) &&
            t.isIdentifier(callee.object, { name: 'console' }) &&
            t.isIdentifier(callee.property, { name: 'log' })
        if (!isConsoleLog) return
        hit += 1
        path.replaceWith(t.unaryExpression('void', t.numericLiteral(0)))
    }
})
```

实测输出：

```
---- 命中 console.log 次数 ----
1

---- 生成后的代码 ----
function log(msg) {
  void 0;
}
const n = 1;
```

这里有三个通用套路：

1. **visitor 模式**：`traverse(ast, { 节点类型(path) {} })`，进入对应类型就回调。不需要自己写递归。
2. **类型判断用 `t.isXxx`**：不要写 `callee.object.name === 'console'`，因为 `object` 可能不是 Identifier（比如 `foo.console.log()`）。
3. **构造节点用 `t.xxx()`**：`t.unaryExpression('void', t.numericLiteral(0))` 构造 `void 0`。手写字面量对象也能跑，但缺字段或字段名写错时报错很难懂。

再演示一次"插入"而不是"替换"：

> 摘自 `./code/build-lab/ast-lab/transform.cjs`（运行：`npm run ast`）

```js
traverse(ast2, {
    FunctionDeclaration(path) {
        path.get('body').unshiftContainer(
            'body',
            t.expressionStatement(t.stringLiteral('entered f'))
        )
    }
})
```

输出：

```
---- 插入语句后 ----
function f() {
  "entered f";
  return 1;
}
```

`unshiftContainer('body', ...)` 里的 `'body'` 是**父节点上的字段名**（函数体的语句列表叫 `body`），不是节点类型。这个参数最容易写错。

## 五、写一个真正的 Babel 插件

Babel 插件就是一个函数，返回 `{ name, visitor }`。下面这个插件把 `__DEV__` 在编译期替换成布尔字面量——这是 tree-shaking 的常见前置手段：

> 摘自 `./code/build-lab/ast-lab/custom-plugin.cjs`（运行：`npm run ast:plugin`）

```js
function replaceDevFlag({ types: t }) {
    return {
        name: 'replace-dev-flag',
        visitor: {
            Identifier(path, state) {
                if (path.node.name !== '__DEV__') return
                // 不替换"被赋值的位置"（a.__DEV__ = 1 这种属性名不处理）
                if (path.parentPath.isMemberExpression() && path.parentPath.node.property === path.node) return
                const value = Boolean(state.opts.value)
                path.replaceWith(t.booleanLiteral(value))
            }
        }
    }
}
```

实测输出：

```
---- __DEV__ = true ----
if (true) {
  console.log('debug info');
} else {
  console.log('prod');
}

---- __DEV__ = false ----
if (false) {
  console.log('debug info');
} else {
  console.log('prod');
}
```

`if (false)` 这种死代码会在压缩阶段被整块删掉——这就是"编译期常量 + tree-shaking"的组合拳。`DefinePlugin`（webpack）和 `define`（Vite/Rollup）做的是同一件事。

插件写起来容易，但有两个坑必须知道：

**坑一：替换后会被重新遍历。** `path.replaceWith(newNode)` 之后，Babel 会继续遍历新节点。如果新节点仍然匹配同一个 visitor（比如把 `A` 换成 `A` 的变体），就会无限递归。解法是 `path.skip()` 或用更精确的匹配条件。

**坑二：顺序。** 实测确认的输出：

```
---- 插件与 preset 的执行顺序 ----
"use strict";

var a = [1, 2].map(function (x) {
  return Math.pow(x, 2);
});
```

规则是 **plugins 先于 presets；plugins 按书写顺序；presets 按逆序**。这条决定了"你的插件看到的是转译前的代码还是转译后的代码"——想处理 ES5 之后的产物，就得排在 preset 之后（或用 `passPerPreset`）。

## 六、codemod：批量重构的正确姿势

改几百个文件时，正则替换是灾难。AST 替换和正则替换的差别，实测一眼可见：

> 摘自 `./code/build-lab/ast-lab/codemod.cjs`（运行：`npm run ast:codemod`）

```js
const tricky = 'const s = \'React.createElement("div")\'  // 字符串里长得一模一样'
const re = /React\.createElement/g
console.log('正则替换会误伤字符串:', tricky.replace(re, 'h'))
const { output: safe } = transform(tricky)
console.log('AST 替换不动字符串:', safe)
```

输出：

```
---- 为什么 codemod 不能靠正则 ----
正则替换会误伤字符串: const s = 'h("div")'  // 字符串里长得一模一样
AST 替换不动字符串: const s = 'React.createElement("div")'; // 字符串里长得一模一样
```

字符串、注释、模板字符串里的同名文本，正则一律会改坏；AST 天然只认语法结构。

一个 codemod 的完整流程：

```
1. 找到文件（glob）
2. parse（带上 JSX / TS 等插件，否则解析失败）
3. traverse + 改写，记录改动处数
4. generate（注意 code 风格：缩进、引号、分号会被规范化）
5. 写回文件 + 输出改动统计
6. git diff 人工抽查 → 提交
```

第 4 步有个副作用必须提醒：**generate 会重写整个文件的格式**。这意味着 codemod 的 diff 里会混入大量纯格式变更，掩盖真正的语义改动。解法是先跑一遍项目的格式化器（prettier），让格式基线统一，再跑 codemod。

## 七、Babel 之外的选择

| 工具 | 语言 | 定位 | 何时用 |
| ---- | ---- | ---- | ---- |
| Babel | JS | 插件生态最全，规范支持最快 | 需要自定义转换、需要最新提案 |
| SWC | Rust | 快 10~20 倍，兼容大部分 Babel 配置 | 生产构建提速、Next.js 默认 |
| esbuild | Go | 转换 + 打包一体 | 只做 TS/JSX 转换与降级时 |
| TypeScript | — | 只做类型擦除与语法降级 | 不需要 JSX/提案转换、只要类型检查 |

选型规则很简单：**要自定义 AST 转换 → Babel；只要快和标准降级 → SWC / esbuild**。类型检查永远由 `tsc --noEmit` 负责，不要让转译器兼任——esbuild 和 SWC 都不做类型检查（这是设计取舍，不是缺陷）。

## 八、AST 还能做什么

理解了 AST，下面这些工具就都是"同一件事"：

| 场景 | 建立在 AST 上的做法 |
| ---- | ---- |
| ESLint 自定义规则 | `create(context)` 里注册节点 visitor，命中就 `context.report` |
| 按需引入（`babel-plugin-import`） | 把 `import { Button } from 'antd'` 改写成只引 Button 的子路径 |
| 埋点自动注入 | 在函数体第一行插入埋点调用（第四节那个 `unshiftContainer`） |
| 死代码检测 | 分析引用关系，找出从未被引用的导出 |
| 国际化提取 | 遍历所有字符串字面量，收集成 key |
| 依赖分析 / 循环依赖检测 | 只看 ImportDeclaration 就能建出模块图 |

## 九、Babel API 全景：函数与产物对照

前面八节把三个阶段逐个拆开讲了，这一节收口成四张图，用来定位「某个 API 属于哪一层、产出什么、什么时候该用它」。图中字段与数字均基于 Babel 7.29.x 实测（core 7.29.7、parser 7.29.9、traverse / types / generator 7.29.8），不是抄文档。

**图 1 · 我调用的那些函数，各属于哪一层？**

```
   ┌───────────────────────────────────────────────────────────────────────┐
   │ 入口 A：@babel/core 一步到位（内部依次跑完 ①②③）                      │
   │    transformSync(code, opts)                                          │
   │      → { code, map, ast, metadata, sourceType, options }              │
   │    transformFromAstSync(ast, code, opts)   复用已有 AST，跳过 ①       │
   │    parseSync(code, opts) → File           只解析，不转换              │
   │    transformFileSync(path)                直接从文件读取              │
   │    以上每个都有 Async 版本（transformAsync / parseAsync …）           │
   └───────────────────────────────────────────────────────────────────────┘
   A 内部就是依次跑完下面三步；想自己控制每一步，就用入口 B：

   ┌───────────────────────────────────────────────────────────────────────┐
   │ ① @babel/parser                       文本 → 树（只读，不改代码）     │
   │    parse(code, opts)          → File                                  │  → File
   │    parseExpression(code)      → 单个 Expression（无 Program 层）      │
   │    常用 opts：sourceType:"module" | "script"                          │
   │               plugins:["jsx"|"typescript"|"decorators"]               │
   │               tokens / ranges / includeComments                       │
   └───────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
   ┌───────────────────────────────────────────────────────────────────────┐
   │ ② @babel/traverse                     遍历 + 改树（原地修改）         │
   │    traverse(ast, { 节点类型(path, state) {} })                        │  → 改过的 File
   │    → 无返回值，直接改 ast；要变回文本还得走 ③                         │
   │    path：replaceWith / remove / insertBefore / insertAfter            │
   │          unshiftContainer("父节点字段名", node) / skip / stop         │
   │    scope：hasBinding / rename / generateUidIdentifier                 │
   │    只读替代：types.traverseFast(ast, fn)（无 Path，更快）             │
   └───────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
   ┌───────────────────────────────────────────────────────────────────────┐
   │ ③ @babel/generator                    树 → 文本                       │
   │    generate(ast, opts, code)  → { code, map, rawMappings }            │  → 源码文本
   │    opts：sourceMaps / compact / retainLines / comments                │
   └───────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼  输出：code 字符串（+ 可选 sourcemap）

   ┌───────────────────────────────────────────────────────────────────────┐
   │ 工具层（不占主链，被 ② 调用）                                         │
   │    @babel/types     t.isXxx(node, opts) 判定 / t.assertXxx 断言       │
   │                     t.xxx(...) 构造 / t.cloneNode / t.traverseFast    │
   │                     实测：253 种节点类型 · 321 个 isXxx               │
   │    @babel/template  template(`CODE`)({ ID: node }) → 节点或节点数组   │
   └───────────────────────────────────────────────────────────────────────┘
```

这张图最该记住的一句：**`transformSync` 不是第四个阶段**，它内部就是把 ①②③ 串起来跑一遍。另外 `parse` → `traverse` → `generate` 三件套和 `@babel/core` 是两条并行的入口，不是上下游——你要的是"跑通流程"还是"逐步控制"，决定了走哪条。

**图 2 · parse 出来的到底是什么结构？**

```
File                                ← parse() 的返回值，代表「一个文件」
├─ type: "File"
├─ program: Program ────────────┐
├─ comments[]                   │   注释单独存，不在 body 里
├─ tokens[]                     │   仅 opts.tokens:true 时才有
├─ range                        │   仅 opts.ranges:true 时才有
├─ start / end / loc            │   位置信息，generate 靠它出 sourcemap
└─ errors[]                     │   宽松解析时收集的错误
                                │
                                └─► Program      ← 内容都在这一层
                                    ├─ body[]        顶层语句数组，一条语句一个元素
                                    ├─ directives[]  "use strict" 这类指令
                                    ├─ sourceType    "module" | "script"
                                    ├─ interpreter   #!/usr/bin/env node
                                    └─ start / end / loc

   body[i] 的字段由 type 决定（共 253 种，查 astexplorer.net）
   ├─ VariableDeclaration  { kind: "const", declarations[] }
   ├─ FunctionDeclaration  { id, params[], body, generator, async }
   ├─ ExpressionStatement  { expression }
   └─ … 「Expression」这一个别名下就覆盖 52 种具体类型
```

两个容易踩的点：`parse()` 返回的是 **File 而不是 Program**，真正的语句在 `File.program.body`；`tokens` 与 `range` **默认根本不存在**，必须显式传 `opts.tokens: true` / `opts.ranges: true`（第二节那段示例代码实测会拿到 25 个 token）。

**图 3 · 这个需求该用哪个 API？**

```
你要做什么？
  │
  ├─ 只看结构 / 收集信息，不改动 ────────► parser.parse
                                            + types.traverseFast（只读，最快）
                                            别用 traverse：它会建 Path/Scope，白花钱
  │
  ├─ 要改节点（替换 / 插入 / 删除） ─────► parse → traverse → generate
                                            改了 AST 不会自动变回文本，必须 generate
  │
  ├─ 要跑 preset-env / babel.config ─────► core.transformSync
                                            一条龙：解析 + 插件排序 + 生成
  │
  ├─ 手上已有 AST，只想再转一次 ─────────► core.transformFromAstSync
                                            跳过 ①，直接进 ②
  │
  ├─ 只解析不转换（依赖分析等） ─────────► core.parseSync 或 parser.parse
                                            两者产物字段完全一致，都是 File
  │
  └─ 想写一个可复用的转换 ───────────────► 插件函数 ({ types }) => ({ name, visitor })
                                            塞进 transformSync 的 plugins 数组
```

**图 4 · 拿到 path 之后怎么改？**

```
   ┌────────────────────────────────────────────────────────────────────────────────┐
   │ 替换        path.replaceWith(node) / replaceWithMultiple([a, b])               │
   │ 删除        path.remove()                                                      │
   │ 插入        path.insertBefore / insertAfter                                    │
   │ 插进容器    path.unshiftContainer("body", node)   ← 参数是父节点字段名         │
   │ 用源码替换  path.replaceWithSourceString("a + b")                              │
   │ 控制遍历    path.skip() 跳过子树 / path.stop() 全停 / path.requeue() 重入队    │
   │ 向上查找    path.findParent(fn) / path.getFunctionParent()                     │
   │ 取值        path.get("body") / path.getSibling(0) / path.getSource()           │
   │ 作用域      path.scope.hasBinding() / .rename() / .generateUidIdentifier()     │
   │ 判断与求值  path.isXxx() / path.evaluate() / path.matchesPattern("a.b")        │
   └────────────────────────────────────────────────────────────────────────────────┘
```

图 4 是第四、五节那几个动作的完整清单。其中 `unshiftContainer` 的第一个参数仍是**父节点上的字段名**，不是节点类型——这行最容易写错；`requeue` 则是第五节"坑一"（替换后被重新遍历）的直接来源。

## 配套代码

本篇示例来自 `code/build-lab`（独立的 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/build-lab/ast-lab/parse.cjs` | 解析源码看 AST 结构 + 手写朴素遍历 | 二、AST 长什么样 · 三、手工遍历 |
| `./code/build-lab/ast-lab/transform.cjs` | 替换 console.log、插入语句，演示 generate | 四、transform |
| `./code/build-lab/ast-lab/custom-plugin.cjs` | 手写 Babel 插件：`__DEV__` 编译期替换 | 五、写插件 |
| `./code/build-lab/ast-lab/codemod.cjs` | codemod 批量改写 + 正则误伤对照 | 六、codemod |

运行：`cd code/build-lab && npm install && npm run ast`，再看 `npm run ast:plugin` 与 `npm run ast:codemod`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[构建全景与选型](./构建全景与选型.md)
- 下一篇：[手写 mini-bundler](./手写%20mini-bundler.md)
- [Babel 插件手册](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md)
- [AST Explorer](https://astexplorer.net/)
