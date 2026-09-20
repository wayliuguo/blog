/**
 * 告警（零依赖）：阈值 → 连续 N 次 → 静默期 → 恢复
 * 告警最怕两件事：漏报（阈值太松）、轰炸（阈值太灵且没有收敛）。
 * 所以规则里除了阈值，还要有 consecutive（连续命中的次数）与 silenceMs（同一规则的最小间隔）。
 */

export const DEFAULT_RULES = [
    {
        id: 'latency-p95',
        level: 'P2',
        metric: 'p95',
        op: '>',
        threshold: 120,
        consecutive: 2,
        silenceMs: 5000,
        title: '接口 P95 延迟超阈，存在变慢风险'
    },
    {
        id: 'latency-p99',
        level: 'P1',
        metric: 'p99',
        op: '>',
        threshold: 400,
        consecutive: 1,
        silenceMs: 5000,
        title: '接口 P99 延迟严重超阈'
    },
    {
        id: 'error-rate',
        level: 'P1',
        metric: 'errorRate',
        op: '>',
        threshold: 0.01,
        consecutive: 1,
        silenceMs: 5000,
        title: '错误率超阈，可能有故障'
    },
    {
        id: 'lcp-p75',
        level: 'P2',
        metric: 'lcpP75',
        op: '>',
        threshold: 2500,
        consecutive: 2,
        silenceMs: 30000,
        title: 'LCP P75 超 2.5s，首屏体验差'
    },
    {
        id: 'tps-drop',
        level: 'P3',
        metric: 'tps',
        op: '<',
        threshold: 5,
        consecutive: 3,
        silenceMs: 30000,
        title: 'TPS 异常走低，疑似流量中断'
    }
]

export function compare(value, op, threshold) {
    if (op === '>') return value > threshold
    if (op === '>=') return value >= threshold
    if (op === '<') return value < threshold
    if (op === '<=') return value <= threshold
    return false
}

export function createAlerter(rules = DEFAULT_RULES, options = {}) {
    const state = new Map() // ruleId -> { streak, lastFiredAt, active }
    const log = []

    function evaluate(metrics, ts = Date.now()) {
        const out = []
        for (const rule of rules) {
            const value = metrics[rule.metric]
            const hit = value != null && compare(value, rule.op, rule.threshold)
            const s = state.get(rule.id) || { streak: 0, lastFiredAt: 0, active: false }

            if (hit) {
                s.streak++
                const cooled = ts - s.lastFiredAt >= (rule.silenceMs ?? 60000)
                // 连续命中达到门槛、且不在静默期内 → 才真的推一条告警
                if (s.streak >= rule.consecutive && (!s.active || cooled)) {
                    const alert = {
                        id: rule.id,
                        level: rule.level,
                        state: 'firing',
                        ts,
                        metric: rule.metric,
                        value,
                        threshold: rule.threshold,
                        consecutive: s.streak,
                        title: rule.title
                    }
                    s.active = true
                    s.lastFiredAt = ts
                    log.push(alert)
                    out.push(alert)
                }
            } else if (s.active) {
                // 指标回到阈值内 → 推一条恢复通知，避免「有告警无恢复」
                const alert = {
                    id: rule.id,
                    level: rule.level,
                    state: 'resolved',
                    ts,
                    metric: rule.metric,
                    value,
                    threshold: rule.threshold,
                    title: rule.title
                }
                s.active = false
                s.streak = 0
                log.push(alert)
                out.push(alert)
            } else {
                s.streak = 0
            }
            state.set(rule.id, s)
        }
        return out
    }

    return { evaluate, log, snapshot: () => Object.fromEntries([...state].map(([k, v]) => [k, { ...v }])) }
}
