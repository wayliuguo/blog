# tech-solution

## 定位

`tech-solution` 是一个**技术方案生成 skill**：把任意形式的需求信息（需求文档 / 工单 / 一段口头描述）转成一份能直接进评审的技术方案——8 章 markdown 正文 + 可校验的架构图与泳道流程图 + 可反向追溯的验收条目。

前端、后端、全栈、客户端都适用；不绑定具体项目，也不预设技术域——语言与框架、目录结构、功能入口、兼容性基线、产出位置，全部靠现场勘察得到。

它的结构可以概括为：**一道澄清门禁 + 一次真实代码勘察 + 一套强校验的图 + 一份结构固定的文档**。

## 文件结构

```
tech-solution/
├── SKILL.md                     主入口：6 条铁律 + 8 步工作流 + 交付前自检清单
├── references/
│   ├── requirement-spec.md      需求澄清方法论 + spec 模板 + 完整度门禁
│   ├── doc-template.md          8 章文档模板 + 固定项速查
│   └── diagram-authoring.md     archify 授权指南 + 字段白名单 + 实测踩坑
└── scripts/
    └── render-diagrams.mjs      批量 validate → deliver → 干净 PNG + manifest
```

五份文件按"什么时候会被读到"分工，主入口只在对应步骤给一句"动笔前先读它"：

| 文件 | 角色 | 读的时机 |
| --- | --- | --- |
| `SKILL.md` | 总入口：铁律、工作流、产物结构、自检 | 始终 |
| `references/requirement-spec.md` | 把需求钉死的方法论 | 第 2 步澄清之前 |
| `references/doc-template.md` | 文档长什么样、哪些位置不许改 | 第 5 步写文档之前 |
| `references/diagram-authoring.md` | 图怎么写规格、为什么会校验失败 | 第 4 步写图规格之前 |
| `scripts/render-diagrams.mjs` | 批量出图 | 第 6 步渲染图并嵌入 |

---

## SKILL.md

**说明**：总入口文件。定下 6 条不可协商的铁律（默认只出方案不落地、需求先钉死、改动点落到真实文件、图用 archify、工程信息现场探、不确定标待确认），以及 8 步工作流：轻量勘察 → 需求澄清落 spec → 深度勘察 → 图形设计 → 写文档 → 渲染图 → 自检 →（可选）落地实现。文末给出产物目录结构与交付前自检清单。

````
---
name: tech-solution
description: 为任意工程生成可评审的技术方案文档，前端 / 后端 / 全栈 / 客户端皆适用。当用户说「生成技术方案」「写个技术方案」「需求技术方案」「改动方案」「改动评估」「出个方案」，或给出需求信息（需求文档 / Tapd 单 / 需求要点）并要求产出技术方案时使用；也适用于方案定稿后用户要求「按方案实现 / 照着改 / 落地代码」的实施阶段。流程为：需求澄清并落一份 spec 供确认 → 勘察工程代码 → 产出 8 章 markdown 技术方案 → 用 archify 生成可校验的架构图与泳道流程图（干净 PNG 内嵌 + 可交互 HTML 链接）→（可选）按方案逐仓落地并逐仓验证、把实现偏差回写方案。工程信息与技术域一律现场勘察，不预设。
agent_created: true
---

# 技术方案生成

把用户给的需求信息（下文统称 **X**）转成一份能直接进评审的技术方案。

**前端、后端、全栈、客户端都适用。** 不绑定具体项目，也不预设技术域——语言与框架、目录结构、功能入口、兼容性基线、产出位置，全部靠现场勘察得到。

## 铁律

1. **默认只出方案，不落地代码。** 方案里可以贴"改动后长什么样"的关键代码片段，但不写进源码目录。**例外**：方案交付后用户明确说「按方案实现 / 照着改吧 / 落地一下」，则进第 8 步实施；实施的前提是方案本身已经定稿。
2. **需求先钉死再动笔。** 澄清 → 落 spec → **用户确认** → 才开始写方案。门禁不可跳过，见第 2 步。
3. **改动点必须落到真实文件。** 每个改动点给出实际路径、类 / 方法 / 函数 / 字段名，并说明是本次读到的。找不到就写找不到，不要编。
4. **图必须用 archify 生成并过校验。** 不用 mermaid，不用手写 SVG。见 `references/diagram-authoring.md`。
5. **工程信息现场探，不预设。** 不假设语言、框架、技术域、目录结构，也不假设"这个功能在这个仓"。每个结论都要能指回具体文件。
6. **不确定的信息标 `[待确认]`**，不要用看似合理的细节填空；并在最终回复里说明各待确认项的风险。

## 工作流

### 第 1 步 · 轻量勘察

目标是在动笔前对工程有个准头，产出 **3~5 行结论**，不展开成文档。按顺序搞清楚：

1. **这是什么工程**——语言、框架、构建与运行方式、依赖管理。读工程清单文件，实际存在哪个就读哪个（`package.json`、`pom.xml`、`build.gradle`、`go.mod`、`requirements.txt`、`pyproject.toml`、`Cargo.toml`、`*.csproj`…）。多模块 / 多包 / 多服务的仓库先摸清边界与调用关系。
2. **功能是怎么组织的**——找到路由、服务注册、模块划分、任务调度的**唯一权威来源**（前端常见路由配置、多页注册表、约定式目录；后端常见服务注册表、控制器与路由表、启动入口、中间件链）。同一件事在多处有配置时，先判清哪个真正生效。
3. **改动落点属于谁**——在本仓能搜到，还是属于另一个仓 / 服务 / 包。本机没签出的标 `[待确认]`。
4. **仓库里已有什么约定**——扫一遍仓库根与相关目录，看有没有团队已经定下来的东西：说明文档（README、CONTRIBUTING、docs/…）、面向 AI 的指令文件、编辑器与 CI / lint 配置、需求与设计相关的目录、已有的同类方案。**按内容判断，不要只认固定文件名。**

这一步只解决"我现在知道自己在哪个工程里"，细节留给第 3 步。

### 第 2 步 · 需求澄清 → 落 spec → 用户确认（门禁）

**完整方法论与模板在 `references/requirement-spec.md`，动笔前先读它。** 要点：

1. **先查这个需求有没有现成的规格文档**（`specs/`、`docs/`、历史方案目录，按需求名、关键词及其同义写法搜一遍）。已有就**复用或增量更新那一份**，不要另起造重复；若口径已被后续文档改过，在新的 spec 里写明版本关系（哪个是当前生效的）。
2. **内部做覆盖度扫描**（9 类：目标与场景 / 范围边界 / 入口与落点 / 流程与状态 / 数据与字段 / 兼容与多端 / 性能与容量 / 安全与合规 / 可测与可回滚），标出 `Clear` / `Partial` / `Missing`。**这张表不输出给用户**，它决定问什么。
3. **只问高影响的项**，用 `AskUserQuestion` 分批问，**两批为限**（单批 ≤4 题）。每题把推荐项放第一个、标「（推荐）」并给一句理由——用户能直接采纳是关键。
4. **不问实现细节，不问仓库里能查到的信息**（目录、路径、框架版本、现有写法自己去看）。
5. **落 spec 文件**，把答案逐条回写，保留「澄清记录」的 `Q: → A:` 会话日志，未解项进「待确认清单」。
6. **把 spec 给用户确认**，确认后才进入第 3 步。

用户明确说"你先出，缺的标待确认"时跳过门禁，但 spec 仍要产出，并在最终回复里逐条说明待确认项的风险。

### 第 3 步 · 深度勘察

按 spec 的改动清单，**逐条读代码**定位落点：

1. 每个改动点映射到真实文件 + 类 / 方法 / 函数 / 字段名。**这一步的产出是第 4 步的输入**——图上每个节点都要对得上代码里的真实名字。
2. 读清改动所在的那条链路：从入口到结果，把**条件分支、状态流转、并发与重试、异常出口**都摸清。前端通常是初始化请求 / 状态管理 / 轮询监听 / 交互互斥；后端通常是接口与任务入口 / 参数校验 / 业务编排 / 事务与并发 / 缓存与重试 / 错误码。**按工程实际来，不要套模板。**
3. 挖隐式约定（请求与序列化封装、依赖注入与配置开关、单位与精度换算、资源释放与销毁时机、日志与埋点、幂等与锁），这些是易错点 checklist 的素材。
4. **跨仓 / 跨服务**：本机没签出的仓库或依赖，改动点标 `[待确认]` 并写明需要哪个仓的访问权限，不要凭空描述其实现。
5. **需求描述与代码现状冲突时，先如实报告再动笔。** 常见两种：改动点对应的代码**已经存在**（需求可能已落地，或基线里已有半成品）、实现形态与需求描述**不一致**（如需求说新建模块，仓库里其实已有等价实现）。这两种情况都先向用户确认口径，不要照着需求原文写出一份与仓库现状不符的方案。
6. 勘察结论在对话里用 **3~5 行小结**带过即可（技术栈、入口的权威来源、改动落点、产出目录），**不需要单独出勘察文档**。发现值得长期记的约定，顺手写进项目记忆。

### 第 4 步 · 图形设计

先按表决定每张图的类型，再写规格：

| 章节 | 图 | archify 类型 |
| --- | --- | --- |
| 2.2 流程视角 | 每场景，改动前 / 改动后各一张 | `workflow`（带泳道） |
| 2.3 架构视角 | 架构改动图 | `architecture` |
| 3 关键实现（可选） | 局部调用链 / 状态流转 | `sequence` / `lifecycle` |

硬性约定：

- **改动前 / 改动后成对出现**，两张图的节点 `id` 与 `label` 必须一致，方便对照。
- **本次改动要能被一眼看出**：`workflow` 给节点加 `tag`（如 `本次新增`、`本次改动`），并用 `groups` / `phases` 的 `emphasis` 框住改动区域；`architecture` 给相关连线加 `variant: "emphasis"` 并给节点加 `tag`。
- 泳道按工程的参与方划分（入口 / 交互、服务 / 接口、数据层、中间件、第三方、异常兜底…），不必是"人"或"页面"。
- 密度预算：单图 ≤ 6 列、≤ 12 个主节点。**一条泳道内可用 `yOffset` 纵向堆叠多节点**，长流程优先堆叠，堆不下就按场景拆成多张图，不要硬塞。
- 规格 JSON 存到方案资产目录（见「产物结构」），再跑渲染脚本出图。

字段白名单、实测踩坑与修复套路全在 `references/diagram-authoring.md`——**写规格前先读它**。

### 第 5 步 · 写文档

按 `references/doc-template.md` 的 8 章结构输出。文档头两行：

```markdown
需求信息：<需求来源与标识，如 Tapd 单号 / 需求文档链接 / 需求名称与出处>
相关文档：<产品文档 / 设计稿 / 接口文档 / 参考实现链接>
```

`需求信息` 只要求**能把需求追溯到源头**，形式不限——工单号、需求文档链接、邮件或会议纪要标题都行；来源不成文时写清是谁在什么时候提的。`相关文档` 没有时整行不出现。第 3 章的每条改动点**标注它满足的 spec 条目**（`AC-###`），让方案与 spec 可互相追溯。

落到 `<产出目录>/YYYYMMDD-需求名称.md`。产出目录默认仓库根下的 `technical_solution/`；仓库里已有既定目录就沿用（后端工程也可能叫 `design/`、`docs/design/` 等，以仓库现状为准）。命名规则：年月日取**系统当日日期**（用命令取，不要自己推算），需求名称取 X。

### 第 6 步 · 渲染图并嵌入

```bash
node scripts/render-diagrams.mjs \
     --dir  <产出目录>/assets/<方案名>/specs \
     --out  <产出目录>/assets/<方案名>
```

脚本会自动探测 archify 与 Chrome 的位置。

脚本对每份规格依次做 `validate → deliver → 出干净 PNG`，并写 `manifest.json`。任一规格校验失败**不会中断其余规格**，退出码为 1 并打印带诊断码的修复提示——按提示修完重跑，直到全绿。

md 里每张图**图 + 链接**成对出现：

```markdown
![场景一改动后流程](./assets/20260918-需求名称/02-流程-场景一-改动后.png)

> 交互版（可缩放 / 明暗主题）：[02-流程-场景一-改动后.html](./assets/20260918-需求名称/02-流程-场景一-改动后.html)
```

### 第 7 步 · 自检

交付前逐条过。**任何一条不满足就修，不要带着问题交付**：

- [ ] spec 已落盘且经用户确认（或用户明确跳过，且待确认项已逐条说明风险）
- [ ] 工程信息全部来自本次勘察，没有凭空假设的语言 / 框架 / 目录 / 技术域
- [ ] 8 章齐全，章节编号与 `doc-template.md` 一致
- [ ] **易错点 checklist 存在且条目具体到字段 / 方法 / 时机**（不是空话）
- [ ] 2.1 表格「截图」「备注」两列为空
- [ ] 每个改动点都有真实文件路径，且路径在仓库中确实存在
- [ ] 改动点标了对应的 spec 条目（`AC-###`）
- [ ] 改动前 / 改动后图成对，节点命名一致，改动处有 `tag` 或 `emphasis` 标注
- [ ] 所有规格 `validate` 通过（`manifest.json` 里 `failed: 0`）
- [ ] md 中每个图引用路径都能解析到实际 PNG / HTML 文件
- [ ] 若方案附了自绘 HTML（设计稿板 / 原型），已用 Chrome 无头**放大目视**过：带入场动画的页面必须加 `--virtual-time-budget`，否则延时元素停在 `opacity: 0`、看着像缺块；画面无断行、无过度声明（标题写的状态数 / 主题数要对得上实际屏数）
- [ ] 风险三节（兼容性 / 安全 / 性能）无遗漏，没有的写了「暂无」+ 理由
- [ ] 5.1 / 5.2 / 8 的表格按模板保留空行，未擅自填充
- [ ] 若已进入实施阶段（第 8 步）：各仓验证到了什么程度、实现偏差是否已全部回写方案对应章节（改动点表 / 踩坑 / 自检清单），以及既有失败是否已点名

### 第 8 步 · 按方案落地实现（可选，用户明确要求时才做）

方案定稿后用户说「按方案实现」时进入。**方案仍是唯一权威**——实现顺着方案走，不即兴扩大范围。

1. **开实施清单**：把方案第 3 章改动点表逐行拆成任务（一仓一组），方案 §8.1 的易错点 checklist 直接当实现的验收项，别另造一份。
2. **逐仓实施**。同一文件的多处修改**必须串行**逐个改，不要一批并行发出（多个编辑各基于旧内容替换后写盘，只有最后一个生效，前面的静默丢失且不报错）。
3. **逐仓验证，先探清那个仓有什么**：有测试框架就跑全量测试（`jest` / `vitest` / `pytest`…），没有测试框架的仓只能 `tsc -b` / `build` 兜底——**这不算缺陷，但要在交付说明里讲清"验证到什么程度"**。任何仓都不能只"看起来对"就交付。
4. **给关键结论做反证，不要口头声明**。方案里点名的硬性前置（类型增强、构建配置、顺序依赖），实施后用**删掉看会报几个错 / 换个顺序看会不会挂**的方式实测一次，把实测结果写回方案对应章节。实测得出的结论和推演得出的结论，可信度不是一个量级。
5. **实现与方案出现偏差时：以代码为准，同时把方案改回来**。偏差通常来自方案写作时的乐观假设（漏算一个调用方、漏算一个已存在的工具函数）。**不要默默按代码改完就完事**——把偏差回写进方案对应章节（改动点表补行、踩坑补条目、自检清单补项），让文档与代码最终一致。
6. **顺手清掉重构遗留物**。重构把某个分支 / 读点删掉后，配套的 flag、状态位、常量常变成**只写不读**的死代码——搜索它的所有引用，只剩写入的就删掉。这类残留不会被编译器和 lint 抓到，只能靠人搜。
7. **自绘 HTML 产物（设计稿 / 原型）要与实现同步改**。实现中修掉的样式 bug，回头把设计稿 HTML 也改成一样的值，否则设计稿变成误导下一轮人的假基线。
8. **跑全量测试时区分「本次引入的失败」与「既有失败」**。出现失败先判归属：切到干净基线 / 另一 worktree 跑同一用例，或在改动前先跑一遍留底。**既有失败不在本次范围内，不要顺手改**，但在交付说明里点名，避免被误认为是本次引入的。
9. **不主动提交**。改完把三仓（或各模块）的改动面列清楚（文件数、新增 / 修改），等用户决定是否 commit。临时验证脚本放到仓库外，别在仓库里留未跟踪文件。
10. **交付说明要含**：每仓改了什么 / 验证到什么程度 / 有哪些偏差回写了方案 / 哪些是既有问题未处理。

## 产物结构

```
<产出目录>/
├── YYYYMMDD-需求名称.spec.md        ← 需求规格（第 2 步产出，确认后才动笔）
├── YYYYMMDD-需求名称.md             ← 技术方案（交付物）
├── YYYYMMDD-<主题>设计稿.html       ← 可选：自绘的界面设计稿板（如本次会话失效页）
└── assets/
    └── YYYYMMDD-需求名称/
        ├── specs/                    ← archify 图形规格（改图只改这里）
        │   ├── 01-架构-改动后.json
        │   ├── 02-流程-场景一-改动前.json
        │   └── 02-流程-场景一-改动后.json
        ├── 01-架构-改动后.png        ← md 内嵌
        ├── 01-架构-改动后.html       ← md 链接（交互版）
        ├── 02-流程-场景一-改动前.png
        ├── 02-流程-场景一-改动前.html
        └── manifest.json             ← 校验结果与产物清单
```

自绘 HTML（设计稿板）是**可选产物**，只在需求含界面改动、且用户要求独立设计时产出；它由 `frontend-design` skill 的设计流程生成，只放根级、不进 `assets/`（它是文档的说明性附件，不是图）。

> **两个 "spec" 含义不同**：根级的 `<方案名>.spec.md` 是**需求规格**；`assets/<方案名>/specs/` 是**archify 图形规格**。别混。

`.html` 单份约 700KB，自包含、可离线打开。**规格 JSON 是唯一源头**——要改图只改 `specs/` 下的 JSON 再重跑脚本，不要手改 HTML 或 PNG。

> **仓库体积**：一个需求若有 6 张图，HTML 合计约 4MB。若产出目录被 git 跟踪，长期累积会让仓库变大。团队只关心"能看能改"的话，可以在该目录的 `.gitignore` 里加 `assets/**/*.html`——PNG（能看）与 JSON（能改）保留即可，HTML 需要时随时重跑脚本生成。

## 参考

- `references/requirement-spec.md` —— 需求澄清方法论、覆盖度分类学、提问纪律、spec 模板
- `references/doc-template.md` —— 8 章文档模板、固定表格与固定项速查
- `references/diagram-authoring.md` —— archify 规格授权指南、字段白名单、实测踩坑与修复套路
````

---

## requirement-spec.md

**说明**：需求澄清方法论。解决"在没锁定需求边界时就动笔"这一返工头号原因。规定"动笔前把需求钉死"的流程与产物——spec 文件。含：先查现成规格避免重复、9 类覆盖度扫描（内部用，不输出给用户）、思维工具箱（5W2H / 5Whys / JTBD / Kano / MoSCoW / 反例排除法 / Given-When-Then）、提问纪律、完整 spec 模板、回写纪律、完整度门禁 6 条、反模式清单。

````
# 需求澄清与规格（spec）

技术方案的返工，绝大多数不是写错了，而是**在没锁定需求边界时就动笔**。这一页规定的就是"动笔前把需求钉死"的流程，以及钉死的产物——**spec 文件**。

## spec 与技术方案的分工

| | spec（需求规格） | 技术方案 |
| --- | --- | --- |
| 回答 | **做什么、做到什么程度、不做什么** | **怎么改、改哪里、有什么风险** |
| 视角 | 用户 / 产品 / 验收 | 工程 / 代码 / 排期 |
| 谁看 | 产品、测试、上下游对齐口径 | 研发评审、开发 |
| 变了怎么办 | 需求变更 → 改 spec 并留痕 | 需求没变就不该改 |

**spec 必须先落盘、先被用户确认，才能开始写方案。** 方案第 3 章的每条改动点要能反向追溯到 spec 的验收条目（`AC-###`）。

---

## 第 0 步 · 先查有没有现成的

不要一上来就问问题，也不要先想着新建文件。

先在仓库里搜一遍这个需求**是不是已经有规格文档或同类方案**——`specs/`、`docs/`、历史方案目录、需求相关的 md 文件，按需求名、关键词及其同义写法各搜一轮。

| 搜到的情况 | 怎么做 |
| --- | --- |
| **已有同需求的规格文档** | **复用它做增量更新**：在它的「澄清记录」里新增一个 Session，不要另起一份造重复 |
| **已有同需求的方案文档** | 先读它，判断本次是「在原方案上增量修改」还是「新需求」；口径与它不一致时，在新 spec 头部写明版本关系与谁生效 |
| **只有相关但不相同的需求文档** | 作为背景读进来，用内置模板新落一份 |
| 都没有 | 用内置模板新落一份 |

**落点**：与最终的技术方案文档**同级、同日期前缀**，成对出现。产出目录沿用仓库里已有的方案目录（没有就建 `technical_solution/`）：

```markdown
technical_solution/
├── 20260918-需求名称.spec.md   ← 需求规格（先产出，被确认后才动笔）
└── 20260918-需求名称.md        ← 技术方案
```

---

## 第 1 步 · 覆盖度扫描（内部做，不输出）

通读 X（需求描述 / 单号 / 产品文档），按下面 9 类逐项标记 `Clear` / `Partial` / `Missing`。**这张表决定问什么、不问什么**，不要把它原样贴给用户。

| # | 类别 | 要判定的 | 何时算 Clear |
| --- | --- | --- | --- |
| 1 | 目标与场景 | 核心用户目标、成功标准 | 能说出"谁因为什么变化获得什么" |
| 2 | 范围边界 | 明确不做的事、是否分期、灰度还是全量 | 有显式的 Out of Scope |
| 3 | 入口与落点 | 涉及哪些入口（页面 / 接口 / 任务 / 消息消费）、来源、**属于哪个仓库或服务** | 每个入口都能指到真实路径或明确的服务 |
| 4 | 流程与状态 | 关键路径、分支、加载/空/错误态、并发与重试 | 异常分叉有明确归宿 |
| 5 | 数据与字段 | 接口、字段名、枚举、**单位**、优先级、生命周期 | 新增字段的值域与时机明确 |
| 6 | 兼容与多端 | 前端看浏览器/机型/WebView/暗黑/国际化；后端看调用方版本、协议与数据格式兼容、上下游灰度顺序 | 与项目基线对齐或显式放宽 |
| 7 | 性能与容量 | 请求次数与频率、数据量与并发、首屏/耗时、资源占用 | 有可比较的量化目标 |
| 8 | 安全与合规 | 参数校验、注入面、敏感信息、越权面、埋点合规 | 新增输入/输出都想过一遍 |
| 9 | 可测与可回滚 | 验收标准可测性、回滚开关、监控指标 | 每条验收都能 Given/When/Then |

对每个 `Partial` / `Missing` 再问一句：**这个答案会不会改变方案结构或验收标准？** 不会就内部记下"留到写方案时按项目惯例决定"，别浪费用户一次回答。

### 扫描时用的思维工具

方法不用摆给用户看，是**自己想清楚**用的。按缺失的类别挑一把：

| 工具 | 什么时候用 | 逼出什么 |
| --- | --- | --- |
| **5W2H** | 场景整体模糊（What/Why/Who/When/Where/How/How much） | 把"优化一下"拆成可回答的具体缺口 |
| **5Whys** | 需求像是"拍出来的"，说不清收益 | 真实动机；动机不成立时当场提出质疑 |
| **JTBD** | 需求以功能形式给出（"加个弹窗""加个开关"） | 用户要完成的**任务**——往往有更省事的方案 |
| **Kano** | 优先级吵不清 | 基本型 / 期望型 / 兴奋型：基本型做不好会挨骂，兴奋型可以砍 |
| **MoSCoW** | 范围要划界 | Must / Should / Could / Won't ——直接产出 spec 的范围两节 |
| **反例排除法** | 规则型需求（判定、路由、灰度、权限） | **"什么情况下这条不该生效"**——边界往往藏在这里 |
| **Given/When/Then** | 写验收 | 把模糊描述压成可测条目，写不出 Then 就是还没澄清完 |

---

## 第 2 步 · 提问纪律

1. **一次一批，最多两批。** 用 `AskUserQuestion` 单次最多问 4 题；两批共 ≤8 题。批次之间允许因上一批答案产生新歧义而追加，但**不要变成一轮一问的挤牙膏**。
2. **每题必须带推荐项 + 理由**，把推荐项排在第一个，标签末尾加「（推荐）」。用户可以直接采纳而不思考——这是收敛的关键：
   - 推荐要有依据：项目现状、同类实现惯例、风险最小、与已确认信息一致。
   - 例：`复用 queryPaymentState 轮询（推荐）—— 接口已存在，无需后端排期，风险最低`
3. **只问高影响项。** 优先级 = 影响面 × 不确定度。宁可一题问穿一个要害（如灰度策略），也不要问三个无关痛痒的细节。
4. **不问实现细节。** 「用哪个 API」「变量叫什么」「放在哪个目录」不是澄清，是写方案时的事。
5. **不问已知项。** X 里已经写清、或仓库里能查到的（目录、路径、技术栈版本、现有写法）自己去看，不要问用户。
6. **选项要互斥且穷尽**，最多 5 个；无法枚举时给"其他（自行补充）"，让用户填。
7. **用户可以说"你先出，缺的标待确认"**——这时跳过门禁，全文用 `[待确认]` 标注并汇总到 spec 的「待确认清单」。但要在最终回复里明确列出未确认项**各自的风险**。

---

## 第 3 步 · 落 spec

### 模板

```markdown
# 需求规格：<需求名称>

需求信息：<需求来源与标识，如 Tapd 单号 / 需求文档链接 / 提出人与时间>
相关文档：<产品文档 / 设计稿 / 接口文档 / 参考实现链接>
创建：<YYYY-MM-DD>
状态：已澄清 / 部分待确认

## 1、背景与目标

<为什么做，做完用户/业务上得到什么。2~4 句，不写实现。>

## 2、范围

### 2.1 范围内
- <逐条列>

### 2.2 明确不做（Out of Scope）
- <逐条列，没有就写「无」，不要省略这一节>

## 3、涉及范围与改动清单

| 仓库 / 服务 | 模块 / 页面 / 接口 | 入口路径 | 层级改动内容 |
| --- | --- | --- | --- |
| <仓名> | <页面 / 模块 / 接口> | <真实文件路径或接口路径> | 1、A功能优化 1.1、B逻辑更改 |

改动内容**带层级编号**，与技术方案第 3 章同构，方案直接照搬这套编号。

## 4、用户场景与验收标准

### US-1 <场景名>（P1）
<用平实语言描述用户旅程>
- **AC-001** Given <前置> When <动作> Then <可观察结果>
- **AC-002** Given <前置> When <动作> Then <可观察结果>

### US-2 <场景名>（P2）
- **AC-003** Given … When … Then …

每个场景要能**独立验收**；标 P1/P2 表示优先级。

## 5、关键实体与字段

| 实体 / 字段 | 含义 | 值域 / 单位 | 来源 | 备注 |
| --- | --- | --- | --- |

单位未定的必须列出并标记（ms/s、分/元、百分比/小数）。

## 6、边界与异常场景

- <边界条件、错误态、空态、并发、重复提交、超时、弱网、部分失败…>

## 7、非功能要求

- **兼容性**：<与项目基线的关系，或显式放宽>
- **性能**：<量化目标，如"轮询间隔 ≥2s，单次请求 <300ms">
- **安全**：<新增输入校验、敏感信息、注入与越权面、埋点合规>
- **埋点 / 监控**：<新增或变更的埋点、要看的指标>

## 8、术语表

| 名词 | 定义 | 出处 |
| --- | --- |

## 9、待确认清单

| # | 待确认项 | 影响面 | 谁来定 | 卡点 |
| --- | --- | --- | --- |

## 澄清记录

### Session <YYYY-MM-DD>

- Q: <问题> → A: <答案>
- Q: <问题> → A: <答案>
```

### 回写纪律

- **每得到一个答案就回写**（不是最后一次性补），并同步去掉被它解决掉的 `[待确认]`。
- 答案与既有内容冲突时**替换原文**，不要两处并存留下自相矛盾的描述。
- 「澄清记录」一节是**追加式**的：同一需求二次澄清时新增 `### Session <新日期>`，保留历史会话——需求口径的变化过程本身有价值。
- `AC-###` 编号**一旦分配就不再改号**，删除的条目保留编号空缺。技术方案与测试用例都靠它对齐。

---

## 第 4 步 · 完整度门禁（交给用户确认前自检）

spec 是后面所有工作的地基，**下面 6 条不过就不要拿去确认**——带着洞的 spec 一旦被确认，返工只是被推后到写方案的时候：

- [ ] **目标可复述**：能用一句话说清"谁因为什么变化得到什么"
- [ ] **范围有边界**：2.2「明确不做」非空（可以是「无」，但不能没有这一节）
- [ ] **场景可验收**：每条 `AC` 都写成了 Given/When/Then，且能被独立执行
- [ ] **改动有层级**：第 3 章清单的层级编号与技术方案第 3 章同构
- [ ] **字段有值域**：新增字段都写了值域 + 单位 + 来源；定不下来的已进「待确认清单」
- [ ] **待确认有主**：每条待确认都写了「谁来定」和「卡什么」

任一条不达标 → 回第 2 步补问；确实问不出来的，**显式写进「待确认清单」**，不要用看似合理的细节填空。

---

## 反模式

- ❌ 把 spec 写成技术方案的缩水版（开始写怎么改、改哪个文件）——那是方案的事。
- ❌ spec 里只有"优化体验""提升转化"这类无法验收的描述——每条都要能落成 Given/When/Then。
- ❌ 澄清做完但不落盘，答案只留在对话里——下一轮对话就丢了，方案改起来无据可依。
- ❌ 用户确认 spec 前就开始写方案——这是返工的头号原因。
````

---

## doc-template.md

**说明**：技术方案 8 章模板与固定项速查。章节标题、编号与表格列名**不许改**——历史方案的评审习惯依赖这套结构。与技术域相关的措辞按工程实际取值，但编号与层级结构不动。文末一张「固定项速查」表点明哪些位置必须保持原样：文档头两行、2.1 的空列、5.1/5.2/8 只留表头、6.1/7.1 固定斜体提示、6.2/7.2 固定标签行、8.1 必须非空、章节标题顿号写法。

````
# 技术方案文档模板

固定 8 章。章节标题、编号与表格列名**不要改**——历史方案的评审习惯依赖这套结构。

与技术域相关的措辞（第 4 章标题、个别固定标签）按工程实际取值，**编号与层级结构不动**。下文凡出现 `<技术域>` 的地方，前端工程写「前端」，后端/服务端工程写「后端」，客户端写「客户端」。

---

## 文档头

```markdown
需求信息：<需求来源与标识>
相关文档：<产品文档 / 设计稿 / 接口文档 / 参考实现链接>
```

- `需求信息` 的作用是**让方案能追溯到需求源头**，形式不限：Tapd 单号、需求文档链接、PRD 标题、邮件或会议纪要标题都可以。来源不成文时写清是谁在什么时候提的（如 `需求信息：<姓名> 于 2026-09-18 在需求群提出，暂无工单`）。
- `相关文档` 没有时整行不出现。

---

## 1、名称解析

固定输出这个结构：

```markdown
适用的场景：
- 新增业务名词：<列出来，没有就写「无」>
- 新增系统名词：<列出来，没有就写「无」>

主要内容：
- 新增名词定义：<逐条定义，每条一句话说清它是什么、在什么时机出现>
- 适当补充：用例图或实体图（与产品\后台方案达成一致）
```

`新增名词定义` 只解释**名词**，不要混进方案细节。`适当补充` 这一行是**提示位**——需要用例图 / 实体图 / ER 图时在这里说明与产品、后台已对齐的口径；不需要时保留该行并注明「本需求无新增名词，无需补充」。

---

## 2、整体流程、架构改动评估

### 2.1、改动点说明

固定用这张表。**「截图」和「备注」两列必须留空**（评审时人工填）：

```markdown
| 模块 | 功能点 | 改动点 | 截图 | 备注 |
| ---- | ---- | ---- | ---- | ---- |
|      |      |      |      |      |
```

`模块` 填页面 / 组件 / 服务 / 模块名，`功能点` 填该模块下的具体能力，`改动点` 写清楚**改前是什么、改后是什么**。一个改动点一行，不要合并。

### 2.2、流程视角

以**场景**为维度（前端常见「页面 × 场景」，后端常见「接口 / 任务 × 场景」），**每个场景出改动前、改动后两张图**：

1. 先出改动前的图：按第 3 步代码勘察的结果，还原该场景的完整链路，重点画清改动点原先是怎么走的。
2. 再出改动后的图：在改动前的基础上叠加本次改动，重点画清改动后怎么走。
3. 两张图的**节点命名保持一致**，评审时才能左右对照。

用 archify `workflow`（带泳道）：泳道按参与方划分（入口 / 交互、服务 / 接口、数据层、中间件、第三方、异常兜底…），改动点所在节点加 `tag`，改动区域用 `groups` 或 `phases` 的 `emphasis` 框出来。

> 泳道图示例见 `diagram-authoring.md` 的「完整可跑示例」。

### 2.3、架构视角

一张架构图，体现本次改动落在哪些模块、文件、接口上：

- 层次按工程实际来：一般顶层是项目 / 服务（跨仓或跨服务时水平并列，并写明各自归属），中间层是模块、页面或对外接口，底层是具体类 / 方法 / 逻辑。
- 前端常见的「页面 + 公共组件 + 接口」、后端常见的「服务 + 对外接口 + 依赖的中间件与存储」都适用。
- **本次改动的节点加 `tag`，相关连线用 `variant: "emphasis"`**

可以用 archify 的 `compare`（`archify compare architecture base.json head.json`）出一张差异图作为补充，但 2.2 的改动前 / 改动后成对图仍然是必需的。

---

## 3、关键实现

以 X 的 `改动内容` 层级为维度组织，**层级照搬**：

| 改动内容 | 本文档 |
| --- | --- |
| `1、A功能优化` | `## 3.1、A功能优化` |
| `1.1、B逻辑更改` | `### 3.1.1、B逻辑更改` |

每个改动点写清三件事，并标注它满足的验收条目：

1. **代码位置**——真实文件路径 + 类 / 方法 / 函数 / 字段名
2. **实现方案**——为什么这样做，边界条件怎么处理，与现有逻辑如何共存
3. **具体改动内容**——改动前是什么、改动后是什么
4. **验收映射**——满足 spec 里的哪些 `AC-###`

> 写完倒查一遍：spec 第 4 章若有某条 `AC` 没有任何改动点承接，说明方案漏了需求，回去补。

需要贴代码时只贴**改动处的关键片段**（改动前后对照），并注明文件路径。复杂的条件分支 / 调用时序可再补一张 `sequence` 或 `workflow` 图。

---

## 4、<技术域>方案风险点及后续规划

标题里的技术域按工程填（前端 / 后端 / 客户端），**编号与下面三节不变**。

三节固定，**没有就写「暂无」**，不要留空也不要删节：

- `### 4.1 兼容性问题`
- `### 4.2 安全问题`
- `### 4.3 性能问题`

各节写什么，按工程实际选取：

| 小节 | 前端 / 客户端 | 后端 / 服务端 |
| --- | --- | --- |
| 4.1 兼容性 | 浏览器 / 机型 / WebView 版本 / 新旧接口字段兼容 / 暗黑与国际化 | 调用方版本 / 协议与数据格式兼容 / 上下游发布顺序 / 新旧字段与接口共存 |
| 4.2 安全 | XSS、敏感信息、参数校验、跳转与越权可绕过点 | 参数校验与注入面、鉴权与越权、敏感数据与日志脱敏、幂等与重放 |
| 4.3 性能 | 请求次数、轮询开销、渲染开销、包体积 | 接口耗时与 QPS、慢查询与索引、缓存命中、连接与线程池、批量与超时 |

注意这三个小节的标题**不带顿号**（`### 4.1 兼容性问题`），与第 1~3 章的 `## N、标题` 写法不同——历史方案一贯如此，保持一致。

`暂无` 后面可以跟一句理由，把"为什么这次没有"讲清楚，例如：

```markdown
### 4.2 安全问题
- 暂无（本次改动只消费已下发的展示配置，跳转仍走现有的 URL 校验方法，无新增注入面）。
```

---

## 5、上线策略

### 5.1、发布计划

只输出表头与空行，不要填内容：

```markdown
| 步骤 | 功能模块 | 依赖步骤 | 责任人 | 回退方案 |
| ---- | ---- | ---- | ---- | ---- |
|      |      |      |      |      |
```

### 5.2、灰度放量计划

只输出表头与空行，不要填内容：

```markdown
| 环境 | 路由计划名称 | 路由计划ID | 规则 | 备注 |
| ---- | ---- | ---- | ---- | ---- |
|      |      |      |      |      |
```

---

## 6、数据监控

### 6.1、数据采集

固定输出斜体提示，不要填内容：

```markdown
*请粘贴埋点元数据表格文档地址*
```

### 6.2、监控方案

固定输出这两行标题：

```markdown
告警图梳理：
告警表格补充：
```

---

## 7、回归要求

### 7.1、业务流程回归

固定输出斜体提示：

```markdown
*请根据改动内容输出相关业务流程*
```

### 7.2、多端验证

固定输出这两个标签：

```markdown
端要求：
APP版本要求：
```

后端 / 服务端工程把这两行换成对应的两行（保持"两行标签 + 无内容"的形态）：

```markdown
部署环境要求：
依赖与调用方版本要求：
```

---

## 8、开发排期

只输出表头与空行，不要填内容：

```markdown
| 项目 | 模块 | 事项 | 工作量（人/天） | 备注 |
| ---- | ---- | ---- | ---- | ---- |
|      |      |      |      |      |
```

### 8.1 易错点 checklist

排在排期表**之后**。这一节是本类方案的固定收尾，列实现阶段最容易踩的坑，每条都要**具体到字段 / 方法 / 时机**，不写"注意边界条件"这类空话：

```markdown
### 8.1 易错点 checklist

- `<字段名>` 的枚举值需与后端对齐（各状态的具体取值）
- `<轮询配置>.interval` 的时间单位需确认（ms 还是 s）
- 组件卸载时需同时清掉 `<定时器A>` 与 `<定时器B>`，否则定时任务泄漏
- 该区域的图片素材需先迁移到新配置项再上线，否则展示空白
```

素材来源：深度勘察时发现的隐式约定、字段优先级、时序依赖、销毁时机、跨端差异，以及第 4 章识别出的风险点。**这一节不能空**——如果实在列不出，说明代码勘察不充分，回去补读。

后端 / 服务端的素材通常是：事务边界与提交时机、幂等键与重复消费、缓存与库的一致性、锁的粒度与超时、批量操作的失败回滚、上下游超时与重试叠加。

---

## 固定项速查

评审流程依赖这几处**保持原样**，不要"优化"它们：

| 位置 | 要求 |
| --- | --- |
| 文档头 | 第一行 `需求信息：`，第二行 `相关文档：`（没有则整行不出现） |
| 2.1 表格 | 「截图」「备注」列留空 |
| 5.1 / 5.2 / 8 表格 | 只有表头 + 一行空行，不填充 |
| 6.1 / 7.1 | 固定斜体提示文案 |
| 6.2 / 7.2 | 固定标签行（7.2 后端工程见上文替换写法） |
| 8.1 | 排在排期表之后，必须有条目 |
| 章节标题 | `## N、标题`，数字后跟顿号；但 4.1~4.3 与 8.1 不带顿号 |
| 第 4 章标题 | `<技术域>方案风险点及后续规划`，三节编号与标题不变 |
````

---

## diagram-authoring.md

**说明**：archify 图形授权指南。解释为什么不用 mermaid（布局缺陷 + 无校验），给出类型路由（workflow / architecture / sequence / lifecycle / dataflow）；列出 `architecture` 与 `workflow` 的字段白名单与硬约束——关键一点是**组件与节点都没有 `variant` 字段**，改动高亮只能靠 `tag` + `groups`/`phases` 的 `emphasis` + 连线 `emphasis`；`workflow` 的 `col` 上限 6、节点默认宽 92px、中文必须显式给 `width`、用 `yOffset` 纵向堆叠。附两张实测 9/9 通过的可跑示例、校验诊断码对照与修复纪律、干净出图链路，以及"诚实原则"（失败不能描述成成功）。

````
# archify 图形授权指南

本文件里的所有约束都是**实测确认**的（archify 2.17，Node 22 + Chrome），不是推测。写规格前通读一遍，能省掉大部分返工。

## 为什么不用 mermaid

历史方案里架构图用 mermaid `flowchart TB` 嵌套 `subgraph` 堆方框，为了绕开 mermaid 的布局缺陷甚至定下"严禁使用任何箭头和连线"的规矩——结果就是一张没有连接关系的方框树，评审时看不出数据怎么流。archify 用确定性正交路由 + 9 项硬校验，箭头可以放心画，交叉和压字会被直接拦下来。

## 类型路由

| 场景 | 类型 | 说明 |
| --- | --- | --- |
| 2.2 流程视角（改动前 / 改动后） | `workflow` | 带泳道。泳道按参与方划分：入口 / 交互、服务 / 接口、数据层、中间件、第三方、异常兜底… |
| 2.3 架构视角 | `architecture` | 组件 + 连接 + 边界 |
| 3 关键实现的局部调用链 | `sequence` | 参与者 + 消息 |
| 状态流转（订单状态、任务状态、轮询状态） | `lifecycle` | 状态 + 迁移 |
| 数据管道 / 埋点 / 消息链路 | `dataflow` | 数据源 → 处理 → 消费 |

拿不准时先跑 `node <archify>/bin/archify.mjs guide "<场景描述>" --json`。

---

## architecture（架构图）

### 硬约束

| 约束 | 值 |
| --- | --- |
| `schema_version` | `1` |
| 布局 | **必须**写 `layout`，否则每个组件都要给 `pos` + `size`（极易报错） |
| 组件 `type` 枚举 | `frontend` `backend` `database` `cloud` `security` `messagebus` `external` |
| 连线 `variant` 枚举 | `default` `emphasis` `security` `dashed` |

**组件字段白名单**（多一个就报 `schema/additionalProperties`）：

`id` `type` `label` `sublabel` `tag` `brand` `sources` `row` `col` `pos` `size`

> ⚠️ **组件没有 `variant` 字段。** 组件不能直接上色，"本次改动"只能靠 `tag`（渲染成标签芯片）和连线的 `variant: "emphasis"` 表达。实测给组件加 `variant` 会被直接拒绝。

### 完整可跑示例（已实测 9/9 通过）

```json
{
  "schema_version": 1,
  "diagram_type": "architecture",
  "meta": {
    "title": "页面 A · 架构改动",
    "quality_profile": "showcase",
    "locale": "zh-CN"
  },
  "layout": { "mode": "grid", "cols": 3, "gapX": 90, "gapY": 90 },
  "components": [
    { "id": "entry", "type": "frontend", "label": "页面入口",   "sublabel": "src/views/index.vue", "row": 0, "col": 0 },
    { "id": "logic", "type": "frontend", "label": "页面逻辑",   "sublabel": "状态与交互",           "row": 1, "col": 0 },
    { "id": "added", "type": "frontend", "label": "新增模块",   "sublabel": "src/api/xxx.ts",       "tag": "本次新增", "row": 2, "col": 0 },
    { "id": "api1",  "type": "backend",  "label": "初始化接口", "sublabel": "/route/init.json",     "row": 0, "col": 2 },
    { "id": "api2",  "type": "backend",  "label": "查询接口",   "sublabel": "/route/query.json",    "row": 1, "col": 2 },
    { "id": "api3",  "type": "backend",  "label": "上报接口",   "sublabel": "/route/report.json",   "row": 2, "col": 2 }
  ],
  "connections": [
    { "id": "c1", "from": "entry", "to": "api1", "label": "初始化拉取" },
    { "id": "c2", "from": "logic", "to": "api2", "label": "轮询查询" },
    { "id": "c3", "from": "added", "to": "api3", "label": "上报", "variant": "emphasis" }
  ],
  "cards": [
    { "dot": "rose", "title": "本次改动", "items": ["新增 src/api/xxx.ts 封装上报", "页面在首次成功查询后调用一次"] }
  ]
}
```

要点：

- `layout.mode: "grid"` + 每个组件的 `row` / `col`，**不要手写坐标**。手写 `pos` 时尺寸和间距要自己算，是返工的主要来源。
- **标签要短**。长标识符放 `sublabel`，`label` 放中文短名——校验会因"标签比组件宽"直接报错。
- 同一列内 `row` 递增即垂直排布；多条平行连线（不同 row 之间）自然不交叉。**跨行斜连最容易触发交叉告警**，能改成平连就改。

---

## workflow（泳道流程图）

### 硬约束

| 约束 | 值 |
| --- | --- |
| `schema_version` | **`2`**（新建一律用 2；`1` 是旧版固定几何契约） |
| 必填 | `schema_version` `diagram_type` `meta` `lanes` `nodes` `edges` |
| `nodes[].col` | **整数 0~5，最多 6 列** |
| 列中心 x | 88 / 220 / 300 / 430 / 500 / 625 |
| 节点默认宽度 | **92px** —— 中文标签基本都不够，必须显式给 `width` |
| 同泳道节点间距 | ≥ 8px |
| 文字宽度 | 按 CJK 全角算 2 单位（中文标签比英文"宽"得多） |
| 泳道数量 | 不限制 |
| 换行 | 不支持。多行信息拆成 `label` + `sublabel`，或拆成多个节点 |

**节点字段白名单**：

`id` `lane` `col` `type` `label` `sublabel` `tag` `brand` `width` `height` `yOffset`

> ⚠️ **节点没有 `variant` 字段。** 泳道图里"本次改动"的高亮方式：
> 1. 节点加 `tag`（如 `"tag": "本次改动"`）→ 渲染成标签芯片
> 2. 用 `groups` 或 `phases` 的 `variant: "emphasis"` 框住改动区域
> 3. 连线用 `variant: "emphasis"`
>
> 没有"把某个节点填成橙色"这个能力，别去找。

### 应对 6 列上限：`yOffset` 纵向堆叠

长流程不要硬拉成 6 列。**同一条泳道、同一列内可以放多个节点，用 `yOffset` 拉开纵向间距**——实测可正常校验通过，而且这正好贴合"泳道内自上而下读"的习惯。

```json
{ "id": "a2", "lane": "fe", "col": 0, "type": "frontend", "label": "step2", "width": 110, "yOffset": 80 }
```

排不下时按**场景**拆图（如「首次进入」「二次进入」各一张），比把 20 个节点压进一张图可读得多。

### 完整可跑示例（已实测 9/9 通过）

```json
{
  "schema_version": 2,
  "diagram_type": "workflow",
  "meta": {
    "title": "页面 A 初始化与条件分流",
    "quality_profile": "showcase",
    "locale": "zh-CN"
  },
  "lanes": [
    { "id": "entry",    "label": "触发入口" },
    { "id": "data",     "label": "数据层" },
    { "id": "logic",    "label": "逻辑层" },
    { "id": "fallback", "label": "异常兜底", "variant": "exception" }
  ],
  "phases": [
    { "id": "p1", "label": "并行准备", "fromCol": 0, "toCol": 1 },
    { "id": "p2", "label": "串联判定", "fromCol": 2, "toCol": 5, "variant": "emphasis" }
  ],
  "nodes": [
    { "id": "tap",    "lane": "entry",    "col": 0, "type": "external", "label": "用户触发",     "sublabel": "点击 / 进入",       "width": 124 },
    { "id": "load",   "lane": "data",     "col": 0, "type": "backend",  "label": "并发拉取",     "sublabel": "两个接口并行",      "width": 124 },
    { "id": "gate",   "lane": "logic",    "col": 2, "type": "frontend", "label": "条件判定",     "sublabel": "两标志位均为 true", "width": 140 },
    { "id": "act",    "lane": "logic",    "col": 3, "type": "frontend", "label": "置入状态",     "width": 108 },
    { "id": "branch", "lane": "logic",    "col": 4, "type": "frontend", "label": "分支判定",     "sublabel": "命中新增配置",      "tag": "本次改动", "width": 140 },
    { "id": "new",    "lane": "logic",    "col": 5, "type": "frontend", "label": "执行新增逻辑", "sublabel": "新增方法",          "tag": "本次改动", "width": 136 },
    { "id": "raw",    "lane": "fallback", "col": 5, "type": "external", "label": "走原逻辑",     "width": 116 }
  ],
  "mainPath": ["tap", "gate", "act", "branch", "new"],
  "edges": [
    { "from": "tap",    "to": "gate",   "label": "完成", "variant": "emphasis" },
    { "from": "load",   "to": "gate",   "label": "完成", "variant": "emphasis" },
    { "from": "gate",   "to": "act",    "label": "继续" },
    { "from": "act",    "to": "branch", "label": "继续" },
    { "from": "branch", "to": "new",    "label": "是",   "variant": "emphasis" },
    { "from": "branch", "to": "raw",    "label": "否",   "variant": "dashed", "role": "branch" }
  ],
  "cards": [
    { "dot": "rose", "title": "本次改动", "items": ["新增分支判定逻辑", "命中时调用新增方法，未命中走原逻辑"] }
  ]
}
```

要点：

- `lanes` 顺序 = 从上到下的泳道顺序。`variant: "exception"` 会渲染成红框异常泳道，放失败 / 兜底 / 重试路径。
- `phases` 画顶部分区带，用来表达"并行初始化 / 串联判定"这类阶段。`fromCol`/`toCol` 撑不满就用 `groups` 框局部。
- 连线 `route` 预设：`drop`（跨泳道下坠）、`bottom-channel`（走底部通道）、`outside-right`（绕右侧）最常用。
- **改动前 / 改动后两张图的节点 `id` 与 `label` 要一致**，只让 `tag` 和 `variant` 不同，评审时才能左右对照。

---

## 校验与修复循环

```bash
# 单张规格校验（开发时反复用）
node <archify>/bin/archify.mjs validate workflow <规格.json> --quality showcase --json

# 批量出图（推荐，见 SKILL.md 第 6 步）
node scripts/render-diagrams.mjs --dir <specs> --out <assets>
```

`showcase` 档必须 **9/9 检查通过、0 error、0 warning**。诊断内容里直接给了修法，按 `code` 对症下药：

| 诊断码 | 含义 | 怎么修 |
| --- | --- | --- |
| `schema/additionalProperties` | 字段不被接受 | 删掉多余字段（最常见的是给节点加 `variant`） |
| `layout/constraint` … `wider than` | 标签比节点宽 | 缩短 `label`，长名挪到 `sublabel`，或加大 `width` |
| `composition/proper-crossing` | 两条连线交叉 | 调 `fromSide`/`toSide`/`via`，或换布局让连线平行 |
| `composition/label-route-clearance` | 标签离别的连线太近 | 调 `labelAt` / `labelDx` / `labelDy` |
| `label … overlaps component` | 标签压在节点上 | 按建议的 `labelAt` 或 `labelDy` 挪 |

修复纪律：

- **一次只改一处**再重跑，改多了分不清是哪条起效。
- 加 `via` / `channelX` / `channelY` / `labelAt` 是**硬坐标钉死**，非必要不加；先试调 `fromSide`/`toSide`。
- **连续两轮没有让错误数下降就停下**，如实说明哪条没解决，不要假装通过。

## 产物形态

| 产物 | 大小 | 用途 |
| --- | --- | --- |
| `<名>.json` | 1~3 KB | **唯一源头**，改图只改它 |
| `<名>.html` | ~700 KB | 交互版（缩放 / 搜索 / 明暗主题），md 里放链接 |
| `<名>.png` | ~200 KB | md 里内嵌，无工具栏、2 倍清晰度 |

PNG 由渲染脚本从交付 HTML 中抽出样式与主图 SVG，重建无工具栏页面后用 Chrome 无头截图得到——**不要手工截图**，也不要手改 HTML / PNG。

`<名>.html` 的 `<html>` 标签默认带 `data-theme="dark"`；脚本出图时显式改成 `light`，与方案文档的浅色底色一致。需要深色图时加 `--theme dark`。

## 自建 HTML 产物的出图与目视校验

方案里除 archify 交付物外，常需要自绘 HTML（设计稿板、原型、状态卡）。验证它们用同一个 Chrome 无头套路，但有三个实测踩到的坑：

1. **入场动画会让截图丢内容**。页面若用 `animation: … both` + `animation-delay` 做错峰编排（page 级动画的常规写法），`--headless` 在 t≈0 截图，还没到 delay 的元素停在 `opacity: 0` —— 截图上看起来像「按钮 / 错误块根本没写」，很容易被误判成结构缺失而去改错地方。加 `--virtual-time-budget=6000` 让虚拟时间把动画跑完再截：

   ```
   chrome --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
          --virtual-time-budget=6000 --force-device-scale-factor=1 \
          --window-size=W,H --screenshot=out.png "file:///…/board.html"
   ```

   只想看终态也可以用 `--force-prefers-reduced-motion`，但前提是页面确实写了 `prefers-reduced-motion` 降级、且降级分支落在 `opacity: 1`（写成 `animation: none` 而漏掉 `opacity: 1` 时，元素会永久不可见）。

2. **无头截图不滚动、不懒加载**，`--window-size` 的高度必须覆盖全页；用 PIL `crop` 分块放大看细节，缩略图容易看漏（本次就是靠放大才看到题注错字与缺失的按钮）。

3. **flex 排不满会静默折行**。`n × 固定宽 + gap` 超过容器就换行，可能出现 3+1 这种断行。用 `zoom: z` 缩放时，容器在**自身坐标系**里的宽度是 `W/z`，所以「放得下」的判据是 `W/z ≥ n*w + (n-1)*g`，**不是** `W ≥ n*w*z + (n-1)*g*z` —— 混用视觉宽和布局宽会算出「应该放得下」然后折行。算不准就加 `justify-content: center` 兜住，别把留白全堆在一侧。

**声明必须与实况一致**：看板上的小标题、屏数、比例尺、以及 CSS 里写明的取值，都要与实际渲染对得上（例：标题写「四种状态 × 两套主题」却只画了 4 屏，就是过度声明）。逐屏看题注与可见文案——错字和数字不一致最容易漏在这里。

## 诚实原则

- `deliver` 非 0 退出 = 失败，**不能描述成成功**。
- `visual-check` 是浏览器自动证据（本机 Chrome，会产出 4 张 PNG 旁证），它**不等于**人工视觉确认，不要把两者混为一谈。
- 没跑过的检查不要说跑过，没看过的图不要说看过。
````

---

## render-diagrams.mjs

**说明**：批量渲染脚本。对 `--dir` 下每个 archify 规格 JSON 依次执行 `validate → deliver`（交互 HTML）→ 抽 SVG 重建无工具栏页面 → Chrome 无头截图（干净 PNG），最后写 `manifest.json`。任一规格校验失败**不中断其余规格**，退出码为 1。脚本自动探测 archify 与 Chrome 的安装位置，支持 `--quality` / `--width` / `--scale` / `--theme` / `--only` 等参数；并自动清理 archify 的 staging 过程目录。

```js
#!/usr/bin/env node
/**
 * render-diagrams.mjs —— 批量把 archify 规格 JSON 渲染为「交互 HTML + 干净 PNG」
 *
 * 为什么需要它：
 *   archify 的原生产物是一个 ~700KB 的可交互 HTML（带工具栏/缩放条），无法直接内嵌进
 *   markdown。本脚本在 archify 交付的 HTML 基础上，抽出「样式 + 图表 SVG」重建一个
 *   无工具栏的精简页面，再用本机 Chrome 无头模式截图，得到可直接内嵌 md 的高清图。
 *
 * 用法：
 *   node render-diagrams.mjs --dir <规格目录> [--out <产物目录>]
 *                            [--quality showcase|standard] [--width 1800]
 *                            [--scale 2] [--theme light|dark] [--only <文件名前缀>]
 *
 * 行为：
 *   --dir 下每个 *.json（顶层含 diagram_type）依次：
 *     1. archify validate  → 失败则打印诊断，计入 failed，继续处理其余规格
 *     2. archify deliver   → <out>/<name>.html   （交互版，md 里放链接）
 *     3. 抽 SVG + CSS      → <out>/<name>.png    （干净图，md 里内嵌）
 *     4. 写入 <out>/manifest.json
 *   退出码：全部成功 0；有任一失败 1。
 *
 * 依赖：Node 与 Chrome/Edge；archify skill（自动探测路径）。
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------- 参数解析
const argv = process.argv.slice(2);
function arg(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
}
function flag(name) {
  return argv.includes(`--${name}`);
}

const SPEC_DIR = path.resolve(arg('dir', '.'));
const OUT_DIR = path.resolve(arg('out', SPEC_DIR));
const QUALITY = arg('quality', 'showcase');
const WIDTH = Number(arg('width', '1800'));
const SCALE = Number(arg('scale', '2'));
const THEME = arg('theme', 'light');
const ONLY = arg('only', null);

if (flag('help') || argv.length === 0) {
  console.log(
    [
      'render-diagrams.mjs — 批量渲染 archify 规格为 交互 HTML + 干净 PNG',
      '',
      '  --dir <目录>      规格 JSON 所在目录（必填）',
      '  --out <目录>      产物输出目录（默认与 --dir 相同）',
      '  --quality <档位>  showcase | standard（默认 showcase）',
      '  --width <px>      出图宽度基准，默认 1800（实际像素 = width × scale）',
      '  --scale <n>       设备像素比，默认 2（高清）',
      '  --theme <主题>    light | dark（默认 light）',
      '  --only <前缀>     只处理文件名以该前缀开头的规格',
      '',
      '示例：',
      '  node scripts/render-diagrams.mjs \\',
      '       --dir technical_solution/assets/20260918-需求名称/specs \\',
      '       --out technical_solution/assets/20260918-需求名称',
    ].join('\n'),
  );
  process.exit(0);
}

// ---------------------------------------------------------------- 依赖探测
function firstExisting(paths) {
  for (const p of paths) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function resolveArchify() {
  const home = os.homedir();
  const candidates = [
    process.env.ARCHIFY_CLI,
    path.join(home, '.workbuddy', 'skills', 'archify', 'bin', 'archify.mjs'),
    path.join(process.cwd(), '.workbuddy', 'skills', 'archify', 'bin', 'archify.mjs'),
  ];
  const found = firstExisting(candidates);
  if (found) return found;

  // 兜底：在 ~/.workbuddy/skills 下按目录名搜索
  const skillsDir = path.join(home, '.workbuddy', 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const entry of fs.readdirSync(skillsDir)) {
      const p = path.join(skillsDir, entry, 'bin', 'archify.mjs');
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function resolveChrome() {
  return firstExisting([
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]);
}

const ARCHIFY = resolveArchify();
const CHROME = resolveChrome();

if (!ARCHIFY) {
  console.error('✗ 找不到 archify。请安装 archify skill，或用 ARCHIFY_CLI 指定 bin/archify.mjs 路径。');
  process.exit(2);
}
if (!CHROME) {
  console.error('✗ 找不到 Chrome/Edge，无法出图。请安装浏览器，或用 CHROME_PATH 指定可执行文件。');
  process.exit(2);
}
if (!fs.existsSync(SPEC_DIR)) {
  console.error(`✗ 规格目录不存在：${SPEC_DIR}`);
  process.exit(2);
}

console.log(`archify  : ${ARCHIFY}`);
console.log(`chrome   : ${CHROME}`);
console.log(`规格目录 : ${SPEC_DIR}`);
console.log(`产物目录 : ${OUT_DIR}`);
console.log('');

fs.mkdirSync(OUT_DIR, { recursive: true });
const TMP_DIR = path.join(OUT_DIR, '.render-tmp');
fs.mkdirSync(TMP_DIR, { recursive: true });

// ---------------------------------------------------------------- 工具函数
function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
}

function parseJSONSafe(text) {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** 从 archify 交付的 HTML 中抽出图表 SVG 与样式，重建无工具栏页面后截图 */
function makeCleanPng(htmlPath, pngPath, tmpName) {
  const html = fs.readFileSync(htmlPath, 'utf8');

  // 1) 合并所有 <style> 块（archify 目前输出 1 个，合并更稳）
  const cssParts = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  if (cssParts.length === 0) throw new Error('交付 HTML 中未找到 <style>，无法重建样式');
  const css = cssParts.join('\n');

  // 2) 定位主图 SVG：取第一个带 viewBox 的 <svg>
  const openMatch = /<svg\b[^>]*viewBox="([^"]+)"[^>]*>/.exec(html);
  if (!openMatch) throw new Error('交付 HTML 中未找到带 viewBox 的 SVG');
  const svgStart = openMatch.index;
  const svgEnd = html.indexOf('</svg>', svgStart);
  if (svgEnd === -1) throw new Error('SVG 缺少结束标签');
  const svg = html.slice(svgStart, svgEnd + '</svg>'.length);

  // 3) 继承原页面的主题与风格标记，保证配色与交付 HTML 一致
  const htmlTag = /<html[^>]*>/.exec(html)?.[0] ?? '';
  const pick = (attr, fallback) => new RegExp(`${attr}="([^"]*)"`).exec(htmlTag)?.[1] ?? fallback;
  const lang = pick('lang', 'zh-CN');
  const preset = pick('data-preset', 'classic');

  // 4) 由 viewBox 算出截图高度，保证长宽比不失真
  const vb = openMatch[1].trim().split(/\s+/).map(Number);
  const vbW = vb[2] || 1000;
  const vbH = vb[3] || 600;
  const height = Math.max(200, Math.round((WIDTH * vbH) / vbW));

  const wrapper = `<!DOCTYPE html>
<html lang="${lang}" data-theme="${THEME}" data-preset="${preset}">
<head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:${THEME === 'dark' ? '#0b0f14' : '#ffffff'};}
body>svg{display:block;width:${WIDTH}px;height:auto;}
${css}
</style></head>
<body>
${svg}
</body></html>
`;

  const wrapperPath = path.join(TMP_DIR, `${tmpName}.clean.html`);
  fs.writeFileSync(wrapperPath, wrapper, 'utf8');

  const chromeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-sandbox',
    '--disable-extensions',
    `--force-device-scale-factor=${SCALE}`,
    '--default-background-color=FFFFFFFF',
    `--screenshot=${pngPath}`,
    `--window-size=${WIDTH},${height}`,
    `file:///${wrapperPath.replace(/\\/g, '/')}`,
  ];

  const r = run(CHROME, chromeArgs, { timeout: 180000 });
  if (!fs.existsSync(pngPath)) {
    throw new Error(
      `Chrome 截图未产出文件（退出码 ${r.status}）：${(r.stderr || '').split('\n').filter(Boolean).slice(-3).join(' | ')}`,
    );
  }
  return { wrapperPath, width: WIDTH * SCALE, height: height * SCALE };
}

// ---------------------------------------------------------------- 主流程
let specs = fs
  .readdirSync(SPEC_DIR)
  .filter((f) => f.toLowerCase().endsWith('.json'))
  .filter((f) => !f.startsWith('_') && f !== 'manifest.json')
  .filter((f) => (ONLY ? f.startsWith(ONLY) : true))
  .sort();

if (specs.length === 0) {
  console.error(`✗ ${SPEC_DIR} 下没有可用的规格 JSON`);
  process.exit(2);
}

const results = [];
let failedCount = 0;

for (const file of specs) {
  const specPath = path.join(SPEC_DIR, file);
  const name = file.replace(/\.json$/i, '');

  let spec = null;
  try {
    spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  } catch (e) {
    console.error(`✗ [${file}] JSON 解析失败：${e.message}`);
    results.push({ name, spec: file, status: 'json-error', error: e.message });
    failedCount++;
    continue;
  }

  const type = spec.diagram_type;
  if (!type) {
    console.error(`✗ [${file}] 缺少 diagram_type 字段`);
    results.push({ name, spec: file, status: 'no-diagram-type' });
    failedCount++;
    continue;
  }

  // --- 1) validate：先拿到结构化的诊断，便于精确修复
  const v = run(process.execPath, [ARCHIFY, 'validate', type, specPath, '--quality', QUALITY, '--json']);
  const vJson = parseJSONSafe(v.stdout);
  if (!vJson || vJson.ok !== true) {
    const diags = (vJson?.diagnostics ?? []).map((d) => `    - [${d.code}] ${d.message}`).join('\n');
    console.error(`✗ [${name}] 校验未通过（${type}）`);
    if (diags) console.error(diags);
    else console.error(`    ${(vJson?.error ?? v.stdout ?? v.stderr ?? '').slice(0, 800)}`);
    results.push({ name, spec: file, type, status: 'validate-failed', diagnostics: vJson?.diagnostics ?? [] });
    failedCount++;
    continue;
  }

  // --- 2) deliver：产出可交付的交互 HTML
  const htmlPath = path.join(OUT_DIR, `${name}.html`);
  const d = run(process.execPath, [
    ARCHIFY, 'deliver', type, specPath, htmlPath, '--quality', QUALITY, '--json',
  ]);
  const dJson = parseJSONSafe(d.stdout);
  if (!dJson || dJson.ok !== true) {
    console.error(`✗ [${name}] 交付失败：${(dJson?.error ?? d.stdout ?? d.stderr ?? '').slice(0, 800)}`);
    results.push({ name, spec: file, type, status: 'deliver-failed', error: dJson?.error ?? null });
    failedCount++;
    continue;
  }

  // --- 3) 干净 PNG：抽出 SVG 重建无工具栏页面后截图
  const pngPath = path.join(OUT_DIR, `${name}.png`);
  let image = null;
  let imageError = null;
  try {
    image = makeCleanPng(htmlPath, pngPath, name);
  } catch (e) {
    imageError = e.message;
  }

  const ok = !imageError;
  if (!ok) failedCount++;

  const line = ok
    ? `✓ [${name}] ${type} · 校验 ${dJson.validation?.checksPassed}/${dJson.validation?.checkCount} · 图 ${image.width}×${image.height}`
    : `△ [${name}] ${type} · HTML 已产出，但出图失败：${imageError}`;
  console.log(line);

  results.push({
    name,
    spec: path.relative(OUT_DIR, specPath).replace(/\\/g, '/'),
    type,
    status: ok ? 'ok' : 'png-failed',
    title: spec.meta?.title ?? null,
    html: `${name}.html`,
    png: ok ? `${name}.png` : null,
    validation: dJson.validation ?? null,
    artifact: dJson.artifact ?? null,
    image: image ? { width: image.width, height: image.height } : null,
    error: imageError,
  });
}

// ---------------------------------------------------------------- manifest
const manifest = {
  generatedAt: new Date().toISOString(),
  quality: QUALITY,
  theme: THEME,
  widthBase: WIDTH,
  scale: SCALE,
  count: results.length,
  ok: results.filter((r) => r.status === 'ok').length,
  failed: failedCount,
  diagrams: results,
};
fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

// 清理临时文件
try {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
} catch {
  /* 清理失败不影响产物 */
}

// 清扫 archify 的 staging 目录：它正常会在收尾时 rmSync 掉自己创建的
// `.archify-delivery-*`，但中途报错 / 被中断的那一轮会留下。不清的话产物目录里会混进
// 过程文件。只删这个前缀，不动其它任何东西。
try {
  for (const entry of fs.readdirSync(OUT_DIR, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith('.archify-delivery-')) {
      fs.rmSync(path.join(OUT_DIR, entry.name), { recursive: true, force: true });
    }
  }
} catch {
  /* 同上，清理失败不影响产物 */
}

console.log('');
console.log(`产物：${manifest.ok}/${manifest.count} 成功${failedCount ? `，${failedCount} 失败` : ''}`);
console.log(`清单：${path.join(OUT_DIR, 'manifest.json')}`);
if (failedCount) {
  console.log('');
  console.log('按上面每条 [诊断码] 的提示修复后重跑；跨线条冲突优先调 fromSide/toSide/via，');
  console.log('标签压节点优先调 labelAt/labelDy，中文标签超宽就加节点 width。');
}
process.exit(failedCount ? 1 : 0);
```

---

## 参考

- 图形引擎 **archify**：提供 `validate` / `deliver` / `visual-check` / `compare` 等子命令，负责本 skill 的架构图与泳道图生成与校验（npm 包，可独立安装）
