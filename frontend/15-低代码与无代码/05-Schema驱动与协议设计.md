# Schema 驱动与协议设计
> 级别：高级

> 本章按四层推进：入门（Schema 驱动的核心价值与三层抽象）→ 进阶（DSL/物料/权限/数据源协议分层）→ 实战（Parser→Compiler→Generator 出码链路与开放协议落地）→ 最小实现（到 `code/frontend/15-lowcode` 运行 `wire-to-code.html`，把一次点击操作转成可复用的 JSON/代码片段）。原理均在本章自足。

低代码/无代码的底层哲学是"Schema 驱动"——业务形态被打包成可解析、可校验、可编译、可跨端复用的描述结构。本章阐发 Schema 驱动的核心价值、协议分层（DSL / 物料 / 权限 / 数据源），并展开 Parser / Compiler / Generator 三步走的工程链路（即"低代码出码"），最后收敛到从搭建到出代码（codegen）与开放协议生态（如 Alibaba 低代码引擎）。这是把前面几章"串成一条可以交付的生产管线"的知识终章。

## 一、Schema 驱动的核心价值

### 1. 为什么是 Schema 而不是直接写代码

- **可解释**：一份 JSON，由统一渲染器/引擎解释，逻辑集中、行为一致。
- **可验证**：Schema 可被 JSON Schema / 类型 / 规则校验，减少运行时错误。
- **可迁移**：低层版本变更可写 migration；跨端（Web/小程序）可重渲染。
- **可出码**：能编译成传统代码，突破前端平台锁定。
- **可协作**：可视化配置自然产出 Schema，纳入版本/权限/审计。

### 2. "Schema 即源码"的三种消费形态

| 消费方式 | 描述 | 典型应用 |
| --- | --- | --- |
| 解释执行 | 运行时引擎直接读 Schema 渲染 | 运行时低代码平台 |
| 编译出码 | 编译成 Vue/React 等代码再部署 | 出码（codegen）平台 |
| 文档/测试 | 由 Schema 自动生成接口/组件文档 | 研发配套 |

一条 Schema，三端消费，正是 Schema 驱动价值最大化的体现（DRY 的元级应用）。

### 3. Schema 的多层抽象

不应只有"页面 Schema"，而应分层（本系列递进的结构化认知）：

```
页面 Schema   —— 页面结构、布局、节点树
业务 Schema   —— 状态、数据流、步骤、权限
元 Schema     —— Schema 自身的版本/类型自描述
```

## 二、协议分层设计

低代码平台不是单个 Schema，而是一组"协议层"协同：

### 1. DSL 层（描述语言）

- 定义"页面长什么样"，即组件树 Schema（component 树 + props + 表达式）。
- 是运行时渲染器与出码生成器最直接的输入。

```json
{
  "version": 4,
  "page": { "component": "Page", "children": [ { "component": "Card", ... } ] }
}
```

### 2. 物料层（Assets 协议）

- 定义物料（组件/区块/模板）如何被描述与注册，含元数据、默认 Schema、能力声明。
- 统一 `MaterialMeta`，作为搭建器与运行时的契约。
- 与 DSL 的关系：DSL 用 `<component>` 引用物料的 registry 名，物料元数据描述其可配置能力。

### 3. 权限层

- 页面/组件级操作权限（可访问、可编辑、可发布）。
- 表达式与数据源访问权限（谁能读某数据源、某 action）。
- 设计态权限（谁能参与搭建/版本管理）与运行态权限（谁能看/操作）分开。

```json
{
  "permission": {
    "page": "READ",
    "edit": ["admin", "designer"],
    "publish": ["admin"],
    "dataSource": {
      "/api/dept/list": { "read": ["*"] },
      "/api/order/delete": { "write": ["admin"] }
    }
  }
}
```

### 4. 数据源层

- 定义页面/表单引用的后端能力：API、变量、字典、mock，以稳定 ID 被业务引用。
- 与渲染器/表达式解耦：表达式不直接写 URL，而是引用 `dataSource` id，便于环境切换与安全管控。

```json
{
  "dataSource": [
    { "id": "deptList", "type": "http", "url": "${ENV.base}/api/dept/list", "method": "get", "params": { "pageSize": 20 } }
  ]
}
```

> 注意：数据源里的 `ENV.base` 占位（见上方示例）属"运行时环境变量占位"（环境替换），与渲染表达式引擎的求值职责不同，应分属两条管线处理——一个做**环境替换**，一个做**运行时求值**，避免混用。

### 5. 分层间关系速览

| 层 | 暴露给谁 | 由谁解释 | 典型字段 |
| --- | --- | --- | --- |
| DSL | 渲染器/出码器 | Runtime/Generator | component 树、props、表达式 |
| 物料 | 搭建器与运行时 | Designer + Registry | MaterialMeta、defaultSchema |
| 权限 | 平台校验器 | 网关/引擎拦截 | role、page/edit/publish |
| 数据源 | 业务表单/页面 | DataReader/Loader | id、type、url、params |

## 三、Parser / Compiler / Generator 三步走

"出码（codegen）"是打破平台锁定的关键技术，它把 Schema 编译成可维护的传统代码（Vue/React/HTML/JS）。整个链路为 **Parser → Compiler → Generator**：

```
                Parser         Compiler        Generator
Schema/模板  ───▶ 中间表示(IR) ───▶ 优化/降级 ───▶  目标代码(Vue/React/...)
    │               │                │                 │
 语法分析      建立语义模型       模板映射          文本代码输出
```

### 1. Parser（解析）

- 输入：页面 Schema（JSON）或原始 DSL。
- 输出：**IR（Intermediate Representation，中间表示）**——归一化的语义节点树，抹平各版本/方言差异。
- 职责：校验 Schema 合法性、前缀解析（组件定位）、作用域建立（节点 id ↔ 上下文）。

```ts
interface IRNode {
  id: string;
  kind: 'component' | 'expression' | 'state' | 'slot';
  ref: { material: string };
  props: Record<string, ExprNode>;
  children: IRNode[];
}
```

### 2. Compiler（编译）

- 输入：IR。
- 输出：目标框架的"模板 AST"或"代码中间对象"。
- 职责：把 IR 映射到 Vue/React 的语法结构，处理表达式、插槽、事件、数据绑定差异；执行优化（常量折叠、dead 节点剔除、bundle 拆分点标注）。

```ts
function compile(ir: IRNode[]): FrameworkAst {
  // IR.component ref -> <component-name>
  // 表达式节点 -> 目标框架表达式（Vue 模板表达式 / React JSX 内联）
  // 插槽 -> Vue <template> / React children
}
```

### 3. Generator（生成）

- 输入：框架 AST 或代码中间对象。
- 输出：可读、可美化的源码文本（`prettier` 化），并尽可能保留可维护性（命名、注释、拆分）。

```ts
function generate(ast: FrameworkAst): string {
  // 产出 .vue 或 .tsx/.ts 内容
  return sourceText;
}
```

### 4. 常见出码目标

| 目标 | 产出 | 适用 |
| --- | --- | --- |
| Vue SFC | `.vue` 单文件 | 企业内 Vue 技术栈 |
| React | `.tsx/.jsx` 组件 | React 技术栈 |
| 原生 HTML/JS | 静态页面 | 营销页、落地页 |
| JSON+运行时 | 不落代码，运行时解释 | 运行时低代码（最快的"出码"等价物） |

> 关键取舍：**"出码 vs 解释执行"**。解释执行改动快、无需构建；出码可脱离平台、可被 Git 治理、可深度 hand-coded，但需要重新构建。成熟平台两者并行，用户按项目阶段选择。

## 四、从搭建到出代码（codegen）

### 1. 完整流水线

```
搭建器(可视化) ──▶ Schema 快照
        │
        ▼
  Parser → IR → Compiler → Generator
        │
        ▼
  目标代码 + 依赖清单(package.json) + 物料资产
        │
        ▼
  Git 提交 / CI 构建 / 部署
```

- 汇编产物还包含：`package.json`（物料依赖）、资源引用、可选的 SSR/水合标记。
- 出码代码保留"模板 + 手写扩展点"注释，允许工程师在产物上二次开发，再做下次出码时合并或 diff。

### 2. 出码可维护性设计

- **命名**：由 Schema 的 name/id 派生组件、变量、文件名。
- **可读**：判断表达式、分支、插槽在产物中保留语义。
- **可回溯**：产物头注释标记来源 Schema 版本/物料版本，便于问题定位与回滚。
- **双写策略**：产物与 Schema 双向关联，schema 改 → 重新出码，手写改动 → diff 保护。

### 3. 出码 vs 运行时解释（决策表）

| 维度 | 解释执行 | 出码 codegen |
| --- | --- | --- |
| 上线速度 | 快（免构建） | 需构建 |
| 可脱离平台 | 否 | 是 |
| Git 治理 | 以 Schema 版本治理 | 产物代码入 Git |
| 深度自定义 | 受平台扩展能力 | 可手写任意代码 |
| 体积/性能 | 依赖运行时 | 可控、可 tree-shake |
| 成本 | 维护运行时 | 维护出码管线 |

## 五、开放协议与生态

### 1. 协议即生态标准

- 开放协议让"内核"与"物料/DSL"解耦，第三方可贡献物料、DSL 插件、出码插件。
- 一套协议 → 多实现（渲染器、出码器、文档生成器）= 生态繁荣。

### 2. Alibaba 低代码引擎（lowcode-engine）

作为开源范本，它清晰切分以下子系统，与本系列四章一一对应：

| 子系统 | 对本章 | 职责 |
| --- | --- | --- |
| 渲染器渲染引擎 | 渲染引擎（第 3 章） | 读 Schema 渲染 | 描述 Schema |
| 设计器 Designer | 可视化搭建（第 4 章） | 搭建态画布与属性 |
| 物料协议 | 协议设计（本章） | 物料元数据与接入 |
| 出码 engine-code-generator | 出码（本章） | Schema → 代码 |

它定义了统一 `Schema`、`component`（低代码组件）/`function`（函数）/`block`/`branch` 指令，以及 `setup/props/expression/loop/condition/slot` 语义，是研究"开放协议+生态"的工业级参考。

### 3. 其它开源/生态件

- **Formily**：表单 Schema 与状态，字段层协议实际标准。
- **Amis**：JSON 配置驱动的富交互渲染器（偏声明式运行时）。
- **JsonSchema / JSONPatch**：作为校验与增量更新协议被普遍引入。
- **openapi / graphql schema**：作为数据源定义协议衔接后端。

### 4. 设计自有开放协议的 Checklist

1. 划分 DSL / 物料 / 权限 / 数据源四层，避免"一个 Schema 扛所有"。
2. 带版本号，提供 migration。
3. 前缀命名扩展键（`x-*`），兼容标准校验器。
4. 表达式与数据源引用职责分离（求值 vs 环境替换 + 安全）。
5. 提供文本/NPM/服务三种接入路径，降低生态门槛。

## 六、总收束：本系列五章的关系

```
01 概览（认知与形态）
02 表单引擎（微型 Schema 内核）
03 渲染引擎与运行时（Schema → 组件树 → DOM）
04 可视化搭建（把 Schema 生成交给拖拽）
05 Schema 驱动与协议设计（把全链路协议化 + 出码）
```

五章环环相扣：先建立 "Schema 即源码" 心智能，再用表单引擎落地最小实现，进而升级为通用渲染引擎，叠加搭建器提升生产力，最后以协议设计与出码闭环交付。这也是求职者把"低代码/无代码"讲成完整工程能力的最佳叙事路径。

## 七、最小实现：Demo 掌握原理

在 `code/frontend/15-lowcode` 里 `node server.js` 后打开 `wire-to-code.html`：把你"加一个按钮，并让它点击时提示 hello"这类操作录入，页面即产出一段标准的 Schema/代码片段。原理一句话：出码 = "把语义操作归一成 DSL → 映射成目标代码"，这份 demo 就是 Parser→Compiler→Generator 最小剪影，帮你直观理解"配置到源码"的桥梁。

## 面试衔接

本节对应 `90-附录-面试体系` 的低代码板块（高级 122-124）与场景 E（搭建一个低代码渲染引擎）：协议分层、出码与解释执行的取舍。做真题自测后，回顾本系列 `01-05` 五章即可把"低代码/无代码"讲成完整工程能力。