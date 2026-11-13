/** 参数体积上限：超限截断并打 truncated 标记，不静默丢信息 */
const PARAM_LIMIT = 4096
// 输入：无配置
// 输出：自定义上报插件（内核把 report 暴露成 sdk.report()）
// 过程：校验事件名 → 截断参数 → 以 type=custom、subtype=事件名 emit
export function createCustomPlugin() {
    let ctxRef = null
    return {
        name: 'custom',
        setup(ctx) {
            ctxRef = ctx
            return () => {
                ctxRef = null
            }
        },
        report(input) {
            const ctx = ctxRef
            if (!ctx) return
            const name = String(input?.name || '').trim()
            if (!name) {
                ctx.log('report() 需要一个事件名')
                return
            }
            let params = input.params
            let truncated = false
            try {
                const json = params ? JSON.stringify(params) : ''
                if (json.length > PARAM_LIMIT) {
                    params = { truncated: json.slice(0, PARAM_LIMIT) }
                    truncated = true
                }
            } catch {
                params = { note: '参数无法序列化' }
            }
            if (name.split('.').length < 3) ctx.log(`事件名建议三段式（平台.页面.行为）：${name}`)
            ctx.emit({
                type: 'custom',
                subtype: name,
                message: name,
                tags: input.tags,
                data: { name, params, truncated }
            })
        }
    }
}
