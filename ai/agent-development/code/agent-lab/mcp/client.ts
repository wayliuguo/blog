/**
 * 天气 MCP Client（stdio 传输）
 * 文章正文「再写一个自己的 Client」的配套代码。
 *   npm run mcp-client   # 启动 Client：连接 Server → 列出工具 → 调用 get_weather(西安)
 * 注意：stdio 服务端的普通日志写到 console.error()，不要用 console.log() 输出普通日志，
 *       否则会混入协议消息流、破坏通信。
 */
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { fileURLToPath } from 'node:url'

async function main() {
  const client = new Client({ name: 'weather-client', version: '1.0.0' })

  // tsx 直跑（源码态）启动 server.ts 需经 tsx；编译后（dist 态）直接 node server.js
  const isTs = import.meta.url.endsWith('.ts')
  const serverPath = fileURLToPath(
    new URL(isTs ? './server.ts' : './server.js', import.meta.url),
  )
  const tsxCli = fileURLToPath(
    new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url),
  )
  const transport = isTs
    ? new StdioClientTransport({
        command: process.execPath,
        args: [tsxCli, serverPath],
        stderr: 'inherit',
      })
    : new StdioClientTransport({
        command: process.execPath,
        args: [serverPath],
        stderr: 'inherit',
      })

  try {
    await client.connect(transport)
    const { tools } = await client.listTools()
    console.log('可用工具：', tools.map((tool) => tool.name))

    const result = await client.callTool({
      name: 'get_weather',
      arguments: { city: '西安' },
    })

    if (result.isError) {
      console.error('工具执行失败：')
      process.exitCode = 1
    }

    for (const block of result.content) {
      if (block.type === 'text') console.log(block.text)
    }
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error('客户端运行失败：', error)
  process.exitCode = 1
})
