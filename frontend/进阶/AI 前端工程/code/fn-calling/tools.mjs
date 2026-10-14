// tools.mjs — 前端工具注册表：受约束的 DSL（AI 与前端工程结合篇的核心思路）
// 关键纪律一：工具走**白名单 schema**——模型只能选择已注册的工具，参数 schema 即文档；
// 关键纪律二：工具实现是**纯函数 + 确定性数据**（真实项目里换成自家接口调用），失败信息结构化返回给模型回喂。
export const tools = [
  {
    name: 'getOrderStatus',
    description: '查询订单状态。入参 orderId 形如 ORD-2026-xxxx',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: '订单号' },
      },
      required: ['orderId'],
    },
    // 模拟的业务数据源
    db: {
      'ORD-2026-1001': { status: '已发货', carrier: '顺丰', eta: '明天 18:00 前' },
      'ORD-2026-1002': { status: '待支付', amount: 199 },
    },
    run({ orderId }) {
      const row = this.db[orderId]
      if (!row) {
        // 结构化错误：把失败原因告诉模型，而不是抛异常终止——模型可以据此向用户澄清
        return { ok: false, error: `订单 ${orderId} 不存在，请确认用户提供的订单号是否完整` }
      }
      return { ok: true, ...row }
    },
  },
  {
    name: 'queryRefundPolicy',
    description: '查询退款政策条目。入参 topic 是 refund/free-shipping 二选一',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', enum: ['refund', 'free-shipping'] },
      },
      required: ['topic'],
    },
    policies: {
      refund: '7 天无理由退款，需保持商品完好；电子商品激活后不支持。',
      'free-shipping': '满 99 元包邮；偏远地区除外。',
    },
    run({ topic }) {
      return { ok: true, text: this.policies[topic] ?? `未知主题 ${topic}，可选值 refund / free-shipping` }
    },
  },
]

// 白名单：模型返回的 tool_calls 里出现未注册工具名，直接拒绝并回喂错误
export function findTool(name) {
  return tools.find(t => t.name === name) ?? null
}
