// 事件归一：插件交来的碎片在这里变成统一结构，公共字段只在这里补一次。
import { newId } from './context'
/** 指纹取栈顶三帧：同一条错误换个触发时机仍是同一个指纹 */
function topFrames(stack) {
    if (!stack) return ''
    return stack
        .split('\n')
        .filter(line => /^\s*at\s/.test(line))
        .slice(0, 3)
        .map(line => line.trim().replace(/:\d+:\d+\)?$/, ''))
        .join('<')
}
// 输入：类型 / 子类型 / 消息 / 堆栈
// 输出：事件指纹（节流与服务端聚合共用的"事件身份"）
// 过程：类型|子类型|消息|栈顶三帧 拼接，行号列号已在 topFrames 里去掉（压缩打包差异会让同一错误裂成多个指纹）
export function fingerprintOf(type, subtype, message, stack) {
    return `${type}|${subtype || ''}|${message || ''}|${topFrames(stack)}`
}
// 输入：插件原始事件 + 运行时上下文 + 配置
// 输出：可直接入队的 MonitorEvent
// 过程：补 id/时间戳/指纹 → 拷贝上下文快照 → 错误类附带面包屑 → 合并全局 tags
export function createEvent(input, ctx, cfg) {
    const message = input.message ? String(input.message).slice(0, 500) : undefined
    const stack = input.stack ? String(input.stack).slice(0, 4000) : undefined
    const event = {
        id: newId(),
        type: input.type,
        subtype: input.subtype,
        timestamp: Date.now(),
        message,
        stack,
        fingerprint: fingerprintOf(input.type, input.subtype, message, stack),
        page: { ...ctx.page },
        session: { ...ctx.session },
        device: { ...ctx.device },
        release: ctx.release,
        env: ctx.env,
        data: input.data,
        tags: { ...cfg.tags, ...(input.tags || {}) }
    }
    // 只有错误类事件需要面包屑：它回答的是"用户做了什么才炸的"，性能事件不需要
    if (input.type === 'error' && ctx.breadcrumbs.length) {
        event.breadcrumbs = ctx.breadcrumbs.slice(-20)
    }
    return event
}
