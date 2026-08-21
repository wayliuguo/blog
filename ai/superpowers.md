# Superpowers

> 分析版本：v6.3.0

## 定位

Superpowers 是一个**零依赖的 AI Agent 行为约束插件**（作者 Jesse Vincent，仓库 [obra/superpowers](https://github.com/obra/superpowers)），通过向 Claude Code、Cursor、Copilot CLI 等编程 agent 注入结构化指令（skills），规范 agent 在软件开发全流程中的行为。

它要解决的问题不是"agent 能力不够"，而是**没人监督时 agent 会自己抄近道**：跳过设计直接写代码、先写实现再补测试、见症状就打补丁、没跑测试就宣称完成。Superpowers 把 TDD、根因调查、设计优先、证据驱动这些工程实践写成 agent 必须遵守的流程文本，形成从需求到交付的闭环。

本质上它就是一堆结构化的 Markdown，不是黑盒程序，可以随时打开阅读和修改。

## 安装

不同 harness 装法不同，用了多个就各装一次。Claude Code 有两个来源：

```bash
# 官方插件市场（推荐，无需注册 marketplace）
/plugin install superpowers@claude-plugins-official
```

```bash
# Superpowers 自己的市场（额外包含若干相关插件）
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

其他 harness：

| Harness | 命令 |
| ------- | ---- |
| Antigravity | `agy plugin install https://github.com/obra/superpowers` |
| Droid | `droid plugin marketplace add https://github.com/obra/superpowers` → `droid plugin install superpowers@superpowers` |
| Copilot CLI | `copilot plugin marketplace add obra/superpowers-marketplace` |

安装后重启会话即生效——技能是自动触发的，不需要每次手动调用。

## 整体结构

```
superpowers/
  hooks/
    hooks.json          ← 注册 SessionStart hook
    run-hook.cmd        ← 跨平台 polyglot 启动器
    session-start       ← bash 脚本，注入 using-superpowers
  skills/
    using-superpowers/  ← 引导层（自动注入）
    brainstorming/            writing-plans/
    subagent-driven-development/  executing-plans/
    test-driven-development/  systematic-debugging/
    dispatching-parallel-agents/  verification-before-completion/
    finishing-a-development-branch/
    requesting-code-review/   receiving-code-review/
    using-git-worktrees/      writing-skills/
  package.json          ← pi.skills 指向 ./skills
```

## 运行时注入机制

### SessionStart Hook 链路

```
打开 Claude Code
  → 触发 SessionStart 事件
  → hooks.json 匹配 startup|clear|compact
  → 执行 run-hook.cmd session-start
  → 读取 skills/using-superpowers/SKILL.md
  → JSON escape 转义
  → 平台检测，输出对应格式
  → 注入 additionalContext 到系统 prompt
```

`run-hook.cmd` 是个 polyglot 脚本，同一份文件在 Windows 上作为 batch 执行，在 Unix 上作为 bash 执行：

```bash
: << 'CMDBLOCK'
@echo off
# Windows batch：找 Git Bash 执行 session-start
CMDBLOCK
# Unix bash：直接 exec bash session-start
```

不同 harness 的 hook 输出字段还不一样，`session-start` 末尾按环境变量分流：

| 平台 | 环境变量 | JSON 字段 |
| ---- | -------- | --------- |
| Cursor | `CURSOR_PLUGIN_ROOT` | `additional_context` |
| Claude Code | `CLAUDE_PLUGIN_ROOT`（无 `COPILOT_CLI`） | `hookSpecificOutput.additionalContext` |
| Copilot CLI / 其他 | `COPILOT_CLI=1` 或未知 | `additionalContext` |

### 两层加载模型

```
SessionStart（自动）
  └─ using-superpowers 全量注入（~1KB）
      └─ 告知 Claude：技能系统存在，用 Skill 工具按需加载

用户请求触发（按需）
  └─ Skill({skill: "brainstorming"})
      └─ 读取 SKILL.md 注入当前 context
```

只有一个引导层是全量注入的，其余按需读入。这既省 token，也避免十几个技能的指令互相冲突。每个 `SKILL.md` 的 frontmatter 里 `name` 就是注册名，`description` 决定 Claude 判断"现在该不该用它"：

```yaml
---
name: brainstorming
description: "You MUST use this before any creative work..."
---
```

## 完整工作流

技能之间构成一张有向调用图，覆盖开发生命周期：

```
用户请求
  → brainstorming（需求 → 设计）
  → writing-plans（设计 → 实现计划）
  → ├─ subagent-driven-development（推荐：子 agent 并发）
    └─ executing-plans（降级：主线程串行）
  → test-driven-development（写代码前先写测试）
  → systematic-debugging（遇 bug 先找根因）
  → dispatching-parallel-agents（多个独立问题并发）
  → verification-before-completion（证据先于断言）
  → finishing-a-development-branch（交付）
```

## 核心技能解析

### brainstorming：三路分流闸门

定位是防止未经设计就开始编码。必须先声明走哪条路：

| 路径 | 触发场景 | 产出 | 下一步 |
| ---- | -------- | ---- | ------ |
| Spike | 可行性问题（"能不能…"） | 答案，代码标记为可抛弃 | 报告发现 |
| Bounded | 已有流程的小改动 | 聊天里几句话的短设计 | 批准后直接实现 |
| Architectural | 新系统、新子系统、架构变更 | spec 文档 → plan | writing-plans |

两个关键设计：

- **单向棘轮**：可以从 bounded 升级到 architectural，反过来不行。中途发现复杂性就立即升级。
- **`<HARD-GATE>`**：批准前禁止写任何代码，无论任务多简单。

技能内还带一个可选的 Visual Companion（`scripts/` 下的 Node 静态服务器 + HTML 框架），用于在浏览器里展示 mockup、diagram、布局对比。不默认开启，只在"展示比描述更清楚"时用。

### writing-plans：为零上下文的执行者写剧本

设计假设很直白：

> "Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste."

每个 task 的完整结构：

```markdown
### Task N: [Component Name]

**Files:**
- Create: exact/path/to/file.py
- Modify: exact/path/to/existing.py:123-145
- Test: tests/exact/path/to/test.py

**Interfaces:**
- Consumes: [earlier task 产出的精确签名]
- Produces: [later task 需要的精确函数名、参数、返回类型]

- [ ] Step 1: 写失败测试（完整代码）
- [ ] Step 2: 跑测试看失败（命令 + 预期输出）
- [ ] Step 3: 写最小实现（完整代码）
- [ ] Step 4: 跑测试看通过
- [ ] Step 5: git commit（连 message 都写好）
```

`Interfaces` 块存在的原因：每个 task 会派给独立子 agent，它只看到自己的 brief，没有项目全局 context，Interfaces 就是任务间的契约。

配套的 **No Placeholders 规则**禁止"TBD"、"参考 Task N"、"添加合适的错误处理"这类表述——子 agent 遇到就卡死。写完 plan 后自查三项：spec 覆盖度、placeholder 扫描、跨 task 的类型/函数名一致性。

### subagent-driven-development：并行施工 + 分段验收

整套设计里最复杂的一块。核心是每个 task 派一个清洁 context 的子 agent，完成后立刻评审，不通过就进修复循环。

目录组成：

```
subagent-driven-development/
  SKILL.md                  ← controller 执行手册
  implementer-prompt.md     ← 实现者模板
  task-reviewer-prompt.md   ← 首次评审模板
  re-review-prompt.md       ← 修复后复审模板
  scripts/
    sdd-workspace           ← 解析 plan 对应工作目录
    task-brief              ← 从 plan 提取单个 task 文本
    review-package          ← 生成评审包（commits + diff）
```

#### Workspace 隔离

```
<repo-root>/.superpowers/sdd/<plan-basename>/
  ├── progress.md                   # ledger 进度
  ├── task-N-brief.md               # task 提取文本
  ├── task-N-report.md              # implementer 详细报告
  └── review-<base7>..<head7>.diff  # 评审包
```

一个 plan 一个目录，同 repo 并发跑多个 plan 不会串读。放在 working tree 而不是 `.git/`，因为 Claude Code 拒绝 agent 写入 `.git/`；同时自动生成 `.gitignore` 排除全部内容防止误提交。

#### Per-Task 循环

```
1. Controller: scripts/task-brief PLAN_FILE N → task-N-brief.md
2. Controller: BASE=$(git rev-parse HEAD)
3. Controller: 用 implementer-prompt.md 派发子 agent
   填充 [MODEL] [BRIEF_FILE] [REPORT_FILE] [CONTEXT]
4. Implementer: 读 brief → TDD 实现 → self-review
   → 详细报告写入 task-N-report.md
   → 返回 ≤15 行摘要（Status / Commits / Tests / Report path）
5. Controller: scripts/review-package PLAN_FILE BASE HEAD
   → git log --oneline + git diff --stat + git diff -U10
6. Controller: 用 task-reviewer-prompt.md 派发评审 agent
7. Reviewer: Part 1 Spec Compliance（✅/❌/⚠️）
             Part 2 Code Quality（Critical/Important/Minor）
8. Controller: clean → ledger 记 complete；有 findings → Fix Loop
```

Fix Loop 封顶 5 轮：

- **Round 1-3**：resume 原 implementer 传 findings，修完用 `re-review-prompt.md` 派 scoped re-reviewer，逐条给 ADDRESSED / NOT ADDRESSED。
- **Round 4-5**：换全新 implementer，模型升一级。
- **Round 5 仍未清**：controller 自己裁决——评审有争议或问题不阻塞则 park（记录双方观点），真阻塞则 rule（最小改动 + ledger 记决策）。

#### Ledger：唯一的恢复地图

位置 `.superpowers/sdd/<plan-basename>/progress.md`：

```markdown
# SDD ledger — plan: docs/superpowers/plans/feature-plan.md

Task 1: complete (commits a1b2c3d..d4e5f6a, review clean)
Task 2: fix round 1/5 (2 addressed, 0 open; commits d4e5f6a..b7c8d9e)
Task 2: complete (commits d4e5f6a..b7c8d9e, review clean)
Task 3: parked — <finding> — Ruling: <why code stands>
Ruling: Task 4 — plan conflict — decided X because Y — cost if wrong: Z
```

恢复逻辑：读 workspace 的 `progress.md`，第一行匹配当前 plan 才认；有 `complete` 就跳过该 task，只有 `fix round R/5` 就从 R+1 继续，最后用 git log 确认 commits 真实存在。

这个机制是为**context 压缩**准备的。压缩后 controller 不记得干到哪了，没有 ledger 就会重复派发已完成的 task——按分析文档的说法，这是实测中最昂贵的失败模式。

#### Rulings：不等人类

> "A running plan does not wait on a human. Conflicts, ambiguities, plan defects — decide them."

只有四种情况才停下来问：不可逆的破坏性操作、安全敏感操作、worktree 外部副作用（merge / push 共享分支 / publish）、plan 烂到所有路径都是猜测。

其余冲突 controller 自己裁决（spec 为权威，plan 为论据），按 `Ruling: <what> — <why> — <cost if wrong>` 记进 ledger 然后继续。收尾时必须把所有 Ruling 行汇总进最终消息——**一个没被汇报的 Ruling 就是一个秘密决策**。

#### 模型分级

| 任务类型 | 模型等级 | 判断依据 |
| -------- | -------- | -------- |
| 机械实现 | 最便宜 | 1-2 文件，spec 完整，plan 含完整代码 |
| 集成任务 | 中等 | 多文件协调、pattern matching、debugging |
| 架构设计 | 最强 | 设计判断、广泛代码库理解 |
| Final Review | 最强（强制） | 全分支评审 |
| Fix loop Round 4-5 | 比原 implementer 高一级 | 能力升级 + 清洁 context |

模板里 `[MODEL]` 标记为 REQUIRED，因为省略会继承 session 模型——通常是最贵的那个，静默地把整套成本控制作废。另有一条反直觉的提示：最便宜的模型在多步任务上常花 2-3 倍轮次，总成本更高，所以 reviewer 和只拿到散文描述的 implementer 以中档模型为下限。

#### 三层 prompt 的关键约束

- **implementer-prompt.md**：明确写 "You Do Not Dispatch Subagents"，尤其禁止自己派 reviewer——那是全价重复评审，且它的批准在流程里不算数。self-review 查四项：完整性、质量、纪律（YAGNI）、测试真实性。
- **task-reviewer-prompt.md**："Do Not Trust the Report"，implementer 的报告只是未经验证的声明，陈述的理由不能降低 finding 严重度。**Diff-only 原则**限制 reviewer 只读 diff 文件（含 `-U10` 上下文），除非 hunk 被截断在函数中间，防止爬整个代码库炸 context。plan 明确要求但违反最佳实践的代码，仍要报为 Important 并打 `plan-mandated` 标签——plan 不能给自己的作品打分。
- **re-review-prompt.md**：scope 严格限定在 findings 列表和 fix diff。fix diff 之外发现的问题记为 Out-of-Scope Observations 进 ledger（延到 final review），不阻塞当前 task、不延长循环。verdict 只有 ADDRESSED / NOT ADDRESSED，"尝试修了"不算——缺陷必须真的不存在了。

整套设计有一条贯穿的思路：**artifacts 全部走文件，不经 controller context**。brief、report、review package 都是路径，子 agent 各读一次，controller 只看 15 行摘要。

### test-driven-development

Iron Law：

> "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST. Write code before the test? Delete it. Start over. Delete means delete."

五步强制顺序：写失败测试 → 跑并确认失败（且失败原因正确）→ 写最小实现 → 跑并确认通过 → 重构保持绿色。

本质区别在于测试回答的问题不同：测试后写回答"这段代码做了什么"，受实现偏见影响；测试先写回答"这段代码应该做什么"。而且只有亲眼看过测试失败，才能证明这个测试真有捕获 bug 的能力。

配套 `writing-good-tests.md` 的几条规则：写测试前先说出"哪个 production 改动会让它失败"；assert 真实行为，永不 assert mock 行为；测试专用代码放 test utilities 不放 production class；mock 一个依赖前先理解它的副作用。

### systematic-debugging

Iron Law 是 "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST"。四阶段按序完成：

| 阶段 | 核心活动 | 成功标准 |
| ---- | -------- | -------- |
| 1 根因调查 | 读错误、复现、查最近变更、追 data flow | 理解 WHAT 和 WHY |
| 2 模式分析 | 找能工作的对比案例，列出所有差异 | 识别差异点 |
| 3 假设测试 | 一次只改一个变量 | 确认或推翻假设 |
| 4 实现 | TDD 写失败测试 → 修根因 → 验证 | bug 消除 |

**熔断机制**：修复失败 ≥3 次就停下来质疑架构。三个信号——每次修复都暴露新的共享状态/耦合、修复需要"大规模重构"、每次修复在别处产生新症状。

技能目录里还有几个实用附件：`root-cause-tracing.md`（从症状反向追到触发点）、`defense-in-depth.md`（修完根因在 API/逻辑/数据多层加验证）、`condition-based-waiting.md`（用事件轮询替换 `sleep(N)` 消除 flaky test）、`find-polluter.sh`（二分查找定位留下脏状态的测试）。

### verification-before-completion

Iron Law 是 "NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE"。每次声称完成前跑一遍 Gate Function：

```
1. IDENTIFY: 什么命令能证明这个断言？
2. RUN:      当场重跑完整命令（不用之前的结果）
3. READ:     完整输出、exit code、失败计数
4. VERIFY:   输出确认断言吗？
5. CLAIM:    有证据才断言
```

明令禁止的表达：

```
❌ "Should work now"    → 没运行验证
❌ "I'm confident"      → 信心不是证据
❌ "Agent said success" → 子 agent 报告需独立验证
❌ "Linter passed"      → linter 不是 compiler
❌ "Tests should pass"  → 跑了才知道
```

### 其余技能

- **executing-plans**：没有 subagent 支持时的降级路径，主线程串行执行，遇 blocker 停下来问人。
- **dispatching-parallel-agents**：3 个以上互相独立、各有根因的失败时并发处理。实现原理是同一响应里发多个 Agent 调用（不同响应里的是串行）。子 agent prompt 三要素：focused（单一问题域）、self-contained（自带全部 context）、specific output（明确返回什么）。
- **using-git-worktrees / finishing-a-development-branch / requesting-code-review / receiving-code-review / writing-skills**：分支隔离、交付收尾、评审收发、以及编写自定义技能的规范。

## 文本工程手法

Skills 是给 LLM 消费的行为约束文本，不是给人看的文档。几个反复出现的手法：

**强制语言**。`Iron Law` / `HARD-GATE` / `MANDATORY` / `STOP` 这类措辞用来关闭"这次情况不同"的推理路径。

**Red Flags 表格**。把 LLM 最常见的合理化推理逐条列出并给出反驳：

```markdown
| Thought | Reality |
|---------|---------|
| "This is too simple to need a design" | Simple means a short design, not no design. |
| "I'll call it bounded and skip the spec" | Reaching for a label to skip work IS the doubt. |
```

相当于在技能内部预装了一个"你要偷懒了，停下"的检查器。

**Dot 图流程**。用 graphviz 语法描述决策流，比散文精确：

```
digraph tdd_cycle {
    red -> verify_red -> green -> verify_green -> refactor
}
```

**"human partner" 而非 "user"**。所有技能统一这个称呼，刻意构建协作关系而非服从关系。

**跨技能引用**。用 `superpowers:test-driven-development` 这样的引用形成技能链，不给 agent 跳环节的空间。

## 并发的两个层面

**工具调用层**（行内并发）：同一响应里发多个独立工具调用，主循环并发执行，结果一并返回。

**Agent 进程层**（fork 并发）：

```
主 Claude（协调者）
  ├── fork → 子 agent A（独立 context，问题域 A）
  ├── fork → 子 agent B
  └── fork → 子 agent C
       ↓（全部完成）
  汇总 → 检查冲突 → 集成
```

`fork` 类型子 agent 继承父 context（共享 prompt cache，成本低），但它的工具输出不回流父 context——这是防止父 context 被大量工具输出淹没的关键。

## 设计哲学

整套东西的核心洞察是：**LLM 的失败模式是可预测的**，所以可以逐一预埋对抗机制。

| LLM 失败模式 | 对抗机制 |
| ------------ | -------- |
| 跳过设计直接写代码 | brainstorming 的 HARD-GATE |
| 测试后写（验证实现而非行为） | TDD Iron Law + "Delete means delete" |
| 症状修复而非根因修复 | systematic-debugging 四阶段强制顺序 |
| 3+ 次失败还在叠补丁 | 熔断机制（质疑架构） |
| 信任 agent 报告不独立验证 | Gate Function |
| Context 压缩后重复工作 | SDD 的 ledger |
| 无限修复循环 | Fix loop 5 轮封顶 + 裁决 |
| 合理化跳过步骤 | Red Flags 表格逐条拦截 |

最有效的约束不是"告诉它做什么"，而是**在推理层面提前拦截"不该做什么"**——把每种失败模式的推理路径写进技能，让 agent 在产生那个念头的瞬间就看到反驳。

这个思路对写自己的 `CLAUDE.md` 和自定义技能同样适用：与其罗列正确做法，不如把你踩过的坑连同"当时是怎么说服自己的"一起写下来。

## 使用建议

- 技能自动触发，日常不用手动调。小改动别硬走全流程，走一遍 brainstorming 反而更慢。
- plan 文件建议纳入版本管理。它是人和 agent 之间的契约，review 计划比 review 大段 diff 高效。
- 跑 SDD 时留意 `.superpowers/sdd/` 下的 ledger，那是唯一能看清 agent 自己做了哪些决定的地方，尤其是 `Ruling:` 行。
- 和 `CLAUDE.md` 分工：`CLAUDE.md` 放项目稳定事实（技术栈、命令、目录结构），技能放做事方法论，别互相重复。
- 插件迭代较快，命令与技能列表以仓库最新 README 为准。

## 参考

- 仓库：https://github.com/obra/superpowers
- Claude 插件市场页：https://claude.com/plugins/superpowers
- Claude Code 插件文档：https://code.claude.com/docs/en/plugins


