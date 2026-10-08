/**
 * LangGraph 风格状态图（可运行镜像）
 * ──────────────────────────────────────────────
 * 文章正文里的「示意片段」展示真实集成：
 *   import { StateGraph, Annotation, END } from '@langchain/langgraph'
 *   const State = Annotation.Root({
 *     messages: Annotation<Msg[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
 *   })
 * 本文件用零依赖复刻其核心机制：State 对象 + 节点 + 边 + 条件路由 + Reducer（消息追加），
 * 让你不依赖 API Key 也能跑通「模型决策 → 工具执行 → 是否继续」的循环。
 *
 * 运行：npm install && npm run langgraph
 */

// 状态：一段消息列表。Reducer 负责把「新消息」追加到「已有状态」上，
// 对应 LangGraph 里 Annotation 的 reducer（增量合并而非整体覆盖）。
type State = { messages: string[] }

function reducer(state: State, update: Partial<State>): State {
    return {
        messages: [...state.messages, ...(update.messages ?? [])]
    }
}

// 节点：普通函数 (state) => 部分 state 更新
type Node = (s: State) => Partial<State>

const callModel: Node = () => ({
    messages: ['(model) 我需要查一下天气，调用 getWeather']
})

const callTool: Node = () => ({
    messages: ['(tool) 西安 晴 22°C']
})

// 条件边：根据状态决定下一步去哪个节点，
// 对应 LangGraph 的 addConditionalEdges（路由函数返回下一个节点的名字）。
function shouldContinue(s: State): string {
    const last = s.messages[s.messages.length - 1]
    if (last.includes('getWeather')) return 'callTool' // 还需要执行工具 → 继续
    return 'end' // 工具已执行 → 结束
}

function runGraph() {
    let state: State = { messages: ['(human) 西安天气怎么样？'] }
    const nodes: Record<string, Node> = { callModel, callTool }

    // 起点：先让模型决策
    state = reducer(state, callModel(state))
    let step = 0
    while (step++ < 10) {
        const next = shouldContinue(state)
        if (next === 'end') break
        state = reducer(state, nodes[next](state))
    }

    console.log('状态轨迹：')
    state.messages.forEach((m, i) => console.log(`  ${i}. ${m}`))
}

runGraph()
