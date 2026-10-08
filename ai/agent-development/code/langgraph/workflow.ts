/**
 * LangGraph 实战主线（可运行镜像）
 * ──────────────────────────────────────────────
 * 零依赖复刻「生成计划 → 校验分支 → 暂停人工审核 → 恢复执行」：
 *   - 条件边：先判是否通过，再判修改次数是否耗尽（最后一次修改合格也要能成功）
 *   - interrupt：图在 review 前暂停，等人输入；状态落进 Checkpointer
 *   - resume：带同一 thread_id 从检查点恢复；恢复会让节点从头重跑，需要幂等
 * 真实集成见正文示意片段：@langchain/langgraph 的 StateGraph / interrupt / Command。
 *
 * 运行：npm run workflow
 */

type PlanStatus =
    | 'drafting' // 生成/修改中
    | 'paused' // 暂停等审核
    | 'approved' // 审核通过
    | 'rejected' // 审核拒绝
    | 'failed' // 修改超限仍不合格

// State：这次任务保存了哪些数据。节点只返回自己修改的字段。
interface PlanState {
    topic: string
    plan: string
    errors: string[] // 校验失败的具体原因，反馈给生成节点修复
    revisions: number // 已修改次数
    pendingReview: string | null // 非空 = 图在 review 处暂停
    status: PlanStatus
}

type Node = (s: PlanState) => Partial<PlanState>

const MAX_REVISIONS = 2

// 生成节点：第一版故意不合格（缺练习、没写时长）；带 feedback 时按错误修复——
// 真实场景这一步调 LLM，这里用规则 mock 保持零依赖。
const generate: Node = s => {
    if (s.errors.length === 0) {
        return { plan: `三天${s.topic}计划（每天只有目标）`, revisions: 0, status: 'drafting' }
    }
    return {
        plan: `三天${s.topic}计划（每天有目标、有练习、不超过 60min）`,
        revisions: s.revisions + 1,
        status: 'drafting'
    }
}

// 校验节点：程序只检查「能明确表达的规则」（字段在不在、数值超不超限），
// 计划内容是否合理属于评价问题，不在这里判。
const check: Node = s => {
    const errors: string[] = []
    if (!s.plan.includes('练习')) errors.push('缺少练习安排')
    if (!s.plan.includes('60min')) errors.push('未标注时长上限')
    return { errors }
}

// 条件边 1：先判通过，再判次数耗尽；最后一次修改若已合格应成功结束。
function routeAfterCheck(s: PlanState): 'review' | 'generate' | 'fail' {
    if (s.errors.length === 0) return 'review'
    if (s.revisions >= MAX_REVISIONS) return 'fail'
    return 'generate'
}

// 审核节点：interrupt——把待审内容挂起，图在这里暂停等人输入。
// 真实集成：const decision = interrupt('请审核计划')。
const review: Node = s => ({
    pendingReview: s.plan,
    status: 'paused'
})

// 恢复后的落点节点：清空待审标记（幂等：重复恢复结果一致）。
// 决定本身由 Command({ resume }) 的返回值携带，写入 status。
const applyDecision: Node = s => ({
    pendingReview: null
})

// 内存版 Checkpointer：thread_id → 状态快照。
// 真实集成换 PostgresSaver，实现「程序退出后数据仍在」。
class MemoryCheckpointer {
    private snapshots = new Map<string, PlanState>()

    save(threadId: string, state: PlanState): void {
        this.snapshots.set(threadId, structuredClone(state))
    }

    load(threadId: string): PlanState | undefined {
        return this.snapshots.has(threadId) ? structuredClone(this.snapshots.get(threadId)) : undefined
    }
}

// 图执行器：逐步打印走到哪个节点，模拟 stream 的观感。
// resumeDecision 非空表示 Command({ resume }) 恢复：从 review 之后继续。
function invoke(label: string, state: PlanState, resumeDecision: 'approved' | 'rejected' | null): PlanState {
    console.log(`\n=== ${label} ===`)

    if (resumeDecision !== null) {
        // 恢复：Command({ resume }) 把决定交给暂停点之后的节点；
        // 节点会从函数开头重跑，所以 applyDecision 只做幂等的字段赋值。
        console.log(`(resume) 收到审核结果：${resumeDecision}`)
        const decided: PlanState = { ...state, status: resumeDecision }
        state = { ...decided, ...applyDecision(decided) }
        console.log(`  [applyDecision] status=${state.status} pendingReview=${state.pendingReview}`)
        return state
    }

    let steps = 0
    while (steps++ < 10) {
        const update = generate(state)
        state = { ...state, ...update }
        console.log(`  [generate] revisions=${update.revisions} plan=${state.plan}`)
        state = { ...state, ...check(state) }
        console.log(`  [check] errors=${JSON.stringify(state.errors)}`)

        const next = routeAfterCheck(state)
        if (next === 'generate') {
            console.log(`  (conditional) 不合格 → 带反馈重做：${state.errors.join('；')}`)
            continue
        }
        if (next === 'fail') {
            console.log(`  (conditional) 修改超限仍不合格 → failed`)
            return { ...state, status: 'failed' }
        }

        console.log(`  (conditional) 校验通过 → 进入人工审核`)
        state = { ...state, ...review(state) }
        console.log(`  [review] interrupt：等待人工输入（thread 暂停）`)
        return state // 暂停：状态已由调用方存入 Checkpointer
    }
    return { ...state, status: 'failed' }
}

// 运行：npx tsx workflow.ts
if (process.argv[1] && process.argv[1].endsWith('workflow.ts')) {
    const checkpointer = new MemoryCheckpointer()

    // 1) 第一次运行：生成 → 校验失败 → 修改 → 通过 → 暂停审核
    let state: PlanState = {
        topic: 'TypeScript',
        plan: '',
        errors: [],
        revisions: 0,
        pendingReview: null,
        status: 'drafting'
    }
    state = invoke('thread-1 第一次 invoke（无审核）', state, null)
    checkpointer.save('thread-1', state)
    console.log(`\n(checkpointer) thread-1 已保存，程序可以退出：status=${state.status}`)

    // 2) 模拟程序重启后恢复：从 Checkpointer 读回，提交审核结果
    const restored = checkpointer.load('thread-1')
    if (restored) {
        console.log(`\n(restart) 程序重启，从 Checkpointer 恢复 thread-1：status=${restored.status}`)
        state = invoke('thread-1 resume（approved）', restored, 'approved')
        checkpointer.save('thread-1', state)
    }

    // 3) 不同 thread 数据不串
    console.log(`\n(thread-2) 未创建过任务：checkpointer 返回 ${checkpointer.load('thread-2')}`)
}
