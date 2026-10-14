// agent.mjs — Function Calling 执行循环（前端接线形态）
// 一轮完整链路：用户问题 → 带 tools 参数调 LLM → 模型返回 tool_calls →
// 本地白名单执行 → 结果以 role:'tool' 回喂 → 模型产出最终自然语言答复。
// 双模式：.env 有 DEEPSEEK_API_KEY 走真实接口；无 key 或 --force-mock 走本地剧本。
'use strict'
import fs from 'node:fs'
import { tools, findTool } from './tools.mjs'

// ---------- .env（零依赖） ----------
let API_KEY = process.env.DEEPSEEK_API_KEY || ''
try {
  for (const line of fs.readFileSync(new URL('./.env', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^\s*DEEPSEEK_API_KEY\s*=\s*(\S+)\s*$/)
    if (m && !m[1].startsWith('粘贴')) API_KEY = m[1]
  }
} catch {}
const FORCE_MOCK = process.argv.includes('--force-mock')
const MODE = API_KEY && !FORCE_MOCK ? 'deepseek(真实)' : 'mock(本地剧本)'

// OpenAI tools 参数格式：把白名单 schema 直接交给模型
const chatTools = tools.map(t => ({
  type: 'function',
  function: { name: t.name, description: t.description, parameters: t.parameters },
}))

async function callLLM(messages) {
  if (MODE.startsWith('mock')) return mockLLM(messages)
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages, tools: chatTools }),
  })
  if (!res.ok) throw new Error(`upstream ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.choices[0].message
}

// 本地剧本：第一轮固定返回一次 tool_calls；第二轮把工具结果编成答复（模拟模型行为）
async function mockLLM(messages) {
  const last = messages[messages.length - 1]
  if (last.role === 'tool') {
    const r = JSON.parse(last.content)
    return {
      role: 'assistant',
      content: r.ok
        ? `（mock）订单 ${r.orderId ?? ''} 当前状态：${r.status ?? r.text}。`
        : `（mock）查询失败：${r.error}`,
    }
  }
  return {
    role: 'assistant',
    content: null,
    tool_calls: [
      {
        id: 'call_mock_1',
        type: 'function',
        function: { name: 'getOrderStatus', arguments: JSON.stringify({ orderId: 'ORD-2026-1001' }) },
      },
    ],
  }
}

// ---------- 主循环 ----------
async function main() {
  const question =
    process.argv.slice(2).find(a => !a.startsWith('--')) || '帮我查一下订单 ORD-2026-1001 到哪了，顺便说下你们的退款政策'
  console.log(`[mode] ${MODE}`)
  console.log(`[user] ${question}`)

  const messages = [{ role: 'user', content: question }]

  // 循环上限：防模型连环调用工具打转（真实项目必须设）
  for (let round = 1; round <= 4; round++) {
    const reply = await callLLM(messages)
    messages.push(reply)

    if (!reply.tool_calls?.length) {
      console.log(`[assistant] ${reply.content}`)
      return
    }

    // 执行模型点名的每个工具：白名单校验 → 参数 JSON.parse → run()
    for (const call of reply.tool_calls) {
      const tool = findTool(call.function.name)
      console.log(`[round ${round}] 模型请求调用工具：${call.function.name}(${call.function.arguments})`)
      let result
      if (!tool) {
        // 未注册工具：结构化错误回喂，而不是终止整个会话
        result = { ok: false, error: `工具 ${call.function.name} 不在白名单内，可用工具：${tools.map(t => t.name).join(', ')}` }
      } else {
        try {
          result = tool.run(JSON.parse(call.function.arguments))
        } catch (e) {
          result = { ok: false, error: `参数解析失败：${e.message}` }
        }
      }
      console.log(`[round ${round}] 工具结果：${JSON.stringify(result)}`)
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
    }
  }
  console.log('[warn] 达到工具调用轮次上限，强制结束')
}

main().catch(e => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
